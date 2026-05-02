# SFU Lobby / 5번째 사용자 미표시 이슈 — 코드 리뷰

리뷰 대상:
- `res200/workers/templates/sfuTemplate.js` (정적 HTML/CSS 템플릿 — 직접 영향 없음)
- `res200/workers/templates/sfuLobbyRefactor.md` (설계 문서)
- 실제 SFU 클라이언트 로직: `brand/public/js/sfu/{SFUApp,SignalingClient,WebRTCManager}.js`

---

## 증상 요약

| # | 보고 내용 |
|---|---|
| 1 | 사용자가 접속 시 4명만 화면에 얼굴이 나타남 |
| 2 | 5번째 사용자는 다른 참가자 얼굴은 보이나, 기존 4명에게는 보이지 않음 |
| 3 | 5번째 사용자 본인은 다른 사람 목소리를 들을 수 있으나, 본인 음성/영상은 송출되지 않음 |
| 4 | 세션 카운트는 정상 증가 |
| 5 | 화면 공유 시에도 4명까지만 보임 |

증상 패턴:
- **PULL은 정상** (5번째가 기존 피어를 보고/들음)
- **PUSH가 깨짐** (기존 피어가 5번째를 보지/듣지 못함)

따라서 신호/세션 자체가 아니라, "기존 피어가 5번째 세션에 대해 `/tracks/new` pull 을 어떻게 처리하느냐"가 문제임.

---

## 근본 원인 후보 (우선순위 순)

### 1. (★) `SFUApp.start()` 의 호출 순서 — `connect()` 가 `pushLocalTracks()` 보다 먼저

`brand/public/js/sfu/SFUApp.js:48-58`

```js
this.signalingClient = new SignalingClient(this, this.signalingUrl, this.targetCode);
this.webrtcManager = new WebRTCManager(this, this.apiUrl);
const sessionRes = await fetch(this.apiUrl + '/calls/session', { method: 'POST' });
...
this.callsSessionId = sessionData.sessionId;
await this.webrtcManager.init(sendStream);   // ← addTransceiver 만 수행. mid 는 null
this.signalingClient.connect();              // ← await 없음. ws.onopen 비동기로 떨어짐
await this.webrtcManager.pushLocalTracks();  // ← 여기서 비로소 createOffer/SLD/POST tracks/new
```

`SignalingClient.js` 의 `ws.onopen` 핸들러:

```js
this.send({ type: 'join', sessionId: this.app.callsSessionId, ... });
this.app.webrtcManager.broadcastLocalTracks();   // ← 즉시 호출
```

`pushLocalTracks()` 가 끝나기 **전에** `broadcastLocalTracks()` 가 먼저 송신될 수 있음.

### 2. (★) `broadcastLocalTracks()` 가 mid=null, simulcast=false 로 송신

`brand/public/js/sfu/WebRTCManager.js:379-399`

```js
broadcastLocalTracks() {
    ...
    this.pc.getTransceivers().forEach(t => {
        if ((t.direction === 'sendonly' || t.direction === 'sendrecv') && t.sender.track) {
            const trackName = this.getTrackName(t.sender.track);
            localTracksInfo.push({ trackName, mid: t.mid });   // mid 가 null 일 수 있음
        }
    });
    this.app.signalingClient.send({ type: 'tracks-update', tracks: localTracksInfo, ... });
}
```

`addTransceiver` 직후 / `setLocalDescription` 이전에는 `t.mid === null`. 그리고 `simulcast: true` 플래그는 오직 `pushLocalTracks` 의 `WebRTCManager.js:159-172` 에서만 set 되므로, 조기 broadcast는 **항상** `simulcast` 플래그 없이 나감.

### 3. (★) 기존 피어가 빈 세션에 대해 pull → 실패 → dedup 으로 갱신 차단

`brand/public/js/sfu/WebRTCManager.js:419-430`

```js
msg.tracks.forEach(t => {
    const key = sid + ':' + t.trackName;
    if (!this.subscribedTracks.has(key)) {
        if (!this.pendingRemoteTracks.some(p => p.sessionId === sid && p.trackName === t.trackName)) {
            const pendingEntry = { sessionId: sid, trackName: t.trackName };
            if (t.simulcast && t.trackName === 'video') {
                pendingEntry.simulcastRid = this._selectSimulcastLayer(sid);
            }
            this.pendingRemoteTracks.push(pendingEntry);
        }
    }
});
```

타임라인:

```
T0: 5번째 ws.onopen → broadcastLocalTracks (mid=null, simulcast=false)
T1: 기존 4명이 수신 → pendingRemoteTracks 에 simulcastRid 없는 항목 push
T2: 기존 4명이 /tracks/new (pull) 호출 — 그러나 5번째는 아직 SFU 에 트랙 push 전
T3: SFU 가 빈 응답 또는 에러 반환
T4: catch 블록에서 pendingRemoteTracks 복원 (WebRTCManager.js:338)
T5: 5번째 pushLocalTracks 완료 → 정상 tracks-update (mid 정상, simulcast=true) 송신
T6: 기존 4명이 다시 수신 → 그러나 dedup 검사로 새 entry 추가 거부
    → simulcastRid 정보가 끝내 반영되지 않음
T7: processPendingTracks 가 호출되어 retry 는 일어나지만,
    이미 잘못된 (simulcastRid 없는) 항목으로 재시도 → 서버 매칭 실패 가능
```

### 4. (★) `rebalanceSimulcastLayers` 가 dead code

`brand/public/js/sfu/WebRTCManager.js:517-527`

```js
async rebalanceSimulcastLayers() {
    if (!this.pc) return;
    const participantCount = this._getRemoteParticipantCount(null);
    let desiredRid;
    if (participantCount <= 2) desiredRid = 'h';
    else if (participantCount <= 4) desiredRid = 'm';
    else desiredRid = 'l';
    console.info('[WebRTCManager] Rebalancing simulcast to rid:', desiredRid, 'participants:', participantCount);
    this._currentPreferredRid = desiredRid;   // ← 어디서도 읽히지 않음
}
```

`_currentPreferredRid` 는 grep 결과 **읽는 곳이 없음**. 즉 임계값(2/4) 을 넘는 시점에 기존 구독의 rid 전환이 실제로 일어나지 않는다.

### 5. (★) "4 명" 임계가 코드적으로 생기는 지점

`brand/public/js/sfu/WebRTCManager.js:444-448`

```js
if (participantCount <= 2) return 'h';
if (participantCount <= 4) return 'm';
return 'l';
```

+ `WebRTCManager.js:105-114` 의 simulcast 사다리:

```js
{ rid: 'h', maxBitrate: 400_000, scaleResolutionDownBy: 1 },
{ rid: 'm', maxBitrate: 180_000, scaleResolutionDownBy: 2 },
{ rid: 'l', maxBitrate: 80_000,  scaleResolutionDownBy: 4 }
```

5번째 사용자 입장에서 `participantCount = 4 + 1 = 5` → `'l'` 이 선택되어야 하는데, #2/#3 의 race 로 **simulcast 플래그 자체가 빠진** tracks-update 로 인해 `simulcastRid` 가 설정되지 않은 채 pull 됨. 4명까지는 `'m'` 으로 우연히 동작하다가 5명에서 깨지는 임계가 정확히 여기서 발생할 수 있음.

---

## 부가 이슈

### 6. `'join'` 핸들러 broadcast 와 onopen broadcast 의 중복

`brand/public/js/sfu/SignalingClient.js:86-89`

```js
case 'join':
case 'user_joined':
    this.app.webrtcManager.broadcastLocalTracks();
    break;
```

새 사용자 입장 시:
- 신규 사용자: `ws.onopen` 에서 `broadcastLocalTracks` (#2 의 race)
- 기존 사용자: `'join'` 수신 시 `broadcastLocalTracks`

기존 사용자의 broadcast 는 정상이지만, 이 시점은 `pushLocalTracks` 가 이미 끝난 후이므로 mid/simulcast 가 정상. 단, 두 경로로 송수신 되므로 dedup 로직에 의존하게 되고, 그 dedup 이 #3 의 갱신 차단을 만든다.

### 7. `broadcastLocalTracks` 가 두 군데서 호출됨

- `pushLocalTracks` 끝(`WebRTCManager.js:222-228`)에서 inline 으로 send
- `ws.onopen`/`'join'` 핸들러에서 `broadcastLocalTracks()` 호출

두 경로의 페이로드 형식이 다름:
- `pushLocalTracks` inline: `simulcast`, `simulcastEncodings` 포함
- `broadcastLocalTracks`: 위 정보 없음

→ 같은 의미의 메시지를 두 종류 페이로드로 송신, 수신 측 dedup 으로 정보 손실.

### 8. `_pullTracksInner` 실패 시 자동 재시도 없음

`brand/public/js/sfu/WebRTCManager.js:336-342`

```js
} catch (e) {
    console.error(...);
    this.pendingRemoteTracks = [...tracksToProcess, ...this.pendingRemoteTracks];
    // ← _drainIfPending() 호출 없음. 다음 tracks-update 가 와야만 retry
}
```

성공 경로에서만 `_drainIfPending()` 이 호출됨. 실패 시에는 다음 외부 트리거(다음 tracks-update)에 의존. 결국 5번째의 진짜 tracks-update 가 dedup 에 막히면 (#3) 재시도 자체가 일어나지 않음.

### 9. 화면 공유 동일 race

화면 공유는 별도 transceiver 를 추가하고 다시 push → broadcastLocalTracks 흐름을 타므로, 위 race 가 여전히 적용됨. 특히 화면 공유 도중 새 사용자가 입장하면 동일 dedup 문제로 누락될 수 있음.

---

## 권장 수정 (우선순위 순)

### Fix 1 — `SFUApp.start()` 순서 보정 [HIGH]

`brand/public/js/sfu/SFUApp.js:56-58`

```js
// Before
await this.webrtcManager.init(sendStream);
this.signalingClient.connect();
await this.webrtcManager.pushLocalTracks();

// After
await this.webrtcManager.init(sendStream);
await this.webrtcManager.pushLocalTracks();   // mid 부여 + SFU 에 트랙 게시 먼저
this.signalingClient.connect();               // 그 다음 WS 오픈 → broadcast 가 정확
```

이것만으로도 #1, #2, #3 가 동시에 해소될 가능성이 높음.

### Fix 2 — `broadcastLocalTracks()` 가드 [HIGH]

`brand/public/js/sfu/WebRTCManager.js:379-399`

```js
broadcastLocalTracks() {
    const callsSessionId = this.app.callsSessionId;
    if (!this.pc || !this.app.signalingClient || !this.app.signalingClient.isOpen()) return;

    const localTracksInfo = [];
    this.pc.getTransceivers().forEach(t => {
        if ((t.direction === 'sendonly' || t.direction === 'sendrecv') && t.sender.track) {
            if (!t.mid || !this._pushedMids.has(t.mid)) return;   // ← mid 미부여/미푸시 트랙 제외
            const trackName = this.getTrackName(t.sender.track);
            const entry = { trackName, mid: t.mid, simulcast: false };
            if (t.sender.track.kind === 'video' && trackName !== 'screen') {
                const params = t.sender.getParameters();
                if (params.encodings && params.encodings.length > 1) {
                    entry.simulcast = true;
                }
            }
            localTracksInfo.push(entry);
        }
    });
    if (localTracksInfo.length === 0) return;   // ← 보낼 게 없으면 송신 자체 생략

    this.app.signalingClient.send({
        type: 'tracks-update',
        sessionId: callsSessionId,
        clientId: callsSessionId,
        tracks: localTracksInfo,
        room: this.app.targetCode
    });
}
```

### Fix 3 — `handleRemoteTracksUpdate` 에서 pending 항목 갱신 허용 [MED]

`brand/public/js/sfu/WebRTCManager.js:419-430`

```js
msg.tracks.forEach(t => {
    const key = sid + ':' + t.trackName;
    if (this.subscribedTracks.has(key)) return;

    let pending = this.pendingRemoteTracks.find(p => p.sessionId === sid && p.trackName === t.trackName);
    if (!pending) {
        pending = { sessionId: sid, trackName: t.trackName };
        this.pendingRemoteTracks.push(pending);
    }
    if (t.simulcast && t.trackName === 'video' && !pending.simulcastRid) {
        pending.simulcastRid = this._selectSimulcastLayer(sid);   // ← 후속 tracks-update 로 보강
    }
});
```

### Fix 4 — `_currentPreferredRid` 를 실제 적용 또는 제거 [LOW]

옵션 A: `rebalanceSimulcastLayers` 가 모든 활성 video transceiver 의 receiver preferredCodecs/parameters 를 통해 layer hint 를 다시 보내도록 구현(서버에 새 rid 로 재구독 요청).

옵션 B: 현재 시점에선 dead code 이므로 함수와 호출부 제거 후, `_selectSimulcastLayer` 만 신뢰하고 새 pull 진입 시 적용.

### Fix 5 — `_pullTracksInner` 실패 시 자동 재시도 [LOW]

`brand/public/js/sfu/WebRTCManager.js:336-342`

```js
} catch (e) {
    console.error(...);
    this.pendingRemoteTracks = [...tracksToProcess, ...this.pendingRemoteTracks];
    setTimeout(() => this._drainIfPending(), 500);   // ← 백오프 후 재시도
}
```

### Fix 6 — onopen broadcast 와 'join' 핸들러 중복 정리 [LOW]

둘 중 하나로 통일. 권장은 onopen 측 broadcast 제거하고 `'join'` 핸들러만 유지(기존 피어가 신규 피어에게 자기 트랙을 알리는 모델). Fix 1 적용 후엔 onopen 에서의 broadcast 가 의미는 있으나 중복 송수신 비용을 고려해 정리 권장.

---

## 검증 시나리오

- [ ] 5명 → 6명 → 10명 단계적 입장: 각 단계마다 모든 피어가 모든 다른 피어의 비디오/오디오를 표시하는지
- [ ] N번째 입장 시 콘솔의 `[WebRTCManager] Broadcasting local tracks` 로그가 `pushLocalTracks` 완료 **후에만** 발생하는지
- [ ] N번째 입장 시 기존 피어의 `[WebRTCManager] handleRemoteTracksUpdate from: <Nth>` 로그가 mid 가 부여된 상태로 한 번만 처리되는지
- [ ] 5명 이상 환경에서 화면 공유 ON/OFF 반복 시 모든 피어에게 정상 표시
- [ ] Leave → Rejoin 시 이전 세션의 stale tracks 가 새 세션 broadcast 에 끼지 않는지

---

## 결론

코어 원인은 **Fix 1** (start 순서) 한 가지로 압축됨. 부수적으로 Fix 2/3 가 같은 race 의 잔존 페일오버 경로를 막는다. Fix 4/5/6 은 코드 위생/안정성 개선.

증상 #1~#5 는 모두 위 race 의 다른 표현이며, #6 (화면 공유) 도 동일 push/broadcast 경로를 타기 때문에 같은 패치로 동시 해소될 가능성이 높음.

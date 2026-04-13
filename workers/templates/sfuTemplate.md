# SFU Template 아키텍처 문서

## 개요

Cloudflare Calls 기반 SFU 화상회의 구현.
Cloudflare 공식 구현체인 [cloudflare/meet](https://github.com/cloudflare/meet)의 `partytracks` 라이브러리 패턴을 참조하여 설계.

---

## 참조 소스

| 소스 | 위치 |
|---|---|
| Cloudflare Meet | https://github.com/cloudflare/meet |
| partytracks 라이브러리 | https://github.com/cloudflare/partykit/tree/main/packages/partytracks |
| partytracks 핵심 클래스 | `packages/partytracks/src/client/PartyTracks.ts` |
| partytracks 유틸리티 | `packages/partytracks/src/client/Peer.utils.ts` (FIFOScheduler, BulkRequestDispatcher) |

---

## 파일 구조

```
brand/public/js/sfu/
  ├── SFUApp.js           # 진입점, 세션 생성 및 초기화
  ├── WebRTCManager.js    # Cloudflare Calls API 통신, PeerConnection 관리
  ├── SignalingClient.js   # WebSocket 시그널링 (방 참여, 트랙 교환)
  ├── UIManager.js         # DOM 관리, 그리드 레이아웃, 컨트롤
  └── MediaManager.js      # 카메라/마이크/배경필터 관리

res200/workers/templates/
  └── sfuTemplate.js       # HTML/CSS 템플릿 (Cloudflare Worker에서 서빙)

webrtc/workers/
  └── webrtc-worker.js     # Cloudflare Calls API 프록시 (세션/트랙/renegotiate)

websocket/
  └── server.js            # WebSocket 시그널링 서버 (방 관리, 브로드캐스트)
```

---

## Cloudflare Calls API 흐름

### 세션 생성
```
Client → POST /calls/session → webrtc-worker → POST /v1/apps/{appId}/sessions/new
         (body 없음)                              → { sessionId }
```

### Push (로컬 트랙 → SFU)
```
1. pc.addTransceiver(track, { direction: 'sendonly' })
2. pc.createOffer() → pc.setLocalDescription(offer)
3. POST /calls/sessions/{id}/tracks/new
   Body: { sessionDescription: { type: 'offer', sdp }, tracks: [{ location: 'local', mid, trackName }] }
4. Response: { sessionDescription: { type: 'answer', sdp }, tracks: [...] }
5. pc.setRemoteDescription(answer)
6. _waitForStableSignaling()   ← partytracks 패턴
```

### Pull (원격 트랙 구독)
```
1. POST /calls/sessions/{id}/tracks/new
   Body: { tracks: [{ location: 'remote', sessionId, trackName }] }    ← SDP 없음!
2. Response: { requiresImmediateRenegotiation: true, sessionDescription: { type: 'offer', sdp }, tracks: [...] }
3. pc.setRemoteDescription(offer)
4. pc.createAnswer() → pc.setLocalDescription(answer)
5. PUT /calls/sessions/{id}/renegotiate
   Body: { sessionDescription: { type: 'answer', sdp } }              ← answer만 전송!
6. _waitForStableSignaling()   ← partytracks 패턴
```

### Close (트랙 종료, 화면 공유 중지 등)
```
1. transceiver.stop()
2. pc.createOffer() → pc.setLocalDescription(offer)
3. PUT /calls/sessions/{id}/tracks/close
   Body: { tracks: [{ mid }], sessionDescription: { type: 'offer', sdp }, force: false }
4. Response: { sessionDescription: { type: 'answer', sdp } }
5. pc.setRemoteDescription(answer)
6. _waitForStableSignaling()   ← partytracks 패턴
```

---

## 핵심 설계 원칙 (partytracks 기반)

### 1. FIFOScheduler (엄격한 직렬 실행)

모든 Calls API 작업(push, pull, close)은 단일 큐(`_taskQueue`)를 통해 **순차 실행**.
동시에 두 개의 API 호출이 진행되면 406 에러 발생 가능.

```javascript
_enqueue(fn) {
    const task = this._taskQueue.then(fn).catch(e => { ... });
    this._taskQueue = task;
    return task;
}
```

partytracks 원본: `FIFOScheduler.schedule(task)`

### 2. signalingStateIsStable 대기

모든 SDP 교환 후 PeerConnection의 signaling state가 `stable`이 될 때까지 대기.
**이를 생략하면 다음 작업의 SDP 교환이 실패**할 수 있음 (특히 다수 참가자 환경).

```javascript
_waitForStableSignaling(timeoutMs = 5000) {
    // signaling state가 'stable'이 아니면 이벤트 리스너로 대기
    // 5초 timeout 후 에러 throw
}
```

partytracks 원본: `signalingStateIsStable(peerConnection)`

### 3. Push/Pull 역할 분리

| 엔드포인트 | 용도 | SDP 방향 |
|---|---|---|
| `POST /tracks/new` | push (local tracks + offer) | Client → Server (offer) → Client (answer) |
| `POST /tracks/new` | pull (remote tracks, SDP 없음) | Server → Client (offer) |
| `PUT /renegotiate` | pull 완료 후 answer 전송 전용 | Client → Server (answer) |
| `PUT /tracks/close` | 트랙 종료 (offer) | Client → Server (offer) → Client (answer) |

**중요**: `/renegotiate`는 **절대 offer를 보내지 않음**. answer 전송 전용.

### 4. BulkRequestDispatcher (배치 처리)

partytracks는 `setTimeout(0)`을 사용하여 같은 이벤트 루프 tick 내의 요청을 배치 처리.
현재 gate1253 구현은 `pendingRemoteTracks` 배열로 유사하게 동작.

partytracks 배치 크기 제한: 32 (push), 32 (pull), 32 (close)

---

## 그리드 레이아웃

참가자 수에 따라 동적으로 열 수를 조정 (UIManager.updateGridLayout):

| 참가자 수 | 열 수 | 레이아웃 |
|---|---|---|
| 1명 | 1열 | 전체화면 |
| 2~4명 | 2열 | 2×2 그리드 |
| 5~9명 | 3열 | 3×3 정사각형 |
| 10~16명 | 4열 | 4×4 그리드 |
| 17명+ | 5열 | 5열 그리드 |

sfuTemplate.js CSS 기본값: `grid-template-columns: 1fr` (JS가 동적 제어)

---

## Simulcast 전략

참가자 수에 따라 수신 품질 자동 조절:

| 참가자 수 | RID | 품질 |
|---|---|---|
| 1~2명 | `h` | 고화질 (1200kbps) |
| 3~4명 | `m` | 중화질 (300kbps) |
| 5명+ | `l` | 저화질 (100kbps) |

송신측 인코딩 설정:
```javascript
sendEncodings: [
    { rid: 'h', maxBitrate: 1_200_000, scaleResolutionDownBy: 1 },
    { rid: 'm', maxBitrate: 300_000, scaleResolutionDownBy: 2 },
    { rid: 'l', maxBitrate: 100_000, scaleResolutionDownBy: 4 }
]
```

---

## WebSocket 시그널링 메시지

| 메시지 타입 | 방향 | 설명 |
|---|---|---|
| `join` | Client → Server → Broadcast | 방 참여, 기존 참가자에게 알림 |
| `leave` | Client → Server → Broadcast | 방 퇴장 |
| `user-count` | Server → All | 현재 참가자 수 |
| `tracks-update` | Client → Broadcast | 로컬 트랙 메타데이터 (sessionId, trackName, mid) |
| `speaker-update` | Client → Broadcast | VAD 기반 발화자 표시 |

---

## 화면 공유

- 한 번에 한 명만 화면 공유 가능 (`_remoteScreenSharerSid`로 추적)
- 화면 공유 시작: `pc.addTransceiver(screenTrack, { direction: 'sendonly' })` → `pushLocalTracks()`
- 화면 공유 중지: `closeScreenTrack()` → `/tracks/close` API 사용
- 매 공유마다 새 transceiver 생성 (기존 것 재사용 시 SFU가 중복 트랙 배포)

---

## 2024-04-13 리팩터링 이력

### 문제
9명 회의 시 9번째 사용자가 세션만 있고 방에 혼자 존재하는 현상.

### 원인 분석
Cloudflare Meet의 partytracks 구현과 비교하여 3가지 구조적 차이 발견:

1. **signalingStateIsStable 대기 누락**: push/pull 후 signaling state 안정화 대기 없이 다음 작업 실행 → 9번째 사용자가 16개 트랙을 pull할 때 SDP 협상 충돌
2. **`/renegotiate`에 offer 전송**: partytracks에서는 answer 전용 엔드포인트. offer를 보내면 Cloudflare Calls API에서 예기치 않은 동작 발생 가능
3. **push/pull 미분리**: `renegotiate()` 함수가 push와 SDP 업데이트를 혼합 처리

### 수정 내용
- `_waitForStableSignaling()` 추가 (모든 SDP 교환 후 호출)
- `renegotiate()` → `pushLocalTracks()` 분리 (push 전용, 트랙 없으면 no-op)
- `/renegotiate`는 pull 완료 후 answer 전송 시에만 사용
- `renegotiate()` alias 유지 (SFUApp.js 하위 호환)

### 그리드 레이아웃 수정
- `UIManager.updateGridLayout()` 메서드 추가
- 참가자 수 기반 동적 열 수 조정 (1~5열)
- sfuTemplate.js CSS: `auto-fit minmax(320px, 1fr)` → `1fr` (JS 제어)

---

## 주의사항

- **절대 push와 pull을 같은 API 요청에 포함하지 말 것** → 406 에러 발생
- **모든 Calls API 호출은 FIFOScheduler를 통해 직렬화할 것** → 동시 호출 금지
- **SDP 교환 후 반드시 stable 대기할 것** → 다수 참가자 환경에서 필수
- **화면 공유 종료는 `/tracks/close`를 사용할 것** → `/renegotiate`로 처리 시 406 발생
- **WebSocket 서버에 인원 제한 없음** → Cloudflare Calls 플랫폼도 제한 없음 (수천 명 지원)

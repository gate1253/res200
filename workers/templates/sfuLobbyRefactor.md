# SFU Lobby / Rejoin Refactor (v2.1.0)

## 배경

v2.0.0 까지의 SFU 클라이언트는 페이지 로드와 동시에 `getUserMedia` →
Calls 세션 생성 → WebSocket 연결 → `/tracks/new` push 를 모두 자동 실행했다.
그 결과:

- 사용자가 입장 전에 카메라·마이크·배경을 미리 설정할 방법이 없었다.
- "Leave" 버튼이 `location.reload()` 를 호출하여 배경·토글 상태가 초기화됐다.
- 20명 이상이 붙을 경우 개별 peer 의 업링크 비트레이트가 과했다.

이 문서는 Lobby(대기실) / Join / Leave→Rejoin 구조로 재구성한 결과를 정리한다.

---

## 요구사항 매핑

| # | 요구사항 | 반영 위치 |
|---|---|---|
| 1 | 초기 Lobby (서버 통신 없음) | `SFUApp.boot()`, `UIManager.showLobby()` |
| 2 | "Join Meeting" 버튼으로만 통신 시작 | `UIManager.bindLobbyEvents()` → `SFUApp.start()` |
| 3 | 최대 20명 안정화 (360p / low-bitrate) | `MediaManager.initPreview()`, `WebRTCManager.init()` simulcast ladder |
| 4 | Leave → Lobby 복귀 (설정 보존) | `SFUApp.leaveToLobby()`, `MediaManager.stopForLeave()` |
| 5 | cloudflare/meet 패턴 참조 (mid 매핑) | `WebRTCManager` — 기존 partytracks 패턴 유지 |
| 6 | 익명 세션 ID (nickname 없음) | 변경 없음 (Calls sessionId 재사용) |
| 7 | 화면 공유는 고해상도·우선순위 유지 | 별도 transceiver, simulcast 미적용 |

---

## 상태 머신

```
            ┌──────────────────────────────────────────┐
            │                                          │
            ▼                                          │
   ┌─────────────┐   joinBtn click   ┌──────────────┐  │
   │   LOBBY     │ ────────────────▶│   MEETING    │  │
   │             │                   │              │  │
   │  preview    │                   │  signaling + │  │
   │  only       │                   │  Calls push  │  │
   └─────────────┘ ◀──────────────── └──────────────┘  │
                    leaveBtn (confirm)                 │
                    close PC/WS, keep cameraStream     │
                                                       │
                    rejoin: 같은 흐름으로 재진입 ─────┘
```

### LOBBY 상태에서 살아 있는 리소스

- `MediaManager.cameraStream` (카메라 + 마이크)
- `MediaManager.isMicOn`, `isVideoOn`
- `MediaManager.currentBgMode`, `currentBgValue`

### LOBBY 상태에서 **존재하지 않는** 리소스

- `SFUApp.signalingClient` === `null`
- `SFUApp.webrtcManager` === `null`
- `SFUApp.callsSessionId` === `null`
- 어떤 `fetch()` 도 아직 발생하지 않음

---

## 파일별 변경 요약

### `brand/public/js/sfu/SFUApp.js`

- 생성자에서 `signalingClient` / `webrtcManager` 를 **만들지 않는다**. 매 join 마다 fresh instance 생성.
- `boot()` 신규 — 페이지 로드 시 호출. 카메라 프리뷰만 초기화.
- `start()` 재정의 — Join 버튼에서만 호출. 세션 생성 → PC init → WS 연결 → track push.
- `_buildSendStream()` 신규 — 배경필터 적용 여부에 따라 cameraStream 또는 processedStream 을 선택해 WebRTCManager.init 에 전달.
- `leaveToLobby()` 신규 — 세션/PC/WS 를 닫고 프리뷰만 살려둔 채 로비로 복귀.
- `window.onload` → `DOMContentLoaded` 로 교체, `app.boot()` 만 호출.

### `brand/public/js/sfu/UIManager.js`

- Lobby 전용 요소 캐시 (`#lobby`, `#lobbyVideo`, `#lobbyPreview`, `#lobbyMicBtn`, `#lobbyVideoBtn`, `#lobbyBgMenu`, `#joinBtn`).
- `showLobby()` / `showMeeting()` — `body.lobby-mode` 클래스 토글로 UI 전환.
- `attachLobbyPreview(stream)` — 로비 프리뷰에 스트림 부착. 기존 배경필터가 있으면 자동 재적용.
- `bindLobbyEvents()` — joinBtn, 로비 mic/video 토글, 로비 bg 옵션. 미팅 컨트롤과 상태를 상호 동기화한다 (`_syncMicButtons`, `_syncVideoButtons`).
- `bindMeetingEvents()` — 기존 bindEvents 를 분리. `this.app.webrtcManager` 가 null 일 수 있으므로 screen toggle 핸들러는 null 체크 후 무시.
- `_applyBackground(type, value, { targetVideo })` 신규 — 로비/미팅에서 공통 호출되는 배경 적용 루틴.
- `handleLeave()` → `this.app.leaveToLobby()` (페이지 리로드 제거).
- `resetMeetingUI()` 신규 — remote 컨테이너 제거, screen 버튼/bg 메뉴 복구.

### `brand/public/js/sfu/WebRTCManager.js`

- Simulcast 비트레이트 하향:

  | rid | v2.0.0 | v2.1.0 |
  |-----|--------|--------|
  | h   | 1.2 Mbps | 400 kbps |
  | m   | 300 kbps | 180 kbps |
  | l   | 100 kbps | 80 kbps  |

  360p 소스 기준이며, 20명 회의에서 모든 peer 가 'l' 레이어로 수신되므로 다운링크 총합 ≈ 20 × 80 kbps = 1.6 Mbps.

- `close()` 강화 — `transceiversMap` / `subscribedTracks` / `remoteStreams` / `pendingRemoteTracks` / `_deferredOnTrackEvents` / `_pushedMids` / `_remoteScreenSharerSid` / `_taskQueue` / `_pushScheduled` / `_pullScheduled` 를 모두 초기화. 매 Rejoin 에서 fresh WebRTCManager 가 만들어지지만, 방어적 초기화로 stale state 유입 차단.

- **유지된 기존 로직**:
  - FIFOScheduler (`_enqueue` + `_taskQueue`)
  - `_waitForStableSignaling()` — partytracks 의 `signalingStateIsStable`
  - PUSH 는 `/tracks/new` + offer, PULL 은 `/tracks/new` (SDP 없음) → `requiresImmediateRenegotiation` 시 `/renegotiate` 로 answer 만 전송
  - 서버 응답의 `mid` 로 transceiver 매핑 → mid 없을 때의 order-based fallback

### `brand/public/js/sfu/MediaManager.js`

- 이미 분리되어 있던 구조 유지:
  - `initPreview()` — 360p, 24fps 카메라 + 마이크. VAD 미시작.
  - `activateForMeeting()` — VAD 시작.
  - `stopForLeave()` — VAD / screenStream / processedStream 정리, `cameraStream`·토글·배경 설정은 **보존**.
  - `stopAll()` — 모든 리소스 해제 (페이지 언로드용).

### `res200/workers/templates/sfuTemplate.js`

- `body.lobby-mode` 일 때 `#header`·`#controls`·`#videoGrid` 숨김.
- `#lobby .lobby-preview[data-error]` 스타일 — 카메라 권한 실패 시 사유 표시.
- 버전 표기 v2.0.0 → v2.1.0.
- 기존 Lobby HTML 은 이미 존재했기 때문에 마크업 변경은 최소화.

---

## Leave → Rejoin 시퀀스

```
[Meeting]
   │  leaveBtn click → confirm()
   ▼
SFUApp.leaveToLobby()
   ├─ SignalingClient.disconnect()            ← leave 메시지 송신 후 WS close
   │     └─ 서버에 leave 이벤트 → 타 peer 들의 handleRemoteLeave 로 피어 제거
   ├─ WebRTCManager.close()                   ← PC.close(), 모든 map/flag 초기화
   ├─ MediaManager.stopForLeave()             ← VAD/processedStream/screenStream 해제
   │     └─ cameraStream, 토글·배경 설정 보존
   ├─ UIManager.resetMeetingUI()              ← remote 컨테이너 제거
   ├─ UIManager.attachLobbyPreview()          ← 보존된 cameraStream 을 다시 로비 비디오에 부착
   └─ UIManager.showLobby()                   ← body.lobby-mode 전환

[Lobby] (배경/토글 상태 복원됨)

joinBtn click → SFUApp.start()
   └─ 새 SignalingClient + 새 WebRTCManager + 새 callsSessionId 로 재진입
```

---

## 비트레이트 검토 (20 참가자)

### 업링크 (각 클라이언트가 SFU 로 올리는 양)

- Audio (Opus): ≈ 40 kbps
- Video simulcast (h+m+l 동시 전송): 400 + 180 + 80 ≈ 660 kbps
- **합계**: 약 **700 kbps**

### 다운링크 (각 클라이언트가 SFU 에서 받는 양, 20명 기준)

- 본인 제외 19명의 오디오: 19 × 40 = 760 kbps
- 본인 제외 19명의 비디오 'l' 레이어: 19 × 80 = 1,520 kbps
- **합계**: 약 **2.3 Mbps**

가정용 ADSL / 회사 Wi-Fi 에서 충분히 처리 가능한 수준.

### 화면 공유 예외

- 소스: 1920×1080 @ 15~30 fps (`getDisplayMedia`)
- simulcast 미적용, 단일 transceiver
- Cloudflare Calls 의 디폴트 비트레이트 할당 (≈ 2 Mbps) 그대로 사용
- `_selectSimulcastLayer()` 는 `trackName === 'screen'` 인 경우 호출되지 않으므로 해상도 저하 없음

---

## 테스트 체크리스트

- [ ] 로비 진입 시 네트워크 탭에서 `/calls/session`·WebSocket 호출이 발생하지 않는지 확인
- [ ] 로비에서 mic / video 버튼 토글 → Join → 미팅 컨트롤의 상태가 일치하는지 확인
- [ ] 로비에서 Blur / 색상 / 이미지 배경 선택 → Join 후 동일 배경으로 송출되는지 확인
- [ ] Leave → 확인 다이얼로그 → 로비 복귀 → 배경 / mic / video 상태 그대로 유지
- [ ] 로비 → Rejoin → 새 sessionId 로 재진입, 타 참가자와 정상 연결
- [ ] 10명 이상 (목표 20명) 회의에서 안정성 확인
- [ ] 회의 중 화면 공유 ON → OFF → ON 반복 시 정상 재송출
- [ ] 본인 화면 공유 중 Leave → Rejoin 시 화면 공유 상태 초기화 (재공유 가능)
- [ ] 타 참가자 공유 중이면 공유 버튼이 숨겨지는지 확인

---

## 향후 개선 여지

- 로비에서 마이크 / 카메라 **장치 선택** (deviceId 기반 dropdown)
- 로비에서 실시간 입력 볼륨 미터 표시
- Rejoin 시 이전 회의의 "화면 공유 잠금" 상태가 로비 전환 직후 짧게 남을 수 있음 (서버 브로드캐스트로 재동기화 여부 확인 필요)
- `_selectSimulcastLayer()` 의 임계값을 참가자 수뿐 아니라 스피커 여부 기반으로 확장 (active speaker → 'h', 그 외 → 'l')

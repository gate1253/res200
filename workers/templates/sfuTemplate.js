
export function getSfuHtml(target, targetCode, apiUrl) {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Cloudflare SFU Conference</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
<!-- MediaPipe Libraries for Background Blur -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
<style>
:root {
    --primary: #4f46e5;
    --primary-glow: rgba(79, 70, 229, 0.4);
    --bg: #0f172a;
    --card-bg: rgba(30, 41, 59, 0.7);
    --glass: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --success: #10b981;
    --danger: #ef4444;
}

body {
    margin: 0; padding: 0; background-color: var(--bg); color: var(--text);
    font-family: 'Outfit', sans-serif;
    overflow: hidden;
}

.bg-gradient {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 20% 30%, #1e293b 0%, #0f172a 100%);
    z-index: -1;
}
.bg-glow {
    position: absolute; width: 40vw; height: 40vw;
    background: var(--primary-glow);
    filter: blur(100px);
    border-radius: 50%;
    animation: pulse 10s infinite alternate;
}

@keyframes pulse {
    0% { transform: translate(-10%, -10%) scale(1); opacity: 0.3; }
    100% { transform: translate(20%, 20%) scale(1.2); opacity: 0.6; }
}

/* ── Lobby ─────────────────────────────────────────────── */

#lobby {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 500;
    background: var(--bg);
}

#lobby .lobby-card {
    display: flex; flex-direction: column;
    align-items: center; gap: 24px;
    background: var(--card-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(20px);
    border-radius: 28px;
    padding: 40px 48px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5);
    max-width: 440px; width: 90%;
}

#lobby .lobby-title {
    font-size: 26px; font-weight: 600;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #e0e7ff, #a5b4fc);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

#lobby .lobby-preview {
    position: relative;
    width: 320px; height: 240px;
    background: #1e293b;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid var(--glass-border);
}

#lobbyVideo {
    width: 100%; height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
}

#lobby .lobby-preview.no-video #lobbyVideo { opacity: 0; }
#lobby .lobby-preview.no-video::before {
    content: 'Camera Off';
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    color: var(--text-muted); font-size: 16px; font-weight: 500;
}
#lobby .lobby-preview[data-error]:not([data-error=""])::before {
    content: attr(data-error);
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
    padding: 0 16px;
    text-align: center;
}

#lobbyBgMenu {
    display: flex; flex-wrap: wrap; gap: 8px;
    justify-content: center; width: 100%;
}

#lobbyBgMenu .bg-option {
    width: 36px; height: 36px;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px; font-weight: 600;
    color: white;
}
#lobbyBgMenu .bg-option:hover { border-color: var(--primary); transform: scale(1.1); }
#lobbyBgMenu .bg-option.active { border-color: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
#lobbyBgMenu .bg-option.none { background: #334155; }
#lobbyBgMenu .bg-option.blur { background: #475569; }
#lobbyBgMenu .bg-option.blur::after { content: 'BLUR'; }

.lobby-controls {
    display: flex; gap: 10px;
}

.lobby-controls .control-btn {
    width: 44px; height: 44px;
    border-radius: 14px;
    border: 1px solid var(--glass-border);
    background: var(--glass);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}
.lobby-controls .control-btn:hover { background: var(--primary); transform: translateY(-2px); }
.lobby-controls .control-btn.active { background: var(--primary); }
.lobby-controls .control-btn.off { background: rgba(239,68,68,0.2); color: var(--danger); border-color: rgba(239,68,68,0.3); }
.lobby-controls .control-btn svg { width: 22px; height: 22px; fill: currentColor; }

#joinBtn {
    width: 100%;
    padding: 14px 32px;
    font-size: 17px; font-weight: 600;
    font-family: 'Outfit', sans-serif;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.25s;
    box-shadow: 0 8px 24px var(--primary-glow);
    letter-spacing: 0.3px;
}
#joinBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px var(--primary-glow);
}
#joinBtn:active { transform: translateY(0); }

/* ── Header ───────────────────────────────────────────── */

#header {
    position: fixed; top: 0; left: 0; width: 100%;
    padding: 20px 30px;
    display: flex; justify-content: space-between; align-items: center;
    z-index: 100;
    box-sizing: border-box;
    background: linear-gradient(to bottom, rgba(15, 23, 42, 0.8), transparent);
}

#roomInfo { display: flex; flex-direction: column; gap: 4px; }
#roomTitle { font-size: 20px; font-weight: 600; letter-spacing: -0.5px; }
#status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); }
.dot { height: 8px; width: 8px; background-color: var(--success); border-radius: 50%; box-shadow: 0 0 10px var(--success); }
.dot.warning { background-color: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
.dot.error { background-color: var(--danger); box-shadow: 0 0 10px var(--danger); }

#userCount {
    background: var(--glass);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
}

/* ── Video Grid ───────────────────────────────────────── */

#videoGrid {
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: 1fr;
    gap: 12px;
    padding: 80px 20px 110px;
    width: 100vw;
    height: 100vh;
    box-sizing: border-box;
    align-items: stretch;
    justify-items: stretch;
    transition: grid-template-columns 0.4s ease;
    overflow: hidden;
}

.video-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--card-bg);
    border-radius: 24px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(5px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    animation: fadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

.video-container.no-video::before {
    content: attr(data-initials);
    width: 90px;
    height: 90px;
    background: linear-gradient(135deg, #334155, #1e293b);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 600;
    color: var(--text-muted);
    border: 2px solid var(--glass-border);
    transition: all 0.3s ease;
}

video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.5s ease;
}

.video-container.no-video video { opacity: 0; }

.video-container.screen-share-mode {
    cursor: zoom-in;
    grid-column: 1 / -1;
    grid-row: 1 / -1;
    z-index: 10;
}

.video-container.screen-share-mode video {
    object-fit: contain;
}

.label {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(15, 23, 42, 0.6);
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    z-index: 5;
}

#localVideoContainer {
    border: 2px solid var(--primary);
    box-shadow: 0 0 30px var(--primary-glow);
}

/* ── Controls ─────────────────────────────────────────── */

#controls {
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    background: rgba(15, 23, 42, 0.7);
    padding: 12px 24px;
    border-radius: 30px;
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    z-index: 100;
    transition: transform 0.3s ease, opacity 0.3s ease;
}

#controls:hover { transform: translateX(-50%) scale(1.02); }

.control-btn {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    border: none;
    background: var(--glass);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--glass-border);
}

.control-btn:hover {
    background: var(--primary);
    transform: translateY(-5px);
    box-shadow: 0 10px 20px var(--primary-glow);
    border-color: rgba(255,255,255,0.2);
}

.control-btn.active {
    background: var(--primary);
    border-color: var(--primary-glow);
}

.control-btn.off {
    background: rgba(239, 68, 68, 0.2);
    color: var(--danger);
    border-color: rgba(239, 68, 68, 0.3);
}

.control-btn.off:hover {
    background: var(--danger);
    color: white;
}

.control-btn svg { width: 24px; height: 24px; fill: currentColor; }

#leaveBtn {
    background: rgba(239, 68, 68, 0.8);
    width: 58px;
}
#leaveBtn:hover {
    background: var(--danger);
}

#bgMenu {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    padding: 16px;
    border-radius: 20px;
    display: none;
    flex-wrap: wrap;
    gap: 10px;
    width: 280px;
    justify-content: center;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    z-index: 100;
    transition: all 0.3s ease;
    opacity: 0;
}
#bgMenu.show {
    display: flex;
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}
.bg-option {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: white;
}
.bg-option:hover { border-color: var(--primary); transform: scale(1.1); }
.bg-option.active { border-color: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
.bg-option.none { background: #334155; }
.bg-option.blur { background: #475569; position: relative; }
.bg-option.blur::after { content: 'BLUR'; }
.bg-option.color-picker { background: linear-gradient(45deg, red, blue); }
#bgColorInput { display: none; }
#procCanvas { display: none; }

/* ── Meeting view hidden by default ───────────────────── */
#meetingView { display: none; }
#meetingView.active { display: contents; }

body.lobby-mode #controls,
body.lobby-mode #header,
body.lobby-mode #videoGrid { display: none; }

</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="bg-glow" style="top: 10%; left: 10%;"></div>
  <div class="bg-glow" style="bottom: 10%; right: 10%; animation-delay: -5s;"></div>

  <!-- ── Lobby ────────────────────────────────────────── -->
  <div id="lobby">
    <div class="lobby-card">
        <div class="lobby-title">SFU Premium Session</div>
        <div class="lobby-preview" id="lobbyPreview">
            <video id="lobbyVideo" autoplay playsinline muted></video>
        </div>

        <div class="lobby-controls">
            <button id="lobbyMicBtn" class="control-btn active" title="Toggle Microphone">
                <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </button>
            <button id="lobbyVideoBtn" class="control-btn active" title="Toggle Camera">
                <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
            </button>
        </div>

        <div id="lobbyBgMenu">
            <div class="bg-option none active" data-type="none" title="No Filter">None</div>
            <div class="bg-option blur" data-type="blur" title="Blur Background"></div>
            <div class="bg-option" data-type="color" data-value="#00ff00" style="background:#00ff00;" title="Green Screen"></div>
            <div class="bg-option" data-type="color" data-value="#000000" style="background:#000000;" title="Black"></div>
            <div class="bg-option" data-type="image" data-value="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80" style="background-image:url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=100&q=80')" title="Office"></div>
            <div class="bg-option" data-type="image" data-value="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80" style="background-image:url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=100&q=80')" title="Mountains"></div>
        </div>

        <button id="joinBtn">Join Meeting</button>
    </div>
  </div>

  <!-- ── Meeting View ─────────────────────────────────── -->
  <div id="meetingView">
    <div id="header">
        <div id="roomInfo">
            <div id="roomTitle">SFU Premium Session</div>
            <div id="status"><span class="dot warning"></span><span>Initializing...</span></div>
        </div>
        <div id="userCount">0 Participants</div>
        <div id="version" style="font-size:11px;color:var(--text-muted);opacity:0.6;">v2.1.0</div>
    </div>

    <div id="videoGrid">
        <div id="localVideoContainer" class="video-container" data-initials="ME">
            <video id="localVideo" autoplay playsinline muted></video>
            <div class="label">You</div>
        </div>
    </div>

    <canvas id="procCanvas"></canvas>

    <div id="bgMenu">
        <div class="bg-option none active" data-type="none" title="No Filter">None</div>
        <div class="bg-option blur" data-type="blur" title="Blur Background"></div>
        <div class="bg-option" data-type="color" data-value="#00ff00" style="background:#00ff00;" title="Green Screen"></div>
        <div class="bg-option" data-type="color" data-value="#000000" style="background:#000000;" title="Black"></div>
        <div class="bg-option color-picker" id="colorPickerBtn" title="Custom Color">Color</div>
        <input type="color" id="bgColorInput">
        <div class="bg-option" data-type="image" data-value="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80" style="background-image:url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=100&q=80')" title="Office"></div>
        <div class="bg-option" data-type="image" data-value="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80" style="background-image:url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=100&q=80')" title="Mountains"></div>
    </div>

    <div id="controls">
        <button id="toggleMic" class="control-btn active" title="Toggle Microphone">
            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
        <button id="toggleVideo" class="control-btn active" title="Toggle Camera">
            <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
        </button>
        <button id="toggleScreen" class="control-btn" title="Share Screen">
            <svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
        </button>
        <button id="toggleBlur" class="control-btn" title="Background Options">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>
        </button>
        <button id="leaveBtn" class="control-btn" title="Leave Call">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        </button>
    </div>
  </div>

  <script>
    window.SFU_CONFIG = {
        signalingUrl: "${target}",
        targetCode: "${targetCode}",
        apiUrl: "${apiUrl}"
    };
  </script>
  <script src="/js/sfu/MediaManager.js"></script>
  <script src="/js/sfu/SignalingClient.js"></script>
  <script src="/js/sfu/WebRTCManager.js"></script>
  <script src="/js/sfu/UIManager.js"></script>
  <script src="/js/sfu/SFUApp.js"></script>
</body>
</html>
    `;
}

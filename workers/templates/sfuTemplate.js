
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

#videoGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    grid-auto-rows: 1fr;
    gap: 20px;
    padding: 100px 30px 120px;
    width: 100vw;
    height: 100vh;
    box-sizing: border-box;
    align-items: center;
    justify-items: center;
    transition: all 0.5s ease;
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
</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="bg-glow" style="top: 10%; left: 10%;"></div>
  <div class="bg-glow" style="bottom: 10%; right: 10%; animation-delay: -5s;"></div>

  <div id="header">
    <div id="roomInfo">
        <div id="roomTitle">⚡ SFU Premium Session</div>
        <div id="status"><span class="dot warning"></span><span>Initializing...</span></div>
    </div>
    <div id="userCount">0 Participants</div>
  </div>

  <div id="videoGrid">
    <div id="localVideoContainer" class="video-container" data-initials="ME">
        <video id="localVideo" autoplay playsinline muted></video>
        <div class="label">You (Host)</div>
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

  <script>
    const signalingUrl = "${target}";
    const targetCode = "${targetCode}";
    const apiUrl = "${apiUrl}"; // API Worker
    
    // UI Elements
    const videoGrid = document.getElementById('videoGrid');
    const localVideo = document.getElementById('localVideo');
    const statusMsg = document.querySelector('#status span');
    const statusDot = document.querySelector('#status .dot');
    const userCountBadge = document.getElementById('userCount');
    const toggleMicBtn = document.getElementById('toggleMic');
    const toggleVideoBtn = document.getElementById('toggleVideo');
    const toggleScreenBtn = document.getElementById('toggleScreen');
    const toggleBlurBtn = document.getElementById('toggleBlur');
    const leaveBtn = document.getElementById('leaveBtn');
    const bgMenu = document.getElementById('bgMenu');
    const colorPickerBtn = document.getElementById('colorPickerBtn');
    const bgColorInput = document.getElementById('bgColorInput');
    const procCanvas = document.getElementById('procCanvas');
    const ctx = procCanvas.getContext('2d');
    
    // State
    let localStream;
    let cameraStream;
    let screenStream;
    let processedStream;
    let activeStreamType = 'camera'; 
    let callsSessionId; 
    let ws;
    let pc;
    let isMicOn = true;
    let isVideoOn = true;
    let currentBgMode = 'none';
    let currentBgValue = '';
    const bgImageObj = new Image();
    bgImageObj.crossOrigin = "anonymous";
    
    const subscribedTracks = new Set();
    const transceiversMap = new Map();
    const remoteStreams = new Map(); // sessionId -> MediaStream
    let pendingRemoteTracks = [];
    
    // Init Selfie Segmentation
    let selfieSegmentation;
    function initSelfieSegmentation() {
        if (selfieSegmentation) return;
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/' + file
        });
        selfieSegmentation.setOptions({ modelSelection: 1, selfieMode: false });
        selfieSegmentation.onResults(onSegmentationResults);
    }
    
    function onSegmentationResults(results) {
        if (currentBgMode === 'none') return;
        procCanvas.width = results.image.width;
        procCanvas.height = results.image.height;
        ctx.save();
        ctx.clearRect(0, 0, procCanvas.width, procCanvas.height);
        
        ctx.filter = 'blur(1px) contrast(5) brightness(1.1) blur(0.5px)';
        ctx.drawImage(results.segmentationMask, 0, 0, procCanvas.width, procCanvas.height);
        ctx.filter = 'none';
        
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(results.image, 0, 0, procCanvas.width, procCanvas.height);
        
        ctx.globalCompositeOperation = 'destination-over';
        if (currentBgMode === 'blur') {
            ctx.filter = 'blur(15px) brightness(1.1)';
            ctx.drawImage(results.image, 0, 0, procCanvas.width, procCanvas.height);
            ctx.filter = 'none';
        } else if (currentBgMode === 'color') {
            ctx.fillStyle = currentBgValue;
            ctx.fillRect(0, 0, procCanvas.width, procCanvas.height);
        } else if (currentBgMode === 'image') {
            if (bgImageObj.complete) {
                ctx.drawImage(bgImageObj, 0, 0, procCanvas.width, procCanvas.height);
            } else {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, procCanvas.width, procCanvas.height);
            }
        }
        ctx.restore();
    }
    
    function setupRemoteVideo(info, track) {
        console.info('[SFU] setupRemoteVideo:', info.sessionId, info.trackName);
        let containerId = 'container-' + info.sessionId;
        if (info.trackName === 'screen') containerId += '-screen';
        
        let container = document.getElementById(containerId);
        if (!container) {
             container = createVideoContainer(info.sessionId, info.trackName === 'screen');
        }
        
        const videoId = 'video-' + info.sessionId + (info.trackName === 'screen' ? '-screen' : '');
        const video = document.getElementById(videoId);
        if (video) {
            const streamId = info.sessionId + (info.trackName === 'screen' ? '-screen' : '');
            let stream = remoteStreams.get(streamId);
            if (!stream) {
                stream = new MediaStream();
                remoteStreams.set(streamId, stream);
            }
            
            // Check if track is already in stream by ID to avoid duplicates
            if (!stream.getTracks().some(t => t.id === track.id)) {
                console.info('[SFU] Adding track to stream:', info.trackName, track.id);
                stream.addTrack(track);
            }

            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            
            // Always try to play if it's not already playing or to ensure new tracks are rendered
            video.play().catch(e => {
                if (e.name !== 'AbortError') console.error("[SFU] Video play failed:", e);
            });
            
            container.classList.remove('no-video');
        }
    }

    async function processBg() {
        if (!cameraStream) return;
        initSelfieSegmentation();
        const videoElem = document.createElement('video');
        videoElem.srcObject = cameraStream;
        videoElem.muted = true; // Fix local echo
        await videoElem.play();
        procCanvas.width = videoElem.videoWidth; 
        procCanvas.height = videoElem.videoHeight;
        const sendToMediaPipe = async () => {
            if (currentBgMode === 'none') return;
            await selfieSegmentation.send({ image: videoElem });
            requestAnimationFrame(sendToMediaPipe);
        };
        sendToMediaPipe();
    }
    
    async function start() {
        try {
            statusMsg.textContent = 'Acquiring Media...';
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 360 } },
                audio: true
            });
            localStream = cameraStream;
            localVideo.srcObject = localStream;
            localVideo.style.transform = 'scaleX(-1)';
            
            const sessionRes = await fetch(apiUrl + '/calls/session', { method: 'POST' });
            if (!sessionRes.ok) throw new Error('Failed to create Calls session');
            const sessionData = await sessionRes.json();
            callsSessionId = sessionData.sessionId;
            
            pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
                bundlePolicy: 'max-bundle'
            });
            
            pc.ontrack = (event) => {
                const mid = event.transceiver.mid;
                const info = transceiversMap.get(mid);
                console.info('[SFU] pc.ontrack:', mid, info, event.track.kind);
                if (info && info.location === 'remote') {
                    setupRemoteVideo(info, event.track);
                }
            };
            
            cameraStream.getTracks().forEach(track => {
               pc.addTransceiver(track, { direction: 'sendonly' });
            });
            
            connectWebSocket();
            await renegotiate();
            
            statusMsg.textContent = 'Connected';
            statusDot.className = 'dot';
            
        } catch (err) {
            console.error(err);
            statusMsg.textContent = 'Error: ' + err.message;
            statusDot.className = 'dot error';
        }
    }
    
    function createVideoContainer(sessionId, isScreen) {
        let id = 'container-' + sessionId;
        if (isScreen) id += '-screen';
        
        const container = document.createElement('div');
        container.id = id;
        container.className = 'video-container no-video';
        if (isScreen) container.classList.add('screen-share-mode');
        container.innerHTML = \`
            <video id="video-\${sessionId}\${isScreen ? '-screen' : ''}" autoplay playsinline></video>
            <div class="label">\${isScreen ? 'Screen Share' : 'Participant'}</div>\`;
        
        videoGrid.appendChild(container);
        return container;
    }
    
    let isRenegotiating = false;

    async function renegotiate() {
        if (!pc || !callsSessionId || isRenegotiating) return;
        isRenegotiating = true;
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            const sessionDescription = pc.localDescription;
            const tracks = [];
            const localTracksInfo = [];
            
            pc.getTransceivers().forEach(t => {
                 if (t.direction === 'sendonly' || t.direction === 'sendrecv') {
                     let trackName = 'video';
                     if (t.sender.track) {
                         if (t.sender.track.kind === 'audio') trackName = 'audio';
                         else if (screenStream && screenStream.getVideoTracks().includes(t.sender.track)) trackName = 'screen';
                         else trackName = 'video';
                     }
                     tracks.push({ location: 'local', mid: t.mid, trackName });
                     localTracksInfo.push({ trackName, mid: t.mid });
                     transceiversMap.set(t.mid, { location: 'local', trackName, sessionId: callsSessionId });
                 } else if (t.direction === 'recvonly') {
                     const mapped = transceiversMap.get(t.mid);
                     if (mapped && mapped.location === 'remote') {
                         tracks.push({ location: 'remote', sessionId: mapped.sessionId, trackName: mapped.trackName });
                     }
                 }
            });
            
            const res = await fetch(apiUrl + \`/calls/sessions/\${callsSessionId}/tracks/new\`, {
                method: 'POST',
                body: JSON.stringify({ sessionDescription, tracks })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.errorDescription || 'Renegotiation failed');
    
            if (data.tracks) {
                data.tracks.forEach(t => {
                    if (t.mid) {
                        transceiversMap.set(t.mid, { 
                            location: t.location || 'remote', 
                            sessionId: t.sessionId, 
                            trackName: t.trackName 
                        });
                    }
                });
            }

            const remoteSdp = data.sdp || (data.sessionDescription ? data.sessionDescription.sdp : null);
            const remoteType = data.type || (data.sessionDescription ? data.sessionDescription.type : 'answer');
            await pc.setRemoteDescription(new RTCSessionDescription({ type: remoteType, sdp: remoteSdp }));

            if (ws && ws.readyState === WebSocket.OPEN) {
                console.info('[SFU] Sending tracks-update after renegotiate');
                ws.send(JSON.stringify({ 
                    type: 'tracks-update', 
                    sessionId: callsSessionId, 
                    clientId: callsSessionId, 
                    tracks: localTracksInfo, 
                    room: targetCode 
                }));
            }
        } catch (e) {
            console.error("[SFU] Renegotiate Error:", e);
        } finally {
            isRenegotiating = false;
            if (pendingRemoteTracks.length > 0) setTimeout(processPendingTracks, 100);
        }
    }

function connectWebSocket() {
    console.info('[SFU] Connecting WebSocket...');
    ws = new WebSocket(signalingUrl);
    ws.onopen = () => {
        console.info('[SFU] WebSocket Connected');
        ws.send(JSON.stringify({ 
            type: 'join', 
            room: targetCode, 
            sessionId: callsSessionId,
            clientId: callsSessionId 
        }));
        // Ensure others see us even if renegotiate finished before onopen
        broadcastLocalTracks();
    };
    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        console.info('[SFU] WS Message:', msg.type, msg.sessionId || msg.clientId);
        if (msg.type === 'user-count') userCountBadge.textContent = msg.count + ' Participants';
        else if (msg.type === 'tracks-update' && (msg.sessionId !== callsSessionId && msg.clientId !== callsSessionId)) handleRemoteTracksUpdate(msg);
        else if (msg.type === 'leave' && (msg.sessionId !== callsSessionId && msg.clientId !== callsSessionId)) handleRemoteLeave(msg);
        else if (msg.type === 'join' && (msg.sessionId !== callsSessionId && msg.clientId !== callsSessionId)) {
            broadcastLocalTracks();
        }
    };
}

function broadcastLocalTracks() {
    if (!pc || !ws || ws.readyState !== WebSocket.OPEN) return;
    console.info('[SFU] Broadcasting local tracks');
    const localTracksInfo = [];
    pc.getTransceivers().forEach(t => {
        if ((t.direction === 'sendonly' || t.direction === 'sendrecv') && t.sender.track) {
            let trackName = 'video';
            if (t.sender.track.kind === 'audio') trackName = 'audio';
            else if (screenStream && screenStream.getVideoTracks().includes(t.sender.track)) trackName = 'screen';
            localTracksInfo.push({ trackName, mid: t.mid });
        }
    });
    ws.send(JSON.stringify({ 
        type: 'tracks-update', 
        sessionId: callsSessionId, 
        clientId: callsSessionId, 
        tracks: localTracksInfo, 
        room: targetCode 
    }));
}

async function processPendingTracks() {
    if (!pc || !callsSessionId || isRenegotiating || pendingRemoteTracks.length === 0) return;
    
    isRenegotiating = true;
    const tracksToProcess = [...pendingRemoteTracks];
    pendingRemoteTracks = [];
    
    try {
        const res = await fetch(apiUrl + \`/calls/sessions/\${callsSessionId}/tracks/new\`, {
            method: 'POST',
            body: JSON.stringify({
                tracks: tracksToProcess.map(t => ({
                    location: 'remote', sessionId: t.sessionId, trackName: t.trackName
                }))
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.errorDescription || 'Subscription failed');

        if (data.sessionDescription && data.sessionDescription.type === 'offer') {
            if (data.tracks) {
                data.tracks.forEach(t => {
                    if (t.mid) {
                        transceiversMap.set(t.mid, { 
                            location: t.location || 'remote', sessionId: t.sessionId, trackName: t.trackName 
                        });
                        subscribedTracks.add(t.sessionId + ':' + t.trackName);
                    }
                });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            await fetch(apiUrl + \`/calls/sessions/\${callsSessionId}/renegotiate\`, {
                method: 'POST',
                body: JSON.stringify({ 
                    sessionDescription: { type: 'answer', sdp: pc.localDescription.sdp }
                })
            });
        }
    } catch (e) {
        console.error('[SFU] Subscription Error:', e);
        pendingRemoteTracks = [...tracksToProcess, ...pendingRemoteTracks];
    } finally {
        isRenegotiating = false;
        if (pendingRemoteTracks.length > 0) setTimeout(processPendingTracks, 500);
    }
}

function handleRemoteTracksUpdate(msg) {
    const sid = msg.sessionId || msg.clientId;
    if (!sid) return;
    console.info('[SFU] handleRemoteTracksUpdate from:', sid);
    const currentRemoteTracks = new Set(msg.tracks.map(t => sid + ':' + t.trackName));
    
    msg.tracks.forEach(t => {
        const key = sid + ':' + t.trackName;
        if (!subscribedTracks.has(key)) {
            if (!pendingRemoteTracks.some(p => p.sessionId === sid && p.trackName === t.trackName)) {
                pendingRemoteTracks.push({ sessionId: sid, trackName: t.trackName });
            }
        }
    });

    for (let key of subscribedTracks) {
        if (key.startsWith(sid + ':') && !currentRemoteTracks.has(key)) {
            subscribedTracks.delete(key);
            const trackName = key.split(':')[1];
            removeRemoteTrackUI(sid, trackName);
        }
    }

    if (pendingRemoteTracks.length > 0) processPendingTracks();
}

function handleRemoteLeave(msg) {
    const sid = msg.sessionId || msg.clientId;
    if (!sid) return;
    console.info('[SFU] handleRemoteLeave from:', sid);
    for (let key of Array.from(subscribedTracks)) {
        if (key.startsWith(sid + ':')) {
            subscribedTracks.delete(key);
        }
    }
    const containers = document.querySelectorAll(\`[id^="container-\${sid}"]\`);
    containers.forEach(c => c.remove());
    
    pc.getTransceivers().forEach(t => {
        const mapped = transceiversMap.get(t.mid);
        if (mapped && mapped.sessionId === sid) {
            t.direction = 'inactive';
            transceiversMap.delete(t.mid);
        }
    });
    remoteStreams.delete(sid);
    remoteStreams.delete(sid + '-screen');
}

function removeRemoteTrackUI(sid, trackName) {
    console.info('[SFU] removeRemoteTrackUI:', sid, trackName);
    const streamId = sid + (trackName === 'screen' ? '-screen' : '');
    const stream = remoteStreams.get(streamId);
    
    if (stream) {
        const kind = (trackName === 'audio') ? 'audio' : 'video';
        stream.getTracks().forEach(t => {
            if (t.kind === kind) {
                console.info('[SFU] Stopping and removing track:', kind, t.id);
                t.stop();
                stream.removeTrack(t);
            }
        });
    }

    // Only remove the container if NO tracks remain for this participant/type
    let hasOtherTracks = false;
    if (trackName === 'screen') {
        hasOtherTracks = subscribedTracks.has(sid + ':screen');
    } else {
        hasOtherTracks = subscribedTracks.has(sid + ':video') || subscribedTracks.has(sid + ':audio');
    }

    if (!hasOtherTracks) {
        console.info('[SFU] Removing container as no tracks remain:', streamId);
        let id = 'container-' + sid;
        if (trackName === 'screen') id += '-screen';
        const el = document.getElementById(id);
        if (el) el.remove();
        remoteStreams.delete(streamId);
    }
    
    pc.getTransceivers().forEach(t => {
        const mapped = transceiversMap.get(t.mid);
        if (mapped && mapped.sessionId === sid && mapped.trackName === trackName) {
            t.direction = 'inactive';
            transceiversMap.delete(t.mid);
        }
    });
}

toggleMicBtn.onclick = () => {
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
    toggleMicBtn.classList.toggle('active', isMicOn);
    toggleMicBtn.classList.toggle('off', !isMicOn);
};

toggleVideoBtn.onclick = () => {
    isVideoOn = !isVideoOn;
    if (cameraStream) cameraStream.getVideoTracks().forEach(t => t.enabled = isVideoOn);
    toggleVideoBtn.classList.toggle('active', isVideoOn);
    toggleVideoBtn.classList.toggle('off', !isVideoOn);
    document.getElementById('localVideoContainer').classList.toggle('no-video', !isVideoOn);
};

toggleScreenBtn.onclick = async () => {
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
        toggleScreenBtn.classList.remove('active');
        pc.getTransceivers().forEach(t => {
            const mapped = transceiversMap.get(t.mid);
            if (mapped && mapped.location === 'local' && mapped.trackName === 'screen') {
                t.direction = 'inactive';
                t.sender.replaceTrack(null);
            }
        });
        await renegotiate();
    } else {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            toggleScreenBtn.classList.add('active');
            pc.addTransceiver(screenStream.getVideoTracks()[0], { direction: 'sendonly' });
            await renegotiate();
            screenStream.getVideoTracks()[0].onended = () => toggleScreenBtn.click();
        } catch (e) {
            console.error(e);
        }
    }
};

toggleBlurBtn.onclick = (e) => { e.stopPropagation(); bgMenu.classList.toggle('show'); };
document.querySelectorAll('.bg-option').forEach(opt => {
    opt.onclick = async () => {
        document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('active'));
        opt.classList.add('active');
        const type = opt.dataset.type;
        const value = opt.dataset.value;
        if (type === 'none') {
            currentBgMode = 'none';
            replaceVideoTrack(cameraStream.getVideoTracks()[0]);
        } else {
            currentBgMode = type;
            currentBgValue = value;
            if (type === 'image') bgImageObj.src = value;
            await processBg();
            if (activeStreamType !== 'canvas') {
                activeStreamType = 'canvas';
                processedStream = procCanvas.captureStream(30);
                replaceVideoTrack(processedStream.getVideoTracks()[0]);
            }
        }
    }
});

function replaceVideoTrack(newTrack) {
    pc.getTransceivers().forEach(t => {
        const info = transceiversMap.get(t.mid);
        if (info && info.location === 'local' && info.trackName === 'video') {
            t.sender.replaceTrack(newTrack);
        }
    });
    localVideo.srcObject = new MediaStream([newTrack]);
}

window.onclick = () => bgMenu.classList.remove('show');
bgMenu.onclick = (e) => e.stopPropagation();
leaveBtn.onclick = () => {
    if (confirm('Exit?')) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.info('[SFU] Sending leave signal and closing WS');
            ws.send(JSON.stringify({ 
                type: 'leave', 
                room: targetCode, 
                sessionId: callsSessionId,
                clientId: callsSessionId
            }));
            ws.close();
        }
        if (pc) pc.close();
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        if (screenStream) screenStream.getTracks().forEach(track => track.stop());

        videoGrid.innerHTML = '';
        statusMsg.textContent = 'Disconnected';
        statusDot.className = 'dot error';

        const rejoinBtn = document.createElement('button');
        rejoinBtn.textContent = 'Rejoin';
        rejoinBtn.style.padding = '10px 20px';
        rejoinBtn.style.fontSize = '16px';
        rejoinBtn.style.marginTop = '20px';
        rejoinBtn.style.cursor = 'pointer';
        rejoinBtn.style.background = '#4f46e5';
        rejoinBtn.style.color = 'white';
        rejoinBtn.style.border = 'none';
        rejoinBtn.style.borderRadius = '8px';
        rejoinBtn.onclick = () => location.reload();

        const msgContainer = document.createElement('div');
        msgContainer.style.position = 'fixed';
        msgContainer.style.top = '50%';
        msgContainer.style.left = '50%';
        msgContainer.style.transform = 'translate(-50%, -50%)';
        msgContainer.style.textAlign = 'center';
        msgContainer.style.color = 'white';
        msgContainer.innerHTML = '<h1>Session Ended</h1>';
        msgContainer.appendChild(rejoinBtn);

        document.body.appendChild(msgContainer);
        document.getElementById('controls').style.display = 'none';
        document.getElementById('header').style.display = 'none';
    }
};

window.onload = start;
  </script>
</body>
</html>
    `;
}

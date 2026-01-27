export function getWebRtcHtml(target, targetCode, iceServers = []) {
    // iceServers가 제공되지 않았을 때의 기본값 (STUN)
    const defaultIceServers = JSON.stringify(iceServers.length > 0 ? iceServers : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]);

    return `
<!DOCTYPE html> 
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>WebRTC Premium Conference</title>
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

/* Background Animation */
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

.status-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 4px 10px;
    border-radius: 8px;
    background: rgba(16, 185, 129, 0.2);
    color: var(--success);
    border: 1px solid rgba(16, 185, 129, 0.3);
    backdrop-filter: blur(10px);
    z-index: 5;
}

#localVideoContainer {
    border: 2px solid var(--primary);
    box-shadow: 0 0 30px var(--primary-glow);
}

#localVideo {
    /* Mirroring is now handled dynamically in JS */
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

/* Hidden canvas for video processing */
#procCanvas {
    display: none;
}

/* Background Menu */
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

@media (max-width: 768px) {
    #videoGrid { grid-template-columns: 1fr; padding: 80px 15px 100px; }
    #controls { bottom: 20px; padding: 10px 20px; }
    .control-btn { width: 44px; height: 44px; }
}

</style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="bg-glow" style="top: 10%; left: 10%;"></div>
  <div class="bg-glow" style="bottom: 10%; right: 10%; animation-delay: -5s;"></div>

  <div id="header">
    <div id="roomInfo">
        <div id="roomTitle">⚡ Premium Session</div>
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
    <button id="toggleMic" class="control-btn" title="Toggle Microphone">
        <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
    </button>
    <button id="toggleVideo" class="control-btn" title="Toggle Camera">
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
    
	let localStream;
    let cameraStream; // Original camera stream
    let screenStream; // Original screen stream
    let processedStream; // Stream from canvas (blurred/bg)
    let activeStreamType = 'camera'; // 'camera', 'screen', 'canvas'

    let ws;
	const peerConnections = {}; // clientId: RTCPeerConnection (Main)
    const screenPeerConnections = {}; // clientId: RTCPeerConnection (Screen)
	const clientId = Date.now() + Math.floor(Math.random() * 1000);
    const screenClientId = clientId + '_screen';
	const processedMessageIds = new Set();
	let lastTimestamp = 0;
    
    let isMicOn = true;
    let isVideoOn = true;
    let currentBgMode = 'none'; // 'none', 'blur', 'color', 'image'
    let currentBgValue = '';
    const bgImageObj = new Image();
    bgImageObj.crossOrigin = "anonymous";
	
	const rtcConfig = {
		iceServers: ${defaultIceServers},
        iceCandidatePoolSize: 10
	};

    // MediaPipe Selfie Segmentation Setup
    let selfieSegmentation;
    function initSelfieSegmentation() {
        if (selfieSegmentation) return;
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/' + file
        });
selfieSegmentation.setOptions({
    modelSelection: 1, // 0 for landscape, 1 for close-up
    selfieMode: false,
});
selfieSegmentation.onResults(onSegmentationResults);
    }

function onSegmentationResults(results) {
    if (currentBgMode === 'none') return;

    // Use source video resolution if possible
    procCanvas.width = results.image.width;
    procCanvas.height = results.image.height;

    ctx.save();
    ctx.clearRect(0, 0, procCanvas.width, procCanvas.height);

    // 1. Process mask: Ultra-sharp thresholding to remove "halo"
    const maskCtx = results.segmentationMask;
    ctx.filter = 'blur(1px) contrast(5) brightness(1.1) blur(0.5px)'; // Sharpen then slightly smooth
    ctx.drawImage(maskCtx, 0, 0, procCanvas.width, procCanvas.height);
    ctx.filter = 'none';

    // 2. Draw person (source-in)
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, procCanvas.width, procCanvas.height);

    // 3. Draw background behind person
    ctx.globalCompositeOperation = 'destination-over';
    
    // Performance tip: only apply blur if mode is blur
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

async function processBg() {
    if (!cameraStream) return;
    initSelfieSegmentation();

    const videoElem = document.createElement('video');
    videoElem.srcObject = cameraStream;
    await videoElem.play();

    // Use source video resolution
    procCanvas.width = videoElem.videoWidth || 1280;
    procCanvas.height = videoElem.videoHeight || 720;

    const sendToMediaPipe = async () => {
        if (currentBgMode === 'none') return;
        await selfieSegmentation.send({ image: videoElem });
        requestAnimationFrame(sendToMediaPipe);
    };
    sendToMediaPipe();
}

async function start() {
    try {
        statusMsg.textContent = 'Requesting media access...';
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
        }).catch(async (e) => {
            console.warn('Camera/Mic failed:', e);
            return await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        });

        if (cameraStream) {
            localStream = cameraStream;
            localVideo.srcObject = localStream;
            localVideo.style.transform = 'scaleX(-1)';
            if (!cameraStream.getVideoTracks().length) {
                document.getElementById('localVideoContainer').classList.add('no-video');
                isVideoOn = false;
                toggleVideoBtn.classList.add('off');
            }
        } else {
            document.getElementById('localVideoContainer').classList.add('no-video');
            isVideoOn = false; isMicOn = false;
            toggleMicBtn.classList.add('off');
            toggleVideoBtn.classList.add('off');
        }

        statusMsg.textContent = 'Connecting to signaling...';
        setupSignaling();
    } catch (err) {
        console.error('Start error:', err);
    }
}

async function replaceVideoTrack(newStream) {
    const newTrack = newStream.getVideoTracks()[0];
    localStream = newStream;
    localVideo.srcObject = localStream;

    // Handle mirroring: mirror camera/canvas, not screen
    localVideo.style.transform = (activeStreamType === 'screen' ? 'none' : 'scaleX(-1)');

    // Update track in all peer connections
    for (const peerId in peerConnections) {
        const pc = peerConnections[peerId];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
            sender.replaceTrack(newTrack);
        }
    }
}

function setupSignaling() {
    if (signalingUrl.startsWith('ws')) {
        connectWebSocket();
    } else {
        console.log('Using HTTP polling');
        sendSignal({ type: 'join' });
        schedulePoll(500);
    }
}

function connectWebSocket() {
    ws = new WebSocket(signalingUrl);
    ws.onopen = () => {
        console.log('WebSocket connected');
        statusDot.className = 'dot';
        statusMsg.textContent = 'Live in ' + targetCode;
        sendSignal({ type: 'join' });
    };
    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'user-count') {
                userCountBadge.textContent = msg.count + ' Participants';
                return;
            }
            if (msg.clientId !== clientId && msg.clientId !== screenClientId) {
                handleMessage(msg);
            }
        } catch (e) { console.error('WS parse error:', e); }
    };
    ws.onclose = () => {
        statusDot.className = 'dot warning';
        statusMsg.textContent = 'Reconnecting...';
        setTimeout(connectWebSocket, 3000);
    };
    ws.onerror = (e) => console.error('WS error:', e);
}

async function sendSignal(data, fromId = clientId) {
    data.room = targetCode;
    data.clientId = fromId;
    data.msgId = Math.random().toString(36).substring(2, 11);
    data.timestamp = Date.now();

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    } else {
        try {
            await fetch(signalingUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error('Signal send error:', e); }
    }
}

function schedulePoll(ms) {
    if (ws) return;
    setTimeout(async () => {
        await pollSignal();
        const interval = Object.keys(peerConnections).length === 0 ? 1000 : 3000;
        schedulePoll(interval);
    }, ms);
}

async function pollSignal() {
    try {
        const url = new URL(signalingUrl);
        url.searchParams.append('room', targetCode);
        const res = await fetch(url);
        if (res.ok && res.status !== 204) {
            const data = await res.json();
            const messages = Array.isArray(data) ? data : [data];
            messages.sort((a, b) => a.timestamp - b.timestamp);
            for (const msg of messages) {
                if (!msg || msg.clientId === clientId || msg.clientId === screenClientId) continue;
                const uniqueId = msg.timestamp + '-' + (msg.msgId || '0');
                if (processedMessageIds.has(uniqueId)) continue;
                processedMessageIds.add(uniqueId);
                if (msg.timestamp > lastTimestamp) {
                    lastTimestamp = msg.timestamp;
                    await handleMessage(msg);
                }
            }
        }
    } catch (e) { console.error('Poll error:', e); }
}

async function handleMessage(msg) {
    const peerId = msg.clientId;
    if (msg.type === 'join') {
        const isMsgScreen = peerId.toString().includes('_screen');
        // Normal peer joins: use ID comparison to decide who initiates
        if (!isMsgScreen && clientId.toString() < peerId.toString()) {
            await createPeerConnection(peerId, true, clientId, peerConnections);
        }
        // If WE are currently sharing screen, proactively invite EVERY joiner
        if (screenStream) {
            await createPeerConnection(peerId, true, screenClientId, screenPeerConnections);
        }
    } else if (msg.type === 'leave') {
        removePeer(peerId);
        removePeer(peerId + '_screen');
    } else if (msg.type === 'offer' && (msg.targetId === clientId || msg.targetId === screenClientId)) {
        const isTargetScreen = msg.targetId === screenClientId;
        const targetMap = isTargetScreen ? screenPeerConnections : peerConnections;
        const pc = await createPeerConnection(peerId, false, msg.targetId, targetMap);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', targetId: peerId, sdp: answer }, msg.targetId);
    } else if (msg.type === 'answer' && (msg.targetId === clientId || msg.targetId === screenClientId)) {
        const isTargetScreen = msg.targetId === screenClientId;
        const targetMap = isTargetScreen ? screenPeerConnections : peerConnections;
        const pc = targetMap[peerId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    } else if (msg.type === 'candidate' && (msg.targetId === clientId || msg.targetId === screenClientId)) {
        const isTargetScreen = msg.targetId === screenClientId;
        const targetMap = isTargetScreen ? screenPeerConnections : peerConnections;
        const pc = targetMap[peerId];
        if (pc && msg.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(e => { });
        }
    }
}

async function createPeerConnection(peerId, isInitiator, myId, connectionMap) {
    if (connectionMap[peerId]) return connectionMap[peerId];

    const pc = new RTCPeerConnection(rtcConfig);
    connectionMap[peerId] = pc;

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({ type: 'candidate', targetId: peerId, candidate: event.candidate }, myId);
        }
    };

    pc.ontrack = (event) => {
        updatePeerVideo(peerId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
        const badge = document.getElementById('badge-' + peerId);
        if (badge) {
            badge.textContent = pc.connectionState;
            if (pc.connectionState === 'connected') badge.style.color = 'var(--success)';
            if (pc.connectionState === 'failed') badge.style.color = 'var(--danger)';
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            // When a connection fails, only remove THAT specific connection in THAT map
            setTimeout(() => { 
                if (pc.connectionState !== 'connected' && connectionMap[peerId] === pc) {
                    removePeerSession(peerId, connectionMap);
                } 
            }, 5000);
        }
    };

    if (myId === clientId && localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    } else if (myId === screenClientId && screenStream) {
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
    }

    if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', targetId: peerId, sdp: offer }, myId);
    }

    updatePeerVideo(peerId, null);
    return pc;
}

function updatePeerVideo(peerId, stream) {
    const isScreen = peerId.toString().includes('_screen');
    const containerId = 'container-' + peerId;
    let container = document.getElementById(containerId);
    
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'video-container no-video';
        container.setAttribute('data-initials', isScreen ? 'S' : 'P');

        const video = document.createElement('video');
        video.id = 'video-' + peerId;
        video.autoplay = true; video.playsinline = true;
        if (isScreen) {
            video.style.objectFit = 'contain';
            video.style.transform = 'none';
        }

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = isScreen ? 'Screen Share' : 'Participant';

        const badge = document.createElement('div');
        badge.id = 'badge-' + peerId;
        badge.className = 'status-badge';
        badge.textContent = 'connecting';

        container.appendChild(video);
        container.appendChild(label);
        container.appendChild(badge);
        videoGrid.appendChild(container);
    }

    if (stream) {
        const video = document.getElementById('video-' + peerId);
        video.srcObject = stream;
        const hasVideo = stream.getVideoTracks().length > 0;
        if (hasVideo) container.classList.remove('no-video');
    }
}

function removePeerSession(peerId, map) {
    if (map[peerId]) {
        map[peerId].close();
        delete map[peerId];
    }
    // Only remove UI if BOTH maps are empty for this user (or if it's a specific screen ID)
    const isScreenId = peerId.toString().includes('_screen');
    const baseId = isScreenId ? peerId.split('_')[0] : peerId;
    const hasAny = peerConnections[baseId] || screenPeerConnections[baseId] || 
                   peerConnections[baseId + '_screen'] || screenPeerConnections[baseId + '_screen'];
    
    if (!hasAny || isScreenId) {
        const container = document.getElementById('container-' + peerId);
        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'scale(0.8)';
            setTimeout(() => container.remove(), 500);
        }
    }
}

function removePeer(peerId) {
    removePeerSession(peerId, peerConnections);
    removePeerSession(peerId + '_screen', screenPeerConnections);
    // Explicitly check the other way too just in case
    removePeerSession(peerId, screenPeerConnections);
}

toggleMicBtn.onclick = () => {
    if (!localStream) return;
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach(track => track.enabled = isMicOn);
    toggleMicBtn.classList.toggle('off', !isMicOn);
};

toggleVideoBtn.onclick = () => {
    if (!localStream) return;
    isVideoOn = !isVideoOn;
    localStream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
    toggleVideoBtn.classList.toggle('off', !isVideoOn);
    document.getElementById('localVideoContainer').classList.toggle('no-video', !isVideoOn);
};

// Screen Share Toggle Logic
toggleScreenBtn.onclick = async () => {
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
        toggleScreenBtn.classList.remove('active');
        sendSignal({ type: 'leave' }, screenClientId);
        
        // Local cleanup: ONLY close screen connections
        for (const id in screenPeerConnections) {
            removePeerSession(id, screenPeerConnections);
        }
        
        const sc = document.getElementById('container-' + screenClientId);
        if (sc) sc.remove();
    } else {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            toggleScreenBtn.classList.add('active');
            updatePeerVideo(screenClientId, screenStream);
            const badge = document.getElementById('badge-' + screenClientId);
            if (badge) badge.textContent = 'Local Screen';
            sendSignal({ type: 'join' }, screenClientId);
            
            // Wait for track readiness
            await new Promise(r => setTimeout(r, 500));

            // Proactively invite EVERYBODY to the screen session
            // Filter out other screen IDs to prevent redundant screen-to-screen connections
            const invitePromises = Object.keys(peerConnections).map(async (id) => {
                if (id.includes('_screen')) return;
                console.log(`[ScreenShare] Inviting peer ${ id } from sender ${ screenClientId } `);
                try {
                    await createPeerConnection(id, true, screenClientId, screenPeerConnections);
                    console.log(`[ScreenShare] Invitation sent to ${ id } `);
                } catch (err) {
                    console.error(`[ScreenShare] Failed to invite ${ id }: `, err);
                }
            });
            await Promise.all(invitePromises);

            screenStream.getVideoTracks()[0].onended = () => {
                if (screenStream) toggleScreenBtn.click();
            };
        } catch (e) {
            console.error('Screen share failed:', e);
            toggleScreenBtn.classList.remove('active');
        }
    }
};

// Background Options Logic
toggleBlurBtn.onclick = (e) => {
    e.stopPropagation();
    bgMenu.classList.toggle('show');
};

document.querySelectorAll('.bg-option').forEach(opt => {
    opt.onclick = async () => {
        document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('active'));
        opt.classList.add('active');

        const type = opt.dataset.type;
        const value = opt.dataset.value;

        if (type === 'none') {
            currentBgMode = 'none';
            toggleBlurBtn.classList.remove('active');
            activeStreamType = 'camera';
            replaceVideoTrack(cameraStream);
        } else {
            currentBgMode = type;
            currentBgValue = value;
            if (type === 'image') bgImageObj.src = value;

            toggleBlurBtn.classList.add('active');
            await processBg();

            if (activeStreamType !== 'canvas') {
                activeStreamType = 'canvas';
                processedStream = procCanvas.captureStream(30);
                replaceVideoTrack(processedStream);
            }
        }
    };
});

colorPickerBtn.onclick = (e) => {
    e.stopPropagation();
    bgColorInput.click();
};

bgColorInput.oninput = () => {
    currentBgMode = 'color';
    currentBgValue = bgColorInput.value;
    toggleBlurBtn.classList.add('active');
    processBg();
    if (activeStreamType !== 'canvas') {
        activeStreamType = 'canvas';
        processedStream = procCanvas.captureStream(30);
        replaceVideoTrack(processedStream);
    }
};

window.onclick = () => bgMenu.classList.remove('show');
bgMenu.onclick = (e) => e.stopPropagation();

leaveBtn.onclick = () => {
    if (confirm('회의를 종료하시겠습니까?')) {
        if (ws) ws.close();
        Object.keys(peerConnections).forEach(removePeer);
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        if (screenStream) screenStream.getTracks().forEach(t => t.stop());
        document.body.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;gap:20px;">' +
                    '<h1 style="font-size:32px;font-weight:600;">회의가 종료되었습니다</h1>' +
                    '<button onclick="location.reload()" style="padding:12px 24px;border-radius:12px;border:none;background:var(--primary);color:white;cursor:pointer;font-family:inherit;">다시 참여하기</button>' +
                '</div>';
    }
};

window.onload = start;
  </script >
</body >
</html > `;
}


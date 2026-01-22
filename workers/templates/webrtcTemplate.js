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
<title>WebRTC Multi-User Call</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { 
    margin: 0; padding: 0; background-color: #121212; color: #e0e0e0; 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden; 
}
#videoGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    grid-auto-rows: 1fr;
    gap: 15px;
    padding: 15px;
    width: 100vw;
    height: calc(100vh - 80px);
    box-sizing: border-box;
    align-items: center;
    justify-items: center;
}
.video-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #1e1e1e;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    transition: all 0.3s ease;
}
.video-container.no-video::before {
    content: attr(data-initials);
    width: 80px;
    height: 80px;
    background: #3a3a3a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: bold;
    color: #888;
}
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.label {
    position: absolute;
    bottom: 12px;
    left: 12px;
    background: rgba(0,0,0,0.5);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    backdrop-filter: blur(8px);
    z-index: 5;
}
.status-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(40, 167, 69, 0.6);
    backdrop-filter: blur(8px);
    z-index: 5;
}
#localVideoContainer {
    border: 2px solid #4ade80;
}
#localVideo {
    transform: scaleX(-1);
}
#controls {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 20px;
    background: rgba(30, 30, 30, 0.8);
    padding: 12px 24px;
    border-radius: 40px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    z-index: 100;
}
.control-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: #333;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}
.control-btn:hover { background: #444; transform: scale(1.1); }
.control-btn.off { background: #ea4335; }
.control-btn svg { width: 24px; height: 24px; fill: currentColor; }

#status {
    position: fixed;
    top: 15px;
    left: 20px;
    font-size: 14px;
    font-weight: 500;
    color: #888;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
}
.dot { height: 10px; width: 10px; background-color: #4ade80; border-radius: 50%; }
.dot.warning { background-color: #fbbf24; }
.dot.error { background-color: #ef4444; }

</style>
</head>
<body>
  <div id="status"><span class="dot warning"></span>Initializing...</div>
  <div id="videoGrid">
    <div id="localVideoContainer" class="video-container" data-initials="Me">
        <video id="localVideo" autoplay playsinline muted></video>
        <div class="label">You</div>
    </div>
  </div>

  <div id="controls">
    <button id="toggleMic" class="control-btn" title="Toggle Microphone">
        <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
    </button>
    <button id="toggleVideo" class="control-btn" title="Toggle Camera">
        <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
    </button>
    <button id="leaveBtn" class="control-btn off" title="Leave Call">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
    </button>
  </div>


  <script>
	const signalingUrl = "${target}";
	const targetCode = "${targetCode}";
	const videoGrid = document.getElementById('videoGrid');
	const localVideo = document.getElementById('localVideo');
	const statusMsg = document.getElementById('status');
    const toggleMicBtn = document.getElementById('toggleMic');
    const toggleVideoBtn = document.getElementById('toggleVideo');
    const leaveBtn = document.getElementById('leaveBtn');
    
	let localStream;
    let ws;
	const peerConnections = {}; // clientId: RTCPeerConnection
	const clientId = Date.now() + Math.floor(Math.random() * 1000);
	const processedMessageIds = new Set();
	let lastTimestamp = 0;
    
    let isMicOn = true;
    let isVideoOn = true;
	
	const rtcConfig = {
		iceServers: ${defaultIceServers},
        iceCandidatePoolSize: 10
	};

	async function start() {
		try {
            statusMsg.innerHTML = '<span class="dot warning"></span> Requesting media access...';
			localStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
                audio: true 
            }).catch(async (e) => {
                console.warn('Camera/Mic failed, trying audio only or empty stream:', e);
                // 카메라가 없어도 공간을 차지하도록 더미 스트림 혹은 실패 처리
                return await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
            });

			if (localStream) {
                localVideo.srcObject = localStream;
                if (!localStream.getVideoTracks().length) {
                    document.getElementById('localVideoContainer').classList.add('no-video');
                    isVideoOn = false;
                    toggleVideoBtn.classList.add('off');
                }
            } else {
                document.getElementById('localVideoContainer').classList.add('no-video');
                isVideoOn = false;
                isMicOn = false;
                toggleMicBtn.classList.add('off');
                toggleVideoBtn.classList.add('off');
            }

			statusMsg.innerHTML = '<span class="dot"></span> Connecting to signaling...';
			
            setupSignaling();
		} catch (err) {
			console.error('Start error:', err);
		}
	}

    function setupSignaling() {
        if (signalingUrl.startsWith('ws')) {
            connectWebSocket();
        } else {
            console.log('Using HTTP polling fallback');
            sendSignal({ type: 'join' });
            schedulePoll(500);
        }
    }

    function connectWebSocket() {
        ws = new WebSocket(signalingUrl);
        ws.onopen = () => {
            console.log('WebSocket connected');
            statusMsg.innerHTML = '<span class="dot"></span> Live in ' + targetCode;
            sendSignal({ type: 'join' });
        };
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.clientId !== clientId) {
                    handleMessage(msg);
                }
            } catch (e) { console.error('WS parse error:', e); }
        };
        ws.onclose = () => {
            console.warn('WebSocket closed, retrying...');
            statusMsg.innerHTML = '<span class="dot error"></span> Reconnecting...';
            setTimeout(connectWebSocket, 3000);
        };
        ws.onerror = (e) => console.error('WS error:', e);
    }

	async function sendSignal(data) {
		data.room = targetCode;
		data.clientId = clientId;
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
                if (!ws) setTimeout(pollSignal, 100); 
            } catch (e) { console.error('Signal send error:', e); }
        }
	}

    function schedulePoll(ms) {
        if (ws) return; // WS 있으면 폴링 중지
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
                    if (!msg || msg.clientId === clientId) continue;
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
			if (clientId < peerId) {
			    await createPeerConnection(peerId, true);
            }
		} else if (msg.type === 'offer' && msg.targetId === clientId) {
			const pc = await createPeerConnection(peerId, false);
			await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			sendSignal({ type: 'answer', targetId: peerId, sdp: answer });
		} else if (msg.type === 'answer' && msg.targetId === clientId) {
			const pc = peerConnections[peerId];
			if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
		} else if (msg.type === 'candidate' && msg.targetId === clientId) {
			const pc = peerConnections[peerId];
			if (pc && msg.candidate) {
				pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(e => {});
			}
		}
	}

	async function createPeerConnection(peerId, isInitiator) {
        if (peerConnections[peerId]) return peerConnections[peerId];

		const pc = new RTCPeerConnection(rtcConfig);
		peerConnections[peerId] = pc;

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				sendSignal({ type: 'candidate', targetId: peerId, candidate: event.candidate });
			}
		};

		pc.ontrack = (event) => {
            updatePeerVideo(peerId, event.streams[0]);
		};
        
        pc.onconnectionstatechange = () => {
            const badge = document.getElementById('badge-' + peerId);
            if (badge) badge.textContent = pc.connectionState;
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                setTimeout(() => { if (pc.connectionState !== 'connected') removePeer(peerId); }, 5000);
            }
        };

		if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({ type: 'offer', targetId: peerId, sdp: offer });
        }
        
        // 피어가 연결되기 전이라도 공간을 차지하게 함
        updatePeerVideo(peerId, null);

        return pc;
	}
    
    function updatePeerVideo(peerId, stream) {
        let container = document.getElementById('container-' + peerId);
        if (!container) {
            container = document.createElement('div');
            container.id = 'container-' + peerId;
            container.className = 'video-container no-video';
            container.setAttribute('data-initials', 'P' + peerId.toString().slice(-2));
            
            const video = document.createElement('video');
            video.id = 'video-' + peerId;
            video.autoplay = true;
            video.playsinline = true;
            
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = 'Peer ' + peerId;

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
            stream.onremovetrack = () => {
                if (stream.getTracks().length === 0) container.classList.add('no-video');
            };
            // 줌인/줌아웃 같은 효과를 위해 video가 있으면 no-video 클래스 제거
            const hasVideo = stream.getVideoTracks().length > 0;
            if (hasVideo) container.classList.remove('no-video');
        }
    }
    
    function removePeer(peerId) {
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
        const container = document.getElementById('container-' + peerId);
        if (container) container.remove();
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

    leaveBtn.onclick = () => {
        if (confirm('Leave the call?')) {
            window.close();
            // fallback if window.close doesn't work
            document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-size:24px;">You have left the call.</div>';
            if (ws) ws.close();
            Object.keys(peerConnections).forEach(removePeer);
            if (localStream) localStream.getTracks().forEach(t => t.stop());
        }
    };
	
	window.onload = start;
  </script>
</body>
</html>`;
}


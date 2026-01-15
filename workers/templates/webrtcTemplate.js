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
    margin: 0; padding: 0; background-color: #1a1a1a; color: white; 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden; 
}
#videoGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    grid-auto-rows: 1fr;
    gap: 10px;
    padding: 10px;
    width: 100vw;
    height: 100vh;
    box-sizing: border-box;
    align-items: center;
    justify-items: center;
}
.video-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.label {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0,0,0,0.6);
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    backdrop-filter: blur(4px);
}
.status-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(40, 167, 69, 0.7);
}
#localVideoContainer {
    border: 2px solid #28a745;
}
#localVideo {
    transform: scaleX(-1);
}
#startButton {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 100;
	padding: 15px 30px;
	font-size: 20px;
	background-color: #28a745;
	color: white;
	border: none;
	border-radius: 8px;
	cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    transition: transform 0.2s;
}
#startButton:hover {
    transform: translate(-50%, -53%) scale(1.05);
}
#status {
    position: fixed;
    top: 10px;
    right: 15px;
    font-size: 13px;
    color: #aaa;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 5px;
}
.dot { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; }
</style>
</head>
<body>
  <button id="startButton">Join Call</button>
  <div id="status"><span class="dot" style="background-color: #ffc107"></span>Initializing...</div>
  <div id="videoGrid">
    <div id="localVideoContainer" class="video-container">
        <video id="localVideo" autoplay playsinline muted></video>
        <div class="label">You</div>
    </div>
  </div>

  <script>
	const signalingUrl = "${target}";
	const targetCode = "${targetCode}";
	const videoGrid = document.getElementById('videoGrid');
	const localVideo = document.getElementById('localVideo');
	const startButton = document.getElementById('startButton');
	const statusMsg = document.getElementById('status');
    
	let localStream;
	const peerConnections = {}; // clientId: RTCPeerConnection
	const clientId = Date.now() + Math.floor(Math.random() * 1000);
	const processedMessageIds = new Set();
	let lastTimestamp = 0;
	
	const rtcConfig = {
		iceServers: ${defaultIceServers}
	};

	async function start() {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			localVideo.srcObject = localStream;
			startButton.style.display = 'none';
			statusMsg.innerHTML = '<span class="dot"></span> Connected to ' + targetCode;
			
			await sendSignal({ type: 'join' });
			schedulePoll(500); 
		} catch (err) {
			console.error('Media error:', err);
            alert('카메라 또는 마이크에 접근할 수 없습니다.');
		}
	}

	async function sendSignal(data) {
		data.room = targetCode;
		data.clientId = clientId;
        data.msgId = Math.random().toString(36).substring(2, 15);
		try {
			await fetch(signalingUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
            // 신호를 보낸 후 즉시 폴링하여 응답 확인
            setTimeout(pollSignal, 100); 
		} catch (e) { console.error('Signal send error:', e); }
	}

    function schedulePoll(ms) {
        setTimeout(async () => {
            await pollSignal();
            // 연결된 피어가 없으면 1초, 있으면 3초 간격 (배터리/네트웍 절약)
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
                    
                    // 메시지 중복 처리 방지 (timestamp + msgId 조합)
                    const uniqueId = msg.timestamp + '-' + (msg.msgId || '0');
                    if (processedMessageIds.has(uniqueId)) continue;
                    processedMessageIds.add(uniqueId);
                    
					if (msg.timestamp > lastTimestamp) {
						lastTimestamp = msg.timestamp;
						await handleMessage(msg);
					}
				}
                // 오래된 메시지 ID 캐시 정리
                if (processedMessageIds.size > 100) {
                    const idsArr = Array.from(processedMessageIds);
                    idsArr.slice(0, 50).forEach(id => processedMessageIds.delete(id));
                }
			}
		} catch (e) { console.error('Poll error:', e); }
	}

	async function handleMessage(msg) {
        const peerId = msg.clientId;
        
		if (msg.type === 'join') {
            // 내가 먼저 들어와 있었다면 (내 ID가 더 작으면) 연결 시도
			if (clientId < peerId) {
                console.log('Initiating peer connection to', peerId);
			    await createPeerConnection(peerId, true);
            }
		} else if (msg.type === 'offer' && msg.targetId === clientId) {
			console.log('Received offer from', peerId);
			const pc = await createPeerConnection(peerId, false);
			await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			sendSignal({ type: 'answer', targetId: peerId, sdp: answer });
		} else if (msg.type === 'answer' && msg.targetId === clientId) {
			console.log('Received answer from', peerId);
			const pc = peerConnections[peerId];
			if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
		} else if (msg.type === 'candidate' && msg.targetId === clientId) {
			const pc = peerConnections[peerId];
			if (pc && msg.candidate) {
				try { 
                    await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); 
                } catch (e) { console.error('ICE adding error:', e); }
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
            console.log('Received remote track from', peerId);
            updatePeerVideo(peerId, event.streams[0]);
		};
        
        pc.onconnectionstatechange = () => {
            console.log('Peer', peerId, 'state:', pc.connectionState);
            const badge = document.getElementById('badge-' + peerId);
            if (badge) badge.textContent = pc.connectionState;
            
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                setTimeout(() => {
                    if (pc.connectionState !== 'connected') removePeer(peerId);
                }, 5000); // 5초 대기 후 여전히 끊겨있으면 제거
            }
        };

		localStream.getTracks().forEach(track => {
			pc.addTrack(track, localStream);
		});

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({ type: 'offer', targetId: peerId, sdp: offer });
        }

        return pc;
	}
    
    function updatePeerVideo(peerId, stream) {
        let video = document.getElementById('video-' + peerId);
        if (!video) {
            const container = document.createElement('div');
            container.id = 'container-' + peerId;
            container.className = 'video-container';
            
            video = document.createElement('video');
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
        video.srcObject = stream;
    }
    
    function removePeer(peerId) {
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
        const container = document.getElementById('container-' + peerId);
        if (container) container.remove();
    }
	
	startButton.addEventListener('click', start);
  </script>
</body>
</html>`;
}


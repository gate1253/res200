export function getWebRtcHtml(target, targetCode) {
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
    background: rgba(0,0,0,0.5);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
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
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
#status {
    position: fixed;
    top: 10px;
    right: 10px;
    font-size: 14px;
    color: #888;
    z-index: 10;
}
</style>
</head>
<body>
  <button id="startButton">Join Call</button>
  <div id="status">Connecting...</div>
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
	const lastProcessedTimestamps = new Set();
	let lastTimestamp = 0;
	
	const rtcConfig = {
		iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
	};

	async function start() {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			localVideo.srcObject = localStream;
			startButton.style.display = 'none';
			statusMsg.textContent = 'Active (Room: ' + targetCode + ')';
			
			sendSignal({ type: 'join' });
			setInterval(pollSignal, 2000);
		} catch (err) {
			console.error('Media error:', err);
            alert('Could not access camera/microphone.');
		}
	}

	async function sendSignal(data) {
		data.room = targetCode;
		data.clientId = clientId;
		try {
			await fetch(signalingUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
		} catch (e) { console.error('Signal send error:', e); }
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
					if (msg && msg.timestamp > lastTimestamp && msg.clientId !== clientId) {
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
            // New peer joined, if I have lower clientId, I initiate the offer
			if (clientId < peerId) {
                console.log('Initiating offer to', peerId);
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
			if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
		} else if (msg.type === 'candidate' && msg.targetId === clientId) {
			const pc = peerConnections[peerId];
			if (pc && msg.candidate) {
				try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch (e) { console.error(e); }
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
            console.log('Received track from', peerId);
            if (!document.getElementById('video-' + peerId)) {
                const container = document.createElement('div');
                container.id = 'container-' + peerId;
                container.className = 'video-container';
                
                const video = document.createElement('video');
                video.id = 'video-' + peerId;
                video.autoplay = true;
                video.playsinline = true;
                video.srcObject = event.streams[0];
                
                const label = document.createElement('div');
                label.className = 'label';
                label.textContent = 'Peer ' + peerId;
                
                container.appendChild(video);
                container.appendChild(label);
                videoGrid.appendChild(container);
            }
		};
        
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                removePeer(peerId);
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


export function getWebRtcHtml(target, targetCode) {
    return `
<!DOCTYPE html> 
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>WebRTC Call</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { margin: 0; padding: 0; background-color: #000; overflow: hidden; }
#remoteVideo {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	z-index: 1;
}
#localVideo {
	position: fixed;
	bottom: 20px;
	right: 20px;
	width: 200px;
	height: 150px;
	object-fit: cover;
	z-index: 2;
	border: 2px solid rgba(255,255,255,0.7);
	border-radius: 8px;
	transform: scaleX(-1);
}
#startButton {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 3;
	padding: 15px 30px;
	font-size: 20px;
	background-color: #28a745;
	color: white;
	border: none;
	border-radius: 8px;
	cursor: pointer;
}
#statusMessage {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 4;
	color: white;
	font-size: 24px;
	display: none;
}
</style>
</head>
<body>
  <video id="remoteVideo" autoplay playsinline></video>
  <video id="localVideo" autoplay playsinline muted></video>
  <button id="startButton">Call</button>
  <div id="statusMessage">연결 진행 중...</div>
  <script>
	const signalingUrl = "${target}";
	const targetCode = "${targetCode}";
	const localVideo = document.getElementById('localVideo');
	const remoteVideo = document.getElementById('remoteVideo');
	const startButton = document.getElementById('startButton');
	const statusMessage = document.getElementById('statusMessage');
	let localStream;
	let peerConnection;
	let pollInterval;
	let candidateQueue = [];
	const clientId = Date.now();
	let lastTimestamp = 0;
	
	const rtcConfig = {
		iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
	};

	async function start() {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			localVideo.srcObject = localStream;
			startButton.style.display = 'none';
			statusMessage.style.display = 'block';
			
			sendSignal({ type: 'ready' });
			pollInterval = setInterval(pollSignal, 2000);
		} catch (err) {
			console.error('Error accessing media devices.', err);
		}
	}

	async function sendSignal(data) {
		data.room = targetCode;
		data.clientId = clientId;
		try {
			const response = await fetch(signalingUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			if (response.status === 403) {
				const resData = await response.json();
				if (resData.error === 'Room is full') {
					alert('접속 인원이 초과되었습니다.');
				}
			}
		} catch (e) { console.error(e); }
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
					if (msg && msg.timestamp > lastTimestamp) {
						lastTimestamp = msg.timestamp;
						if (msg.clientId !== clientId) {
							await handleMessage(msg);
						}
					}
				}
			}
		} catch (e) { console.error(e); }
	}

	async function handleMessage(message) {
		if (!peerConnection) createPeerConnection();
		if (message.type === 'ready' && message.clientId < clientId) {
			console.log('Creating Offer');
			const offer = await peerConnection.createOffer();
			console.log('Creating Offer setLocalDescription');
			await peerConnection.setLocalDescription(offer);
			console.log('Creating Offer setLocalDescription Complete');
			sendSignal({ type: 'offer', sdp: offer.sdp });
		} else if (message.type === 'offer') {
			console.log('Received Offer, Creating Answer');
			await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
			while (candidateQueue.length > 0) {
				try { await peerConnection.addIceCandidate(candidateQueue.shift()); } catch (e) { console.error(e); }
			}
			const answer = await peerConnection.createAnswer();
			await peerConnection.setLocalDescription(answer);
			sendSignal({ type: 'answer', sdp: answer.sdp });
		} else if (message.type === 'answer') {
			await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
			while (candidateQueue.length > 0) {
				try { await peerConnection.addIceCandidate(candidateQueue.shift()); } catch (e) { console.error(e); }
			}
		} else if (message.type === 'candidate' && message.candidate) {
			try {
				if (peerConnection.remoteDescription) {
					await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
				} else {
					candidateQueue.push(new RTCIceCandidate(message.candidate));
				}
			} catch (e) { console.error(e); }
		}
	}

	function createPeerConnection() {
		peerConnection = new RTCPeerConnection(rtcConfig);
		candidateQueue = []; // 연결 생성 시 큐 초기화
		
		peerConnection.onconnectionstatechange = () => {
			console.log('Connection State:', peerConnection.connectionState);
			if (peerConnection.connectionState === 'connected') {
				statusMessage.style.display = 'none';
				clearInterval(pollInterval);
			}
		};

		peerConnection.onicegatheringstatechange = () => {
			console.log('ICE Gathering State:', peerConnection.iceGatheringState);
		};

		peerConnection.onicecandidate = (event) => {
			if (event.candidate) {
				console.log('ICE Candidate:', event.candidate);
				sendSignal({ type: 'candidate', candidate: event.candidate });
			}
		};

		peerConnection.ontrack = (event) => {
			remoteVideo.srcObject = event.streams[0];
		};

		localStream.getTracks().forEach(track => {
			peerConnection.addTrack(track, localStream);
		});
	}
	
	startButton.addEventListener('click', start);
  </script>
</body>
</html>`;
}

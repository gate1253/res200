export function getChatHtml(target, targetCode) {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Chat - ${targetCode}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
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
            font-family: 'Outfit', sans-serif; height: 100vh; display: flex; flex-direction: column;
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

        /* Header */
        header { 
            padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; 
            background: linear-gradient(to bottom, rgba(15, 23, 42, 0.8), transparent);
            z-index: 10;
        }
        header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px; }
        #status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); margin-top: 4px; }
        .dot { height: 8px; width: 8px; background-color: var(--success); border-radius: 50%; box-shadow: 0 0 10px var(--success); }
        .dot.warning { background-color: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
        
        #userCount {
            background: var(--glass);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }

        /* Chat Area */
        #chat-messages { 
            flex: 1; overflow-y: auto; padding: 20px 30px; display: flex; flex-direction: column; gap: 15px; 
            scrollbar-width: thin; scrollbar-color: var(--glass-border) transparent;
        }
        #chat-messages::-webkit-scrollbar { width: 6px; }
        #chat-messages::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 3px; }

        .msg { 
            max-width: 75%; padding: 12px 16px; border-radius: 20px; position: relative; line-height: 1.5; 
            backdrop-filter: blur(10px); border: 1px solid var(--glass-border);
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .msg.other { background: var(--card-bg); align-self: flex-start; border-bottom-left-radius: 4px; }
        .msg.me { background: var(--primary); align-self: flex-end; border-bottom-right-radius: 4px; box-shadow: 0 4px 15px var(--primary-glow); }
        .msg-info { font-size: 11px; margin-bottom: 4px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .msg.me .msg-info { color: rgba(255,255,255,0.7); text-align: right; }

        /* Input Area */
        .input-area { 
            padding: 30px; display: flex; gap: 12px; 
            background: linear-gradient(to top, rgba(15, 23, 42, 0.8), transparent);
            z-index: 10;
        }
        #msg-input { 
            flex: 1; background: var(--glass); border: 1px solid var(--glass-border); 
            border-radius: 16px; padding: 14px 20px; color: white; outline: none;
            backdrop-filter: blur(20px); transition: all 0.3s;
        }
        #msg-input:focus { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }
        
        #send-btn { 
            background: var(--primary); color: white; border: none; padding: 0 24px; 
            border-radius: 16px; cursor: pointer; font-weight: 600; transition: all 0.2s;
        }
        #send-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px var(--primary-glow); }

        /* Nickname Modal */
        #nickname-modal { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
        .modal-content { 
            background: var(--card-bg); padding: 40px; border-radius: 30px; width: 90%; max-width: 400px; 
            text-align: center; border: 1px solid var(--glass-border); box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .modal-content h2 { margin-top: 0; font-size: 24px; }
        .modal-content p { color: var(--text-muted); margin-bottom: 25px; }
        #nickname-input { 
            width: 100%; box-sizing: border-box; margin-bottom: 20px; padding: 14px;
            background: var(--glass); border: 1px solid var(--glass-border); border-radius: 12px; color: white; outline: none;
        }
        #join-btn { 
            width: 100%; padding: 14px; background: var(--primary); color: white; border: none; 
            border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        #join-btn:hover { background: #4338ca; box-shadow: 0 5px 15px var(--primary-glow); }

        .status-msg { text-align: center; font-size: 12px; color: var(--text-muted); margin: 10px 0; opacity: 0.7; }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    <div class="bg-glow" style="top: 10%; left: 10%;"></div>
    <div class="bg-glow" style="bottom: 10%; right: 10%; animation-delay: -5s;"></div>

    <div id="nickname-modal">
        <div class="modal-content">
            <h2>Welcome</h2>
            <p>채팅에 사용할 대화명을 입력해 주세요.</p>
            <input type="text" id="nickname-input" placeholder="Nickname..." maxlength="15">
            <button id="join-btn">시작하기</button>
        </div>
    </div>

    <header>
        <div>
            <h1>⚡ Premium Chat</h1>
            <div id="status"><span class="dot warning"></span><span>Initializing...</span></div>
        </div>
        <div id="userCount">0 Participants</div>
    </header>

    <div id="chat-messages"></div>

    <form class="input-area" id="chat-form">
        <input type="text" id="msg-input" placeholder="Type a message..." autocomplete="off">
        <button type="submit" id="send-btn">Send</button>
    </form>

    <script>
        let wsUrl = "${target}";
        if (wsUrl.startsWith('http')) {
            wsUrl = wsUrl.replace(/^http/, 'ws');
        }
        const targetCode = "${targetCode}";
        let nickname = "";
        let ws;

        const modal = document.getElementById('nickname-modal');
        const nickInput = document.getElementById('nickname-input');
        const joinBtn = document.getElementById('join-btn');
        const chatForm = document.getElementById('chat-form');
        const msgInput = document.getElementById('msg-input');
        const chatMessages = document.getElementById('chat-messages');
        const userCountBadge = document.getElementById('userCount');
        const statusMsg = document.querySelector('#status span');
        const statusDot = document.querySelector('#status .dot');

        joinBtn.onclick = () => {
            const name = nickInput.value.trim();
            if(!name) return alert('닉네임을 입력해주세요.');
            nickname = name;
            modal.style.display = 'none';
            connectWS();
        };

        nickInput.onkeypress = (e) => { if(e.key === 'Enter') joinBtn.click(); };

        function connectWS() {
            ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                statusDot.className = 'dot';
                statusMsg.textContent = 'Connected to #' + targetCode;
                ws.send(JSON.stringify({ type: 'join', nickname, room: targetCode }));
            };
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if(data.type === 'chat') {
                    appendMessage(data.nickname, data.message, false);
                } else if (data.type === 'user-count') {
                    userCountBadge.textContent = data.count + ' Participants';
                } else if (data.type === 'join' && data.nickname !== nickname) {
                    appendStatus(data.nickname + '님이 입장하셨습니다.');
                } else if (data.type === 'leave') {
                    appendStatus('참가자가 퇴장하셨습니다.');
                }
            };
            ws.onclose = () => {
                statusDot.className = 'dot warning';
                statusMsg.textContent = 'Disconnected';
                userCountBadge.textContent = '0 Participants';
            };
        }

        chatForm.onsubmit = (e) => {
            e.preventDefault();
            const message = msgInput.value.trim();
            if(!message) return;
            
            const data = { type: 'chat', nickname, message, room: targetCode };
            ws.send(JSON.stringify(data));
            appendMessage(nickname, message, true);
            msgInput.value = '';
            msgInput.focus();
        };

        function appendMessage(sender, text, isMe) {
            const div = document.createElement('div');
            div.className = 'msg ' + (isMe ? 'me' : 'other');
            
            const info = document.createElement('div');
            info.className = 'msg-info';
            info.textContent = sender + (isMe ? ' (You)' : '');
            
            const content = document.createElement('div');
            content.textContent = text;
            
            div.appendChild(info);
            div.appendChild(content);
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function appendStatus(text) {
            const div = document.createElement('div');
            div.className = 'status-msg';
            div.textContent = text;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    </script>
</body>
</html>
`;
}

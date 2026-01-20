export function getChatHtml(target, targetCode) {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat - ${targetCode}</title>
    <style>
        :root {
            --primary: #4f46e5;
            --bg: #f3f4f6;
            --text: #1f2937;
        }
        body { margin: 0; font-family: sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }
        
        /* Header */
        header { background: white; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        header h1 { margin: 0; font-size: 1.25rem; }
        .room-code { background: #e0e7ff; color: #4338ca; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; }

        /* Chat Area */
        #chat-messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .msg { max-width: 80%; padding: 0.75rem 1rem; border-radius: 1rem; position: relative; line-height: 1.5; }
        .msg.other { background: white; align-self: flex-start; border-bottom-left-radius: 0.25rem; }
        .msg.me { background: var(--primary); color: white; align-self: flex-end; border-bottom-right-radius: 0.25rem; }
        .msg-info { font-size: 0.75rem; margin-bottom: 0.25rem; opacity: 0.8; }
        .msg-info.me { text-align: right; }

        /* Input Area */
        .input-area { background: white; padding: 1rem; display: flex; gap: 0.75rem; border-top: 1px solid #e5e7eb; }
        input[type="text"] { flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none; }
        input[type="text"]:focus { border-color: var(--primary); ring: 2px solid #c7d2fe; }
        button#send-btn { background: var(--primary); color: white; border: none; padding: 0.5rem 1.25rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
        button#send-btn:hover { background: #4338ca; }

        /* Nickname Modal */
        #nickname-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-content { background: white; padding: 2rem; border-radius: 1rem; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal-content h2 { margin-top: 0; }
        .modal-content input { width: 100%; box-sizing: border-box; margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <div id="nickname-modal">
        <div class="modal-content">
            <h2>대화명 입력</h2>
            <p>채팅에 사용할 닉네임을 입력해 주세요.</p>
            <input type="text" id="nickname-input" placeholder="닉네임..." maxlength="15">
            <button id="join-btn" style="width: 100%; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">시작하기</button>
        </div>
    </div>

    <header>
        <h1>실시간 채팅</h1>
        <span class="room-code"># ${targetCode}</span>
    </header>

    <div id="chat-messages"></div>

    <form class="input-area" id="chat-form">
        <input type="text" id="msg-input" placeholder="메시지 입력..." autocomplete="off">
        <button type="submit" id="send-btn">전송</button>
    </form>

    <script>
        const wsUrl = "${target}";
        const targetCode = "${targetCode}";
        let nickname = "";
        let ws;

        const modal = document.getElementById('nickname-modal');
        const nickInput = document.getElementById('nickname-input');
        const joinBtn = document.getElementById('join-btn');
        const chatForm = document.getElementById('chat-form');
        const msgInput = document.getElementById('msg-input');
        const chatMessages = document.getElementById('chat-messages');

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
                appendStatus('서버에 연결되었습니다.');
                ws.send(JSON.stringify({ type: 'join', nickname, room: targetCode }));
            };
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if(data.type === 'chat') {
                    appendMessage(data.nickname, data.message, false);
                }
            };
            ws.onclose = () => appendStatus('연결이 끊어졌습니다. 새로고침 해주세요.');
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
            info.className = 'msg-info ' + (isMe ? 'me' : '');
            info.textContent = sender + (isMe ? ' (나)' : '');
            
            const content = document.createElement('div');
            content.textContent = text;
            
            div.appendChild(info);
            div.appendChild(content);
            chatMessages.appendChild(div);
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function appendStatus(text) {
            const div = document.createElement('div');
            div.style.textAlign = 'center';
            div.style.fontSize = '0.75rem';
            div.style.color = '#888';
            div.style.margin = '0.5rem 0';
            div.textContent = text;
            chatMessages.appendChild(div);
        }
    </script>
</body>
</html>
`;
}

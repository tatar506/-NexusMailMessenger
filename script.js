const SERVER_URL = "https://nexusmailmessenger.onrender.com"; // Замените после деплоя
let socket;
let currentUser = localStorage.getItem('email');

const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');

if (currentUser) {
    showChat();
}

async function sendOTP() {
    const email = document.getElementById('email').value;
    const res = await fetch(`${SERVER_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (res.ok) {
        document.getElementById('otp-section').style.display = 'block';
        alert('Код отправлен на почту!');
    }
}

async function verifyOTP() {
    const email = document.getElementById('email').value;
    const code = document.getElementById('otp-code').value;
    const res = await fetch(`${SERVER_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.email);
        currentUser = data.email;
        showChat();
    } else {
        alert('Неверный код');
    }
}

function showChat() {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    
    socket = io(SERVER_URL);
    socket.emit('join', currentUser);

    socket.on('chat_history', (messages) => {
        messages.forEach(appendMessage);
    });

    socket.on('chat_message', (msg) => {
        appendMessage(msg);
    });

    socket.on('online_count', (count) => {
        document.getElementById('online-count').innerText = count;
    });

    socket.on('user_typing', (email) => {
        const indicator = document.getElementById('typing-indicator');
        indicator.innerText = `${email} печатает...`;
        setTimeout(() => indicator.innerText = '', 3000);
    });
}

function appendMessage(msg) {
    const div = document.createElement('div');
    div.classList.add('message');
    if (msg.sender === currentUser) div.classList.add('mine');
    div.innerHTML = `<strong>${msg.sender.split('@')[0]}</strong><br>${msg.text}`;
    document.getElementById('messages').appendChild(div);
    const m = document.getElementById('messages');
    m.scrollTop = m.scrollHeight;
}

// Слушатели событий
document.getElementById('btn-send-otp').onclick = sendOTP;
document.getElementById('btn-verify').onclick = verifyOTP;
document.getElementById('btn-send').onclick = () => {
    const text = document.getElementById('msg-input').value;
    if (text) {
        socket.emit('chat_message', { sender: currentUser, text });
        document.getElementById('msg-input').value = '';
    }
};

document.getElementById('msg-input').onkeypress = () => {
    socket.emit('typing', currentUser);
};

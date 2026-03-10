const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Настройка CORS для работы с GitHub Pages
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret';

// MongoDB Models
const Message = mongoose.model('Message', new mongoose.Schema({
    sender: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
}));

const OTP = mongoose.model('OTP', new mongoose.Schema({
    email: String,
    code: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
}));

// Подключение к БД
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

// Логика отправки через твой EmailJS
async function sendOTPViaEmailJS(email, code) {
    const data = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY, // Обязательно для серверных запросов
        template_params: {
            to_email: email,
            otp_code: code
        }
    };

    try {
        await axios.post('https://api.emailjs.com/api/v1.0/email/send', data);
        return true;
    } catch (error) {
        console.error('EmailJS Error:', error.response ? error.response.data : error.message);
        throw new Error('Ошибка при отправке письма');
    }
}

// Эндпоинт: Запрос кода
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        await OTP.findOneAndUpdate({ email }, { code }, { upsert: true });
        await sendOTPViaEmailJS(email, code);
        res.status(200).json({ message: 'Код отправлен!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Эндпоинт: Проверка кода
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    const record = await OTP.findOne({ email, code });
    
    if (record) {
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
        await OTP.deleteOne({ email });
        res.status(200).json({ token, email });
    } else {
        res.status(400).json({ error: 'Неверный код' });
    }
});

// Socket.io: Реальное время
let onlineUsers = new Set();

io.on('connection', (socket) => {
    socket.on('join', async (email) => {
        socket.userEmail = email;
        onlineUsers.add(email);
        io.emit('online_count', onlineUsers.size);
        
        const history = await Message.find().sort({ timestamp: -1 }).limit(50);
        socket.emit('chat_history', history.reverse());
    });

    socket.on('chat_message', async (data) => {
        const newMessage = new Message({ sender: data.sender, text: data.text });
        await newMessage.save();
        io.emit('chat_message', newMessage);
    });

    socket.on('typing', (email) => {
        socket.broadcast.emit('user_typing', email);
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(socket.userEmail);
        io.emit('online_count', onlineUsers.size);
    });
});

server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
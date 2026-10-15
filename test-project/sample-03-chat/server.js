const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = ['public', 'programming', 'design'];
const history = { public: [], programming: [], design: [] };
const pushLogs = [];

io.on('connection', socket => {
  socket.on('join', ({ user, room }) => {
    if (!rooms.includes(room)) return;
    socket.join(room);
    socket.user = user;
    socket.room = room;
    io.to(room).emit('presence', { user, room, action: 'joined' });
  });

  socket.on('message', ({ text }) => {
    const room = socket.room;
    if (!room) return;
    const msg = { user: socket.user, text, time: new Date() };
    history[room].push(msg);
    io.to(room).emit('message', msg);
  });

  socket.on('typing', () => {
    const room = socket.room;
    if (!room) return;
    io.to(room).emit('typing', { user: socket.user });
  });
});

app.get('/api/rooms', (_, res) => res.json(rooms));

app.get('/api/history/:room', (req, res) => {
  const room = req.params.room;
  res.json(history[room] || []);
});

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 8 * 1024 * 1024 }
});
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ filename: req.file.filename, original: req.file.originalname });
});

app.post('/api/push/send', (req, res) => {
  const { title, body } = req.body;
  const log = { title, body, time: new Date() };
  pushLogs.push(log);
  res.json({ status: 'sent', log });
});

app.get('/api/push/log', (_, res) => res.json(pushLogs));

server.listen(4103, () => console.log('Server listening on port 4103'));

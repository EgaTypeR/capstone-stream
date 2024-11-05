// server.js

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Menyajikan file statis
app.use(express.static(path.join(__dirname, '/')));

// Menangani koneksi Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Mendengarkan event signaling dari klien
    socket.on('signal', (data) => {
        const { target, signal } = data;
        io.to(target).emit('signal', {
            source: socket.id,
            signal: signal
        });
    });

    // Mendengarkan event join untuk bergabung ke room tertentu
    socket.on('join', (room) => {
        socket.join(room);
        socket.to(room).emit('new-peer', socket.id);
        console.log(`User ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Mengirimkan informasi bahwa pengguna telah keluar
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

// Menjalankan server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

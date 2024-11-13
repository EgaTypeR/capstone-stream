// server.js

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname+'index.html', '/ingest')));
app.use(express.static(path.join(__dirname + 'consumer.html', '/consumer')));

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for signaling events from the client
    socket.on('signal', (data) => {
        const { target, signal } = data;
        // Emit the signal to the target peer
        io.to(target).emit('signal', {
            source: socket.id,
            signal: signal
        });
    });

    // Handle join event for joining a specific room
    socket.on('join', (room) => {
        socket.join(room);
        socket.to(room).emit('new-peer', socket.id);
        console.log(`User ${socket.id} joined room ${room}`);
    });

    // Listen for disconnect event
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Broadcast that the user has disconnected to the room
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
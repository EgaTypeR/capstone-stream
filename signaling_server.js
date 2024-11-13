// signaling_server.js

const http = require('http');
const { Server } = require('socket.io');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.IO signaling server is running\n');
});

// Initialize Socket.IO with the HTTP server
const io = new Server(server);

// Event handler for new connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Notify other clients if needed
        io.emit('user-disconnected', socket.id);
    });

    // Handle joining a room
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room ${room}`);
        // Notify other clients in the room about the new peer
        socket.to(room).emit('new-peer', socket.id);
    });

    // Handle signaling messages
    socket.on('signal', (data) => {
        const { target, signal } = data;
        console.log(`Received signal from ${socket.id}, targeting ${target}`);

        if (target === 'broadcast') {
            // Send to all clients in the same room except the sender
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('signal', { source: socket.id, signal });
                }
            });
        } else {
            // Send directly to the specific target
            io.to(target).emit('signal', { source: socket.id, signal });
        }
    });
});

// Start the server on port 80
const PORT = 1145;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// server.js

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname));

// Start the server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(__dirname)
});
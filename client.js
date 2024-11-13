// socketio_client.js
const io = require("socket.io-client");

// Connect to the Socket.IO server
const socket = io("wss://rtc.forceai.tech");

// Event handler for connection
socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);

    // Example of joining a room
    socket.emit("join", "room1");

    // Send a test message to the server
    socket.emit("signal", { target: "broadcast", signal: { message: "Hello from client" } });
});

// Event handler for receiving messages
socket.on("signal", (data) => {
    console.log("Received signal:", data);
});

// Event handler for disconnect
socket.on("disconnect", () => {
    console.log("Disconnected from server");
});
// signaling-server.js
const { Server } = require("socket.io");

const io = new Server(1145, {
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle offer from broadcaster
    socket.on("offer", (data) => {
        socket.broadcast.emit("offer", data);
    });

    // Handle answer from viewer
    socket.on("answer", (data) => {
        socket.broadcast.emit("answer", data);
    });

    // Handle ICE candidates
    socket.on("candidate", (data) => {
        socket.broadcast.emit("candidate", data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

console.log("Signaling server running on ws://localhost:1145");


// js/main.js

'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideos = {}; // { peerId: HTMLVideoElement }

let localStream;
let peers = {}; // { peerId: SimplePeer }
let socket;
let room = 'default_room'; // Anda bisa menggunakan mekanisme lain untuk room

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

// Fungsi untuk memulai mendapatkan media lokal
async function start() {
    console.log('Requesting local stream');
    startButton.disabled = true;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        localVideo.srcObject = localStream;
        callButton.disabled = false;
        console.log('Local stream obtained and set to localVideo.');
    } catch (e) {
        console.error('getUserMedia() error:', e);
    }
}

// Fungsi untuk menghubungkan ke server signaling dan join room
function connectSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to signaling server');
        socket.emit('join', room);
    });

    socket.on('new-peer', (peerId) => {
        console.log('New peer joined:', peerId);
        initiatePeerConnection(peerId, true);
    });

    socket.on('signal', async (data) => {
        const { source, signal } = data;
        console.log(`Received signal from ${source}`);
        if (!peers[source]) {
            initiatePeerConnection(source, false);
        }
        try {
            await peers[source].signal(signal);
            console.log(`Processed signal from ${source}`);
        } catch (err) {
            console.error('Error processing signal:', err);
        }
    });

    socket.on('user-disconnected', (peerId) => {
        console.log('Peer disconnected:', peerId);
        if (peers[peerId]) {
            peers[peerId].destroy();
            delete peers[peerId];
        }
        if (remoteVideos[peerId]) {
            remoteVideos[peerId].srcObject = null;
            remoteVideos[peerId].parentNode.removeChild(remoteVideos[peerId]);
            delete remoteVideos[peerId];
            console.log(`Removed video element for disconnected peer: ${peerId}`);
        }
    });
}

// Fungsi untuk memulai panggilan ke semua peers
function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    connectSocket();
    console.log('Connected to socket and ready to call peers.');
}

// Fungsi untuk mengakhiri semua panggilan
function hangup() {
    console.log('Ending calls');
    for (let peerId in peers) {
        peers[peerId].destroy(); // Menghentikan koneksi peer
        if (remoteVideos[peerId]) {
            remoteVideos[peerId].srcObject = null; // Menghapus stream dari video
            remoteVideos[peerId].parentNode.removeChild(remoteVideos[peerId]); // Menghapus elemen video dari DOM
            delete remoteVideos[peerId]; // Menghapus referensi dari objek remoteVideos
            console.log(`Removed video element for peer: ${peerId}`);
        }
    }
    peers = {};
    if (socket) {
        socket.disconnect();
        console.log('Disconnected from signaling server.');
    }
    hangupButton.disabled = true;
    callButton.disabled = false;
    console.log('All connections have been terminated and video elements removed.');
}

// Fungsi untuk menginisialisasi RTCPeerConnection dengan Simple-Peer
function initiatePeerConnection(peerId, initiator) {
    console.log(`Initiating peer connection with ${peerId}, initiator: ${initiator}`);
    const peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        stream: localStream
    });

    peer.on('signal', (data) => {
        console.log(`Sending signal to ${peerId}`);
        socket.emit('signal', {
            target: peerId,
            signal: data
        });
    });

    peer.on('stream', (stream) => {
        console.log(`Received stream from ${peerId}`);
        if (remoteVideos[peerId]) {
            remoteVideos[peerId].srcObject = stream;
        } else {
            // Jika tidak ada elemen video untuk peer ini, buat dinamis
            const video = document.createElement('video');
            video.id = `remoteVideo-${peerId}`;
            video.autoplay = true;
            video.playsInline = true;
            video.controls = true;
            video.style.width = '45%';
            video.style.margin = '10px';
            video.style.border = '2px solid #007bff';
            video.style.borderRadius = '4px';
            document.getElementById('videos').appendChild(video);
            video.srcObject = stream;
            remoteVideos[peerId] = video;
            console.log(`Created video element for ${peerId}`);
        }
    });

    peer.on('close', () => {
        console.log(`Peer connection closed with ${peerId}`);
        if (remoteVideos[peerId]) {
            remoteVideos[peerId].srcObject = null;
            remoteVideos[peerId].parentNode.removeChild(remoteVideos[peerId]);
            delete remoteVideos[peerId];
            console.log(`Removed video element for closed peer: ${peerId}`);
        }
        delete peers[peerId];
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
    });

    peers[peerId] = peer;
}

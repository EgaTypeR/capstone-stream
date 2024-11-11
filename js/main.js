// js/main.js

'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideos = {}; // { peerId: HTMLVideoElement }

let localStream;
let peers = {}; // { peerId: RTCPeerConnection }
let socket;
let room = 'default_room'; // You can use another mechanism for room

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

const iceServers = [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "3adba8aedbd64dc8b4f1461a",
      credential: "Jru1a1oh7S6K+ASw",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "3adba8aedbd64dc8b4f1461a",
      credential: "Jru1a1oh7S6K+ASw",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "3adba8aedbd64dc8b4f1461a",
      credential: "Jru1a1oh7S6K+ASw",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "3adba8aedbd64dc8b4f1461a",
      credential: "Jru1a1oh7S6K+ASw",
    },
]
const iceServersCloudFlare = [
    {
      urls: [
        "stun:stun.cloudflare.com:3478",
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"]
    },
    {
      username: "g073314db1d45e01784e43d65f0866d9c3584c65d6562e922d5b307e040ebd7c",
      credential: "fc9d3addc6741fae3da6346c306040a30e9712b7341be41f79ecbc4cefc81724",
    },
]

// Function to start obtaining local media
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

// Connect to the signaling server and join the room
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
        handleSignal(source, signal);
    });

    socket.on('user-disconnected', (peerId) => {
        console.log('Peer disconnected:', peerId);
        if (peers[peerId]) {
            peers[peerId].close();
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

// Function to start calling peers
function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    connectSocket();
    console.log('Connected to socket and ready to call peers.');
}

// Function to end all calls
function hangup() {
    console.log('Ending calls');
    for (let peerId in peers) {
        peers[peerId].close();
        if (remoteVideos[peerId]) {
            remoteVideos[peerId].srcObject = null;
            remoteVideos[peerId].parentNode.removeChild(remoteVideos[peerId]);
            delete remoteVideos[peerId];
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

// Function to initiate RTCPeerConnection with Perfect Negotiation
function initiatePeerConnection(peerId, isPolite) {
    console.log(`Initiating peer connection with ${peerId}, isPolite: ${isPolite}`);

    const pc = new RTCPeerConnection({ iceServersCloudFlare });

    // Perfect negotiation variables
    let makingOffer = false;
    let ignoreOffer = false;

    // Attach local stream to connection
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = ({ candidate }) => {
        socket.emit('signal', { target: peerId, signal: { candidate } });
    };

    pc.ontrack = ({ streams: [stream] }) => {
        if (remoteVideos[peerId]) {
            remoteVideos[peerId].srcObject = stream;
        } else {
            // Create dynamic video element if it doesn't exist
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
    };

    pc.onnegotiationneeded = async () => {
        try {
            makingOffer = true;
            await pc.setLocalDescription();
            socket.emit('signal', { target: peerId, signal: { description: pc.localDescription } });
        } catch (err) {
            console.error('Negotiation error:', err);
        } finally {
            makingOffer = false;
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
            pc.restartIce();
        }
    };

    // Store the peer connection
    peers[peerId] = { pc, isPolite, ignoreOffer, makingOffer };
}

// Handle signaling messages with Perfect Negotiation pattern
async function handleSignal(peerId, { candidate, description }) {
    const peer = peers[peerId];
    if (!peer) return;

    const { pc, isPolite } = peer;

    try {
        if (description) {
            const offerCollision = description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');

            peer.ignoreOffer = !isPolite && offerCollision;
            if (peer.ignoreOffer) return;

            await pc.setRemoteDescription(description);
            if (description.type === 'offer') {
                await pc.setLocalDescription();
                socket.emit('signal', { target: peerId, signal: { description: pc.localDescription } });
            }
        } else if (candidate) {
            await pc.addIceCandidate(candidate);
        }
    } catch (err) {
        console.error('Signal handling error:', err);
    }
}

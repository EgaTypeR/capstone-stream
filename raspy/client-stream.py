import asyncio
import cv2
import socketio
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaPlayer
from aiortc.mediastreams import VideoFrame

# Set up the signaling server connection
sio = socketio.AsyncClient()

# STUN and TURN servers configuration
ice_servers = [
    {
        "urls": [
            "stun:stun.cloudflare.com:3478",
            "turn:turn.cloudflare.com:3478?transport=udp",
            "turn:turn.cloudflare.com:3478?transport=tcp",
            "turns:turn.cloudflare.com:5349?transport=tcp"
        ]
    },
    {
        "username": "g073314db1d45e01784e43d65f0866d9c3584c65d6562e922d5b307e040ebd7c",
        "credential": "fc9d3addc6741fae3da6346c306040a30e9712b7341be41f79ecbc4cefc81724",
    }
]

# Video capture track using the laptop's camera
class CameraVideoStreamTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        print("Initializing camera...")
        self.cap = cv2.VideoCapture(0)  # Attempt to open the default camera
        
        if not self.cap.isOpened():
            print("Error: Unable to access the camera")
        else:
            print("Camera successfully opened")

    async def recv(self):
        ret, frame = self.cap.read()
        if not ret:
            print("Error: Failed to capture image")
            return None
        
        print("Captured frame")
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(frame, format="rgb24")
        frame.pts, frame.time_base = await self.next_timestamp()
        return frame

# Event for when connected to the signaling server
@sio.event
async def connect():
    print("Connected to signaling server")
    
    # Start the process of establishing the peer connection
    await create_and_send_offer()

@sio.event
async def disconnect():
    print("Disconnected from signaling server")

# Handle ICE candidates
@sio.on("icecandidate")
async def on_icecandidate(candidate):
    if candidate:
        await sio.emit("candidate", {"candidate": candidate.toJSON()})

# Function to create and send the offer to the signaling server
async def create_and_send_offer():
    # Create a peer connection
    pc = RTCPeerConnection(configuration={"iceServers": ice_servers})
    
    # Add the video track from the camera
    pc.addTrack(CameraVideoStreamTrack())

    # Create an offer
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    # Send the offer to the signaling server
    await sio.emit("offer", {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})
    
    print("Offer sent to signaling server")

# Handle incoming answer from the client
@sio.event
async def answer(data):
    answer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])

    # Handle the client's answer by setting remote description
    pc = RTCPeerConnection(configuration={"iceServers": ice_servers})
    await pc.setRemoteDescription(answer)
    print("Received answer from client and set remote description")

# Main function to run the event loop and connect to the signaling server
async def main():
    try:
        # Connect to the signaling server
        await sio.connect("wss://rtc.forceai.tech")  # Update with your server URL
        await sio.wait()
    except Exception as e:
        print(f"Error connecting to signaling server: {e}")

# Run the main function
asyncio.run(main())

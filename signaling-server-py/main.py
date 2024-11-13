# signaling_server.py

import asyncio
import socketio
from aiohttp import web

# Membuat Async Socket.IO server
sio = socketio.AsyncServer(async_mode='aiohttp')
app = web.Application()
sio.attach(app)

# Event handler untuk koneksi baru
@sio.event
async def connect(sid, environ):
    print('User connected:', sid)

# Event handler untuk disconnect
@sio.event
async def disconnect(sid):
    print('User disconnected:', sid)
    # Memberitahu klien lain jika diperlukan
    await sio.emit('user-disconnected', sid)

# Event handler untuk bergabung ke room
@sio.event
async def join(sid, room):
    sio.enter_room(sid, room)
    print(f'User {sid} joined room {room}')
    # Beritahu klien lain di room tentang peer baru
    await sio.emit('new-peer', sid, room=room, skip_sid=sid)

# Event handler untuk pesan signaling
@sio.event
async def signal(sid, data):
    target = data.get('target')
    signal = data.get('signal')
    print(f'Received signal from {sid}, targeting {target}')

    if target == 'broadcast':
        # Kirim ke semua klien di room yang sama kecuali pengirim
        rooms = sio.rooms(sid)
        for room in rooms:
            if room != sid:
                await sio.emit('signal', {'source': sid, 'signal': signal}, room=room, skip_sid=sid)
    else:
        # Kirim langsung ke target tertentu
        await sio.emit('signal', {'source': sid, 'signal': signal}, to=target)

# Menjalankan server
if _name_ == '_main_':
    web.run_app(app, port=80)  # Ubah port jika diperlukan
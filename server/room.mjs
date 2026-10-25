import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.ROOM_PORT || 4180);
const rooms = new Map();

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      ok: true,
      rooms: [...rooms.entries()].map(([id, room]) => ({ id, clients: room.clients.size, hasDoc: Boolean(room.doc) })),
    }));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Framegraph room server');
});

const wss = new WebSocketServer({ server, maxPayload: 20 * 1024 * 1024 });

function broadcast(roomId, payload, except) {
  const room = rooms.get(roomId);
  if (!room) return;
  const message = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client !== except && client.readyState === 1) client.send(message);
  }
}

function broadcastPresence(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  broadcast(roomId, { type: 'presence', peers: room.clients.size });
}

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const roomId = (url.searchParams.get('room') || 'lobby').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  let room = rooms.get(roomId);
  if (!room) {
    room = { doc: null, clients: new Set() };
    rooms.set(roomId, room);
  }
  room.clients.add(socket);

  socket.send(JSON.stringify({
    type: 'hello',
    room: roomId,
    doc: room.doc,
    peers: room.clients.size,
  }));
  broadcastPresence(roomId);

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (message.type === 'doc' && message.doc && typeof message.doc === 'object') {
      room.doc = message.doc;
      broadcast(roomId, { type: 'doc', doc: message.doc }, socket);
      return;
    }
    if (message.type === 'chat' && typeof message.text === 'string') {
      broadcast(roomId, {
        type: 'chat',
        author: String(message.author || 'Anonymous').slice(0, 40),
        text: message.text.slice(0, 1000),
        at: Date.now(),
      }, socket);
    }
  });

  socket.on('close', () => {
    room.clients.delete(socket);
    broadcastPresence(roomId);
    if (room.clients.size === 0) {
      // Keep the document so a later visitor can still open the room.
      room.updatedAt = Date.now();
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Framegraph room server: ws://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/health`);
});

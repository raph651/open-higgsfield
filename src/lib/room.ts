import type { CanvasDoc } from '../types';

export type RoomStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RoomHandlers {
  onDoc: (doc: CanvasDoc) => void;
  onPresence: (peers: number) => void;
  onStatus: (status: RoomStatus, error?: string) => void;
  onChat?: (message: { author: string; text: string; at: number }) => void;
}

class RoomClient {
  private socket: WebSocket | null = null;
  private handlers: RoomHandlers | null = null;
  private initialDoc: CanvasDoc | null = null;
  private lastRemoteAt = 0;
  roomId: string | null = null;

  connect(roomId: string, handlers: RoomHandlers, initialDoc?: CanvasDoc | null): void {
    this.disconnect();
    this.roomId = roomId;
    this.handlers = handlers;
    this.initialDoc = initialDoc ?? null;
    handlers.onStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_ROOM_HOST || `${window.location.hostname}:4180`;
    const socket = new WebSocket(`${protocol}//${host}/?room=${encodeURIComponent(roomId)}`);
    this.socket = socket;

    socket.onopen = () => {
      handlers.onStatus('connected');
    };
    socket.onerror = () => {
      handlers.onStatus('error', 'Room server offline. Start it with npm run room.');
    };
    socket.onclose = () => {
      if (this.socket === socket) {
        handlers.onStatus('disconnected');
      }
    };
    socket.onmessage = (event) => {
      let message: {
        type?: string;
        doc?: CanvasDoc;
        peers?: number;
        author?: string;
        text?: string;
        at?: number;
      };
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.type === 'hello') {
        handlers.onPresence(message.peers ?? 1);
        if (message.doc) {
          this.lastRemoteAt = Date.now();
          handlers.onDoc(message.doc);
        } else if (this.initialDoc) {
          this.sendDoc(this.initialDoc);
        }
        return;
      }
      if (message.type === 'doc' && message.doc) {
        this.lastRemoteAt = Date.now();
        handlers.onDoc(message.doc);
        return;
      }
      if (message.type === 'presence') {
        handlers.onPresence(message.peers ?? 1);
        return;
      }
      if (message.type === 'chat' && typeof message.text === 'string') {
        handlers.onChat?.({
          author: message.author || 'Anonymous',
          text: message.text,
          at: message.at || Date.now(),
        });
      }
    };
  }

  sendDoc(doc: CanvasDoc): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (Date.now() - this.lastRemoteAt < 450) return;
    this.socket.send(JSON.stringify({ type: 'doc', doc }));
  }

  sendChat(author: string, text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'chat', author, text }));
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.socket = null;
    this.handlers = null;
    this.roomId = null;
  }
}

export const roomClient = new RoomClient();

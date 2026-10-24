import { create } from 'zustand';
import type { CanvasDoc } from '../types';
import { roomClient, type RoomStatus } from '../lib/room';
import { useCanvasStore } from './useCanvasStore';

interface RoomMessage {
  id: string;
  author: string;
  text: string;
  at: number;
  self?: boolean;
}

interface RoomState {
  roomId: string | null;
  connected: boolean;
  peers: number;
  status: RoomStatus;
  error: string | null;
  messages: RoomMessage[];
  join: (roomId: string, initialDoc?: CanvasDoc | null) => void;
  leave: () => void;
  sendDoc: (doc: CanvasDoc) => void;
  sendChat: (text: string) => void;
}

let toastShown = false;
const guestName = `Guest ${Math.floor(Math.random() * 90 + 10)}`;

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  connected: false,
  peers: 0,
  status: 'disconnected',
  error: null,
  messages: [],

  join: (roomId, initialDoc) => {
    if (get().roomId === roomId && get().connected) return;
    toastShown = false;
    set({ roomId, connected: false, status: 'connecting', error: null, peers: 1, messages: [] });
    roomClient.connect(
      roomId,
      {
        onDoc: (doc) => {
          useCanvasStore.getState().applyRemoteDoc(doc);
          set({ connected: true });
        },
        onPresence: (peers) => set({ peers }),
        onChat: (message) => set((state) => ({
          messages: [
            ...state.messages,
            { ...message, id: crypto.randomUUID(), self: false },
          ].slice(-100),
        })),
        onStatus: (status, error) => {
          set({ status, connected: status === 'connected' });
          if (status === 'connected') {
            window.history.replaceState(null, '', `#room=${roomId}`);
            set({ error: null });
          }
          if (status === 'error' && !toastShown) {
            toastShown = true;
            set({ error: error ?? 'Room server unavailable' });
            useCanvasStore.getState().showToast(error ?? 'Room server unavailable');
          }
        },
      },
      initialDoc,
    );
  },

  leave: () => {
    roomClient.disconnect();
    if (window.location.hash.startsWith('#room=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    set({ roomId: null, connected: false, peers: 0, status: 'disconnected', error: null, messages: [] });
  },

  sendDoc: (doc) => roomClient.sendDoc(doc),

  sendChat: (text) => {
    const trimmed = text.trim();
    if (!trimmed || !get().connected) return;
    roomClient.sendChat(guestName, trimmed);
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), author: 'You', text: trimmed, at: Date.now(), self: true },
      ].slice(-100),
    }));
  },
}));

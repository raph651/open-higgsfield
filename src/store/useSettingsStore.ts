import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ComfyClient } from '../lib/comfy';
import type { AccentId } from '../lib/theme';

export type ConnectionStatus = 'unknown' | 'checking' | 'online' | 'offline' | 'disabled';

interface SettingsState {
  baseUrl: string;
  apiKey: string;
  useComfy: boolean;
  checkpoint: string;
  videoCheckpoint: string;
  textEncoder: string;
  videoDraft: boolean;
  connection: ConnectionStatus;
  connectionError: string | null;
  serverVersion: string | null;
  device: string | null;
  ramTotal: number | null;
  connectionOpen: boolean;
  accent: AccentId;
  setBaseUrl: (value: string) => void;
  setApiKey: (value: string) => void;
  setUseComfy: (value: boolean) => void;
  setCheckpoint: (value: string) => void;
  setVideoCheckpoint: (value: string) => void;
  setTextEncoder: (value: string) => void;
  setVideoDraft: (value: boolean) => void;
  setAccent: (accent: AccentId) => void;
  openConnection: () => void;
  closeConnection: () => void;
  checkConnection: () => Promise<boolean>;
}

const DEFAULT_BASE_URL =
  (import.meta.env.VITE_COMFY_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:8188';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: '',
      useComfy: true,
      checkpoint: 'sd_turbo.safetensors',
      videoCheckpoint: 'ltxv-2b-0.9.8-distilled-fp8.safetensors',
      textEncoder: 't5xxl_fp8_e4m3fn.safetensors',
      videoDraft: true,
      connection: 'unknown',
      connectionError: null,
      serverVersion: null,
      device: null,
      ramTotal: null,
      connectionOpen: false,
      accent: 'blue',

      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      setUseComfy: (useComfy) => set({ useComfy, connection: useComfy ? 'unknown' : 'disabled' }),
      setCheckpoint: (checkpoint) => set({ checkpoint }),
      setVideoCheckpoint: (videoCheckpoint) => set({ videoCheckpoint }),
      setTextEncoder: (textEncoder) => set({ textEncoder }),
      setVideoDraft: (videoDraft) => set({ videoDraft }),
      setAccent: (accent) => set({ accent }),
      openConnection: () => set({ connectionOpen: true }),
      closeConnection: () => set({ connectionOpen: false }),

      checkConnection: async () => {
        const { useComfy, baseUrl, apiKey } = get();
        if (!useComfy) {
          set({ connection: 'disabled', connectionError: null });
          return false;
        }
        set({ connection: 'checking', connectionError: null });
        try {
          const client = new ComfyClient({ baseUrl, apiKey });
          const health = await client.health();
          set({
            connection: 'online',
            connectionError: null,
            serverVersion: health.version ?? null,
            device: health.device ?? null,
            ramTotal: health.ramTotal ?? null,
          });
          return true;
        } catch (error) {
          set({
            connection: 'offline',
            connectionError: error instanceof Error ? error.message : String(error),
            serverVersion: null,
            device: null,
            ramTotal: null,
          });
          return false;
        }
      },
    }),
    {
      name: 'framegraph.settings.v1',
      partialize: (state) => ({
        baseUrl: state.baseUrl,
        useComfy: state.useComfy,
        checkpoint: state.checkpoint,
        videoCheckpoint: state.videoCheckpoint,
        textEncoder: state.textEncoder,
        videoDraft: state.videoDraft,
        accent: state.accent,
      }),
    },
  ),
);

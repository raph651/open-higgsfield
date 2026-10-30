import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ComfyClient } from '../lib/comfy';
import { MODELS } from '../data';
import { STATIC_DEMO } from '../lib/staticDemo';
import type { ModelId } from '../types';
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
  locked: boolean;   // the server is online but wants an access key we have not given it
  connectionOpen: boolean;
  accent: AccentId;
  /** local models that need files: true = ComfyUI can see them, false = not installed, missing = not checked yet */
  /** false once the user closes the generation side panel: clicking or typing in a node then no longer reopens it */
  detailsAutoOpen: boolean;
  setDetailsAutoOpen: (value: boolean) => void;
  installed: Partial<Record<ModelId, boolean>>;
  installChecking: boolean;
  installModelId: ModelId | null;
  openInstall: (id: ModelId) => void;
  closeInstall: () => void;
  checkInstalled: () => Promise<void>;
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
      useComfy: !STATIC_DEMO,
      checkpoint: 'sd_turbo.safetensors',
      videoCheckpoint: 'ltxv-2b-0.9.8-distilled-fp8.safetensors',
      textEncoder: 't5xxl_fp8_e4m3fn.safetensors',
      videoDraft: false,
      connection: STATIC_DEMO ? 'disabled' : 'unknown',
      connectionError: null,
      serverVersion: null,
      device: null,
      ramTotal: null,
      locked: false,
      connectionOpen: false,
      accent: 'blue',
      detailsAutoOpen: true,
      setDetailsAutoOpen: (detailsAutoOpen) => set({ detailsAutoOpen }),
      installed: {},
      installChecking: false,
      installModelId: null,
      openInstall: (installModelId) => {
        set({ installModelId });
        void get().checkInstalled();
      },
      closeInstall: () => set({ installModelId: null }),
      checkInstalled: async () => {
        if (STATIC_DEMO) return;
        const { baseUrl, apiKey } = get();
        set({ installChecking: true });
        const client = new ComfyClient({ baseUrl, apiKey });
        const lists = new Map<string, string[] | null>();
        const installed: Partial<Record<ModelId, boolean>> = {};
        for (const model of MODELS) {
          if (!model.install) continue;
          let state: boolean | undefined = true;
          for (const item of model.install.files) {
            const key = `${item.node}:${item.field}`;
            if (!lists.has(key)) lists.set(key, await client.listChoices(item.node, item.field));
            const list = lists.get(key);
            if (!list) {
              state = undefined; // ComfyUI would not say: do not block the model on a guess
              break;
            }
            // loaders list names relative to their folder, with / or \\ for subfolders
            if (!list.some((name) => name === item.file || name.endsWith(`/${item.file}`) || name.endsWith(`\\${item.file}`))) {
              state = false;
              break;
            }
          }
          if (state !== undefined) installed[model.id] = state;
        }
        set({ installed, installChecking: false });
      },

      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      // The static demo has no ComfyUI to reach; the toggle stays off.
      setUseComfy: (useComfy) => {
        if (STATIC_DEMO) return;
        set({ useComfy, connection: useComfy ? 'unknown' : 'disabled' });
      },
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
            locked: !!health.locked,
          });
          void get().checkInstalled();
          return true;
        } catch (error) {
          set({
            connection: 'offline',
            connectionError: error instanceof Error ? error.message : String(error),
            serverVersion: null,
            device: null,
            ramTotal: null,
            locked: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'framegraph.settings.v1',
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        return (version < 2 ? { ...state, videoDraft: false } : state) as any;
      },
      merge: (persisted, current) => ({
        ...current,
        ...((persisted ?? {}) as Partial<SettingsState>),
        ...(STATIC_DEMO ? { useComfy: false, connection: 'disabled' as const } : {}),
      }),
      partialize: (state) => ({
        baseUrl: state.baseUrl,
        useComfy: state.useComfy,
        checkpoint: state.checkpoint,
        videoCheckpoint: state.videoCheckpoint,
        textEncoder: state.textEncoder,
        videoDraft: state.videoDraft,
        detailsAutoOpen: state.detailsAutoOpen,
        accent: state.accent,
      }),
    },
  ),
);

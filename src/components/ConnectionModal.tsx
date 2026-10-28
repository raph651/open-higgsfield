import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Server,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';

export function ConnectionModal() {
  const open = useSettingsStore((state) => state.connectionOpen);
  const close = useSettingsStore((state) => state.closeConnection);
  const baseUrl = useSettingsStore((state) => state.baseUrl);
  const apiKey = useSettingsStore((state) => state.apiKey);
  const useComfy = useSettingsStore((state) => state.useComfy);
  const checkpoint = useSettingsStore((state) => state.checkpoint);
  const videoCheckpoint = useSettingsStore((state) => state.videoCheckpoint);
  const textEncoder = useSettingsStore((state) => state.textEncoder);
  const videoDraft = useSettingsStore((state) => state.videoDraft);
  const connection = useSettingsStore((state) => state.connection);
  const error = useSettingsStore((state) => state.connectionError);
  const version = useSettingsStore((state) => state.serverVersion);
  const device = useSettingsStore((state) => state.device);
  const ramTotal = useSettingsStore((state) => state.ramTotal);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const setApiKey = useSettingsStore((state) => state.setApiKey);
  const setUseComfy = useSettingsStore((state) => state.setUseComfy);
  const setCheckpoint = useSettingsStore((state) => state.setCheckpoint);
  const setVideoCheckpoint = useSettingsStore((state) => state.setVideoCheckpoint);
  const setTextEncoder = useSettingsStore((state) => state.setTextEncoder);
  const setVideoDraft = useSettingsStore((state) => state.setVideoDraft);
  const checkConnection = useSettingsStore((state) => state.checkConnection);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open && useComfy && connection === 'unknown') {
      void checkConnection();
    }
  }, [open, useComfy, connection, checkConnection]);

  if (!open) return null;

  const isOnline = connection === 'online';
  const isChecking = connection === 'checking';

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal connection-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <div>
            <span className="eyebrow">RUNTIME</span>
            <h2>ComfyUI connection</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="modal__lede">
          Open Source Canvas is the front end. ComfyUI is the engine. Point this at a local server or a
          Comfy Cloud endpoint. Runs go through the Comfy API, never a private vendor endpoint.
        </p>

        <div className={`conn-status conn-status--${connection}`}>
          <span className="conn-status__icon">
            {isChecking ? <LoaderCircle size={17} className="spin" /> : isOnline ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          </span>
          <div>
            <strong>
              {isChecking ? 'Checking…' : isOnline ? 'Connected' : connection === 'disabled' ? 'Demo mode' : 'Not connected'}
            </strong>
            <span>
              {isOnline
                ? `${device ?? 'ComfyUI'} · v${version ?? 'unknown'}${ramTotal ? ` · ${Math.round(ramTotal / 1024 ** 3)} GB unified` : ''}`
                : connection === 'disabled'
                  ? 'The app uses its local SVG mock provider.'
                  : error ?? 'Start ComfyUI locally, or enter a Cloud endpoint and key.'}
            </span>
          </div>
          <button className="button button--ghost button--small" onClick={() => void checkConnection()} disabled={isChecking || !useComfy}>
            <RefreshCw size={13} /> Test
          </button>
        </div>

        <div className="conn-form">
          <label className="switch-row">
            <span>
              <strong>Use ComfyUI</strong>
              <small>Turn off to preview the canvas with the deterministic mock provider.</small>
            </span>
            <button
              className={`switch ${useComfy ? 'switch--on' : ''}`}
              onClick={() => setUseComfy(!useComfy)}
              role="switch"
              aria-checked={useComfy}
            >
              <span />
            </button>
          </label>

          <label className="switch-row">
            <span>
              <strong>Fast local video</strong>
              <small>256×256, 17 frames, 4 steps. Turn off for 512×512 and longer clips on a fast GPU.</small>
            </span>
            <button
              className={`switch ${videoDraft ? 'switch--on' : ''}`}
              onClick={() => setVideoDraft(!videoDraft)}
              role="switch"
              aria-checked={videoDraft}
              disabled={!useComfy}
            >
              <span />
            </button>
          </label>

          <label className="field">
            <span>Base URL</span>
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="http://127.0.0.1:8188"
              disabled={!useComfy}
            />
          </label>

          <label className="field">
            <span>Access key <em>optional · session only</em></span>
            <div className="secret-input">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Only for a private ComfyUI (shared by its owner) or Comfy Cloud"
                disabled={!useComfy}
              />
              <button type="button" onClick={() => setShowKey((value) => !value)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Image checkpoint</span>
            <input
              value={checkpoint}
              onChange={(event) => setCheckpoint(event.target.value)}
              placeholder="sd_turbo.safetensors"
              disabled={!useComfy}
            />
          </label>

          <label className="field">
            <span>Video checkpoint</span>
            <input
              value={videoCheckpoint}
              onChange={(event) => setVideoCheckpoint(event.target.value)}
              placeholder="ltxv-2b-0.9.8-distilled-fp8.safetensors"
              disabled={!useComfy}
            />
          </label>

          <label className="field">
            <span>LTX text encoder</span>
            <input
              value={textEncoder}
              onChange={(event) => setTextEncoder(event.target.value)}
              placeholder="t5xxl_fp8_e4m3fn.safetensors"
              disabled={!useComfy}
            />
          </label>
        </div>

        <div className="conn-help">
          <div>
            <Server size={14} />
            <strong>Local quick start</strong>
          </div>
          <code><Terminal size={12} /> cd comfyui && .venv/bin/python main.py --enable-cors-header</code>
          <p>
            The model must match the checkpoint field. For this repo: <code>sd_turbo.safetensors</code>{' '}
            in <code>ComfyUI/models/checkpoints</code>.
          </p>
        </div>

        <div className="modal__foot">
          <span><CheckCircle2 size={13} /> Same graph, local or Cloud</span>
          <a className="text-button" href="https://docs.comfy.org/development/comfyui-server/comms_routes" target="_blank" rel="noreferrer">
            Comfy API docs <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

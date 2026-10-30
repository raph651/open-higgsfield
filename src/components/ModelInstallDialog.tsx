import { Download, ExternalLink, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { MODEL_BY_ID } from '../data';
import { useSettingsStore } from '../store/useSettingsStore';

/** Shown when a local model's files are not in ComfyUI yet: what to download, where to put it, and a way to check again. */
export function ModelInstallDialog() {
  const id = useSettingsStore((state) => state.installModelId);
  const close = useSettingsStore((state) => state.closeInstall);
  const installed = useSettingsStore((state) => state.installed);
  const checking = useSettingsStore((state) => state.installChecking);
  const recheck = useSettingsStore((state) => state.checkInstalled);
  const connection = useSettingsStore((state) => state.connection);
  const model = id ? MODEL_BY_ID[id] : undefined;
  if (!model || !model.install) return null;
  const ready = installed[model.id] === true;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal install-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Install ${model.name}`}>
        <div className="modal__head">
          <div>
            <span className="eyebrow">LOCAL MODEL</span>
            <h2>{ready ? `${model.name} is installed` : `Install ${model.name}`}</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="modal__lede">{model.blurb}</p>

        {connection !== 'online' && (
          <p className="install-modal__warn">ComfyUI is not connected, so installed files cannot be checked. Connect it from the ComfyUI badge first.</p>
        )}

        <ol className="install-steps">
          {model.install.files.map((item) => (
            <li key={item.file}>
              <div>
                <strong>{item.file}</strong>
                <span>Save to <code>ComfyUI/{item.folder}/</code>{item.size ? ` · ${item.size}` : ''}</span>
              </div>
              <a className="button button--ghost button--small" href={item.url} target="_blank" rel="noreferrer">
                <Download size={13} /> Download
              </a>
            </li>
          ))}
          {model.install.customNodes?.map((name) => (
            <li key={name}>
              <div>
                <strong>Custom node: {name}</strong>
                <span>Install it from the ComfyUI Manager, or clone it into <code>ComfyUI/custom_nodes/</code>.</span>
              </div>
            </li>
          ))}
        </ol>
        {model.install.note && <p className="install-modal__note">{model.install.note}</p>}

        <div className="install-modal__actions">
          <a className="button button--ghost" href={model.install.docs} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> Instructions
          </a>
          <button className="button button--lime" onClick={() => void recheck()} disabled={checking || connection !== 'online'}>
            {checking ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />} Check again
          </button>
        </div>
        <p className="install-modal__status" role="status">
          {checking ? 'Checking ComfyUI…' : ready ? 'ComfyUI can see every file. Pick the model again to use it.' : 'Restart ComfyUI after copying the files, then press Check again.'}
        </p>
      </div>
    </div>
  );
}

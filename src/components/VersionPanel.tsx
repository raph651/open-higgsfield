import { History, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';

interface VersionPanelProps {
  onClose: () => void;
}

function when(at: number) {
  const date = new Date(at);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VersionPanel({ onClose }: VersionPanelProps) {
  const activeId = useCanvasStore((state) => state.activeId);
  const versions = useCanvasStore((state) => state.versions);
  const saveVersion = useCanvasStore((state) => state.saveVersion);
  const restoreVersion = useCanvasStore((state) => state.restoreVersion);
  const deleteVersion = useCanvasStore((state) => state.deleteVersion);
  const docVersions = versions.filter((version) => version.docId === activeId);

  return (
    <aside className="versions-panel">
      <div className="versions-panel__head">
        <div>
          <span className="eyebrow">TIMELINE</span>
          <h2>Versions</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close versions">
          <X size={16} />
        </button>
      </div>

      <button className="versions-save" onClick={() => saveVersion('Manual snapshot')}>
        <Save size={14} /> Save current version
      </button>

      <div className="versions-list">
        {docVersions.map((version) => (
          <article key={version.id} className="version-card">
            <div className="version-card__top">
              <span className="version-card__icon"><History size={13} /></span>
              <div>
                <strong>{version.label}</strong>
                <span>{when(version.at)}</span>
              </div>
            </div>
            <div className="version-card__meta">
              <span>{version.title}</span>
              <span>{version.nodes.length} nodes</span>
            </div>
            <div className="version-card__actions">
              <button onClick={() => { restoreVersion(version.id); onClose(); }}>
                <RotateCcw size={12} /> Restore
              </button>
              <button onClick={() => deleteVersion(version.id)} title="Delete version">
                <Trash2 size={12} />
              </button>
            </div>
          </article>
        ))}
        {!docVersions.length && (
          <div className="versions-empty">
            <History size={24} />
            <strong>No versions yet</strong>
            <span>Save a snapshot before a big edit, or let a completed render create one.</span>
          </div>
        )}
      </div>

      <div className="versions-panel__foot">
        <span>{docVersions.length} saved</span>
        <span>Autosaves on render</span>
      </div>
    </aside>
  );
}

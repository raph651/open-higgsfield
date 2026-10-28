import { LoaderCircle, Play, Sparkles, Square } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';

export function RunBar() {
  const doc = useCanvasStore((state) => (state.activeId ? state.docs[state.activeId] : null));
  const running = useCanvasStore((state) => state.running);
  const runLabel = useCanvasStore((state) => state.runLabel);
  const credits = useCanvasStore((state) => state.credits);
  const run = useCanvasStore((state) => state.run);
  const cancelRun = useCanvasStore((state) => state.cancelRun);
  const selectedId = useCanvasStore((state) => state.selectedId);

  if (!doc) return null;
  const modelCount = doc.nodes.filter((node) => node.data.kind === 'model').length;
  const cost = doc.nodes
    .filter((node) => node.data.kind === 'model')
    .reduce((sum, node) => sum + (node.data.cost ?? 3), 0);

  return (
    <div className="runbar">
      <div className="runbar__meta">
        <span className="eyebrow">GRAPH</span>
        <strong>{doc.nodes.length} nodes · {doc.edges.length} links</strong>
      </div>
      <div className="runbar__divider" />
      <div className="runbar__credits">
        <Sparkles size={13} />
        {credits} credits
        <span className="muted">· ~{cost} full run</span>
      </div>
      <div className="runbar__status">
        {running ? (
          <>
            <LoaderCircle size={14} className="spin" />
            {runLabel || 'Rendering…'}
          </>
        ) : (
          <span className="status-dot status-dot--live" />
        )}
      </div>
      <div className="runbar__actions">
        {selectedId && !running && (
          <button className="button button--ghost button--small" onClick={() => run('selected')}>
            Run selected
          </button>
        )}
        {running ? (
          <button className="button button--danger-solid button--small" onClick={cancelRun}>
            <Square size={12} /> Cancel
          </button>
        ) : (
          <button
            className="button button--lime button--small"
            onClick={() => run('all')}
            disabled={modelCount === 0}
            title={modelCount === 0 ? 'Add a model node first' : 'Run all model nodes'}
          >
            <Play size={13} fill="currentColor" />
            Run graph
          </button>
        )}
      </div>
    </div>
  );
}

import { useRef } from 'react';
import {
  Copy,
  Download,
  ImagePlus,
  Play,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { ASPECTS, MODEL_BY_ID, NODE_META, LISTED_MODELS } from '../data';
import { useCanvasStore } from '../store/useCanvasStore';
import { fileToNodeMedia } from '../lib/media';
import { useSettingsStore } from '../store/useSettingsStore';
import type { CanvasNode, ModelId } from '../types';

export function Inspector() {
  const doc = useCanvasStore((state) => (state.activeId ? state.docs[state.activeId] : null));
  const selectedId = useCanvasStore((state) => state.selectedId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const addAsset = useCanvasStore((state) => state.addAsset);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const renameCanvas = useCanvasStore((state) => state.renameCanvas);
  const run = useCanvasStore((state) => state.run);
  const running = useCanvasStore((state) => state.running);
  const credits = useCanvasStore((state) => state.credits);
  const clearOutputs = useCanvasStore((state) => state.clearOutputs);
  const resetWorkspace = useCanvasStore((state) => state.resetWorkspace);
  const showToast = useCanvasStore((state) => state.showToast);
  const openPage = useCanvasStore((state) => state.openPage);
  const useComfy = useSettingsStore((state) => state.useComfy);
  const connection = useSettingsStore((state) => state.connection);
  const videoDraft = useSettingsStore((state) => state.videoDraft);
  const fileRef = useRef<HTMLInputElement>(null);
  const connectedOutput = useCanvasStore((state) => {
    const active = state.activeId ? state.docs[state.activeId] : null;
    const edge = active?.edges.find((item) => item.target === selectedId);
    const source = edge ? active?.nodes.find((item) => item.id === edge.source) : null;
    return source?.data.outputUrl ?? null;
  });
  const connectedOutputKind = useCanvasStore((state) => {
    const active = state.activeId ? state.docs[state.activeId] : null;
    const edge = active?.edges.find((item) => item.target === selectedId);
    const source = edge ? active?.nodes.find((item) => item.id === edge.source) : null;
    return source?.data.outputKind ?? null;
  });

  const node = doc?.nodes.find((item) => item.id === selectedId) ?? null;

  const upload = async (file?: File) => {
    if (!node || !file) return;
    try {
      const media = await fileToNodeMedia(file);
      updateNodeData(node.id, {
        previewUrl: media.url,
        mediaKind: media.kind,
        label: file.name.replace(/\.[^.]+$/, '').slice(0, 22).toUpperCase(),
        title: media.kind === 'video' ? 'Video' : 'Image',
      });
      addAsset({ url: media.url, kind: media.kind, name: file.name, source: 'upload' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  if (!node) {
    return (
      <aside className="inspector">
        <div className="inspector__head">
          <div>
            <span className="eyebrow">CANVAS SETTINGS</span>
            <h2>{doc?.title ?? 'No canvas'}</h2>
          </div>
        </div>
        <div className="inspector__scroll">
          <div className="inspector__section">
            <label className="field">
              <span>Project title</span>
              <input
                value={doc?.title ?? ''}
                onChange={(event) => renameCanvas(event.target.value)}
                placeholder="Untitled canvas"
              />
            </label>
            <div className="metric-row">
              <div><strong>{doc?.nodes.length ?? 0}</strong><span>nodes</span></div>
              <div><strong>{doc?.edges.length ?? 0}</strong><span>links</span></div>
              <div><strong>{credits}</strong><span>credits</span></div>
            </div>
          </div>
          <div className="inspector__section">
            <span className="section-label">Runtime</span>
            <div className="setting-row">
              <span>Provider</span>
              <strong>
                <span className={`status-dot ${connection === 'online' && useComfy ? 'status-dot--live' : ''}`} />
                {!useComfy ? 'Local mock' : connection === 'online' ? 'ComfyUI' : 'ComfyUI offline'}
              </strong>
            </div>
            <div className="setting-row">
              <span>Autosave</span>
              <strong>Every 3 seconds</strong>
            </div>
            <div className="setting-row">
              <span>Storage</span>
              <strong>This browser</strong>
            </div>
          </div>
          <div className="inspector__hint">
            <Sparkles size={15} />
            <p>
              Select a node to edit its prompt, model, aspect or reference. Run the whole graph with
              <kbd>⌘</kbd><kbd>↵</kbd>.
            </p>
          </div>
        </div>
        <div className="inspector__footer">
          <button className="button button--ghost button--full" onClick={clearOutputs}>
            Clear all outputs
          </button>
          <button
            className="text-button text-button--danger"
            onClick={() => {
              if (window.confirm('Reset the whole workspace? This clears saved canvases in this browser.')) {
                resetWorkspace();
              }
            }}
          >
            Reset workspace
          </button>
        </div>
      </aside>
    );
  }

  const meta = NODE_META[node.data.kind];
  const model = (node.data.model ? MODEL_BY_ID[node.data.model] : null) ?? LISTED_MODELS[0];

  return (
    <aside className="inspector">
      <div className="inspector__head">
        <div>
          <input
            className="inspector__title"
            value={node.data.title}
            onChange={(event) => updateNodeData(node.id, { title: event.target.value })}
            aria-label="Node title"
          />
        </div>
        {node.data.status !== 'idle' && (
          <span className={`node__status node__status--${node.data.status}`}>
            <span className="node__status-dot" />
            {node.data.status}
          </span>
        )}
      </div>

      <div className="inspector__scroll">
        {node.data.kind === 'prompt' && (
          <div className="inspector__section">
            <label className="field">
              <span>Direction</span>
              <textarea
                value={node.data.prompt ?? ''}
                onChange={(event) => updateNodeData(node.id, { prompt: event.target.value })}
                placeholder="A bone-white ceramic vessel on wet black stone. One hard sidelight, deep shadow, a single acid-green reflection at the rim."
                rows={9}
              />
            </label>
          </div>
        )}

        {node.data.kind === 'model' && (
          <>
            <div className="inspector__section">
              <span className="section-label">Model</span>
              <div className="model-picker">
                {LISTED_MODELS.map((item) => (
                  <button
                    key={item.id}
                    className={node.data.model === item.id ? 'model-option model-option--active' : 'model-option'}
                    onClick={() => {
                      updateNodeData(node.id, {
                        model: item.id as ModelId,
                        outputUrl: undefined,
                        outputKind: undefined,
                        status: 'idle',
                        duration: item.family === 'video' ? node.data.duration ?? 4 : node.data.duration,
                      });
                    }}
                  >
                    <span className="model-option__swatch" style={{ background: item.accent }} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.family} · {item.cost} cr</small>
                    </span>
                    <span className={`model-option__badge ${item.runtime === 'api' ? 'is-api' : ''}`}>
                      {item.runtime === 'api' ? 'API' : 'LOCAL'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="microcopy">
                LOCAL runs through ComfyUI. API adapters are seats for Seedance, LTX-2.3, Nano
                Banana Pro and Soul 2.0 once a wrapper is connected.
              </p>
            </div>

            <div className="inspector__section">
              <span className="section-label">Output</span>
              <div className="segmented">
                {ASPECTS.map((aspect) => (
                  <button
                    key={aspect}
                    className={node.data.aspect === aspect ? 'segmented__item is-active' : 'segmented__item'}
                    onClick={() => updateNodeData(node.id, { aspect })}
                  >
                    {aspect}
                  </button>
                ))}
              </div>
              {model?.family === 'video' && (
                <>
                  <div className="setting-row setting-row--slider">
                    <span>Duration</span>
                    <strong>{node.data.duration ?? 4}s</strong>
                  </div>
                  <input
                    className="range"
                    type="range"
                    min={2}
                    max={10}
                    step={1}
                    value={node.data.duration ?? 4}
                    onChange={(event) => updateNodeData(node.id, { duration: Number(event.target.value) })}
                  />
                  {videoDraft && model.runtime === 'comfyui' && (
                    <p className="microcopy">
                      Fast local video is on: 17 frames at 256×256 (~0.7s). Turn it off in the
                      connection panel for the full duration.
                    </p>
                  )}
                  {model.runtime === 'api' && (
                    <p className="microcopy">
                      This is an API seat. Connect the {model.name} wrapper in
                      src/lib/modelWrappers.ts before rendering.
                    </p>
                  )}
                </>
              )}
              <label className="field field--inline">
                <span>Seed</span>
                <input
                  type="number"
                  value={node.data.seed ?? ''}
                  placeholder="Random"
                  onChange={(event) =>
                    updateNodeData(node.id, { seed: event.target.value === '' ? undefined : Number(event.target.value) })
                  }
                />
              </label>
            </div>

            <div className="inspector__section">
              <label className="field">
                <span>Fallback prompt</span>
                <textarea
                  value={node.data.prompt ?? ''}
                  onChange={(event) => updateNodeData(node.id, { prompt: event.target.value })}
                  placeholder="Used when no prompt node is connected."
                  rows={5}
                />
              </label>
              <p className="microcopy">
                Connected prompt text is appended to this prompt. Reference nodes are passed as
                conditioning metadata.
              </p>
            </div>

            {node.data.outputUrl && (
              <div className="inspector__section">
                <div className="output-preview">
                  {node.data.outputKind === 'video' ? (
                    <video src={node.data.outputUrl} autoPlay muted loop playsInline />
                  ) : (
                    <img src={node.data.outputUrl} alt="Current render" />
                  )}
                  <div className="output-preview__bar">
                    <span>{model?.family} render</span>
                    <a
                      className="button button--ghost button--small"
                      href={node.data.outputUrl}
                      download={`open-source-canvas-${node.id}.svg`}
                    >
                      <Download size={13} /> Download
                    </a>
                  </div>
                </div>
              </div>
            )}

            <button
              className="button button--lime button--full button--large"
              onClick={() => run('selected')}
              disabled={running}
            >
              <Wand2 size={15} />
              {running ? 'Rendering…' : `Render node · ${model?.cost ?? 3} credits`}
            </button>
          </>
        )}

        {node.data.kind === 'reference' && (
          <div className="inspector__section">
            <span className="section-label">Anchor</span>
            <button className="upload-zone" onClick={() => fileRef.current?.click()}>
              {node.data.previewUrl ? (
                node.data.mediaKind === 'video' ? (
                  <video src={node.data.previewUrl} controls autoPlay muted loop playsInline />
                ) : (
                  <img src={node.data.previewUrl} alt="Reference" />
                )
              ) : (
                <>
                  <ImagePlus size={20} />
                  <strong>Add an image or video</strong>
                  <small>PNG, JPG, WebP, MP4 or WebM</small>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              hidden
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <label className="field">
              <span>Label</span>
              <input
                value={node.data.label ?? ''}
                onChange={(event) => updateNodeData(node.id, { label: event.target.value })}
                placeholder="CERAMIC / 01"
              />
            </label>
            <button className="button button--ghost button--full" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Replace reference
            </button>
          </div>
        )}

        {node.data.kind === 'output' && (
          <div className="inspector__section">
            <span className="section-label">Delivery</span>
            {connectedOutput ? (
              <>
                <div className="output-preview">
                  {connectedOutputKind === 'video' ? (
                    <video src={connectedOutput} autoPlay muted loop playsInline />
                  ) : (
                    <img src={connectedOutput} alt="Delivery output" />
                  )}
                </div>
                <a
                  className="button button--lime button--full"
                  href={connectedOutput}
                  download={`open-source-canvas-delivery-${node.id}.svg`}
                >
                  <Download size={14} /> Download output
                </a>
              </>
            ) : (
              <div className="inspector__empty">
                <Play size={18} />
                <strong>No delivery yet</strong>
                <span>Connect a model node to this output, then run the model.</span>
              </div>
            )}
          </div>
        )}

        {node.data.kind === 'shape' && (
          <div className="inspector__section">
            <span className="section-label">Shape</span>
            <div className="segmented">
              {(['rect', 'ellipse', 'diamond'] as const).map((shape) => (
                <button
                  key={shape}
                  className={node.data.shape === shape ? 'segmented__item is-active' : 'segmented__item'}
                  onClick={() => updateNodeData(node.id, { shape })}
                >
                  {shape === 'rect' ? 'Rectangle' : shape === 'ellipse' ? 'Ellipse' : 'Diamond'}
                </button>
              ))}
            </div>
          </div>
        )}

        {node.data.kind === 'page' && (
          <div className="inspector__section">
            <span className="section-label">Page</span>
            <p className="microcopy">
              This node opens a nested canvas. Everything you add inside stays scoped to this page.
            </p>
            <button className="button button--lime button--full" onClick={() => openPage(node.id)}>
              Open page
            </button>
          </div>
        )}

        {node.data.kind === 'table' && (
          <div className="inspector__section">
            <span className="section-label">Table</span>
            <p className="microcopy">
              {(node.data.table?.rows.length ?? 0)} rows · {(node.data.table?.columns.length ?? 0)} columns.
              Edit cells directly on the canvas.
            </p>
            <div className="inspector__row-actions">
              <button
                className="button button--ghost button--small"
                onClick={() => {
                  const table = node.data.table ?? { columns: ['Beat', 'Shot', 'Note'], rows: [] };
                  updateNodeData(node.id, {
                    table: { columns: table.columns, rows: [...table.rows, table.columns.map(() => '')] },
                  });
                }}
              >
                Add row
              </button>
              <button
                className="button button--ghost button--small"
                onClick={() => {
                  const table = node.data.table ?? { columns: [], rows: [] };
                  updateNodeData(node.id, {
                    table: {
                      columns: [...table.columns, `Col ${table.columns.length + 1}`],
                      rows: table.rows.map((row) => [...row, '']),
                    },
                  });
                }}
              >
                Add column
              </button>
            </div>
          </div>
        )}

        {node.data.kind === 'note' && (
          <div className="inspector__section">
            <label className="field">
              <span>{node.data.variant === 'sticky' ? 'Sticky note' : node.data.variant === 'text' ? 'Text' : 'Director’s note'}</span>
              <textarea
                value={node.data.note ?? ''}
                onChange={(event) => updateNodeData(node.id, { note: event.target.value })}
                placeholder="Keep the light hard. No text. Leave room for the title on the left."
                rows={10}
              />
            </label>
          </div>
        )}
      </div>

      <div className="inspector__footer">
        <button className="button button--ghost button--small" onClick={() => duplicateNode(node.id)}>
          <Copy size={13} /> Duplicate
        </button>
        <button className="button button--ghost button--small button--danger" onClick={() => deleteNode(node.id)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </aside>
  );
}

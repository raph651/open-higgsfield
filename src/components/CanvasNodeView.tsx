import { useRef, useState } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import {
  AlertTriangle,
  ChevronDown,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  Play,
  Sparkles,
  Ungroup,
  Upload,
} from 'lucide-react';
import { ASPECTS, MODELS, MODEL_BY_ID, NODE_META } from '../data';
import { useCanvasStore } from '../store/useCanvasStore';
import { fileToNodeMedia } from '../lib/media';
import type { CanvasNode, ModelId } from '../types';
import { Artwork } from './Artwork';
import { VideoStill } from './VideoStill';
import { Logo } from './Logo';
import { ModelPicker } from './ModelPicker';
import { GenerationTypePicker, type GenerationFamily } from './GenerationTypePicker';
import { MentionMenu } from './MentionMenu';
import { buildMentionGroups, type MentionItem } from '../lib/mentions';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  queued: 'Queued',
  running: 'Rendering',
  done: 'Ready',
  error: 'Needs input',
};

export function CanvasNodeView({ id, data, selected }: NodeProps<CanvasNode>) {
  const meta = NODE_META[data.kind];
  const accentColor =
    data.kind === 'prompt' || data.kind === 'reference' || data.kind === 'note' ||
    data.kind === 'shape' || data.kind === 'table'
      ? 'var(--accent-soft)'
      : meta.color;
  const model = (data.model ? MODEL_BY_ID[data.model] : null) ?? MODELS[0];
  const setSelected = useCanvasStore((state) => state.setSelected);
  const openDetails = useCanvasStore((state) => state.openDetails);
  const storeSelected = useCanvasStore((state) => state.selectedId === id);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const run = useCanvasStore((state) => state.run);
  const running = useCanvasStore((state) => state.running);
  const addAsset = useCanvasStore((state) => state.addAsset);
  const showToast = useCanvasStore((state) => state.showToast);
  const ungroupSelection = useCanvasStore((state) => state.ungroupSelection);
  const storedWidth = useCanvasStore((state) => {
    const doc = state.activeId ? state.docs[state.activeId] : null;
    return doc?.nodes.find((node) => node.id === id)?.width ?? null;
  });
  const storedHeight = useCanvasStore((state) => {
    const doc = state.activeId ? state.docs[state.activeId] : null;
    return doc?.nodes.find((node) => node.id === id)?.height ?? null;
  });
  const childCount = useCanvasStore((state) => {
    const doc = state.activeId ? state.docs[state.activeId] : null;
    return doc?.nodes.filter((node) => node.parentId === id).length ?? 0;
  });
  const position = useCanvasStore((state) => {
    const doc = state.activeId ? state.docs[state.activeId] : null;
    return doc?.nodes.find((item) => item.id === id)?.position ?? null;
  });
  const doc = useCanvasStore((state) => (state.activeId ? state.docs[state.activeId] : null));
  const assets = useCanvasStore((state) => state.assets);
  const addNode = useCanvasStore((state) => state.addNode);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const fileRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ query: string; start: number; end: number } | null>(null);

  const uploadReference = async (file?: File) => {
    if (!file) return;
    try {
      const media = await fileToNodeMedia(file);
      updateNodeData(id, {
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
  const switchGenerationFamily = (family: GenerationFamily) => {
    const nextId: ModelId = family === 'video' ? 'ltx-video-2b' : 'sd-turbo';
    const nextModel = MODEL_BY_ID[nextId];
    updateNodeData(id, {
      model: nextId,
      title: family === 'video' ? 'Video Generation' : 'Image Generation',
      resolution: nextModel?.resolutions?.[0] ?? (family === 'video' ? '720p' : '1k'),
      duration: family === 'video' ? data.duration ?? 4 : data.duration,
      generateAudio: family === 'video',
      cost: nextModel?.cost ?? data.cost,
      outputUrl: undefined,
      outputKind: undefined,
      status: 'idle',
    });
  };

  const connectedUrl = useCanvasStore((state) => {
    const doc = state.activeId ? state.docs[state.activeId] : null;
    const edge = doc?.edges.find((item) => item.target === id);
    const source = edge ? doc?.nodes.find((item) => item.id === edge.source) : null;
    return source?.data.outputUrl ?? null;
  });
  const connectedKind = useCanvasStore((state) => {
    const doc = state.activeId ? state.docs[state.activeId] : null;
    const edge = doc?.edges.find((item) => item.target === id);
    const source = edge ? doc?.nodes.find((item) => item.id === edge.source) : null;
    return source?.data.outputKind ?? null;
  });

  const resolutionOptions =
    model?.resolutions ?? (model?.family === 'video' ? ['720p', '1080p'] : ['1k', '2k', '4k']);
  const status = data.status ?? 'idle';
  const outputUrl = data.kind === 'output' ? connectedUrl : data.outputUrl;
  const outputKind = data.kind === 'output' ? connectedKind : data.outputKind;
  const isVideo =
    data.mediaKind === 'video' ||
    Boolean(data.previewUrl?.startsWith('data:video')) ||
    /\.(mp4|webm|mov)(\?|$)/i.test(data.previewUrl ?? '');

  const syncMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = /(?:^|\s)@([\p{L}\p{N}_-]*)$/u.exec(before);
    if (!match) {
      setMention(null);
      return;
    }
    setMention({ query: match[1].toLowerCase(), start: caret - match[1].length - 1, end: caret });
  };

  const chooseMention = (item: MentionItem) => {
    if (!mention) return;
    const value = promptRef.current?.value ?? data.prompt ?? '';
    let sourceId = item.nodeId;
    if (item.assetId) {
      const baseX = Math.max(40, (position?.x ?? 300) - 340);
      let y = position?.y ?? 200;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const occupied = (doc?.nodes ?? []).some(
          (node) => Math.abs(node.position.x - baseX) < 250 && Math.abs(node.position.y - y) < 190,
        );
        if (!occupied) break;
        y += 210;
      }
      sourceId = addNode(
        'reference',
        { x: baseX, y },
        undefined,
        {
          previewUrl: item.url,
          mediaKind: item.kind === 'video' ? 'video' : 'image',
          title: item.kind === 'video' ? 'Video' : 'Image',
          label: item.label.slice(0, 22).toUpperCase(),
        },
        false,
      );
    }
    if (sourceId && !item.linked) {
      onConnect({ source: sourceId, target: id, sourceHandle: null, targetHandle: null });
    }
    const handle = item.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reference';
    const token = `@${handle} `;
    updateNodeData(id, {
      prompt: `${value.slice(0, mention.start)}${token}${value.slice(mention.end)}`,
    });
    const caret = mention.start + token.length;
    setMention(null);
    window.requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(caret, caret);
    });
  };

  const mentionGroups = mention ? buildMentionGroups(doc, id, assets, mention.query) : [];

  if (data.kind === 'group') {
    return (
      <div className={`node node--group ${selected ? 'node--selected' : ''}`}>
        <div className="node-group__label">
          <span>{data.title}</span>
          <small>{childCount} nodes</small>
          <button
            className="nodrag"
            onClick={(event) => {
              event.stopPropagation();
              setSelected(id);
              ungroupSelection();
            }}
            title="Ungroup"
          >
            <Ungroup size={12} /> Ungroup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'node',
        `node--${data.kind}`,
        selected || storeSelected ? 'node--selected' : '',
        status !== 'idle' ? `node--${status}` : '',
      ].join(' ')}
      style={{
        ['--node-accent' as string]: accentColor,
        width: storedWidth ?? undefined,
        height: storedHeight ?? undefined,
      }}
    >
      <NodeResizer
        minWidth={220}
        minHeight={data.kind === 'model' ? 300 : 120}
        isVisible={selected || storeSelected}
        lineClassName="node-resizer__line"
        handleClassName="node-resizer__handle"
      />
      {data.kind !== 'prompt' && data.kind !== 'reference' && data.kind !== 'note' && data.kind !== 'shape' && data.kind !== 'table' && (
        <Handle type="target" position={Position.Left} className="node-handle node-handle--in" />
      )}

      <div className="node__head">
        <span className="node__title">{data.title}</span>
        {data.kind === 'model' && (
          <GenerationTypePicker
            variant="node"
            family={model?.family === 'video' ? 'video' : 'image'}
            label={data.title}
            onChange={switchGenerationFamily}
          />
        )}
        {status !== 'idle' && data.kind !== 'note' && data.kind !== 'table' && (
          <span className={`node__status node__status--${status}`}>
            {status === 'running' || status === 'queued' ? (
              <LoaderCircle size={11} className="spin" />
            ) : status === 'error' ? (
              <AlertTriangle size={11} />
            ) : (
              <span className="node__status-dot" />
            )}
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <div className="node__body">
        {data.kind === 'prompt' && (
          <>
            <p className={data.prompt?.trim() ? 'node__prompt' : 'node__prompt node__prompt--empty'}>
              {data.prompt?.trim() || 'Write the direction in the inspector. Then connect it to a model.'}
            </p>
          </>
        )}

        {data.kind === 'model' && (
          <>
            {outputUrl ? (
              <div className="node__media">
                {outputKind === 'video' ? (
                  <video src={outputUrl} autoPlay muted loop playsInline />
                ) : (
                  <img src={outputUrl} alt={`${data.title} output`} draggable={false} />
                )}
                {outputKind === 'video' && (
                  <span className="node__play"><Play size={12} fill="currentColor" /> LTX</span>
                )}
                <span className="node__media-tag">RENDER</span>
              </div>
            ) : status === 'error' ? (
              <div className="node__render node__render--error">
                <AlertTriangle size={18} />
                <strong>
                  {data.error?.toLowerCase().includes('wrapper') ? 'API wrapper required' : 'Needs an input'}
                </strong>
                <small>{data.error ?? 'Connect a prompt or reference.'}</small>
              </div>
            ) : status === 'running' || status === 'queued' ? (
              <div className="node__render node__render--running">
                <span className="node__orb" style={{ background: model?.accent }} />
                <LoaderCircle size={18} className="spin" />
                <strong>{status === 'queued' ? 'Queued' : 'Rendering'}</strong>
                <small>{model?.name} · {model?.family}</small>
              </div>
            ) : (
              <div className="node__render node__render--empty">
                <span className="node__watermark" aria-hidden="true">
                  <Logo compact />
                </span>
              </div>
            )}

            <div
              className="node__quick nodrag nowheel"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
                <div className="node__quick-composer">
                  <textarea
                    ref={promptRef}
                    className="nowheel"
                    value={data.prompt ?? ''}
                    placeholder="Describe what you want to create…"
                    rows={4}
                    onFocus={() => openDetails(id)}
                    onChange={(event) => {
                      const caret = event.target.selectionStart ?? event.target.value.length;
                      updateNodeData(id, { prompt: event.target.value });
                      syncMention(event.target.value, caret);
                      window.requestAnimationFrame(() => {
                        const field = promptRef.current;
                        if (!field || document.activeElement !== field) return;
                        if (field.selectionStart !== caret) field.setSelectionRange(caret, caret);
                      });
                    }}
                    onKeyUp={(event) => syncMention(event.currentTarget.value, event.currentTarget.selectionStart ?? 0)}
                    onClick={(event) => syncMention(event.currentTarget.value, event.currentTarget.selectionStart ?? 0)}
                    onBlur={() => window.setTimeout(() => setMention(null), 140)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && mention) {
                        event.stopPropagation();
                        setMention(null);
                      }
                    }}
                  />
                  {mention && <MentionMenu groups={mentionGroups} onSelect={chooseMention} />}
                  {(selected || storeSelected) && (
                  <div className="node__quick-meta-row">
                    <label className="node__quick-chip" title="Resolution">
                      <select
                        value={data.resolution ?? (model?.family === 'video' ? '720p' : '1k')}
                        aria-label="Resolution"
                        onChange={(event) => updateNodeData(id, { resolution: event.target.value })}
                      >
                        {resolutionOptions.map((resolution) => (
                          <option key={resolution} value={resolution}>{resolution}</option>
                        ))}
                      </select>
                      <ChevronDown size={9} />
                    </label>
                    <label className="node__quick-chip" title="Aspect ratio">
                      <select
                        value={data.aspect ?? '1:1'}
                        aria-label="Aspect ratio"
                        onChange={(event) => updateNodeData(id, { aspect: event.target.value as typeof data.aspect })}
                      >
                        {ASPECTS.map((aspect) => (
                          <option key={aspect} value={aspect}>{aspect}</option>
                        ))}
                      </select>
                      <ChevronDown size={9} />
                    </label>
                  </div>
                  )}
                  {(selected || storeSelected) && (
                  <div className="node__quick-foot">
                    <ModelPicker
                      variant="node"
                      value={(data.model ?? 'sd-turbo') as ModelId}
                      onChange={(next) => {
                        const nextModel = MODEL_BY_ID[next];
                        const nextResolutions = nextModel?.resolutions ?? (nextModel?.family === 'video' ? ['720p', '1080p'] : ['1k', '2k', '4k']);
                        updateNodeData(id, {
                          model: next,
                          title:
                            data.title === 'Image Generation' || data.title === 'Video Generation'
                              ? nextModel?.family === 'video'
                                ? 'Video Generation'
                                : 'Image Generation'
                              : data.title,
                          resolution: nextResolutions.includes(data.resolution ?? '')
                            ? data.resolution
                            : nextResolutions[0],
                          outputUrl: undefined,
                          outputKind: undefined,
                          status: 'idle',
                          cost: nextModel?.cost ?? model?.cost,
                        });
                      }}
                    />
                    <div className="node__quick-actions">
                      <button
                        type="button"
                        className="node__quick-generate"
                        onClick={() => void run('selected')}
                        disabled={running}
                      >
                        {running ? <LoaderCircle size={10} className="spin" /> : <Sparkles size={10} />}
                        {running ? 'Rendering' : 'Generate'}
                        {!running && <span>{data.cost ?? model?.cost ?? 3}</span>}
                      </button>
                      <button
                        type="button"
                        className="node__quick-more"
                        title="Open settings"
                        aria-label="Open settings"
                        onClick={() => openDetails(id)}
                      >
                        <Maximize2 size={11} />
                      </button>
                    </div>
                  </div>
                  )}
                </div>
            </div>
          </>
        )}

        {data.kind === 'reference' && (
          <>
            <div className="node__media node__media--reference">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                hidden
                onChange={(event) => void uploadReference(event.target.files?.[0])}
              />
              {data.previewUrl ? (
                <>
                  {isVideo ? (
                    <VideoStill src={data.previewUrl} />
                  ) : (
                    <img src={data.previewUrl} alt={data.label ?? 'Reference'} draggable={false} />
                  )}
                  <button
                    className="node__replace nodrag"
                    onClick={(event) => {
                      event.stopPropagation();
                      fileRef.current?.click();
                    }}
                  >
                    <Upload size={11} /> Replace
                  </button>
                </>
              ) : (
                <button
                  className="node__upload nodrag"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileRef.current?.click();
                  }}
                >
                  <ImagePlus size={18} />
                  <strong>Drop or click</strong>
                  <small>PNG · JPG · MP4 · WebM</small>
                </button>
              )}
              <span className="node__media-tag"><ImageIcon size={11} /> {data.label ?? 'ANCHOR'}</span>
            </div>
          </>
        )}

        {data.kind === 'output' && (
          <>
            <div className="node__media node__media--output">
              {outputUrl ? (
                outputKind === 'video' ? (
                  <video src={outputUrl} autoPlay muted loop playsInline />
                ) : (
                  <img src={outputUrl} alt="Final output" draggable={false} />
                )
              ) : (
                <div className="node__render node__render--quiet">
                  <strong>No output</strong>
                </div>
              )}
              {outputUrl && <span className="node__media-tag">DELIVERY</span>}
            </div>
          </>
        )}

        {data.kind === 'note' && (
          <div className={`node__note-wrap ${data.variant === 'sticky' ? 'node__note-wrap--sticky' : 'node__note-wrap--text'}`}>
            <textarea
              className="node__note-input nodrag"
              value={data.note ?? ''}
              onChange={(event) => updateNodeData(id, { note: event.target.value })}
              placeholder={data.variant === 'sticky' ? 'Write on the sticky note…' : 'Add text to the board…'}
              rows={data.variant === 'sticky' ? 6 : 3}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onFocus={() => setSelected(null)}
            />
          </div>
        )}

        {data.kind === 'shape' && (
          <div className="node__shape">
            <svg viewBox="0 0 220 150" role="img" aria-label={`${data.shape ?? 'rect'} shape`}>
              <defs>
                <linearGradient id={`shape-fill-${id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" className="node__shape-stop-a" />
                  <stop offset="100%" className="node__shape-stop-b" />
                </linearGradient>
              </defs>
              {data.shape === 'ellipse' ? (
                <ellipse cx="110" cy="75" rx="102" ry="66" fill={`url(#shape-fill-${id})`} className="node__shape-stroke" strokeWidth="1.6" />
              ) : data.shape === 'diamond' ? (
                <polygon points="110,8 212,75 110,142 8,75" fill={`url(#shape-fill-${id})`} className="node__shape-stroke" strokeWidth="1.6" />
              ) : (
                <rect x="8" y="8" width="204" height="134" rx="16" fill={`url(#shape-fill-${id})`} className="node__shape-stroke" strokeWidth="1.6" />
              )}
            </svg>
          </div>
        )}

        {data.kind === 'table' && (() => {
          const table = data.table ?? { columns: ['Beat', 'Shot', 'Note'], rows: [] };
          const patchTable = (next: { columns: string[]; rows: string[][] }) => updateNodeData(id, { table: next });
          const setCell = (rowIndex: number, columnIndex: number, value: string) => {
            const rows = table.rows.map((row, r) =>
              r === rowIndex ? row.map((cell, c) => (c === columnIndex ? value : cell)) : row,
            );
            patchTable({ columns: table.columns, rows });
          };
          return (
            <div
              className="node__table-wrap nodrag"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <table className="node__table">
                <thead>
                  <tr>
                    {table.columns.map((column, columnIndex) => (
                      <th key={columnIndex}>
                        <input
                          value={column}
                          aria-label={`Column ${columnIndex + 1}`}
                          onChange={(event) => {
                            const columns = table.columns.map((item, index) =>
                              index === columnIndex ? event.target.value : item,
                            );
                            patchTable({ columns, rows: table.rows });
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {table.columns.map((_, columnIndex) => (
                        <td key={columnIndex}>
                          <input
                            value={row[columnIndex] ?? ''}
                            aria-label={`Row ${rowIndex + 1} column ${columnIndex + 1}`}
                            onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="node__table-actions">
                <button
                  onClick={() => patchTable({ columns: table.columns, rows: [...table.rows, table.columns.map(() => '')] })}
                >
                  + Row
                </button>
                <button
                  onClick={() =>
                    patchTable({
                      columns: [...table.columns, `Col ${table.columns.length + 1}`],
                      rows: table.rows.map((row) => [...row, '']),
                    })
                  }
                >
                  + Column
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {data.kind !== 'output' && data.kind !== 'note' && data.kind !== 'shape' && data.kind !== 'table' && (
        <Handle type="source" position={Position.Right} className="node-handle node-handle--out" />
      )}
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Clock3,
  Copy,
  ImagePlus,
  Layers,
  LoaderCircle,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Wand2,
} from 'lucide-react';
import { ASPECTS, MODELS, MODEL_BY_ID } from '../data';
import { useCanvasStore } from '../store/useCanvasStore';
import { fileToNodeMedia } from '../lib/media';
import { VideoStill } from './VideoStill';
import { ModelPicker } from './ModelPicker';
import { MentionMenu } from './MentionMenu';
import { PromptMirror, syncMirrorScroll, syncPromptMirror } from './PromptMirror';
import { ToolPicker } from './ToolPicker';
import { announcePopover, subscribePopoverOpen } from '../lib/popoverBus';
import { buildMentionGroups, buildMentionLookup, mentionHandle, PROMPT_PLACEHOLDER, type MentionItem } from '../lib/mentions';
import { GenerationTypePicker, type GenerationFamily } from './GenerationTypePicker';

export function GenerationPanel() {
  const doc = useCanvasStore((state) => (state.activeId ? state.docs[state.activeId] : null));
  const selectedId = useCanvasStore((state) => state.selectedId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const run = useCanvasStore((state) => state.run);
  const running = useCanvasStore((state) => state.running);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const addNode = useCanvasStore((state) => state.addNode);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const disconnectNodes = useCanvasStore((state) => state.disconnectNodes);
  const addAsset = useCanvasStore((state) => state.addAsset);
  const assets = useCanvasStore((state) => state.assets);
  const setSelected = useCanvasStore((state) => state.setSelected);
  const reconcilePrompts = useCanvasStore((state) => state.reconcilePrompts);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const fileRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mention, setMention] = useState<{ query: string; start: number; end: number } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const batchSource = 'panel-batch';
  const [durationOpen, setDurationOpen] = useState(false);
  const durationSource = 'panel-duration';

  const node = doc?.nodes.find((item) => item.id === selectedId);
  if (!doc || !node || node.data.kind !== 'model') return null;

  const PROMPT_MAX_HEIGHT = 236;

  useEffect(() => {
    reconcilePrompts();
  }, [node.id, reconcilePrompts]);

  useEffect(() => subscribePopoverOpen(batchSource, () => setBatchOpen(false)), []);
  useLayoutEffect(() => {
    const pending = pendingCaretRef.current;
    if (pending === null) return;
    const field = promptRef.current;
    if (!field) return;
    pendingCaretRef.current = null;
    field.focus();
    field.setSelectionRange(pending, pending);
    syncMirrorScroll(field);
  }, [node.data.prompt]);

  useEffect(() => subscribePopoverOpen(durationSource, () => setDurationOpen(false)), []);

  useEffect(() => {
    if (!durationOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.gen-duration')) return;
      setDurationOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDurationOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [durationOpen]);

  useEffect(() => {
    if (!batchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.gen-number')) return;
      setBatchOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBatchOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [batchOpen]);

  useLayoutEffect(() => {
    const field = promptRef.current;
    if (!field) return;
    const atEnd = field.selectionEnd === field.value.length;
    const scrollTop = field.scrollTop;
    field.style.height = 'auto';
    const next = Math.min(field.scrollHeight, PROMPT_MAX_HEIGHT);
    field.style.height = `${next}px`;
    field.style.overflowY = field.scrollHeight > PROMPT_MAX_HEIGHT ? 'auto' : 'hidden';
    field.scrollTop = atEnd ? field.scrollHeight : scrollTop;
    syncMirrorScroll(field);
  }, [node.data.prompt]);

  const model = (node.data.model ? MODEL_BY_ID[node.data.model] : null) ?? MODELS[0];
  const incoming = doc.edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => doc.nodes.find((item) => item.id === edge.source))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const linkedReferences = incoming
    .filter((item) => item.data.previewUrl || item.data.outputUrl)
    .map((item) => ({
      id: item.id,
      nodeId: item.id,
      label: item.data.label ?? item.data.title,
      url: item.data.previewUrl ?? item.data.outputUrl ?? '',
      kind: item.data.mediaKind ?? item.data.outputKind ?? 'image',
      linked: true,
    }));
  const references = linkedReferences.slice(0, 3);
  const history = node.data.outputHistory ?? [];
  const showingIndex = history.findIndex((item) => item.url === node.data.outputUrl);
  const isVideo = model.family === 'video';
  const resolutions = model.resolutions ?? (isVideo ? ['720p', '1080p'] : ['1k', '2k', '4k']);

  const addReference = async (file?: File) => {
    if (!file) return;
    try {
      const media = await fileToNodeMedia(file);
      const refId = addNode(
        'reference',
        { x: node.position.x - 340, y: node.position.y },
        undefined,
        {
          previewUrl: media.url,
          mediaKind: media.kind,
          title: media.kind === 'video' ? 'Video' : 'Image',
          label: file.name.replace(/\.[^.]+$/, '').slice(0, 22).toUpperCase(),
        },
        false,
      );
      if (refId) {
        onConnect({ source: refId, target: node.id, sourceHandle: null, targetHandle: null });
        addAsset({ url: media.url, kind: media.kind, name: file.name, source: 'upload' });
        setSelected(node.id);
      }
    } catch (error) {
      useCanvasStore.getState().showToast(error instanceof Error ? error.message : String(error));
    }
  };

  const syncMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = /(?:^|\s)@([\p{L}\p{N}_-]*)$/u.exec(before);
    if (!match) {
      setMention(null);
      return;
    }
    setMention({
      query: match[1].toLowerCase(),
      start: caret - match[1].length - 1,
      end: caret,
    });
  };

  const chooseMention = (item: MentionItem) => {
    if (!mention) return;
    const value = promptRef.current?.value ?? node.data.prompt ?? '';
    let sourceId = item.nodeId;
    let tokenLabel = item.label;
    if (item.assetId) {
      tokenLabel = item.label.slice(0, 22).toUpperCase();
      const x = Math.max(40, node.position.x - 340);
      let y = node.position.y;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const occupied = (doc?.nodes ?? []).some(
          (itemNode) => Math.abs(itemNode.position.x - x) < 250 && Math.abs(itemNode.position.y - y) < 190,
        );
        if (!occupied) break;
        y += 210;
      }
      sourceId = addNode(
        'reference',
        { x, y },
        undefined,
        {
          previewUrl: item.url,
          mediaKind: item.kind === 'video' ? 'video' : 'image',
          title: item.kind === 'video' ? 'Video' : 'Image',
          label: tokenLabel,
        },
        false,
      );
    }
    if (sourceId && !item.linked) {
      onConnect({ source: sourceId, target: node.id, sourceHandle: null, targetHandle: null });
    }
    const token = `@${mentionHandle(tokenLabel)} `;
    const next = `${value.slice(0, mention.start)}${token}${value.slice(mention.end)}`;
    updateNodeData(node.id, { prompt: next });
    const caret = mention.start + token.length;
    pendingCaretRef.current = caret;
    setMention(null);
    window.requestAnimationFrame(() => promptRef.current?.focus());
  };

  const switchGenerationFamily = (family: GenerationFamily) => {
    const nextId: typeof model.id = family === 'video' ? 'ltx-video-2b' : 'sd-turbo';
    const nextModel = MODEL_BY_ID[nextId];
    updateNodeData(node.id, {
      model: nextId,
      title: family === 'video' ? 'Video Generation' : 'Image Generation',
      resolution: nextModel?.resolutions?.[0] ?? (family === 'video' ? '720p' : '1k'),
      duration: family === 'video' ? node.data.duration ?? 4 : node.data.duration,
      generateAudio: family === 'video',
      cost: nextModel?.cost ?? node.data.cost,
      outputUrl: undefined,
      outputKind: undefined,
      status: 'idle',
    });
  };

  const mentionGroups = mention ? buildMentionGroups(doc, node.id, assets, mention.query) : [];
  const mentionLookup = buildMentionLookup(doc, node.id, assets);

  return (
    <div className="generation-panel">
      <div className="generation-panel__head">
        <div>
          <h2>
            <GenerationTypePicker
              variant="panel"
              family={isVideo ? 'video' : 'image'}
              label={isVideo ? 'Video generation' : 'Image generation'}
              onChange={switchGenerationFamily}
            />
          </h2>
        </div>
        {node.data.status !== 'idle' && (
          <span className={`node__status node__status--${node.data.status}`}>
            <span className="node__status-dot" />
            {node.data.status}
          </span>
        )}
      </div>

      <div className="generation-panel__scroll">
        <div className="gen-refs">
          <span className="gen-label">References</span>
          <div className="gen-refs__row">
            {references.map((reference, index) => (
              <span className="gen-ref gen-ref--removable" key={reference.id}>
                {reference.kind === 'video' ? (
                  <VideoStill src={reference.url} />
                ) : (
                  <img src={reference.url} alt="Reference" />
                )}
                <button
                  type="button"
                  className="gen-ref__remove"
                  title="Remove reference"
                  aria-label={`Remove reference ${index + 1}`}
                  onClick={() => disconnectNodes(reference.nodeId, node.id)}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            <button className="gen-ref gen-ref--add" onClick={() => fileRef.current?.click()} title="Add a reference node">
              <ImagePlus size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              hidden
              onChange={(event) => {
                void addReference(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="gen-composer">
          <div className="prompt-field prompt-field--panel">
            <PromptMirror value={node.data.prompt ?? ''} lookup={mentionLookup} />
            <textarea
            ref={promptRef}
            className="nowheel"
            value={node.data.prompt ?? ''}
            onChange={(event) => {
              const caret = event.target.selectionStart ?? event.target.value.length;
              updateNodeData(node.id, { prompt: event.target.value });
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
              event.stopPropagation();
              const mod = event.metaKey || event.ctrlKey;
              if (mod && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) redo(true);
                else undo(true);
                return;
              }
              if (mod && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo(true);
                return;
              }
              if (event.key === 'Escape' && mention) {
                event.preventDefault();
                setMention(null);
              }
            }}
            placeholder={PROMPT_PLACEHOLDER}
            rows={4}
            onScroll={syncPromptMirror}
          />
          </div>
          {mention && <MentionMenu groups={mentionGroups} onSelect={chooseMention} />}
        </div>

        <div className="gen-toolbar">
          <ModelPicker
            variant="panel"
            className="gen-model-picker"
            value={(node.data.model ?? 'sd-turbo') as typeof model.id}
            onChange={(next) => {
              const nextModel = MODEL_BY_ID[next];
              const nextResolutions = nextModel?.resolutions ?? (nextModel?.family === 'video' ? ['720p', '1080p'] : ['1k', '2k', '4k']);
              updateNodeData(node.id, {
                model: next,
                title:
                  node.data.title === 'Image Generation' || node.data.title === 'Video Generation'
                    ? nextModel?.family === 'video'
                      ? 'Video Generation'
                      : 'Image Generation'
                    : node.data.title,
                resolution: nextResolutions.includes(node.data.resolution ?? '')
                  ? node.data.resolution
                  : nextResolutions[0],
                outputUrl: undefined,
                outputKind: undefined,
                status: 'idle',
                cost: nextModel?.cost ?? model.cost,
              });
            }}
          />

          <ToolPicker
            className="gen-tool gen-tool--picker"
            label="Resolution"
            value={node.data.resolution ?? (isVideo ? '720p' : '1k')}
            options={resolutions}
            onChange={(next) => updateNodeData(node.id, { resolution: next })}
          />

          <ToolPicker
            className="gen-tool gen-tool--picker"
            label="Aspect ratio"
            value={node.data.aspect ?? '1:1'}
            options={ASPECTS}
            display="aspect"
            onChange={(next) => updateNodeData(node.id, { aspect: next as typeof node.data.aspect })}
          />

          {isVideo && (
            <div className="gen-duration">
              <button
                type="button"
                className={durationOpen ? 'gen-duration__trigger is-open' : 'gen-duration__trigger'}
                title={`Duration: ${node.data.duration ?? 4}s`}
                aria-label={`Duration: ${node.data.duration ?? 4}s`}
                aria-expanded={durationOpen}
                onClick={() => {
                  if (!durationOpen) announcePopover(durationSource);
                  setDurationOpen((value) => !value);
                }}
              >
                <Clock3 size={13} />
                <span>{node.data.duration ?? 4}s</span>
              </button>
              {durationOpen && (
                <div className="gen-duration__menu">
                  <div className="gen-duration__head">
                    <span>Duration</span>
                    <strong>{node.data.duration ?? 4}s</strong>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={15}
                    step={1}
                    value={node.data.duration ?? 4}
                    aria-label="Clip duration in seconds"
                    onChange={(event) => updateNodeData(node.id, { duration: Number(event.target.value) })}
                  />
                  <div className="gen-duration__ticks"><span>2s</span><span>15s</span></div>
                </div>
              )}
            </div>
          )}

          <div className="gen-number">
            <button
              type="button"
              className={batchOpen ? 'gen-number__trigger is-open' : 'gen-number__trigger'}
              title="Number of Generations"
              aria-label={`Number of Generations: ${node.data.batch ?? 1}`}
              aria-expanded={batchOpen}
              onClick={() => {
                if (!batchOpen) announcePopover(batchSource);
                setBatchOpen((value) => !value);
              }}
            >
              <Layers size={11} />
              <span>{node.data.batch ?? 1}</span>
            </button>
            {batchOpen && (
              <div className="gen-number__menu">
                <span className="gen-number__title">Number of Generations</span>
                <div className="gen-number__cells" role="radiogroup" aria-label="Number of Generations">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      role="radio"
                      aria-checked={(node.data.batch ?? 1) === count}
                      aria-label={`${count} generation${count === 1 ? '' : 's'}`}
                      className={(node.data.batch ?? 1) === count ? 'is-active' : ''}
                      onClick={() => updateNodeData(node.id, { batch: count })}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <button className="gen-advanced" onClick={() => setAdvancedOpen((value) => !value)}>
          <Settings2 size={13} /> Advanced settings
          <span>{advancedOpen ? '−' : '+'}</span>
        </button>

        {advancedOpen && (
          <div className="gen-grid">
            <label className="gen-field">
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
            {!isVideo && references.length > 0 && (
              <label className="gen-field">
                <span>Variation</span>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={node.data.strength ?? 0.55}
                  onChange={(event) => updateNodeData(node.id, { strength: Number(event.target.value) })}
                />
                <small>{(node.data.strength ?? 0.55).toFixed(2)} · higher moves further from the reference</small>
              </label>
            )}
          </div>
        )}


        {history.length > 0 && (
          <div className="gen-history">
            <span className="gen-label">
              History
              {showingIndex >= 0 && (
                <em className="gen-history__now">
                  showing render {history.length - showingIndex} of {history.length}
                  {node.data.outputSeed != null ? ` · seed ${node.data.outputSeed}` : ''}
                </em>
              )}
            </span>
            <div className="gen-history__row">
              {history.map((item, index) => {
                const showing = item.url === node.data.outputUrl;
                return (
                  <button
                    key={item.url}
                    className={`gen-history__item${showing ? ' gen-history__item--active' : ''}`}
                    aria-pressed={showing}
                    title={`${showing ? `Render ${history.length - index}, showing now` : `Show render ${history.length - index}`}${item.seed != null ? ` · seed ${item.seed}` : ''}`}
                    onClick={() =>
                      updateNodeData(node.id, {
                        outputUrl: item.url,
                        outputKind: item.kind,
                        outputSeed: item.seed,
                        status: 'done',
                      })
                    }
                  >
                    {item.kind === 'video' ? (
                      <video src={item.url} muted loop playsInline />
                    ) : (
                      <img src={item.url} alt="" />
                    )}
                    <span>{history.length - index}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {node.data.outputUrl && (
          <div className="gen-output">
            {node.data.outputKind === 'video' ? (
              <video src={node.data.outputUrl} controls autoPlay muted loop playsInline />
            ) : (
              <img src={node.data.outputUrl} alt="Current render" />
            )}
            <div className="gen-output__bar">
              <span>{model.runtime === 'api' ? 'API output' : 'ComfyUI output'}</span>
              <a href={node.data.outputUrl} download={`open-source-canvas-${node.id}.${node.data.outputKind === 'video' ? 'mp4' : 'png'}`}>
                Download
              </a>
            </div>
          </div>
        )}

      </div>

      <div className="generation-panel__actions">
        <button
          className="button button--lime button--full button--large gen-generate"
          onClick={() => void run('selected')}
          disabled={running}
        >
          {running ? <LoaderCircle size={15} className="spin" /> : <Wand2 size={15} />}
          {running ? 'Rendering…' : node.data.status === 'error' ? 'Retry' : 'Generate'}
          {!running && <span className="gen-cost"><Sparkles size={11} /> {model.cost}</span>}
        </button>
      </div>

      <div className="generation-panel__foot">
        <button className="button button--ghost button--small" onClick={() => duplicateNode(node.id)}>
          <Copy size={13} /> Duplicate
        </button>
        <button className="button button--ghost button--small button--danger" onClick={() => deleteNode(node.id)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

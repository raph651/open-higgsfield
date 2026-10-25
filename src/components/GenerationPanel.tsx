import { useEffect, useRef, useState } from 'react';
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
  Volume2,
  X,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { ASPECTS, MODELS, MODEL_BY_ID } from '../data';
import { useCanvasStore } from '../store/useCanvasStore';
import { fileToNodeMedia } from '../lib/media';
import { VideoStill } from './VideoStill';
import { ModelPicker } from './ModelPicker';
import { MentionMenu } from './MentionMenu';
import { buildMentionGroups, type MentionItem } from '../lib/mentions';
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
  const fileRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mention, setMention] = useState<{ query: string; start: number; end: number } | null>(null);

  const node = doc?.nodes.find((item) => item.id === selectedId);
  if (!doc || !node || node.data.kind !== 'model') return null;

  const PROMPT_MAX_HEIGHT = 236;

  useEffect(() => {
    const field = promptRef.current;
    if (!field) return;
    field.style.height = 'auto';
    const next = Math.min(field.scrollHeight, PROMPT_MAX_HEIGHT);
    field.style.height = `${next}px`;
    field.style.overflowY = field.scrollHeight > PROMPT_MAX_HEIGHT ? 'auto' : 'hidden';
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
    if (item.assetId) {
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
          label: item.label.slice(0, 22).toUpperCase(),
        },
        false,
      );
    }
    if (sourceId && !item.linked) {
      onConnect({ source: sourceId, target: node.id, sourceHandle: null, targetHandle: null });
    }
    const handle = item.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reference';
    const token = `@${handle} `;
    const next = `${value.slice(0, mention.start)}${token}${value.slice(mention.end)}`;
    updateNodeData(node.id, { prompt: next });
    const caret = mention.start + token.length;
    setMention(null);
    window.requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(caret, caret);
    });
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
                  <X size={10} />
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
              if (event.key === 'Escape' && mention) {
                event.stopPropagation();
                setMention(null);
              }
            }}
            placeholder={isVideo ? 'Describe the motion, camera and performance…' : 'Describe what you want to create…'}
            rows={4}
          />
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

          <label className="gen-tool" title="Resolution">
            <select
              value={node.data.resolution ?? (isVideo ? '720p' : '1k')}
              aria-label="Resolution"
              onChange={(event) => updateNodeData(node.id, { resolution: event.target.value })}
            >
              {resolutions.map((resolution) => (
                <option key={resolution} value={resolution}>{resolution}</option>
              ))}
            </select>
            <ChevronDown size={10} className="gen-tool__chevron" />
          </label>

          <label className="gen-tool" title="Aspect ratio">
            <select
              value={node.data.aspect ?? '1:1'}
              aria-label="Aspect ratio"
              onChange={(event) => updateNodeData(node.id, { aspect: event.target.value as typeof node.data.aspect })}
            >
              {ASPECTS.map((aspect) => (
                <option key={aspect} value={aspect}>{aspect}</option>
              ))}
            </select>
            <ChevronDown size={10} className="gen-tool__chevron" />
          </label>

          {isVideo && (
            <label className="gen-tool gen-tool--icon" title="Duration">
              <Clock3 size={11} />
              <select
                value={node.data.duration ?? 4}
                aria-label="Duration"
                onChange={(event) => updateNodeData(node.id, { duration: Number(event.target.value) })}
              >
                {Array.from({ length: 14 }, (_, index) => index + 2).map((seconds) => (
                  <option key={seconds} value={seconds}>{seconds}s</option>
                ))}
              </select>
            </label>
          )}

          <label className="gen-tool gen-tool--icon" title="Batch size">
            <Layers size={11} />
            <select
              value={node.data.batch ?? 1}
              aria-label="Batch size"
              onChange={(event) => updateNodeData(node.id, { batch: Number(event.target.value) })}
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>{count}/4</option>
              ))}
            </select>
          </label>

          {isVideo && (
            <button
              type="button"
              className={node.data.generateAudio ? 'gen-tool gen-tool--audio is-on' : 'gen-tool gen-tool--audio'}
              role="switch"
              aria-checked={node.data.generateAudio ?? false}
              aria-label="Generate audio"
              title="Generate audio"
              onClick={() => updateNodeData(node.id, { generateAudio: !(node.data.generateAudio ?? false) })}
            >
              {node.data.generateAudio ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
          )}
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
                value={node.data.seed ?? 0}
                onChange={(event) => updateNodeData(node.id, { seed: Number(event.target.value) })}
              />
            </label>

          </div>
        )}


        {history.length > 0 && (
          <div className="gen-history">
            <span className="gen-label">History</span>
            <div className="gen-history__row">
              {history.map((item, index) => (
                <button
                  key={`${item.url}-${index}`}
                  className="gen-history__item"
                  title="Restore this render"
                  onClick={() =>
                    updateNodeData(node.id, {
                      outputUrl: item.url,
                      outputKind: item.kind,
                      status: 'done',
                    })
                  }
                >
                  {item.kind === 'video' ? (
                    <video src={item.url} muted loop playsInline />
                  ) : (
                    <img src={item.url} alt="" />
                  )}
                  <span>{index + 1}</span>
                </button>
              ))}
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
              <a href={node.data.outputUrl} download={`framegraph-${node.id}.${node.data.outputKind === 'video' ? 'mp4' : 'png'}`}>
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

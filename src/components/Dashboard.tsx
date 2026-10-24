import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  Copy,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { MODELS, TEMPLATES } from '../data';
import { useCanvasStore } from '../store/useCanvasStore';
import { relativeTime } from '../lib/format';
import { Artwork } from './Artwork';
import { HeroGraph } from './HeroGraph';
import { SideRail } from './SideRail';
import { ProviderBadge } from './ProviderBadge';

export function Dashboard() {
  const docs = useCanvasStore((state) => state.docs);
  const order = useCanvasStore((state) => state.order);
  const tab = useCanvasStore((state) => state.tab);
  const setTab = useCanvasStore((state) => state.setTab);
  const createCanvas = useCanvasStore((state) => state.createCanvas);
  const addNode = useCanvasStore((state) => state.addNode);
  const openCanvas = useCanvasStore((state) => state.openCanvas);
  const duplicateCanvas = useCanvasStore((state) => state.duplicateCanvas);
  const deleteCanvas = useCanvasStore((state) => state.deleteCanvas);
  const customTemplates = useCanvasStore((state) => state.templates);
  const deleteTemplate = useCanvasStore((state) => state.deleteTemplate);
  const credits = useCanvasStore((state) => state.credits);
  const showToast = useCanvasStore((state) => state.showToast);
  const [query, setQuery] = useState('');
  const [modelsOpen, setModelsOpen] = useState(false);

  const savedCanvases = useMemo(
    () =>
      order
        .map((id) => docs[id])
        .filter(Boolean)
        .filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase())),
    [docs, order, query],
  );

  const libraryTemplates = useMemo(
    () => [
      ...customTemplates.map((template) => ({ ...template, custom: true as const })),
      ...TEMPLATES.map((template) => ({ ...template, custom: false as const, previewUrl: undefined, previewKind: undefined })),
    ],
    [customTemplates],
  );

  const filteredTemplates = useMemo(
    () =>
      libraryTemplates.filter((template) =>
        `${template.name} ${template.description} ${template.tag}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [libraryTemplates, query],
  );

  return (
    <div className="studio">
      <SideRail onModels={() => setModelsOpen(true)} />

      <div className="studio__main">
        <header className="studio-bar">
          <div className="studio-bar__crumbs">
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>{tab === 'canvases' ? 'Studio' : 'Templates'}</strong>
          </div>
          <div className="studio-bar__actions">
            <span className="credit-pill">
              <Sparkles size={13} />
              {credits}
            </span>
            <ProviderBadge />
            <button className="button button--lime button--small" onClick={() => createCanvas()}>
              <Plus size={14} />
              New canvas
            </button>
            <button className="avatar" aria-label="Account" onClick={() => showToast('Local profile')}>
              AR
            </button>
          </div>
        </header>

        <div className="studio__scroll">
          <section className="hero">
            <div className="hero__wash" aria-hidden="true" />
            <div className="hero__copy">
              <span className="eyebrow">THE OPEN CANVAS WORKSPACE</span>
              <h1>
                The graph
                <br />
                is the <em>studio.</em>
              </h1>
              <p>
                Compose prompts, references and models on one infinite board. Run a single node or
                the whole pipeline. Every output stays attached to the idea that made it.
              </p>
              <div className="hero__actions">
                <button className="button button--lime button--large" onClick={() => createCanvas()}>
                  Start a canvas
                  <ArrowRight size={16} />
                </button>
                <button className="button button--ghost button--large" onClick={() => setTab('templates')}>
                  Browse templates
                </button>
              </div>
              <div className="hero__stats">
                <span><strong>{MODELS.length}</strong> model adapters</span>
                <span><strong>{credits}</strong> demo credits</span>
                <span><strong>0</strong> vendor lock-in</span>
              </div>
            </div>
            <div className="hero__demo">
              <HeroGraph onOpen={() => createCanvas('product-film')} />
            </div>
          </section>

          <section className="library">
            <div className="library__head">
              <div className="library__tabs" role="tablist" aria-label="Library">
                <button
                  role="tab"
                  aria-selected={tab === 'canvases'}
                  className={tab === 'canvases' ? 'tab tab--active' : 'tab'}
                  onClick={() => setTab('canvases')}
                >
                  All canvases <span className="tab__count">{order.length}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={tab === 'templates'}
                  className={tab === 'templates' ? 'tab tab--active' : 'tab'}
                  onClick={() => setTab('templates')}
                >
                  Templates
                  <span className="badge badge--lime">Quick start</span>
                </button>
              </div>
              <label className="search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tab === 'canvases' ? 'Search canvases' : 'Search templates'}
                  aria-label="Search library"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Clear search">
                    <X size={13} />
                  </button>
                )}
              </label>
            </div>

            {tab === 'canvases' ? (
              <div className="card-grid">
                <button className="new-card" onClick={() => createCanvas()}>
                  <span className="new-card__plus"><Plus size={20} /></span>
                  <span>
                    <strong>Create new canvas</strong>
                    <small>Blank board · start from a prompt</small>
                  </span>
                </button>
                {savedCanvases.map((doc) => {
                  const canvasModel = doc.nodes.find((node) => node.data.kind === 'model');
                  const output = doc.nodes.find((node) => node.data.outputUrl);
                  return (
                    <article key={doc.id} className="canvas-card">
                      <button className="canvas-card__open" onClick={() => openCanvas(doc.id)}>
                        <div className="canvas-card__art">
                          {output?.data.outputUrl ? (
                            output.data.outputKind === 'video' ? (
                              <video src={output.data.outputUrl} autoPlay muted loop playsInline />
                            ) : (
                              <img src={output.data.outputUrl} alt="" />
                            )
                          ) : (
                            <Artwork seed={doc.title} alt="" />
                          )}
                          <span className="canvas-card__nodes">
                            <Layers size={12} />
                            {doc.nodes.length} nodes
                          </span>
                          <span className="canvas-card__go"><ArrowUpRight size={15} /></span>
                        </div>
                        <div className="canvas-card__body">
                          <div>
                            <strong>{doc.title}</strong>
                            <small>
                              {canvasModel ? `${canvasModel.data.title} · ` : ''}
                              Edited {relativeTime(doc.updatedAt)}
                            </small>
                          </div>
                        </div>
                      </button>
                      <div className="canvas-card__menu">
                        <button
                          onClick={() => duplicateCanvas(doc.id)}
                          title="Duplicate canvas"
                          aria-label="Duplicate canvas"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => deleteCanvas(doc.id)}
                          title="Delete canvas"
                          aria-label="Delete canvas"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {savedCanvases.length === 0 && (
                  <div className="empty-card">
                    <Boxes size={20} />
                    <strong>No canvases match “{query}”</strong>
                    <span>Try another search or start a blank board.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="template-grid">
                {filteredTemplates.map((template) => (
                  <article key={template.id} className="template-card">
                    <button className="template-card__open" onClick={() => createCanvas(template.id)}>
                      <div className="template-card__art">
                        {template.previewUrl ? (
                          template.previewKind === 'video' ? (
                            <video src={template.previewUrl} autoPlay muted loop playsInline />
                          ) : (
                            <img src={template.previewUrl} alt="" />
                          )
                        ) : (
                          <Artwork seed={template.previewSeed} alt="" />
                        )}
                        <span className="template-card__tag" style={{ color: template.accent }}>
                          {template.tag}
                        </span>
                        <span className="template-card__use">
                          Use template <ArrowUpRight size={13} />
                        </span>
                      </div>
                      <div className="template-card__body">
                        <strong>{template.name}</strong>
                        <p>{template.description}</p>
                        <span className="template-card__meta">
                          <Layers size={12} />
                          {template.nodeCount} nodes
                          <span className="dot-sep" />
                          {template.id === 'motion-study' ? '2 parallel branches' : 'linear pipeline'}
                        </span>
                      </div>
                    </button>
                    {template.custom && (
                      <button
                        className="template-card__delete"
                        onPointerUp={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteTemplate(template.id);
                        }}
                        title="Delete template"
                        aria-label="Delete template"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </article>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="empty-card">
                    <Layers size={20} />
                    <strong>No templates match “{query}”</strong>
                    <span>Try “product”, “motion”, or “character”.</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {modelsOpen && (
        <div className="modal-backdrop" onClick={() => setModelsOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__head">
              <div>
                <span className="eyebrow">ADAPTER LIBRARY</span>
                <h2>Models, without the lock-in.</h2>
              </div>
              <button className="icon-button" onClick={() => setModelsOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="modal__lede">
              Local models run through ComfyUI. API models are named seats for the real providers:
              seed the wrapper now, attach keys through a proxy later, keep the same graph.
            </p>
            <div className="model-grid">
              {MODELS.map((model) => (
                <div className="model-card" key={model.id}>
                  <span className="model-card__swatch" style={{ background: model.accent }} />
                  <div className="model-card__top">
                    <strong>{model.name}</strong>
                    <span className="badge">{model.runtime === 'api' ? 'API' : 'local'}</span>
                  </div>
                  <p>{model.blurb}</p>
                  <div className="model-card__foot">
                    <span>{model.cost} credits / render</span>
                    <button
                      className="button button--ghost button--small"
                      onClick={() => {
                        createCanvas();
                        addNode('model', undefined, model.id);
                        setModelsOpen(false);
                        showToast(
                          model.runtime === 'api'
                            ? `${model.name} added — API wrapper required before it can run`
                            : `${model.name} added to a new canvas`,
                        );
                      }}
                    >
                      Use model
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal__foot">
              <span><Check size={13} /> Same graph schema for every provider</span>
              <span className="mono">src/lib/providers.ts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

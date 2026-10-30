import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  Clapperboard,
  Copy,
  Cpu,
  Layers,
  LayoutGrid,
  Plus,
  Search,
  Server,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { LISTED_MODELS, TEMPLATES } from '../data';
import type { ModelId } from '../types';
import { useCanvasStore } from '../store/useCanvasStore';
import { relativeTime } from '../lib/format';
import { Artwork } from './Artwork';
import { ProviderBadge } from './ProviderBadge';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { label: 'Canvases', badge: '' },
  { label: 'Models', badge: 'New' },
];

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
  const cleanupCanvases = useCanvasStore((state) => state.cleanupCanvases);
  const customTemplates = useCanvasStore((state) => state.templates);
  const deleteTemplate = useCanvasStore((state) => state.deleteTemplate);
  const showToast = useCanvasStore((state) => state.showToast);
  const [query, setQuery] = useState('');
  const [modelsOpen, setModelsOpen] = useState(false);
  const libraryRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const savedCanvases = useMemo(() => {
    let seenObjectsSwap = false;
    let seenMarketing = false;
    let seenRecreate = false;
    return order
      .map((id) => docs[id])
      .filter(Boolean)
      .filter((doc) => !doc.pageParentId)
      .filter((doc) => {
        if (
          doc.title !== 'Music Video' &&
          doc.title !== 'FrameJutsu' &&
          doc.title !== 'Objects Swap' &&
          doc.title !== 'Marketing Studio' &&
          doc.title !== 'Recreate'
        )
          return true;
        if (doc.title === 'Recreate') {
          if (seenRecreate) return false;
          seenRecreate = true;
          return true;
        }
        if (doc.title === 'Marketing Studio') {
          if (seenMarketing) return false;
          seenMarketing = true;
          return true;
        }
        if (seenObjectsSwap) return false;
        seenObjectsSwap = true;
        return true;
      })
      .filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const rank = (title: string) =>
          title === 'Music Video' || title === 'FrameJutsu' ? 0 : title === 'Marketing Studio' ? 1 : title === 'Recreate' ? 2 : 3;
        return rank(a.title) - rank(b.title);
      });
  }, [docs, order, query]);

  const libraryTemplates = useMemo(
    () => [
      ...customTemplates.map((template) => ({ ...template, custom: true as const })),
      ...TEMPLATES.filter(
        (template) =>
          template.id !== 'objects-swap' &&
          template.id !== 'marketing-studio' &&
          template.id !== 'recreate',
      ).map((template) => ({
        ...template,
        custom: false as const,
      })),
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

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.home-search-wrap')) return;
      setSearchOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [searchOpen]);

  const searchActive = searchOpen && query.trim().length > 0;

  const objectsSwap = TEMPLATES.find((template) => template.id === 'objects-swap');
  const marketingStudio = TEMPLATES.find((template) => template.id === 'marketing-studio');
  const recreate = TEMPLATES.find((template) => template.id === 'recreate');
  const otherTemplates = TEMPLATES.filter(
    (template) =>
      template.id !== 'objects-swap' && template.id !== 'marketing-studio' && template.id !== 'recreate',
  );
  const showcase = [objectsSwap, marketingStudio, recreate, ...otherTemplates]
    .slice(0, 3)
    .filter((template): template is NonNullable<typeof template> => Boolean(template));

  const scrollToLibrary = (nextTab?: 'canvases' | 'templates') => {
    if (nextTab) setTab(nextTab);
    window.setTimeout(() => libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  const launchModel = (modelId?: ModelId) => {
    createCanvas();
    if (modelId) addNode('model', undefined, modelId);
  };

  const onNav = (label: string) => {
    if (label === 'Explore') {
      document.querySelector('.home')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (label === 'Canvases') return scrollToLibrary('canvases');
    if (label === 'Templates') return scrollToLibrary('templates');
    if (label === 'Models') return setModelsOpen(true);
  };

  const featureCards = [
    {
      icon: LayoutGrid,
      title: 'Canvas Engine',
      badge: 'New',
      description: 'One graph for every model, reference and output.',
      action: () => createCanvas(),
    },
    {
      icon: Clapperboard,
      title: 'Seedance 2.5',
      badge: 'Video',
      description: 'The most advanced video model on the canvas.',
      action: () => launchModel('seedance-2.5'),
    },
    {
      icon: Cpu,
      title: 'Supercomputer',
      badge: '',
      description: 'Local ComfyUI and API routing in one runtime.',
      action: () => showToast('Runtime is configured from the ComfyUI badge in the canvas.'),
    },
    {
      icon: Boxes,
      title: 'Kling 4.0',
      badge: '',
      description: 'Now available through the model adapter.',
      action: () => setModelsOpen(true),
    },
    {
      icon: Wand2,
      title: 'MCP for Claude',
      badge: '',
      description: 'Generate images and video inside Claude.',
      action: () => showToast('MCP endpoint is not connected in this local build.'),
    },
    {
      icon: UserRound,
      title: 'AI Influencer',
      badge: '',
      description: 'Build a synthetic talent from a single reference.',
      action: () => createCanvas('character-loop'),
    },
  ];

  return (
    <div className="home">
      <header className="home-nav">
        <button className="home-brand" onClick={() => document.querySelector('.home')?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="home-brand__mark"><span /><span /><span /></span>
          <span>Open Source Canvas</span>
        </button>
        <nav className="home-nav__links">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} className="home-nav__link" onClick={() => onNav(item.label)}>
              {item.label}
              {item.badge && <span className="home-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="home-nav__right">
          <div className="home-search-wrap" ref={searchRef}>
            <label className="home-search">
              <Search size={14} />
              <input
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search"
                aria-label="Search canvases and templates"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear search"><X size={12} /></button>
              )}
            </label>
            {searchActive && (
              <div className="home-search-results">
                {savedCanvases.length > 0 && (
                  <span className="home-search-results__label">Canvases</span>
                )}
                {savedCanvases.slice(0, 4).map((doc) => (
                  <button
                    key={doc.id}
                    className="home-search-result"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery('');
                      openCanvas(doc.id);
                    }}
                  >
                    <span className="home-search-result__icon"><Layers size={13} /></span>
                    <span>
                      <strong>{doc.title}</strong>
                      <small>{doc.nodes.length} nodes · edited {relativeTime(doc.updatedAt)}</small>
                    </span>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
                {filteredTemplates.length > 0 && (
                  <span className="home-search-results__label">Templates</span>
                )}
                {filteredTemplates.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    className="home-search-result"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery('');
                      createCanvas(template.id);
                    }}
                  >
                    <span className="home-search-result__icon"><LayoutGrid size={13} /></span>
                    <span>
                      <strong>{template.name}</strong>
                      <small>{template.tag} · {template.nodeCount} nodes</small>
                    </span>
                    <ArrowRight size={13} />
                  </button>
                ))}
                {!savedCanvases.length && !filteredTemplates.length && (
                  <div className="home-search-empty">
                    <Search size={15} /> No results for “{query}”
                  </div>
                )}
                {(savedCanvases.length > 4 || filteredTemplates.length > 4) && (
                  <button
                    className="home-search-all"
                    onClick={() => {
                      setSearchOpen(false);
                      scrollToLibrary(tab);
                    }}
                  >
                    View all results <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
          <ProviderBadge />
          <ThemeToggle />
          <button className="home-new" onClick={() => createCanvas()}><Plus size={14} /> New canvas</button>
          <button className="avatar" aria-label="Account" onClick={() => showToast('Local profile')}>AR</button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-showcase" aria-label="Featured workflows">
          {showcase.map((template, index) => (
            <button className="home-showcase__card" key={template.id} onClick={() => createCanvas(template.id)}>
              <div className="home-showcase__art">
                {template.previewUrl ? (
                  template.previewKind === 'video' ? (
                    <video src={template.previewUrl} poster={template.previewPoster} autoPlay muted loop playsInline />
                  ) : (
                    <img src={template.previewUrl} alt="" />
                  )
                ) : (
                  <Artwork seed={template.previewSeed} variant={index} alt="" />
                )}
                <span className="home-showcase__tag" style={{ color: template.accent }}>{template.tag}</span>
                <span className="home-showcase__go"><ArrowUpRight size={15} /></span>
              </div>
              <div className="home-showcase__copy">
                <strong>{template.name}</strong>
                <p>{template.description}</p>
              </div>
            </button>
          ))}
        </section>

        <section className="home-features" aria-label="What's new">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <button className="home-feature" key={feature.title} onClick={feature.action}>
                <span className="home-feature__icon"><Icon size={17} strokeWidth={1.6} /></span>
                <span className="home-feature__copy">
                  <strong>{feature.title} {feature.badge && <em>{feature.badge}</em>}</strong>
                  <small>{feature.description}</small>
                </span>
                <ArrowUpRight className="home-feature__arrow" size={14} />
              </button>
            );
          })}
        </section>

        <section className="home-library" ref={libraryRef}>
          <header className="home-library__head">
            <div>
              <span className="home-kicker">Your studio</span>
              <h2>Pick up where you left off</h2>
            </div>
            <div className="home-library__tools">
              <button
                className="home-cleanup"
                onClick={() => {
                  if (window.confirm('Remove empty canvases and duplicate-title canvases? The newest copy of each title is kept.')) {
                    cleanupCanvases();
                  }
                }}
                title="Remove empty and duplicate canvases"
              >
                <Trash2 size={12} /> Clean up
              </button>
              <div className="home-library__tabs" role="tablist" aria-label="Library">
                <button role="tab" aria-selected={tab === 'canvases'} className={tab === 'canvases' ? 'home-tab is-active' : 'home-tab'} onClick={() => setTab('canvases')}>
                  Canvases <span>{savedCanvases.length}</span>
                </button>
                <button role="tab" aria-selected={tab === 'templates'} className={tab === 'templates' ? 'home-tab is-active' : 'home-tab'} onClick={() => setTab('templates')}>
                  Templates <span>{libraryTemplates.length}</span>
                </button>
              </div>
            </div>
          </header>

          {tab === 'canvases' ? (
            <div className="card-grid">
              <button className="new-card" onClick={() => createCanvas()}>
                <span className="new-card__plus"><Plus size={20} /></span>
                <span><strong>Create new canvas</strong><small>Blank board · start from a prompt</small></span>
              </button>
              {savedCanvases.map((doc) => {
                // the model that made the shown output, else the first model node
                const canvasModel = doc.nodes.find((node) => node.data.kind === 'model' && node.data.outputUrl) ?? doc.nodes.find((node) => node.data.kind === 'model');
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
                        <span className="canvas-card__nodes"><Layers size={12} /> {doc.nodes.length} nodes</span>
                        <span className="canvas-card__go"><ArrowUpRight size={15} /></span>
                      </div>
                      <div className="canvas-card__body">
                        <div>
                          <strong>{doc.title}</strong>
                          <small>{canvasModel ? `${canvasModel.data.title} · ` : ''}Edited {relativeTime(doc.updatedAt)}</small>
                        </div>
                      </div>
                    </button>
                    <div className="canvas-card__menu">
                      <button onClick={() => duplicateCanvas(doc.id)} title="Duplicate canvas" aria-label="Duplicate canvas"><Copy size={13} /></button>
                      <button onClick={() => deleteCanvas(doc.id)} title="Delete canvas" aria-label="Delete canvas"><Trash2 size={13} /></button>
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
                          <video src={template.previewUrl} poster={template.previewPoster} autoPlay muted loop playsInline />
                        ) : (
                          <img src={template.previewUrl} alt="" />
                        )
                      ) : (
                        <Artwork seed={template.previewSeed} alt="" />
                      )}
                      <span className="template-card__tag" style={{ color: template.accent }}>{template.tag}</span>
                      <span className="template-card__use">Use template <ArrowUpRight size={13} /></span>
                    </div>
                    <div className="template-card__body">
                      <strong>{template.name}</strong>
                      <p>{template.description}</p>
                      <span className="template-card__meta"><Layers size={12} /> {template.nodeCount} nodes</span>
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

        <section className="home-final">
          <span className="home-kicker">The newest</span>
          <h2>Open Source <em>Canvas</em> 1.0</h2>
          <p>Every model, every reference, one infinite board.</p>
          <button className="home-lime" onClick={() => createCanvas()}>Start creating <ArrowRight size={15} /></button>
        </section>
      </main>

      {modelsOpen && (
        <div className="modal-backdrop" onClick={() => setModelsOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__head">
              <div><span className="eyebrow">ADAPTER LIBRARY</span><h2>Models, without the lock-in.</h2></div>
              <button className="icon-button" onClick={() => setModelsOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <p className="modal__lede">
              Local models run through ComfyUI. API models are named seats for the real providers:
              seed the wrapper now, attach keys through a proxy later, keep the same graph.
            </p>
            <div className="model-grid">
              {LISTED_MODELS.map((model) => (
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
                        showToast(model.runtime === 'api' ? `${model.name} added — API wrapper required before it can run` : `${model.name} added to a new canvas`);
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

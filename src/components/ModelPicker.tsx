import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  Clapperboard,
  Image as ImageIcon,
  Search,
} from 'lucide-react';
import { MODEL_BY_ID, LISTED_MODELS } from '../data';
import type { ModelId } from '../types';
import { STATIC_DEMO } from '../lib/staticDemo';
import { useSettingsStore } from '../store/useSettingsStore';

interface ModelPickerProps {
  value: ModelId;
  onChange: (id: ModelId) => void;
  variant?: 'node' | 'panel';
  className?: string;
}

export function ModelPicker({ value, onChange, variant = 'panel', className = '' }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [anchor, setAnchor] = useState<{ left: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const model = MODEL_BY_ID[value] ?? LISTED_MODELS[0];
  const installed = useSettingsStore((state) => state.installed);
  const openInstall = useSettingsStore((state) => state.openInstall);
  // Local models that need files stay in the list, but until ComfyUI can see them they open the install steps instead.
  const needsInstall = (id: ModelId) => !STATIC_DEMO && Boolean(MODEL_BY_ID[id]?.install) && installed[id] === false;

  // An image node only offers image models and a video node only video models (the Image/Video switch changes family).
  const family = model.family;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = LISTED_MODELS.filter((item) => item.family === family);
    if (!q) return pool;
    return pool.filter((item) =>
      `${item.name} ${item.blurb} ${item.family} ${item.runtime}`.toLowerCase().includes(q),
    );
  }, [query, family]);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(324, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const openUp = rect.bottom > window.innerHeight * 0.55;
    if (openUp) {
      setAnchor({
        left,
        bottom: window.innerHeight - rect.top + 8,
        maxHeight: Math.min(390, rect.top - 20),
      });
    } else {
      setAnchor({
        left,
        top: rect.bottom + 8,
        maxHeight: Math.min(390, window.innerHeight - rect.bottom - 20),
      });
    }
    setQuery('');
    setHighlight(0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.model-menu') || target.closest('.model-picker__trigger')) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const pick = (id: ModelId) => {
    setOpen(false);
    if (needsInstall(id)) {
      openInstall(id);
      return;
    }
    onChange(id);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((current) => Math.min(results.length - 1, current + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[highlight];
      if (item) pick(item.id);
    }
  };

  return (
    <div className={`model-picker model-picker--${variant} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="model-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span
          className="model-picker__glyph"
          style={{ color: model.accent, background: `${model.accent}1f` }}
          aria-hidden="true"
        >
          {model.family === 'video' ? <Clapperboard size={11} /> : <ImageIcon size={11} />}
        </span>
        <span className="model-picker__name">{model.name}</span>
        <ChevronDown size={10} />
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={menuRef}
            className="model-menu"
            style={{ left: anchor.left, top: anchor.top, bottom: anchor.bottom, width: 324, maxHeight: anchor.maxHeight }}
            role="listbox"
            aria-label="Select a model"
            onKeyDown={onKeyDown}
          >
            <div className="model-menu__search">
              <Search size={14} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search models…"
              />
            </div>
            <div className="model-menu__label">
              {query.trim() ? 'Results' : 'Featured models'}
            </div>
            <div className="model-menu__list">
              {results.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={item.id === value}
                  className={`model-menu__item ${index === highlight ? 'is-highlighted' : ''} ${item.id === value ? 'is-selected' : ''} ${needsInstall(item.id) ? 'is-uninstalled' : ''}`}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(item.id)}
                >
                  <span
                    className="model-menu__glyph"
                    style={{ color: item.accent, background: `${item.accent}1a` }}
                  >
                    {item.family === 'video' ? <Clapperboard size={15} /> : <ImageIcon size={15} />}
                  </span>
                  <span className="model-menu__copy">
                    <span className="model-menu__title">
                      {item.name}
                      {item.runtime === 'api' && <span className="model-menu__badge">API</span>}
                      {needsInstall(item.id) && <span className="model-menu__badge model-menu__badge--install">INSTALL</span>}
                    </span>
                    <span className="model-menu__desc">{item.blurb}</span>
                  </span>
                  {item.id === value && <Check size={13} className="model-menu__check" />}
                </button>
              ))}
              {results.length === 0 && (
                <div className="model-menu__empty">No models match “{query}”</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

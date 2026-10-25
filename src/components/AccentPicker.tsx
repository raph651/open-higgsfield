import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { ACCENTS } from '../lib/theme';
import { useSettingsStore } from '../store/useSettingsStore';

export function AccentPicker() {
  const accent = useSettingsStore((state) => state.accent);
  const setAccent = useSettingsStore((state) => state.setAccent);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.accent-picker')) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="accent-picker" ref={ref}>
      <button
        className={open ? 'canvas-icon is-active' : 'canvas-icon'}
        onClick={() => setOpen((value) => !value)}
        title="Accent color"
        aria-label="Accent color"
        aria-expanded={open}
      >
        <Palette size={16} />
      </button>
      {open && (
        <div className="accent-popover" role="menu" aria-label="Accent color">
          <span className="accent-popover__title">Accent color</span>
          <div className="accent-grid">
            {ACCENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={item.id === accent}
                className={item.id === accent ? 'accent-option is-selected' : 'accent-option'}
                onClick={() => {
                  setAccent(item.id);
                  setOpen(false);
                }}
              >
                <span className="accent-option__dot" style={{ background: item.color }} />
                <span>{item.label}</span>
                {item.id === accent && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

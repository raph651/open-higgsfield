import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { announcePopover, subscribePopoverOpen } from '../lib/popoverBus';

interface ToolPickerProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  className?: string;
  variant?: 'panel' | 'node';
  display?: 'list' | 'aspect';
}

export function ToolPicker({
  label,
  value,
  options,
  onChange,
  className = '',
  variant = 'panel',
  display = 'list',
}: ToolPickerProps) {
  const source = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = display === 'aspect' ? 252 : 172;
    const estimatedHeight = display === 'aspect' ? 220 : 210;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top = below + estimatedHeight > window.innerHeight - 8
      ? Math.max(8, rect.top - estimatedHeight - 8)
      : below;
    setPosition({ left, top, width });
  }, [open, display]);

  useEffect(() => subscribePopoverOpen(source, () => setOpen(false)), [source]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        (event.target.closest('.tool-picker') || event.target.closest('.tool-picker__menu'))
      ) {
        return;
      }
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
    <div className={`tool-picker tool-picker--${variant} ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tool-picker__trigger"
        title={label}
        aria-label={`${label}: ${value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open) announcePopover(source);
          setOpen((next) => !next);
        }}
      >
        <span>{value}</span>
        <ChevronDown size={11} />
      </button>
      {open && position &&
        createPortal(
          <div
            className={display === 'aspect' ? 'tool-picker__menu tool-picker__menu--aspect' : 'tool-picker__menu'}
            style={{ left: position.left, top: position.top, width: position.width }}
            role="listbox"
            aria-label={label}
          >
            <span className="tool-picker__title">{label}</span>
            {display === 'aspect' ? (
              <div className="aspect-choice-grid">
                {options.map((option) => {
                  const [w, h] = option.split(':').map(Number);
                  const scale = 20 / Math.max(w || 1, h || 1);
                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={option === value}
                      className={option === value ? 'aspect-choice is-selected' : 'aspect-choice'}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                      }}
                    >
                      <span className="aspect-choice__glyph" style={{ width: (w || 1) * scale, height: (h || 1) * scale }} />
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  className={option === value ? 'tool-picker__option is-selected' : 'tool-picker__option'}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span>{option}</span>
                  {option === value && <Check size={11} />}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

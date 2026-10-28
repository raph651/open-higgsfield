import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Clapperboard, Image as ImageIcon } from 'lucide-react';

export type GenerationFamily = 'image' | 'video';

interface GenerationTypePickerProps {
  family: GenerationFamily;
  label: string;
  onChange: (family: GenerationFamily) => void;
  variant?: 'node' | 'panel';
}

const OPTIONS: Array<{ value: GenerationFamily; label: string; hint: string; icon: typeof ImageIcon }> = [
  { value: 'image', label: 'Image generation', hint: 'Stills, edits and style frames', icon: ImageIcon },
  { value: 'video', label: 'Video generation', hint: 'Motion, camera and performance', icon: Clapperboard },
];

export function GenerationTypePicker({ family, label, onChange, variant = 'panel' }: GenerationTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 250;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const openUp = rect.bottom > window.innerHeight * 0.6;
    setAnchor(
      openUp
        ? { left, bottom: window.innerHeight - rect.top + 8 }
        : { left, top: rect.bottom + 8 },
    );
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.type-menu') || target.closest('.type-trigger')) return;
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`type-trigger type-trigger--${variant} ${variant === 'node' ? 'nodrag' : ''}`.trim()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === 'node' ? `Change node type (${label})` : undefined}
        title={variant === 'node' ? 'Change node type' : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
      >
        {variant === 'panel' && <span>{label}</span>}
        <ChevronDown size={variant === 'node' ? 12 : 14} />
      </button>
      {open &&
        anchor &&
        createPortal(
          <div
            ref={menuRef}
            className="type-menu"
            style={{ left: anchor.left, top: anchor.top, bottom: anchor.bottom }}
            role="menu"
            aria-label="Change node type"
          >
            <span className="type-menu__label">Node type</span>
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option.value === family}
                  className={`type-menu__item ${option.value === family ? 'is-selected' : ''}`}
                  onClick={() => {
                    setOpen(false);
                    if (option.value !== family) onChange(option.value);
                  }}
                >
                  <span className="type-menu__icon"><Icon size={14} /></span>
                  <span className="type-menu__copy">
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                  {option.value === family && <Check size={13} />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

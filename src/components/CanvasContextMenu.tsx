import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Clapperboard,
  Download,
  Image as ImageIcon,
  ImagePlus,
  StickyNote,
  Table2,
  Type,
} from 'lucide-react';

export type ContextCreateId =
  | 'image'
  | 'video'
  | 'prompt'
  | 'reference'
  | 'output'
  | 'sticky'
  | 'table';

const GROUPS: Array<{
  label: string;
  items: Array<{ id: ContextCreateId; label: string; hint: string; icon: typeof Type }>;
}> = [
  {
    label: 'Generate',
    items: [
      { id: 'image', label: 'Image generator', hint: 'SD-Turbo · still frame', icon: ImageIcon },
      { id: 'video', label: 'Video generator', hint: 'LTX-Video 2B · motion', icon: Clapperboard },
    ],
  },
  {
    label: 'Input',
    items: [
      { id: 'prompt', label: 'Prompt', hint: 'Text direction', icon: Type },
      { id: 'reference', label: 'Image reference', hint: 'Upload a visual anchor', icon: ImagePlus },
      { id: 'output', label: 'Output', hint: 'Deliver the final render', icon: Download },
    ],
  },
  {
    label: 'Board',
    items: [
      { id: 'sticky', label: 'Sticky note', hint: 'Annotate the board', icon: StickyNote },
      { id: 'table', label: 'Table', hint: 'Shot list or beats', icon: Table2 },
    ],
  },
];

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onCreate: (id: ContextCreateId) => void;
  onClose: () => void;
}

export function CanvasContextMenu({ x, y, onCreate, onClose }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = 244;
  const height = 398;
  const left = Math.max(12, Math.min(x, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(y, window.innerHeight - height - 12));

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.context-menu')) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="context-menu"
      style={{ left, top, width }}
      role="menu"
      aria-label="Create node"
      onClick={(event) => event.stopPropagation()}
    >
      {GROUPS.map((group) => (
        <div key={group.label} className="context-menu__group">
          <span className="context-menu__label">{group.label}</span>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="context-menu__item"
                onClick={() => {
                  onCreate(item.id);
                  onClose();
                }}
              >
                <span className="context-menu__icon"><Icon size={14} strokeWidth={1.7} /></span>
                <span className="context-menu__copy">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>,
    document.body,
  );
}

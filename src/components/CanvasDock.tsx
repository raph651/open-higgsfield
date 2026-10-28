import {
  Circle,
  Diamond,
  Eraser,
  Hand,
  Heart,
  MessageCircle,
  PanelTop,
  Plus,
  Search,
  Square,
  Table2,
  Type,
} from 'lucide-react';
import type { ShapeKind } from '../types';

export type DockTool = 'select' | 'pan' | 'draw' | 'erase' | 'comment' | 'reaction';

interface CanvasDockProps {
  tool: DockTool;
  onTool: (tool: DockTool) => void;
  onSticky: () => void;
  onText: () => void;
  shapeMenuOpen: boolean;
  onToggleShapeMenu: () => void;
  onShape: (shape: ShapeKind) => void;
  onTable: () => void;
  onSearch: () => void;
  onAdd: () => void;
  onPage: () => void;
  addOpen: boolean;
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.4 3.3 18.8 12l-6.2 1.5-3.4 6.8L5.4 3.3Z" fill="currentColor" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="dockPenBody" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#f4f1ff" />
          <stop offset="55%" stopColor="#c9c4dd" />
          <stop offset="100%" stopColor="#8f88ab" />
        </linearGradient>
      </defs>
      <path
        d="M14.3 3.6 20 9.3 10.6 19.4 4 20.4l1-6.6 9.3-10.2Z"
        fill="url(#dockPenBody)"
        stroke="rgba(12,8,24,.6)"
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <path d="M14.3 3.6 20 9.3l-2.7 2.8-5.7-5.7 2.7-2.8Z" className="dock-soft-fill" />
      <path d="M4 20.4 5.1 14l4.9 4.7-6 1.7Z" className="dock-strong-fill" />
    </svg>
  );
}

function StickyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="dockSticky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="dock-sticky-a" />
          <stop offset="100%" className="dock-sticky-b" />
        </linearGradient>
      </defs>
      <path
        d="M4.5 2.8h11.2l3.8 3.9v14.5H4.5V2.8Z"
        fill="url(#dockSticky)"
        stroke="rgba(12,8,24,.55)"
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <path d="M15.7 2.8v3.9h3.8" className="dock-soft-fill" opacity=".94" />
      <path d="M8 9.2h7.4M8 12.3h5.8M8 15.4h4.2" stroke="rgba(20,10,40,.55)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ShapesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.2" y="2.6" width="11.6" height="11.6" rx="2.6" className="dock-strong-fill" stroke="rgba(12,8,24,.55)" strokeWidth=".8" />
      <circle cx="16.2" cy="16.2" r="5.6" className="dock-soft-fill" fillOpacity=".95" stroke="rgba(12,8,24,.55)" strokeWidth=".8" />
    </svg>
  );
}

function DockButton({
  label,
  active,
  onClick,
  children,
  className = '',
  badge,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className={`dock-btn ${active ? 'is-active' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
    >
      <span className="dock-btn__icon">{children}</span>
      <span className="dock-tip" role="tooltip">{label}</span>
      {badge && <span className="dock-badge">{badge}</span>}
    </button>
  );
}

export function CanvasDock({
  tool,
  onTool,
  onSticky,
  onText,
  shapeMenuOpen,
  onToggleShapeMenu,
  onShape,
  onTable,
  onSearch,
  onAdd,
  onPage,
  addOpen,
}: CanvasDockProps) {
  return (
    <div className="canvas-dock" role="toolbar" aria-label="Canvas tools">
      <DockButton label="Select · V" active={tool === 'select'} onClick={() => onTool('select')}>
        <SelectIcon />
      </DockButton>
      <DockButton label="Hand · H" active={tool === 'pan'} onClick={() => onTool('pan')}>
        <Hand size={19} strokeWidth={1.6} />
      </DockButton>

      <span className="dock-divider" />

      <DockButton label="Draw · P" active={tool === 'draw'} onClick={() => onTool('draw')}>
        <PenIcon />
      </DockButton>
      <DockButton label="Eraser · E" active={tool === 'erase'} onClick={() => onTool('erase')}>
        <Eraser size={18} strokeWidth={1.6} />
      </DockButton>
      <DockButton label="Sticky note · S" onClick={onSticky}>
        <StickyIcon />
      </DockButton>

      <div className="dock-menu-anchor">
        <DockButton
          label="Shapes"
          active={shapeMenuOpen}
          onClick={onToggleShapeMenu}
          className="dock-btn--menu"
        >
          <ShapesIcon />
        </DockButton>
        {shapeMenuOpen && (
          <div className="dock-flyout" role="menu" aria-label="Shapes">
            <button type="button" role="menuitem" onClick={() => onShape('rect')}>
              <Square size={15} strokeWidth={1.6} /> Rectangle
            </button>
            <button type="button" role="menuitem" onClick={() => onShape('ellipse')}>
              <Circle size={15} strokeWidth={1.6} /> Ellipse
            </button>
            <button type="button" role="menuitem" onClick={() => onShape('diamond')}>
              <Diamond size={15} strokeWidth={1.6} /> Diamond
            </button>
          </div>
        )}
      </div>

      <DockButton label="Text · T" onClick={onText}>
        <Type size={18} strokeWidth={1.6} />
      </DockButton>

      <span className="dock-divider" />

      <DockButton label="Reactions" active={tool === 'reaction'} onClick={() => onTool('reaction')}>
        <Heart size={18} strokeWidth={1.6} />
      </DockButton>
      <DockButton label="Comment · C" active={tool === 'comment'} onClick={() => onTool('comment')}>
        <MessageCircle size={18} strokeWidth={1.6} />
      </DockButton>
      <DockButton label="Table" onClick={onTable}>
        <Table2 size={18} strokeWidth={1.6} />
      </DockButton>
      <DockButton label="Page" onClick={onPage}>
        <PanelTop size={18} strokeWidth={1.6} />
      </DockButton>

      <span className="dock-divider" />

      <DockButton label="Search · ⌘K" onClick={onSearch}>
        <Search size={18} strokeWidth={1.6} />
      </DockButton>
      <DockButton label="Add node" onClick={onAdd} active={addOpen} className="dock-btn--add">
        <Plus size={19} strokeWidth={1.8} />
      </DockButton>
    </div>
  );
}

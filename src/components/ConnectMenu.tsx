import { Clapperboard, Download, Image as ImageIcon, StickyNote, Table2 } from 'lucide-react';

export type ConnectOptionId = 'image' | 'video' | 'output' | 'sticky' | 'table';

const OPTIONS: Array<{
  id: ConnectOptionId;
  label: string;
  hint: string;
  icon: typeof ImageIcon;
  group: 'generate' | 'deliver';
}> = [
  {
    id: 'image',
    label: 'Image generator',
    hint: 'SD-Turbo · still frame',
    icon: ImageIcon,
    group: 'generate',
  },
  {
    id: 'video',
    label: 'Video generator',
    hint: 'LTX-Video 2B · motion',
    icon: Clapperboard,
    group: 'generate',
  },
  {
    id: 'output',
    label: 'Output',
    hint: 'Deliver the final render',
    icon: Download,
    group: 'deliver',
  },
  {
    id: 'sticky',
    label: 'Sticky note',
    hint: 'Annotate this step',
    icon: StickyNote,
    group: 'deliver',
  },
  {
    id: 'table',
    label: 'Table',
    hint: 'Shot list or beats',
    icon: Table2,
    group: 'deliver',
  },
];

import type { NodeKind } from '../types';

interface ConnectMenuProps {
  x: number;
  y: number;
  sourceLabel: string;
  sourceKind: NodeKind;
  onSelect: (id: ConnectOptionId) => void;
  onClose: () => void;
}

export function ConnectMenu({ x, y, sourceLabel, sourceKind, onSelect, onClose }: ConnectMenuProps) {
  const options = OPTIONS.filter((option) => option.id !== 'output' || sourceKind === 'model');
  const width = 252;
  const height = 332;
  const left = Math.max(12, Math.min(x, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(y, window.innerHeight - height - 12));

  return (
    <div
      className="connect-menu"
      style={{ left, top, width }}
      role="menu"
      aria-label="Add a node"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="connect-menu__head">
        <div>
          <strong>Add next step</strong>
          <span>from {sourceLabel}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close menu">
          ×
        </button>
      </div>
      <div className="connect-menu__list">
        {options.map((option, index) => {
          const Icon = option.icon;
          const startsBoard = index > 0 && options[index - 1].group !== option.group;
          return (
            <div key={option.id}>
              {startsBoard && <div className="connect-menu__rule" />}
              <button
                type="button"
                role="menuitem"
                className="connect-menu__item"
                onClick={() => onSelect(option.id)}
              >
                <span className="connect-menu__icon"><Icon size={15} strokeWidth={1.6} /></span>
                <span className="connect-menu__copy">
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

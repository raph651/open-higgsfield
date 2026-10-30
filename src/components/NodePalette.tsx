import {
  ImagePlus,
  Layers,
  Sparkles,
  SquareArrowOutUpRight,
  StickyNote,
  Type,
} from 'lucide-react';
import { LISTED_MODELS } from '../data';
import type { ModelId, NodeKind } from '../types';

const NODE_BUTTONS: Array<{ kind: NodeKind; label: string; hint: string; icon: typeof Type }> = [
  { kind: 'prompt', label: 'Prompt', hint: 'Text direction', icon: Type },
  { kind: 'model', label: 'Model', hint: 'Render a frame', icon: Sparkles },
  { kind: 'reference', label: 'Image', hint: 'Upload a reference', icon: ImagePlus },
  { kind: 'output', label: 'Output', hint: 'Collect delivery', icon: SquareArrowOutUpRight },
  { kind: 'note', label: 'Note', hint: 'Leave context', icon: StickyNote },
];

interface NodePaletteProps {
  onAdd: (kind: NodeKind, modelId?: ModelId) => void;
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  return (
    <aside className="palette">
      <div className="palette__head">
        <span className="eyebrow">NODE LIBRARY</span>
        <span className="palette__hint"><Layers size={12} /> click to add</span>
      </div>

      <div className="palette__section">
        <span className="section-label">Build</span>
        <div className="palette__nodes">
          {NODE_BUTTONS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.kind} className="palette-node" onClick={() => onAdd(item.kind)}>
                <span className={`palette-node__icon palette-node__icon--${item.kind}`}>
                  <Icon size={15} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                <span className="palette-node__plus">+</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="palette__section">
        <span className="section-label">Model adapters</span>
        <div className="palette__models">
          {LISTED_MODELS.map((model) => (
            <button
              key={model.id}
              className="palette-model"
              onClick={() => onAdd('model', model.id)}
              title={model.blurb}
            >
              <span className="palette-model__dot" style={{ background: model.accent }} />
              <span>
                <strong>{model.name}</strong>
                <small>{model.family} · {model.cost} cr · {model.runtime === 'api' ? 'API' : 'local'}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="palette__foot">
        <kbd>⌘</kbd><kbd>↵</kbd> run graph
        <span>·</span>
        <kbd>Del</kbd> remove
      </div>
    </aside>
  );
}

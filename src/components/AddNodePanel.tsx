import { useRef, useState } from 'react';
import {
  AudioLines,
  Clapperboard,
  FolderOpen,
  Image as ImageIcon,
  PanelTop,
  Search,
  Sparkles,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { MODELS } from '../data';
import type { ModelId, NodeKind } from '../types';

interface AddNodePanelProps {
  onAdd: (kind: NodeKind, modelId?: ModelId, title?: string) => void;
  onUpload: (files: File[]) => void;
  onAssets: () => void;
  onSoon: (message: string) => void;
}

function Row({
  label,
  icon,
  color,
  onClick,
  badge,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button className={`add-node-row ${disabled ? 'is-disabled' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="add-node-icon" style={{ background: color }}>{icon}</span>
      <span>{label}</span>
      {badge && <span className={`add-node-badge ${badge === 'New' ? 'is-new' : ''}`}>{badge}</span>}
    </button>
  );
}

export function AddNodePanel({ onAdd, onUpload, onAssets, onSoon }: AddNodePanelProps) {
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);
  const imageModels = MODELS.filter((model) => model.family === 'image');
  const videoModels = MODELS.filter((model) => model.family === 'video');

  return (
    <div className="add-node-panel">
      <label className="add-node-search">
        <Search size={16} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </label>

      <div className="add-node-scroll">
        {matches('Prompt') && (
          <Row
            label="Prompt"
            icon={<Type size={16} />}
            color="#5a5a5c"
            onClick={() => onAdd('prompt')}
          />
        )}
        {matches('Image Generator') && (
          <Row
            label="Image Generator"
            icon={<ImageIcon size={16} />}
            color="#2f9bd8"
            onClick={() => onAdd('model', 'sd-turbo', 'Image Generation')}
          />
        )}
        {matches('Video Generator') && (
          <Row
            label="Video Generator"
            icon={<Clapperboard size={16} />}
            color="#6657e8"
            onClick={() => onAdd('model', 'ltx-video-2b', 'Video Generation')}
          />
        )}
        {matches('Voice Generator') && (
          <Row
            label="Voice Generator"
            icon={<AudioLines size={16} />}
            color="#c75b9d"
            onClick={() => onSoon('Voice nodes are coming with the audio pass')}
          />
        )}
        {matches('LLM Assistant') && (
          <Row
            label="LLM Assistant"
            icon={<Sparkles size={16} />}
            color="#7b8c3a"
            onClick={() => onSoon('LLM nodes are coming with the prompt-assist pass')}
          />
        )}
        {matches('Page') && (
          <Row
            label="Page"
            icon={<PanelTop size={16} />}
            color="#3fa37f"
            badge="New"
            onClick={() => onAdd('page')}
          />
        )}

        {(matches('Upload') || matches('Assets') || q === '') && (
          <span className="add-node-section">References</span>
        )}
        {matches('Upload') && (
          <Row
            label="Upload"
            icon={<Upload size={16} />}
            color="#3fa37f"
            onClick={() => fileRef.current?.click()}
          />
        )}
        {matches('Assets') && (
          <Row
            label="Assets"
            icon={<FolderOpen size={16} />}
            color="#3fa37f"
            onClick={onAssets}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
          hidden
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) onUpload(files);
            event.target.value = '';
          }}
        />

        {imageModels.some((model) => matches(model.name)) && (
          <span className="add-node-section">Image</span>
        )}
        {imageModels.filter((model) => matches(model.name)).map((model) => (
          <Row
            key={model.id}
            label={model.name}
            icon={<ImageIcon size={16} />}
            color={model.accent}
            badge={model.runtime === 'api' ? 'API' : undefined}
            onClick={() => onAdd('model', model.id)}
          />
        ))}

        {videoModels.some((model) => matches(model.name)) && (
          <span className="add-node-section">Video</span>
        )}
        {videoModels.filter((model) => matches(model.name)).map((model) => (
          <Row
            key={model.id}
            label={model.name}
            icon={<Clapperboard size={16} />}
            color={model.accent}
            badge={model.runtime === 'api' ? 'API' : undefined}
            onClick={() => onAdd('model', model.id)}
          />
        ))}

        {q &&
          ![
            'Prompt',
            'Image Generator',
            'Video Generator',
            'Voice Generator',
            'LLM Assistant',
            'Page',
            'Upload',
            'Assets',
            ...MODELS.map((model) => model.name),
          ].some((label) => label.toLowerCase().includes(q)) && (
            <p className="add-node-empty">No nodes match “{query}”.</p>
          )}
      </div>
    </div>
  );
}

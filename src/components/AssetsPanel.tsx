import { useMemo, useState } from 'react';
import { Download, FolderOpen, Image as ImageIcon, Plus, Search, Trash2, Video, X } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { CanvasAsset } from '../types';

interface AssetsPanelProps {
  onUse: (asset: CanvasAsset) => void;
  onClose: () => void;
}

type AssetTab = 'all' | 'image' | 'video';

export function AssetsPanel({ onUse, onClose }: AssetsPanelProps) {
  const assets = useCanvasStore((state) => state.assets);
  const removeAsset = useCanvasStore((state) => state.removeAsset);
  const [tab, setTab] = useState<AssetTab>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      assets.filter((asset) => {
        const matchesTab = tab === 'all' || asset.kind === tab;
        const matchesQuery = asset.name.toLowerCase().includes(query.toLowerCase());
        return matchesTab && matchesQuery;
      }),
    [assets, tab, query],
  );

  return (
    <aside className="assets-panel">
      <div className="assets-panel__head">
        <div>
          <span className="eyebrow">LIBRARY</span>
          <h2>Assets</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close assets">
          <X size={16} />
        </button>
      </div>

      <label className="assets-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets"
        />
        {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={12} /></button>}
      </label>

      <div className="assets-tabs">
        {([
          ['all', 'All'],
          ['image', 'Images'],
          ['video', 'Videos'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? 'assets-tab is-active' : 'assets-tab'}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="assets-grid">
        {filtered.map((asset) => (
          <article
            key={asset.id}
            className="asset-card"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('application/x-framegraph-asset', asset.id);
              event.dataTransfer.setData('text/plain', asset.name);
              event.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <div className="asset-card__media">
              {asset.kind === 'video' ? (
                <video src={asset.url} muted loop playsInline />
              ) : (
                <img src={asset.url} alt={asset.name} />
              )}
              <span className="asset-card__kind">
                {asset.kind === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                {asset.kind}
              </span>
              <div className="asset-card__overlay">
                <button onClick={() => onUse(asset)} title="Add to canvas"><Plus size={14} /></button>
                <a href={asset.url} download={`openframe-asset-${asset.id}.${asset.kind === 'video' ? 'mp4' : 'png'}`} title="Download">
                  <Download size={13} />
                </a>
                <button onClick={() => removeAsset(asset.id)} title="Delete asset"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="asset-card__body">
              <strong title={asset.name}>{asset.name}</strong>
              <span>{asset.source} · {asset.kind}</span>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="assets-empty">
            <FolderOpen size={24} />
            <strong>{assets.length ? 'No assets match' : 'No assets yet'}</strong>
            <span>{assets.length ? 'Try another search or filter.' : 'Drop a file on the canvas or generate a render.'}</span>
          </div>
        )}
      </div>

      <div className="assets-panel__foot">
        <span>{assets.length} asset{assets.length === 1 ? '' : 's'}</span>
        <span>Drag to canvas</span>
      </div>
    </aside>
  );
}

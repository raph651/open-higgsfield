import { BookOpen, Boxes, Layers, LayoutGrid, Plus, Sparkles, Users } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';
import { Logo } from './Logo';

interface SideRailProps {
  onModels: () => void;
}

export function SideRail({ onModels }: SideRailProps) {
  const tab = useCanvasStore((state) => state.tab);
  const setTab = useCanvasStore((state) => state.setTab);
  const goDashboard = useCanvasStore((state) => state.goDashboard);
  const createCanvas = useCanvasStore((state) => state.createCanvas);
  const credits = useCanvasStore((state) => state.credits);
  const showToast = useCanvasStore((state) => state.showToast);

  const go = (target: 'studio' | 'templates' | 'models' | 'community' | 'docs') => {
    if (target === 'models') {
      onModels();
      return;
    }
    if (target === 'community') {
      showToast('Community gallery is local-only in this build');
      return;
    }
    if (target === 'docs') {
      showToast('Docs live in README.md — quick start is there');
      return;
    }
    goDashboard();
    setTab(target === 'templates' ? 'templates' : 'canvases');
  };

  return (
    <aside className="rail">
      <button className="rail__brand" onClick={() => go('studio')} aria-label="Open Source Canvas studio">
        <Logo compact />
        <span>FRAME<span>/</span>GRAPH</span>
      </button>

      <button className="rail__new" onClick={() => createCanvas()}>
        <Plus size={15} />
        New canvas
      </button>

      <nav className="rail__nav" aria-label="Workspace">
        <button
          className={tab === 'canvases' ? 'rail__link rail__link--active' : 'rail__link'}
          onClick={() => go('studio')}
        >
          <LayoutGrid size={16} />
          Studio
        </button>
        <button
          className={tab === 'templates' ? 'rail__link rail__link--active' : 'rail__link'}
          onClick={() => go('templates')}
        >
          <Layers size={16} />
          Templates
        </button>
        <button className="rail__link" onClick={() => go('models')}>
          <Boxes size={16} />
          Models
        </button>
        <button className="rail__link" onClick={() => go('community')}>
          <Users size={16} />
          Community
        </button>
        <button className="rail__link" onClick={() => go('docs')}>
          <BookOpen size={16} />
          Docs
        </button>
      </nav>

      <div className="rail__bottom">
        <div className="rail__beta">
          <span className="status-dot status-dot--live" />
          Open beta
          <span className="rail__mit">MIT</span>
        </div>
        <div className="rail__credits">
          <Sparkles size={12} />
          <strong>{credits}</strong>
          <span>credits</span>
        </div>
        <button className="rail__account" onClick={() => showToast('Local profile')}>
          <span className="avatar avatar--sm">AR</span>
          <span>
            <strong>Alex R.</strong>
            <small>Local workspace</small>
          </span>
        </button>
      </div>
    </aside>
  );
}

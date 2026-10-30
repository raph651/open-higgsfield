import { ExternalLink, Play } from 'lucide-react';
import { asset, REPO_URL, STATIC_DEMO } from '../lib/staticDemo';

/** Always-visible notice on the GitHub Pages build. Not rendered in a normal build. */
export function DemoBanner() {
  if (!STATIC_DEMO) return null;
  return (
    <aside className="demo-banner" role="note" aria-label="Demo notice">
      <span className="demo-banner__tag">DEMO ONLY</span>
      <span className="demo-banner__text demo-banner__text--long">
        ComfyUI is offline on this page. You can edit canvases and press Run, but results are placeholder artwork. Run it on your own computer for real image and video generation.
      </span>
      <span className="demo-banner__text demo-banner__text--short">ComfyUI is offline here. Run draws placeholder artwork.</span>
      <a className="demo-banner__link" href={asset('demo/')}>
        <Play size={12} /> Demo video
      </a>
      <a className="demo-banner__link demo-banner__link--primary" href={`${REPO_URL}#quick-start`} target="_blank" rel="noreferrer">
        Run locally <ExternalLink size={12} />
      </a>
    </aside>
  );
}

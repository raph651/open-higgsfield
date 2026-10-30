/**
 * Static demo build (GitHub Pages): no ComfyUI is reachable, so the canvas runs on the mock provider.
 * Everything else (templates, nodes, edges, prompts, @ mentions, models) is the real app.
 */
export const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === '1';

// Lets the CSS reserve room for the notice strip before React renders.
if (STATIC_DEMO && typeof document !== 'undefined') document.documentElement.dataset.demo = 'static';

export const REPO_URL = 'https://github.com/raph651/open-source-canvas';

/** How to add another local model to the app. */
export const ADD_MODEL_DOCS = `${REPO_URL}/blob/main/docs/ADDING_MODELS.md`;

/** Resolve a path under public/ against the deploy base ("/" locally, "/<repo>/" on GitHub Pages). */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const DEMO_NOTICE =
  'Demo only: ComfyUI is offline here, so Run draws placeholder artwork. Run it on your own machine to generate real images and video.';

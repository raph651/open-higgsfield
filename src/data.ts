import { MarkerType, type Edge } from '@xyflow/react';
import type { CanvasNode, ModelDef, ModelId, NodeKind, TemplateDef } from './types';

export const MODELS: ModelDef[] = [
  {
    id: 'sd-turbo',
    name: 'SD-Turbo',
    family: 'image',
    runtime: 'comfyui',
    cost: 3,
    blurb: 'Fast local stills. SD-Turbo, 4 steps, running through ComfyUI.',
    accent: '#ff7a3d',
  },
  {
    id: 'ltx-video-2b',
    name: 'LTX-Video 2B',
    family: 'video',
    runtime: 'comfyui',
    cost: 8,
    blurb: 'Local draft video via LTX 2B distilled. Short clips on 24 GB.',
    accent: '#ffb27a',
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    family: 'image',
    runtime: 'api',
    cost: 6,
    blurb: 'Editorial stills and precise edits through an external API wrapper.',
    accent: '#8bd3ff',
  },
  {
    id: 'soul-2.0',
    name: 'Soul 2.0',
    family: 'image',
    runtime: 'api',
    cost: 5,
    blurb: 'Character and portrait generation through an external API wrapper.',
    accent: '#ff9bea',
  },
  {
    id: 'ltx-2.3',
    name: 'LTX-2.3',
    family: 'video',
    runtime: 'api',
    cost: 10,
    blurb: 'Full LTX video generation through the LTX API wrapper.',
    accent: '#f4d9a4',
  },
  {
    id: 'seedance-2.0',
    name: 'Seedance 2.0',
    family: 'video',
    runtime: 'api',
    cost: 12,
    blurb: 'ByteDance Seedance 2.0 through an external API wrapper.',
    accent: '#b49bff',
    resolutions: ['480p', '720p', '1080p'],
  },
  {
    id: 'seedance-2.5',
    name: 'Seedance 2.5',
    family: 'video',
    runtime: 'api',
    cost: 16,
    blurb: 'ByteDance Seedance 2.5 through an external API wrapper.',
    accent: '#a8ff9e',
    resolutions: ['480p', '720p', '1080p'],
  },
];

export const MODEL_BY_ID: Record<ModelId, ModelDef> = Object.fromEntries(
  MODELS.map((model) => [model.id, model]),
) as Record<ModelId, ModelDef>;

export const NODE_META: Record<
  NodeKind,
  { label: string; hint: string; color: string; short: string }
> = {
  prompt: { label: 'Prompt', hint: 'Write the direction', color: '#a78bfa', short: 'TXT' },
  model: { label: 'Model', hint: 'Render a frame', color: '#8bd3ff', short: 'MDL' },
  reference: { label: 'Image', hint: 'Upload a reference', color: '#c4b5fd', short: 'IMG' },
  output: { label: 'Output', hint: 'Collect the final', color: '#f3f1e8', short: 'OUT' },
  note: { label: 'Note', hint: 'Leave a director note', color: '#c4b5fd', short: 'NOTE' },
  group: { label: 'Group', hint: 'Frame a cluster', color: '#8bd3ff', short: 'GRP' },
  shape: { label: 'Shape', hint: 'Mark up the board', color: '#a78bfa', short: 'SHP' },
  table: { label: 'Table', hint: 'Plan the shot list', color: '#c4b5fd', short: 'TBL' },
  page: { label: 'Page', hint: 'Open a nested canvas', color: '#7ee0b8', short: 'PAGE' },
};

export const NAV_ITEMS = ['Studio', 'Templates', 'Models', 'Community', 'Docs'];

export const ASPECTS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const;

const EDGE_COLOR = 'rgba(167, 139, 250, 0.72)';

export function makeEdge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'default',
    style: { stroke: EDGE_COLOR, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa', width: 16, height: 16 },
  };
}

function node(
  id: string,
  kind: NodeKind,
  x: number,
  y: number,
  extra: Partial<CanvasNode['data']> = {},
): CanvasNode {
  const defaults: Record<NodeKind, Partial<CanvasNode['data']>> = {
    prompt: { title: 'Prompt', prompt: '' },
    model: { title: 'SD-Turbo', model: 'sd-turbo', aspect: '1:1', duration: 4, cost: 3 },
    reference: { title: 'Reference', label: 'ANCHOR / 01' },
    output: { title: 'Output' },
    note: { title: 'Note', note: '' },
    group: { title: 'Group' },
    shape: { title: 'Shape', shape: 'rect' },
    table: {
      title: 'Table',
      table: {
        columns: ['Beat', 'Shot', 'Note'],
        rows: [
          ['01', 'Wide', 'Dusk, hard side light'],
          ['02', 'Close', 'Rider enters frame'],
          ['03', 'Cutaway', 'Hands on the bars'],
        ],
      },
    },
    page: { title: 'Page' },
  };

  return {
    id,
    type: 'canvas',
    position: { x, y },
    data: {
      kind,
      status: 'idle',
      ...defaults[kind],
      ...extra,
    } as CanvasNode['data'],
  };
}

function buildProductFilm() {
  const p = Math.random().toString(36).slice(2, 7);
  const ref = node(`${p}-ref`, 'reference', 20, 210, {
    title: 'Ceramic still',
    label: 'CERAMIC / 01',
    previewUrl: undefined,
  });
  const image = node(`${p}-img`, 'model', 320, 160, {
    title: 'SD-Turbo',
    model: 'sd-turbo',
    prompt:
      'A tall bone-white ceramic vessel on wet black stone. One hard sidelight, deep shadow, a single acid-green reflection at the rim. Editorial product photography, 85mm.',
    aspect: '4:5',
    cost: 3,
  });
  const video = node(`${p}-vid`, 'model', 620, 160, {
    title: 'LTX-Video 2B',
    model: 'ltx-video-2b',
    prompt:
      'Slow 20-degree orbit around the vessel. The reflection travels across the glaze. Subtle steam. Locked exposure, no cuts.',
    duration: 6,
    cost: 8,
  });
  const out = node(`${p}-out`, 'output', 920, 240, { title: 'Launch cut' });
  return {
    nodes: [ref, image, video, out],
    edges: [makeEdge(ref.id, image.id), makeEdge(image.id, video.id), makeEdge(video.id, out.id)],
  };
}

function buildMotionStudy() {
  const p = Math.random().toString(36).slice(2, 7);
  const prompt = node(`${p}-prompt`, 'prompt', 20, 280, {
    title: 'Motion brief',
    prompt:
      'A translucent ribbon of light folds through a dark room, catching on brushed metal. Restrained, tactile, no text.',
  });
  const key = node(`${p}-key`, 'model', 320, 130, {
    title: 'SD-Turbo',
    model: 'sd-turbo',
    prompt: 'Key art: a ribbon of light folding through a dark architectural void.',
    aspect: '16:9',
    cost: 3,
  });
  const motion = node(`${p}-motion`, 'model', 620, 230, {
    title: 'LTX-Video 2B',
    model: 'ltx-video-2b',
    duration: 5,
    cost: 8,
  });
  const out = node(`${p}-out`, 'output', 920, 300, { title: 'Loop master' });
  return {
    nodes: [prompt, key, motion, out],
    edges: [
      makeEdge(prompt.id, key.id),
      makeEdge(prompt.id, motion.id),
      makeEdge(key.id, motion.id),
      makeEdge(motion.id, out.id),
    ],
  };
}

function buildCharacterLoop() {
  const p = Math.random().toString(36).slice(2, 7);
  const ref = node(`${p}-ref`, 'reference', 20, 170, {
    title: 'Character anchor',
    label: 'MIRA / FRONT',
  });
  const prompt = node(`${p}-prompt`, 'prompt', 20, 440, {
    title: 'Performance',
    prompt:
      'Mira steps out of a doorway, pauses, and looks back over her shoulder. Sodium light, wet pavement, quiet confidence.',
  });
  const image = node(`${p}-img`, 'model', 320, 190, {
    title: 'SD-Turbo',
    model: 'sd-turbo',
    prompt: 'Mira in a doorway, sodium light, cinematic still, 35mm grain.',
    aspect: '9:16',
    cost: 3,
  });
  const video = node(`${p}-vid`, 'model', 620, 190, {
    title: 'LTX-Video 2B',
    model: 'ltx-video-2b',
    duration: 8,
    cost: 8,
  });
  const out = node(`${p}-out`, 'output', 920, 270, { title: 'Scene 04' });
  return {
    nodes: [ref, prompt, image, video, out],
    edges: [
      makeEdge(ref.id, image.id),
      makeEdge(prompt.id, image.id),
      makeEdge(image.id, video.id),
      makeEdge(video.id, out.id),
    ],
  };
}


function buildObjectsSwap() {
  const p = Math.random().toString(36).slice(2, 7);
  const actor = node(`${p}-actor`, 'reference', 20, 80, {
    title: 'Actor',
    label: 'ACTOR',
    previewUrl: '/templates/objects-swap/actor.webp',
    mediaKind: 'image',
  });
  const car = node(`${p}-car`, 'reference', 20, 360, {
    title: 'Car',
    label: 'CAR',
    previewUrl: '/templates/objects-swap/car.webp',
    mediaKind: 'image',
  });
  const source = node(`${p}-source`, 'reference', 20, 640, {
    title: 'Source motion',
    label: 'SOURCE',
    previewUrl: '/templates/objects-swap/source.mp4',
    mediaKind: 'video',
  });
  const swap = node(`${p}-swap`, 'model', 420, 260, {
    title: 'Seedance 2.0',
    model: 'seedance-2.0',
    prompt:
      'Swap the actor with @Actor and the car with @Car in @Source.',
    resolution: '720p',
    aspect: '16:9',
    duration: 15,
    cost: 12,
    outputUrl: '/templates/objects-swap/generation.mp4',
    outputKind: 'video',
    status: 'done',
  });
  const out = node(`${p}-out`, 'output', 860, 360, { title: 'FrameJutsu' });
  return {
    nodes: [actor, car, source, swap, out],
    edges: [
      makeEdge(actor.id, swap.id),
      makeEdge(car.id, swap.id),
      makeEdge(source.id, swap.id),
      makeEdge(swap.id, out.id),
    ],
  };
}


function buildMarketingStudio() {
  const p = Math.random().toString(36).slice(2, 7);
  const reference = node(`${p}-reference`, 'reference', 20, 80, {
    title: 'Scene reference',
    label: 'REFERENCE',
    previewUrl: '/templates/marketing-studio/reference.jpg',
    mediaKind: 'image',
  });
  const product = node(`${p}-product`, 'reference', 20, 360, {
    title: 'Product',
    label: 'PRODUCT',
    previewUrl: '/templates/marketing-studio/product.jpg',
    mediaKind: 'image',
  });
  const avatar = node(`${p}-avatar`, 'reference', 20, 640, {
    title: 'Avatar',
    label: 'AVATAR',
    previewUrl: '/templates/marketing-studio/avatar.jpg',
    mediaKind: 'image',
  });
  const image = node(`${p}-image`, 'model', 420, 260, {
    title: 'Nano Banana Pro',
    model: 'nano-banana-pro',
    prompt:
      'Place @Product and @Avatar into the scene from @Reference. Keep the original lighting, camera and materials consistent.',
    resolution: '2k',
    aspect: '1:1',
    cost: 6,
  });
  const out = node(`${p}-out`, 'output', 860, 360, { title: 'Marketing Studio' });
  return {
    nodes: [reference, product, avatar, image, out],
    edges: [
      makeEdge(reference.id, image.id),
      makeEdge(product.id, image.id),
      makeEdge(avatar.id, image.id),
      makeEdge(image.id, out.id),
    ],
  };
}


function buildRecreate() {
  const p = Math.random().toString(36).slice(2, 7);
  const source = node(`${p}-source`, 'reference', 20, 80, {
    title: 'Source clip',
    label: 'SOURCE',
    previewUrl: '/templates/recreate/source.mp4',
    mediaKind: 'video',
  });
  const product = node(`${p}-product`, 'reference', 20, 360, {
    title: 'Product',
    label: 'PRODUCT',
    previewUrl: '/templates/recreate/product.webp',
    mediaKind: 'image',
  });
  const avatar = node(`${p}-avatar`, 'reference', 20, 640, {
    title: 'Avatar',
    label: 'AVATAR',
    previewUrl: '/templates/recreate/avatar.webp',
    mediaKind: 'image',
  });
  const video = node(`${p}-video`, 'model', 420, 260, {
    title: 'Seedance 2.0',
    model: 'seedance-2.0',
    prompt:
      'Replace the product with @Product and the avatar with @Avatar. Keep the source motion, camera and environment.',
    resolution: '720p',
    aspect: '9:16',
    duration: 12,
    cost: 12,
  });
  const out = node(`${p}-out`, 'output', 860, 360, { title: 'Recreate' });
  return {
    nodes: [source, product, avatar, video, out],
    edges: [
      makeEdge(source.id, video.id),
      makeEdge(product.id, video.id),
      makeEdge(avatar.id, video.id),
      makeEdge(video.id, out.id),
    ],
  };
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'product-film',
    name: 'Product film',
    description: 'Still → motion → delivery. A four-node launch pipeline.',
    tag: 'Commerce',
    accent: '#ff7a3d',
    previewSeed: 'ceramic launch film',
    nodeCount: 4,
    build: buildProductFilm,
  },
  {
    id: 'motion-study',
    name: 'Motion study',
    description: 'Key art and motion generated in parallel from one brief.',
    tag: 'Motion',
    accent: '#8bd3ff',
    previewSeed: 'ribbon of light',
    nodeCount: 4,
    build: buildMotionStudy,
  },
  {
    id: 'character-loop',
    name: 'Character loop',
    description: 'Hold a face and wardrobe consistent across a scene.',
    tag: 'Character',
    accent: '#ffb27a',
    previewSeed: 'mira doorway sodium',
    nodeCount: 5,
    build: buildCharacterLoop,
  },
  {
    id: 'objects-swap',
    name: 'FrameJutsu',
    description: 'Swap an actor and a car into the motion of a source clip with Seedance 2.0.',
    tag: 'References',
    accent: '#ff9bb5',
    previewSeed: 'objects swap actor car',
    previewUrl: '/templates/objects-swap/preview.mp4',
    previewKind: 'video',
    previewPoster: '/templates/objects-swap/preview.jpg',
    nodeCount: 5,
    build: buildObjectsSwap,
  },
  {
    id: 'marketing-studio',
    name: 'Marketing Studio',
    description: 'Compose a product and a talent into a reference scene with a free prompt.',
    tag: 'Marketing',
    accent: '#8bd3ff',
    previewSeed: 'marketing studio product talent',
    previewUrl: '/templates/marketing-studio/reference.jpg',
    previewKind: 'image',
    nodeCount: 5,
    build: buildMarketingStudio,
  },
  {
    id: 'recreate',
    name: 'Recreate',
    description: 'Replace the avatar and product in a source clip with a custom prompt.',
    tag: 'Video',
    accent: '#ff8aa5',
    previewSeed: 'recreate source clip avatar product',
    previewUrl: '/templates/recreate/preview.mp4',
    previewKind: 'video',
    previewPoster: '/templates/recreate/poster.jpg',
    nodeCount: 5,
    build: buildRecreate,
  },
];

import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'prompt' | 'model' | 'reference' | 'output' | 'note' | 'group' | 'shape' | 'table' | 'page';
export type ShapeKind = 'rect' | 'ellipse' | 'diamond';
export type NodeStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';
export type ModelId =
  | 'sd-turbo'
  | 'nano-banana-pro'
  | 'soul-2.0'
  | 'ltx-video-2b'
  | 'ltx-2.3'
  | 'ltx-2.5'
  | 'seedream-5.0-pro'
  | 'seedance-2.0'
  | 'seedance-2.5'
  | 'wan-2.2-ti2v-5b'
  | 'pika-h3-flex';
export type Aspect = '1:1' | '16:9' | '9:16' | '4:5' | '21:9' | '4:3' | '3:4';
export type OutputKind = 'image' | 'video' | 'audio';

export interface CanvasNodeData extends Record<string, unknown> {
  kind: NodeKind;
  title: string;
  status: NodeStatus;
  prompt?: string;
  model?: ModelId;
  aspect?: Aspect;
  duration?: number;
  seed?: number;
  strength?: number;
  resolution?: string;
  batch?: number;
  generateAudio?: boolean;
  outputUrl?: string;
  outputKind?: OutputKind;
  outputSeed?: number;
  note?: string;
  label?: string;
  previewUrl?: string;
  mediaKind?: 'image' | 'video';
  error?: string;
  lastRun?: number;
  outputHistory?: Array<{ url: string; kind: OutputKind; at: number; seed?: number }>;
  shape?: ShapeKind;
  touched?: boolean;
  variant?: 'sticky' | 'text';
  table?: { columns: string[]; rows: string[][] };
  tableStyle?: {
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  };
  pageId?: string;
  mentionAliases?: string[];
}

export type CanvasNode = Node<CanvasNodeData, 'canvas'>;

export interface CanvasVersion {
  id: string;
  docId: string;
  title: string;
  label: string;
  at: number;
  nodes: CanvasNode[];
  edges: Edge[];
  comments?: CanvasComment[];
}

export interface CanvasAsset {
  id: string;
  url: string;
  kind: 'image' | 'video';
  name: string;
  source: 'upload' | 'generated';
  createdAt: number;
}

export interface CanvasComment {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  at: number;
  resolved?: boolean;
  /** Pinned to this node: (x, y) is then only the fallback, the node's position plus (dx, dy) is used. */
  nodeId?: string;
  dx?: number;
  dy?: number;
}

export interface CanvasStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

export interface CanvasReaction {
  id: string;
  x: number;
  y: number;
  emoji: string;
  at: number;
  /** Pinned to this node: (x, y) is then only the fallback, the node's position plus (dx, dy) is used. */
  nodeId?: string;
  dx?: number;
  dy?: number;
}

export interface CanvasDoc {
  id: string;
  title: string;
  updatedAt: number;
  nodes: CanvasNode[];
  edges: Edge[];
  comments?: CanvasComment[];
  pageParentId?: string;
  templateId?: string;
  strokes?: CanvasStroke[];
  reactions?: CanvasReaction[];
}

export type ModelRuntime = 'comfyui' | 'api';

/** What a local model needs on disk before ComfyUI can run it. Checked against the running ComfyUI. */
export interface ModelInstall {
  files: Array<{
    /** the ComfyUI loader node and input that lists this kind of file, e.g. UNETLoader / unet_name */
    node: string;
    field: string;
    file: string;
    /** folder under the ComfyUI directory, e.g. models/diffusion_models */
    folder: string;
    url: string;
    size?: string;
  }>;
  /** custom node packs the model needs besides the files */
  customNodes?: string[];
  note?: string;
  docs: string;
}

export interface ModelDef {
  id: ModelId;
  name: string;
  family: OutputKind;
  runtime: ModelRuntime;
  blurb: string;
  /** a rough run time for the Models page and the Generate button, with where the number comes from */
  eta?: { label: string; note: string };
  accent: string;
  resolutions?: string[];
  /** present on local models that are not part of a default ComfyUI install */
  install?: ModelInstall;
  /** false: listed and installable, but this app has no workflow for it yet */
  workflow?: boolean;
}

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  tag: string;
  accent: string;
  previewSeed: string;
  previewUrl?: string;
  mediaKind?: 'image' | 'video';
  previewKind?: 'image' | 'video';
  previewPoster?: string;
  nodeCount: number;
  nodes: CanvasNode[];
  edges: Edge[];
  createdAt: number;
}

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  tag: string;
  accent: string;
  previewSeed: string;
  previewUrl?: string;
  previewKind?: 'image' | 'video';
  previewPoster?: string;
  nodeCount: number;
  build: () => { nodes: CanvasNode[]; edges: Edge[] };
}

export interface RunResult {
  nodeId: string;
  ok: boolean;
  message: string;
}

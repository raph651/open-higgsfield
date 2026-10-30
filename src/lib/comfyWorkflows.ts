import type { Aspect } from '../types';

export interface ComfyWorkflowParams {
  prompt: string;
  negative?: string;
  seed: number;
  width: number;
  height: number;
  checkpoint: string;
}

export interface WorkflowSize {
  width: number;
  height: number;
}

const SIZES: Record<Aspect, WorkflowSize> = {
  '1:1': { width: 512, height: 512 },
  '4:5': { width: 512, height: 640 },
  '16:9': { width: 768, height: 432 },
  '9:16': { width: 432, height: 768 },
  '21:9': { width: 896, height: 384 },
  '4:3': { width: 640, height: 480 },
  '3:4': { width: 480, height: 640 },
};

export function sizeForAspect(aspect: Aspect | undefined): WorkflowSize {
  return SIZES[aspect ?? '1:1'];
}

/**
 * SD-Turbo, 4 steps, CFG 1.0. Full checkpoint, so one loader feeds model,
 * CLIP and VAE. This is the image workflow the app ships with.
 */
export function sdTurboWorkflow(params: ComfyWorkflowParams): Record<string, unknown> {
  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: params.checkpoint },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.negative ?? '', clip: ['1', 1] },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: { width: params.width, height: params.height, batch_size: 1 },
    },
    '5': {
      class_type: 'KSampler',
      inputs: {
        seed: params.seed,
        steps: 4,
        cfg: 1,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
      },
    },
    '6': {
      class_type: 'VAEDecode',
      inputs: { samples: ['5', 0], vae: ['1', 2] },
    },
    '7': {
      class_type: 'SaveImage',
      inputs: { images: ['6', 0], filename_prefix: 'osc' },
    },
  };
}

export const WORKFLOW_NOTES = [
  'SD-Turbo is a full checkpoint: place sd_turbo.safetensors in ComfyUI/models/checkpoints.',
  'Export any ComfyUI workflow via File → Export Workflow (API) to add a new engine.',
  'The canvas never talks to a vendor API directly; every render goes through ComfyUI.',
];

export interface LtxVideoParams {
  prompt: string;
  negative?: string;
  seed: number;
  width: number;
  height: number;
  frames: number;
  checkpoint: string;
  textEncoder: string;
  steps?: number;
}

const LTX_SIZES: Record<Aspect, WorkflowSize> = {
  '1:1': { width: 512, height: 512 },
  '4:5': { width: 512, height: 640 },
  '16:9': { width: 768, height: 448 },
  '9:16': { width: 448, height: 768 },
  '21:9': { width: 832, height: 352 },
  '4:3': { width: 640, height: 480 },
  '3:4': { width: 480, height: 640 },
};

export function sizeForLtx(aspect: Aspect | undefined): WorkflowSize {
  return LTX_SIZES[aspect ?? '16:9'];
}

/**
 * LTX-Video 2B distilled. Frame count must be 8n + 1.
 * Larger frame counts are supported, but need enough unified memory.
 */
export function ltxVideoWorkflow(params: LtxVideoParams): Record<string, unknown> {
  return {
    '38': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: params.textEncoder,
        type: 'ltxv',
        device: 'default',
      },
    },
    '44': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: params.checkpoint },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.prompt, clip: ['38', 0] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.negative ?? '', clip: ['38', 0] },
    },
    '70': {
      class_type: 'EmptyLTXVLatentVideo',
      inputs: {
        width: params.width,
        height: params.height,
        length: params.frames,
        batch_size: 1,
      },
    },
    '73': {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: 'euler' },
    },
    '71': {
      class_type: 'LTXVScheduler',
      inputs: {
        steps: params.steps ?? 8,
        max_shift: 2.05,
        base_shift: 0.95,
        stretch: true,
        terminal: 0.1,
        latent: ['70', 0],
      },
    },
    '69': {
      class_type: 'LTXVConditioning',
      inputs: {
        positive: ['6', 0],
        negative: ['7', 0],
        frame_rate: 25,
      },
    },
    '72': {
      class_type: 'SamplerCustom',
      inputs: {
        add_noise: true,
        noise_seed: params.seed,
        cfg: 1,
        model: ['44', 0],
        positive: ['69', 0],
        negative: ['69', 1],
        sampler: ['73', 0],
        sigmas: ['71', 0],
        latent_image: ['70', 0],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['72', 0], vae: ['44', 2] },
    },
    '78': {
      class_type: 'CreateVideo',
      inputs: { images: ['8', 0], fps: 24 },
    },
    '79': {
      class_type: 'SaveVideo',
      inputs: {
        video: ['78', 0],
        filename_prefix: 'osc/ltx',
        format: 'auto',
        codec: 'auto',
      },
    },
  };
}

export function framesForDuration(duration: number): number {
  const raw = Math.max(2, Math.min(10, duration)) * 24;
  const rounded = Math.round(raw / 8) * 8 + 1;
  return Math.max(17, Math.min(241, rounded));
}

export interface LtxImageParams extends LtxVideoParams {
  image: string;
  strength?: number;
}

/**
 * LTX image-to-video: the upstream still becomes the first frame, the prompt
 * controls what moves next. This is the core "image → motion" Canvas chain.
 */
export function ltxImageToVideoWorkflow(params: LtxImageParams): Record<string, unknown> {
  return {
    '10': {
      class_type: 'LoadImage',
      inputs: { image: params.image },
    },
    '38': {
      class_type: 'CLIPLoader',
      inputs: {
        clip_name: params.textEncoder,
        type: 'ltxv',
        device: 'default',
      },
    },
    '44': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: params.checkpoint },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.prompt, clip: ['38', 0] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.negative ?? '', clip: ['38', 0] },
    },
    '80': {
      class_type: 'LTXVImgToVideo',
      inputs: {
        positive: ['6', 0],
        negative: ['7', 0],
        vae: ['44', 2],
        image: ['10', 0],
        width: params.width,
        height: params.height,
        length: params.frames,
        batch_size: 1,
        strength: params.strength ?? 1,
      },
    },
    '73': {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: 'euler' },
    },
    '71': {
      class_type: 'LTXVScheduler',
      inputs: {
        steps: params.steps ?? 8,
        max_shift: 2.05,
        base_shift: 0.95,
        stretch: true,
        terminal: 0.1,
        latent: ['80', 2],
      },
    },
    '72': {
      class_type: 'SamplerCustom',
      inputs: {
        add_noise: true,
        noise_seed: params.seed,
        cfg: 1,
        model: ['44', 0],
        positive: ['80', 0],
        negative: ['80', 1],
        sampler: ['73', 0],
        sigmas: ['71', 0],
        latent_image: ['80', 2],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['72', 0], vae: ['44', 2] },
    },
    '78': {
      class_type: 'CreateVideo',
      inputs: { images: ['8', 0], fps: 24 },
    },
    '79': {
      class_type: 'SaveVideo',
      inputs: {
        video: ['78', 0],
        filename_prefix: 'osc/ltx-i2v',
        format: 'auto',
        codec: 'auto',
      },
    },
  };
}

export interface SdImg2ImgParams extends ComfyWorkflowParams {
  image: string;
  denoise?: number;
}

/**
 * SD-Turbo image-to-image with a reference still. ComfyUI loads the uploaded
 * image, encodes it to latent space and re-samples at partial denoise so the
 * reference composition survives.
 */
export function sdTurboImg2ImgWorkflow(params: SdImg2ImgParams): Record<string, unknown> {
  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: params.checkpoint },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.negative ?? '', clip: ['1', 1] },
    },
    '4': {
      class_type: 'LoadImage',
      inputs: { image: params.image },
    },
    '5': {
      class_type: 'VAEEncode',
      inputs: { pixels: ['4', 0], vae: ['1', 2] },
    },
    '6': {
      class_type: 'KSampler',
      inputs: {
        seed: params.seed,
        steps: 4,
        cfg: 1,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: params.denoise ?? 0.55,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['5', 0],
      },
    },
    '7': {
      class_type: 'VAEDecode',
      inputs: { samples: ['6', 0], vae: ['1', 2] },
    },
    '8': {
      class_type: 'SaveImage',
      inputs: { images: ['7', 0], filename_prefix: 'osc/img2img' },
    },
  };
}


// ── Sizes from the resolution and aspect ratio the node asks for ────────────────────────────────

function ratio(aspect: Aspect | undefined, fallback: Aspect): [number, number] {
  const [w, h] = (aspect ?? fallback).split(':').map(Number);
  return [w || 1, h || 1];
}

function snap(value: number, multiple: number): number {
  return Math.max(multiple, Math.round(value / multiple) * multiple);
}

/** Image tiers are a pixel budget, so a 3:4 "1k" holds about as many pixels as a 1:1 "1k". */
const IMAGE_TIER_EDGE: Record<string, number> = { '512': 512, '768': 768, '1k': 1024, '2k': 2048, '4k': 4096 };

export function sizeForImageTier(aspect: Aspect | undefined, tier: string | undefined, fallbackTier: string): WorkflowSize {
  const edge = IMAGE_TIER_EDGE[tier ?? ''] ?? IMAGE_TIER_EDGE[fallbackTier] ?? 512;
  const [rw, rh] = ratio(aspect, '1:1');
  const width = Math.sqrt(edge * edge * (rw / rh));
  return { width: snap(width, 8), height: snap(width * (rh / rw), 8) };
}

/** Video tiers name the short side: 480p of 16:9 is 854x480, rounded to what the model accepts. */
const VIDEO_TIER_SHORT_SIDE: Record<string, number> = { '480p': 480, '720p': 720, '768p': 768, '1080p': 1080 };

export function sizeForVideoTier(
  aspect: Aspect | undefined,
  tier: string | undefined,
  fallbackTier: string,
  multiple: number,
): WorkflowSize {
  const short = VIDEO_TIER_SHORT_SIDE[tier ?? ''] ?? VIDEO_TIER_SHORT_SIDE[fallbackTier] ?? 480;
  const [rw, rh] = ratio(aspect, '16:9');
  // 720 is not a multiple of 32: the short side rounds down (1280x704, the size Wan's own template uses) so the clip
  // never gets bigger than named, and the long side rounds to nearest to keep the aspect ratio close.
  const down = (value: number) => Math.max(multiple, Math.floor(value / multiple) * multiple);
  const near = (value: number) => Math.max(multiple, Math.round(value / multiple) * multiple);
  const base = down(short);
  return rw >= rh
    ? { width: near(base * (rw / rh)), height: base }
    : { width: base, height: near(base * (rh / rw)) };
}

// ── Wan 2.2 TI2V 5B ────────────────────────────────────────────────────────────────────────────

/** Wan 2.2 5B renders at 24 fps and wants 4n + 1 frames. */
export function framesForWan(duration: number): number {
  const seconds = Math.max(2, Math.min(10, duration));
  const n = Math.round((seconds * 24 - 1) / 4);
  return Math.max(25, Math.min(241, n * 4 + 1));
}

export interface WanTi2vParams {
  prompt: string;
  negative?: string;
  seed: number;
  width: number;
  height: number;
  frames: number;
  unet: string;
  textEncoder: string;
  vae: string;
  /** an uploaded still to start from (image to video); leave out for text to video */
  image?: string;
  steps?: number;
}

/** The ComfyUI template for Wan 2.2 TI2V 5B: one model handles both text and image to video. */
export function wan22Ti2vWorkflow(params: WanTi2vParams): Record<string, unknown> {
  const latentInputs: Record<string, unknown> = {
    vae: ['39', 0],
    width: params.width,
    height: params.height,
    length: params.frames,
    batch_size: 1,
  };
  const graph: Record<string, unknown> = {
    '37': { class_type: 'UNETLoader', inputs: { unet_name: params.unet, weight_dtype: 'default' } },
    '38': { class_type: 'CLIPLoader', inputs: { clip_name: params.textEncoder, type: 'wan', device: 'default' } },
    '39': { class_type: 'VAELoader', inputs: { vae_name: params.vae } },
    '48': { class_type: 'ModelSamplingSD3', inputs: { model: ['37', 0], shift: 8 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: params.prompt, clip: ['38', 0] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: params.negative ?? '', clip: ['38', 0] } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        model: ['48', 0],
        seed: params.seed,
        steps: params.steps ?? 20,
        cfg: 5,
        sampler_name: 'uni_pc',
        scheduler: 'simple',
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['55', 0],
        denoise: 1,
      },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['39', 0] } },
    '57': { class_type: 'CreateVideo', inputs: { images: ['8', 0], fps: 24 } },
    '58': {
      class_type: 'SaveVideo',
      inputs: { video: ['57', 0], filename_prefix: 'osc/wan', format: 'auto', codec: 'auto' },
    },
  };
  if (params.image) {
    graph['56'] = { class_type: 'LoadImage', inputs: { image: params.image } };
    latentInputs.start_image = ['56', 0];
  }
  graph['55'] = { class_type: 'Wan22ImageToVideoLatent', inputs: latentInputs };
  return graph;
}

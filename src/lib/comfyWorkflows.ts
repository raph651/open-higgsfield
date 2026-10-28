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
      inputs: { images: ['6', 0], filename_prefix: 'openframe' },
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
        filename_prefix: 'openframe/ltx',
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
        filename_prefix: 'openframe/ltx-i2v',
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
      inputs: { images: ['7', 0], filename_prefix: 'openframe/img2img' },
    },
  };
}

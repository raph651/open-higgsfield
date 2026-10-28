import type { GenerationRequest, GenerationResult, Provider, ProviderProgress } from './providers';
import { ComfyClient, type ComfyProgress } from './comfy';
import {
  framesForDuration,
  ltxImageToVideoWorkflow,
  ltxVideoWorkflow,
  sdTurboImg2ImgWorkflow,
  sdTurboWorkflow,
  sizeForAspect,
  sizeForLtx,
} from './comfyWorkflows';

interface ComfyProviderConfig {
  baseUrl: string;
  apiKey?: string;
  checkpoint: string;
  videoCheckpoint: string;
  textEncoder: string;
  videoDraft: boolean;
}

function mapProgress(progress: ComfyProgress): ProviderProgress {
  if (progress.stage === 'queued') return { stage: 'queued', detail: 'Queued in ComfyUI' };
  if (progress.stage === 'done') return { stage: 'done', detail: 'Fetching output' };
  if (progress.stage === 'downloading') return { stage: 'running', detail: 'Downloading output' };
  return { stage: 'running', detail: 'ComfyUI is rendering' };
}

export class ComfyProvider implements Provider {
  id = 'comfyui';
  label = 'ComfyUI';
  private readonly client: ComfyClient;
  private readonly checkpoint: string;
  private readonly videoCheckpoint: string;
  private readonly textEncoder: string;
  private readonly videoDraft: boolean;

  constructor(config: ComfyProviderConfig) {
    this.client = new ComfyClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
    this.checkpoint = config.checkpoint;
    this.videoCheckpoint = config.videoCheckpoint;
    this.textEncoder = config.textEncoder;
    this.videoDraft = config.videoDraft;
  }

  private async prepareImage(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`image fetch ${response.status}`);
    const blob = await response.blob();
    const extension = blob.type.includes('jpeg')
      ? 'jpg'
      : blob.type.includes('webp')
        ? 'webp'
        : 'png';
    const filename = `osc-reference.${extension}`;
    const file = new File([blob], filename, { type: blob.type || `image/${extension}` });
    const uploaded = await this.client.uploadImage(file, filename);
    return uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (request.model.runtime !== 'comfyui') {
      throw new Error(`${request.model.name} is an API model and cannot run on the local ComfyUI workflow.`);
    }
    if (request.model.family === 'audio') {
      throw new Error(`${request.model.name} is an audio model. Add a matching ComfyUI audio workflow first.`);
    }
    const started = performance.now();
    const seed = request.seed ?? Math.floor(Math.random() * 1_000_000_000);
    request.onProgress?.({ stage: 'queued', detail: 'Submitting to ComfyUI' });

    let workflow: Record<string, unknown>;
    let outputPattern: RegExp;
    let kind: 'image' | 'video';

    if (request.model.family === 'video') {
      const size = this.videoDraft ? { width: 256, height: 256 } : sizeForLtx(request.aspect);
      const videoPrompt = request.prompt?.trim() || 'A subtle cinematic camera move with natural motion. Keep the subject stable.';
      const common = {
        prompt: videoPrompt,
        negative: 'text, watermark, logo, blurry, low quality, distorted',
        seed,
        width: size.width,
        height: size.height,
        frames: this.videoDraft ? 17 : framesForDuration(request.duration ?? 2),
        steps: this.videoDraft ? 4 : 8,
        checkpoint: this.videoCheckpoint,
        textEncoder: this.textEncoder,
      };

      let firstFrame: string | undefined;
      if (request.inputImageUrl) {
        request.onProgress?.({ stage: 'uploading', detail: 'Uploading first frame to ComfyUI' });
        try {
          firstFrame = await this.prepareImage(request.inputImageUrl);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Could not prepare the upstream image for LTX: ${message}`);
        }
      }

      workflow = firstFrame
        ? ltxImageToVideoWorkflow({ ...common, image: firstFrame, strength: 1 })
        : ltxVideoWorkflow(common);
      outputPattern = /\.(mp4|webm|mov|webp|gif)$/i;
      kind = 'video';
    } else {
      const size = request.width && request.height
        ? { width: request.width, height: request.height }
        : sizeForAspect(request.aspect);
      let reference: string | undefined;
      if (request.inputImageUrl) {
        request.onProgress?.({ stage: 'uploading', detail: 'Uploading reference to ComfyUI' });
        try {
          reference = await this.prepareImage(request.inputImageUrl);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Could not prepare the reference image for SD-Turbo: ${message}`);
        }
      }
      workflow = reference
        ? sdTurboImg2ImgWorkflow({
            prompt: request.prompt,
            negative: 'text, watermark, logo, blurry, low quality',
            seed,
            width: size.width,
            height: size.height,
            checkpoint: this.checkpoint,
            image: reference,
            denoise: 0.55,
          })
        : sdTurboWorkflow({
            prompt: request.prompt,
            negative: 'text, watermark, logo, blurry, low quality',
            seed,
            width: size.width,
            height: size.height,
            checkpoint: this.checkpoint,
          });
      outputPattern = /\.(png|jpe?g|webp)$/i;
      kind = 'image';
    }

    const result = await this.client.run(workflow, {
      signal: request.signal,
      onProgress: (progress) => request.onProgress?.(mapProgress(progress)),
    });
    const output = result.outputs.find((item) => outputPattern.test(item.filename)) ?? result.outputs[0];
    if (!output) throw new Error('ComfyUI did not return an output file');

    return {
      url: this.client.viewUrl(output),
      kind,
      provider: 'comfyui',
      latencyMs: Math.round(performance.now() - started),
    };
  }

  async cancel(): Promise<void> {
    await this.client.interrupt();
  }
}

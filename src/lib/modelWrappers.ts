import type { GenerationRequest, GenerationResult } from './providers';
import type { ModelId } from '../types';

export interface ModelWrapper {
  id: string;
  label: string;
  models: ModelId[];
  generate: (request: GenerationRequest) => Promise<GenerationResult>;
  cancel?: () => Promise<void>;
}

/**
 * External model wrappers live here.
 *
 * Seedance 2.0 / 2.5, LTX-2.3, Nano Banana Pro and Soul 2.0 are marked
 * `runtime: 'api'` in data.ts. They route through this registry instead of
 * ComfyUI. Add a wrapper when the API details are available:
 *
 *   registerModelWrapper({
 *     id: 'seedance',
 *     label: 'Seedance API',
 *     models: ['seedance-2.0', 'seedance-2.5'],
 *     async generate(request) { ... }
 *   });
 *
 * Do not put API secrets in the Vite bundle. Call a local/serverless proxy
 * that holds the key and forwards the request.
 */
const wrappers: ModelWrapper[] = [];

export function registerModelWrapper(wrapper: ModelWrapper): void {
  const existing = wrappers.findIndex((item) => item.id === wrapper.id);
  if (existing >= 0) wrappers[existing] = wrapper;
  else wrappers.push(wrapper);
}

export function getModelWrapper(modelId: ModelId): ModelWrapper | undefined {
  return wrappers.find((wrapper) => wrapper.models.includes(modelId));
}

export function listModelWrappers(): ModelWrapper[] {
  return [...wrappers];
}

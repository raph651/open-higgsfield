import { getClientId } from './clientId';

export interface ComfyImageRef {
  filename: string;
  subfolder: string;
  type: string;
  format?: string;
}

export interface ComfyHistoryEntry {
  outputs?: Record<string, { images?: ComfyImageRef[]; gifs?: ComfyImageRef[]; videos?: ComfyImageRef[]; audio?: ComfyImageRef[] }>;
  status?: {
    status_str?: string;
    completed?: boolean;
    messages?: unknown[];
  };
}

export interface ComfyRunResult {
  promptId: string;
  outputs: ComfyImageRef[];
}

export interface ComfyProgress {
  stage: 'queued' | 'running' | 'downloading' | 'done';
  promptId?: string;
  detail?: string;
  percent?: number;
}

export interface ComfyConfig {
  baseUrl: string;
  apiKey?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/**
 * The per-visitor id header is for our own gateway (hosted demos), which scopes outputs by it. A stock ComfyUI started
 * with --enable-cors-header rejects unknown request headers in its CORS preflight, so it must not be sent there:
 * a cross-origin loopback address is a plain local ComfyUI.
 */
function sendsClientId(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl, window.location.href);
    if (url.origin === window.location.origin) return true;
    return !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
  } catch {
    return true;
  }
}

export class ComfyClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly clientIdHeader: boolean;

  constructor(config: ComfyConfig) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl || 'http://127.0.0.1:8188');
    this.apiKey = config.apiKey?.trim() || undefined;
    this.clientIdHeader = sendsClientId(this.baseUrl);
  }

  private headers(json = true): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    const headers = new Headers(init.headers);
    if (this.clientIdHeader) headers.set('x-osc-client', getClientId());
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Cannot reach ComfyUI at ${this.baseUrl}. Start it with --enable-cors-header. (${message})`,
      );
    }
    if (response.status === 401) {
      throw new Error('This ComfyUI is private. Add the access key in the ComfyUI panel (API key field).');
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ComfyUI ${path} failed (${response.status}): ${body.slice(0, 400)}`);
    }
    return response;
  }

  async health(timeoutMs = 9000): Promise<{ version?: string; device?: string; ramTotal?: number; locked?: boolean }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.request('/system_stats', { signal: controller.signal });
      const data = await response.json();
      return {
        version: data?.system?.comfyui_version,
        device: data?.devices?.[0]?.name,
        ramTotal: data?.system?.ram_total,
        // a gateway with an access key says so when it answered without one
        locked: response.headers.get('x-osc-locked') === '1',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** The file names a loader node offers (e.g. UNETLoader / unet_name), i.e. what is installed. null when ComfyUI will not say. */
  async listChoices(node: string, field: string): Promise<string[] | null> {
    try {
      const response = await this.request(`/object_info/${encodeURIComponent(node)}`);
      const info = await response.json();
      const spec = info?.[node]?.input?.required?.[field] ?? info?.[node]?.input?.optional?.[field];
      if (!Array.isArray(spec)) return null;
      // older ComfyUI: [[...names]]; newer: ['COMBO', { options: [...names] }]
      const list = Array.isArray(spec[0]) ? spec[0] : spec[0] === 'COMBO' ? spec[1]?.options : null;
      return Array.isArray(list) ? list.map(String) : null;
    } catch {
      return null;
    }
  }

  async queue(workflow: Record<string, unknown>): Promise<{ promptId: string; number?: number }> {
    const response = await this.request('/prompt', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ prompt: workflow, client_id: `osc-${crypto.randomUUID()}` }),
    });
    const data = await response.json();
    if (!data?.prompt_id) throw new Error('ComfyUI did not return a prompt_id');
    if (data.node_errors && Object.keys(data.node_errors).length) {
      throw new Error(`ComfyUI rejected the workflow: ${JSON.stringify(data.node_errors).slice(0, 500)}`);
    }
    return { promptId: data.prompt_id, number: data.number };
  }

  async history(promptId: string): Promise<Record<string, ComfyHistoryEntry>> {
    const response = await this.request(`/history/${encodeURIComponent(promptId)}`, { headers: this.headers(false) });
    return response.json();
  }

  async run(
    workflow: Record<string, unknown>,
    options: { onProgress?: (progress: ComfyProgress) => void; timeoutMs?: number; signal?: AbortSignal } = {},
  ): Promise<ComfyRunResult> {
    const { promptId } = await this.queue(workflow);
    options.onProgress?.({ stage: 'queued', promptId });
    const started = Date.now();
    const timeout = options.timeoutMs ?? 10 * 60 * 1000;

    while (Date.now() - started < timeout) {
      if (options.signal?.aborted) {
        await this.interrupt().catch(() => undefined);
        throw new DOMException('ComfyUI run cancelled', 'AbortError');
      }
      await sleep(800);
      let entry: ComfyHistoryEntry | undefined;
      try {
        const history = await this.history(promptId);
        entry = history[promptId];
      } catch (error) {
        // A private gateway refusing the key will never succeed on retry; surface it instead of polling forever.
        if (error instanceof Error && error.message.includes('is private')) throw error;
        // The history endpoint can 404 while the job is still queued.
        continue;
      }
      if (!entry) {
        options.onProgress?.({ stage: 'running', promptId });
        continue;
      }
      if (entry.status?.status_str === 'error') {
        throw new Error('ComfyUI execution failed. Check the ComfyUI console for the node error.');
      }
      const outputs = this.extractOutputs(entry);
      if (outputs.length) {
        options.onProgress?.({ stage: 'done', promptId });
        return { promptId, outputs };
      }
      if (entry.status?.completed) {
        throw new Error('ComfyUI completed without an image/video output. Add a SaveImage or SaveVideo node.');
      }
    }
    throw new Error(`ComfyUI run timed out after ${Math.round(timeout / 1000)}s`);
  }

  extractOutputs(entry: ComfyHistoryEntry): ComfyImageRef[] {
    const outputs: ComfyImageRef[] = [];
    for (const node of Object.values(entry.outputs ?? {})) {
      for (const key of ['images', 'gifs', 'videos', 'audio'] as const) {
        const list = node[key];
        if (Array.isArray(list)) outputs.push(...list);
      }
    }
    return outputs.filter((item) => Boolean(item?.filename));
  }

  viewUrl(image: ComfyImageRef): string {
    const params = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder || '',
      type: image.type || 'output',
    });
    return `${this.baseUrl}/view?${params.toString()}`;
  }

  async uploadImage(file: File, filename = file.name): Promise<{ name: string; subfolder: string; type: string }> {
    const form = new FormData();
    form.append('image', file, filename);
    form.append('overwrite', 'true');
    const response = await this.request('/upload/image', {
      method: 'POST',
      headers: this.headers(false),
      body: form,
    });
    return response.json();
  }

  async interrupt(): Promise<void> {
    await this.request('/interrupt', {
      method: 'POST',
      headers: this.headers(),
      body: '{}',
    });
  }
}

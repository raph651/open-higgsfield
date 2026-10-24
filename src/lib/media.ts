import { ComfyClient } from './comfy';
import { useSettingsStore } from '../store/useSettingsStore';
import { fileToDataUrl } from './image';

export interface NodeMedia {
  url: string;
  kind: 'image' | 'video';
  sessionOnly?: boolean;
}

/**
 * Images are compressed and kept as data URLs.
 * Videos are uploaded to ComfyUI's input folder so the node survives a reload.
 * If ComfyUI is offline, video falls back to an object URL for this session.
 */
export async function fileToNodeMedia(file: File): Promise<NodeMedia> {
  if (file.type.startsWith('image/')) {
    return { url: await fileToDataUrl(file), kind: 'image' };
  }

  if (file.type.startsWith('video/')) {
    if (file.size > 150_000_000) {
      throw new Error('Video is over 150 MB — use a shorter clip');
    }
    const settings = useSettingsStore.getState();
    if (settings.useComfy) {
      try {
        const client = new ComfyClient({ baseUrl: settings.baseUrl, apiKey: settings.apiKey });
        const uploaded = await client.uploadImage(file, file.name);
        return {
          url: client.viewUrl({
            filename: uploaded.name,
            subfolder: uploaded.subfolder,
            type: 'input',
          }),
          kind: 'video',
        };
      } catch {
        // Fall through to a session-only object URL.
      }
    }
    return { url: URL.createObjectURL(file), kind: 'video', sessionOnly: true };
  }

  throw new Error('Use an image or video file');
}

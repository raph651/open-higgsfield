export const PROMPT_PLACEHOLDER =
  'Use @ to mention a reference. Example: Make the character in @Image act using the moves and camera in @Video and add the music from @Audio.';

import type { CanvasAsset, CanvasDoc } from '../types';

export interface MentionItem {
  id: string;
  label: string;
  url: string;
  kind: 'image' | 'video' | 'audio';
  linked?: boolean;
  nodeId?: string;
  assetId?: string;
}

export interface MentionGroup {
  label: string;
  items: MentionItem[];
}

function keysFor(item: { url: string; label: string }): string[] {
  const keys = new Set<string>();
  if (item.url) keys.add(`url:${item.url}`);
  const label = item.label.trim().toLowerCase();
  if (label) keys.add(`label:${label}`);
  return [...keys];
}

/**
 * Builds the deduplicated @-reference lists for a model node.
 * A reference already linked or present on canvas never repeats in the asset group.
 */
export function mentionHandle(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'reference';
}

export function buildMentionLookup(
  doc: CanvasDoc | null,
  nodeId: string,
  assets: CanvasAsset[],
): Map<string, MentionItem> {
  const lookup = new Map<string, MentionItem>();
  const byUrl = new Map<string, MentionItem>();
  for (const group of buildMentionGroups(doc, nodeId, assets)) {
    for (const item of group.items) {
      lookup.set(mentionHandle(item.label), item);
      if (item.url) byUrl.set(item.url, item);
      const asset = assets.find((entry) => entry.id === item.assetId || entry.url === item.url);
      if (asset) {
        lookup.set(mentionHandle(asset.name.replace(/\.[^.]+$/, '')), item);
      }
    }
  }
  for (const node of doc?.nodes ?? []) {
    if (node.data.kind !== 'reference') continue;
    const url = node.data.previewUrl ?? node.data.outputUrl;
    const item = (url ? byUrl.get(url) : undefined) ?? {
      id: node.id,
      nodeId: node.id,
      label: node.data.label ?? node.data.title,
      url: '',
      kind: 'image' as const,
    };
    lookup.set(mentionHandle(item.label), item);
    for (const alias of node.data.mentionAliases ?? []) lookup.set(alias, item);
    const asset = assets.find((entry) => entry.url === url);
    if (asset) lookup.set(mentionHandle(asset.name.replace(/\.[^.]+$/, '')), item);
  }
  return lookup;
}

export function buildMentionGroups(
  doc: CanvasDoc | null,
  nodeId: string,
  assets: CanvasAsset[],
  query = '',
): MentionGroup[] {
  const linked: MentionItem[] = [];
  for (const edge of doc?.edges ?? []) {
    if (edge.target !== nodeId) continue;
    const source = doc?.nodes.find((node) => node.id === edge.source);
    if (!source || !(source.data.previewUrl || source.data.outputUrl)) continue;
    linked.push({
      id: source.id,
      nodeId: source.id,
      label: source.data.label ?? source.data.title,
      url: source.data.previewUrl ?? source.data.outputUrl ?? '',
      kind: (source.data.mediaKind ?? source.data.outputKind ?? 'image') as MentionItem['kind'],
      linked: true,
    });
  }

  const seen = new Set<string>(linked.flatMap(keysFor));
  const onCanvas: MentionItem[] = [];
  for (const node of doc?.nodes ?? []) {
    if (node.id === nodeId) continue;
    if (!(node.data.previewUrl || node.data.outputUrl)) continue;
    const item: MentionItem = {
      id: node.id,
      nodeId: node.id,
      label: node.data.label ?? node.data.title,
      url: node.data.previewUrl ?? node.data.outputUrl ?? '',
      kind: (node.data.mediaKind ?? node.data.outputKind ?? 'image') as MentionItem['kind'],
      linked: false,
    };
    const keys = keysFor(item);
    if (keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    onCanvas.push(item);
  }

  const assetItems: MentionItem[] = [];
  for (const asset of assets) {
    const item: MentionItem = {
      id: asset.id,
      assetId: asset.id,
      label: asset.name.replace(/\.[^.]+$/, ''),
      url: asset.url,
      kind: asset.kind,
      linked: false,
    };
    const keys = keysFor(item);
    if (keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    assetItems.push(item);
  }

  const q = query.trim().toLowerCase();
  const group = (label: string, items: MentionItem[]): MentionGroup => ({
    label,
    items: q ? items.filter((item) => item.label.toLowerCase().includes(q)) : items,
  });

  return [group('Linked', linked), group('On this canvas', onCanvas), group('Assets', assetItems)]
    .filter((entry) => entry.items.length > 0);
}

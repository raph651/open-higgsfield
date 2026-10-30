import type { CanvasNode } from '../types';

/** Anything that can be pinned to a node (a reaction or a comment). */
export interface Anchored {
  x: number;
  y: number;
  nodeId?: string;
  dx?: number;
  dy?: number;
}

export interface NodeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Flow-space box of every node, adding up parent group offsets. */
export function nodeBoxes(nodes: CanvasNode[]): Map<string, NodeBox> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const boxes = new Map<string, NodeBox>();
  for (const node of nodes) {
    let x = node.position.x;
    let y = node.position.y;
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    for (let depth = 0; parent && depth < 16; depth += 1) {
      x += parent.position.x;
      y += parent.position.y;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    boxes.set(node.id, {
      id: node.id,
      x,
      y,
      w: node.measured?.width ?? node.width ?? 0,
      h: node.measured?.height ?? node.height ?? 0,
    });
  }
  return boxes;
}

/** Where a reaction or comment is drawn: pinned to its node when it has one, otherwise where it was dropped. */
export function anchoredPoint(item: Anchored, boxes: Map<string, NodeBox>): { x: number; y: number } {
  const box = item.nodeId ? boxes.get(item.nodeId) : undefined;
  if (!box) return { x: item.x, y: item.y };
  return { x: box.x + (item.dx ?? 0), y: box.y + (item.dy ?? 0) };
}

export const reactionPoint = anchoredPoint;

/** The smallest node under a point (so a card inside a group wins over the group). `margin` also catches the corners. */
export function nodeAt(point: { x: number; y: number }, boxes: Map<string, NodeBox>, margin = 0): NodeBox | null {
  let best: NodeBox | null = null;
  for (const box of boxes.values()) {
    if (box.w <= 0 || box.h <= 0) continue;
    const inside =
      point.x >= box.x - margin && point.x <= box.x + box.w + margin &&
      point.y >= box.y - margin && point.y <= box.y + box.h + margin;
    if (inside && (!best || box.w * box.h < best.w * best.h)) best = box;
  }
  return best;
}

/**
 * Slot for the nth reaction on a node. The first one sits on the top right corner, the rest follow the border
 * clockwise (down the right side, along the bottom, up the left, along the top) so they wrap around the node.
 */
export function perimeterSlot(box: NodeBox, index: number, spacing = 32): { dx: number; dy: number } {
  const w = Math.max(box.w, 1);
  const h = Math.max(box.h, 1);
  const length = 2 * (w + h);
  let d = (w + index * spacing) % length; // distance clockwise from the top left corner; w = top right corner
  if (d < w) return { dx: d, dy: 0 };
  d -= w;
  if (d < h) return { dx: w, dy: d };
  d -= h;
  if (d < w) return { dx: w - d, dy: h };
  d -= w;
  return { dx: 0, dy: h - d };
}

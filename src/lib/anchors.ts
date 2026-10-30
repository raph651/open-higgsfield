import type { CanvasNode, CanvasReaction } from '../types';

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

/** Where a reaction is drawn: pinned to its node when it has one, otherwise where it was dropped. */
export function reactionPoint(reaction: CanvasReaction, boxes: Map<string, NodeBox>): { x: number; y: number } {
  const box = reaction.nodeId ? boxes.get(reaction.nodeId) : undefined;
  if (!box) return { x: reaction.x, y: reaction.y };
  return { x: box.x + (reaction.dx ?? 0), y: box.y + (reaction.dy ?? 0) };
}

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

/** Top-right corner slot for the nth reaction on a node. */
export function topRightSlot(box: NodeBox, index: number): { dx: number; dy: number } {
  return { dx: box.w - 2 - index * 30, dy: 2 };
}

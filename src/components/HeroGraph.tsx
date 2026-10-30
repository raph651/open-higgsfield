import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { ArrowUpRight, Play } from 'lucide-react';
import { Artwork } from './Artwork';
import { makeEdge } from '../data';

interface HeroData extends Record<string, unknown> {
  kind: 'prompt' | 'image' | 'video' | 'output';
  title: string;
  meta: string;
  seed: string;
  accent: string;
}

type HeroNodeType = Node<HeroData, 'hero'>;

function HeroNode({ data, selected }: NodeProps<HeroNodeType>) {
  const hasArt = data.kind !== 'prompt';
  return (
    <div
      className={`hero-node hero-node--${data.kind} ${selected ? 'is-selected' : ''}`}
      style={{ ['--accent' as string]: data.accent }}
    >
      {data.kind !== 'prompt' && <Handle type="target" position={Position.Left} className="hero-handle" />}
      <div className="hero-node__top">
        <span>{data.title}</span>
        <span className="hero-node__meta">{data.meta}</span>
      </div>
      {hasArt ? (
        <div className="hero-node__art">
          <Artwork seed={data.seed} alt={`${data.title} workflow preview`} />
          {data.kind === 'video' && (
            <span className="hero-node__play">
              <Play size={11} fill="currentColor" />
              06s
            </span>
          )}
        </div>
      ) : (
        <p className="hero-node__prompt">
          A bone-white vessel on wet stone. One hard light. A green reflection at the rim.
        </p>
      )}
      <div className="hero-node__bottom">
        <span>{data.kind === 'prompt' ? 'TEXT / DIRECTION' : data.kind.toUpperCase()}</span>
        <span>{data.kind === 'prompt' ? 'free' : data.kind === 'video' ? '8 cr' : '3 cr'}</span>
      </div>
      {data.kind !== 'output' && <Handle type="source" position={Position.Right} className="hero-handle" />}
    </div>
  );
}

const nodeTypes = { hero: HeroNode };

const nodes: HeroNodeType[] = [
  {
    id: 'brief',
    type: 'hero',
    position: { x: 0, y: 60 },
    data: {
      kind: 'prompt',
      title: 'Brief',
      meta: 'TXT',
      seed: 'brief',
      accent: '#ff7a3d',
    },
  },
  {
    id: 'still',
    type: 'hero',
    position: { x: 215, y: 0 },
    data: {
      kind: 'image',
      title: 'SD-Turbo',
      meta: 'IMG',
      seed: 'bone vessel hard light',
      accent: '#ff7a3d',
    },
  },
  {
    id: 'motion',
    type: 'hero',
    position: { x: 430, y: 80 },
    data: {
      kind: 'video',
      title: 'LTX-Video 2B',
      meta: 'VID',
      seed: 'vessel orbit steam',
      accent: '#ffb27a',
    },
  },
  {
    id: 'delivery',
    type: 'hero',
    position: { x: 645, y: 30 },
    data: {
      kind: 'output',
      title: 'Delivery',
      meta: 'OUT',
      seed: 'launch cut',
      accent: '#f3f1e8',
    },
  },
];

const edges: Edge[] = [
  makeEdge('brief', 'still'),
  makeEdge('still', 'motion'),
  makeEdge('motion', 'delivery'),
];

interface HeroGraphProps {
  onOpen: () => void;
}

export function HeroGraph({ onOpen }: HeroGraphProps) {
  return (
    <div className="hero-graph">
      <div className="hero-graph__chrome">
        <div>
          <span className="eyebrow">WORKFLOW / 004</span>
          <strong>Product launch</strong>
        </div>
        <button className="button button--ghost button--small" onClick={onOpen}>
          Open
          <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="hero-graph__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.08, minZoom: 0.1 }}
          minZoom={0.1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} size={1.2} color="var(--grid-dot)" />
        </ReactFlow>
      </div>
      <div className="hero-graph__footer">
        <span><i className="status-dot status-dot--live" /> ComfyUI pipeline</span>
        <span>4 nodes</span>
      </div>
    </div>
  );
}

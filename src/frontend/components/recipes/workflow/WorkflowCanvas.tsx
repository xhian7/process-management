import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '../../../lib/utils';
import type { HierarchyNode } from './types';
import { HIERARCHY_LABELS } from './types';

/* ------------------------------------------------------------------ */
/* Custom block node                                                   */
/* ------------------------------------------------------------------ */

interface BlockData extends Record<string, unknown> {
  label: string;
  nodeType: string;
}

function BlockNode({ data, selected }: { data: BlockData; selected?: boolean }) {
  return (
    <div
      className={cn(
        'px-6 py-3 rounded-lg border-2 bg-card text-card-foreground shadow-sm min-w-[180px] text-center transition-colors',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      <div className="text-sm font-medium">{data.label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {HIERARCHY_LABELS[data.nodeType as keyof typeof HIERARCHY_LABELS] ?? data.nodeType}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  block: BlockNode,
};

/* ------------------------------------------------------------------ */
/* Canvas component                                                    */
/* ------------------------------------------------------------------ */

interface WorkflowCanvasProps {
  /** Children of the currently selected hierarchy node */
  children: HierarchyNode[];
}

const NODE_GAP_Y = 120;
const START_Y = 40;
const CENTER_X = 300;

export function WorkflowCanvas({ children }: WorkflowCanvasProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = children.map((child, index) => ({
      id: child.id,
      type: 'block',
      position: { x: CENTER_X, y: START_Y + index * NODE_GAP_Y },
      data: { label: child.name, nodeType: child.type },
    }));

    const edges: Edge[] = [];
    for (let i = 0; i < children.length - 1; i++) {
      const source = children[i]!;
      const target = children[i + 1]!;
      edges.push({
        id: `e-${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        type: 'smoothstep',
        animated: false,
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [children]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Keep nodes/edges in sync when children change
  // (useNodesState caches initial values, so we re-key via the parent)

  if (children.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No child elements yet. Click <strong>Add Element</strong> to get started.</p>
      </div>
    );
  }

  return (
    <ReactFlow
      key={children.map((c) => c.id).join(',')}
      nodes={initialNodes}
      edges={initialEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
      maxZoom={1.5}
    >
      <Background gap={16} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

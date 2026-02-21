import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  type Node,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { HierarchyNode, CanvasLevelState } from './types';
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
        'px-6 py-3 rounded-lg border-2 bg-card text-card-foreground shadow-sm min-w-[180px] text-center transition-colors cursor-grab active:cursor-grabbing',
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

const nodeTypes: NodeTypes = { block: BlockNode };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const NODE_GAP_Y = 120;
const START_Y = 40;
const CENTER_X = 300;

function buildInitialNodes(
  allChildren: HierarchyNode[],
  initialState: CanvasLevelState | undefined,
): Node[] {
  if (!initialState) return [];
  return allChildren
    .filter((c) => initialState.placedIds.includes(c.id))
    .map((c, idx) => ({
      id: c.id,
      type: 'block',
      position: initialState.nodePositions[c.id] ?? { x: CENTER_X, y: START_Y + idx * NODE_GAP_Y },
      data: { label: c.name, nodeType: c.type },
    }));
}

function buildInitialEdges(
  initialState: CanvasLevelState | undefined,
): Edge[] {
  if (!initialState) return [];
  return initialState.edges.map((e) => ({ ...e, type: 'smoothstep' }));
}

/* ------------------------------------------------------------------ */
/* Canvas component                                                    */
/* ------------------------------------------------------------------ */

export interface WorkflowCanvasProps {
  /** All children of the currently selected hierarchy node. */
  allChildren: HierarchyNode[];
  /** Persisted canvas state for this level (undefined = never opened). */
  initialState: CanvasLevelState | undefined;
  /** Called whenever nodes, edges, or placedIds change. */
  onStateChange: (state: CanvasLevelState) => void;
}

export function WorkflowCanvas({ allChildren, initialState, onStateChange }: WorkflowCanvasProps) {
  const [nodes, setNodes] = useNodesState(buildInitialNodes(allChildren, initialState));
  const [edges, setEdges] = useEdgesState(buildInitialEdges(initialState));

  // The set of ids currently placed on the canvas
  const [placedIds, setPlacedIds] = useState<string[]>(
    () => initialState?.placedIds ?? [],
  );

  // Unplaced items: children not yet on canvas
  const unplaced = useMemo(
    () => allChildren.filter((c) => !placedIds.includes(c.id)),
    [allChildren, placedIds],
  );

  // Propagate changes up to WorkflowEditor
  const emitState = useCallback(
    (currentNodes: Node[], currentEdges: Edge[], currentPlacedIds: string[]) => {
      const nodePositions: Record<string, { x: number; y: number }> = {};
      for (const n of currentNodes) nodePositions[n.id] = n.position;
      onStateChange({
        placedIds: currentPlacedIds,
        nodePositions,
        edges: currentEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      });
    },
    [onStateChange],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        emitState(next, edges, placedIds);
        return next;
      });
    },
    [edges, placedIds, emitState, setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        emitState(nodes, next, placedIds);
        return next;
      });
    },
    [nodes, placedIds, emitState, setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, type: 'smoothstep' }, eds);
        emitState(nodes, next, placedIds);
        return next;
      });
    },
    [nodes, placedIds, emitState, setEdges],
  );

  // Place an element from the panel onto the canvas
  const handlePlace = useCallback(
    (child: HierarchyNode) => {
      const newPlacedIds = [...placedIds, child.id];
      const newNode: Node = {
        id: child.id,
        type: 'block',
        position: { x: CENTER_X, y: START_Y + nodes.length * NODE_GAP_Y },
        data: { label: child.name, nodeType: child.type },
      };
      setNodes((nds) => {
        const next = [...nds, newNode];
        emitState(next, edges, newPlacedIds);
        return next;
      });
      setPlacedIds(newPlacedIds);
    },
    [placedIds, nodes.length, edges, emitState, setNodes],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.35 }}
      nodesDraggable
      nodesConnectable
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background gap={16} size={1} />
      <Controls />

      {/* Floating panel — unplaced elements */}
      {unplaced.length > 0 && (
        <Panel position="top-left">
          <div className="bg-card border border-border rounded-lg shadow-md w-56 overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Unplaced elements
              </p>
            </div>
            <ul className="divide-y divide-border">
              {unplaced.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium truncate">{child.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {HIERARCHY_LABELS[child.type]}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePlace(child)}
                    title="Add to canvas"
                    className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}

      {/* Empty state (no children at all) */}
      {allChildren.length === 0 && (
        <Panel position="top-center">
          <p className="text-sm text-muted-foreground bg-card/80 px-4 py-2 rounded-full border border-border shadow-sm">
            No child elements yet. Use <strong>Add Element</strong> above.
          </p>
        </Panel>
      )}
    </ReactFlow>
  );
}

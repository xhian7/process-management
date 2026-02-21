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
import type { HierarchyNode, CanvasLevelState, TerminalNodeState, TerminalKind } from './types';
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

const nodeTypes: NodeTypes = { block: BlockNode, terminal: TerminalNode };

/* ------------------------------------------------------------------ */
/* Terminal node (Begin / End)                                         */
/* ------------------------------------------------------------------ */

interface TerminalData extends Record<string, unknown> {
  kind: TerminalKind;
}

function TerminalNode({ data, selected }: { data: TerminalData; selected?: boolean }) {
  const isBegin = data.kind === 'begin';
  return (
    <div
      className={cn(
        'px-5 py-2 rounded-full border-2 shadow-sm text-sm font-semibold text-center min-w-[100px] transition-colors',
        isBegin
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted text-muted-foreground border-border',
        selected && 'ring-2 ring-primary/30',
      )}
    >
      {!isBegin && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}
      {isBegin ? 'Begin' : 'End'}
      {isBegin && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary"
        />
      )}
    </div>
  );
}

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
  const placed = allChildren
    .filter((c) => initialState?.placedIds.includes(c.id))
    .map((c, idx) => ({
      id: c.id,
      type: 'block',
      position: initialState!.nodePositions[c.id] ?? { x: CENTER_X, y: START_Y + idx * NODE_GAP_Y },
      data: { label: c.name, nodeType: c.type },
    }));

  const terminals: Node[] = (initialState?.terminalNodes ?? []).map((t) => ({
    id: t.id,
    type: 'terminal',
    position: t.position,
    data: { kind: t.kind },
    deletable: false,
  }));

  return [...terminals, ...placed];
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

  // Terminal node ids (Begin/End) — stable per canvas level
  const terminalIds = useMemo(
    () => new Set((initialState?.terminalNodes ?? []).map((t) => t.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
      const updatedTerminalNodes: TerminalNodeState[] = [];

      for (const n of currentNodes) {
        if (terminalIds.has(n.id)) {
          // Update terminal node position
          updatedTerminalNodes.push({
            id: n.id,
            kind: (n.data as TerminalData).kind as TerminalKind,
            position: n.position,
          });
        } else {
          nodePositions[n.id] = n.position;
        }
      }

      onStateChange({
        placedIds: currentPlacedIds,
        nodePositions,
        edges: currentEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        terminalNodes: updatedTerminalNodes,
      });
    },
    [onStateChange, terminalIds],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const next = applyNodeChanges(changes, nodes);
      setNodes(next);
      emitState(next, edges, placedIds);
    },
    [nodes, edges, placedIds, emitState, setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, edges);
      setEdges(next);
      emitState(nodes, next, placedIds);
    },
    [nodes, edges, placedIds, emitState, setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const next = addEdge({ ...connection, type: 'smoothstep' }, edges);
      setEdges(next);
      emitState(nodes, next, placedIds);
    },
    [nodes, edges, placedIds, emitState, setEdges],
  );

  // Place an element from the panel onto the canvas
  const handlePlace = useCallback(
    (child: HierarchyNode) => {
      const newPlacedIds = [...placedIds, child.id];
      // Position in the middle (between Begin and End)
      const placedBlockCount = nodes.filter((n) => !terminalIds.has(n.id)).length;
      const newNode: Node = {
        id: child.id,
        type: 'block',
        position: { x: CENTER_X - 90, y: START_Y + 120 + placedBlockCount * NODE_GAP_Y },
        data: { label: child.name, nodeType: child.type },
      };
      const next = [...nodes, newNode];
      setNodes(next);
      setPlacedIds(newPlacedIds);
      emitState(next, edges, newPlacedIds);
    },
    [placedIds, nodes, terminalIds, edges, emitState, setNodes],
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

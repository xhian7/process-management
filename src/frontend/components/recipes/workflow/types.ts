// Shared types for the workflow editor

export type HierarchyNodeType =
  | 'RECIPE'
  | 'PROCEDURE'
  | 'UNIT_PROCEDURE'
  | 'OPERATION'
  | 'PHASE';

export interface HierarchyNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  children: HierarchyNode[];
}

// ISA88: which child type does each level produce?
export const ISA88_CHILD_TYPE: Record<HierarchyNodeType, HierarchyNodeType | null> = {
  RECIPE: 'PROCEDURE',
  PROCEDURE: 'UNIT_PROCEDURE',
  UNIT_PROCEDURE: 'OPERATION',
  OPERATION: 'PHASE',
  PHASE: null, // phases are leaf nodes
};

export const HIERARCHY_LABELS: Record<HierarchyNodeType, string> = {
  RECIPE: 'Recipe',
  PROCEDURE: 'Procedure',
  UNIT_PROCEDURE: 'Unit Procedure',
  OPERATION: 'Operation',
  PHASE: 'Phase',
};

/* ------------------------------------------------------------------ */
/* Canvas state (per parent level)                                     */
/* ------------------------------------------------------------------ */

/**
 * Snapshot of a single canvas level (children of one parent node).
 * Stored in WorkflowEditor keyed by parentId.
 */
export interface CanvasLevelState {
  /** XYFlow node ids that the user has dragged onto the canvas. */
  placedIds: string[];
  /** Actual positions of placed nodes as edited by the user. */
  nodePositions: Record<string, { x: number; y: number }>;
  /** Edges as drawn by the user. */
  edges: { id: string; source: string; target: string }[];
}

/* ------------------------------------------------------------------ */
/* procedureLogic persistence types                                    */
/* ------------------------------------------------------------------ */

/** Flat representation of a single node stored in the DB. */
export interface WorkflowNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  /** Id of the parent node; null for the recipe root. */
  parentId: string | null;
  /** Zero-based order among siblings. */
  order: number;
  /** Last-known XYFlow position. */
  position: { x: number; y: number };
  /** Whether the node has been placed on the canvas by the user. */
  placed: boolean;
}

/** Edge stored in the DB. */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface ProcedureLogicWorkflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ProcedureLogic {
  workflow: ProcedureLogicWorkflow;
  externalElements: unknown[];
}

// Layout constants — kept in sync with WorkflowCanvas
const NODE_GAP_Y = 120;
const START_Y = 40;
const CENTER_X = 300;

/* ------------------------------------------------------------------ */
/* Serialisation: tree + canvas state → ProcedureLogicWorkflow        */
/* ------------------------------------------------------------------ */

/**
 * Flatten the HierarchyNode tree into a ProcedureLogicWorkflow.
 * `canvasStateMap` holds the actual positions/edges/placedIds keyed by parentId.
 */
export function treeToWorkflow(
  root: HierarchyNode,
  canvasStateMap: Record<string, CanvasLevelState> = {},
): ProcedureLogicWorkflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  function visit(node: HierarchyNode, parentId: string | null, siblingOrder: number) {
    const parentCanvas = parentId !== null ? canvasStateMap[parentId] : null;
    const placed =
      parentId === null || (parentCanvas?.placedIds.includes(node.id) ?? false);
    const position =
      parentCanvas?.nodePositions[node.id] ?? {
        x: CENTER_X,
        y: START_Y + siblingOrder * NODE_GAP_Y,
      };

    nodes.push({ id: node.id, name: node.name, type: node.type, parentId, order: siblingOrder, position, placed });

    // Edges at this level come from this node's own canvas state
    const ownCanvas = canvasStateMap[node.id];
    if (ownCanvas) {
      for (const e of ownCanvas.edges) {
        edges.push({ id: e.id, source: e.source, target: e.target });
      }
    }

    node.children.forEach((child, idx) => visit(child, node.id, idx));
  }

  visit(root, null, 0);
  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/* Deserialisation: ProcedureLogicWorkflow → tree + canvas state      */
/* ------------------------------------------------------------------ */

/** Rebuild the HierarchyNode tree from a persisted ProcedureLogicWorkflow. */
export function workflowToTree(
  workflow: ProcedureLogicWorkflow,
  rootId: string,
): HierarchyNode | null {
  const byId = new Map<string, WorkflowNode>();
  for (const n of workflow.nodes) byId.set(n.id, n);

  const rootFlat = byId.get(rootId);
  if (!rootFlat) return null;

  function buildNode(flat: WorkflowNode): HierarchyNode {
    const children = workflow.nodes
      .filter((n) => n.parentId === flat.id)
      .sort((a, b) => a.order - b.order)
      .map(buildNode);
    return { id: flat.id, name: flat.name, type: flat.type, children };
  }

  return buildNode(rootFlat);
}

/**
 * Rebuild the CanvasLevelState map from a persisted ProcedureLogicWorkflow.
 * Keyed by parent node id.
 */
export function workflowToCanvasStateMap(
  workflow: ProcedureLogicWorkflow,
): Record<string, CanvasLevelState> {
  const map: Record<string, CanvasLevelState> = {};

  for (const wn of workflow.nodes) {
    if (wn.parentId === null) continue;
    if (!map[wn.parentId]) {
      map[wn.parentId] = { placedIds: [], nodePositions: {}, edges: [] };
    }
    const levelState = map[wn.parentId]!;
    if (wn.placed) {
      levelState.placedIds.push(wn.id);
      levelState.nodePositions[wn.id] = wn.position;
    }
  }

  const nodeParent = new Map<string, string>();
  for (const wn of workflow.nodes) {
    if (wn.parentId !== null) nodeParent.set(wn.id, wn.parentId);
  }
  for (const we of workflow.edges) {
    const parentId = nodeParent.get(we.source);
    if (!parentId) continue;
    if (!map[parentId]) {
      map[parentId] = { placedIds: [], nodePositions: {}, edges: [] };
    }
    map[parentId]!.edges.push({ id: we.id, source: we.source, target: we.target });
  }

  return map;
}

/* ------------------------------------------------------------------ */
/* Tree helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Find a node by id in the tree (DFS).
 * Returns the node or null.
 */
export function findNode(root: HierarchyNode, id: string): HierarchyNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Build the path (breadcrumb) from root to the node with the given id.
 */
export function buildPath(
  root: HierarchyNode,
  targetId: string,
  current: HierarchyNode[] = [],
): HierarchyNode[] | null {
  const path = [...current, root];
  if (root.id === targetId) return path;
  for (const child of root.children) {
    const result = buildPath(child, targetId, path);
    if (result) return result;
  }
  return null;
}

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
/* procedureLogic persistence types                                    */
/* ------------------------------------------------------------------ */

/** Flat representation of a single node in the XYFlow graph. */
export interface WorkflowNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  /** Id of the parent node; null for the recipe root. */
  parentId: string | null;
  /** Zero-based order among siblings — defines the vertical sequence. */
  order: number;
  /** Pre-computed XYFlow position (vertical layout). */
  position: { x: number; y: number };
}

/** Edge between two consecutive siblings in the XYFlow graph. */
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

/**
 * Flatten the HierarchyNode tree into a ProcedureLogicWorkflow ready to
 * be persisted in the `procedureLogic` JSON column.
 */
export function treeToWorkflow(root: HierarchyNode): ProcedureLogicWorkflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  function visit(node: HierarchyNode, parentId: string | null, order: number) {
    nodes.push({
      id: node.id,
      name: node.name,
      type: node.type,
      parentId,
      order,
      position: { x: CENTER_X, y: START_Y + order * NODE_GAP_Y },
    });

    // Edges: connect consecutive siblings
    for (let i = 0; i < node.children.length - 1; i++) {
      const source = node.children[i]!;
      const target = node.children[i + 1]!;
      edges.push({
        id: `e-${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
      });
    }

    node.children.forEach((child, idx) => visit(child, node.id, idx));
  }

  visit(root, null, 0);
  return { nodes, edges };
}

/**
 * Rebuild the HierarchyNode tree from a persisted ProcedureLogicWorkflow.
 * The root is identified by id matching `rootId`.
 */
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

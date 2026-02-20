import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { HierarchyTree } from './HierarchyTree';
import { WorkflowCanvas } from './WorkflowCanvas';
import {
  type HierarchyNode,
  type HierarchyNodeType,
  type ProcedureLogic,
  ISA88_CHILD_TYPE,
  HIERARCHY_LABELS,
  findNode,
  buildPath,
  treeToWorkflow,
  workflowToTree,
} from './types';
import { recipeApi } from '../../../services/recipeApi';

/* ------------------------------------------------------------------ */
/* Helper: generate a simple unique id                                 */
/* ------------------------------------------------------------------ */
let counter = 0;
function generateId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/* ------------------------------------------------------------------ */
/* WorkflowEditor                                                      */
/* ------------------------------------------------------------------ */

export function WorkflowEditor() {
  const { id: recipeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --------------- state ---------------
  const [tree, setTree] = useState<HierarchyNode | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-element form
  const [isAdding, setIsAdding] = useState(false);
  const [newElementId, setNewElementId] = useState('');
  const [newElementName, setNewElementName] = useState('');

  // --------------- load recipe ---------------
  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      try {
        setLoading(true);
        const recipe = await recipeApi.getById(recipeId);

        let root: HierarchyNode;

        // Restore tree from persisted procedureLogic if available
        if (
          recipe.procedureLogic?.workflow &&
          recipe.procedureLogic.workflow.nodes.length > 0
        ) {
          const restored = workflowToTree(recipe.procedureLogic.workflow, recipe.id);
          root = restored ?? {
            id: recipe.id,
            name: recipe.name,
            type: 'RECIPE',
            children: [],
          };
        } else {
          root = {
            id: recipe.id,
            name: recipe.name,
            type: 'RECIPE',
            children: [],
          };
        }

        setTree(root);
        setSelectedId(root.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    })();
  }, [recipeId]);

  // --------------- derived state ---------------
  const selectedNode = tree ? findNode(tree, selectedId) : null;
  const breadcrumbs = tree && selectedId ? buildPath(tree, selectedId) ?? [] : [];
  const childType = selectedNode ? ISA88_CHILD_TYPE[selectedNode.type] : null;
  const canAddChild = childType !== null;

  // --------------- handlers ---------------
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setIsAdding(false);
  }, []);

  const handleStartAdd = () => {
    if (!canAddChild || !childType) return;
    setNewElementId('');
    setNewElementName('');
    setIsAdding(true);
  };

  const handleConfirmAdd = () => {
    if (!tree || !selectedNode || !childType) return;
    if (!newElementId.trim() || !newElementName.trim()) return;

    const newChild: HierarchyNode = {
      id: newElementId.trim(),
      name: newElementName.trim(),
      type: childType,
      children: [],
    };

    // Deep-clone tree and insert child
    const updatedTree = cloneAndInsert(tree, selectedId, newChild);
    setTree(updatedTree);
    setIsAdding(false);
    setNewElementId('');
    setNewElementName('');
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!tree) return;
    try {
      setSaving(true);

      const procedureLogic: ProcedureLogic = {
        workflow: treeToWorkflow(tree),
        externalElements: [],
      };

      await recipeApi.update(tree.id, { procedureLogic });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  // --------------- rendering ---------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive">{error ?? 'Recipe not found'}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* ============== HEADER ============== */}
      <header className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: back + breadcrumbs + title */}
          <div className="flex flex-col gap-1.5">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-xs text-muted-foreground">
              <button
                onClick={() => navigate(`/app/recipes/${recipeId}/edit`)}
                className="hover:text-foreground transition-colors"
              >
                Recipes
              </button>
              {breadcrumbs.map((node, idx) => (
                <span key={node.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  <button
                    onClick={() => handleSelect(node.id)}
                    className={
                      idx === breadcrumbs.length - 1
                        ? 'text-foreground font-medium'
                        : 'hover:text-foreground transition-colors'
                    }
                  >
                    {node.name}
                  </button>
                </span>
              ))}
            </nav>

            {/* Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {selectedNode?.name ?? tree.name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {selectedNode ? HIERARCHY_LABELS[selectedNode.type] : 'Recipe'}
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/recipes/${recipeId}/edit`)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            {canAddChild && (
              <Button size="sm" onClick={handleStartAdd} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add {HIERARCHY_LABELS[childType!]}
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Add element inline form */}
        {isAdding && childType && (
          <div className="mt-4 flex items-end gap-3 p-4 rounded-lg border border-border bg-muted/50">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {HIERARCHY_LABELS[childType]} ID
              </Label>
              <Input
                value={newElementId}
                onChange={(e) => setNewElementId(e.target.value)}
                placeholder={`E.g., ${childType.substring(0, 3)}-001`}
                className="h-8 w-48"
                autoFocus
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={newElementName}
                onChange={(e) => setNewElementName(e.target.value)}
                placeholder={`${HIERARCHY_LABELS[childType]} name`}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmAdd();
                  if (e.key === 'Escape') handleCancelAdd();
                }}
              />
            </div>
            <Button size="sm" onClick={handleConfirmAdd} disabled={!newElementId.trim() || !newElementName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelAdd}>
              Cancel
            </Button>
          </div>
        )}
      </header>

      {/* ============== BODY (tree + canvas) ============== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: hierarchy tree */}
        <aside className="w-72 shrink-0 border-r border-border bg-card overflow-auto">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Hierarchy
            </h2>
          </div>
          <HierarchyTree root={tree} selectedId={selectedId} onSelect={handleSelect} />
        </aside>

        {/* Right: canvas */}
        <div className="flex-1 overflow-hidden">
          <WorkflowCanvas children={selectedNode?.children ?? []} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Immutable tree helper                                               */
/* ------------------------------------------------------------------ */

function cloneAndInsert(
  node: HierarchyNode,
  parentId: string,
  newChild: HierarchyNode,
): HierarchyNode {
  if (node.id === parentId) {
    return { ...node, children: [...node.children, newChild] };
  }
  return {
    ...node,
    children: node.children.map((child) => cloneAndInsert(child, parentId, newChild)),
  };
}

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Save, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { HierarchyTree } from './HierarchyTree';
import { WorkflowCanvas } from './WorkflowCanvas';
import {
  type HierarchyNode,
  type HierarchyNodeType,
  type ProcedureLogic,
  type CanvasLevelState,
  ISA88_CHILD_TYPE,
  HIERARCHY_LABELS,
  findNode,
  buildPath,
  treeToWorkflow,
  workflowToTree,
  workflowToCanvasStateMap,
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
  // Canvas state per parent node id
  const [canvasStateMap, setCanvasStateMap] = useState<Record<string, CanvasLevelState>>({});
  // Snapshot of last saved state for dirty tracking
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  // Controls the "unsaved changes" exit dialog
  const [showExitDialog, setShowExitDialog] = useState(false);

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
          // Restore canvas state map
          setCanvasStateMap(workflowToCanvasStateMap(recipe.procedureLogic.workflow));
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
        // Capture initial snapshot for dirty detection
        const initialCSM = recipe.procedureLogic?.workflow && recipe.procedureLogic.workflow.nodes.length > 0
          ? workflowToCanvasStateMap(recipe.procedureLogic.workflow)
          : {};
        setSavedSnapshot(JSON.stringify({ tree: root, canvasStateMap: initialCSM }));
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

  const isDirty = useMemo(() => {
    if (!tree || !savedSnapshot) return false;
    return JSON.stringify({ tree, canvasStateMap }) !== savedSnapshot;
  }, [tree, canvasStateMap, savedSnapshot]);

  // --------------- handlers ---------------
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setIsAdding(false);
  }, []);

  const handleCanvasStateChange = useCallback(
    (parentId: string, state: CanvasLevelState) => {
      setCanvasStateMap((prev) => ({ ...prev, [parentId]: state }));
    },
    [],
  );

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
    if (!tree || !isDirty) return;
    try {
      setSaving(true);
      const procedureLogic: ProcedureLogic = {
        workflow: treeToWorkflow(tree, canvasStateMap),
        externalElements: [],
      };
      await recipeApi.update(tree.id, { procedureLogic });
      setSavedSnapshot(JSON.stringify({ tree, canvasStateMap }));
      toast.success('Workflow saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      navigate(`/app/recipes/${recipeId}/edit`);
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
            {canAddChild && (
              <Button size="sm" onClick={handleStartAdd} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add {HIERARCHY_LABELS[childType!]}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExit}
              className="gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Exit
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

      {/* ============== EXIT CONFIRMATION DIALOG ============== */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the workflow. If you exit now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => navigate(`/app/recipes/${recipeId}/edit`)}
            >
              Exit without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

        {/* Right: canvas — keyed by selectedId so it resets when level changes */}
        <div className="flex-1 overflow-hidden">
          <WorkflowCanvas
            key={selectedId}
            allChildren={selectedNode?.children ?? []}
            initialState={canvasStateMap[selectedId]}
            onStateChange={(state) => handleCanvasStateChange(selectedId, state)}
          />
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

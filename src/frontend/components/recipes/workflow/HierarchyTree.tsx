import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import type { HierarchyNode } from './types';
import { HIERARCHY_LABELS } from './types';

interface HierarchyTreeProps {
  root: HierarchyNode;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function HierarchyTree({ root, selectedId, onSelect }: HierarchyTreeProps) {
  return (
    <div className="h-full overflow-auto p-3">
      <TreeNode node={root} selectedId={selectedId} onSelect={onSelect} depth={0} />
    </div>
  );
}

interface TreeNodeProps {
  node: HierarchyNode;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
}

function TreeNode({ node, selectedId, onSelect, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;
  const isLeaf = node.type === 'PHASE';

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={cn(
          'flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-md text-sm transition-all border border-transparent',
          'hover:border-border hover:bg-transparent',
          isSelected
            ? 'bg-primary/10 border-primary/30 text-foreground font-medium'
            : 'text-foreground/80',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand / collapse chevron */}
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4 h-4 shrink-0" /> // spacer
        )}

        {/* Icon */}
        {isLeaf ? (
          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
        )}

        {/* Label */}
        <span className="truncate">{node.name}</span>
        <span className={cn(
          'ml-auto text-xs shrink-0 px-1.5 py-0.5 rounded',
          isSelected
            ? 'bg-primary/15 text-primary/80'
            : 'text-muted-foreground',
        )}>
          {HIERARCHY_LABELS[node.type]}
        </span>
      </button>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import type { DriverTreeNode } from './useFetchDriverTree';
import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';

interface FlowResult {
  nodes: Node[];
  edges: Edge[];
}

const LEVEL_COLORS = [
  'bg-blue-100 border-blue-400',
  'bg-green-100 border-green-400',
  'bg-yellow-100 border-yellow-400',
  'bg-red-100 border-red-400',
];

function getNodeStyle(level: number) {
  return LEVEL_COLORS[level] || 'bg-gray-100 border-gray-400';
}

function traverse(
  node: DriverTreeNode,
  x: number,
  y: number,
  level: number,
  nodes: Node[],
  edges: Edge[],
  parentId?: string,
  siblingIndex: number = 0,
  siblingsCount: number = 1,
) {
  const width = 220;
  const height = 80;
  const verticalGap = 120;
  const horizontalGap = 40;

  // Calculate x based on sibling index for horizontal spread
  const nodeX = x + (siblingIndex - (siblingsCount - 1) / 2) * (width + horizontalGap);
  const nodeY = y + level * (height + verticalGap);

  nodes.push({
    id: node.id,
    type: 'default',
    data: {
      label: node.label,
      value: node.value,
      numOfAcc: node.numOfAcc,
      level: node.level,
      style: getNodeStyle(node.level),
    },
    position: { x: nodeX, y: nodeY },
    style: { width, height },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  });

  if (parentId) {
    edges.push({
      id: `${parentId}->${node.id}`,
      source: parentId,
      target: node.id,
      animated: false,
      style: { strokeWidth: 2 },
    });
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((child, idx) => {
      traverse(
        child,
        nodeX,
        nodeY + height + verticalGap,
        level + 1,
        nodes,
        edges,
        node.id,
        idx,
        node.children!.length,
      );
    });
  }
}

export function useParseTreeToFlow(tree: DriverTreeNode | null): FlowResult {
  return useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    traverse(tree, 0, 0, 0, nodes, edges);
    return { nodes, edges };
  }, [tree]);
}

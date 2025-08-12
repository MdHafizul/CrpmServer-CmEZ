import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Card from '../../ui/Card';
import { useAppContext } from '../../../context/AppContext';
import Skeleton from '../../ui/Skeleton';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  Position,
} from 'reactflow';
import type { Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFetchDriverTree } from './useFetchDriverTree';
import { formatCurrency } from '../../../utils/formatter';
import { getDriverTreeSummary } from '../../../services/api';
import type { DriverTreeApiResponse } from '../../../types/dashboard.type';

const nodeClass =
  'rounded-lg border-2 shadow-md flex flex-col items-center justify-center cursor-pointer transition-all duration-200';

const tooltipClass =
  'fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[220px]';

interface DriverTreeProps {
  mitAmount?: number;
}

const GOVERNMENT_CLASSES = ['LPCG', 'OPCG'];
const NON_GOVERNMENT_CLASSES = ['LPCN', 'OPCN'];

// Group account classes under government/non-government for each status branch (Active/Inactive)
function groupAccountClasses(statusBranch: any) {
  const government = statusBranch.children.filter((c: any) => GOVERNMENT_CLASSES.includes(c.name));
  const nonGovernment = statusBranch.children.filter((c: any) => NON_GOVERNMENT_CLASSES.includes(c.name));

  const sum = (arr: any[], key: string) => arr.reduce((acc, cur) => acc + (cur[key] || 0), 0);

  return [
    {
      name: 'Government',
      value: sum(government, 'value'),
      numOfAcc: sum(government, 'numOfAcc'),
      level: 2,
      children: government
    },
    {
      name: 'Non-Government',
      value: sum(nonGovernment, 'value'),
      numOfAcc: sum(nonGovernment, 'numOfAcc'),
      level: 2,
      children: nonGovernment
    }
  ];
}

const DRIVER_TREE_CACHE_KEY = 'driverTreeChartCache';
const DRIVER_TREE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function setDriverTreeCache(fileName: string, data: any) {
  if (!fileName) return;
  const cacheObj = {
    value: data,
    expires: Date.now() + DRIVER_TREE_CACHE_TTL_MS
  };
  localStorage.setItem(`${DRIVER_TREE_CACHE_KEY}:${fileName}`, JSON.stringify(cacheObj));
}

function getDriverTreeCache(fileName: string): any | null {
  if (!fileName) return null;
  const raw = localStorage.getItem(`${DRIVER_TREE_CACHE_KEY}:${fileName}`);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj.expires && obj.expires > Date.now()) {
      return obj.value;
    } else {
      localStorage.removeItem(`${DRIVER_TREE_CACHE_KEY}:${fileName}`);
      return null;
    }
  } catch {
    localStorage.removeItem(`${DRIVER_TREE_CACHE_KEY}:${fileName}`);
    return null;
  }
}

function parseTree(
  node: any,
  path: string[] = [],
): any {
  const id = [...path, node.name].join('-');
  let children = node.children;
  if (node.level === 1 && Array.isArray(node.children)) {
    children = groupAccountClasses(node);
  }
  return {
    id,
    label: node.name,
    value: node.value,
    numOfAcc: node.numOfAcc,
    level: node.level,
    children: children?.map((child: any) =>
      parseTree(child, [...path, node.name])
    ),
  };
}

// Helper to check if all children are leaves (for AG/CM/DM/IN/SL/MN breakdown)
function allChildrenAreLeaves(node: any): boolean {
  return (
    node.children &&
    node.children.length > 0 &&
    node.children.every((child: any) => !child.children || child.children.length === 0)
  );
}

// Horizontal layout for React Flow nodes/edges
function useParseTreeToFlow(tree: any) {
  return useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const width = 220;
    const height = 80;
    const horizontalGap = 120;
    const verticalGap = 40;

    // Assign y positions for all leaves, and center parents above their children
    let leafY = 0;
    function traverse(
      node: any,
      level: number,
      parentId?: string
    ): { minY: number; maxY: number } {
      let minY = 0, maxY = 0, nodeY = 0;

      if (!node.children || node.children.length === 0) {
        // This is a leaf node
        nodeY = leafY;
        leafY += height + verticalGap;
        minY = maxY = nodeY;
      } else if (allChildrenAreLeaves(node)) {
        // All children are leaves: arrange them horizontally as siblings
        // Place all children in a horizontal row, spaced horizontally
        const baseY = leafY;
        const childY = baseY;
        const startX = (level + 1) * (width + horizontalGap);
        node.children.forEach((child: any, idx: number) => {
          const childX = startX + idx * (width + horizontalGap);
          nodes.push({
            id: child.id,
            type: 'default',
            data: {
              label: child.label,
              value: child.value,
              numOfAcc: child.numOfAcc,
              level: child.level,
              style: getNodeStyle(child.level),
            },
            position: { x: childX, y: childY },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });
          edges.push({
            id: `${node.id}->${child.id}`,
            source: node.id,
            target: child.id,
            animated: false,
            style: { strokeWidth: 2 },
          });
        });
        // Parent node Y is aligned with its children
        minY = childY;
        maxY = childY;
        nodeY = childY;
        // After this row, move leafY down for the next group
        leafY += height + verticalGap;
      } else {
        // Traverse children and center this node above them
        let childYs: number[] = [];
        node.children.forEach((child: any) => {
          const { minY: cMin, maxY: cMax } = traverse(child, level + 1, node.id);
          childYs.push((cMin + cMax) / 2);
        });
        minY = Math.min(...childYs);
        maxY = Math.max(...childYs);
        nodeY = (minY + maxY) / 2;
      }

      const nodeX = level * (width + horizontalGap);

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
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
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

      return { minY, maxY };
    }

    function getNodeStyle(level: number) {
      switch (level) {
        case 0: return 'bg-blue-100 border-blue-400';
        case 1: return 'bg-green-100 border-green-400';
        case 2: return 'bg-yellow-100 border-yellow-400';
        case 3: return 'bg-red-100 border-red-400';
        default: return 'bg-gray-100 border-gray-400';
      }
    }

    traverse(tree, 0);
    return { nodes, edges };
  }, [tree]);
}

const DriverTree: React.FC<DriverTreeProps> = ({ mitAmount = 0 }) => {
  const { parquetFileName } = useAppContext();
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mitInfo, setMitInfo] = useState<{ mitAmount: number; mitNumOfAcc: number }>({ mitAmount: 0, mitNumOfAcc: 0 });
  const reactFlowRef = React.useRef<any>(null);

  // Expose fitView method for export
  useEffect(() => {
    // @ts-ignore
    window.__fitDriverTreeView = () => {
      if (reactFlowRef.current && reactFlowRef.current.fitView) {
        reactFlowRef.current.fitView();
      }
    };
    return () => {
      // @ts-ignore
      delete window.__fitDriverTreeView;
    };
  }, []);

  useEffect(() => {
    if (!parquetFileName) return;
    setLoading(true);
    setError(null);
    getDriverTreeSummary(parquetFileName)
      .then((res: DriverTreeApiResponse) => {
        if (res.data?.root && Array.isArray(res.data?.branches)) {
          const root = {
            ...res.data.root,
            children: res.data.branches,
          };
          // Parse the tree into the expected format
          setTree(parseTree(root));
        } else {
          setError('No root/branches found');
        }
        setDriverTreeCache(parquetFileName, res.data);
        if (res.data && typeof res.data.mitAmount === 'number' && typeof res.data.mitNumOfAcc === 'number') {
          setMitInfo({
            mitAmount: res.data.mitAmount,
            mitNumOfAcc: res.data.mitNumOfAcc
          });
        }
      })
      .catch(() => setError('Failed to fetch driver tree'))
      .finally(() => setLoading(false));
  }, [parquetFileName]);

  const { nodes, edges } = useParseTreeToFlow(tree);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setTooltipPos({ x: node.position.x + 250, y: node.position.y + 100 });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setTooltipPos(null);
  }, []);

  return (
    <Card title="Driver Tree By Account Class">
      <div className="flex justify-between items-center mb-6">
        <div className="text-xs text-gray-500">
          Driver Tree rendered with React Flow
        </div>
      </div>
      <div className="relative min-h-[600px] bg-gradient-to-r from-gray-50 to-white rounded-lg">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
            <Skeleton height={400} width="90%" className="rounded-xl mx-auto" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96 text-red-500 font-bold">
            {error}
          </div>
        ) : (
          <div className="w-full h-[600px]">
            <ReactFlow
              ref={reactFlowRef}
              nodes={nodes.map((n) => ({
                ...n,
                className: `${nodeClass} ${n.data.style}`,
                data: {
                  ...n.data,
                  label: (
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-base">{n.data.label}</span>
                      <span className="text-xs text-gray-600">
                        {formatCurrency(n.data.value, 0, 0)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {n.data.numOfAcc.toLocaleString()} accounts
                      </span>
                    </div>
                  ),
                },
              }))}
              edges={edges}
              fitView
              minZoom={0.2}
              maxZoom={2}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              panOnScroll
              zoomOnScroll
              panOnDrag
              selectionOnDrag
              defaultEdgeOptions={{ type: 'smoothstep' }}
            >
              <MiniMap
                nodeColor={(n) => {
                  switch (n.data.level) {
                    case 0: return '#60a5fa'; // blue
                    case 1: return '#34d399'; // green
                    case 2: return '#fbbf24'; // yellow
                    case 3: return '#f87171'; // red
                    default: return '#d1d5db';
                  }
                }}
              />
              <Controls />
              <Background gap={24} color="#f3f4f6" />
            </ReactFlow>
            {selectedNode && tooltipPos && (
              <div
                className={tooltipClass}
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="font-bold text-lg mb-2">{selectedNode.data.label}</div>
                <div className="mb-1">
                  <span className="font-medium text-gray-600">Value: </span>
                  <span className="font-bold text-indigo-700">
                    {formatCurrency(selectedNode.data.value, 0, 0)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Accounts: </span>
                  <span className="font-bold text-gray-800">
                    {selectedNode.data.numOfAcc?.toLocaleString()}
                  </span>
                </div>
                <button
                  className="mt-3 px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                  onClick={() => setSelectedNode(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
        {/* MIT Legend - Always displayed at the bottom left */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-10 w-auto">
          <div className="flex items-center mb-2">
            <h3 className="font-bold text-lg text-gray-800">MIT</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">CA:</span>
              <span className="text-sm font-bold text-gray-800">
                {mitInfo.mitNumOfAcc?.toLocaleString() ?? '0'} accounts
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">RM:</span>
              <span className="text-sm font-bold text-indigo-700">
                {formatCurrency(mitInfo.mitAmount, 0, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DriverTree;


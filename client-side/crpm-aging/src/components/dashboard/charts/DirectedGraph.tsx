import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import { getDirectedGraphSummary } from '../../../services/api';
import type { DirectedGraphApiResponse } from '../../../types/dashboard.type';

interface Node {
  id: string;
  label: string;
  level: number;
  position: { x: number; y: number };
  color: string;
  parents?: string[];
  amount?: number;
  accounts?: number;
}

interface Edge {
  from: string;
  to: string;
  color: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface DirectedGraphProps {
  title?: string;
}

const FILENAME = '1750132052464-aging besar.parquet';
const SmerSegmentOrder = ['EMRB', 'HRES', 'MEDB', 'GNLA', 'MASR', 'MICB', 'SNLB', 'BLANKS'];

const smerColors: Record<string, string> = {
  EMRB: '#3b82f6',
  HRES: '#8b5cf6',
  MEDB: '#ec4899',
  GNLA: '#10b981',
  MASR: '#6366f1',
  MICB: '#ef4444',
  SNLB: '#ef4444',
  BLANKS: '#ef4444'
};

const getStatusColor = (name: string) =>
  name === 'Active' ? '#059669' : name === 'Inactive' ? '#dc2626' : '#1f2937';

const getNodeId = (status: string, smer: string, idx: number) => `${status.toLowerCase()}-${smer.toLowerCase()}-${idx}`;

// Calculate node positions for a balanced tree
function calculatePositions(apiData: DirectedGraphApiResponse['data']): GraphData {
  if (!apiData) return { nodes: [], edges: [] };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Layout constants
  const canvasWidth = 1320;
  const rootY = 50;
  const statusY = 150;
  const smerY = 250;
  const smerY2 = 350;
  const nodeWidth = 120;
  const nodeHeight = 70;

  // Root node centered
  const rootX = canvasWidth / 2;
  nodes.push({
    id: 'root',
    label: apiData.root.name,
    level: 0,
    position: { x: rootX, y: rootY },
    color: '#1f2937',
    amount: apiData.root.value,
    accounts: apiData.root.numOfAcc
  });

  // Level 1: Active/Inactive
  const statusCount = apiData.branches.length;
  const statusSpacing = 500;
  const statusStartX = rootX - ((statusCount - 1) * statusSpacing) / 2;

  apiData.branches.forEach((branch, i) => {
    const statusId = branch.name.toLowerCase();
    const statusX = statusStartX + i * statusSpacing;
    nodes.push({
      id: statusId,
      label: branch.name,
      level: 1,
      position: { x: statusX, y: statusY },
      color: getStatusColor(branch.name),
      parents: ['root'],
      amount: branch.value,
      accounts: branch.numOfAcc
    });
    edges.push({
      from: 'root',
      to: statusId,
      color: getStatusColor(branch.name)
    });

    // Level 2: Smer Segments
    // Filter and order by SmerSegmentOrder
    const smerNodes = SmerSegmentOrder
      .map((smer, idx) => {
        const found = branch.children?.find(c => c.name === smer);
        return found ? { ...found, smer, idx } : null;
      })
      .filter(Boolean) as (NonNullable<DirectedGraphApiResponse['data']['branches'][number]['children']>[number] & { smer: string; idx: number })[];

    // Split into two rows for visual clarity (like your screenshot)
    const row1 = smerNodes.slice(0, Math.ceil(smerNodes.length / 2));
    const row2 = smerNodes.slice(Math.ceil(smerNodes.length / 2));

    const smerSpacing = 140;
    const smerStartX1 = statusX - ((row1.length - 1) * smerSpacing) / 2;
    const smerStartX2 = statusX - ((row2.length - 1) * smerSpacing) / 2;

    row1.forEach((smerNode, idx) => {
      const smerId = getNodeId(branch.name, smerNode.smer, smerNode.idx);
      const smerX = smerStartX1 + idx * smerSpacing;
      nodes.push({
        id: smerId,
        label: smerNode.smer,
        level: 2,
        position: { x: smerX, y: smerY },
        color: smerColors[smerNode.smer] || '#64748b',
        parents: [statusId],
        amount: smerNode.value,
        accounts: smerNode.numOfAcc
      });
      edges.push({
        from: statusId,
        to: smerId,
        color: smerColors[smerNode.smer] || '#64748b'
      });
    });

    row2.forEach((smerNode, idx) => {
      const smerId = getNodeId(branch.name, smerNode.smer, smerNode.idx) + '-2';
      const smerX = smerStartX2 + idx * smerSpacing;
      nodes.push({
        id: smerId,
        label: smerNode.smer,
        level: 2,
        position: { x: smerX, y: smerY2 },
        color: smerColors[smerNode.smer] || '#64748b',
        parents: [statusId],
        amount: smerNode.value,
        accounts: smerNode.numOfAcc
      });
      edges.push({
        from: statusId,
        to: smerId,
        color: smerColors[smerNode.smer] || '#64748b'
      });
    });
  });

  return { nodes, edges };
}

const DirectedGraph: React.FC<DirectedGraphProps> = ({ title = "Driver Tree 2" }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDirectedGraphSummary(FILENAME).then(res => {
      setGraphData(calculatePositions(res.data));
    });
  }, []);

  // Helper function to format amounts (show full value, no rounding)
  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined) return "";
    if (amount >= 1_000_000) return `RM ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `RM ${(amount / 1_000).toFixed(1)}K`;
    return `RM ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to format number of accounts (show full value, no rounding)
  const formatAccounts = (accounts: number | undefined): string => {
    if (accounts === undefined) return "";
    if (accounts >= 1_000) return `${(accounts / 1_000).toFixed(1)}K CA`;
    return `${accounts} CA`;
  };

  // Function to create vertical paths between nodes
  const createPath = (fromNode: Node, toNode: Node): string => {
    const startX = fromNode.position.x;
    const startY = fromNode.position.y + 35;
    const endX = toNode.position.x;
    const endY = toNode.position.y - 35;

    if (Math.abs(startX - endX) < 10) {
      return `M${startX},${startY} L${endX},${endY}`;
    } else {
      const midY = startY + (endY - startY) / 2;
      return `M${startX},${startY} L${startX},${midY} L${endX},${midY} L${endX},${endY}`;
    }
  };

  // Function to handle downloading the chart as PNG
  const handleDownloadPNG = () => {
    if (svgRef.current) {
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = svg.viewBox.baseVal.width;
      canvas.height = svg.viewBox.baseVal.height;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const png = canvas.toDataURL("image/png");
          const link = document.createElement('a');
          link.download = 'directed-graph.png';
          link.href = png;
          link.click();
        }

        URL.revokeObjectURL(url);
      };

      img.src = url;
    }
  };

  // Zoom controls
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setPanPosition(prev => ({
        x: prev.x + dx / zoomLevel,
        y: prev.y + dy / zoomLevel
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // Highlight related nodes and edges on selection
  const getRelatedNodes = (nodeId: string): string[] => {
    const related: string[] = [nodeId];

    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node && node.parents) {
      related.push(...node.parents);
    }

    graphData.edges.forEach(edge => {
      if (edge.from === nodeId) {
        related.push(edge.to);
      }
    });

    return related;
  };

  const isNodeHighlighted = (nodeId: string): boolean => {
    if (!selectedNode) return true;
    return getRelatedNodes(selectedNode).includes(nodeId);
  };

  const isEdgeHighlighted = (edge: Edge): boolean => {
    if (!selectedNode) return true;
    const relatedNodes = getRelatedNodes(selectedNode);
    return relatedNodes.includes(edge.from) && relatedNodes.includes(edge.to);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center space-x-2">
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors" onClick={zoomIn} title="Zoom In">
            <FiZoomIn size={16} />
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors" onClick={zoomOut} title="Zoom Out">
            <FiZoomOut size={16} />
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors" onClick={resetZoom} title="Reset View">
            <FiRefreshCw size={16} />
          </button>
          <button className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-md text-indigo-700 transition-colors" onClick={handleDownloadPNG} title="Download as PNG">
            <FiDownload size={16} />
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-4">
        {selectedNode
          ? `Selected: ${graphData.nodes.find(n => n.id === selectedNode)?.label || selectedNode}`
          : 'Click nodes to highlight relationships'}
      </div>

      <div
        ref={containerRef}
        className="relative h-[500px] overflow-hidden bg-gradient-to-br from-gray-50 to-white rounded-lg border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          width="1320"
          height="400"
          viewBox="0 0 1320 400"
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker id="arrowhead-highlighted" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Draw edges */}
          {graphData.edges.map((edge, index) => {
            const fromNode = graphData.nodes.find(n => n.id === edge.from);
            const toNode = graphData.nodes.find(n => n.id === edge.to);
            const isHighlighted = isEdgeHighlighted(edge);

            if (fromNode && toNode) {
              return (
                <g key={`edge-${edge.from}-${edge.to}`} opacity={isHighlighted ? 1 : 0.3}>
                  <path
                    d={createPath(fromNode, toNode)}
                    fill="none"
                    stroke={isHighlighted ? edge.color : "#94a3b8"}
                    strokeWidth="2"
                    markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                  />
                </g>
              );
            }
            return null;
          })}

          {/* Draw nodes */}
          {graphData.nodes.map(node => {
            const nodeWidth = 120;
            const nodeHeight = 70;
            const isHighlighted = isNodeHighlighted(node.id);
            const isSelected = selectedNode === node.id;

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${node.position.x - nodeWidth / 2}, ${node.position.y - nodeHeight / 2})`}
                opacity={isHighlighted ? 1 : 0.4}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node shadow */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={8}
                  ry={8}
                  fill="#000"
                  opacity="0.1"
                  transform="translate(2,2)"
                />
                {/* Node background */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={8}
                  ry={8}
                  fill={isSelected ? node.color : "#fff"}
                  stroke={node.color}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200 hover:scale-105"
                />
                {/* Node label */}
                <text
                  x={nodeWidth / 2}
                  y={nodeHeight * 0.25}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isSelected ? "white" : node.color}
                  fontWeight="bold"
                  fontSize="11"
                  className="pointer-events-none"
                >
                  {node.label}
                </text>
                {/* Amount */}
                {node.amount !== undefined && (
                  <text
                    x={nodeWidth / 2}
                    y={nodeHeight * 0.55}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? "white" : "black"}
                    fontSize="10"
                    fontWeight="medium"
                    className="pointer-events-none"
                  >
                    {formatAmount(node.amount)}
                  </text>
                )}
                {/* Number of accounts */}
                {node.accounts !== undefined && (
                  <text
                    x={nodeWidth / 2}
                    y={nodeHeight * 0.8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? "white" : "#4b5563"}
                    fontSize="9"
                    className="pointer-events-none"
                  >
                    {formatAccounts(node.accounts)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {/* Zoom level indicator */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-md shadow-sm border">
          <span className="text-xs text-gray-600 font-medium">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs text-gray-500">
        <p>Tip: Click on nodes to explore relationships between segments</p>
        <p>Total segments: {graphData.nodes.filter(n => n.level >= 2).length}</p>
      </div>
    </div>
  );
};

export default DirectedGraph;
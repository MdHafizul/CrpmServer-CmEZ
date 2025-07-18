import React, { useState, useRef } from 'react';
import { FiDownload, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';

interface Node {
  id: string;
  label: string;
  level: number;
  position: { x: number; y: number };
  color: string;
  parents?: string[];
  amount?: number;   // TTL O/S AMT
  accounts?: number; // Number of CA
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
  customData?: GraphData;
}

const DirectedGraph: React.FC<DirectedGraphProps> = ({ title = "Driver Tree 2", customData }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(0.8);
  const [panPosition, setPanPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Updated graph data with vertical tree layout and financial data
  const defaultGraphData: GraphData = {
    nodes: [
      // Level 0 - Root
      { id: "total", label: "Total Aged Debt", level: 0, position: { x: 300, y: 50 }, color: "#1f2937", amount: 24500000, accounts: 16200 },
      
      // Level 1 - Main Categories
      { id: "active", label: "Active", level: 1, position: { x: -50, y: 150 }, color: "#059669", parents: ["total"], amount: 15800000, accounts: 10400 },
      { id: "inactive", label: "Inactive", level: 1, position: { x: 650, y: 150 }, color: "#dc2626", parents: ["total"], amount: 8700000, accounts: 5800 },
      
      // Level 2 - Active Groups 
      { id: "emrb", label: "EMRB", level: 2, position: { x: -270, y: 250 }, color: "#3b82f6", parents: ["active"], amount: 3250000, accounts: 2100 },
      { id: "hres", label: "HRES", level: 2, position: { x: -125, y: 250 }, color: "#8b5cf6", parents: ["active"], amount: 2890000, accounts: 1950 },
      { id: "medb", label: "MEDB", level: 2, position: { x: 25, y: 250 }, color: "#ec4899", parents: ["active"], amount: 2740000, accounts: 1820 },
      { id: "gnla", label: "GNLA", level: 2, position: { x: -200, y: 350 }, color: "#10b981", parents: ["active"], amount: 1560000, accounts: 1070 },
      { id: "masr", label: "MASR", level: 2, position: { x: -50, y: 350 }, color: "#6366f1", parents: ["active"], amount: 1430000, accounts: 990 },
      { id: "micb", label: "MICB", level: 2, position: { x: 100, y: 350 }, color: "#ef4444", parents: ["active"], amount: 1380000, accounts: 920 },
      { id: "snlb", label: "SNLB", level: 2, position: { x: 175, y: 250 }, color: "#ef4444", parents: ["active"], amount: 1320000, accounts: 880 },
      { id: "blanks", label: "BLANKS", level: 2, position: { x: 250, y: 350 }, color: "#ef4444", parents: ["active"], amount: 1230000, accounts: 670 },

      { id: "i-emrb", label: "EMRB", level: 2, position: { x: 425, y: 250 }, color: "#3b82f6", parents: ["inactive"], amount: 1750000, accounts: 1180 },
      { id: "i-hres", label: "HRES", level: 2, position: { x: 575, y: 250 }, color: "#8b5cf6", parents: ["inactive"], amount: 1520000, accounts: 1030 },
      { id: "i-medb", label: "MEDB", level: 2, position: { x: 725, y: 250 }, color: "#ec4899", parents: ["inactive"], amount: 1240000, accounts: 840 },
      { id: "i-gnla", label: "GNLA", level: 2, position: { x: 500, y: 350 }, color: "#10b981", parents: ["inactive"], amount: 980000, accounts: 670 },
      { id: "i-masr", label: "MASR", level: 2, position: { x: 650, y: 350 }, color: "#6366f1", parents: ["inactive"], amount: 870000, accounts: 590 },
      { id: "i-micb", label: "MICB", level: 2, position: { x: 800, y: 350 }, color: "#ef4444", parents: ["inactive"], amount: 760000, accounts: 520 },
      { id: "i-snlb", label: "SNLB", level: 2, position: { x: 875, y: 250 }, color: "#ef4444", parents: ["inactive"], amount: 880000, accounts: 590 },
      { id: "i-blanks", label: "BLANKS", level: 2, position: { x: 950, y: 350 }, color: "#ef4444", parents: ["inactive"], amount: 700000, accounts: 380 },
    ],
    edges: []
  };

  // Helper function to format amounts
  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined) return "";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  // Helper function to format number of accounts
  const formatAccounts = (accounts: number | undefined): string => {
    if (accounts === undefined) return "";
    if (accounts >= 1000) {
      return `${(accounts / 1000).toFixed(1)}K`;
    }
    return `${accounts}`;
  };

  // Generate edges based on node parent relationships
  const graphData = React.useMemo(() => {
    const data = customData || defaultGraphData;
    
    const generatedEdges: Edge[] = [];
    data.nodes.forEach(node => {
      if (node.parents) {
        node.parents.forEach(parentId => {
          const parentNode = data.nodes.find(n => n.id === parentId);
          if (parentNode) {
            generatedEdges.push({
              from: parentId,
              to: node.id,
              color: parentNode.color
            });
          }
        });
      }
    });
    
    return {
      nodes: data.nodes,
      edges: generatedEdges
    };
  }, [customData]);

  // Function to create vertical paths between nodes
  const createPath = (fromNode: Node, toNode: Node): string => {
    const startX = fromNode.position.x;
    const startY = fromNode.position.y + 25; // Bottom of the from node
    const endX = toNode.position.x;
    const endY = toNode.position.y - 25; // Top of the to node

    // For vertical layout, create straight lines or slight curves
    if (Math.abs(startX - endX) < 10) {
      // Straight vertical line
      return `M${startX},${startY} L${endX},${endY}`;
    } else {
      // Curved path for diagonal connections
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
          <button 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            onClick={zoomIn}
            title="Zoom In"
          >
            <FiZoomIn size={16} />
          </button>
          <button 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            onClick={zoomOut}
            title="Zoom Out"
          >
            <FiZoomOut size={16} />
          </button>
          <button 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            onClick={resetZoom}
            title="Reset View"
          >
            <FiRefreshCw size={16} />
          </button>
          <button 
            className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-md text-indigo-700 transition-colors"
            onClick={handleDownloadPNG}
            title="Download as PNG"
          >
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
          width="100%" 
          height="100%" 
          viewBox="0 0 800 400"
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
            </pattern>
            
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            
            <marker
              id="arrowhead-highlighted"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
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
            const nodeWidth = 120; // Increased width to accommodate more data
            const nodeHeight = 70; // Increased height to accommodate more data
            const isHighlighted = isNodeHighlighted(node.id);
            const isSelected = selectedNode === node.id;
            
            return (
              <g 
                key={`node-${node.id}`} 
                transform={`translate(${node.position.x - nodeWidth/2}, ${node.position.y - nodeHeight/2})`}
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
                    {formatAccounts(node.accounts)} CA
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
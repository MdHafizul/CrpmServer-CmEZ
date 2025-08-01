import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../../ui/Card';
import { formatCurrency } from '../../../utils/formatter';
import { FiDownload, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import { getDriverTreeSummary } from '../../../services/api';
import type { DriverTreeApiResponse } from '../../../types/dashboard.type'; // Removed DriverTreeNode
import { useAppContext } from '../../../context/AppContext'; // <-- Add
import Skeleton from '../../ui/Skeleton';

interface DriverTreeProps {
  mitAmount?: number; 
}

const GOVERNMENT_CLASSES = ['LPCG', 'OPCG'];
const NON_GOVERNMENT_CLASSES = ['LPCN', 'OPCN'];

function groupAccountClasses(statusBranch: any) {
  // Group account classes under government/non-government
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

const DriverTree: React.FC<DriverTreeProps> = ({ mitAmount = 0 }) => {
  const [selectedDriverNode, setSelectedDriverNode] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  // Add zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  // Remove the showLegend state since we'll always show it
  
  // Add state for API data
  const [driverTreeApiData, setDriverTreeApiData] = useState<DriverTreeApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Add MIT state
  const [mitInfo, setMitInfo] = useState<{ mitAmount: number; mitNumOfAcc: number }>({ mitAmount: 0, mitNumOfAcc: 0 });

  const { parquetFileName } = useAppContext();

  useEffect(() => {
    if (!parquetFileName) return;
    setLoading(true);
    // Try cache first
    const cached = getDriverTreeCache(parquetFileName);
    if (cached) {
      setDriverTreeApiData(cached);
      setLoading(false);
      // Set MIT info if present in cache
      if (cached.mitAmount !== undefined && cached.mitNumOfAcc !== undefined) {
        setMitInfo({
          mitAmount: cached.mitAmount,
          mitNumOfAcc: cached.mitNumOfAcc
        });
      }
      return;
    }
    getDriverTreeSummary(parquetFileName)
      .then(res => {
        setDriverTreeApiData(res.data);
        setDriverTreeCache(parquetFileName, res.data);
        // If MIT info is present, set it
        if (res.data && typeof res.data.mitAmount === 'number' && typeof res.data.mitNumOfAcc === 'number') {
          setMitInfo({
            mitAmount: res.data.mitAmount,
            mitNumOfAcc: res.data.mitNumOfAcc
          });
        }
      })
      .finally(() => setLoading(false));
  }, [parquetFileName]); // <-- Add parquetFileName

  // Use API data directly for rendering
  const driverTreeStructure = useMemo(() => {
    if (!driverTreeApiData) {
      return {
        root: { name: 'No Data', value: 0, numOfAcc: 0, level: 0 },
        branches: []
      };
    }
    // Transform API response to required structure
    return {
      root: driverTreeApiData.root,
      branches: driverTreeApiData.branches.map((statusBranch: any) => ({
        ...statusBranch,
        children: groupAccountClasses(statusBranch)
      }))
    };
  }, [driverTreeApiData]);

  // Function to handle downloading the chart as PNG
  const handleDownloadPNG = useCallback(() => {
    if (svgRef.current) {
      // Create a canvas with the SVG content
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // Set canvas dimensions to match SVG
      canvas.width = svg.viewBox.baseVal.width;
      canvas.height = svg.viewBox.baseVal.height;
      
      // Create an image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Fill white background and draw the SVG image on canvas
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Convert canvas to PNG and trigger download
          const png = canvas.toDataURL("image/png");
          const link = document.createElement('a');
          link.download = 'debt-aging-driver-tree.png';
          link.href = png;
          link.click();
        }
        
        // Clean up
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  }, []);

  // Handle zoom controls
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Helper to assign colors based on node level/name
  const getNodeColor = (node: any, level: number) => {
    if (level === 0) return '#1f2937'; // root
    if (level === 1) return node.name === 'Active' ? '#059669' : '#dc2626';
    if (level === 2) return node.name === 'LPCG' || node.name === 'OPCG' ? '#3b82f6' : '#ec4899';
    if (level === 3) {
      // Account class
      if (node.name === 'LPCG' || node.name === 'OPCG') return '#3b82f6';
      if (node.name === 'LPCN' || node.name === 'OPCN') return '#ec4899';
      return '#6366f1';
    }
    // ADID level
    const adidColors: Record<string, string> = {
      AG: '#6366f1',
      CM: '#10b981',
      DM: '#f59e0b',
      SL: '#ec4899',
      IN: '#3b82f6',
      MN: '#dc2626'
    };
    return adidColors[node.name] || '#64748b';
  };

  // Enhanced horizontal driver tree node component
  const HorizontalDriverTreeNode = useCallback(({ node, x, y, level = 0 }: any) => {
    const nodeWidth = level === 0 ? 240 : level === 1 ? 200 : level === 2 ? 180 : level === 3 ? 160 : 120;
    const nodeHeight = level === 0 ? 100 : level === 1 ? 90 : level === 2 ? 80 : level === 3 ? 70 : 75;
    const isSelected = selectedDriverNode === node.name;
    const isRoot = level === 0;
    const color = getNodeColor(node, level);

    const handleClick = () => {
      if (level === 1) { // Active/Inactive level
        if (selectedBranch === node.name) {
          // If clicking the same branch, deselect it
          setSelectedBranch(null);
          setSelectedDriverNode(null);
        } else {
          // Select this branch
          setSelectedBranch(node.name);
          setSelectedDriverNode(node.name);
        }
      } else {
        // For other levels, just toggle selection
        setSelectedDriverNode(isSelected ? null : node.name);
      }
    };
    
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0.5, x: -50 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.6, delay: level * 0.2 }}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <defs>
          <filter id={`h-node-shadow-${node.name.replace(/\s+/g, '')}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow 
              dx="0" 
              dy={isSelected ? "8" : "4"} 
              stdDeviation={isSelected ? "12" : "6"} 
              floodOpacity={isSelected ? "0.25" : "0.15"} 
              floodColor={color}
            />
          </filter>
          <linearGradient id={`h-node-gradient-${node.name.replace(/\s+/g, '')}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isSelected ? color : 'white'} stopOpacity={1}/>
            <stop offset="100%" stopColor={isSelected ? color : '#f8fafc'} stopOpacity={1}/>
          </linearGradient>
        </defs>
        
        {/* Node background with horizontal gradient */}
        <motion.rect
          x={x - nodeWidth/2}
          y={y - nodeHeight/2}
          width={nodeWidth}
          height={nodeHeight}
          rx={isRoot ? 24 : 16}
          fill={`url(#h-node-gradient-${node.name.replace(/\s+/g, '')})`}
          stroke={color}
          strokeWidth={isSelected ? 3 : 2}
          filter={`url(#h-node-shadow-${node.name.replace(/\s+/g, '')})`}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Node title */}
        <text
          x={x}
          y={y - (nodeHeight/3)}
          textAnchor="middle"
          fill={isSelected ? 'white' : color}
          fontSize={level === 0 ? 18 : level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 12 : 11}
          fontWeight="bold"
        >
          {node.name}
        </text>

        {/* Add subtitle for root node */}
        {isRoot && node.subtitle && (
          <text
            x={x}
            y={y - (nodeHeight/3.5) + 20}
            textAnchor="middle"
            fill={isSelected ? 'white' : '#6b7280'}
            fontSize={12}
            fontStyle="italic"
          >
            {node.subtitle}
          </text>
        )}
        
        {/* Only show value for level < 4 */}
        {level < 4 && (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            fill={isSelected ? 'white' : '#374151'}
            fontSize={level === 0 ? 14 : level === 1 ? 12 : level === 2 ? 10 : 9}
            fontWeight="600"
          >
            {formatCurrency(node.value, 0, 0)}
          </text>
        )}

        {/* Only show accounts for level < 4, and also for ADID nodes (level 4) if numOfAcc exists */}
        {(level < 4 && node.numOfAcc !== undefined) || (level === 4 && node.numOfAcc !== undefined) ? (
          <text
            x={x}
            // Move closer to the title for ADID (level 4) nodes
            y={level === 4 ? y + 12 : y + (level === 3 ? 12 : 15)}
            textAnchor="middle"
            fill={isSelected ? 'white' : '#6b7280'}
            fontSize={level === 0 ? 10 : level === 1 ? 9 : level === 2 ? 8 : 10}
            fontWeight="medium"
          >
            {node.numOfAcc.toLocaleString()} accounts
          </text>
        ) : null}

        {/* Only show percentage for level < 4 */}
        {level > 0 && level < 4 && (
          <text
            x={x}
            y={y + (level === 3 ? 22 : nodeHeight/3)}
            textAnchor="middle"
            fill={isSelected ? 'white' : color}
            fontSize={level === 1 ? 11 : 10}
            fontWeight="bold"
          >
            {node.percentage}%
          </text>
        )}
        
        {/* For level 4, show value only */}
        {level === 4 && (
          <text
            x={x}
            y={y + 1} // Move value closer to the title for ADID nodes
            textAnchor="middle"
            fill={isSelected ? 'white' : '#374151'}
            fontSize={10}
            fontWeight="bold"
          >
            {formatCurrency(node.value, 0, 0)}
          </text>
        )}
      </motion.g>
   ) }, [selectedDriverNode, selectedBranch]);

  // Enhanced horizontal connections with organizational chart style (horizontal + vertical lines)
  const HorizontalDriverTreeConnection = useCallback(({ x1, y1, x2, y2, color, isSelected }: any) => {
    // Calculate the path for L-shaped connection
    const midX = x1 + (x2 - x1) * 0.7; // 70% of the way horizontally
    
    return (
      <motion.g>
        <defs>
          <linearGradient id={`h-connection-gradient-${x2}-${y2}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={color} stopOpacity={0.3}/>
          </linearGradient>
        </defs>
        
        {/* Connection shadow */}
        <motion.g opacity={0.2} transform="translate(2, 2)">
          {/* Horizontal line */}
          <motion.line
            x1={x1}
            y1={y1}
            x2={midX}
            y2={y1}
            stroke={color}
            strokeWidth={isSelected ? 4 : 2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
          {/* Vertical line */}
          <motion.line
            x1={midX}
            y1={y1}
            x2={midX}
            y2={y2}
            stroke={color}
            strokeWidth={isSelected ? 4 : 2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          />
          {/* Final horizontal line to target */}
          <motion.line
            x1={midX}
            y1={y2}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={isSelected ? 4 : 2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          />
        </motion.g>
        
        {/* Main connection lines */}
        <motion.g>
          {/* Horizontal line */}
          <motion.line
            x1={x1}
            y1={y1}
            x2={midX}
            y2={y1}
            stroke={`url(#h-connection-gradient-${x2}-${y2})`}
            strokeWidth={isSelected ? 3 : 2}
            strokeDasharray={isSelected ? "none" : "8,4"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
          {/* Vertical line */}
          <motion.line
            x1={midX}
            y1={y1}
            x2={midX}
            y2={y2}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
            strokeDasharray={isSelected ? "none" : "6,3"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          />
          {/* Final horizontal line to target */}
          <motion.line
            x1={midX}
            y1={y2}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
            strokeDasharray={isSelected ? "none" : "8,4"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          />
        </motion.g>
      </motion.g>
    );
  }, []);

  return (
    <Card title="Driver Tree By Account Class">
      <div className="flex justify-between items-center mb-6">
        <div className="text-xs text-gray-500">
          Click nodes to highlight • {selectedDriverNode ? `Selected: ${selectedDriverNode}` : 'Select a node'}
        </div>
        
        {/* Add control buttons - remove the legend toggle button */}
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
            title="Reset Zoom"
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
      
      <div 
        ref={containerRef}
        className="relative h-[1600px] overflow-hidden bg-gradient-to-r from-gray-50 to-white rounded-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
            <Skeleton height={400} width="90%" className="rounded-xl mx-auto" />
          </div>
        ) : (
          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox="0 0 3200 1600" 
            style={{
              willChange: 'transform',
              transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
            }}
          >
            {/* Background grid */}
            <defs>
              <pattern id="h-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#h-grid)" opacity="0.5"/>
            
            {/* Root node */}
            <HorizontalDriverTreeNode 
              node={driverTreeStructure.root}
              x={150}
              y={450}
              level={0}
            />
            
            {/* Level 2: Active/Inactive */}
            {driverTreeStructure.branches.map((statusBranch: any, statusIndex: number) => {
              const statusX = 450;
              const statusY = 250 + (statusIndex * 400);
              const isSelected = selectedDriverNode === statusBranch.name;
              const statusColor = getNodeColor(statusBranch, 1);

              return (
                <g key={statusBranch.name}>
                  <HorizontalDriverTreeConnection
                    x1={270}
                    y1={450}
                    x2={350}
                    y2={statusY}
                    color={statusColor}
                    isSelected={isSelected}
                  />
                  <HorizontalDriverTreeNode 
                    node={statusBranch}
                    x={statusX}
                    y={statusY}
                    level={1}
                  />
                  {/* Level 3: Government/Non-Government */}
                  {statusBranch.children.map((govBranch: any, govIdx: number) => {
                    const govX = 850;
                    const govY = statusY - 100 + (govIdx * 200);
                    const govColor = getNodeColor(govBranch, 2);
                    return (
                      <g key={govBranch.name}>
                        {/* Connect from Government/Non-Government to Active/Inactive */}
                        <HorizontalDriverTreeConnection
                          x1={statusX + 100} // right edge of Active/Inactive node
                          y1={statusY}
                          x2={govX - 90} // left edge of Government/Non-Government node
                          y2={govY}
                          color={govColor}
                          isSelected={selectedDriverNode === govBranch.name}
                        />
                        <HorizontalDriverTreeNode
                          node={govBranch}
                          x={govX}
                          y={govY}
                          level={2}
                        />
                        {/* Level 4: Account Classes */}
                        {govBranch.children && govBranch.children.map((accClass: any, accIdx: number) => {
                          const accX = 1250;
                          const accY = govY - 75 + (accIdx * 100);
                          const accColor = getNodeColor(accClass, 3);
                          return (
                            <g key={accClass.name}>
                              {/* Connection from level 2 (govBranch) to level 3 (accClass) */}
                              <HorizontalDriverTreeConnection
                                x1={govX + 100}
                                y1={govY}
                                x2={accX - 80}
                                y2={accY}
                                color={accColor}
                                isSelected={selectedDriverNode === accClass.name}
                              />
                              <HorizontalDriverTreeNode
                                node={accClass}
                                x={accX}
                                y={accY}
                                level={3}
                              />
                              {/* Level 5: ADID nodes */}
                              {accClass.children && (
                                <>
                                  <line
                                    x1={accX + 80}
                                    y1={accY - 20}
                                    x2={1600 + (accClass.children.length - 1) * 200}
                                    y2={accY - 20}
                                    stroke="#64748b"
                                    strokeWidth={3}
                                    opacity={0.7}
                                  />
                                  {accClass.children.map((leaf: any, leafIdx: number) => {
                                    const leafX = 1600 + (leafIdx * 200);
                                    const leafColor = getNodeColor(leaf, 4);
                                    return (
                                      <g key={leaf.name}>
                                        <line
                                          x1={leafX}
                                          y1={accY + 30}
                                          x2={leafX}
                                          y2={accY - 20}
                                          stroke={leafColor}
                                          strokeWidth={3}
                                          opacity={0.85}
                                        />
                                        <HorizontalDriverTreeNode
                                          node={leaf}
                                          x={leafX}
                                          y={accY + 30}
                                          level={4}
                                        />
                                      </g>
                                    );
                                  })}
                                </>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        )}
        
        {/* Zoom level indicator */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 px-3 py-1 rounded-md shadow-sm">
          <span className="text-xs text-gray-600 font-medium">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
        </div>
        
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
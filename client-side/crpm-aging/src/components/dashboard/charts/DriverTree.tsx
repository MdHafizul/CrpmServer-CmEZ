import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Card from '../../ui/Card';
import { formatCurrency } from '../../../utils/formatter';
import { FiDownload, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';

interface DriverTreeProps {
  driverTreeData?: {
    category: string;
    debtAmount: number;
    numOfAcc: number;
    color: string;
    type: 'government' | 'non-government';
    status?: 'active' | 'inactive';
  }[] | undefined;
  mitAmount?: number; 
}

const DriverTree: React.FC<DriverTreeProps> = ({ driverTreeData, mitAmount = 0 }) => {
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
  
  // Process driver tree data with proper Active/Inactive -> Government/Non-Government structure
  const processedDriverData = useMemo(() => {
    if (!driverTreeData) {
      // Default data structure for account classes under Active/Inactive
      return [
        // Active Government
        { category: 'OPCG', debtAmount: 2500000, numOfAcc: 150, color: '#3b82f6', type: 'government' as const, status: 'active' as const },
        { category: 'LPCG', debtAmount: 1800000, numOfAcc: 120, color: '#10b981', type: 'government' as const, status: 'active' as const },
        // Active Non-Government
        { category: 'OPCN', debtAmount: 3200000, numOfAcc: 200, color: '#ec4899', type: 'non-government' as const, status: 'active' as const },
        { category: 'LPCN', debtAmount: 2100000, numOfAcc: 180, color: '#f59e0b', type: 'non-government' as const, status: 'active' as const },
        // Inactive Government
        { category: 'OPCG', debtAmount: 1200000, numOfAcc: 80, color: '#6366f1', type: 'government' as const, status: 'inactive' as const },
        { category: 'LPCG', debtAmount: 900000, numOfAcc: 60, color: '#059669', type: 'government' as const, status: 'inactive' as const },
        // Inactive Non-Government
        { category: 'OPCN', debtAmount: 1600000, numOfAcc: 100, color: '#db2777', type: 'non-government' as const, status: 'inactive' as const },
        { category: 'LPCN', debtAmount: 1050000, numOfAcc: 90, color: '#d97706', type: 'non-government' as const, status: 'inactive' as const }
      ];
    }
    return driverTreeData;
  }, [driverTreeData]);

  // Create the driver tree structure with Active/Inactive -> Government/Non-Government hierarchy
  const driverTreeStructure = useMemo(() => {
    const totalDebt = processedDriverData.reduce((sum, item) => sum + item.debtAmount, 0);
    const totalAccounts = processedDriverData.reduce((sum, item) => sum + item.numOfAcc, 0);
    
    // Group by status first (Active/Inactive)
    const activeData = processedDriverData.filter(item => item.status === 'active');
    const inactiveData = processedDriverData.filter(item => item.status === 'inactive');
    
    const activeTotal = activeData.reduce((sum, item) => sum + item.debtAmount, 0);
    const inactiveTotal = inactiveData.reduce((sum, item) => sum + item.debtAmount, 0);
    
    // Calculate accounts for active and inactive
    const activeTotalAccounts = activeData.reduce((sum, item) => sum + item.numOfAcc, 0);
    const inactiveTotalAccounts = inactiveData.reduce((sum, item) => sum + item.numOfAcc, 0);
    
    // Create structure for each status
    const createStatusBranch = (data: any[], statusName: string, statusTotal: number, statusTotalAccounts: number) => {
      const governmentData = data.filter(item => item.type === 'government');
      const nonGovernmentData = data.filter(item => item.type === 'non-government');
      
      const governmentTotal = governmentData.reduce((sum, item) => sum + item.debtAmount, 0);
      const nonGovernmentTotal = nonGovernmentData.reduce((sum, item) => sum + item.debtAmount, 0);
      
      const governmentTotalAccounts = governmentData.reduce((sum, item) => sum + item.numOfAcc, 0);
      const nonGovernmentTotalAccounts = nonGovernmentData.reduce((sum, item) => sum + item.numOfAcc, 0);
      
      return {
        name: statusName,
        value: statusTotal,
        numOfAcc: statusTotalAccounts, // Add account numbers
        color: statusName === 'Active' ? '#059669' : '#dc2626',
        level: 1,
        percentage: ((statusTotal / totalDebt) * 100).toFixed(1),
        children: [
          {
            name: 'Government',
            value: governmentTotal,
            numOfAcc: governmentTotalAccounts, // Add account numbers
            color: '#3b82f6',
            level: 2,
            percentage: statusTotal > 0 ? ((governmentTotal / statusTotal) * 100).toFixed(1) : '0',
            children: governmentData.map(item => ({
              name: item.category,
              value: item.debtAmount,
              numOfAcc: item.numOfAcc,
              color: item.color,
              level: 3,
              percentage: governmentTotal > 0 ? ((item.debtAmount / governmentTotal) * 100).toFixed(1) : '0',
              // Add level 4 children
              children: [
                { name: 'AG', value: Math.round(item.debtAmount * 0.2), color: '#6366f1', level: 4 },
                { name: 'CM', value: Math.round(item.debtAmount * 0.15), color: '#10b981', level: 4 },
                { name: 'DM', value: Math.round(item.debtAmount * 0.18), color: '#f59e0b', level: 4 },
                { name: 'SL', value: Math.round(item.debtAmount * 0.17), color: '#ec4899', level: 4 },
                { name: 'IN', value: Math.round(item.debtAmount * 0.15), color: '#3b82f6', level: 4 },
                { name: 'MN', value: Math.round(item.debtAmount * 0.15), color: '#dc2626', level: 4 }
              ]
            }))
          },
          {
            name: 'Non-Government',
            value: nonGovernmentTotal,
            numOfAcc: nonGovernmentTotalAccounts, // Add account numbers
            color: '#ec4899',
            level: 2,
            percentage: statusTotal > 0 ? ((nonGovernmentTotal / statusTotal) * 100).toFixed(1) : '0',
            children: nonGovernmentData.map(item => ({
              name: item.category,
              value: item.debtAmount,
              numOfAcc: item.numOfAcc,
              color: item.color,
              level: 3,
              percentage: nonGovernmentTotal > 0 ? ((item.debtAmount / nonGovernmentTotal) * 100).toFixed(1) : '0',
              // Add level 4 children
              children: [
                { name: 'AG', value: Math.round(item.debtAmount * 0.2), color: '#6366f1', level: 4 },
                { name: 'CM', value: Math.round(item.debtAmount * 0.15), color: '#10b981', level: 4 },
                { name: 'DM', value: Math.round(item.debtAmount * 0.18), color: '#f59e0b', level: 4 },
                { name: 'SL', value: Math.round(item.debtAmount * 0.17), color: '#ec4899', level: 4 },
                { name: 'IN', value: Math.round(item.debtAmount * 0.15), color: '#3b82f6', level: 4 },
                { name: 'MN', value: Math.round(item.debtAmount * 0.15), color: '#dc2626', level: 4 }
              ]
            }))
          }
        ]
      };
    };
    
    return {
      root: {
        name: 'Aged Debt as Of DATE',
        subtitle: 'Positive Balance',
        value: totalDebt,
        numOfAcc: totalAccounts, // Add account numbers to root
        color: '#1f2937',
        level: 0
      },
      branches: [
        createStatusBranch(activeData, 'Active', activeTotal, activeTotalAccounts),
        createStatusBranch(inactiveData, 'Inactive', inactiveTotal, inactiveTotalAccounts)
      ]
    };
  }, [processedDriverData]);

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

  // Enhanced horizontal driver tree node component
  const HorizontalDriverTreeNode = useCallback(({ node, x, y, level = 0 }: any) => {
    const nodeWidth = level === 0 ? 240 : level === 1 ? 200 : level === 2 ? 180 : level === 3 ? 160 : 90;
    const nodeHeight = level === 0 ? 100 : level === 1 ? 90 : level === 2 ? 80 : level === 3 ? 70 : 50;
    const isSelected = selectedDriverNode === node.name;
    const isRoot = level === 0;
    
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
              floodColor={node.color}
            />
          </filter>
          
          <linearGradient id={`h-node-gradient-${node.name.replace(/\s+/g, '')}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isSelected ? node.color : 'white'} stopOpacity={1}/>
            <stop offset="100%" stopColor={isSelected ? node.color : '#f8fafc'} stopOpacity={1}/>
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
          stroke={node.color}
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
          fill={isSelected ? 'white' : node.color}
          fontSize={level === 0 ? 18 : level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 12 : 11}
          fontWeight="bold"
        >
          {node.name}
        </text>

        {/* Add subtitle for root node */}
        {isRoot && node.subtitle && (
          <text
            x={x}
            y={y - (nodeHeight/3) + 20}
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

        {/* Only show accounts for level < 4 */}
        {level < 4 && node.numOfAcc !== undefined && (
          <text
            x={x}
            y={y + (level === 3 ? 12 : 15)}
            textAnchor="middle"
            fill={isSelected ? 'white' : '#6b7280'}
            fontSize={level === 0 ? 10 : level === 1 ? 9 : 8}
            fontWeight="medium"
          >
            {node.numOfAcc.toLocaleString()} accounts
          </text>
        )}

        {/* Only show percentage for level < 4 */}
        {level > 0 && level < 4 && (
          <text
            x={x}
            y={y + (level === 3 ? 22 : nodeHeight/3)}
            textAnchor="middle"
            fill={isSelected ? 'white' : node.color}
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
            y={y + 6}
            textAnchor="middle"
            fill={isSelected ? 'white' : '#374151'}
            fontSize={10}
            fontWeight="bold"
          >
            {formatCurrency(node.value, 0, 0)}
          </text>
        )}
      </motion.g>
    );
  }, [selectedDriverNode, selectedBranch]);

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
        
        {/* Arrow at end */}
        <motion.polygon
          points={`${x2-12},${y2-8} ${x2-12},${y2+8} ${x2+2},${y2}`}
          fill={color}
          opacity={0.8}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1.8 }}
        />
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
        className="relative h-[900px] overflow-hidden bg-gradient-to-r from-gray-50 to-white rounded-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox="0 0 1800 900" 
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="h-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#h-grid)" opacity="0.5"/>
          
          {/* Root node - Total Aged Debt */}
          <HorizontalDriverTreeNode 
            node={driverTreeStructure.root}
            x={150}
            y={450}
            level={0}
          />
          
          {/* Level 1: Active/Inactive */}
          {driverTreeStructure.branches.map((statusBranch, statusIndex) => {
            const statusX = 450;
            const statusY = 250 + (statusIndex * 400);
            const isSelected = selectedDriverNode === statusBranch.name;
            
            return (
              <g key={statusBranch.name}>
                {/* Connection from root to status */}
                <HorizontalDriverTreeConnection
                  x1={270}
                  y1={450}
                  x2={350}
                  y2={statusY}
                  color={statusBranch.color}
                  isSelected={isSelected}
                />
                
                {/* Status node */}
                <HorizontalDriverTreeNode 
                  node={statusBranch}
                  x={statusX}
                  y={statusY}
                  level={1}
                />
                
                {/* Level 2: Government/Non-Government */}
                {statusBranch.children.map((typeBranch: any, typeIndex: number) => {
                  const typeX = 750;
                  const typeY = statusY - 100 + (typeIndex * 200);
                  const isTypeSelected = selectedDriverNode === typeBranch.name;
                  
                  return (
                    <g key={`${statusBranch.name}-${typeBranch.name}`}>
                      {/* Connection from status to type */}
                      <HorizontalDriverTreeConnection
                        x1={550}
                        y1={statusY}
                        x2={650}
                        y2={typeY}
                        color={typeBranch.color}
                        isSelected={isTypeSelected}
                      />
                      
                      {/* Type node */}
                      <HorizontalDriverTreeNode 
                        node={typeBranch}
                        x={typeX}
                        y={typeY}
                        level={2}
                      />
                      
                      {/* Level 3: Account Classes */}
                      {typeBranch.children.map((accClass: any, accIndex: number) => {
                        const accX = 1150;
                        const accY = typeY - 75 + (accIndex * 100);
                        const isAccSelected = selectedDriverNode === accClass.name;
                        
                        return (
                          <g key={`${statusBranch.name}-${typeBranch.name}-${accClass.name}`}>
                            {/* Connection from type to account class */}
                            <HorizontalDriverTreeConnection
                              x1={840}
                              y1={typeY}
                              x2={1070}
                              y2={accY}
                              color={accClass.color}
                              isSelected={isAccSelected}
                            />
                            
                            {/* Account class node */}
                            <HorizontalDriverTreeNode 
                              node={accClass}
                              x={accX}
                              y={accY}
                              level={3}
                            />
                            
                            {/* Level 4: AG, CM, DM, SL, IN, MN */}
                            {accClass.children && accClass.children.map((leaf: any, leafIdx: number) => {
                              const leafX = 1400 + (leafIdx * 200);
                              const leafY = accY;
                              return (
                                <g key={`${statusBranch.name}-${typeBranch.name}-${accClass.name}-${leaf.name}`}>
                                  {/* Connection from account class to leaf */}
                                  <HorizontalDriverTreeConnection
                                    x1={accX + 80}
                                    y1={accY}
                                    x2={leafX - 45}
                                    y2={leafY}
                                    color={leaf.color}
                                    isSelected={selectedDriverNode === leaf.name}
                                  />
                                  {/* Leaf node */}
                                  <HorizontalDriverTreeNode
                                    node={leaf}
                                    x={leafX}
                                    y={leafY}
                                    level={4}
                                  />
                                </g>
                              );
                            })}
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
                {driverTreeStructure.root.numOfAcc.toLocaleString()} accounts
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">RM:</span>
              <span className="text-sm font-bold text-indigo-700">
                {formatCurrency(mitAmount, 0, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DriverTree;
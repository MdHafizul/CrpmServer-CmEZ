import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '../../ui/Card';
import { formatCurrency } from '../../../utils/formatter';
import { FiDownload, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import { getDriverTreeSummary } from '../../../services/api';
import type { DriverTreeApiResponse } from '../../../types/dashboard.type';
import { useAppContext } from '../../../context/AppContext';

const GOVERNMENT_CLASSES = ['LPCG', 'OPCG'];
const NON_GOVERNMENT_CLASSES = ['LPCN', 'OPCN'];

function groupAccountClasses(statusBranch: any) {
	const government = (statusBranch.children || []).filter((c: any) => GOVERNMENT_CLASSES.includes(c.name));
	const nonGovernment = (statusBranch.children || []).filter((c: any) => NON_GOVERNMENT_CLASSES.includes(c.name));
	const sum = (arr: any[], key: string) => arr.reduce((acc, cur) => acc + (cur[key] || 0), 0);
	return [
		{
			name: 'Government',
			value: sum(government, 'value'),
			numOfAcc: sum(government, 'numOfAcc'),
			children: government
		},
		{
			name: 'Non-Government',
			value: sum(nonGovernment, 'value'),
			numOfAcc: sum(nonGovernment, 'numOfAcc'),
			children: nonGovernment
		}
	];
}

// corporate palette helpers
const NODE_COLORS = {
	root: { fill: '#eef2ff', stroke: '#4338ca', text: '#0f172a' },
	active: { fill: '#ecfdf5', stroke: '#059669', text: '#064e3b' },
	inactive: { fill: '#fff1f2', stroke: '#dc2626', text: '#7f1d1d' },
	gov: { fill: '#fff7fb', stroke: '#7c3aed', text: '#0f172a' },
	accGov: { fill: '#eef2ff', stroke: '#2563eb', text: '#0b1220' },
	accNonGov: { fill: '#fff1f2', stroke: '#db2777', text: '#0b1220' },
	default: { fill: '#ffffff', stroke: '#94a3b8', text: '#0b1220' }
};

const NODE_WIDTH = 162; 
const NODE_HEIGHT = 72; 

// explicit root size and helper to compute width per level
const ROOT_NODE_WIDTH = 300;
function nodeWidthForLevel(level: number) {
	return level === 0 ? ROOT_NODE_WIDTH : NODE_WIDTH;
}

function getStyleByLevel(node: any, level: number) {
	if (level === 0) return NODE_COLORS.root;
	if (level === 1) return node.name === 'Active' ? NODE_COLORS.active : NODE_COLORS.inactive;
	if (level === 2) return NODE_COLORS.gov;
	if (level === 3) return GOVERNMENT_CLASSES.includes(node.name) ? NODE_COLORS.accGov : NODE_COLORS.accNonGov;
	// ADID specific
	const map: Record<string, any> = {
		AG: NODE_COLORS.accGov,
		CM: NODE_COLORS.active,
		DM: { fill: '#fff7ed', stroke: '#ea580c', text: '#7c2d0a' },
		SL: NODE_COLORS.accNonGov,
		IN: NODE_COLORS.accGov,
		MN: NODE_COLORS.inactive
	};
	return node.name && map[node.name] ? map[node.name] : NODE_COLORS.default;
}

// transform API -> grouped structure used by layout
function buildStructure(data: DriverTreeApiResponse['data'] | null) {
	if (!data) return { root: { name: 'No Data', value: 0, numOfAcc: 0 }, branches: [] as any[] };

	// read the persisted "As Of" date from localStorage (set by UploadPage)
	const rawDate = typeof window !== 'undefined' ? (localStorage.getItem('agedAsOfDate') || '') : '';
	// format a friendly date; fall back to raw string if parsing fails
	let prettyDate = rawDate;
	try {
		if (rawDate) {
			const d = new Date(rawDate);
			if (!Number.isNaN(d.getTime())) {
				prettyDate = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
			}
		}
	} catch (e) {
		// ignore and use rawDate
	}

	return {
		// override root name to the requested label and attach titleLines for 3-line rendering
		root: {
			...data.root,
			// keep name available for selection logic but provide explicit titleLines
			name: data.root.name ?? 'Aged Debt',
			titleLines: [
				'Aged Debt As Of',
				prettyDate || '—',
				'(Positive Balance)'
			]
		},
		branches: (data.branches || []).map((b: any) => ({ ...b, children: groupAccountClasses(b) }))
	};
}

const DriverTree: React.FC = () => {
	const { parquetFileName } = useAppContext();
	const [apiData, setApiData] = useState<DriverTreeApiResponse['data'] | null>(null);
	const [loading, setLoading] = useState(true);
	const [mitInfo, setMitInfo] = useState<{ mitAmount: number; mitNumOfAcc: number }>({ mitAmount: 0, mitNumOfAcc: 0 });
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const svgRef = useRef<SVGSVGElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dragging = useRef(false);
	const dragStart = useRef({ x: 0, y: 0 });

	useEffect(() => {
		if (!parquetFileName) return;
		setLoading(true);
		getDriverTreeSummary(parquetFileName)
			.then(res => {
				setApiData(res.data ?? null);
				if (res.data && typeof res.data.mitAmount === 'number' && typeof res.data.mitNumOfAcc === 'number') {
					setMitInfo({ mitAmount: res.data.mitAmount, mitNumOfAcc: res.data.mitNumOfAcc });
				}
			})
			.finally(() => setLoading(false));
	}, [parquetFileName]);

	const structure = useMemo(() => buildStructure(apiData), [apiData]);

	// Layout constants 
	const colX = { root: 120, status: 450, group: 850, acc: 1250, adidStart: 1600 };
	const adidGapX = 180; 

	// compute Y positions for nodes to center per level and per branch
	const layout = useMemo(() => {
		const positions: Record<string, { x: number; y: number }> = {};
		// root
		positions['root'] = { x: colX.root, y: 405 }; // moved up by ~10%

		// statuses (Active/Inactive) — placed in two rows]
		const statusYs = (structure.branches || []).map((_, idx) => 225 + idx * 360); // moved up & closer by ~10%;
		structure.branches.forEach((status: any, sIdx: number) => {
			const statusId = `status-${sIdx}`;
			positions[statusId] = { x: colX.status, y: statusYs[sIdx] };

			// groups (Government / Non-Government)
			(status.children || []).forEach((grp: any, gIdx: number) => {
				const groupId = `${statusId}-grp-${gIdx}`;
				const groupY = statusYs[sIdx] - 90 + gIdx * 180; // moved up & reduced gap by ~10%
				positions[groupId] = { x: colX.group, y: groupY };

				// account classes under group
				(grp.children || []).forEach((acc: any, aIdx: number) => {
					const accId = `${groupId}-acc-${aIdx}`;
					const accY = groupY - 68 + aIdx * 90; // moved up & reduced step ~10%
					positions[accId] = { x: colX.acc, y: accY };

					// ADID children for this account class
					(acc.children || []).forEach((leaf: any, lIdx: number) => {
						const leafId = `${accId}-leaf-${lIdx}`;
						const leafX = colX.adidStart + lIdx * adidGapX;
						positions[leafId] = { x: leafX, y: accY + 27 }; // moved up ~10%
					});
				});
			});
		});

		return positions;
	}, [structure]);
	// mouse pan handlers
	const onMouseDown = (e: React.MouseEvent) => {
		dragging.current = true;
		dragStart.current = { x: e.clientX, y: e.clientY };
	};
	const onMouseMove = (e: React.MouseEvent) => {
		if (!dragging.current) return;
		const dx = e.clientX - dragStart.current.x;
		const dy = e.clientY - dragStart.current.y;
		setPan(p => ({ x: p.x + dx / zoom, y: p.y + dy / zoom }));
		dragStart.current = { x: e.clientX, y: e.clientY };
	};
	const onMouseUp = () => { dragging.current = false; };
	const onMouseLeave = () => { dragging.current = false; };

	// PNG export
	const exportPNG = () => {
		const svg = svgRef.current;
		if (!svg) return;
		const svgData = new XMLSerializer().serializeToString(svg);
		const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(2400, svg.viewBox.baseVal.width || 2400);
			canvas.height = Math.max(1400, svg.viewBox.baseVal.height || 1400);
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.fillStyle = '#fff';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				const a = document.createElement('a');
				a.href = canvas.toDataURL('image/png');
				a.download = 'driver-tree.png';
				a.click();
			}
			URL.revokeObjectURL(url);
		};
		img.src = url;
	};

	const zoomIn = () => setZoom(z => Math.min(2.5, z + 0.2));
	const zoomOut = () => setZoom(z => Math.max(0.5, z - 0.2));
	const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

	// add a canvas ref for text measurement (placed near other refs / state)
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	function getCanvasCtx() {
		if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
		return canvasRef.current.getContext('2d');
	}

	// truncate text to fit a pixel width using canvas.measureText
	function truncateToWidth(text: string, font: string, maxWidth: number) {
		const ctx = getCanvasCtx();
		if (!ctx) return text;
		ctx.font = font;
		if (ctx.measureText(text).width <= maxWidth) return text;
		const ell = '…';
		let start = 0;
		let end = text.length;
		let result = '';
		// binary search for the longest substring that fits
		while (start < end) {
			const mid = Math.ceil((start + end) / 2);
			const candidate = text.slice(0, mid);
			if (ctx.measureText(candidate + ell).width <= maxWidth) {
				start = mid;
				result = candidate;
			} else {
				end = mid - 1;
			}
		}
		return (result || text.slice(0, 1)) + ell;
	}

	// split text into up to `maxLines` lines that fit maxWidth using simple greedy word wrap.
	function splitTextToLines(text: string, font: string, maxWidth: number, maxLines = 2) {
		const ctx = getCanvasCtx();
		if (!ctx) return [text];
		ctx.font = font;
		const words = text.split(/\s+/);
		const lines: string[] = [];
		let current = '';
		for (let i = 0; i < words.length; i++) {
			const w = words[i];
			const test = current ? current + ' ' + w : w;
			if (ctx.measureText(test).width <= maxWidth) {
				current = test;
			} else {
				lines.push(current || truncateToWidth(w, font, maxWidth));
				current = w;
				if (lines.length === maxLines - 1) {
					// last allowed line - put remainder here (truncate if needed)
					const remainder = words.slice(i + 1).length ? (current + ' ' + words.slice(i + 1).join(' ')) : current;
					lines.push(truncateToWidth(remainder, font, maxWidth));
					return lines;
				}
			}
		}
		if (current) lines.push(current);
		// ensure at most maxLines
		if (lines.length > maxLines) {
			lines.length = maxLines;
		}
		return lines;
	}

	// render helpers: node and connection components
	const NodeRect: React.FC<{ x: number; y: number; node: any; level: number; width?: number; height?: number }> = ({
		x,
		y,
		node,
		level,
		width = NODE_WIDTH,
		height = NODE_HEIGHT
	}) => {
		const style = getStyleByLevel(node, level);
		const isSelected = selectedNode === node.name;

		// Available inner width for text (padding left/right)
		const paddingX = 12;
		const innerWidth = Math.max(24, width - paddingX * 2);

		// fonts matching the SVG text sizes — larger for root (level 0)
		const titleFontSize = level === 0 ? 18 : 14;
		const valueFontSize = level === 0 ? 20 : 14;
		const accountsFontSize = level === 0 ? 14 : 14;

		const titleFont = `${titleFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, Arial`;
		const valueFont = `${valueFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, Arial`;
		const accountsFont = `${accountsFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, Arial`;

		// truncate each text to fit available width using those fonts
		const titleText = String(node.name ?? '');
		const valueText = node.value !== undefined ? String(formatCurrency(node.value, 0, 0)) : '';
		const accountsText = node.numOfAcc !== undefined ? `${node.numOfAcc.toLocaleString()} accounts` : '';

		// For root (level 0), allow explicit titleLines (3 lines) or fall back to splitting
		let titleLines: string[] = [];
		if (level === 0 && Array.isArray(node.titleLines) && node.titleLines.length > 0) {
			// ensure each line fits within innerWidth
			titleLines = node.titleLines.map((ln: string) => truncateToWidth(String(ln), `700 ${titleFont}`, innerWidth));
		} else if (level === 0) {
			// older fallback: try up to 3 lines
			titleLines = splitTextToLines(titleText, `700 ${titleFont}`, innerWidth, 3);
		} else {
			// non-root single-line title truncated
			titleLines = [truncateToWidth(titleText, `700 ${titleFont}`, innerWidth)];
		}

		const valueShown = valueText ? truncateToWidth(valueText, valueFont, innerWidth) : '';
		const accountsShown = accountsText ? truncateToWidth(accountsText, accountsFont, innerWidth) : '';

		// vertical offsets — lift text slightly for level 0; accommodate up to 3 title lines
		const titleY = level === 0 ? y - 42 : y - 9; 
		const lineHeight = Math.max(16, titleFontSize + 2);
		const titleStartY = level === 0 ? y - 42 : y - 9; // root title start higher to fit 3 lines
		const valueY = level === 0 ? y + 52 : y + 5;     
		const accountsY = level === 0 ? y + 76 : y + 20;

		return (
			<g style={{ cursor: 'pointer' }} onClick={() => setSelectedNode(isSelected ? null : node.name)}>
				<rect
					x={x - width / 2}
					y={y - height / 2}
					width={width}
					height={height}
					rx={12}
					fill={isSelected ? style.stroke : style.fill}
					stroke={style.stroke}
					strokeWidth={isSelected ? 3 : 2}
					filter="drop-shadow(0px 6px 12px rgba(15,23,42,0.06))"
				/>
				{/* Title (single or multi-line for root) */}
				{titleLines.map((line, idx) => (
					<text
						key={idx}
						x={x}
						y={titleStartY + idx * lineHeight}
						textAnchor="middle"
						fontWeight={700}
						fill={isSelected ? '#ffffff' : style.text}
						style={{ fontSize: titleFontSize, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial' }}
					>
						{line}
					</text>
				))}

				{/* Value — make RM value more prominent for root */}
				{valueShown && (
					<text
						x={x}
						y={valueY}
						textAnchor="middle"
						fill={isSelected ? '#ffffff' : (level === 0 ? '#4338ca' : style.text)} // indigo for root value
						style={{ fontSize: valueFontSize, fontWeight: 600, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial' }}
					>
						{valueShown}
					</text>
				)}

				{/* Accounts */}
				{accountsShown && (
					<text
						x={x}
						y={accountsY}
						textAnchor="middle"
						fill={isSelected ? '#ffffff' : '#475569'}
						style={{ fontSize: accountsFontSize, fontWeight: 600, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial' }}
					>
						{accountsShown}
					</text>
				)}
			</g>
		);
	};

	const LConnector: React.FC<{ x1: number; y1: number; x2: number; y2: number; color?: string }> = ({
		x1,
		y1,
		x2,
		y2,
		color = '#c7d2fe'
	}) => {
		const midX = x1 + (x2 - x1) * 0.6;
		return (
			<g>
				<path
					d={`M${x1},${y1} H${midX} V${y2} H${x2}`}
					stroke={color}
					strokeWidth={2}
					fill="none"
					strokeLinecap="round"
				/>
			</g>
		);
	};

	// Render SVG manual layout following the positions and node hierarchy (mirrors your provided layout/positions)
	return (
		<Card title="Driver Tree By Account Class">
			<div className="flex justify-between items-center mb-4">
				<div className="text-xs text-gray-500">
					Click nodes to highlight • {selectedNode ? `Selected: ${selectedNode}` : 'Select a node'}
				</div>
				<div className="flex items-center space-x-2">
					<button className="p-2 bg-gray-100 rounded" onClick={zoomIn}>
						<FiZoomIn />
					</button>
					<button className="p-2 bg-gray-100 rounded" onClick={zoomOut}>
						<FiZoomOut />
					</button>
					<button className="p-2 bg-gray-100 rounded" onClick={resetZoom}>
						<FiRefreshCw />
					</button>
					<button className="p-2 bg-indigo-100 rounded" onClick={exportPNG}>
						<FiDownload />
					</button>
				</div>
			</div>

			<div
				ref={containerRef}
				className="relative h-[900px] bg-gradient-to-r from-gray-50 to-white rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				onMouseLeave={onMouseLeave}
			>
				{loading ? (
					<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
						<div className="text-lg text-gray-500 font-semibold">Loading Driver Tree...</div>
					</div>
				) : (
					<svg
						ref={svgRef}
						viewBox="0 0 3200 1600"
						width="100%"
						height="100%"
						style={{
							transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
							transformOrigin: 'left center'
						}}
					>
						<defs>
							<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M40 0 L0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#grid)" opacity="0.45" />

						{/* Root */}
						<NodeRect
							x={layout['root']?.x || 120}
							y={layout['root']?.y || 405}
							node={structure.root}
							level={0}
							width={300}    // slightly wider root
							height={220}   // slightly taller root to fit large numbers comfortably
						/>

						{/* Status nodes and downstream */}
						{structure.branches.map((status: any, sIdx: number) => {
							const statusId = `status-${sIdx}`;
							const statusPos = layout[statusId];
							if (!statusPos) return null;
							const statusColor = status.name === 'Active' ? NODE_COLORS.active.stroke : NODE_COLORS.inactive.stroke;

							return (
								<g key={status.name}>
									<LConnector
										// shortened vertical: endOffset moves the long vertical up by 20px
										x1={(layout['root']?.x || 120) + nodeWidthForLevel(0) / 2}
										y1={layout['root']?.y || 405}
										x2={statusPos.x - nodeWidthForLevel(1) / 2}
										y2={statusPos.y}
										color={statusColor}
									/>
									<NodeRect x={statusPos.x} y={statusPos.y} node={status} level={1} />

									{/* Government / Non-Government */}
									{(status.children || []).map((grp: any, gIdx: number) => {
										const groupId = `${statusId}-grp-${gIdx}`;
										const groupPos = layout[groupId];
										if (!groupPos) return null;
										const grpColor = NODE_COLORS.gov.stroke;
										return (
											<g key={grp.name}>
												<LConnector
													x1={statusPos.x + nodeWidthForLevel(1) / 2}
													y1={statusPos.y}
													x2={groupPos.x - nodeWidthForLevel(2) / 2}
													y2={groupPos.y}
													color={grpColor}
												/>
												<NodeRect x={groupPos.x} y={groupPos.y} node={grp} level={2} />

												{/* Account classes */}
												{(grp.children || []).map((acc: any, aIdx: number) => {
													const accId = `${groupId}-acc-${aIdx}`;
													const accPos = layout[accId];
													if (!accPos) return null;
													const accColor = getStyleByLevel(acc, 3).stroke;
													return (
														<g key={acc.name}>
															<LConnector
																x1={groupPos.x + nodeWidthForLevel(2) / 2}
																y1={groupPos.y}
																x2={accPos.x - nodeWidthForLevel(3) / 2}
																y2={accPos.y}
																color={accColor}
															/>
															<NodeRect x={accPos.x} y={accPos.y} node={acc} level={3} />

															{/* ADID horizontal bar + vertical connectors */}
															{(acc.children || []).length > 0 && (
																<g>
																	{(() => {
																		// collect leaf X positions, fall back to computed spacing if missing
																		const leafXs: number[] = (acc.children || []).map((_leaf: any, lIdx: number) => {
																			const leafId = `${accId}-leaf-${lIdx}`;
																			const lp = layout[leafId];
																			if (lp && typeof lp.x === 'number') return lp.x;
																			// fallback formula if layout missing (keeps spacing)
																			return (colX.adidStart || 1600) + lIdx * adidGapX;
																		});

																		const minX = Math.min(...leafXs);
																		const maxX = Math.max(...leafXs);
																		const padding = 24; // small padding on each side
																		const barStart = Math.min(accPos.x + nodeWidthForLevel(3) / 2 + 8, minX - padding);
																		const barEnd = Math.max(maxX + padding, accPos.x + nodeWidthForLevel(3) / 2 + 8);

																		return (
																			<>
																				{/* horizontal bar spanning from leftmost to rightmost ADID */}
																				<line
																					x1={barStart}
																					y1={accPos.y - 20}
																					x2={barEnd}
																					y2={accPos.y - 20}
																					stroke="#94a3b8"
																					strokeWidth={3}
																					opacity={0.8}
																				/>

																				{/* vertical connectors + nodes */}
																				{(acc.children || []).map((leaf: any, lIdx: number) => {
																					const leafId = `${accId}-leaf-${lIdx}`;
																					const leafPos = layout[leafId];
																					const leafX = leafPos ? leafPos.x : (colX.adidStart || 1600) + lIdx * adidGapX;
																					const leafColor = getStyleByLevel(leaf, 4).stroke;
																					return (
																						<g key={leaf.name}>
																							<line
																								x1={leafX}
																								y1={accPos.y + 30}
																								x2={leafX}
																								y2={accPos.y - 20}
																								stroke={leafColor}
																								strokeWidth={3}
																								opacity={0.9}
																							/>
																							<NodeRect x={leafX} y={leafPos ? leafPos.y : accPos.y + 30} node={leaf} level={4} />
																						</g>
																					);
																				})}
																			</>
																		);
																	})()}
																</g>
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
				{/* MIT legend */}
				<div className="absolute bottom-4 left-4 bg-white rounded-lg shadow p-3 border border-gray-200 z-10">
					<div className="font-bold text-lg">MIT</div>
					<div className="text-sm text-gray-600">
						CA:{' '}
						<span className="font-semibold text-gray-800">
							{mitInfo.mitNumOfAcc?.toLocaleString() ?? 0} accounts
						</span>
					</div>
					<div className="text-sm text-gray-600">
						RM:{' '}
						<span className="font-semibold text-indigo-700">
							{formatCurrency(mitInfo.mitAmount, 0, 0)}
						</span>
					</div>
				</div>

				{/* Zoom indicator */}
				<div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded shadow-sm z-10">
					<span className="text-xs text-gray-600">Zoom: {Math.round(zoom * 100)}%</span>
				</div>
			</div>
		</Card>
	);
};

export default DriverTree;
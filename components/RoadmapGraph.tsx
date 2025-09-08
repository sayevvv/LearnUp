// components/RoadmapGraph.tsx

"use client";

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  MarkerType, 
  Handle, 
  Position,
  NodeProps,
  NodeResizer,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CheckCircle, Calendar, Clock, BookOpen, Hammer, Dumbbell } from 'lucide-react';

// Interface diperbarui untuk data advanced
interface SubTask {
  task: string;
  type: 'teori' | 'projek' | 'latihan';
}

interface Milestone {
  timeframe: string;
  topic: string;
  // Prefer new 'subbab' (string[]) but keep legacy 'sub_tasks' for saved data
  subbab?: string[];
  sub_tasks?: Array<SubTask | string>;
  estimated_dates?: string;
  daily_duration?: string;
}

interface MilestoneNodeData {
  index: number;
  milestone: Milestone;
  onNodeClick: (node: Milestone) => void;
  onStartClick?: (milestoneIndex: number) => void;
  onSubbabClick?: (milestoneIndex: number, subIndex: number, title: string) => void;
  startButtonLabel?: string;
  promptMode: 'simple' | 'advanced';
  durationDays?: number;
  computedDates?: string; // computed from startDate and cumulative offsets
}

const MilestoneNode = memo(({ data, selected }: NodeProps<MilestoneNodeData>) => {
  const { index, milestone, onNodeClick, onStartClick, onSubbabClick, startButtonLabel, promptMode, durationDays, computedDates } = data;

  return (
    <div className="flex flex-col w-full p-4 text-left transition-colors bg-white dark:bg-[#0a0a0a] border shadow-md rounded-lg border-slate-200 dark:border-[#1f1f1f] hover:border-blue-500" style={{ minHeight: 180 }}>
      <NodeResizer color="#2563eb" handleStyle={{ width: 6, height: 6 }} lineStyle={{ borderWidth: 1.5 }} isVisible={selected} minWidth={320} minHeight={180} />
      
      {/* Handles untuk semua kemungkinan koneksi */}
      <Handle type="target" id="top" position={Position.Top} isConnectable={true} style={{ opacity: 0 }} />
      <Handle type="source" id="bottom" position={Position.Bottom} isConnectable={true} style={{ opacity: 0 }} />
      <Handle type="target" id="left" position={Position.Left} isConnectable={true} style={{ opacity: 0 }} />
      <Handle type="source" id="right" position={Position.Right} isConnectable={true} style={{ opacity: 0 }} />
      {/* Handle tambahan untuk aliran kanan-ke-kiri */}
      <Handle type="source" id="left-source" position={Position.Left} isConnectable={true} style={{ opacity: 0 }} />
      <Handle type="target" id="right-target" position={Position.Right} isConnectable={true} style={{ opacity: 0 }} />
      
      <div className="flex-grow">
  <div className="text-xs font-bold tracking-wider text-blue-600">{String(milestone.timeframe || `Tahap ${index + 1}`).toUpperCase()}</div>
  <div className="mt-1 text-base font-semibold text-slate-800 dark:text-neutral-100">{milestone.topic || 'Materi'}</div>
        {/* Duration badge and date details */}
        {(durationDays || computedDates || (promptMode === 'advanced' && (milestone.estimated_dates || milestone.daily_duration))) && (
          <div className="mt-2 space-y-1">
            {typeof durationDays === 'number' && durationDays > 0 ? (
              <div className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">({durationDays} hari)</div>
            ) : null}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-neutral-400">
              {(computedDates || milestone.estimated_dates) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{computedDates || milestone.estimated_dates}</span>
                </div>
              )}
              {promptMode === 'advanced' && milestone.daily_duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{milestone.daily_duration}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-neutral-300">
          {(milestone.subbab && milestone.subbab.length > 0
            ? milestone.subbab
            : (milestone.sub_tasks || []).map((stRaw) => (typeof stRaw === 'string' ? stRaw : (stRaw as any).task)))
            .map((title, ti) => (
              <li
                key={ti}
                className={`list-disc list-inside ${onSubbabClick ? 'cursor-pointer hover:underline' : ''}`}
                onClick={onSubbabClick ? () => onSubbabClick(index, ti, String(title)) : undefined}
                role={onSubbabClick ? 'button' : undefined}
                aria-label={onSubbabClick ? `Buka materi ${title}` : undefined}
              >
                {title}
              </li>
            ))}
        </ul>
      </div>
      <button
        onClick={() => (onStartClick ? onStartClick(index) : onNodeClick(milestone))}
        className="mt-4 w-full px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
      >
        {startButtonLabel || 'Jabarkan Materi'}
      </button>
    </div>
  );
});
MilestoneNode.displayName = 'MilestoneNode';

const baseNodeTypes = { milestone: MilestoneNode } as const;

const NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 240; // fallback height before measurement
const H_SPACING = 60;
const V_SPACING = 60;
const NODES_PER_ROW = 3;

function formatDateRange(start: Date, days: number) {
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, days - 1));
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const s = start.toLocaleDateString('id-ID', opts);
  const e = end.toLocaleDateString('id-ID', opts);
  return `${s} - ${e}`;
}

const generateFlowElements = (
  milestones: Milestone[],
  onNodeClick: (node: Milestone) => void,
  promptMode: 'simple' | 'advanced',
  startDate?: string,
  options?: { onStartClick?: (mi: number) => void; onSubbabClick?: (mi: number, si: number, title: string) => void; startButtonLabel?: string }
): { initialNodes: Node[], initialEdges: Edge[] } => {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // Precompute duration days per milestone and cumulative offsets
  const durations = milestones.map((m) => {
    const count = (m.subbab?.length ?? (m.sub_tasks?.length ?? 0));
    return Math.max(1, count);
  });
  const cumulativeOffsets = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));
  const baseDate = startDate ? new Date(startDate) : null;

  milestones.forEach((milestone, index) => {
    const nodeId = `milestone-${index}`;
    const row = Math.floor(index / NODES_PER_ROW);
    const col = index % NODES_PER_ROW;

    const y = row * (DEFAULT_NODE_HEIGHT + V_SPACING);
    const x = row % 2 === 0
      ? col * (NODE_WIDTH + H_SPACING)
      : (NODES_PER_ROW - 1 - col) * (NODE_WIDTH + H_SPACING);

    const durationDays = durations[index];
    const computedDates = baseDate ? formatDateRange(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + cumulativeOffsets[index]), durationDays) : undefined;

    initialNodes.push({
      id: nodeId,
      type: 'milestone',
      position: { x, y },
      data: { index: index, milestone, onNodeClick, promptMode, durationDays, computedDates, onStartClick: options?.onStartClick, onSubbabClick: options?.onSubbabClick, startButtonLabel: options?.startButtonLabel },
  style: { width: NODE_WIDTH, padding: 0, border: 'none', borderRadius: '12px', backgroundColor: 'transparent' },
    });

    if (index > 0) {
      const prevNodeId = `milestone-${index - 1}`;
  const prevRow = Math.floor((index - 1) / NODES_PER_ROW);
      
      let sourceHandle, targetHandle;

  if (row === prevRow) {
        if (row % 2 === 0) {
          sourceHandle = 'right';
          targetHandle = 'left';
        } else {
          sourceHandle = 'left-source';
          targetHandle = 'right-target';
        }
      } else {
        sourceHandle = 'bottom';
        targetHandle = 'top';
      }
      
      initialEdges.push({
        id: `e-${prevNodeId}-${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#a1a1aa' },
      });
    }
  });

  return { initialNodes, initialEdges };
};

export default function RoadmapGraph({ data, onNodeClick, promptMode, startDate, showMiniMap = false, onStartClick, onSubbabClick, startButtonLabel }: { data: { milestones: any[] }, onNodeClick: (milestone: any) => void, promptMode: 'simple' | 'advanced', startDate?: string, showMiniMap?: boolean, onStartClick?: (mi: number) => void, onSubbabClick?: (mi: number, si: number, title: string) => void, startButtonLabel?: string }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const nodeTypes = useMemo(() => ({ ...baseNodeTypes }), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const lastAppliedPositionsRef = useRef<number[]>([]);
  const needsLayoutRef = useRef(false);
  const sourceKeyRef = useRef<string>("");

  // Menggunakan useEffect untuk menginisialisasi atau memperbarui state
  // saat data roadmap baru diterima dari prop.
  useEffect(() => {
    // Only (re)generate graph when data content or mode changes
    const milestones = Array.isArray(data?.milestones) ? data.milestones : [];
    const key = `${promptMode}::${JSON.stringify(milestones)}`;
    if (sourceKeyRef.current === key) return;
    sourceKeyRef.current = key;
    const { initialNodes, initialEdges } = generateFlowElements(
      milestones,
      onNodeClick,
      promptMode,
      startDate,
      { onStartClick, onSubbabClick, startButtonLabel }
    );
    setNodes(initialNodes);
    setEdges(initialEdges);
    needsLayoutRef.current = true;
  }, [data?.milestones, promptMode, onNodeClick, startDate]);

  // Keep callbacks fresh without rebuilding positions
  useEffect(() => {
    setNodes((prev) => prev.map((n) => ({
      ...n,
      data: { ...(n.data as any), onNodeClick, onStartClick, onSubbabClick, startButtonLabel },
    })));
  }, [onNodeClick, onStartClick, onSubbabClick, startButtonLabel]);

  // After nodes render, measure actual node heights per row and adjust Y offsets to max height per row
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0 || !needsLayoutRef.current) return;
    // wait a frame for React Flow to paint nodes at current zoom
    const raf = requestAnimationFrame(() => {
      const zoom = zoomRef.current || 1;
      const rows: Record<number, { maxH: number }> = {};
      const totalRows = Math.ceil(nodes.length / NODES_PER_ROW);

      nodes.forEach((n, idx) => {
        const row = Math.floor(idx / NODES_PER_ROW);
        const sel = `.react-flow__node[data-id="${n.id}"], .react-flow__node-milestone[data-id="${n.id}"]`;
        const el = containerRef.current!.querySelector(sel) as HTMLElement | null;
        let h = el ? el.getBoundingClientRect().height : DEFAULT_NODE_HEIGHT;
        if (zoom && zoom !== 1) h = h / zoom; // normalize logical height
        rows[row] = { maxH: Math.max(rows[row]?.maxH || 0, h) };
      });

      // Build cumulative Y offsets per row
      const rowOffsets: number[] = [];
      let acc = 0;
      for (let r = 0; r < totalRows; r++) {
        const maxH = rows[r]?.maxH || DEFAULT_NODE_HEIGHT;
        rowOffsets[r] = acc;
        acc += maxH + V_SPACING;
      }

      // Check if positions would actually change
      const newYs = nodes.map((_, idx) => rowOffsets[Math.floor(idx / NODES_PER_ROW)]);
      const prevYs = lastAppliedPositionsRef.current;
      const changed = newYs.length !== prevYs.length || newYs.some((y, i) => Math.abs(y - (prevYs[i] ?? -9999)) > 0.5);
      if (!changed) return;
      lastAppliedPositionsRef.current = newYs;

    setNodes((prev) => prev.map((n, idx) => ({ ...n, position: { x: n.position.x, y: newYs[idx] } })));
    needsLayoutRef.current = false;
    });
  return () => cancelAnimationFrame(raf);
  }, [nodes]);

  // Callback untuk menangani perubahan node (termasuk drag)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  // Callback untuk menangani perubahan edge (jika ada di masa depan)
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  // Empty state when no milestones
  if (!Array.isArray(data?.milestones) || data.milestones.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Roadmap kosong. Coba buat ulang atau cek hasil generate.
      </div>
    );
  }

  return (
  <div style={{ height: '100%' }} ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true} 
        nodesConnectable={false}
        elementsSelectable={true}
  onMove={(_, viewport) => { zoomRef.current = viewport.zoom; }}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls showInteractive={false} className="fill-slate-600 stroke-slate-600 text-slate-600" />
        {showMiniMap ? (
          <MiniMap nodeStrokeWidth={3} zoomable={false} pannable={false} />
        ) : null}
      </ReactFlow>
    </div>
  );
}

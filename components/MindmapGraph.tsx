// components/MindmapGraph.tsx

"use client";

import { useMemo } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

interface SubTopic {
  id: number;
  topic: string;
  details: string;
  dependencies: number[];
}

interface MindmapGraphProps {
  data: {
    topic: string;
    subtopics: SubTopic[];
  };
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 70, // Jarak horizontal antar node
    ranksep: 120  // Jarak vertikal antar baris/rank
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const generateFlowElements = (subtopics: SubTopic[]): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  subtopics.forEach((subtopic) => {
    const nodeId = `subtopic-${subtopic.id}`;

    nodes.push({
      id: nodeId,
      position: { x: 0, y: 0 },
      data: { 
        label: (
          <div className="p-2 text-center">
            <div className="font-semibold text-gray-800">{subtopic.topic}</div>
            <p className="mt-1 text-xs text-gray-600">{subtopic.details}</p>
          </div>
        ),
      },
      style: { 
        border: '1px solid #9ca3af',
        borderRadius: '8px',
        background: '#f9fafb',
        width: nodeWidth,
        height: nodeHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    if (subtopic.dependencies && subtopic.dependencies.length > 0) {
      subtopic.dependencies.forEach(depId => {
        const sourceNodeId = `subtopic-${depId}`;
        edges.push({
          id: `e-${sourceNodeId}-${nodeId}`,
          source: sourceNodeId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#6b7280', strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280',
          },
        });
      });
    }
  });

  return getLayoutedElements(nodes, edges);
};

export default function MindmapGraph({ data }: MindmapGraphProps) {
  const { nodes, edges } = useMemo(() => generateFlowElements(data.subtopics), [data]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

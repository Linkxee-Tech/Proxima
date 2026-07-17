'use client';

import React, { useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as dagre from 'dagre';
import Icon from './Icon';

const nodeIcon = (kind) => ({ root: 'target', research: 'research', writing: 'pencil', design: 'design', code: 'code', task: 'workflow' }[kind] || 'workflow');

function statusLabel(status) {
  if (status === 'done' || status === 'completed') return 'Completed';
  if (status === 'waiting_approval' || status === 'waiting-approval') return 'Waiting approval';
  if (status === 'running') return 'Running';
  if (status === 'cancelled') return 'Cancelled';
  return 'Draft';
}

const CustomNode = ({ data }) => {
  const status = data.status;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <div className={`task-node ${data.kind} ${data.status}`} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
        <div className="task-node-head"><span className="node-icon"><Icon name={nodeIcon(data.kind)} size={16} /></span>
          <span className="task-node-kicker">{data.kind === 'root' ? 'Kernel' : data.kind}</span>
          <span className={`pill ${status === 'waiting_approval' || status === 'waiting-approval' ? 'warn' : status === 'running' ? 'running' : status === 'done' || status === 'completed' ? 'ok' : 'neutral'}`}>
            {statusLabel(status)}
          </span>
        </div>
        <strong>{data.label}</strong>
        <span className="task-node-copy">{data.subtitle}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 260;
const nodeHeight = 120;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function TaskGraph({ workflow, onNodeSelect }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!workflow) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const initialNodes = [
      {
        id: 'intent-root',
        type: 'custom',
        data: {
          label: workflow.parsed?.action ? `Intent: ${workflow.parsed.action}` : 'Intent',
          subtitle: workflow.goalText,
          kind: 'root',
          status: workflow.status,
          step: null,
        },
        position: { x: 0, y: 0 },
      },
      ...(workflow.steps || []).map((step, index) => ({
        id: step.id || `step-${index}`,
        type: 'custom',
        data: {
          label: step.title,
          subtitle: `${step.kind || 'task'}${step.isApprovalGate ? ' - human gate' : ''}`,
          kind: step.kind || 'task',
          status: step.status,
          isApprovalGate: step.isApprovalGate,
          step: step,
        },
        position: { x: 0, y: 0 },
      })),
    ];

    const initialEdges = initialNodes.flatMap((node) =>
      (node.data.step?.dependsOn || []).map((sourceId) => ({
        id: `${sourceId}-${node.id}`,
        source: sourceId,
        target: node.id,
        type: 'smoothstep',
        animated: node.data.status === 'running',
      }))
    );

    // Link intent-root to steps with no dependencies
    initialNodes.forEach(n => {
      if (n.id !== 'intent-root') {
        const deps = n.data.step?.dependsOn || [];
        if (deps.length === 0) {
          initialEdges.push({
            id: `intent-root-${n.id}`,
            source: 'intent-root',
            target: n.id,
            type: 'smoothstep',
            animated: n.data.status === 'running',
          });
        }
      }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [workflow, setNodes, setEdges]);

  if (!workflow) {
    return (
      <div className="details-empty compact">
        Select a workflow to inspect its task graph.
      </div>
    );
  }

  return (
    <div className="task-graph" style={{ width: '100%', height: '500px', background: 'transparent' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(event, node) => onNodeSelect?.(node.data)}
        fitView
        attributionPosition="bottom-left"
      >
        <Background gap={16} size={1} color="#333" />
        <Controls />
      </ReactFlow>
    </div>
  );
}

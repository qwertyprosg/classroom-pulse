import { useCallback, useMemo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

const NODE_WIDTH = 160
const NODE_HEIGHT = 44

function getNodeStyle(depth, isAlert) {
  const styles = [
    { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.5)', textSize: '13px', fontWeight: '700' },
    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', textSize: '12px', fontWeight: '600' },
    { bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.3)', textSize: '11px', fontWeight: '500' },
    { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', textSize: '10px', fontWeight: '400' },
  ]
  const s = styles[Math.min(depth, styles.length - 1)]
  if (isAlert) return {
    background: 'rgba(239,68,68,0.2)',
    border: '2px solid #ef4444',
    color: '#fca5a5',
    fontSize: s.textSize,
    fontWeight: '700',
    padding: '6px 10px',
    borderRadius: '10px',
    fontFamily: 'Inter, sans-serif',
    animation: 'node-glow-red 1s ease-in-out infinite alternate',
  }
  return {
    background: s.bg,
    border: `1.5px solid ${s.border}`,
    color: '#f0f0f5',
    fontSize: s.textSize,
    fontWeight: s.fontWeight,
    padding: '6px 10px',
    borderRadius: '10px',
    fontFamily: 'Inter, sans-serif',
  }
}

function treeToFlow(node, parentId = null, depth = 0, counter = { n: 0 }, alertNodeTitle = null) {
  const id = `n${counter.n++}`
  const isAlert = alertNodeTitle && node.title?.toLowerCase().includes(alertNodeTitle?.toLowerCase())
  const flowNode = {
    id,
    data: { label: node.title || 'Untitled' },
    position: { x: 0, y: 0 },
    style: getNodeStyle(depth, isAlert),
    type: 'default',
  }
  const nodes = [flowNode]
  const edges = []
  if (parentId) edges.push({
    id: `e${parentId}-${id}`,
    source: parentId, target: id,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff20' },
    style: { stroke: '#ffffff18', strokeWidth: 1.5 },
    animated: depth === 0,
  })
  for (const child of node.children || []) {
    const { nodes: cn, edges: ce } = treeToFlow(child, id, depth + 1, counter, alertNodeTitle)
    nodes.push(...cn); edges.push(...ce)
  }
  return { nodes, edges }
}

function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 50 })
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map(n => {
    const { x, y } = g.node(n.id)
    return { ...n, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } }
  })
}

export default function MindMap({ tree, alertNodeTitle }) {
  const { rawNodes, rawEdges } = useMemo(() => {
    if (!tree) return { rawNodes: [], rawEdges: [] }
    const { nodes, edges } = treeToFlow(tree, null, 0, { n: 0 }, alertNodeTitle)
    return { rawNodes: nodes, rawEdges: edges }
  }, [tree, alertNodeTitle])

  const laidOutNodes = useMemo(() => {
    if (!rawNodes.length) return []
    return layoutGraph(rawNodes, rawEdges)
  }, [rawNodes, rawEdges])

  const [nodes, , onNodesChange] = useNodesState(laidOutNodes)
  const [edges, , onEdgesChange] = useEdgesState(rawEdges)

  // Sync nodes when tree changes
  const syncedNodes = useMemo(() => laidOutNodes, [laidOutNodes])

  if (!tree) return (
    <div className="flex flex-col items-center justify-center h-full text-white/30 gap-3">
      <div className="text-4xl">🗺️</div>
      <p className="text-sm">Upload a PDF to generate the mind map</p>
    </div>
  )

  return (
    <ReactFlow
      nodes={syncedNodes}
      edges={rawEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.2}
      maxZoom={2}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#ffffff08" gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={n => n.style?.border?.includes('168,85,247') ? '#a855f7' : '#3b82f660'}
        maskColor="rgba(15,15,23,0.7)"
        style={{ borderRadius: 10, border: '1px solid #ffffff14' }}
      />
    </ReactFlow>
  )
}

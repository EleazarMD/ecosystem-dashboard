/**
 * Memory Graph Visualization Component
 * 
 * Interactive visualization of IDE memories and their relationships using Reactflow
 * Visualizes memory nodes, knowledge graph connections, and validation status
 * 
 * @module components/memory/MemoryGraph
 * @updated 2025-07-18
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge, Button } from 'react-bootstrap';

// Component colors
const COMPONENT_COLORS: Record<string, string> = {
  'api-gateway': '#007bff',
  'knowledge-graph': '#6f42c1',
  'auth-service': '#28a745',
  'new-service': '#ffc107',
  'core-service': '#dc3545',
  'monitoring': '#17a2b8',
  'ui-components': '#fd7e14',
  'database': '#6c757d'
};

// Memory types from parent component
interface IDEMemory {
  id: string;
  title: string;
  content: string;
  component: string;
  tags: string[];
  created: string;
  updated: string;
  validationResults: ValidationResult[];
  contradictions: number;
  kgContext?: any;
}

interface ValidationResult {
  rule: string;
  valid: boolean;
  warnings: string[];
  errors: string[];
}

// Props for the MemoryGraph component
interface MemoryGraphProps {
  memories: IDEMemory[];
  onNodeSelect?: (memory: IDEMemory) => void;
}

// Custom node data interface
interface MemoryNodeData {
  label: string;
  component: string;
  isValid: boolean;
  contradictions: number;
  memory: IDEMemory;
}

// Custom edge data interface
interface MemoryEdgeData {
  label: string;
  relationshipType: string;
}

// Custom memory node component
const MemoryNode = ({ data }: { data: MemoryNodeData }) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '5px',
        background: data.isValid ? '#ffffff' : '#fff5f5',
        border: `2px solid ${
          data.contradictions > 0
            ? '#dc3545'
            : data.component && COMPONENT_COLORS[data.component]
              ? COMPONENT_COLORS[data.component]
              : '#6c757d'
        }`,
        width: 180,
        fontSize: '12px',
        color: '#333',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div className="d-flex justify-content-between align-items-center">
        <strong style={{ fontSize: '14px', wordBreak: 'break-word' }}>{data.label}</strong>
        {data.contradictions > 0 && (
          <Badge bg="danger" pill>
            {data.contradictions}
          </Badge>
        )}
      </div>
      {data.component && (
        <Badge
          style={{
            backgroundColor: COMPONENT_COLORS[data.component] || '#6c757d',
            marginTop: '5px',
            display: 'inline-block'
          }}
        >
          {data.component}
        </Badge>
      )}
      {!data.isValid && (
        <Badge bg="warning" text="dark" style={{ marginLeft: '5px', marginTop: '5px' }}>
          Invalid
        </Badge>
      )}
    </div>
  );
};

// Node types mapping
const nodeTypes = {
  memoryNode: MemoryNode,
};

/**
 * Memory Graph Component 
 * Displays interactive visualization of memories and their relationships
 */
const MemoryGraph: React.FC<MemoryGraphProps> = ({ memories, onNodeSelect }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layout, setLayout] = useState<'dagre' | 'force' | 'concentric'>('dagre');

  // Convert memories to nodes and edges for ReactFlow
  const createGraphElements = useCallback(() => {
    if (!memories || memories.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const memoryNodes: Node<MemoryNodeData>[] = [];
    const memoryEdges: Edge<MemoryEdgeData>[] = [];
    const nodePositions: Record<string, { x: number, y: number }> = {};
    
    // Create nodes
    memories.forEach((memory, index) => {
      const isValid = memory.validationResults?.every(r => r.valid) ?? true;

      // Position nodes in a grid layout initially
      const row = Math.floor(index / 4); // 4 nodes per row
      const col = index % 4;
      const position = {
        x: col * 250 + 50,
        y: row * 150 + 50,
      };
      
      nodePositions[memory.id] = position;
      
      memoryNodes.push({
        id: memory.id,
        position,
        data: {
          label: memory.title,
          component: memory.component,
          isValid,
          contradictions: memory.contradictions,
          memory
        },
        type: 'memoryNode',
      });
    });

    // Create edges based on Knowledge Graph relationships
    memories.forEach(memory => {
      // If we have KG context with relationships
      if (memory.kgContext?.relationships) {
        memory.kgContext.relationships.forEach((rel: any) => {
          const targetMemory = memories.find(m => 
            m.id === rel.targetId || 
            (m.kgContext?.entityId && m.kgContext.entityId === rel.targetId)
          );
          
          if (targetMemory) {
            memoryEdges.push({
              id: `${memory.id}-${targetMemory.id}`,
              source: memory.id,
              target: targetMemory.id,
              sourceHandle: null, // Explicitly set to null instead of undefined
              targetHandle: null, // Explicitly set to null instead of undefined
              label: rel.type || 'related',
              markerEnd: {
                type: MarkerType.Arrow,
              },
              type: 'smoothstep',
              style: { stroke: '#555', strokeWidth: 2 },
              data: {
                label: rel.type || 'related',
                relationshipType: rel.type || 'related'
              }
            });
          }
        });
      }
      
      // Create edges for contradictions
      if (memory.contradictions > 0 && memory.kgContext?.contradictions) {
        memory.kgContext.contradictions.forEach((contradiction: any) => {
          const targetMemory = memories.find(m => m.id === contradiction.memoryId);
          
          if (targetMemory) {
            memoryEdges.push({
              id: `contradiction-${memory.id}-${targetMemory.id}`,
              source: memory.id,
              target: targetMemory.id,
              sourceHandle: null, // Explicitly set to null instead of undefined
              targetHandle: null, // Explicitly set to null instead of undefined
              label: 'contradicts',
              markerEnd: {
                type: MarkerType.Arrow,
              },
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#dc3545', strokeWidth: 2 },
              data: {
                label: 'contradicts',
                relationshipType: 'contradiction'
              }
            });
          }
        });
      }
    });

    // Also create edges based on component relationships
    const componentGroups: Record<string, string[]> = {};
    
    memories.forEach(memory => {
      if (memory.component) {
        if (!componentGroups[memory.component]) {
          componentGroups[memory.component] = [];
        }
        componentGroups[memory.component].push(memory.id);
      }
    });
    
    // Connect memories with the same component with a subtle edge
    Object.values(componentGroups).forEach(group => {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            memoryEdges.push({
              id: `component-${group[i]}-${group[j]}`,
              source: group[i],
              target: group[j],
              sourceHandle: null, // Explicitly set to null instead of undefined
              targetHandle: null, // Explicitly set to null instead of undefined
              animated: false,
              style: { stroke: '#aaa', strokeWidth: 1, opacity: 0.5 },
              type: 'straight',
              data: {
                label: 'same-component',
                relationshipType: 'component'
              }
            });
          }
        }
      }
    });

    setNodes(memoryNodes);
    setEdges(memoryEdges);
    
  }, [memories, setNodes, setEdges]);

  // Initialize graph on component mount or when memories change
  useEffect(() => {
    createGraphElements();
  }, [memories, createGraphElements]);

  // Handle node click
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    if (onNodeSelect && node.data?.memory) {
      onNodeSelect(node.data.memory);
    }
  };

  // Apply different layouts
  const applyLayout = (layoutType: 'dagre' | 'force' | 'concentric') => {
    setLayout(layoutType);
    
    // In a real implementation, we would apply the layout algorithm here
    // For this implementation, we'll just use different spacing patterns
    
    const newNodes = [...nodes];
    
    if (layoutType === 'dagre') {
      // Tree-like layout
      newNodes.forEach((node, index) => {
        const level = Math.floor(index / 3);
        const position = index % 3;
        node.position = {
          x: position * 300 + 100,
          y: level * 150 + 100,
        };
      });
    } else if (layoutType === 'force') {
      // Circular layout
      const radius = 300;
      const count = newNodes.length;
      newNodes.forEach((node, index) => {
        const angle = (index / count) * 2 * Math.PI;
        node.position = {
          x: Math.cos(angle) * radius + 400,
          y: Math.sin(angle) * radius + 300,
        };
      });
    } else if (layoutType === 'concentric') {
      // Concentric circles by component
      const componentGroups: Record<string, Node[]> = {};
      
      newNodes.forEach(node => {
        const component = node.data?.component || 'unknown';
        if (!componentGroups[component]) {
          componentGroups[component] = [];
        }
        componentGroups[component].push(node);
      });
      
      let currentX = 200;
      Object.entries(componentGroups).forEach(([component, componentNodes]) => {
        const radius = 100;
        const count = componentNodes.length;
        
        componentNodes.forEach((node, index) => {
          const angle = (index / count) * 2 * Math.PI;
          node.position = {
            x: Math.cos(angle) * radius + currentX,
            y: Math.sin(angle) * radius + 250,
          };
        });
        
        currentX += 350;
      });
    }
    
    setNodes([...newNodes]);
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Controls />
        <MiniMap />
        <Background color="#f8f8f8" gap={16} />
        
        <Panel position="top-right">
          <div className="bg-light p-2 rounded">
            <small className="d-block mb-2">Layout:</small>
            <Button 
              size="sm" 
              variant={layout === 'dagre' ? 'primary' : 'outline-primary'}
              className="me-1 mb-1" 
              onClick={() => applyLayout('dagre')}
            >
              Hierarchical
            </Button>
            <Button 
              size="sm" 
              variant={layout === 'force' ? 'primary' : 'outline-primary'}
              className="me-1 mb-1" 
              onClick={() => applyLayout('force')}
            >
              Radial
            </Button>
            <Button 
              size="sm" 
              variant={layout === 'concentric' ? 'primary' : 'outline-primary'}
              className="me-1 mb-1" 
              onClick={() => applyLayout('concentric')}
            >
              By Component
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default MemoryGraph;

/**
 * Service Architecture Visualizer Component
 * 
 * Visualizes service architecture patterns, dependencies, and relationships
 * based on Knowledge Graph data and live Kubernetes cluster information
 * 
 * @module components/infrastructure/ServiceArchitectureVisualizer
 * @updated 2025-07-19
 * @version 2.0.0
 * @features
 * - Real-time Kubernetes cluster integration
 * - Live service status from K8s API
 * - Dynamic pod and service visualization
 * - Multi-namespace support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Form, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

// Component types
interface ServiceNode {
  id: string;
  name: string;
  type: string;
  component?: string;
  status?: string;
  ports?: number[];
  description?: string;
  validationStatus?: 'valid' | 'warning' | 'invalid';
  kgData?: any;
  // Kubernetes-specific properties
  k8sData?: {
    namespace?: string;
    podCount?: number;
    replicaCount?: number;
    ready?: boolean;
    restarts?: number;
    age?: string;
    nodeName?: string;
    resourceUsage?: {
      cpu?: string;
      memory?: string;
    };
  };
  // Real-time status from K8s
  liveStatus?: 'Running' | 'Pending' | 'Failed' | 'Unknown';
  // Health indicator from K8s health checks
  healthStatus?: 'healthy' | 'warning' | 'error' | 'unknown';
}

// Kubernetes-specific service data from our API
interface K8sServiceHealth {
  name: string;
  app: string;
  status: string;
  ready: boolean;
  restarts: number;
  age: string;
  nodeName: string;
  namespace?: string;
}

interface ServiceRelationship {
  source: string;
  target: string;
  type: string;
  label?: string;
  properties?: Record<string, any>;
}

interface ServiceArchitectureVisualizerProps {
  focusService?: string;
  onServiceSelect?: (serviceId: string) => void;
}

// Custom node for services
const ServiceNodeComponent = ({ data }: { data: any }) => {
  // Get border color based on validation status
  const getBorderColor = () => {
    switch (data.validationStatus) {
      case 'valid': return '#28a745';
      case 'warning': return '#ffc107';
      case 'invalid': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Get background color based on component
  const getBackgroundColor = () => {
    if (!data.component) return '#f8f9fa';
    
    // Component color mapping
    const componentColors: Record<string, string> = {
      'core': '#e3f2fd',
      'auth': '#ffebee',
      'knowledge-graph': '#f3e5f5',
      'tools': '#e8f5e9',
      'messaging': '#fff8e1',
      'monitoring': '#fbe9e7',
      'web': '#e8eaf6'
    };
    
    return componentColors[data.component] || '#f8f9fa';
  };
  
  return (
    <div 
      className="service-node-container"
      style={{
        padding: '10px',
        borderRadius: '5px',
        border: `2px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor(),
        width: 180,
        fontSize: '12px',
        position: 'relative', // Required for absolute positioning of handles
      }}
    >
      {/* Add invisible connection handles */}
      <div 
        id={`${data.id}-source`}
        className="react-flow__handle react-flow__handle-source" 
        style={{ opacity: 0, position: 'absolute', right: -8, top: '50%' }} 
      />
      <div 
        id={`${data.id}-target`}
        className="react-flow__handle react-flow__handle-target" 
        style={{ opacity: 0, position: 'absolute', left: -8, top: '50%' }} 
      />
      <div className="node-header" style={{ marginBottom: '8px' }}>
        <div className="node-title fw-bold" style={{ fontSize: '14px' }}>
          {data.label}
        </div>
        <div className="node-type">
          <Badge bg="secondary">{data.serviceType}</Badge>
        </div>
      </div>
      
      {data.component && (
        <div className="node-component mb-1">
          <Badge bg="primary" pill>{data.component}</Badge>
        </div>
      )}
      
      {data.ports && data.ports.length > 0 && (
        <div className="node-ports mb-1">
          <small>
            <strong>Ports:</strong> {data.ports.join(', ')}
          </small>
        </div>
      )}
      
      {/* Kubernetes-specific information */}
      {data.k8sData && (
        <div className="k8s-info mb-1" style={{ fontSize: '10px', backgroundColor: 'rgba(0,123,255,0.1)', padding: '4px', borderRadius: '3px' }}>
          {data.k8sData.namespace && (
            <div><strong>NS:</strong> {data.k8sData.namespace}</div>
          )}
          {data.k8sData.podCount !== undefined && (
            <div><strong>Pods:</strong> {data.k8sData.podCount}/{data.k8sData.replicaCount || 1}</div>
          )}
          {data.k8sData.restarts !== undefined && data.k8sData.restarts > 0 && (
            <div style={{ color: '#dc3545' }}><strong>Restarts:</strong> {data.k8sData.restarts}</div>
          )}
          {data.k8sData.age && (
            <div><strong>Age:</strong> {data.k8sData.age}</div>
          )}
        </div>
      )}
      
      {/* Live status indicator */}
      {data.liveStatus && (
        <div className="live-status mb-1">
          <Badge 
            bg={data.liveStatus === 'Running' ? 'success' : 
                data.liveStatus === 'Pending' ? 'warning' : 
                data.liveStatus === 'Failed' ? 'danger' : 'secondary'}
            style={{ fontSize: '9px' }}
          >
            🔴 {data.liveStatus}
          </Badge>
        </div>
      )}
      
      {data.description && (
        <div className="node-description text-muted" style={{ fontSize: '11px' }}>
          {data.description.length > 50 ? 
            `${data.description.substring(0, 50)}...` : 
            data.description
          }
        </div>
      )}
    </div>
  );
};

/**
 * Main Service Architecture Visualizer Component
 */
const ServiceArchitectureVisualizer: React.FC<ServiceArchitectureVisualizerProps> = ({ 
  focusService,
  onServiceSelect 
}) => {
  // State for service architecture data
  const [services, setServices] = useState<ServiceNode[]>([]);
  const [relationships, setRelationships] = useState<ServiceRelationship[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<string>('dagre-horizontal');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterComponent, setFilterComponent] = useState<string>('all');
  const [focusDepth, setFocusDepth] = useState<number>(2);
  const [dataSource, setDataSource] = useState<'knowledge-graph' | 'sample-data'>('knowledge-graph');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Custom node types registration for ReactFlow
  // Using default React Flow node types to avoid handle errors
  // Using default React Flow node types

  /**
   * Get color for relationship type
   */
  const getRelationshipColor = useCallback((type: string): string => {
    const colors: Record<string, string> = {
      'DEPENDS_ON': '#ff0072',
      'COMMUNICATES_WITH': '#43a2fb',
      'PART_OF': '#26a69a',
      'PROVIDES': '#a259ff',
      'USES': '#f5a623',
      'DEPLOYED_ON': '#ec407a',
      'IMPLEMENTS': '#ffa726'
    };
    
    return colors[type] || '#9e9e9e';
  }, []);
  
  /**
   * Apply layout algorithm to position nodes
   */
  const applyLayout = useCallback((nodes: Node[], edges: Edge[]) => {
    // Simple force-directed layout algorithm
    // In a real application, use a proper layout library like dagre or elk
    
    const nodeMap = new Map<string, Node>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Assign positions based on a grid layout
    const columns = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 300;
    
    nodes.forEach((node, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      node.position = {
        x: col * spacing,
        y: row * spacing
      };
    });
    
    return { nodes, edges };
  }, []);
  
  /**
   * Convert service architecture data to ReactFlow nodes and edges
   */
  const convertToReactFlowElements = useCallback(
    (services: ServiceNode[], relationships: ServiceRelationship[]) => {
      if (!services || services.length === 0) {
        console.log('No services to convert to ReactFlow elements');
        setNodes([]);
        setEdges([]);
        return;
      }

      console.log(`Converting ${services.length} services and ${relationships?.length || 0} relationships to ReactFlow elements`);
      
      // Create nodes from services
      const flowNodes: Node[] = services.map((service, index) => ({
        id: service.id,
        position: { x: 0, y: 0 }, // Initial position, will be updated by layout algorithm
        // Use default React Flow node type instead of custom node
        data: {
          ...service,
          label: service.name,
          serviceType: service.type
        },
        // Add source and target handles directly to node definition
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        // Use standard node with handles
        type: 'default'
      }));
      
      // Create edges from relationships
      const flowEdges: Edge[] = relationships ? relationships.map((rel, index) => ({
        id: `e-${rel.source}-${rel.target}-${index}`,
        source: rel.source,
        target: rel.target,
        // Remove handle references
        sourceHandle: null,
        targetHandle: null,
        label: rel.type,
        type: 'smoothstep',
        animated: true,
        style: { stroke: getRelationshipColor(rel.type) },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getRelationshipColor(rel.type)
        },
      })) : [];
      
      // Apply layout algorithm
      const positionedElements = applyLayout(flowNodes, flowEdges);
      
      // Update ReactFlow state
      setNodes(positionedElements.nodes);
      setEdges(positionedElements.edges);
    }, [applyLayout, setNodes, setEdges, getRelationshipColor]
  );
  
  /**
   * Fetch live Kubernetes service data
   */
  const fetchKubernetesData = useCallback(async (): Promise<K8sServiceHealth[]> => {
    try {
      const response = await fetch('http://localhost:8099/api/services/health');
      
      if (!response.ok) {
        console.warn('Kubernetes API not available, skipping K8s data');
        return [];
      }
      
      const data = await response.json();
      return data.services || [];
    } catch (err) {
      console.warn('Failed to fetch Kubernetes data:', err);
      return [];
    }
  }, []);

  /**
   * Enhance services with Kubernetes data
   */
  const enhanceServicesWithK8sData = useCallback((baseServices: ServiceNode[], k8sData: K8sServiceHealth[]): ServiceNode[] => {
    if (!k8sData || k8sData.length === 0) {
      return baseServices;
    }

    return baseServices.map(service => {
      // Try to match service with K8s data
      // Look for matches by name, app label, or partial matches
      const k8sService = k8sData.find(k8s => 
        k8s.name.toLowerCase().includes(service.name.toLowerCase()) ||
        k8s.app?.toLowerCase().includes(service.name.toLowerCase()) ||
        service.name.toLowerCase().includes(k8s.name.toLowerCase())
      );

      if (k8sService) {
        return {
          ...service,
          k8sData: {
            namespace: k8sService.namespace || 'default',
            podCount: 1, // This would come from actual pod data
            replicaCount: 1,
            ready: k8sService.ready,
            restarts: k8sService.restarts,
            age: k8sService.age,
            nodeName: k8sService.nodeName
          },
          liveStatus: k8sService.status as 'Running' | 'Pending' | 'Failed' | 'Unknown',
          healthStatus: k8sService.ready ? 'healthy' : 
                       k8sService.restarts > 5 ? 'error' : 
                       k8sService.restarts > 0 ? 'warning' : 'unknown'
        };
      }

      return service;
    });
  }, []);

  /**
   * Load service architecture data from Knowledge Graph and enhance with Kubernetes data
   */
  const loadServiceArchitecture = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Show toast for operation start
      toast.info('Loading service architecture and Kubernetes data...', { autoClose: 2000 });
      
      // Fetch Knowledge Graph data first
      let kgData: any = null;
      try {
        const queryParams = new URLSearchParams();
        if (focusService) {
          queryParams.append('focusService', focusService);
        }
        queryParams.append('depth', focusDepth.toString());
        
        const kgResponse = await fetch(`/api/knowledge-graph/service-architecture?${queryParams.toString()}`);
        if (kgResponse.ok) {
          kgData = await kgResponse.json();
        }
      } catch (error) {
        console.warn('Failed to fetch Knowledge Graph data:', error);
      }

      // Fetch Kubernetes data
      const k8sServices = await fetchKubernetesData();
      
      // Process Knowledge Graph data
      let baseServices: ServiceNode[] = SAMPLE_SERVICES;
      let relationships: ServiceRelationship[] = SAMPLE_RELATIONSHIPS;
      let dataSourceType = 'sample-data';
      
      if (kgData && !kgData.error && kgData.services && kgData.services.length > 0) {
        baseServices = kgData.services;
        relationships = kgData.relationships || [];
        dataSourceType = kgData.source === 'sample-data' ? 'sample-data' : 'knowledge-graph';
      }
      
      // Enhance services with K8s data
      const enhancedServices = enhanceServicesWithK8sData(baseServices, k8sServices);
      
      console.log('Service architecture data loaded:', {
        kgServices: baseServices.length,
        k8sServices: k8sServices.length,
        enhancedServices: enhancedServices.length
      });
      
      setServices(enhancedServices);
      setRelationships(relationships);
      setDataSource(dataSourceType);
      
      // Convert services and relationships to ReactFlow nodes and edges
      convertToReactFlowElements(enhancedServices, relationships);
      
      // Show appropriate toast notification
      const hasK8sData = k8sServices.length > 0;
      if (dataSourceType === 'knowledge-graph' && hasK8sData) {
        toast.success(`Loaded ${enhancedServices.length} services with live K8s data`);
      } else if (dataSourceType === 'knowledge-graph') {
        toast.success(`Loaded ${enhancedServices.length} services from Knowledge Graph`);
      } else if (hasK8sData) {
        toast.info(`Using sample data enhanced with ${k8sServices.length} K8s services`);
      } else {
        toast.info('Using sample service architecture data');
      }
      
    } catch (err: any) {
      console.error('Error loading service architecture:', err);
      setError(`Failed to load service architecture: ${err.message}`);
      toast.error('Failed to load service architecture data');
      
      // Fallback to sample data
      setServices(SAMPLE_SERVICES);
      setRelationships(SAMPLE_RELATIONSHIPS);
      setDataSource('sample-data');
      convertToReactFlowElements(SAMPLE_SERVICES, SAMPLE_RELATIONSHIPS);
      toast.info('Using sample service architecture data');
    } finally {
      setIsLoading(false);
    }
  }, [focusService, focusDepth, convertToReactFlowElements, fetchKubernetesData, enhanceServicesWithK8sData]);

  // End of loadServiceArchitecture function
  
  // ReactFlow layout effect

  // Load service architecture data when component mounts
  useEffect(() => {
    loadServiceArchitecture();
  }, [loadServiceArchitecture]);

  /**
   * Handle node click to select service
   */
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onServiceSelect) {
      onServiceSelect(node.id);
    }
  }, [onServiceSelect]);

  /**
   * Get filtered services based on search term and component filter
   */
  const getFilteredServices = () => {
    return services.filter(service => {
      // Apply component filter
      if (filterComponent !== 'all' && service.component !== filterComponent) {
        return false;
      }
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          service.name.toLowerCase().includes(searchLower) ||
          service.type.toLowerCase().includes(searchLower) ||
          (service.description && service.description.toLowerCase().includes(searchLower)) ||
          (service.component && service.component.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  };

  /**
   * Render the service architecture visualization
   */
  return (
    <div className="service-architecture-visualizer">
      {/* Filters and Controls */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Service Architecture Filters</strong>
          {/* Data source indicator */}
          <div>
            <Badge bg={dataSource === 'knowledge-graph' ? 'success' : 'warning'} className="ms-2">
              {dataSource === 'knowledge-graph' ? 'Live KG Data' : 'Sample Data'}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Component</Form.Label>
                <Form.Select 
                  value={filterComponent} 
                  onChange={(e) => setFilterComponent(e.target.value)}
                >
                  <option value="all">All Components</option>
                  <option value="core">Core</option>
                  <option value="auth">Authentication</option>
                  <option value="knowledge-graph">Knowledge Graph</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="tools">Tools</option>
                  <option value="messaging">Messaging</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="web">Web</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Layout</Form.Label>
                <Form.Select 
                  value={layout} 
                  onChange={(e) => setLayout(e.target.value)}
                >
                  <option value="dagre-horizontal">Hierarchical (Horizontal)</option>
                  <option value="dagre-vertical">Hierarchical (Vertical)</option>
                  <option value="force">Force-Directed</option>
                  <option value="concentric">Concentric</option>
                  <option value="grid">Grid</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end mt-2">
            <Button 
              variant="outline-primary"
              onClick={loadServiceArchitecture}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Loading...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>
      
      {/* Flow Visualization */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Service Architecture</strong>
          {focusService && (
            <Badge bg="info">Focused on: {focusService}</Badge>
          )}
        </Card.Header>
        <Card.Body>
          {error ? (
            <Alert variant="warning">
              <Alert.Heading>Error Loading Service Architecture</Alert.Heading>
              <p>{error}</p>
              <p>Showing sample data instead.</p>
            </Alert>
          ) : null}
          
          <div style={{ height: 600 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              // Using default node types for better compatibility
              fitView
              attributionPosition="bottom-left"
              connectionLineType={ConnectionLineType.SmoothStep}
              elementsSelectable={true}
            >
              <Controls />
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={12} 
                size={1} 
              />
            </ReactFlow>
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="d-flex flex-wrap">
            {/* Relationship type legend */}
            <div className="me-3 mb-2">
              <strong className="me-2">Relationship Types:</strong>
              {['DEPENDS_ON', 'COMMUNICATES_WITH', 'PART_OF', 'PROVIDES', 'USES'].map(type => (
                <Badge 
                  key={type} 
                  className="me-1" 
                  style={{ 
                    backgroundColor: getRelationshipColor(type),
                    marginRight: '3px'
                  }}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

// Sample data to use when API fails (enhanced with K8s demo data)
const SAMPLE_SERVICES: ServiceNode[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    type: 'api',
    component: 'core',
    status: 'active',
    ports: [8500],
    description: 'Central API Gateway for all services',
    validationStatus: 'valid',
    // Demo K8s data
    k8sData: {
      namespace: 'ai-homelab',
      podCount: 2,
      replicaCount: 2,
      ready: true,
      restarts: 0,
      age: '5d',
      nodeName: 'k8s-master',
      resourceUsage: {
        cpu: '125m',
        memory: '256Mi'
      }
    },
    liveStatus: 'Running',
    healthStatus: 'healthy'
  },
  {
    id: 'auth-service',
    name: 'Authentication Service',
    type: 'authentication',
    component: 'auth',
    status: 'active',
    ports: [8801, 8802],
    description: 'Handles user authentication and authorization',
    validationStatus: 'valid',
    k8sData: {
      namespace: 'ai-homelab',
      podCount: 1,
      replicaCount: 1,
      ready: true,
      restarts: 2,
      age: '3d',
      nodeName: 'k8s-worker-1'
    },
    liveStatus: 'Running',
    healthStatus: 'warning' // Due to restarts
  },
  {
    id: 'kg-api',
    name: 'Knowledge Graph API',
    type: 'api',
    component: 'knowledge-graph',
    status: 'active',
    ports: [8765],
    description: 'API for Knowledge Graph operations',
    validationStatus: 'valid',
    k8sData: {
      namespace: 'kg-system',
      podCount: 3,
      replicaCount: 3,
      ready: true,
      restarts: 1,
      age: '7d',
      nodeName: 'k8s-worker-2'
    },
    liveStatus: 'Running',
    healthStatus: 'healthy'
  },
  {
    id: 'kg-db',
    name: 'Neo4j Database',
    type: 'database',
    component: 'knowledge-graph',
    status: 'active',
    ports: [7474, 7687],
    description: 'Graph database for Knowledge Graph',
    validationStatus: 'valid'
  },
  {
    id: 'kg-postgres',
    name: 'PostgreSQL Vector DB',
    type: 'database',
    component: 'knowledge-graph',
    status: 'active',
    ports: [5445],
    description: 'Vector database for Knowledge Graph',
    validationStatus: 'valid'
  },
  {
    id: 'event-bus',
    name: 'Event Bus',
    type: 'messaging',
    component: 'messaging',
    status: 'active',
    ports: [8600],
    description: 'Event bus for system-wide messaging',
    validationStatus: 'valid'
  },
  {
    id: 'ecosystem-dashboard',
    name: 'Ecosystem Dashboard',
    type: 'web-service',
    component: 'tools',
    status: 'active',
    ports: [8404],
    description: 'Dashboard for ecosystem monitoring',
    validationStatus: 'valid'
  },
  {
    id: 'kubernetes-api',
    name: 'Kubernetes API Service',
    type: 'api',
    component: 'infrastructure',
    status: 'active',
    ports: [8099],
    description: 'Kubernetes cluster management API',
    validationStatus: 'valid',
    k8sData: {
      namespace: 'monitoring',
      podCount: 1,
      replicaCount: 1,
      ready: true,
      restarts: 0,
      age: '1d',
      nodeName: 'k8s-master'
    },
    liveStatus: 'Running',
    healthStatus: 'healthy'
  },
  {
    id: 'monitoring-service',
    name: 'Monitoring Service',
    type: 'monitoring',
    component: 'tools',
    status: 'active',
    ports: [9000],
    description: 'System monitoring service',
    validationStatus: 'valid'
  },
  {
    id: 'ahis-server',
    name: 'AHIS Server',
    type: 'api',
    component: 'core',
    status: 'active',
    ports: [8888, 8889],
    description: 'AI Homelab Integration Server',
    validationStatus: 'valid'
  }
];

const SAMPLE_RELATIONSHIPS: ServiceRelationship[] = [
  {
    source: 'ecosystem-dashboard',
    target: 'api-gateway',
    type: 'DEPENDS_ON'
  },
  {
    source: 'ecosystem-dashboard',
    target: 'kg-api',
    type: 'COMMUNICATES_WITH'
  },
  {
    source: 'api-gateway',
    target: 'auth-service',
    type: 'DEPENDS_ON'
  },
  {
    source: 'api-gateway',
    target: 'kg-api',
    type: 'DEPENDS_ON'
  },
  {
    source: 'api-gateway',
    target: 'ahis-server',
    type: 'DEPENDS_ON'
  },
  {
    source: 'kg-api',
    target: 'kg-db',
    type: 'DEPENDS_ON'
  },
  {
    source: 'kg-api',
    target: 'kg-postgres',
    type: 'DEPENDS_ON'
  },
  {
    source: 'event-bus',
    target: 'api-gateway',
    type: 'COMMUNICATES_WITH'
  },
  {
    source: 'monitoring-service',
    target: 'api-gateway',
    type: 'COMMUNICATES_WITH'
  },
  {
    source: 'monitoring-service',
    target: 'event-bus',
    type: 'DEPENDS_ON'
  },
  {
    source: 'auth-service',
    target: 'event-bus',
    type: 'USES'
  },
  {
    source: 'ahis-server',
    target: 'event-bus',
    type: 'USES'
  }
];

export default ServiceArchitectureVisualizer;

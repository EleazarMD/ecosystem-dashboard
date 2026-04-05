/**
 * Port Registry Visualizer Component
 * 
 * Visualizes port assignments and usage across AI Homelab services
 * Integrates with Knowledge Graph for service relationship visualization
 * 
 * @module components/infrastructure/PortRegistryVisualizer
 * @updated 2025-07-18
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Table, Card, Badge, Alert, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

// Port registry types
interface PortAssignment {
  port: number;
  serviceName: string;
  serviceType: string;
  protocol: 'http' | 'https' | 'tcp' | 'udp' | 'grpc' | 'websocket';
  status: 'active' | 'inactive' | 'reserved' | 'conflict';
  description: string;
  owner?: string;
  component?: string;
  lastVerified?: string;
  kgData?: any;
}

interface PortRangeDefinition {
  startPort: number;
  endPort: number;
  purpose: string;
  color: string;
}

interface PortRegistryVisualizerProps {
  onSelectService?: (serviceName: string) => void;
}

/**
 * Port ranges according to AI Homelab standards
 */
const PORT_RANGES: PortRangeDefinition[] = [
  { startPort: 8400, endPort: 8499, purpose: 'Web Dashboards', color: '#007bff' },
  { startPort: 8500, endPort: 8599, purpose: 'API Services', color: '#28a745' },
  { startPort: 8600, endPort: 8699, purpose: 'Event Bus', color: '#fd7e14' },
  { startPort: 8700, endPort: 8799, purpose: 'Knowledge Graph', color: '#6f42c1' },
  { startPort: 8800, endPort: 8899, purpose: 'Authentication', color: '#dc3545' },
  { startPort: 8900, endPort: 8999, purpose: 'Core Services', color: '#17a2b8' }
];

/**
 * Port Registry Visualizer Component
 */
const PortRegistryVisualizer: React.FC<PortRegistryVisualizerProps> = ({ onSelectService }) => {
  // State for port registry data
  const [portRegistry, setPortRegistry] = useState<PortAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  /**
   * Load port registry data from Knowledge Graph
   */
  const loadPortRegistry = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Show toast for operation start
      toast.info('Loading port registry from Knowledge Graph...', { autoClose: 2000 });
      
      const response = await fetch('/api/knowledge-graph/port-registry', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load port registry: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`API error: ${data.error}`);
      }
      
      setPortRegistry(data.ports || []);
      toast.success(`Loaded ${data.ports?.length || 0} port assignments`, { autoClose: 2000 });
    } catch (error: any) {
      console.error('Error loading port registry:', error);
      setError(error.message);
      toast.error(`Failed to load port registry: ${error.message}`, { autoClose: 3000 });
      
      // Load sample data in case of error
      setPortRegistry(SAMPLE_PORT_REGISTRY);
    } finally {
      setIsLoading(false);
    }
  };

  // Load port registry on component mount
  useEffect(() => {
    loadPortRegistry();
  }, []);

  /**
   * Get port range information for a specific port
   */
  const getPortRange = (port: number): PortRangeDefinition | undefined => {
    return PORT_RANGES.find(range => port >= range.startPort && port <= range.endPort);
  };

  /**
   * Apply filters to port registry data
   */
  const getFilteredPorts = (): PortAssignment[] => {
    return portRegistry.filter(port => {
      // Apply service type filter
      if (filterType !== 'all' && port.serviceType !== filterType) {
        return false;
      }
      
      // Apply status filter
      if (filterStatus !== 'all' && port.status !== filterStatus) {
        return false;
      }
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          port.serviceName.toLowerCase().includes(searchLower) ||
          port.description.toLowerCase().includes(searchLower) ||
          port.port.toString().includes(searchLower) ||
          (port.component && port.component.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  };

  /**
   * Get badge variant based on port status
   */
  const getStatusBadgeVariant = (status: string): string => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'reserved': return 'warning';
      case 'conflict': return 'danger';
      default: return 'light';
    }
  };

  /**
   * Render the port visualization
   */
  const renderPortVisualization = () => {
    const filteredPorts = getFilteredPorts();
    
    return (
      <div className="port-visualization-wrapper">
        {/* Filters */}
        <Card className="mb-4 shadow-sm">
          <Card.Header>
            <strong>Port Registry Filters</strong>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Service Type</Form.Label>
                  <Form.Select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="web-service">Web Service</option>
                    <option value="api">API</option>
                    <option value="database">Database</option>
                    <option value="microservice">Microservice</option>
                    <option value="messaging">Messaging</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="authentication">Authentication</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="reserved">Reserved</option>
                    <option value="conflict">Conflict</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Search</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Search ports, services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Port Registry Table */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Port Registry</strong>
            <div>
              <Button 
                size="sm"
                variant="outline-primary"
                onClick={loadPortRegistry}
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
          </Card.Header>
          <Card.Body>
            {error ? (
              <Alert variant="warning">
                <Alert.Heading>Error Loading Port Registry</Alert.Heading>
                <p>{error}</p>
                <p>Showing sample data instead.</p>
              </Alert>
            ) : null}
            
            <div className="port-table-container">
              <Table striped hover responsive className="port-registry-table">
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>Service</th>
                    <th>Type</th>
                    <th>Protocol</th>
                    <th>Component</th>
                    <th>Status</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPorts.map(port => {
                    const portRange = getPortRange(port.port);
                    
                    return (
                      <tr 
                        key={`${port.port}-${port.serviceName}`}
                        style={{
                          borderLeft: portRange ? `4px solid ${portRange.color}` : undefined
                        }}
                        className={port.status === 'conflict' ? 'table-danger' : ''}
                        onClick={() => onSelectService && onSelectService(port.serviceName)}
                      >
                        <td>
                          <strong>{port.port}</strong>
                          {portRange && (
                            <div>
                              <small className="text-muted">{portRange.purpose}</small>
                            </div>
                          )}
                        </td>
                        <td>{port.serviceName}</td>
                        <td>
                          <Badge bg="info">{port.serviceType}</Badge>
                        </td>
                        <td>
                          <Badge bg="secondary">{port.protocol}</Badge>
                        </td>
                        <td>
                          {port.component ? (
                            <Badge bg="primary">{port.component}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(port.status)}>
                            {port.status}
                          </Badge>
                        </td>
                        <td>
                          {port.description}
                          {port.lastVerified && (
                            <div>
                              <small className="text-muted">
                                Verified: {new Date(port.lastVerified).toLocaleDateString()}
                              </small>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              
              {filteredPorts.length === 0 && (
                <div className="text-center p-4">
                  <p className="text-muted">No ports match the current filters</p>
                </div>
              )}
            </div>
          </Card.Body>
          <Card.Footer>
            <small className="text-muted">
              Showing {getFilteredPorts().length} of {portRegistry.length} port assignments
            </small>
          </Card.Footer>
        </Card>
        
        {/* Port Range Legend */}
        <Card className="shadow-sm mb-4">
          <Card.Header>
            <strong>Port Range Legend</strong>
          </Card.Header>
          <Card.Body>
            <div className="d-flex flex-wrap">
              {PORT_RANGES.map(range => (
                <div 
                  key={range.purpose}
                  className="me-3 mb-2 p-2 rounded d-flex align-items-center"
                  style={{ borderLeft: `4px solid ${range.color}` }}
                >
                  <div>
                    <div><strong>{range.purpose}</strong></div>
                    <small className="text-muted">{range.startPort}-{range.endPort}</small>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  };

  return (
    <div className="port-registry-visualizer">
      {renderPortVisualization()}
    </div>
  );
};

// Sample data to use when API fails
const SAMPLE_PORT_REGISTRY: PortAssignment[] = [
  {
    port: 8404,
    serviceName: 'ecosystem-dashboard',
    serviceType: 'web-service',
    protocol: 'http',
    status: 'active',
    description: 'AI Homelab Ecosystem Dashboard',
    component: 'tools',
    lastVerified: '2025-07-18T12:00:00Z'
  },
  {
    port: 8405,
    serviceName: 'ecosystem-dashboard-dev',
    serviceType: 'web-service',
    protocol: 'http',
    status: 'active',
    description: 'AI Homelab Ecosystem Dashboard (Development)',
    component: 'tools',
    lastVerified: '2025-07-18T12:00:00Z'
  },
  {
    port: 8500,
    serviceName: 'api-gateway',
    serviceType: 'api',
    protocol: 'http',
    status: 'active',
    description: 'API Gateway Service',
    component: 'core',
    lastVerified: '2025-07-17T14:30:00Z'
  },
  {
    port: 8600,
    serviceName: 'event-bus',
    serviceType: 'messaging',
    protocol: 'websocket',
    status: 'active',
    description: 'Event Bus for system-wide messaging',
    component: 'core',
    lastVerified: '2025-07-17T14:30:00Z'
  },
  {
    port: 8765,
    serviceName: 'kg-api',
    serviceType: 'api',
    protocol: 'http',
    status: 'active',
    description: 'Knowledge Graph API',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 8766,
    serviceName: 'kg-mcp',
    serviceType: 'api',
    protocol: 'http',
    status: 'active',
    description: 'Knowledge Graph MCP Server - HTTP Transport',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 8767,
    serviceName: 'kg-mcp-ws',
    serviceType: 'api',
    protocol: 'websocket',
    status: 'active',
    description: 'Knowledge Graph MCP Server - WebSocket Transport',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 7474,
    serviceName: 'kg-db-http',
    serviceType: 'database',
    protocol: 'http',
    status: 'active',
    description: 'Neo4j Graph Database HTTP Interface',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 7687,
    serviceName: 'kg-db-bolt',
    serviceType: 'database',
    protocol: 'tcp',
    status: 'active',
    description: 'Neo4j Graph Database Bolt Protocol',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 5445,
    serviceName: 'kg-postgres',
    serviceType: 'database',
    protocol: 'tcp',
    status: 'active',
    description: 'PostgreSQL Vector Database for Knowledge Graph',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 6379,
    serviceName: 'kg-redis',
    serviceType: 'database',
    protocol: 'tcp',
    status: 'active',
    description: 'Redis Cache for Knowledge Graph',
    component: 'knowledge-graph',
    lastVerified: '2025-07-17T09:45:00Z'
  },
  {
    port: 8801,
    serviceName: 'auth-service',
    serviceType: 'authentication',
    protocol: 'http',
    status: 'active',
    description: 'Authentication Service',
    component: 'auth',
    lastVerified: '2025-07-16T16:20:00Z'
  },
  {
    port: 8802,
    serviceName: 'auth-callback',
    serviceType: 'authentication',
    protocol: 'http',
    status: 'active',
    description: 'Authentication Callback Handler',
    component: 'auth',
    lastVerified: '2025-07-16T16:20:00Z'
  },
  {
    port: 8888,
    serviceName: 'ahis-server',
    serviceType: 'api',
    protocol: 'http',
    status: 'active',
    description: 'AI Homelab Integration Server',
    component: 'core',
    lastVerified: '2025-07-15T10:15:00Z'
  },
  {
    port: 8889,
    serviceName: 'ahis-ws',
    serviceType: 'api',
    protocol: 'websocket',
    status: 'active',
    description: 'AI Homelab Integration Server WebSocket',
    component: 'core',
    lastVerified: '2025-07-15T10:15:00Z'
  },
  {
    port: 9000,
    serviceName: 'monitoring-service',
    serviceType: 'monitoring',
    protocol: 'http',
    status: 'active',
    description: 'System Monitoring Service',
    component: 'tools',
    lastVerified: '2025-07-14T08:45:00Z'
  },
  {
    port: 9090,
    serviceName: 'prometheus',
    serviceType: 'monitoring',
    protocol: 'http',
    status: 'active',
    description: 'Prometheus Metrics Server',
    component: 'tools',
    lastVerified: '2025-07-14T08:45:00Z'
  },
  {
    port: 3000,
    serviceName: 'grafana',
    serviceType: 'monitoring',
    protocol: 'http',
    status: 'active',
    description: 'Grafana Dashboard',
    component: 'tools',
    lastVerified: '2025-07-14T08:45:00Z'
  },
  {
    port: 8505,
    serviceName: 'duplicate-service',
    serviceType: 'api',
    protocol: 'http',
    status: 'conflict',
    description: 'Conflicting Port Assignment',
    component: 'unknown',
    lastVerified: '2025-07-18T12:30:00Z'
  }
];

export default PortRegistryVisualizer;

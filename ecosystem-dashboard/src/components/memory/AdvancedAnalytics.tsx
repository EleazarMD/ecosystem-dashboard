/**
 * Advanced Memory Analytics Component
 *
 * Provides detailed analytics visualizations for IDE memories including:
 * - Time series validation data
 * - Component relationship strength
 * - Pattern detection metrics
 * - Knowledge Graph health indicators
 * 
 * @module components/memory/AdvancedAnalytics
 * @updated 2025-07-18
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Types for analytics data
interface TimeSeriesDataPoint {
  date: string;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  totalMemories: number;
}

interface RelationshipStrength {
  component: string;
  connections: number;
  strength: string;
  validationScore: string;
}

interface PatternDetection {
  pattern: string;
  occurrences: number;
  validationRate: string;
}

interface KGHealthMetrics {
  nodeCount: number;
  relationshipCount: number;
  patternConsistency: string;
  queryResponseTime: string;
  lastUpdated: string;
}

interface AnalyticsData {
  timeSeriesData: TimeSeriesDataPoint[];
  relationshipStrength: RelationshipStrength[];
  patternDetection: PatternDetection[];
  kgHealthMetrics: KGHealthMetrics;
  component: string;
  timeRange: string;
  timestamp: string;
}

// Component properties
interface AdvancedAnalyticsProps {
  onRefreshData?: () => void;
}

// Color constants
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ onRefreshData }) => {
  // State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  
  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Construct query parameters
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (selectedComponent) params.append('component', selectedComponent);
      
      // Fetch data from API
      const response = await fetch(`/api/ide-memory/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalyticsData(data);
      
      // Notify success
      toast.success('Analytics data refreshed successfully');
    } catch (err: any) {
      console.error('Failed to fetch analytics data:', err);
      setError(err.message || 'Failed to fetch analytics data');
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  // Handle filter changes
  const handleFilterChange = () => {
    fetchAnalytics();
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="advanced-analytics">
      {/* Filters */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Time Range</Form.Label>
                    <Form.Select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                    >
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                      <option value="365d">Last Year</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Component Focus</Form.Label>
                    <Form.Select
                      value={selectedComponent}
                      onChange={(e) => setSelectedComponent(e.target.value)}
                    >
                      <option value="">All Components</option>
                      <option value="authentication">Authentication</option>
                      <option value="api-gateway">API Gateway</option>
                      <option value="service-mesh">Service Mesh</option>
                      <option value="port-registry">Port Registry</option>
                      <option value="memory-management">Memory Management</option>
                      <option value="knowledge-graph">Knowledge Graph</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button 
                    variant="primary" 
                    onClick={handleFilterChange} 
                    disabled={loading}
                    className="w-100"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Refresh Data
                      </>
                    )}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Error display */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}
      
      {/* Loading indicator */}
      {loading && !analyticsData && (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading analytics data...</p>
        </div>
      )}
      
      {analyticsData && (
        <>
          {/* Time Series Analysis */}
          <Card className="mb-4 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Memory Validation Over Time</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={analyticsData.timeSeriesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate} 
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      const nameMap: {[key: string]: string} = {
                        validCount: 'Valid',
                        warningCount: 'Warning',
                        invalidCount: 'Invalid',
                        totalMemories: 'Total'
                      };
                      return [value, nameMap[name] || name];
                    }}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="totalMemories" 
                    stroke="#8884d8" 
                    name="Total Memories" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="validCount" 
                    stroke="#28a745" 
                    name="Valid" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="warningCount" 
                    stroke="#ffc107" 
                    name="Warning" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="invalidCount" 
                    stroke="#dc3545" 
                    name="Invalid" 
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-center text-muted mt-2">
                <small>Time range: {timeRange === '7d' ? 'Last 7 days' : 
                               timeRange === '30d' ? 'Last 30 days' : 
                               timeRange === '90d' ? 'Last 90 days' : 'Last year'}</small>
              </div>
            </Card.Body>
          </Card>
          
          {/* Components and Pattern Analysis */}
          <Row>
            {/* Component Relationship Strength */}
            <Col md={6}>
              <Card className="mb-4 shadow-sm">
                <Card.Header>
                  <h5 className="mb-0">Component Relationship Strength</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={analyticsData.relationshipStrength}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="component" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="connections" fill="#8884d8" name="Connections" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>Connections</th>
                          <th>Strength</th>
                          <th>Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.relationshipStrength.map((item, index) => (
                          <tr key={index}>
                            <td>{item.component}</td>
                            <td>{item.connections}</td>
                            <td>{parseFloat(item.strength) * 100}%</td>
                            <td>
                              <Badge bg={
                                parseFloat(item.validationScore) > 90 ? 'success' :
                                parseFloat(item.validationScore) > 70 ? 'info' :
                                parseFloat(item.validationScore) > 50 ? 'warning' : 'danger'
                              }>
                                {item.validationScore}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            {/* Pattern Detection */}
            <Col md={6}>
              <Card className="mb-4 shadow-sm">
                <Card.Header>
                  <h5 className="mb-0">Pattern Detection Analysis</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      data={analyticsData.patternDetection.map(p => ({
                        ...p,
                        validationRateNum: parseFloat(p.validationRate)
                      }))}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="pattern" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Validation Rate"
                        dataKey="validationRateNum"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Pattern</th>
                          <th>Occurrences</th>
                          <th>Validation Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.patternDetection.map((item, index) => (
                          <tr key={index}>
                            <td>{item.pattern}</td>
                            <td>{item.occurrences}</td>
                            <td>
                              <Badge bg={
                                parseFloat(item.validationRate) > 90 ? 'success' :
                                parseFloat(item.validationRate) > 70 ? 'info' :
                                parseFloat(item.validationRate) > 50 ? 'warning' : 'danger'
                              }>
                                {item.validationRate}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Knowledge Graph Health */}
          <Card className="mb-4 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Knowledge Graph Health</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="d-flex flex-column">
                    <div className="mb-3 p-3 border rounded">
                      <h6>Node Count</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fs-4">{analyticsData.kgHealthMetrics.nodeCount.toLocaleString()}</span>
                        <Badge bg="info">Neo4j</Badge>
                      </div>
                    </div>
                    <div className="mb-3 p-3 border rounded">
                      <h6>Relationship Count</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fs-4">{analyticsData.kgHealthMetrics.relationshipCount.toLocaleString()}</span>
                        <Badge bg="info">Neo4j</Badge>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex flex-column">
                    <div className="mb-3 p-3 border rounded">
                      <h6>Pattern Consistency</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="progress w-75" style={{ height: '30px' }}>
                          <div 
                            className={`progress-bar ${
                              parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 90 ? 'bg-success' :
                              parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 70 ? 'bg-info' :
                              parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 50 ? 'bg-warning' : 'bg-danger'
                            }`}
                            role="progressbar" 
                            style={{ width: `${analyticsData.kgHealthMetrics.patternConsistency}%` }}
                            aria-valuenow={parseFloat(analyticsData.kgHealthMetrics.patternConsistency)}
                            aria-valuemin={0} 
                            aria-valuemax={100}
                          >
                            {analyticsData.kgHealthMetrics.patternConsistency}%
                          </div>
                        </div>
                        <Badge bg={
                          parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 90 ? 'success' :
                          parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 70 ? 'info' :
                          parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 50 ? 'warning' : 'danger'
                        }>
                          {
                            parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 90 ? 'Excellent' :
                            parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 70 ? 'Good' :
                            parseFloat(analyticsData.kgHealthMetrics.patternConsistency) > 50 ? 'Fair' : 'Poor'
                          }
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-3 p-3 border rounded">
                      <h6>Query Response Time</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fs-4">{analyticsData.kgHealthMetrics.queryResponseTime} ms</span>
                        <Badge bg={
                          parseFloat(analyticsData.kgHealthMetrics.queryResponseTime) < 20 ? 'success' :
                          parseFloat(analyticsData.kgHealthMetrics.queryResponseTime) < 50 ? 'info' :
                          parseFloat(analyticsData.kgHealthMetrics.queryResponseTime) < 100 ? 'warning' : 'danger'
                        }>
                          {
                            parseFloat(analyticsData.kgHealthMetrics.queryResponseTime) < 20 ? 'Fast' :
                            parseFloat(analyticsData.kgHealthMetrics.queryResponseTime) < 50 ? 'Good' :
                            parseFloat(analyticsData.kgHealthMetrics.queryResponseTime) < 100 ? 'Slow' : 'Very Slow'
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
              <div className="text-center text-muted mt-2">
                <small>Last updated: {new Date(analyticsData.kgHealthMetrics.lastUpdated).toLocaleString()}</small>
              </div>
            </Card.Body>
          </Card>
          
          {/* Update info */}
          <div className="text-end text-muted">
            <small>Analytics data refreshed: {new Date(analyticsData.timestamp).toLocaleString()}</small>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedAnalytics;

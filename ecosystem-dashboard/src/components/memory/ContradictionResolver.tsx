/**
 * Contradiction Resolution Modal
 * 
 * This component provides a comprehensive interface for resolving contradictions
 * between IDE memories with side-by-side comparison, merge capabilities,
 * and Knowledge Graph context.
 * 
 * @module components/memory/ContradictionResolver
 * @updated 2025-07-18
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Form, Spinner, Badge, Row, Col, Card, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Diff, DiffEditor } from '@monaco-editor/react';

// Types definitions
interface IDEMemory {
  id: string;
  title: string;
  content: string;
  component?: string;
  tags: string[];
  created: string;
  updated: string;
  validationResults?: ValidationResult[];
  contradictions?: number;
  kgContext?: any;
}

interface ValidationResult {
  rule: string;
  valid: boolean;
  warnings: string[];
  errors: string[];
}

interface ContradictionPair {
  primaryMemory: IDEMemory;
  contradictingMemory: IDEMemory;
  contradictionReason?: string;
  kgContextData?: any;
}

interface ContradictionResolverProps {
  show: boolean;
  onHide: () => void;
  contradictionPair?: ContradictionPair | null;
  onResolve: (resolution: ResolutionAction) => Promise<boolean>;
}

interface ResolutionAction {
  action: 'keep_primary' | 'keep_contradicting' | 'merge' | 'delete_both' | 'mark_compatible';
  mergedMemory?: Partial<IDEMemory>;
  resolutionComment: string;
  updateKgRelationships: boolean;
}

/**
 * Contradiction Resolution Modal Component
 */
const ContradictionResolver: React.FC<ContradictionResolverProps> = ({ 
  show, 
  onHide,
  contradictionPair,
  onResolve
}) => {
  // State for resolution form
  const [activeTab, setActiveTab] = useState('compare');
  const [resolutionAction, setResolutionAction] = useState<'keep_primary' | 'keep_contradicting' | 'merge' | 'delete_both' | 'mark_compatible'>('keep_primary');
  const [resolutionComment, setResolutionComment] = useState('');
  const [updateKgRelationships, setUpdateKgRelationships] = useState(true);
  const [mergedContent, setMergedContent] = useState('');
  const [mergedTitle, setMergedTitle] = useState('');
  const [mergedTags, setMergedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKgContext, setShowKgContext] = useState(false);

  // Reset form when contradiction changes
  useEffect(() => {
    if (contradictionPair) {
      setResolutionAction('keep_primary');
      setResolutionComment('');
      setMergedContent(contradictionPair.primaryMemory.content);
      setMergedTitle(contradictionPair.primaryMemory.title);
      setMergedTags(contradictionPair.primaryMemory.tags || []);
    }
  }, [contradictionPair]);

  // If no contradiction pair is provided, don't render
  if (!contradictionPair) {
    return null;
  }

  const { primaryMemory, contradictingMemory, contradictionReason, kgContextData } = contradictionPair;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare merged memory if that's the selected action
      let mergedMemory: Partial<IDEMemory> | undefined;
      
      if (resolutionAction === 'merge') {
        mergedMemory = {
          ...primaryMemory,
          title: mergedTitle,
          content: mergedContent,
          tags: mergedTags,
          updated: new Date().toISOString()
        };
      }
      
      // Create resolution action object
      const resolution: ResolutionAction = {
        action: resolutionAction,
        mergedMemory,
        resolutionComment,
        updateKgRelationships
      };
      
      // Submit resolution to parent component
      const success = await onResolve(resolution);
      
      if (success) {
        toast.success('Contradiction resolved successfully');
        onHide();
      } else {
        toast.error('Failed to resolve contradiction');
      }
    } catch (error) {
      console.error('Error resolving contradiction:', error);
      toast.error('Error resolving contradiction');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format date string for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Find differences between memories to highlight
  const findDifferences = () => {
    const differences: string[] = [];
    
    if (primaryMemory.title !== contradictingMemory.title) {
      differences.push('Title');
    }
    
    if (primaryMemory.content !== contradictingMemory.content) {
      differences.push('Content');
    }
    
    if (primaryMemory.component !== contradictingMemory.component) {
      differences.push('Component');
    }
    
    // Compare tags
    const primaryTags = new Set(primaryMemory.tags || []);
    const contradictingTags = new Set(contradictingMemory.tags || []);
    if (primaryTags.size !== contradictingTags.size || 
        ![...primaryTags].every(tag => contradictingTags.has(tag))) {
      differences.push('Tags');
    }
    
    return differences;
  };
  
  const differences = findDifferences();

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      dialogClassName="contradiction-modal"
      size="xl"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Resolve Memory Contradiction
          {contradictionReason && (
            <Badge bg="danger" className="ms-2">{contradictionReason}</Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Tabs 
          activeKey={activeTab} 
          onSelect={(k) => k && setActiveTab(k)}
          className="mb-3"
        >
          {/* Comparison Tab */}
          <Tab eventKey="compare" title="Side-by-Side Comparison">
            <Alert variant="info">
              <strong>Contradiction detected!</strong> The following memories have conflicting information.
              {differences.length > 0 && (
                <div className="mt-2">
                  <strong>Conflicts in:</strong> {differences.join(', ')}
                </div>
              )}
            </Alert>
            
            <Row>
              {/* Primary Memory */}
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Primary Memory</strong>
                      <span className="ms-2 text-white-50">ID: {primaryMemory.id.substring(0, 8)}...</span>
                    </div>
                    <Badge bg="light" text="dark">
                      {formatDate(primaryMemory.updated)}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <h5>{primaryMemory.title}</h5>
                    <div className="mb-2">
                      {primaryMemory.tags?.map(tag => (
                        <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>
                      ))}
                    </div>
                    <div className="memory-content border rounded p-2" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <pre style={{ whiteSpace: 'pre-wrap' }}>{primaryMemory.content}</pre>
                    </div>
                    {primaryMemory.component && (
                      <div className="mt-2">
                        <strong>Component:</strong> {primaryMemory.component}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              {/* Contradicting Memory */}
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Contradicting Memory</strong>
                      <span className="ms-2 text-white-50">ID: {contradictingMemory.id.substring(0, 8)}...</span>
                    </div>
                    <Badge bg="light" text="dark">
                      {formatDate(contradictingMemory.updated)}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <h5>{contradictingMemory.title}</h5>
                    <div className="mb-2">
                      {contradictingMemory.tags?.map(tag => (
                        <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>
                      ))}
                    </div>
                    <div className="memory-content border rounded p-2" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <pre style={{ whiteSpace: 'pre-wrap' }}>{contradictingMemory.content}</pre>
                    </div>
                    {contradictingMemory.component && (
                      <div className="mt-2">
                        <strong>Component:</strong> {contradictingMemory.component}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {/* Diff View */}
            <Card className="mt-3">
              <Card.Header>
                <strong>Content Difference</strong>
              </Card.Header>
              <Card.Body style={{ height: '250px' }}>
                <Diff
                  original={primaryMemory.content}
                  modified={contradictingMemory.content}
                  language="markdown"
                />
              </Card.Body>
            </Card>
            
            {/* Knowledge Graph Context Button */}
            <div className="text-center mt-3">
              <Button
                variant="outline-primary"
                onClick={() => setShowKgContext(!showKgContext)}
              >
                {showKgContext ? 'Hide KG Context' : 'Show Knowledge Graph Context'}
              </Button>
            </div>
            
            {/* Knowledge Graph Context Section */}
            {showKgContext && kgContextData && (
              <Card className="mt-3">
                <Card.Header>Knowledge Graph Context</Card.Header>
                <Card.Body>
                  {kgContextData.entities ? (
                    <div className="kg-context">
                      <h6>Related Entities:</h6>
                      <ul>
                        {kgContextData.entities.map((entity: any, idx: number) => (
                          <li key={idx}>
                            <strong>{entity.name}</strong> ({entity.type})
                            {entity.description && <div><small>{entity.description}</small></div>}
                          </li>
                        ))}
                      </ul>
                      
                      {kgContextData.recommendations && (
                        <div className="mt-3">
                          <h6>KG Recommendations:</h6>
                          <Alert variant="info">
                            {kgContextData.recommendations.preferred === primaryMemory.id ? 
                              'Knowledge Graph analysis suggests keeping the Primary Memory.' :
                              'Knowledge Graph analysis suggests keeping the Contradicting Memory.'
                            }
                            <div className="mt-1">
                              <small>{kgContextData.recommendations.reason}</small>
                            </div>
                          </Alert>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">No Knowledge Graph context available</p>
                  )}
                </Card.Body>
              </Card>
            )}
          </Tab>
          
          {/* Resolution Tab */}
          <Tab eventKey="resolve" title="Resolve Contradiction">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label><strong>Resolution Action</strong></Form.Label>
                <Form.Select 
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value as any)}
                >
                  <option value="keep_primary">Keep Primary Memory (Delete Contradicting)</option>
                  <option value="keep_contradicting">Keep Contradicting Memory (Delete Primary)</option>
                  <option value="merge">Merge Both Memories</option>
                  <option value="delete_both">Delete Both Memories</option>
                  <option value="mark_compatible">Mark as Compatible (No Contradiction)</option>
                </Form.Select>
              </Form.Group>
              
              {resolutionAction === 'merge' && (
                <div className="merge-form border rounded p-3 mb-3">
                  <h5>Merge Memories</h5>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Merged Title</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={mergedTitle}
                      onChange={(e) => setMergedTitle(e.target.value)}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Merged Content</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={8}
                      value={mergedContent}
                      onChange={(e) => setMergedContent(e.target.value)}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Tags (comma-separated)</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={mergedTags.join(', ')}
                      onChange={(e) => setMergedTags(e.target.value.split(',').map(tag => tag.trim()))}
                    />
                  </Form.Group>
                  
                  {/* Interactive Merge Editor */}
                  <Card className="mb-3">
                    <Card.Header>Visual Merge Editor</Card.Header>
                    <Card.Body style={{ height: '250px' }}>
                      <DiffEditor
                        original={primaryMemory.content}
                        modified={contradictingMemory.content}
                        language="markdown"
                        onMount={(editor) => {
                          // Add editor reference if needed for future operations
                        }}
                      />
                    </Card.Body>
                  </Card>
                </div>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label><strong>Resolution Comment</strong></Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3}
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  placeholder="Explain the reasoning behind this resolution..."
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Check 
                  type="checkbox"
                  label="Update Knowledge Graph relationships"
                  checked={updateKgRelationships}
                  onChange={(e) => setUpdateKgRelationships(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  This will update relationship metadata in the Knowledge Graph based on your resolution
                </Form.Text>
              </Form.Group>
            </Form>
          </Tab>
          
          {/* History Tab */}
          <Tab eventKey="history" title="Resolution History">
            <div className="resolution-history">
              {primaryMemory.kgContext?.resolutionHistory ? (
                <div>
                  <h5>Previous Resolution Actions</h5>
                  <ul className="list-group">
                    {primaryMemory.kgContext.resolutionHistory.map((item: any, idx: number) => (
                      <li key={idx} className="list-group-item">
                        <div className="d-flex justify-content-between">
                          <strong>{item.action}</strong>
                          <small>{formatDate(item.timestamp)}</small>
                        </div>
                        <div>{item.comment}</div>
                        <Badge bg="secondary">{item.resolvedBy}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted">No resolution history available</p>
              )}
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Resolving...
            </>
          ) : (
            'Resolve Contradiction'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ContradictionResolver;

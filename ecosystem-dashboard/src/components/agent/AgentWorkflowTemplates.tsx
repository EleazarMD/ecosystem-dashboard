/**
 * Agent Workflow Templates Component
 * 
 * Provides pre-built workflow templates for common agent operations
 * including deployment automation, security scanning, and custom workflows.
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Switch,
  Divider,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import {
  FaRocket,
  FaShieldAlt,
  FaCogs,
  FaDatabase,
  FaNetworkWired,
  FaCode,
  FaPlay,
  FaClock,
  FaUsers
} from 'react-icons/fa';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'deployment' | 'security' | 'maintenance' | 'analysis' | 'custom';
  icon: React.ComponentType;
  estimatedDuration: string;
  complexity: 'low' | 'medium' | 'high';
  parameters: WorkflowParameter[];
  steps: WorkflowStep[];
  prerequisites?: string[];
  tags: string[];
}

interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
}

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  command: string;
  estimatedTime: string;
  dependencies?: string[];
}

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'k8s-deployment',
    name: 'Kubernetes Deployment',
    description: 'Automated deployment of services to Kubernetes cluster with health checks and rollback capabilities',
    category: 'deployment',
    icon: FaRocket,
    estimatedDuration: '10-15 minutes',
    complexity: 'medium',
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        label: 'Service Name',
        description: 'Name of the service to deploy',
        required: true
      },
      {
        name: 'namespace',
        type: 'select',
        label: 'Namespace',
        required: true,
        options: ['knowledge-graph', 'monitoring', 'healthcare', 'default']
      },
      {
        name: 'replicas',
        type: 'number',
        label: 'Replica Count',
        defaultValue: 2,
        required: true
      },
      {
        name: 'enableHealthChecks',
        type: 'boolean',
        label: 'Enable Health Checks',
        defaultValue: true,
        required: false
      }
    ],
    steps: [
      {
        id: 'validate-config',
        name: 'Validate Configuration',
        description: 'Validate deployment configuration and prerequisites',
        command: 'validateDeploymentConfig',
        estimatedTime: '30s'
      },
      {
        id: 'build-image',
        name: 'Build Container Image',
        description: 'Build and tag container image',
        command: 'buildContainerImage',
        estimatedTime: '3-5 minutes',
        dependencies: ['validate-config']
      },
      {
        id: 'deploy-service',
        name: 'Deploy to Kubernetes',
        description: 'Deploy service to Kubernetes cluster',
        command: 'deployToKubernetes',
        estimatedTime: '2-3 minutes',
        dependencies: ['build-image']
      },
      {
        id: 'health-check',
        name: 'Health Check',
        description: 'Verify service health and readiness',
        command: 'performHealthCheck',
        estimatedTime: '1-2 minutes',
        dependencies: ['deploy-service']
      }
    ],
    prerequisites: ['Kubernetes cluster access', 'Docker registry access'],
    tags: ['kubernetes', 'deployment', 'automation']
  },
  {
    id: 'security-scan',
    name: 'Security Vulnerability Scan',
    description: 'Comprehensive security scanning of services, containers, and configurations',
    category: 'security',
    icon: FaShieldAlt,
    estimatedDuration: '15-20 minutes',
    complexity: 'high',
    parameters: [
      {
        name: 'scanScope',
        type: 'multiselect',
        label: 'Scan Scope',
        required: true,
        options: ['containers', 'configurations', 'network', 'secrets', 'dependencies']
      },
      {
        name: 'severity',
        type: 'select',
        label: 'Minimum Severity',
        defaultValue: 'medium',
        options: ['low', 'medium', 'high', 'critical']
      },
      {
        name: 'generateReport',
        type: 'boolean',
        label: 'Generate Detailed Report',
        defaultValue: true,
        required: false
      }
    ],
    steps: [
      {
        id: 'container-scan',
        name: 'Container Security Scan',
        description: 'Scan container images for vulnerabilities',
        command: 'scanContainerSecurity',
        estimatedTime: '5-8 minutes'
      },
      {
        id: 'config-audit',
        name: 'Configuration Audit',
        description: 'Audit Kubernetes and service configurations',
        command: 'auditConfigurations',
        estimatedTime: '3-5 minutes'
      },
      {
        id: 'network-analysis',
        name: 'Network Security Analysis',
        description: 'Analyze network policies and exposure',
        command: 'analyzeNetworkSecurity',
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'generate-report',
        name: 'Generate Security Report',
        description: 'Compile comprehensive security report',
        command: 'generateSecurityReport',
        estimatedTime: '1-2 minutes',
        dependencies: ['container-scan', 'config-audit', 'network-analysis']
      }
    ],
    prerequisites: ['Security scanning tools access', 'Cluster admin permissions'],
    tags: ['security', 'vulnerability', 'compliance', 'audit']
  },
  {
    id: 'database-maintenance',
    name: 'Database Maintenance',
    description: 'Automated database maintenance including backups, optimization, and health checks',
    category: 'maintenance',
    icon: FaDatabase,
    estimatedDuration: '20-30 minutes',
    complexity: 'medium',
    parameters: [
      {
        name: 'databases',
        type: 'multiselect',
        label: 'Databases',
        required: true,
        options: ['postgresql', 'neo4j', 'redis']
      },
      {
        name: 'includeBackup',
        type: 'boolean',
        label: 'Include Backup',
        defaultValue: true,
        required: false
      },
      {
        name: 'optimizationLevel',
        type: 'select',
        label: 'Optimization Level',
        defaultValue: 'standard',
        options: ['minimal', 'standard', 'aggressive']
      }
    ],
    steps: [
      {
        id: 'health-assessment',
        name: 'Database Health Assessment',
        description: 'Assess current database health and performance',
        command: 'assessDatabaseHealth',
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'backup-databases',
        name: 'Backup Databases',
        description: 'Create backups of selected databases',
        command: 'backupDatabases',
        estimatedTime: '10-15 minutes',
        dependencies: ['health-assessment']
      },
      {
        id: 'optimize-performance',
        name: 'Optimize Performance',
        description: 'Run optimization routines',
        command: 'optimizeDatabasePerformance',
        estimatedTime: '5-8 minutes',
        dependencies: ['backup-databases']
      },
      {
        id: 'verify-integrity',
        name: 'Verify Data Integrity',
        description: 'Check data integrity and consistency',
        command: 'verifyDataIntegrity',
        estimatedTime: '3-5 minutes',
        dependencies: ['optimize-performance']
      }
    ],
    prerequisites: ['Database admin access', 'Backup storage access'],
    tags: ['database', 'maintenance', 'backup', 'optimization']
  }
];

interface AgentWorkflowTemplatesProps {
  onExecuteWorkflow?: (templateId: string, parameters: Record<string, any>) => void;
}

export const AgentWorkflowTemplates: React.FC<AgentWorkflowTemplatesProps> = ({
  onExecuteWorkflow
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = workflowTemplates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    // Initialize parameters with default values
    const defaultParams: Record<string, any> = {};
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaultParams[param.name] = param.defaultValue;
      }
    });
    setParameters(defaultParams);
    onOpen();
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleExecute = () => {
    if (selectedTemplate) {
      onExecuteWorkflow?.(selectedTemplate.id, parameters);
      onClose();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'deployment': return FaRocket;
      case 'security': return FaShieldAlt;
      case 'maintenance': return FaCogs;
      case 'analysis': return FaNetworkWired;
      default: return FaCode;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Category Filter */}
        <HStack>
          <Text fontWeight="bold">Category:</Text>
          <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} maxW="200px">
            <option value="all">All Categories</option>
            <option value="deployment">Deployment</option>
            <option value="security">Security</option>
            <option value="maintenance">Maintenance</option>
            <option value="analysis">Analysis</option>
          </Select>
        </HStack>

        {/* Templates Grid */}
        <Grid templateColumns="repeat(auto-fit, minmax(350px, 1fr))" gap={6}>
          {filteredTemplates.map(template => {
            const IconComponent = template.icon;
            const CategoryIcon = getCategoryIcon(template.category);
            
            return (
              <GridItem key={template.id}>
                <Box
                  p={6}
                  border="1px"
                  borderColor={useSemanticToken('border.default')}
                  borderRadius="lg"
                  _hover={{ borderColor: 'blue.300', shadow: 'md' }}
                  cursor="pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Icon as={IconComponent} size="lg" color="blue.500" />
                      <Badge colorScheme={getComplexityColor(template.complexity)}>
                        {template.complexity}
                      </Badge>
                    </HStack>
                    
                    <VStack align="start" spacing={2}>
                      <Text fontWeight="bold" fontSize="lg">{template.name}</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')} noOfLines={3}>
                        {template.description}
                      </Text>
                    </VStack>
                    
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={CategoryIcon} size="sm" />
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          {template.category}
                        </Text>
                      </HStack>
                      <HStack>
                        <Icon as={FaClock} size="sm" />
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          {template.estimatedDuration}
                        </Text>
                      </HStack>
                    </HStack>
                    
                    <HStack wrap="wrap" spacing={1}>
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} size="sm" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge size="sm" variant="outline">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </Box>
              </GridItem>
            );
          })}
        </Grid>
      </VStack>

      {/* Template Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Configure Workflow: {selectedTemplate?.name}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {selectedTemplate && (
              <VStack spacing={6} align="stretch">
                <Text color={useSemanticToken('text.secondary')}>{selectedTemplate.description}</Text>
                
                {selectedTemplate.prerequisites && (
                  <Alert status="info">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold">Prerequisites:</Text>
                      {selectedTemplate.prerequisites.map(req => (
                        <Text key={req} fontSize="sm">• {req}</Text>
                      ))}
                    </VStack>
                  </Alert>
                )}
                
                <Divider />
                
                <Text fontWeight="bold">Parameters:</Text>
                <VStack spacing={4} align="stretch">
                  {selectedTemplate.parameters.map(param => (
                    <FormControl key={param.name} isRequired={param.required}>
                      <FormLabel>{param.label}</FormLabel>
                      {param.type === 'string' && (
                        <Input
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          placeholder={param.description}
                        />
                      )}
                      {param.type === 'number' && (
                        <Input
                          type="number"
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, parseInt(e.target.value))}
                        />
                      )}
                      {param.type === 'boolean' && (
                        <Switch
                          isChecked={parameters[param.name] || false}
                          onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                        />
                      )}
                      {param.type === 'select' && (
                        <Select
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                        >
                          <option value="">Select...</option>
                          {param.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </Select>
                      )}
                      {param.description && (
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{param.description}</Text>
                      )}
                    </FormControl>
                  ))}
                </VStack>
                
                <Divider />
                
                <Text fontWeight="bold">Workflow Steps:</Text>
                <VStack spacing={3} align="stretch">
                  {selectedTemplate.steps.map((step, index) => (
                    <HStack key={step.id} spacing={3}>
                      <Badge colorScheme="blue">{index + 1}</Badge>
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="medium">{step.name}</Text>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{step.description}</Text>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          Estimated time: {step.estimatedTime}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" leftIcon={<FaPlay />} onClick={handleExecute}>
              Execute Workflow
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

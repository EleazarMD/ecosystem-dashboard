/**
 * Dynamic Agent Response Renderer (Google ADK UI style)
 * Renders interactive HTML/CSS components based on agent responses
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  Code,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Heading,
  List,
  ListItem,
  ListIcon,
  Flex,
  Spinner,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiInfo,
  FiAlertTriangle,
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiExternalLink,
  FiCopy,
  FiDownload,
} from 'react-icons/fi';

interface AgentResponseData {
  type: 'text' | 'status' | 'data' | 'action' | 'interactive' | 'system';
  content: string;
  metadata?: {
    agentId: string;
    confidence: number;
    intent: string;
    entities: any[];
    timestamp: Date;
    context: any;
  };
  components?: ResponseComponent[];
  actions?: ResponseAction[];
}

interface ResponseComponent {
  id: string;
  type: 'progress' | 'chart' | 'list' | 'table' | 'alert' | 'code' | 'metrics' | 'status_grid';
  title?: string;
  data: any;
  interactive?: boolean;
  style?: any;
}

interface ResponseAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'copy' | 'download';
  action: string;
  data?: any;
  style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

interface DynamicAgentResponseProps {
  response: AgentResponseData;
  onAction?: (action: ResponseAction) => void;
  isStreaming?: boolean;
  showMetadata?: boolean;
}

export const DynamicAgentResponse: React.FC<DynamicAgentResponseProps> = ({
  response,
  onAction,
  isStreaming = false,
  showMetadata = false,
}) => {
  const [streamedText, setStreamedText] = useState('');
  const [isComplete, setIsComplete] = useState(!isStreaming);
  
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const metadataBg = useSemanticToken('surface.base');

  // Simulate streaming text effect
  useEffect(() => {
    if (isStreaming && response.content) {
      let index = 0;
      const text = response.content;
      const interval = setInterval(() => {
        if (index < text.length) {
          setStreamedText(text.substring(0, index + 1));
          index++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 30); // Adjust speed as needed

      return () => clearInterval(interval);
    } else {
      setStreamedText(response.content);
      setIsComplete(true);
    }
  }, [response.content, isStreaming]);

  /**
   * Render progress component
   */
  const renderProgress = (component: ResponseComponent) => (
    <Box key={component.id}>
      {component.title && <Text fontSize="sm" fontWeight="medium" mb={2}>{component.title}</Text>}
      <Progress
        value={component.data.value || 0}
        max={component.data.max || 100}
        colorScheme={component.data.colorScheme || 'blue'}
        size="lg"
        hasStripe={component.data.animated}
        isAnimated={component.data.animated}
      />
      <HStack justify="space-between" mt={1}>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{component.data.label || 'Progress'}</Text>
        <Text fontSize="xs" fontWeight="medium">{component.data.value || 0}%</Text>
      </HStack>
    </Box>
  );

  /**
   * Render metrics grid
   */
  const renderMetrics = (component: ResponseComponent) => (
    <Box key={component.id}>
      {component.title && <Heading size="sm" mb={3}>{component.title}</Heading>}
      <Flex wrap="wrap" gap={4}>
        {component.data.metrics?.map((metric: any, index: number) => (
          <Card key={index} size="sm" minW="120px">
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color={metric.color || 'blue.500'}>
                {metric.value}
              </Text>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{metric.label}</Text>
              {metric.change && (
                <Badge
                  size="sm"
                  colorScheme={metric.change > 0 ? 'green' : 'red'}
                  variant="subtle"
                >
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </Badge>
              )}
            </CardBody>
          </Card>
        ))}
      </Flex>
    </Box>
  );

  /**
   * Render status grid
   */
  const renderStatusGrid = (component: ResponseComponent) => (
    <Box key={component.id}>
      {component.title && <Heading size="sm" mb={3}>{component.title}</Heading>}
      <VStack spacing={2} align="stretch">
        {component.data.items?.map((item: any, index: number) => (
          <HStack key={index} justify="space-between" p={2} bg={metadataBg} borderRadius="md">
            <HStack>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={item.status === 'healthy' ? 'green.500' : 
                    item.status === 'warning' ? 'yellow.500' : 'red.500'}
              />
              <Text fontSize="sm">{item.name}</Text>
            </HStack>
            <Badge
              colorScheme={item.status === 'healthy' ? 'green' : 
                          item.status === 'warning' ? 'yellow' : 'red'}
              variant="subtle"
            >
              {item.status}
            </Badge>
          </HStack>
        ))}
      </VStack>
    </Box>
  );

  /**
   * Render list component
   */
  const renderList = (component: ResponseComponent) => (
    <Box key={component.id}>
      {component.title && <Heading size="sm" mb={3}>{component.title}</Heading>}
      <List spacing={2}>
        {component.data.items?.map((item: any, index: number) => (
          <ListItem key={index}>
            <ListIcon
              as={item.status === 'success' ? FiCheck : 
                  item.status === 'error' ? FiX : FiInfo}
              color={item.status === 'success' ? 'green.500' : 
                     item.status === 'error' ? 'red.500' : 'blue.500'}
            />
            {item.text || item}
          </ListItem>
        ))}
      </List>
    </Box>
  );

  /**
   * Render alert component
   */
  const renderAlert = (component: ResponseComponent) => (
    <Alert
      key={component.id}
      status={component.data.status || 'info'}
      variant="left-accent"
      borderRadius="md"
    >
      <AlertIcon />
      <Box>
        {component.title && <Text fontWeight="bold">{component.title}</Text>}
        <Text>{component.data.message}</Text>
      </Box>
    </Alert>
  );

  /**
   * Render code component
   */
  const renderCode = (component: ResponseComponent) => (
    <Box key={component.id}>
      {component.title && <Heading size="sm" mb={3}>{component.title}</Heading>}
      <Box position="relative">
        <Code
          display="block"
          whiteSpace="pre-wrap"
          p={4}
          borderRadius="md"
          bg={metadataBg}
          fontSize="sm"
          maxH="300px"
          overflowY="auto"
        >
          {component.data.code}
        </Code>
        <Tooltip label="Copy code">
          <IconButton
            aria-label="Copy code"
            icon={<FiCopy />}
            size="sm"
            position="absolute"
            top={2}
            right={2}
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(component.data.code)}
          />
        </Tooltip>
      </Box>
    </Box>
  );

  /**
   * Render component based on type
   */
  const renderComponent = (component: ResponseComponent) => {
    switch (component.type) {
      case 'progress':
        return renderProgress(component);
      case 'metrics':
        return renderMetrics(component);
      case 'status_grid':
        return renderStatusGrid(component);
      case 'list':
        return renderList(component);
      case 'alert':
        return renderAlert(component);
      case 'code':
        return renderCode(component);
      default:
        return null;
    }
  };

  /**
   * Handle action click
   */
  const handleAction = (action: ResponseAction) => {
    switch (action.type) {
      case 'copy':
        navigator.clipboard.writeText(action.data || action.label);
        break;
      case 'link':
        window.open(action.action, '_blank');
        break;
      default:
        onAction?.(action);
    }
  };

  /**
   * Get agent color scheme
   */
  const getAgentColorScheme = (agentId: string): string => {
    const colorMap = {
      'orchestrator': 'purple',
      'graph-query': 'blue',
      'vector-search': 'green',
      'documentation': 'orange',
      'reasoning': 'red',
      'memory': 'teal',
      'integration': 'cyan',
    };
    return colorMap[agentId as keyof typeof colorMap] || 'gray';
  };

  return (
    <Card size="sm" bg={bg} borderColor={borderColor}>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Agent metadata */}
          {showMetadata && response.metadata && (
            <HStack justify="space-between" p={2} bg={metadataBg} borderRadius="md" fontSize="xs">
              <HStack>
                <Badge colorScheme={getAgentColorScheme(response.metadata.agentId)}>
                  {response.metadata.agentId}
                </Badge>
                <Text color={useSemanticToken('text.secondary')}>
                  {response.metadata.confidence.toFixed(1)}% confidence
                </Text>
              </HStack>
              <Text color={useSemanticToken('text.secondary')}>
                {response.metadata.timestamp.toLocaleTimeString()}
              </Text>
            </HStack>
          )}

          {/* Main content */}
          <Box>
            <Text>
              {streamedText}
              {isStreaming && !isComplete && (
                <Box as="span" display="inline-block" w="2px" h="1em" bg="blue.500" ml={1} 
                     animation="blink 1s infinite" />
              )}
            </Text>
          </Box>

          {/* Dynamic components */}
          {response.components && isComplete && (
            <VStack spacing={4} align="stretch">
              <Divider />
              {response.components.map(renderComponent)}
            </VStack>
          )}

          {/* Actions */}
          {response.actions && isComplete && (
            <HStack spacing={2} pt={2}>
              {response.actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  colorScheme={action.style === 'primary' ? 'blue' : 'gray'}
                  variant={action.style === 'secondary' ? 'outline' : 'solid'}
                  leftIcon={action.type === 'link' ? <FiExternalLink /> : 
                           action.type === 'copy' ? <FiCopy /> : 
                           action.type === 'download' ? <FiDownload /> : undefined}
                  onClick={() => handleAction(action)}
                >
                  {action.label}
                </Button>
              ))}
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default DynamicAgentResponse;

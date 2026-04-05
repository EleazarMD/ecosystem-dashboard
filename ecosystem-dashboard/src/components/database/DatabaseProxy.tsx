import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  Alert,
  AlertIcon,
  Code,
  Badge,
  useToast,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Select,
  FormControl,
  FormLabel,
  Switch,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { PlayIcon, InfoIcon, WarningIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DatabaseProxyProps {
  onQueryExecute?: (database: string, query: string, result: any) => void;
}

const DatabaseProxy: React.FC<DatabaseProxyProps> = ({ onQueryExecute }) => {
  const [selectedDatabase, setSelectedDatabase] = useState<string>('postgresql');
  const [query, setQuery] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [proxyStatus, setProxyStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  const toast = useToast();

  useEffect(() => {
    checkProxyStatus();
  }, []);

  const checkProxyStatus = async () => {
    try {
      // Check if we can reach the Knowledge Graph API through the proxy
      const response = await fetch('/api/proxy/kg/health');
      if (response.ok) {
        setProxyStatus('connected');
      } else {
        setProxyStatus('error');
      }
    } catch (error) {
      setProxyStatus('disconnected');
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        title: 'Empty Query',
        description: 'Please enter a query to execute',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      let endpoint: string;
      let payload: any;

      if (useProxy) {
        // Use dashboard proxy to execute queries through kubectl
        switch (selectedDatabase) {
          case 'postgresql':
            endpoint = '/api/proxy/database/postgresql/execute';
            payload = { query };
            break;
          case 'neo4j':
            endpoint = '/api/proxy/database/neo4j/execute';
            payload = { query, parameters: {} };
            break;
          case 'redis':
            endpoint = '/api/proxy/database/redis/execute';
            payload = { command: query };
            break;
          default:
            throw new Error('Unsupported database type');
        }
      } else {
        // Direct API calls (if available)
        switch (selectedDatabase) {
          case 'postgresql':
            endpoint = '/api/kg/database/postgresql/query';
            payload = { query };
            break;
          case 'neo4j':
            endpoint = '/api/kg/query';
            payload = { query, parameters: {} };
            break;
          case 'redis':
            endpoint = '/api/kg/database/redis/command';
            payload = { command: query };
            break;
          default:
            throw new Error('Unsupported database type');
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const queryResult = await response.json();
      setResult(queryResult);

      if (onQueryExecute) {
        onQueryExecute(selectedDatabase, query, queryResult);
      }

      if (queryResult.success) {
        toast({
          title: 'Query Executed Successfully',
          description: `${selectedDatabase.toUpperCase()} query completed`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Query Failed',
          description: queryResult.error || 'Unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({
        success: false,
        error: errorMessage
      });

      toast({
        title: 'Execution Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getProxyStatusColor = () => {
    switch (proxyStatus) {
      case 'connected': return 'green';
      case 'error': return 'orange';
      case 'disconnected': return 'red';
      default: return 'gray';
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (!result.success) {
      return (
        <Alert status="error">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Query Failed</Text>
            <Code>{result.error}</Code>
          </Box>
        </Alert>
      );
    }

    if (result.results && Array.isArray(result.results) && result.results.length > 0) {
      return (
        <Box>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={2}>
            {result.results.length} rows returned
          </Text>
          <Code display="block" p={4} maxH="300px" overflowY="auto">
            {JSON.stringify(result.results, null, 2)}
          </Code>
        </Box>
      );
    }

    return (
      <Alert status="info">
        <AlertIcon />
        <Text>Query executed successfully</Text>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="md">Database CLI Proxy</Heading>
          <HStack>
            <Badge colorScheme={getProxyStatusColor()}>
              Proxy: {proxyStatus}
            </Badge>
            <Tooltip label="Refresh proxy status">
              <IconButton
                aria-label="Refresh status"
                icon={<InfoIcon />}
                size="sm"
                onClick={checkProxyStatus}
              />
            </Tooltip>
          </HStack>
        </HStack>
      </CardHeader>
      
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Proxy Configuration */}
          <HStack justify="space-between">
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="use-proxy" mb="0" fontSize="sm">
                Use Dashboard Proxy
              </FormLabel>
              <Switch 
                id="use-proxy" 
                isChecked={useProxy} 
                onChange={(e) => setUseProxy(e.target.checked)}
              />
            </FormControl>
            
            <FormControl maxW="200px">
              <FormLabel fontSize="sm">Database</FormLabel>
              <Select 
                value={selectedDatabase} 
                onChange={(e) => setSelectedDatabase(e.target.value)}
                size="sm"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="neo4j">Neo4j</option>
                <option value="redis">Redis</option>
              </Select>
            </FormControl>
          </HStack>

          {/* Proxy Info */}
          {useProxy && (
            <Alert status="info" size="sm">
              <AlertIcon />
              <Text fontSize="sm">
                Using dashboard proxy to execute {selectedDatabase.toUpperCase()} commands through kubectl
              </Text>
            </Alert>
          )}

          {/* Query Input */}
          <Box>
            <Text fontWeight="bold" mb={2}>
              {selectedDatabase === 'redis' ? 'Redis Command' : 'Query'}:
            </Text>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={getQueryPlaceholder()}
              rows={4}
              fontFamily="mono"
              fontSize="sm"
            />
          </Box>

          {/* Execute Button */}
          <Button
            leftIcon={isExecuting ? <Spinner size="sm" /> : <PlayIcon />}
            colorScheme="blue"
            onClick={executeQuery}
            isLoading={isExecuting}
            loadingText="Executing..."
            isDisabled={!query.trim() || (useProxy && proxyStatus !== 'connected')}
          >
            Execute {selectedDatabase === 'redis' ? 'Command' : 'Query'}
          </Button>

          {/* Results */}
          {renderResult()}
        </VStack>
      </CardBody>
    </Card>
  );

  function getQueryPlaceholder(): string {
    switch (selectedDatabase) {
      case 'postgresql':
        return 'SELECT * FROM documents LIMIT 10;';
      case 'neo4j':
        return 'MATCH (n) RETURN count(n) as total_nodes;';
      case 'redis':
        return 'INFO server';
      default:
        return 'Enter your query...';
    }
  }
};

export default DatabaseProxy;

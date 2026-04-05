/**
 * Enhanced Knowledge Graph Query Interface
 * 
 * This component provides a modern, AI-powered interface for querying
 * the Knowledge Graph using natural language and Cypher queries.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  useTheme,
  alpha,
  Fade,
  Slide
} from '@mui/material';
import {
  Search as SearchIcon,
  Psychology as AIIcon,
  Code as CodeIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as RunIcon,
  AutoAwesome as MagicIcon,
  Lightbulb as SuggestionIcon,
  DataObject as ResultIcon,
  Timeline as GraphIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import SafeGrid from '@/components/SafeGrid';

interface QueryResult {
  id: string;
  query: string;
  type: 'natural' | 'cypher';
  results: any[];
  timestamp: Date;
  executionTime: number;
  error?: string;
}

interface QuerySuggestion {
  text: string;
  description: string;
  category: 'exploration' | 'analysis' | 'search';
}

interface KnowledgeQueryInterfaceProps {
  onQueryExecute?: (query: string, type: 'natural' | 'cypher') => Promise<any[]>;
  onVisualize?: (results: any[]) => void;
  className?: string;
}

const KnowledgeQueryInterface: React.FC<KnowledgeQueryInterfaceProps> = ({
  onQueryExecute,
  onVisualize,
  className
}) => {
  const theme = useTheme();
  // Create fallback theme values to prevent undefined errors
  const safeTheme = {
    palette: {
      primary: theme?.palette?.primary || { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
      secondary: theme?.palette?.secondary || { main: '#9c27b0', light: '#ba68c8', dark: '#7b1fa2' },
      grey: theme?.palette?.grey || { 50: '#fafafa', 100: '#f5f5f5', 200: '#eeeeee' },
      success: theme?.palette?.success || { main: '#2e7d32' },
      ...theme?.palette
    },
    ...theme
  };
  
  // Query state
  const [query, setQuery] = useState<string>('');
  const [queryType, setQueryType] = useState<'natural' | 'cypher'>('natural');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<QueryResult | null>(null);
  
  // UI state
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Refs
  const queryInputRef = useRef<HTMLInputElement>(null);
  
  // Sample query suggestions
  const querySuggestions: QuerySuggestion[] = [
    {
      text: "What documents are related to AI Gateway?",
      description: "Find all documents connected to the AI Gateway service",
      category: 'exploration'
    },
    {
      text: "Show me all MLX-VLM related components",
      description: "Explore MLX-VLM integration and dependencies",
      category: 'exploration'
    },
    {
      text: "Which services depend on authentication?",
      description: "Analyze authentication dependencies across services",
      category: 'analysis'
    },
    {
      text: "Find documents authored by specific person",
      description: "Search for documents by author",
      category: 'search'
    },
    {
      text: "What technologies are used in the ecosystem?",
      description: "Overview of all technologies in the knowledge graph",
      category: 'analysis'
    }
  ];
  
  // Sample Cypher query templates
  const cypherTemplates = [
    "MATCH (d:Document) WHERE d.title CONTAINS $search RETURN d LIMIT 10",
    "MATCH (d:Document)-[:RELATED_TO]-(r:Document) RETURN d, r LIMIT 20",
    "MATCH (p:Person)-[:AUTHORED]->(d:Document) RETURN p.name, count(d) as documents",
    "MATCH (d:Document)-[:USES]->(t:Technology) RETURN t.name, count(d) as usage_count",
    "MATCH path = (d1:Document)-[:DEPENDS_ON*1..3]->(d2:Document) RETURN path LIMIT 10"
  ];
  
  // Execute query
  const handleExecuteQuery = useCallback(async () => {
    if (!query.trim() || !onQueryExecute) return;
    
    setIsExecuting(true);
    const startTime = Date.now();
    
    try {
      const queryResults = await onQueryExecute(query, queryType);
      const executionTime = Date.now() - startTime;
      
      const newResult: QueryResult = {
        id: `query_${Date.now()}`,
        query,
        type: queryType,
        results: queryResults,
        timestamp: new Date(),
        executionTime,
      };
      
      setResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results
      setSelectedResult(newResult);
      setShowHistory(true);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorResult: QueryResult = {
        id: `query_${Date.now()}`,
        query,
        type: queryType,
        results: [],
        timestamp: new Date(),
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setResults(prev => [errorResult, ...prev.slice(0, 9)]);
      setSelectedResult(errorResult);
    } finally {
      setIsExecuting(false);
    }
  }, [query, queryType, onQueryExecute]);
  
  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: QuerySuggestion) => {
    setQuery(suggestion.text);
    setQueryType('natural');
    setShowSuggestions(false);
    if (queryInputRef.current) {
      queryInputRef.current.focus();
    }
  }, []);
  
  // Handle template click
  const handleTemplateClick = useCallback((template: string) => {
    setQuery(template);
    setQueryType('cypher');
    setAnchorEl(null);
    if (queryInputRef.current) {
      queryInputRef.current.focus();
    }
  }, []);
  
  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      handleExecuteQuery();
    }
  }, [handleExecuteQuery]);
  
  // Format execution time
  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exploration': return 'primary';
      case 'analysis': return 'secondary';
      case 'search': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box className={className}>
      {/* Query Input Section */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(safeTheme.palette.primary.main, 0.05)} 0%, ${alpha(safeTheme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(safeTheme.palette.primary.main, 0.1)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h2">
            AI-Powered Knowledge Graph Query
          </Typography>
        </Box>
        
        {/* Query Type Tabs */}
        <Tabs
          value={queryType === 'natural' ? 0 : 1}
          onChange={(_, value) => setQueryType(value === 0 ? 'natural' : 'cypher')}
          sx={{ mb: 2 }}
        >
          <Tab
            icon={<MagicIcon />}
            label="Natural Language"
            iconPosition="start"
          />
          <Tab
            icon={<CodeIcon />}
            label="Cypher Query"
            iconPosition="start"
          />
        </Tabs>
        
        {/* Query Input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            ref={queryInputRef}
            fullWidth
            multiline
            minRows={queryType === 'cypher' ? 3 : 1}
            maxRows={6}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              queryType === 'natural'
                ? "Ask anything about your knowledge graph... (e.g., 'What services use authentication?')"
                : "MATCH (n) RETURN n LIMIT 10"
            }
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                fontFamily: queryType === 'cypher' ? 'monospace' : 'inherit'
              }
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleExecuteQuery}
              disabled={!query.trim() || isExecuting}
              startIcon={isExecuting ? <CircularProgress size={16} /> : <RunIcon />}
              sx={{ minWidth: 120 }}
            >
              {isExecuting ? 'Running...' : 'Execute'}
            </Button>
            {queryType === 'cypher' && (
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                startIcon={<CodeIcon />}
              >
                Templates
              </Button>
            )}
          </Box>
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={() => setQuery('')}
          >
            Clear
          </Button>
          <Button
            size="small"
            startIcon={<SuggestionIcon />}
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </Button>
          <Button
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => setShowHistory(!showHistory)}
          >
            History ({results.length})
          </Button>
        </Box>
      </Paper>
      
      {/* Cypher Templates Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {cypherTemplates.map((template, index) => (
          <MenuItem
            key={index}
            onClick={() => handleTemplateClick(template)}
            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          >
            {template}
          </MenuItem>
        ))}
      </Menu>
      
      <SafeGrid container spacing={3}>
        {/* Left Column - Suggestions & History */}
        <SafeGrid size={{ xs: 12, md: 4 }}>
          {/* Query Suggestions */}
          <Collapse in={showSuggestions}>
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Query Suggestions"
                avatar={<SuggestionIcon color="primary" />}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent sx={{ pt: 0 }}>
                <List dense>
                  {querySuggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ListItem
                        component="div"
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemIcon>
                          <Chip
                            size="small"
                            label={suggestion.category}
                            color={getCategoryColor(suggestion.category) as any}
                            variant="outlined"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion.text}
                          secondary={suggestion.description}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Collapse>
          
          {/* Query History */}
          <Collapse in={showHistory}>
            <Card>
              <CardHeader
                title="Query History"
                avatar={<HistoryIcon color="secondary" />}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent sx={{ pt: 0, maxHeight: 400, overflow: 'auto' }}>
                {results.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No queries executed yet
                  </Typography>
                ) : (
                  <List dense>
                    {results.map((result) => (
                      <ListItem
                        key={result.id}
                        component="div"
                        onClick={() => setSelectedResult(result)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          backgroundColor: selectedResult?.id === result.id ? 'action.selected' : 'transparent',
                        }}
                      >
                        <ListItemIcon>
                          {result.type === 'natural' ? <MagicIcon /> : <CodeIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={result.query.length > 50 ? `${result.query.slice(0, 50)}...` : result.query}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={formatExecutionTime(result.executionTime)}
                                variant="outlined"
                              />
                              {result.error && (
                                <Chip
                                  size="small"
                                  label="Error"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Collapse>
        </SafeGrid>
        
        {/* Right Column - Results */}
        <SafeGrid size={{ xs: 12, md: 8 }}>
          <AnimatePresence mode="wait">
            {selectedResult && (
              <motion.div
                key={selectedResult.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader
                    title="Query Results"
                    avatar={<ResultIcon color="success" />}
                    action={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {selectedResult.results.length > 0 && onVisualize && (
                          <Button
                            size="small"
                            startIcon={<GraphIcon />}
                            onClick={() => onVisualize(selectedResult.results)}
                          >
                            Visualize
                          </Button>
                        )}
                        <Button size="small" startIcon={<ShareIcon />}>
                          Share
                        </Button>
                      </Box>
                    }
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <Divider />
                  <CardContent>
                    {/* Query Info */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Query ({selectedResult.type})
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          backgroundColor: alpha(safeTheme.palette.grey[100], 0.5),
                          fontFamily: selectedResult.type === 'cypher' ? 'monospace' : 'inherit'
                        }}
                      >
                        <Typography variant="body2">
                          {selectedResult.query}
                        </Typography>
                      </Paper>
                    </Box>
                    
                    {/* Execution Stats */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Chip
                        label={`${selectedResult.results.length} results`}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={formatExecutionTime(selectedResult.executionTime)}
                        color="secondary"
                        variant="outlined"
                      />
                      <Chip
                        label={selectedResult.timestamp.toLocaleTimeString()}
                        variant="outlined"
                      />
                    </Box>
                    
                    {/* Error Display */}
                    {selectedResult.error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {selectedResult.error}
                      </Alert>
                    )}
                    
                    {/* Results Display */}
                    {selectedResult.results.length > 0 && (
                      <Paper
                        variant="outlined"
                        sx={{
                          maxHeight: 400,
                          overflow: 'auto',
                          backgroundColor: alpha(safeTheme.palette.grey[50], 0.5)
                        }}
                      >
                        <pre style={{ margin: 0, padding: 16, fontSize: '0.875rem' }}>
                          {JSON.stringify(selectedResult.results, null, 2)}
                        </pre>
                      </Paper>
                    )}
                    
                    {selectedResult.results.length === 0 && !selectedResult.error && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No results found
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!selectedResult && (
            <Card sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Execute a query to see results
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use natural language or Cypher queries to explore your knowledge graph
                </Typography>
              </Box>
            </Card>
          )}
        </SafeGrid>
      </SafeGrid>
    </Box>
  );
};

export default KnowledgeQueryInterface;

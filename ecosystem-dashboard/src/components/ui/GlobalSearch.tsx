import React, { useState, useEffect, useRef } from 'react';
import {
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Box,
  List,
  ListItem,
  Text,
  Flex,
  Divider,
  Tag,
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useOutsideClick,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { FaFolder, FaFileAlt, FaPuzzlePiece, FaTasks } from 'react-icons/fa';
import { ecosystemApi } from '@/lib/api';
import { useRouter } from 'next/router';
import { domainColors } from '@/styles/theme';

// Define search result types
interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'project' | 'component' | 'documentation' | 'task';
  projectId?: string;
  projectName?: string;
  path?: string;
  status?: string;
  lastUpdated?: string;
  domain?: string;
  tags?: string[];
  score: number;
}

const GlobalSearch: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Close popover when clicking outside
  useOutsideClick({
    ref: searchRef,
    handler: () => setIsOpen(false),
  });
  
  // Debounce search query
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await ecosystemApi.searchEcosystem(searchQuery);
      if (data.error) {
        setError(data.message);
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    if (event.target.value) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };
  
  // Clear search
  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    
    // Navigate based on result type
    switch (result.type) {
      case 'project':
        router.push(`/ecosystem/project/${result.id}`);
        break;
      case 'component':
        router.push(`/ecosystem/component/${result.id}`);
        break;
      case 'documentation':
        if (result.path) {
          window.open(`/api/documentation/view?path=${encodeURIComponent(result.path)}`, '_blank');
        }
        break;
      case 'task':
        router.push(`/ecosystem/project/${result.projectId}?task=${result.id}`);
        break;
      default:
        break;
    }
  };
  
  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Box as={FaFolder} />;
      case 'component':
        return <Box as={FaPuzzlePiece} />;
      case 'documentation':
        return <Box as={FaFileAlt} />;
      case 'task':
        return <Box as={FaTasks} />;
      default:
        return <SearchIcon />;
    }
  };
  
  // Get color for result type
  const getResultColor = (type: string, domain?: string) => {
    if (type === 'project' && domain) {
      const domainKey = domain.toLowerCase().replace(' ', '') as keyof typeof domainColors;
      return domainColors[domainKey] || '#6c757d';
    }
    
    switch (type) {
      case 'project':
        return '#4285f4';
      case 'component':
        return '#34a853';
      case 'documentation':
        return '#ea4335';
      case 'task':
        return '#fbbc05';
      default:
        return '#6c757d';
    }
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <Box ref={searchRef} position="relative" width="100%" maxWidth="400px">
      <InputGroup size="md">
        <Input
          ref={inputRef}
          placeholder="Search ecosystem..."
          value={query}
          onChange={handleSearchChange}
          variant="filled"
          pr="2.5rem"
          borderRadius="md"
        />
        <InputRightElement>
          {query ? (
            <IconButton
              size="sm"
              variant="ghost"
              icon={<CloseIcon />}
              aria-label="Clear search"
              onClick={handleClearSearch}
            />
          ) : (
            <SearchIcon color={useSemanticToken('text.secondary')} />
          )}
        </InputRightElement>
      </InputGroup>
      
      <Popover
        isOpen={isOpen}
        autoFocus={false}
        placement="bottom-start"
        gutter={4}
        isLazy
      >
        <PopoverTrigger>
          <Box position="absolute" top={0} left={0} width="100%" height="100%" opacity={0} />
        </PopoverTrigger>
        <PopoverContent 
          width={searchRef.current?.clientWidth || "400px"}
          maxHeight="400px"
          overflowY="auto"
          boxShadow="lg"
          border="1px solid"
          borderColor={useSemanticToken('border.default')}
          _focus={{ outline: "none" }}
        >
          <PopoverBody p={0}>
            {loading && results.length === 0 && (
              <Flex p={4} justify="center">
                <Spinner size="sm" />
              </Flex>
            )}
            
            {error && (
              <Box p={4}>
                <Text color="red.500">{error}</Text>
              </Box>
            )}
            
            {!loading && !error && results.length === 0 && query.length >= 2 && (
              <Box p={4}>
                <Text color={useSemanticToken('text.secondary')}>No results found</Text>
              </Box>
            )}
            
            {results.length > 0 && (
              <List spacing={0}>
                {results.map((result, index) => (
                  <React.Fragment key={`${result.type}-${result.id}`}>
                    {index > 0 && <Divider />}
                    <ListItem
                      onClick={() => handleResultClick(result)}
                      py={3}
                      px={4}
                      cursor="pointer"
                      borderLeftWidth="4px"
                      borderLeftColor={getResultColor(result.type, result.domain)}
                      _hover={{ bg: useSemanticToken('surface.hover') }}
                    >
                      <Flex width="100%">
                        <Box color={getResultColor(result.type, result.domain)} mr={3} mt={1}>
                          {getResultIcon(result.type)}
                        </Box>
                        <Box flex={1}>
                          <Flex align="center" mb={1}>
                            <Text fontWeight="medium" noOfLines={1} mr={2}>
                              {result.title}
                            </Text>
                            <Tag size="sm" colorScheme={(() => {
                              const color = getResultColor(result.type, result.domain);
                              if (typeof color === 'string' && color.includes('#')) {
                                return undefined;
                              }
                              if (typeof color === 'object') {
                                return undefined; // Use default for object colors
                              }
                              return color.split('.')[0];
                            })()}>
                              {result.type}
                            </Tag>
                          </Flex>
                          
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')} noOfLines={1}>
                            {result.description || result.path || ''}
                          </Text>
                          
                          <Flex align="center" mt={1}>
                            {result.projectName && (
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mr={2}>
                                {result.projectName}
                              </Text>
                            )}
                            {result.status && (
                              <Tag size="sm" variant="subtle" mr={2}>
                                {result.status}
                              </Tag>
                            )}
                            {result.lastUpdated && (
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {formatDate(result.lastUpdated)}
                              </Text>
                            )}
                          </Flex>
                        </Box>
                      </Flex>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  );
};

export default GlobalSearch;

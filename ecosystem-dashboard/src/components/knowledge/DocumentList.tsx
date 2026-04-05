import React from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Icon,
  Flex,
  Text,
  Spinner,
  Center
} from '@chakra-ui/react';
import { FiFile, FiFileText, FiCode, FiImage, FiPackage } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Document interface
export interface Document {
  id: string;
  title: string;
  path: string;
  type: string;
  status: 'indexed' | 'analyzing' | 'error';
  dateAdded: string;
  size: number;
  entities?: number;
  relationships?: number;
  embeddings?: number;
}

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  selectedDocumentId,
  onSelectDocument
}) => {
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const headerBg = useSemanticToken('surface.base');
  
  // Render document status badge
  const renderStatusBadge = (status: string) => {
    let color = 'green';
    if (status === 'analyzing') color = 'blue';
    if (status === 'error') color = 'red';
    
    return (
      <Badge colorScheme={color} variant="subtle" px={2} py={0.5} borderRadius="md">
        {status}
      </Badge>
    );
  };
  
  // Format file size to human readable
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Get document icon based on file type
  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'markdown':
      case 'md':
        return FiFileText;
      case 'code':
      case 'yaml':
      case 'json':
      case 'typescript':
      case 'javascript':
        return FiCode;
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return FiImage;
      case 'archive':
      case 'zip':
      case 'tar':
        return FiPackage;
      default:
        return FiFile;
    }
  };

  if (isLoading) {
    return (
      <Center h="200px">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Center>
    );
  }

  if (documents.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Text color={useSemanticToken('text.secondary')}>No documents found</Text>
      </Box>
    );
  }

  return (
    <Box overflow="auto" maxHeight="650px">
      <Table variant="simple" size="md">
        <Thead>
          <Tr bg={headerBg}>
            <Th>Title</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Date Added</Th>
            <Th>Size</Th>
          </Tr>
        </Thead>
        <Tbody>
          {documents.map((doc) => (
            <Tr 
              key={doc.id} 
              onClick={() => onSelectDocument(doc.id)}
              bg={selectedDocumentId === doc.id ? selectedBg : 'transparent'}
              _hover={{ bg: hoverBg, cursor: 'pointer' }}
              transition="background-color 0.2s"
            >
              <Td>
                <Flex align="center">
                  <Icon 
                    as={getDocumentIcon(doc.type)} 
                    mr={2} 
                    color="blue.500" 
                  />
                  {doc.title}
                </Flex>
              </Td>
              <Td>{doc.type}</Td>
              <Td>{renderStatusBadge(doc.status)}</Td>
              <Td>{new Date(doc.dateAdded).toLocaleDateString()}</Td>
              <Td>{formatFileSize(doc.size)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default DocumentList;

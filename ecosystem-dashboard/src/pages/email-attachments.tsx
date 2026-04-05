/**
 * Email Attachments Panel
 * 
 * Lists all email attachments imported into workspace.files.
 * Accessible by all studios (Deep Research, Podcast, Workspace, Voice, Email).
 * Shows file metadata, source email, extracted text preview, and download links.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Flex, VStack, HStack, Text, Input, InputGroup, InputLeftElement,
  Button, Spinner, Badge, Tooltip, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, useToast, Textarea, Heading, Icon,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon, DocumentIcon, PaperClipIcon, ArrowDownTrayIcon,
  EyeIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface AttachmentFile {
  id: string;
  workspace_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_url: string;
  source_type: string;
  source_email_id: string;
  vectorized: boolean;
  metadata: {
    attachment_index?: string;
    email_subject?: string;
    email_from?: string;
    email_date?: string;
    page_count?: number;
    content_type?: string;
    original_size?: number;
  };
  has_text: boolean;
  text_length: number;
  uploaded_at: string;
  extracted_text?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function EmailAttachments() {
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<AttachmentFile | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchFiles = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ include_text: 'false', limit: '100' });
      if (searchTerm) params.set('search', searchTerm);
      const resp = await fetch(`/api/email/attachment-files?${params}`);
      if (resp.ok) {
        const data = await resp.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      toast({ title: 'Failed to load attachments', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleSearch = () => {
    fetchFiles(search || undefined);
  };

  const viewText = async (file: AttachmentFile) => {
    try {
      const params = new URLSearchParams({
        email_id: file.source_email_id,
        include_text: 'true',
        limit: '1',
      });
      const resp = await fetch(`/api/email/attachment-files?${params}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.files?.[0]) {
          setSelectedFile({ ...file, extracted_text: data.files[0].extracted_text });
          onOpen();
        }
      }
    } catch {
      toast({ title: 'Failed to load text', status: 'error', duration: 3000 });
    }
  };

  return (
    <DashboardLayout>
      <Box p={6} maxW="1400px" mx="auto">
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Email Attachments</Heading>
            <Text color="gray.500" fontSize="sm">
              Documents extracted from emails — accessible by all studios
            </Text>
          </VStack>
          <Badge colorScheme="blue" fontSize="md" px={3} py={1} borderRadius="full">
            {files.length} files
          </Badge>
        </Flex>

        {/* Search */}
        <HStack mb={6}>
          <InputGroup maxW="400px">
            <InputLeftElement>
              <Icon as={MagnifyingGlassIcon} w={5} h={5} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search in extracted text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </InputGroup>
          <Button onClick={handleSearch} colorScheme="blue" size="md">
            Search
          </Button>
          {search && (
            <Button variant="ghost" onClick={() => { setSearch(''); fetchFiles(); }}>
              Clear
            </Button>
          )}
        </HStack>

        {/* Table */}
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner size="xl" />
          </Flex>
        ) : files.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Icon as={PaperClipIcon} w={12} h={12} color="gray.300" mb={4} />
            <Text color="gray.500">No email attachments imported yet</Text>
          </Box>
        ) : (
          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>File</Th>
                  <Th>Source Email</Th>
                  <Th isNumeric>Size</Th>
                  <Th isNumeric>Pages</Th>
                  <Th isNumeric>Text</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {files.map((file) => (
                  <Tr key={file.id} _hover={{ bg: 'gray.50' }}>
                    <Td>
                      <HStack spacing={2}>
                        <Icon
                          as={DocumentIcon}
                          w={5} h={5}
                          color={file.file_type.includes('pdf') ? 'red.400' : 'blue.400'}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" fontSize="sm" noOfLines={1} maxW="250px">
                            {file.file_name}
                          </Text>
                          <Text color="gray.400" fontSize="xs">{file.file_type}</Text>
                        </VStack>
                      </HStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Tooltip label={file.metadata?.email_subject}>
                          <Text fontSize="sm" noOfLines={1} maxW="200px">
                            {file.metadata?.email_subject || '—'}
                          </Text>
                        </Tooltip>
                        <Text color="gray.400" fontSize="xs">
                          {file.metadata?.email_from || ''}
                        </Text>
                      </VStack>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="sm">{formatBytes(file.file_size)}</Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="sm">{file.metadata?.page_count || '—'}</Text>
                    </Td>
                    <Td isNumeric>
                      {file.has_text ? (
                        <Badge colorScheme="green" fontSize="xs">
                          {(file.text_length / 1000).toFixed(1)}K
                        </Badge>
                      ) : (
                        <Badge colorScheme="gray" fontSize="xs">none</Badge>
                      )}
                    </Td>
                    <Td>
                      <Text fontSize="sm" color="gray.500">
                        {formatDate(file.metadata?.email_date || file.uploaded_at)}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        {file.has_text && (
                          <Tooltip label="View extracted text">
                            <Button size="xs" variant="ghost" onClick={() => viewText(file)}>
                              <Icon as={EyeIcon} w={4} h={4} />
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip label="Download file">
                          <Button
                            size="xs" variant="ghost"
                            as="a" href={file.storage_url} download={file.file_name}
                          >
                            <Icon as={ArrowDownTrayIcon} w={4} h={4} />
                          </Button>
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Text Preview Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
          <ModalOverlay />
          <ModalContent maxH="80vh">
            <ModalHeader>
              <HStack>
                <Icon as={DocumentIcon} w={5} h={5} />
                <Text>{selectedFile?.file_name}</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color="gray.500">
                From: {selectedFile?.metadata?.email_subject}
              </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6} overflowY="auto">
              <Textarea
                value={selectedFile?.extracted_text || 'No text available'}
                readOnly
                minH="400px"
                fontFamily="mono"
                fontSize="sm"
                bg="gray.50"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}

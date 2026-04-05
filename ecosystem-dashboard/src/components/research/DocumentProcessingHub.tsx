/**
 * DocumentProcessingHub
 * 
 * Clear workflow-based document processing:
 * Upload → Extract → Analyze → Export
 * 
 * Replaces the cluttered AnalysisReportsHub with a function-first design.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Icon,
  Badge,
  Progress,
  Divider,
  Tooltip,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Code,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Flex,
  Input,
} from '@chakra-ui/react';
import {
  FiUpload,
  FiImage,
  FiFileText,
  FiZap,
  FiDownload,
  FiCopy,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiChevronRight,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiPlus,
  FiFile,
  FiTable,
  FiBarChart2,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================
// Types
// ============================================================

export interface ProcessedDocument {
  id: string;
  filename: string;
  type: 'image' | 'pdf' | 'text';
  status: 'pending' | 'extracting' | 'analyzing' | 'complete' | 'error';
  uploadedAt: string;
  extractedText?: string;
  analysis?: string;
  structuredData?: {
    type: 'table' | 'chart' | 'form' | 'text';
    data: any;
  };
  model?: string;
  error?: string;
}

export interface DocumentProcessingHubProps {
  // Documents in the processing queue
  documents: ProcessedDocument[];
  
  // Processing state
  isProcessing?: boolean;
  currentStep?: 'upload' | 'extract' | 'analyze' | 'complete';
  
  // Actions
  onUploadFiles?: (files: File[]) => void;
  onExtractDocument?: (docId: string) => void;
  onAnalyzeDocument?: (docId: string) => void;
  onRemoveDocument?: (docId: string) => void;
  onExportDocument?: (docId: string, format: 'json' | 'csv' | 'markdown') => void;
  onUseInResearch?: (docId: string, content: string) => void;
  
  // Email context (if coming from email)
  emailAttachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
    url?: string;
  }>;
  onProcessEmailAttachment?: (index: number) => void;
}

// ============================================================
// Workflow Step Indicator
// ============================================================

interface WorkflowStepProps {
  step: number;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  isComplete: boolean;
  isLast?: boolean;
}

function WorkflowStep({ step, label, icon, isActive, isComplete, isLast }: WorkflowStepProps) {
  const activeColor = 'blue.400';
  const completeColor = 'green.400';
  const inactiveColor = 'gray.500';
  
  const color = isComplete ? completeColor : isActive ? activeColor : inactiveColor;
  
  return (
    <HStack spacing={2} flex={1}>
      <VStack spacing={1}>
        <Flex
          w="32px"
          h="32px"
          borderRadius="full"
          bg={isComplete ? 'green.500' : isActive ? 'blue.500' : 'gray.700'}
          align="center"
          justify="center"
          border="2px solid"
          borderColor={color}
        >
          {isComplete ? (
            <Icon as={FiCheck} boxSize={4} color="white" />
          ) : (
            <Icon as={icon} boxSize={4} color={isActive ? 'white' : inactiveColor} />
          )}
        </Flex>
        <Text fontSize="2xs" color={color} fontWeight={isActive ? '600' : '400'}>
          {label}
        </Text>
      </VStack>
      {!isLast && (
        <Box flex={1} h="2px" bg={isComplete ? completeColor : 'gray.700'} mt={-4} />
      )}
    </HStack>
  );
}

// ============================================================
// Document Card
// ============================================================

interface DocumentCardProps {
  doc: ProcessedDocument;
  onExtract?: () => void;
  onAnalyze?: () => void;
  onRemove?: () => void;
  onExport?: (format: 'json' | 'csv' | 'markdown') => void;
  onUseInResearch?: (content: string) => void;
}

function DocumentCard({ doc, onExtract, onAnalyze, onRemove, onExport, onUseInResearch }: DocumentCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const toast = useToast();

  const getStatusColor = () => {
    switch (doc.status) {
      case 'complete': return 'green';
      case 'extracting':
      case 'analyzing': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = () => {
    switch (doc.status) {
      case 'pending': return 'Ready to process';
      case 'extracting': return 'Extracting text...';
      case 'analyzing': return 'Analyzing content...';
      case 'complete': return 'Processing complete';
      case 'error': return doc.error || 'Error occurred';
    }
  };

  const getTypeIcon = () => {
    switch (doc.type) {
      case 'image': return FiImage;
      case 'pdf': return FiFileText;
      default: return FiFile;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard', status: 'success', duration: 2000 });
  };

  return (
    <Box
      p={3}
      bg={cardBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ borderColor: 'blue.500' }}
    >
      {/* Header */}
      <HStack justify="space-between" mb={2}>
        <HStack spacing={2}>
          <Icon as={getTypeIcon()} boxSize={4} color={mutedColor} />
          <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
            {doc.filename}
          </Text>
        </HStack>
        <HStack spacing={1}>
          <Badge colorScheme={getStatusColor()} fontSize="2xs">
            {doc.status === 'extracting' || doc.status === 'analyzing' ? (
              <HStack spacing={1}>
                <Spinner size="xs" />
                <Text>{getStatusLabel()}</Text>
              </HStack>
            ) : (
              getStatusLabel()
            )}
          </Badge>
          <IconButton
            aria-label="Remove"
            icon={<FiTrash2 />}
            size="xs"
            variant="ghost"
            colorScheme="red"
            onClick={onRemove}
          />
        </HStack>
      </HStack>

      {/* Progress for active processing */}
      {(doc.status === 'extracting' || doc.status === 'analyzing') && (
        <Progress size="xs" isIndeterminate colorScheme="blue" mb={2} borderRadius="full" />
      )}

      {/* Actions based on status */}
      <HStack spacing={2} mt={2}>
        {doc.status === 'pending' && (
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<FiZap />}
            onClick={onExtract}
            flex={1}
          >
            Extract & Analyze
          </Button>
        )}
        
        {doc.status === 'complete' && (
          <>
            <Button
              size="xs"
              variant="outline"
              leftIcon={<FiEye />}
              onClick={() => setShowDetails(!showDetails)}
              flex={1}
            >
              {showDetails ? 'Hide' : 'View'} Results
            </Button>
            <Tooltip label="Copy extracted text">
              <IconButton
                aria-label="Copy"
                icon={<FiCopy />}
                size="xs"
                variant="ghost"
                onClick={() => copyToClipboard(doc.extractedText || doc.analysis || '')}
              />
            </Tooltip>
            <Tooltip label="Export as JSON">
              <IconButton
                aria-label="Export"
                icon={<FiDownload />}
                size="xs"
                variant="ghost"
                onClick={() => onExport?.('json')}
              />
            </Tooltip>
            {onUseInResearch && (
              <Tooltip label="Use in research">
                <IconButton
                  aria-label="Use in research"
                  icon={<FiEdit3 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="green"
                  onClick={() => onUseInResearch(doc.analysis || doc.extractedText || '')}
                />
              </Tooltip>
            )}
          </>
        )}
      </HStack>

      {/* Expanded details */}
      {showDetails && doc.status === 'complete' && (
        <Box mt={3} pt={3} borderTop="1px solid" borderColor={borderColor}>
          <Tabs size="sm" variant="soft-rounded" colorScheme="blue">
            <TabList mb={2}>
              {doc.extractedText && <Tab fontSize="xs">Extracted Text</Tab>}
              {doc.analysis && <Tab fontSize="xs">Analysis</Tab>}
              {doc.structuredData && <Tab fontSize="xs">Structured Data</Tab>}
            </TabList>
            <TabPanels>
              {doc.extractedText && (
                <TabPanel p={0}>
                  <Box
                    maxH="200px"
                    overflow="auto"
                    bg="gray.900"
                    p={2}
                    borderRadius="md"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    color={textColor}
                  >
                    {doc.extractedText}
                  </Box>
                </TabPanel>
              )}
              {doc.analysis && (
                <TabPanel p={0}>
                  <Box
                    maxH="200px"
                    overflow="auto"
                    bg="gray.900"
                    p={2}
                    borderRadius="md"
                    fontSize="xs"
                    color={textColor}
                    sx={{
                      '& p': { mb: 2 },
                      '& h1, & h2, & h3': { fontWeight: 'bold', mb: 1 },
                      '& ul, & ol': { pl: 4 },
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {doc.analysis}
                    </ReactMarkdown>
                  </Box>
                </TabPanel>
              )}
              {doc.structuredData && (
                <TabPanel p={0}>
                  <Code
                    display="block"
                    whiteSpace="pre"
                    p={2}
                    borderRadius="md"
                    fontSize="2xs"
                    maxH="200px"
                    overflow="auto"
                  >
                    {JSON.stringify(doc.structuredData.data, null, 2)}
                  </Code>
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </Box>
      )}
    </Box>
  );
}

// ============================================================
// Upload Zone
// ============================================================

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  isDisabled?: boolean;
}

function UploadZone({ onUpload, isDisabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files);
    }
  }, [onUpload, isDisabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUpload(files);
    }
  }, [onUpload]);

  return (
    <Box
      p={6}
      border="2px dashed"
      borderColor={isDragging ? 'blue.400' : borderColor}
      borderRadius="lg"
      bg={isDragging ? 'blue.900' : 'transparent'}
      textAlign="center"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      opacity={isDisabled ? 0.5 : 1}
      transition="all 0.2s"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isDisabled && fileInputRef.current?.click()}
    >
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.doc,.docx"
        display="none"
        onChange={handleFileSelect}
      />
      <VStack spacing={2}>
        <Icon as={FiUpload} boxSize={8} color={isDragging ? 'blue.400' : mutedColor} />
        <Text fontSize="sm" color={isDragging ? 'blue.400' : mutedColor}>
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to upload'}
        </Text>
        <Text fontSize="xs" color={mutedColor}>
          Supports: Images, PDFs, Text files
        </Text>
      </VStack>
    </Box>
  );
}

// ============================================================
// Email Attachments Section
// ============================================================

interface EmailAttachmentsSectionProps {
  attachments: Array<{
    filename: string;
    content_type: string;
    size: number;
    url?: string;
  }>;
  onProcess: (index: number) => void;
  processedIndices?: Set<number>;
}

function EmailAttachmentsSection({ attachments, onProcess, processedIndices = new Set() }: EmailAttachmentsSectionProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const imageAttachments = attachments.filter(a => a.content_type?.startsWith('image/'));
  
  if (imageAttachments.length === 0) return null;

  return (
    <Box>
      <HStack mb={2}>
        <Icon as={FiImage} boxSize={4} color="purple.400" />
        <Text fontSize="sm" fontWeight="600" color={textColor}>
          Email Attachments
        </Text>
        <Badge colorScheme="purple" fontSize="2xs">{imageAttachments.length}</Badge>
      </HStack>
      <SimpleGrid columns={[2, 3, 4]} spacing={2}>
        {imageAttachments.map((att, idx) => (
          <Box
            key={idx}
            p={2}
            border="1px solid"
            borderColor={processedIndices.has(idx) ? 'green.500' : borderColor}
            borderRadius="md"
            bg={processedIndices.has(idx) ? 'green.900' : 'transparent'}
          >
            <VStack spacing={1}>
              <Icon as={FiImage} boxSize={6} color={mutedColor} />
              <Text fontSize="2xs" color={textColor} noOfLines={1}>
                {att.filename}
              </Text>
              <Button
                size="xs"
                colorScheme={processedIndices.has(idx) ? 'green' : 'blue'}
                variant={processedIndices.has(idx) ? 'solid' : 'outline'}
                leftIcon={processedIndices.has(idx) ? <FiCheck /> : <FiZap />}
                onClick={() => onProcess(idx)}
                isDisabled={processedIndices.has(idx)}
                w="full"
              >
                {processedIndices.has(idx) ? 'Done' : 'Process'}
              </Button>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

// ============================================================
// Main Component
// ============================================================

export function DocumentProcessingHub({
  documents,
  isProcessing = false,
  currentStep = 'upload',
  onUploadFiles,
  onExtractDocument,
  onAnalyzeDocument,
  onRemoveDocument,
  onExportDocument,
  onUseInResearch,
  emailAttachments = [],
  onProcessEmailAttachment,
}: DocumentProcessingHubProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const completedDocs = documents.filter(d => d.status === 'complete').length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const processingDocs = documents.filter(d => d.status === 'extracting' || d.status === 'analyzing').length;
  
  const processedEmailIndices = new Set(
    documents
      .filter(d => emailAttachments.some(a => a.filename === d.filename))
      .map(d => emailAttachments.findIndex(a => a.filename === d.filename))
      .filter(i => i >= 0)
  );

  // Determine workflow step
  const getWorkflowStep = () => {
    if (documents.length === 0) return 0;
    if (pendingDocs > 0) return 1;
    if (processingDocs > 0) return 2;
    if (completedDocs > 0) return 3;
    return 0;
  };

  const workflowStep = getWorkflowStep();

  return (
    <Box p={4}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="lg" fontWeight="700" color={textColor}>
              Document Processing
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              Extract and analyze content from images and documents
            </Text>
          </VStack>
          {completedDocs > 0 && (
            <Badge colorScheme="green" fontSize="sm" px={2} py={1}>
              {completedDocs} processed
            </Badge>
          )}
        </HStack>

        {/* Workflow Steps */}
        <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
          <HStack spacing={0} justify="space-between">
            <WorkflowStep
              step={1}
              label="Upload"
              icon={FiUpload}
              isActive={workflowStep === 0}
              isComplete={workflowStep > 0}
            />
            <WorkflowStep
              step={2}
              label="Extract"
              icon={FiFileText}
              isActive={workflowStep === 1}
              isComplete={workflowStep > 1}
            />
            <WorkflowStep
              step={3}
              label="Analyze"
              icon={FiZap}
              isActive={workflowStep === 2}
              isComplete={workflowStep > 2}
            />
            <WorkflowStep
              step={4}
              label="Export"
              icon={FiDownload}
              isActive={workflowStep === 3}
              isComplete={false}
              isLast
            />
          </HStack>
        </Box>

        {/* Email Attachments (if available) */}
        {emailAttachments.length > 0 && onProcessEmailAttachment && (
          <EmailAttachmentsSection
            attachments={emailAttachments}
            onProcess={onProcessEmailAttachment}
            processedIndices={processedEmailIndices}
          />
        )}

        <Divider />

        {/* Upload Zone */}
        {onUploadFiles && (
          <UploadZone onUpload={onUploadFiles} isDisabled={isProcessing} />
        )}

        {/* Document Queue */}
        {documents.length > 0 && (
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              Processing Queue ({documents.length})
            </Text>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onExtract={() => onExtractDocument?.(doc.id)}
                onAnalyze={() => onAnalyzeDocument?.(doc.id)}
                onRemove={() => onRemoveDocument?.(doc.id)}
                onExport={(format) => onExportDocument?.(doc.id, format)}
                onUseInResearch={onUseInResearch ? (content) => onUseInResearch(doc.id, content) : undefined}
              />
            ))}
          </VStack>
        )}

        {/* Empty State */}
        {documents.length === 0 && emailAttachments.length === 0 && (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">No documents to process</AlertTitle>
              <AlertDescription fontSize="xs">
                Upload files or process email attachments to extract and analyze their content.
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </VStack>
    </Box>
  );
}

export default DocumentProcessingHub;

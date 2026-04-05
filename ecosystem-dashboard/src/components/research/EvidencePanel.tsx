/**
 * EvidencePanel — Resizable artifact-style split pane for research evidence.
 *
 * Supports:
 * - Email image attachments (original)
 * - Workspace-AI generated documents (thumbnails)
 * - PDFs and other document types
 * - Drag-to-resize left edge
 * - Inline viewing / editing option
 *
 * UX pattern: Claude Artifacts / ChatGPT Canvas — a resizable right-side
 * panel that shows evidence the agent can reference during analysis.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Image,
  Spinner,
  Tooltip,
  Divider,
  Icon,
  Button,
  Flex,
} from '@chakra-ui/react';
import {
  FiX,
  FiMaximize2,
  FiMinimize2,
  FiImage,
  FiZap,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiEdit3,
  FiExternalLink,
  FiFile,
  FiCpu,
  FiCloud,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// ============================================================
// Types
// ============================================================

export interface EvidenceImage {
  filename: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentId?: string;
  attachmentIndex: number;
  url?: string;
  isLoading?: boolean;
  error?: string;
  analysisResult?: any;
}

export interface EvidenceDocument {
  id: string;
  title: string;
  type: 'workspace-page' | 'pdf' | 'markdown' | 'generated-report' | 'image';
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  createdAt?: string;
  source: 'email-attachment' | 'workspace-ai' | 'research-output' | 'upload';
  metadata?: Record<string, any>;
}

interface EvidencePanelProps {
  emailId?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
    is_inline: boolean;
    content_id?: string;
    attachment_index?: number;
    emlx_path?: string;
  }>;
  documents?: EvidenceDocument[];
  isOpen: boolean;
  onToggle: () => void;
  onAnalyzeImage?: (image: EvidenceImage, visionModel?: 'local' | 'cloud') => void;
  onOpenInline?: (doc: EvidenceDocument) => void;
  onOpenExternal?: (doc: EvidenceDocument) => void;
  atlasResults?: any;
  privacyTier?: string;
}

// ============================================================
// Drag-to-resize hook
// ============================================================

function useResizable(initialWidth: number, minWidth: number, maxWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(initialWidth);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX.current - moveEvent.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [width, minWidth, maxWidth]);

  return { width, onMouseDown, setWidth };
}

// ============================================================
// Evidence icon helper
// ============================================================

function getDocIcon(type: EvidenceDocument['type']) {
  switch (type) {
    case 'workspace-page': return FiFileText;
    case 'pdf': return FiFile;
    case 'markdown': return FiFileText;
    case 'generated-report': return FiFileText;
    case 'image': return FiImage;
    default: return FiFile;
  }
}

function getDocColor(type: EvidenceDocument['type']) {
  switch (type) {
    case 'workspace-page': return 'purple';
    case 'pdf': return 'red';
    case 'markdown': return 'green';
    case 'generated-report': return 'blue';
    case 'image': return 'cyan';
    default: return 'gray';
  }
}

// ============================================================
// Component
// ============================================================

export function EvidencePanel({
  emailId,
  attachments = [],
  documents: externalDocs = [],
  isOpen,
  onToggle,
  onAnalyzeImage,
  onOpenInline,
  onOpenExternal,
  atlasResults,
  privacyTier = 'standard',
}: EvidencePanelProps) {
  const [images, setImages] = useState<EvidenceImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'images' | 'documents'>('images');

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const borderSubtle = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceHover = useSemanticToken('surface.hover');

  const { width: panelWidth, onMouseDown } = useResizable(380, 280, 800);

  // Build evidence list from email attachments
  useEffect(() => {
    if (!emailId || attachments.length === 0) {
      setImages([]);
      return;
    }
    const imageAttachments = attachments.filter(
      a => a.content_type?.startsWith('image/')
    );
    setImages(
      imageAttachments.map((att, idx) => ({
        filename: att.filename || `image_${idx}`,
        contentType: att.content_type,
        size: att.size || 0,
        isInline: att.is_inline || false,
        contentId: att.content_id,
        attachmentIndex: att.attachment_index ?? idx,
        url: att.content_id
          ? `/api/hermes-proxy?path=v1/attachments/inline/${encodeURIComponent(emailId)}/${encodeURIComponent(att.content_id)}`
          : `/api/hermes-proxy?path=v1/attachments/download/${encodeURIComponent(emailId)}/${att.attachment_index ?? idx}`,
        isLoading: false,
      }))
    );
  }, [attachments, emailId]);

  // Merge image-type external docs into the documents tab
  const allDocuments: EvidenceDocument[] = externalDocs;

  const totalItems = images.length + allDocuments.length;

  // Auto-select tab based on available content
  useEffect(() => {
    if (images.length === 0 && allDocuments.length > 0) setActiveTab('documents');
    else if (images.length > 0) setActiveTab('images');
  }, [images.length, allDocuments.length]);

  if (totalItems === 0) return null;

  const currentImage = images[selectedIndex];

  // ---- Collapsed tab ----
  if (!isOpen) {
    return (
      <Box position="relative" cursor="pointer" onClick={onToggle}>
        <Tooltip label={`${totalItems} evidence item(s) — click to view`} placement="left">
          <Box
            w="36px"
            bg={bgColor}
            borderLeft="1px solid"
            borderColor={borderColor}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={4}
            gap={2}
            _hover={{ bg: surfaceHover }}
            transition="background 0.15s"
            h="full"
            minH="200px"
          >
            <Icon as={FiImage} boxSize={4} color="blue.400" />
            <Badge colorScheme="blue" fontSize="2xs" borderRadius="full" minW="18px" textAlign="center">
              {totalItems}
            </Badge>
            <Icon as={FiChevronLeft} boxSize={3} color={mutedColor} />
          </Box>
        </Tooltip>
      </Box>
    );
  }

  // ---- Expanded panel ----
  return (
    <Box
      w={`${panelWidth}px`}
      minW="280px"
      maxW="800px"
      bg={bgColor}
      borderLeft="1px solid"
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      h="full"
      overflow="hidden"
      position="relative"
    >
      {/* Resize handle — left edge drag */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="5px"
        cursor="col-resize"
        zIndex={10}
        onMouseDown={onMouseDown}
        _hover={{ bg: 'blue.500' }}
        transition="background 0.15s"
        bg="transparent"
      />

      {/* Header */}
      <HStack
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor={borderColor}
        justify="space-between"
        flexShrink={0}
      >
        <HStack spacing={2}>
          <Icon as={FiImage} boxSize={4} color="blue.400" />
          <Text fontSize="xs" fontWeight="700" color={textColor}>
            Evidence
          </Text>
          <Badge colorScheme="blue" fontSize="2xs">{totalItems}</Badge>
          {privacyTier === 'standard' && (
            <Badge colorScheme="orange" fontSize="2xs" variant="subtle">☁️ Cloud</Badge>
          )}
          {privacyTier !== 'standard' && (
            <Badge colorScheme="green" fontSize="2xs" variant="subtle">🏠 Local</Badge>
          )}
        </HStack>
        <HStack spacing={0}>
          <Tooltip label="Close evidence panel">
            <IconButton
              aria-label="Close"
              icon={<Icon as={FiChevronRight} />}
              size="xs"
              variant="ghost"
              onClick={onToggle}
            />
          </Tooltip>
        </HStack>
      </HStack>

      {/* Tab switcher */}
      {images.length > 0 && allDocuments.length > 0 && (
        <HStack px={3} py={1.5} borderBottom="1px solid" borderColor={borderSubtle} spacing={1} flexShrink={0}>
          <Button
            size="xs"
            variant={activeTab === 'images' ? 'solid' : 'ghost'}
            colorScheme={activeTab === 'images' ? 'blue' : 'gray'}
            leftIcon={<Icon as={FiImage} boxSize={3} />}
            onClick={() => setActiveTab('images')}
            borderRadius="md"
          >
            Images ({images.length})
          </Button>
          <Button
            size="xs"
            variant={activeTab === 'documents' ? 'solid' : 'ghost'}
            colorScheme={activeTab === 'documents' ? 'purple' : 'gray'}
            leftIcon={<Icon as={FiFileText} boxSize={3} />}
            onClick={() => setActiveTab('documents')}
            borderRadius="md"
          >
            Docs ({allDocuments.length})
          </Button>
        </HStack>
      )}

      {/* Content area */}
      <Box flex={1} overflow="auto" p={3}>
        {activeTab === 'images' && images.length > 0 && (
          <VStack spacing={3} align="stretch">
            {/* Current image */}
            {currentImage && (
              <Box borderRadius="lg" border="1px solid" borderColor={borderColor} overflow="hidden" bg="black">
                <Image
                  src={currentImage.url}
                  alt={currentImage.filename}
                  w="full"
                  maxH="50vh"
                  objectFit="contain"
                  fallback={
                    <Flex align="center" justify="center" h="200px" bg="gray.900">
                      <Spinner size="md" color="blue.400" />
                    </Flex>
                  }
                />
              </Box>
            )}

            {/* Image info + analyze options */}
            {currentImage && (
              <VStack align="stretch" spacing={2} px={1}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={1}>
                      {currentImage.filename}
                    </Text>
                    <Text fontSize="2xs" color={mutedColor}>
                      {currentImage.contentType} • {currentImage.isInline ? 'Inline' : 'Attachment'}
                    </Text>
                  </VStack>
                </HStack>
                {onAnalyzeImage && (
                  <HStack spacing={2}>
                    <Tooltip label="Analyze with Qwen Vision (local, private, free)">
                      <Button
                        size="xs"
                        leftIcon={<Icon as={FiCpu} boxSize={3} />}
                        colorScheme="green"
                        variant="outline"
                        onClick={() => onAnalyzeImage(currentImage, 'local')}
                        flex={1}
                      >
                        Local Vision
                      </Button>
                    </Tooltip>
                    <Tooltip label="Analyze with Gemini Vision (cloud, higher accuracy)">
                      <Button
                        size="xs"
                        leftIcon={<Icon as={FiCloud} boxSize={3} />}
                        colorScheme="blue"
                        variant="outline"
                        onClick={() => onAnalyzeImage(currentImage, 'cloud')}
                        flex={1}
                      >
                        Cloud Vision
                      </Button>
                    </Tooltip>
                  </HStack>
                )}
              </VStack>
            )}

            {/* Atlas results */}
            {atlasResults && !atlasResults.error && atlasResults.extractions?.length > 0 && (
              <>
                <Divider />
                <Box p={2} bg="whiteAlpha.50" borderRadius="md" border="1px solid" borderColor="blue.800">
                  <Text fontSize="2xs" fontWeight="700" color="blue.300" mb={1}>
                    📊 Atlas Extraction
                  </Text>
                  {atlasResults.extractions.map((ext: any, i: number) => (
                    <VStack key={i} align="stretch" spacing={0.5} mb={2}>
                      <HStack>
                        <Badge colorScheme="purple" fontSize="2xs">{ext.chart_type || 'data'}</Badge>
                        <Text fontSize="2xs" color={textColor} noOfLines={1}>{ext.title || `Chart ${i + 1}`}</Text>
                      </HStack>
                      {ext.data_series && (
                        <Box pl={2}>
                          {ext.data_series.slice(0, 5).map((d: any, j: number) => (
                            <Text key={j} fontSize="2xs" color={mutedColor}>
                              {d.label}: {d.value}
                            </Text>
                          ))}
                          {ext.data_series.length > 5 && (
                            <Text fontSize="2xs" color={mutedColor}>
                              +{ext.data_series.length - 5} more...
                            </Text>
                          )}
                        </Box>
                      )}
                    </VStack>
                  ))}
                  {atlasResults.analysis?.summary && (
                    <Text fontSize="2xs" color={mutedColor} mt={1}>
                      {atlasResults.analysis.summary}
                    </Text>
                  )}
                </Box>
              </>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <>
                <Divider />
                <HStack spacing={2} overflow="auto" pb={1}>
                  {images.map((img, idx) => (
                    <Box
                      key={idx}
                      w="60px"
                      h="60px"
                      borderRadius="md"
                      border="2px solid"
                      borderColor={idx === selectedIndex ? 'blue.400' : borderColor}
                      overflow="hidden"
                      cursor="pointer"
                      onClick={() => setSelectedIndex(idx)}
                      flexShrink={0}
                      opacity={idx === selectedIndex ? 1 : 0.6}
                      transition="all 0.15s"
                      _hover={{ opacity: 1, borderColor: 'blue.300' }}
                    >
                      <Image
                        src={img.url}
                        alt={img.filename}
                        w="full"
                        h="full"
                        objectFit="cover"
                        fallback={
                          <Flex align="center" justify="center" h="full" bg="gray.800">
                            <Icon as={FiImage} boxSize={3} color={mutedColor} />
                          </Flex>
                        }
                      />
                    </Box>
                  ))}
                </HStack>
              </>
            )}
          </VStack>
        )}

        {activeTab === 'documents' && allDocuments.length > 0 && (
          <VStack spacing={2} align="stretch">
            {allDocuments.map((doc) => (
              <Box
                key={doc.id}
                p={3}
                borderRadius="lg"
                border="1px solid"
                borderColor={borderSubtle}
                bg={bgColor}
                _hover={{ borderColor: `${getDocColor(doc.type)}.400`, bg: surfaceHover }}
                transition="all 0.15s"
                cursor="pointer"
                role="group"
              >
                <HStack spacing={3}>
                  {/* Thumbnail */}
                  <Flex
                    w="48px"
                    h="48px"
                    borderRadius="md"
                    bg={`${getDocColor(doc.type)}.500`}
                    align="center"
                    justify="center"
                    flexShrink={0}
                    overflow="hidden"
                  >
                    {doc.thumbnailUrl ? (
                      <Image src={doc.thumbnailUrl} alt={doc.title} w="full" h="full" objectFit="cover" />
                    ) : (
                      <Icon as={getDocIcon(doc.type)} boxSize={5} color="white" />
                    )}
                  </Flex>

                  {/* Info */}
                  <VStack align="start" spacing={0} flex={1} minW={0}>
                    <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={1}>
                      {doc.title}
                    </Text>
                    <HStack spacing={1}>
                      <Badge colorScheme={getDocColor(doc.type)} fontSize="2xs">
                        {doc.type.replace('-', ' ')}
                      </Badge>
                      <Badge colorScheme="gray" fontSize="2xs" variant="subtle">
                        {doc.source.replace('-', ' ')}
                      </Badge>
                    </HStack>
                    {doc.createdAt && (
                      <Text fontSize="2xs" color={mutedColor}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </VStack>

                  {/* Actions */}
                  <HStack spacing={0} opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.15s">
                    {onOpenInline && (
                      <Tooltip label="Open inline">
                        <IconButton
                          aria-label="Open inline"
                          icon={<Icon as={FiEdit3} boxSize={3.5} />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); onOpenInline(doc); }}
                        />
                      </Tooltip>
                    )}
                    {onOpenExternal && (
                      <Tooltip label="Open in new tab">
                        <IconButton
                          aria-label="Open external"
                          icon={<Icon as={FiExternalLink} boxSize={3.5} />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); onOpenExternal(doc); }}
                        />
                      </Tooltip>
                    )}
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

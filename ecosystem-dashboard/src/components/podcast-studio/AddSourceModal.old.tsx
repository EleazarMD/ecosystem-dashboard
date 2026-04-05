import React, { useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  Icon,
  Box,
  Progress,
  useToast,
  Badge,
  Divider,
  Flex,
  Heading,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiLink, FiCheck, FiCpu, FiFileText, FiZap, FiRefreshCw } from 'react-icons/fi';
import { useModelRegistry } from '../../hooks/useModelRegistry';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSource: (source: NewSource) => void;
  projectId?: string;
}

export interface NewSource {
  title: string;
  type: 'pdf' | 'document' | 'article' | 'book' | 'video' | 'audio' | 'url';
  file?: File;
  url?: string;
  description?: string;
  wordCount?: number;
  pageCount?: number;
  cached?: boolean;
  materialId?: string;
}

export default function AddSourceModal({ isOpen, onClose, onAddSource, projectId }: AddSourceModalProps) {
  const [sourceType, setSourceType] = useState<'upload' | 'url' | 'stories'>('upload');
  const [stories, setStories] = useState<any[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [type, setType] = useState<NewSource['type']>('pdf');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [analysisModel, setAnalysisModel] = useState('gemini-2-5-flash'); // Will work - timing issue on first gateway request only
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { availableModels, providers, isLoading } = useModelRegistry();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const accentColor = 'blue.500';
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.base');
  const uploadBg = useSemanticToken('surface.hover');
  const uploadBorderColor = 'blue.500';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
    }

    // Auto-detect type based on file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setType('pdf');
    else if (['doc', 'docx', 'txt'].includes(ext || '')) setType('document');
    else if (['mp4', 'avi', 'mov'].includes(ext || '')) setType('video');
    else if (['mp3', 'wav', 'm4a'].includes(ext || '')) setType('audio');
  };

  const handleSubmit = async () => {
    if (!title) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for the source',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (sourceType === 'upload' && !selectedFile) {
      toast({
        title: 'File required',
        description: 'Please select a file to upload',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (sourceType === 'url' && !url) {
      toast({
        title: 'URL required',
        description: 'Please enter a URL',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing document...');

    try {
      if (sourceType === 'upload' && selectedFile) {
        // Stage 1: Reading file (0-20%)
        setUploadStatus('📖 Reading file...');
        setUploadProgress(5);
        const reader = new FileReader();

        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            setUploadProgress(20);
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        // Stage 2: Sending to AI (20-30%)
        setUploadStatus(`🤖 Sending to ${analysisModel}...`);
        setUploadProgress(25);

        const startTime = Date.now();
        console.log(`📤 Uploading document to analyze-document API (size: ${(fileData.length / 1024 / 1024).toFixed(2)}MB)`);

        // Create abort controller with 5 minute timeout (matches API maxDuration)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

        const response = await fetch('/api/podcast-studio/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectId || 'new-project',
            title,
            type,
            fileData,
            fileName: selectedFile.name,
            analysisModel
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Stage 3: AI is analyzing (30-70%) - This is the longest stage
        setUploadStatus('🧠 AI analyzing document content...');
        setUploadProgress(35);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('❌ Analysis API error:', response.status, errorBody);
          throw new Error(`Analysis failed: ${response.statusText}`);
        }

        console.log(`✅ Analysis API responded after ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

        // Stage 4: Processing results (70-90%)
        setUploadStatus('📊 Processing analysis results...');
        setUploadProgress(75);
        const analysis = await response.json();
        console.log('📥 Received analysis response:', analysis);
        setUploadProgress(90);

        // Stage 5: Finalizing (90-100%)
        setUploadStatus('✅ Finalizing...');
        setUploadProgress(95);
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        setUploadProgress(100);

        // Success notification with detailed info
        toast({
          title: analysis.cached ? '⚡ Source loaded from cache' : '✅ Document analyzed successfully',
          description: `"${title}" added to sources panel\n📄 ${analysis.pageCount} pages • ${analysis.wordCount.toLocaleString()} words • Processed in ${processingTime}s`,
          status: 'success',
          duration: 6000,
          isClosable: true,
          position: 'top-right',
        });

        console.log('✅ Source successfully analyzed and ready to add:', {
          title,
          materialId: analysis.materialId,
          wordCount: analysis.wordCount,
          pageCount: analysis.pageCount,
          cached: analysis.cached
        });

        // Return analyzed source with complete data
        const newSource: NewSource = {
          title,
          type,
          description: analysis.summary || description,
          file: selectedFile,
          wordCount: analysis.wordCount,
          pageCount: analysis.pageCount,
          cached: analysis.cached,
          materialId: analysis.materialId
        };

        console.log('📤 Sending source to parent:', newSource);
        onAddSource(newSource);

        // Small delay to ensure state updates before closing
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // URL-based source
        await new Promise(resolve => setTimeout(resolve, 2000));

        setUploadProgress(100);

        const newSource: NewSource = {
          title,
          type,
          description,
          url
        };

        onAddSource(newSource);

        toast({
          title: 'Source added',
          description: `${title} has been added to your sources`,
          status: 'success',
          duration: 3000,
        });
      }

      handleClose();
    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });

      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'There was an error uploading your file',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      // Reset progress and status after a short delay to show completion
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 1000);
    }
  };

  // Load stories from Story Intelligence
  const loadStories = async () => {
    setIsLoadingStories(true);
    try {
      const response = await fetch('/api/story-intelligence/stories?limit=20');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      } else {
        toast({
          title: 'Failed to load stories',
          description: 'Story Intelligence service may not be running',
          status: 'warning',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
      toast({
        title: 'Failed to load stories',
        description: 'Could not connect to Story Intelligence',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingStories(false);
    }
  };

  // Toggle story selection
  const toggleStorySelection = (storyId: string) => {
    setSelectedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  // Import selected stories
  const handleImportStories = () => {
    const selectedStoryList = stories.filter(s => selectedStories.has(s.id));
    selectedStoryList.forEach(story => {
      const newSource: NewSource = {
        title: story.title,
        type: 'article',
        description: story.summary || story.content?.substring(0, 500),
        url: story.url,
        wordCount: story.content?.split(/\s+/).length || 0,
      };
      onAddSource(newSource);
    });
    
    toast({
      title: 'Stories imported',
      description: `Added ${selectedStoryList.length} stories to sources`,
      status: 'success',
      duration: 3000,
    });
    
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setType('pdf');
    setUrl('');
    setDescription('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setIsUploading(false);
    setSelectedStories(new Set());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="6xl">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(12px)" />
      <ModalContent bg={bgColor} borderRadius="2xl" boxShadow="dark-lg" maxH="85vh">
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor} pb={4}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <Box p={2} bg={accentColor} borderRadius="lg">
                <Icon as={FiFileText} fontSize="24px" color={useSemanticToken('text.inverse')} />
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="700">Add Research Source</Text>
                <Text fontSize="sm" fontWeight="400" color={mutedColor}>
                  Upload documents for AI-powered analysis
                </Text>
              </Box>
            </Flex>
          </Flex>
        </ModalHeader>
        <ModalCloseButton size="lg" />

        <ModalBody p={0} overflow="hidden">
          <VStack spacing={6} align="stretch">
            {/* Source Type Selection */}
            <HStack spacing={2} bg={cardBg} p={1} borderRadius="md">
              <Button
                flex={1}
                size="sm"
                variant={sourceType === 'upload' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setSourceType('upload')}
                leftIcon={<FiUpload />}
              >
                Upload File
              </Button>
              <Button
                flex={1}
                size="sm"
                variant={sourceType === 'url' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setSourceType('url')}
                leftIcon={<FiLink />}
              >
                Add URL
              </Button>
              <Button
                flex={1}
                size="sm"
                variant={sourceType === 'stories' ? 'solid' : 'ghost'}
                colorScheme="purple"
                onClick={() => {
                  setSourceType('stories');
                  if (stories.length === 0) loadStories();
                }}
                leftIcon={<FiZap />}
              >
                Story Intel
              </Button>
            </HStack>

            {/* File Upload */}
            {sourceType === 'upload' && (
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" mb={3}>Upload Document</FormLabel>
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  display="none"
                  accept=".pdf,.doc,.docx,.txt,.mp3,.mp4,.wav,.m4a"
                />
                <Box
                  p={8}
                  borderWidth={3}
                  borderStyle="dashed"
                  borderColor={isDragOver ? uploadBorderColor : borderColor}
                  borderRadius="xl"
                  textAlign="center"
                  cursor="pointer"
                  bg={isDragOver ? uploadBg : 'transparent'}
                  _hover={{ bg: uploadBg, borderColor: uploadBorderColor }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  transition="all 0.2s"
                >
                  {selectedFile ? (
                    <VStack spacing={3}>
                      <Box
                        p={4}
                        borderRadius="full"
                        bg="green.50"
                        _dark={{ bg: 'green.900' }}
                      >
                        <Icon as={FiCheck} boxSize={8} color="green.500" />
                      </Box>
                      <Text fontSize="md" fontWeight="600">
                        {selectedFile.name}
                      </Text>
                      <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                      <Text fontSize="xs" color={mutedColor}>
                        Click to change file
                      </Text>
                    </VStack>
                  ) : (
                    <VStack spacing={3}>
                      <Box
                        p={4}
                        borderRadius="full"
                        bg={cardBg}
                      >
                        <Icon as={FiUpload} boxSize={8} color={accentColor} />
                      </Box>
                      <Text fontSize="md" fontWeight="600">
                        Drop your file here, or click to browse
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Supports: PDF, DOC, DOCX, TXT, MP3, MP4, WAV
                      </Text>
                      <Badge colorScheme="blue" fontSize="xs">
                        Max file size: 50 MB
                      </Badge>
                    </VStack>
                  )}
                </Box>
              </FormControl>
            )}

            {/* URL Input */}
            {sourceType === 'url' && (
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" mb={3}>Document URL</FormLabel>
                <Input
                  size="lg"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  borderRadius="lg"
                  _focus={{ borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` }}
                />
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  Enter a web page, PDF, or document URL for analysis
                </Text>
              </FormControl>
            )}

            {/* Story Intelligence */}
            {sourceType === 'stories' && (
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="sm" fontWeight="600">Select Stories from Story Intelligence</Text>
                  <Button
                    size="sm"
                    leftIcon={<FiRefreshCw />}
                    onClick={loadStories}
                    isLoading={isLoadingStories}
                    variant="ghost"
                  >
                    Refresh
                  </Button>
                </HStack>
                
                {isLoadingStories ? (
                  <VStack py={8}>
                    <Progress size="xs" isIndeterminate w="200px" colorScheme="purple" />
                    <Text fontSize="sm" color={mutedColor}>Loading stories...</Text>
                  </VStack>
                ) : stories.length === 0 ? (
                  <VStack py={8} spacing={3}>
                    <Icon as={FiZap} boxSize={8} color={mutedColor} />
                    <Text fontSize="sm" color={mutedColor}>No stories available</Text>
                    <Text fontSize="xs" color={mutedColor}>Make sure Story Intelligence service is running</Text>
                  </VStack>
                ) : (
                  <VStack spacing={2} maxH="300px" overflowY="auto" align="stretch">
                    {stories.map(story => (
                      <Box
                        key={story.id}
                        p={3}
                        borderWidth="1px"
                        borderRadius="lg"
                        borderColor={selectedStories.has(story.id) ? 'purple.500' : borderColor}
                        bg={selectedStories.has(story.id) ? 'purple.50' : 'transparent'}
                        _dark={{ bg: selectedStories.has(story.id) ? 'purple.900' : 'transparent' }}
                        cursor="pointer"
                        onClick={() => toggleStorySelection(story.id)}
                        _hover={{ borderColor: 'purple.400' }}
                        transition="all 0.2s"
                      >
                        <HStack justify="space-between">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize="sm" fontWeight="600" noOfLines={1}>{story.title}</Text>
                            <HStack spacing={2}>
                              <Badge colorScheme="purple" fontSize="xs">{story.category || 'News'}</Badge>
                              {story.source && <Text fontSize="xs" color={mutedColor}>{story.source}</Text>}
                            </HStack>
                          </VStack>
                          {selectedStories.has(story.id) && (
                            <Icon as={FiCheck} color="purple.500" />
                          )}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                )}
                
                {selectedStories.size > 0 && (
                  <Button
                    mt={4}
                    w="full"
                    colorScheme="purple"
                    onClick={handleImportStories}
                    leftIcon={<FiZap />}
                  >
                    Import {selectedStories.size} Selected {selectedStories.size === 1 ? 'Story' : 'Stories'}
                  </Button>
                )}
              </Box>
            )}

            {sourceType !== 'stories' && <Divider />}

            {/* Title - only for upload/url modes */}
            {sourceType !== 'stories' && (
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="600">Title</FormLabel>
                <Input
                  size="lg"
                  placeholder="Enter source title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  borderRadius="lg"
                  _focus={{ borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` }}
                />
              </FormControl>
            )}

            {sourceType !== 'stories' && <HStack spacing={4} align="flex-start">
              {/* Type */}
              <FormControl flex={1}>
                <FormLabel fontSize="sm" fontWeight="600">Content Type</FormLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as NewSource['type'])}
                  size="lg"
                  borderRadius="lg"
                >
                  <option value="pdf">📄 PDF Document</option>
                  <option value="document">📝 Document</option>
                  <option value="article">📰 Article</option>
                  <option value="book">📚 Book</option>
                  <option value="video">🎥 Video</option>
                  <option value="audio">🎧 Audio</option>
                  <option value="url">🔗 Web URL</option>
                </Select>
              </FormControl>

              {/* AI Model Selector */}
              <FormControl flex={1}>
                <FormLabel fontSize="sm" fontWeight="600">
                  <HStack spacing={2}>
                    <Icon as={FiCpu} />
                    <Text>Analysis Model</Text>
                  </HStack>
                </FormLabel>
                <Select
                  value={analysisModel}
                  onChange={(e) => setAnalysisModel(e.target.value)}
                  size="lg"
                  borderRadius="lg"
                  isDisabled={isLoading}
                >
                  {providers.google.available && (
                    <optgroup label="🔒 Google Gemini (Recommended)">
                      <option value="gemini-2-5-flash">⚡ Gemini 2.5 Flash - Fast & Best Value</option>
                      <option value="gemini-2-5-pro">🎯 Gemini 2.5 Pro - Highest Quality</option>
                      <option value="gemini-1-5-flash">Gemini 1.5 Flash - Reliable</option>
                    </optgroup>
                  )}
                  {providers.ollama.available && (
                    <optgroup label="🏠 Local Models (Free)">
                      {availableModels
                        .filter(m => m.provider === 'ollama')
                        .slice(0, 3)
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                  {providers.openai.available && (
                    <optgroup label="🤖 OpenAI">
                      <option value="gpt-4o">GPT-4o</option>
                    </optgroup>
                  )}
                  {providers.anthropic.available && (
                    <optgroup label="🧠 Anthropic Claude">
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    </optgroup>
                  )}
                </Select>
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  💡 Recommended: Gemini 2.5 Flash for best PDF analysis with native multimodal support
                </Text>
              </FormControl>
            </HStack>}

            {/* Description - only for upload/url modes */}
            {sourceType !== 'stories' && <FormControl>
              <FormLabel fontSize="sm" fontWeight="600">Description (Optional)</FormLabel>
              <Textarea
                placeholder="Brief description of the source material"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                borderRadius="lg"
                _focus={{ borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` }}
              />
            </FormControl>}

            {/* Upload Progress */}
            {isUploading && (
              <Box p={4} bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="sm" fontWeight="600" color={accentColor}>
                    {uploadStatus || 'Processing...'}
                  </Text>
                  <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                    {uploadProgress}%
                  </Badge>
                </HStack>
                <Progress
                  value={uploadProgress}
                  size="md"
                  colorScheme="blue"
                  borderRadius="full"
                  hasStripe
                  isAnimated
                />
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  {uploadProgress < 90
                    ? 'Preparing document...'
                    : `Analyzing with ${analysisModel}...`}
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>

        {sourceType !== 'stories' && (
          <ModalFooter bg={cardBg} borderBottomRadius="xl" pt={4}>
            <HStack spacing={3} width="full" justify="flex-end">
              <Button
                variant="ghost"
                onClick={handleClose}
                isDisabled={isUploading}
                size="lg"
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={isUploading}
                loadingText="Analyzing..."
                size="lg"
                px={8}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                transition="all 0.2s"
              >
                Add Source
              </Button>
            </HStack>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

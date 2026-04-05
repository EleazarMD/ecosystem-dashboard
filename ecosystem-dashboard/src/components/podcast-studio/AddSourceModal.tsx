import React, { useState, useRef, useEffect } from 'react';
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
  InputGroup,
  InputLeftElement,
  Icon,
  Box,
  Progress,
  useToast,
  Badge,
  Flex,
  Spinner,
  Checkbox,
  IconButton,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Divider,
} from '@chakra-ui/react';
import { 
  FiUpload, 
  FiLink, 
  FiCheck, 
  FiZap, 
  FiRefreshCw, 
  FiFile,
  FiSearch,
  FiFileText,
  FiClock,
  FiHash,
} from 'react-icons/fi';
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
  content?: string;
  description?: string;
  wordCount?: number;
  pageCount?: number;
  cached?: boolean;
  materialId?: string;
  metadata?: Record<string, any>;
}

type SourceTab = 'upload' | 'url' | 'paste' | 'stories' | 'research';

interface FileStats {
  wordCount: number;
  pageCount: number;
  estimatedReadTime: number;
  cached: boolean;
  materialId?: string;
  summary?: string;
  extractedText?: string;
}

export default function AddSourceModal({ isOpen, onClose, onAddSource, projectId }: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>('upload');
  const [stories, setStories] = useState<any[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [researchSessions, setResearchSessions] = useState<any[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState<Set<string>>(new Set());
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');

  useEffect(() => {
    if (activeTab === 'stories' && stories.length === 0) {
      loadStories();
    }
    if (activeTab === 'research' && researchSessions.length === 0) {
      loadResearchSessions();
    }
  }, [activeTab]);

  const loadStories = async () => {
    setIsLoadingStories(true);
    try {
      const response = await fetch('/api/story-intelligence/stories?limit=30');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const loadResearchSessions = async () => {
    setIsLoadingResearch(true);
    try {
      const response = await fetch('/api/research-lab/sessions?limit=50');
      if (response.ok) {
        const data = await response.json();
        // Filter to only completed sessions (report is fetched separately on import)
        const completed = (data.sessions || []).filter((s: any) => 
          s.status === 'completed'
        );
        setResearchSessions(completed);
      }
    } catch (error) {
      console.error('Failed to load research sessions:', error);
    } finally {
      setIsLoadingResearch(false);
    }
  };

  const toggleResearch = (id: string) => {
    const newSelected = new Set(selectedResearch);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResearch(newSelected);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setFileStats(null);
    setAnalysisComplete(false);
    analyzeFile(file);
  };

  const analyzeFile = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setUploadStatus('Reading file...');

    try {
      // Read file
      setUploadProgress(10);
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(25);
      setUploadStatus('Analyzing with AI...');

      // Send to analysis API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const response = await fetch('/api/podcast-studio/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || 'new-project',
          title: file.name.replace(/\.[^/.]+$/, ''),
          type: file.type.includes('pdf') ? 'pdf' : 'document',
          fileData,
          fileName: file.name,
          analysisModel: 'gemini-2-5-flash'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Analysis failed: ${response.status}`);
      }

      const analysis = await response.json();
      setUploadProgress(100);
      setUploadStatus('Analysis complete');

      // Use content or extractedText (they should be the same, content is the alias)
      const fullText = analysis.content || analysis.extractedText || '';
      console.log(`📄 [AddSourceModal] Received extractedText: ${analysis.extractedText?.length || 0} chars`);
      console.log(`📄 [AddSourceModal] Received content: ${analysis.content?.length || 0} chars`);
      console.log(`📄 [AddSourceModal] Using fullText: ${fullText.length} chars`);
      
      setFileStats({
        wordCount: analysis.wordCount || 0,
        pageCount: analysis.pageCount || 0,
        estimatedReadTime: Math.ceil((analysis.wordCount || 0) / 200),
        cached: analysis.cached || false,
        materialId: analysis.materialId,
        summary: analysis.summary,
        extractedText: fullText,
      });

      setAnalysisComplete(true);
      console.log('✅ Analysis complete, setting analysisComplete=true, fileStats:', {
        wordCount: analysis.wordCount,
        pageCount: analysis.pageCount,
        materialId: analysis.materialId,
      });

      toast({
        title: analysis.cached ? 'Loaded from cache' : 'Analysis complete',
        description: `${analysis.wordCount?.toLocaleString()} words, ${analysis.pageCount} pages`,
        status: 'success',
        duration: 3000,
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 4000,
      });
      setFileStats(null);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleAddFile = () => {
    if (!selectedFile || !fileStats) return;

    onAddSource({
      title: title || selectedFile.name,
      type: selectedFile.type.includes('pdf') ? 'pdf' : 'document',
      file: selectedFile,
      description: fileStats.summary,
      // Pass the full extracted text as content for script generation
      content: fileStats.extractedText || fileStats.summary || '',
      wordCount: fileStats.wordCount,
      pageCount: fileStats.pageCount,
      materialId: fileStats.materialId,
      cached: fileStats.cached,
    });

    toast({
      title: 'Source added',
      status: 'success',
      duration: 2000,
    });

    handleClose();
  };

  const handleUrlSubmit = () => {
    if (!url.trim()) return;

    try {
      const urlObj = new URL(url);
      onAddSource({
        title: title || urlObj.hostname,
        type: 'url',
        url: url.trim(),
      });

      toast({
        title: 'URL added',
        status: 'success',
        duration: 2000,
      });

      handleClose();
    } catch (error) {
      toast({
        title: 'Invalid URL',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const handleImportStories = () => {
    const selected = stories.filter(s => selectedStories.has(s.id));
    selected.forEach(story => {
      onAddSource({
        title: story.title,
        type: 'article',
        description: story.summary || story.content?.substring(0, 300),
        url: story.url,
        wordCount: story.content?.split(/\s+/).length || 0,
      });
    });

    toast({
      title: `${selected.length} ${selected.length === 1 ? 'story' : 'stories'} imported`,
      status: 'success',
      duration: 2000,
    });

    handleClose();
  };

  const handleImportResearch = async () => {
    const selected = researchSessions.filter(s => selectedResearch.has(s.id));
    let importedCount = 0;
    
    for (const session of selected) {
      try {
        // Fetch full session data including report
        const sessionId = session.session_id || session.id;
        const response = await fetch(`/api/research-lab/session/${sessionId}/result`);
        if (!response.ok) {
          console.warn(`Failed to fetch session ${sessionId}: ${response.status}`);
          continue;
        }
        
        const fullSession = await response.json();
        const content = fullSession.report || '';
        
        if (!content) {
          console.warn(`No report content for session ${session.id}`);
          continue;
        }
        
        const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
        
        onAddSource({
          title: session.question || 'Deep Research Report',
          type: 'document',
          content: content,
          description: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          wordCount,
          pageCount: Math.max(1, Math.ceil(wordCount / 300)),
          metadata: {
            sourceType: 'deep-research',
            sessionId: session.id || session.session_id,
            createdAt: session.created_at,
          },
        });
        importedCount++;
      } catch (error) {
        console.error(`Failed to import session ${session.id}:`, error);
      }
    }

    toast({
      title: importedCount > 0 
        ? `${importedCount} research ${importedCount === 1 ? 'report' : 'reports'} imported`
        : 'No reports could be imported',
      status: importedCount > 0 ? 'success' : 'warning',
      duration: 2000,
    });

    handleClose();
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim() || !title.trim()) return;

    const wordCount = pastedText.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    onAddSource({
      title: title.trim(),
      type: 'document',
      description: pastedText.substring(0, 300) + (pastedText.length > 300 ? '...' : ''),
      wordCount,
      pageCount: Math.max(1, Math.ceil(wordCount / 300)),
    });

    toast({
      title: 'Text added',
      description: `${wordCount.toLocaleString()} words`,
      status: 'success',
      duration: 2000,
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUrl('');
    setTitle('');
    setPastedText('');
    setSelectedStories(new Set());
    setSelectedResearch(new Set());
    setSearchQuery('');
    setIsProcessing(false);
    setFileStats(null);
    setAnalysisComplete(false);
    onClose();
  };

  const toggleStory = (id: string) => {
    setSelectedStories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredStories = stories.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pasteWordCount = pastedText.trim().split(/\s+/).filter(w => w.length > 0).length;

  const tabs: { id: SourceTab; label: string; icon: typeof FiUpload }[] = [
    { id: 'upload', label: 'Upload', icon: FiUpload },
    { id: 'url', label: 'URL', icon: FiLink },
    { id: 'paste', label: 'Paste', icon: FiFileText },
    { id: 'stories', label: 'Stories', icon: FiZap },
    { id: 'research', label: 'Research', icon: FiSearch },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
      <ModalContent 
        bg={bgColor} 
        borderRadius="xl" 
        overflow="hidden"
        maxW="520px"
        mx={4}
      >
        <ModalHeader pb={2}>
          <HStack spacing={3}>
            <Box p={2} bg="blue.500" borderRadius="lg">
              <Icon as={FiFileText} color="white" boxSize={4} />
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="600">Add Research Source</Text>
              <Text fontSize="xs" color={mutedColor} fontWeight="normal">
                Upload documents for AI-powered analysis
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pt={2} pb={4}>
          {/* Tabs */}
          <HStack spacing={1} p={1} bg={surfaceBase} borderRadius="lg" mb={4}>
            {tabs.map(tab => (
              <Button
                key={tab.id}
                flex={1}
                size="sm"
                fontSize="sm"
                fontWeight="500"
                variant={activeTab === tab.id ? 'solid' : 'ghost'}
                colorScheme={activeTab === tab.id ? (tab.id === 'stories' ? 'purple' : 'blue') : 'gray'}
                onClick={() => setActiveTab(tab.id)}
                leftIcon={<Icon as={tab.icon} boxSize={4} />}
              >
                {tab.label}
              </Button>
            ))}
          </HStack>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <VStack spacing={4} align="stretch">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                display="none"
                accept=".pdf,.doc,.docx,.txt,.mp3,.mp4,.wav"
              />
              
              {/* Drop Zone */}
              <Box
                py={8}
                px={4}
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={isDragOver ? 'blue.400' : selectedFile ? 'green.400' : borderColor}
                borderRadius="xl"
                textAlign="center"
                cursor="pointer"
                bg={isDragOver ? 'blue.50' : selectedFile ? 'green.50' : 'transparent'}
                _dark={{ 
                  bg: isDragOver ? 'blue.900' : selectedFile ? 'green.900' : 'transparent' 
                }}
                _hover={{ borderColor: 'blue.400' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                transition="all 0.2s"
              >
                {selectedFile ? (
                  <VStack spacing={2}>
                    <Icon as={FiCheck} boxSize={6} color="green.500" />
                    <Text fontSize="sm" fontWeight="600">{selectedFile.name}</Text>
                    <Badge colorScheme="green">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                    <Text fontSize="xs" color={mutedColor}>Click to change file</Text>
                  </VStack>
                ) : (
                  <VStack spacing={2}>
                    <Icon as={FiUpload} boxSize={6} color="blue.500" />
                    <Text fontSize="sm" fontWeight="500">Drop file here or click to browse</Text>
                    <Text fontSize="xs" color={mutedColor}>
                      PDF, DOC, DOCX, TXT, MP3, MP4, WAV • Max 50MB
                    </Text>
                  </VStack>
                )}
              </Box>

              {/* Processing Status */}
              {isProcessing && (
                <Box p={4} bg={surfaceBase} borderRadius="lg">
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Spinner size="sm" color="blue.500" />
                      <Text fontSize="sm" fontWeight="500">{uploadStatus}</Text>
                    </HStack>
                    <Badge colorScheme="blue">{uploadProgress}%</Badge>
                  </HStack>
                  <Progress 
                    value={uploadProgress} 
                    size="sm" 
                    colorScheme="blue" 
                    borderRadius="full"
                    hasStripe
                    isAnimated
                  />
                </Box>
              )}

              {/* File Stats */}
              {fileStats && analysisComplete && (
                <Box p={4} bg={surfaceBase} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <HStack justify="space-between" mb={3}>
                    <Text fontSize="sm" fontWeight="600">Document Analysis</Text>
                    {fileStats.cached && (
                      <Badge colorScheme="purple" fontSize="xs">Cached</Badge>
                    )}
                  </HStack>
                  
                  <StatGroup>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color={mutedColor}>
                        <HStack spacing={1}>
                          <Icon as={FiHash} boxSize={3} />
                          <Text>Words</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber fontSize="lg">{fileStats.wordCount.toLocaleString()}</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color={mutedColor}>
                        <HStack spacing={1}>
                          <Icon as={FiFileText} boxSize={3} />
                          <Text>Pages</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber fontSize="lg">{fileStats.pageCount}</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color={mutedColor}>
                        <HStack spacing={1}>
                          <Icon as={FiClock} boxSize={3} />
                          <Text>Read Time</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber fontSize="lg">{fileStats.estimatedReadTime} min</StatNumber>
                    </Stat>
                  </StatGroup>

                  {fileStats.summary && (
                    <>
                      <Divider my={3} />
                      <Text fontSize="xs" color={mutedColor} noOfLines={3}>
                        {fileStats.summary}
                      </Text>
                    </>
                  )}
                </Box>
              )}

              {/* Title Input */}
              {selectedFile && (
                <Input
                  placeholder="Source title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  size="sm"
                  borderRadius="lg"
                />
              )}
            </VStack>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <VStack spacing={4} align="stretch">
              <InputGroup>
                <InputLeftElement>
                  <Icon as={FiLink} color={mutedColor} />
                </InputLeftElement>
                <Input
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  borderRadius="lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
              </InputGroup>
              <Input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="sm"
                borderRadius="lg"
              />
            </VStack>
          )}

          {/* Paste Tab */}
          {activeTab === 'paste' && (
            <VStack spacing={4} align="stretch">
              <Input
                placeholder="Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="sm"
                borderRadius="lg"
              />
              <Box position="relative">
                <textarea
                  placeholder="Paste your text content here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '180px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                {pasteWordCount > 0 && (
                  <Badge 
                    position="absolute" 
                    bottom={2} 
                    right={2} 
                    colorScheme="blue"
                    fontSize="xs"
                  >
                    {pasteWordCount.toLocaleString()} words
                  </Badge>
                )}
              </Box>
            </VStack>
          )}

          {/* Stories Tab */}
          {activeTab === 'stories' && (
            <VStack spacing={3} align="stretch">
              <HStack>
                <InputGroup size="sm" flex={1}>
                  <InputLeftElement>
                    <Icon as={FiSearch} color={mutedColor} boxSize={4} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search stories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    borderRadius="lg"
                  />
                </InputGroup>
                <Tooltip label="Refresh">
                  <IconButton
                    aria-label="Refresh stories"
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                    onClick={loadStories}
                    isLoading={isLoadingStories}
                  />
                </Tooltip>
              </HStack>

              <Box 
                maxH="280px" 
                overflowY="auto" 
                borderWidth="1px" 
                borderColor={borderColor}
                borderRadius="lg"
              >
                {isLoadingStories ? (
                  <Flex justify="center" py={8}>
                    <Spinner size="sm" color="purple.500" />
                  </Flex>
                ) : filteredStories.length === 0 ? (
                  <Text fontSize="sm" color={mutedColor} textAlign="center" py={8}>
                    No stories found
                  </Text>
                ) : (
                  <VStack spacing={0} align="stretch">
                    {filteredStories.map((story, i) => (
                      <HStack
                        key={story.id}
                        px={3}
                        py={2.5}
                        cursor="pointer"
                        bg={selectedStories.has(story.id) ? 'purple.50' : 'transparent'}
                        _dark={{ bg: selectedStories.has(story.id) ? 'purple.900' : 'transparent' }}
                        _hover={{ bg: selectedStories.has(story.id) ? 'purple.100' : surfaceBase }}
                        borderBottomWidth={i < filteredStories.length - 1 ? '1px' : 0}
                        borderColor={borderColor}
                        onClick={() => toggleStory(story.id)}
                        transition="all 0.1s"
                      >
                        <Checkbox 
                          isChecked={selectedStories.has(story.id)}
                          colorScheme="purple"
                          size="sm"
                          pointerEvents="none"
                        />
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="500" noOfLines={1}>
                            {story.title}
                          </Text>
                          <HStack spacing={2}>
                            <Badge colorScheme="purple" fontSize="xs">
                              {story.category || 'News'}
                            </Badge>
                            {story.source && (
                              <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                                {story.source}
                              </Text>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          )}

          {/* Research Tab */}
          {activeTab === 'research' && (
            <VStack spacing={3} align="stretch">
              <HStack>
                <InputGroup size="sm" flex={1}>
                  <InputLeftElement>
                    <Icon as={FiSearch} color={mutedColor} boxSize={4} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search research reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    borderRadius="lg"
                  />
                </InputGroup>
                <Tooltip label="Refresh">
                  <IconButton
                    aria-label="Refresh research"
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                    onClick={loadResearchSessions}
                    isLoading={isLoadingResearch}
                  />
                </Tooltip>
              </HStack>

              <Box 
                maxH="280px" 
                overflowY="auto" 
                borderWidth="1px" 
                borderColor={borderColor}
                borderRadius="lg"
              >
                {isLoadingResearch ? (
                  <Flex justify="center" py={8}>
                    <Spinner size="sm" color="green.500" />
                  </Flex>
                ) : researchSessions.filter(s => 
                    s.question?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 ? (
                  <Text fontSize="sm" color={mutedColor} textAlign="center" py={8}>
                    {researchSessions.length === 0 ? 'No completed research reports' : 'No matching reports found'}
                  </Text>
                ) : (
                  <VStack spacing={0} align="stretch">
                    {researchSessions
                      .filter(s => 
                        s.question?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((session, i, arr) => (
                      <HStack
                        key={session.id}
                        px={3}
                        py={2.5}
                        cursor="pointer"
                        bg={selectedResearch.has(session.id) ? 'green.50' : 'transparent'}
                        _dark={{ bg: selectedResearch.has(session.id) ? 'green.900' : 'transparent' }}
                        _hover={{ bg: selectedResearch.has(session.id) ? 'green.100' : surfaceBase }}
                        borderBottomWidth={i < arr.length - 1 ? '1px' : 0}
                        borderColor={borderColor}
                        onClick={() => toggleResearch(session.id)}
                        transition="all 0.1s"
                      >
                        <Checkbox 
                          isChecked={selectedResearch.has(session.id)}
                          colorScheme="green"
                          size="sm"
                          pointerEvents="none"
                        />
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="500" noOfLines={1}>
                            {session.question || 'Untitled Research'}
                          </Text>
                          <HStack spacing={2}>
                            <Badge colorScheme="green" fontSize="xs">
                              {session.model || 'Deep Research'}
                            </Badge>
                            <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                              {session.created_at ? new Date(session.created_at).toLocaleDateString() : ''}
                            </Text>
                          </HStack>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter bg={surfaceBase} borderTopWidth="1px" borderColor={borderColor}>
          <HStack spacing={3} w="full" justify="flex-end">
            <Button variant="ghost" onClick={handleClose} size="sm">
              Cancel
            </Button>
            
            {activeTab === 'upload' && (
              <Button
                colorScheme="blue"
                onClick={handleAddFile}
                isDisabled={!selectedFile || !analysisComplete}
                isLoading={isProcessing}
                size="sm"
                leftIcon={<Icon as={FiCheck} />}
              >
                Add Source
              </Button>
            )}
            
            {activeTab === 'url' && (
              <Button
                colorScheme="blue"
                onClick={handleUrlSubmit}
                isDisabled={!url.trim()}
                size="sm"
                leftIcon={<Icon as={FiLink} />}
              >
                Add URL
              </Button>
            )}

            {activeTab === 'paste' && (
              <Button
                colorScheme="blue"
                onClick={handlePasteSubmit}
                isDisabled={!pastedText.trim() || !title.trim()}
                size="sm"
                leftIcon={<Icon as={FiFileText} />}
              >
                Add Text
              </Button>
            )}
            
            {activeTab === 'stories' && selectedStories.size > 0 && (
              <Button
                colorScheme="purple"
                onClick={handleImportStories}
                size="sm"
                leftIcon={<Icon as={FiZap} />}
              >
                Import {selectedStories.size} {selectedStories.size === 1 ? 'Story' : 'Stories'}
              </Button>
            )}

            {activeTab === 'research' && selectedResearch.size > 0 && (
              <Button
                colorScheme="green"
                onClick={handleImportResearch}
                size="sm"
                leftIcon={<Icon as={FiSearch} />}
              >
                Import {selectedResearch.size} {selectedResearch.size === 1 ? 'Report' : 'Reports'}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

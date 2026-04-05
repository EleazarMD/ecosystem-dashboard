/**
 * Horizontal 3-Pane Add Source Modal - Modern Design
 * Left: File Upload | Middle: Metadata | Right: AI Settings
 */

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
  Box,
  Grid,
  VStack,
  HStack,
  Text,
  Icon,
  Input,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  Badge,
  Progress,
  useToast,
  Flex,
  Divider,
} from '@chakra-ui/react';
import { FiFileText, FiUpload, FiCheck, FiSettings, FiInfo, FiPackage } from 'react-icons/fi';
import { useModelRegistry } from '../../hooks/useModelRegistry';
import ImportFromResearchLab from './ImportFromResearchLab';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface NewSource {
  title: string;
  type: 'pdf' | 'document' | 'article' | 'book' | 'video' | 'audio' | 'url';
  file?: File;
  url?: string;
  description?: string;
  content?: string; // Full extracted text
  summary?: string; // AI-generated summary
  keyTopics?: string[]; // AI-identified topics
  wordCount?: number;
  pageCount?: number;
  cached?: boolean;
  materialId?: string;
}

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSource: (source: NewSource) => void;
  onReloadMaterials?: () => Promise<void>;
  projectId?: string;
}

export default function AddSourceModalHorizontal({ isOpen, onClose, onAddSource, onReloadMaterials, projectId }: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'research-lab'>('upload');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<NewSource['type']>('pdf');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState<number>(0); // Store file size separately
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [analysisModel, setAnalysisModel] = useState('gemini-2-0-flash'); // Use Gemini 2.0 Flash (faster, more stable)
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedResearchSession, setSelectedResearchSession] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { availableModels, providers } = useModelRegistry();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');
  const accentColor = 'blue.500';
  const mutedColor = useSemanticToken('text.secondary');
  const textColor = useSemanticToken('text.primary');

  // Reset analysis model when modal opens to avoid stale state
  React.useEffect(() => {
    if (isOpen) {
      setAnalysisModel('gemini-2-5-pro');
      console.log('🔄 Modal opened - Reset analysis model to gemini-2-5-pro');
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📁 File selected:', {
        name: file.name,
        size: file.size,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        type: file.type
      });

      // Check file size (100MB limit - Gemini supports up to 2GB)
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 100MB`,
          status: 'warning',
          duration: 5000,
        });
        return;
      }

      setSelectedFile(file);
      setFileSize(file.size); // Store size separately
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log('📎 File dropped:', {
        name: file.name,
        size: file.size,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        type: file.type
      });

      // Check file size (100MB limit - Gemini supports up to 2GB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 100MB`,
          status: 'warning',
          duration: 5000,
        });
        return;
      }

      setSelectedFile(file);
      setFileSize(file.size); // Store size separately
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async () => {
    if (!title) {
      toast({
        title: 'Title required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'Please select a file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing document...');

    try {
      // Stage 1: Reading file
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

      // Stage 2: Sending to AI
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
      console.log(`✅ Analysis API responded after ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

      // Stage 3: AI analyzing
      setUploadStatus('🧠 AI analyzing document content...');
      setUploadProgress(35);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        console.error('❌ Response Status:', response.status, response.statusText);
        console.error('❌ Analysis Model Used:', analysisModel);

        // Try to parse error details for better debugging
        let errorMessage = response.statusText;
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Parsed Error JSON:', errorJson);
          errorMessage = errorJson.details || errorJson.error?.message || errorJson.error || response.statusText;
        } catch {
          errorMessage = errorText || response.statusText;
        }

        throw new Error(`Analysis failed: ${errorMessage}`);
      }

      // Stage 4: Processing results
      setUploadStatus('📊 Processing analysis results...');
      setUploadProgress(75);
      const analysis = await response.json();
      console.log('📥 Received analysis:', analysis);
      setUploadProgress(90);

      // Stage 5: Finalizing
      setUploadStatus('✅ Finalizing...');
      setUploadProgress(95);
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setUploadProgress(100);

      // Success notification
      toast({
        title: analysis.cached ? '⚡ Source loaded from cache' : '✅ Document analyzed successfully',
        description: `"${title}" added to sources panel\n📄 ${analysis.pageCount} pages • ${analysis.wordCount.toLocaleString()} words • ${processingTime}s`,
        status: 'success',
        duration: 6000,
        isClosable: true,
        position: 'top-right',
      });

      // Return analyzed source with full data
      const newSource: NewSource = {
        title,
        type,
        description: analysis.summary || description,
        content: analysis.content, // Full extracted text
        summary: analysis.summary, // AI-generated summary
        keyTopics: analysis.keyTopics, // AI-identified topics
        file: selectedFile,
        wordCount: analysis.wordCount,
        pageCount: analysis.pageCount,
        cached: analysis.cached,
        materialId: analysis.materialId
      };

      onAddSource(newSource);
      handleClose();
    } catch (error) {
      console.error('❌ Upload error:', error);

      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'There was an error analyzing your file',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 1000);
    }
  };

  const handleClose = () => {
    setActiveTab('upload');
    setTitle('');
    setType('pdf');
    setDescription('');
    setSelectedFile(null);
    setFileSize(0);
    setUploadProgress(0);
    setUploadStatus('');
    setIsUploading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="6xl">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(12px)" />
      <ModalContent bg={bgColor} borderRadius="2xl" boxShadow="dark-lg" maxH="90vh">
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor} pb={4}>
          <Flex align="center" gap={3}>
            <Box p={2} bg={accentColor} borderRadius="xl">
              <Icon as={FiFileText} fontSize="24px" color={useSemanticToken('text.inverse')} />
            </Box>
            <Box>
              <Text fontSize="2xl" fontWeight="700">Add Research Source</Text>
              <Text fontSize="sm" fontWeight="400" color={mutedColor}>
                Upload documents for AI-powered analysis
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton size="lg" />

        <ModalBody p={6}>
          <Grid templateColumns="1fr 1fr 1fr" gap={6} h="full">
            {/* LEFT PANE: Import Options */}
            <Box>
              {/* Tab Selector */}
              <HStack mb={4} spacing={0} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={1}>
                <Button
                  flex={1}
                  size="sm"
                  variant={activeTab === 'upload' ? 'solid' : 'ghost'}
                  colorScheme={activeTab === 'upload' ? 'blue' : 'gray'}
                  leftIcon={<Icon as={FiUpload} />}
                  onClick={() => setActiveTab('upload')}
                >
                  Upload
                </Button>
                <Button
                  flex={1}
                  size="sm"
                  variant={activeTab === 'research-lab' ? 'solid' : 'ghost'}
                  colorScheme={activeTab === 'research-lab' ? 'purple' : 'gray'}
                  leftIcon={<Icon as={FiPackage} />}
                  onClick={() => setActiveTab('research-lab')}
                >
                  AI Research
                </Button>
              </HStack>

              {activeTab === 'upload' && (
                <>

                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    display="none"
                    accept=".pdf,.doc,.docx,.txt"
                  />

                  <Box
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    cursor="pointer"
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderColor={isDragOver ? accentColor : borderColor}
                    borderRadius="2xl"
                    p={8}
                    textAlign="center"
                    transition="all 0.2s"
                    bg={isDragOver ? cardBg : bgColor}
                    _hover={{ borderColor: accentColor, bg: cardBg }}
                    h="400px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {selectedFile ? (
                      <VStack spacing={3}>
                        <Icon as={FiCheck} boxSize={12} color="green.500" />
                        <Text fontSize="md" fontWeight="600">{selectedFile.name}</Text>
                        <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                          {(fileSize / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                        <Text fontSize="sm" color={mutedColor}>Click to change file</Text>
                      </VStack>
                    ) : (
                      <VStack spacing={4}>
                        <Box p={5} borderRadius="full" bg={bgColor} shadow="md">
                          <Icon as={FiUpload} boxSize={12} color={accentColor} />
                        </Box>
                        <Text fontSize="lg" fontWeight="600">Drop file here</Text>
                        <Text fontSize="sm" color={mutedColor}>or click to browse</Text>
                        <Divider />
                        <VStack spacing={2}>
                          <Text fontSize="xs" color={mutedColor}>Supported formats:</Text>
                          <Text fontSize="xs" fontWeight="500">PDF, DOC, DOCX, TXT</Text>
                          <Badge colorScheme="blue" fontSize="xs">Max: 100 MB</Badge>
                        </VStack>
                      </VStack>
                    )}
                  </Box>
                </>
              )}

              {activeTab === 'research-lab' && (
                /* Research Lab Sessions Import */
                <Box h="400px" overflowY="auto">
                  <ImportFromResearchLab
                    projectId={projectId || 'temp-import'}
                    onSessionSelect={(sessions) => {
                      // Update selected session for contextual display
                      setSelectedResearchSession(sessions[0] || null);
                    }}
                    onCancel={handleClose}
                    onImportComplete={async () => {
                      // Reload materials from database using parent's reload function
                      if (onReloadMaterials) {
                        await onReloadMaterials();
                      }

                      handleClose();
                      toast({
                        title: '✅ Imported from Research Lab',
                        description: 'Documents added to Sources panel',
                        status: 'success',
                        duration: 3000,
                      });
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* MIDDLE PANE: Conditional based on tab */}
            <Box>
              {activeTab === 'upload' ? (
                <>
                  <HStack mb={4} spacing={2}>
                    <Icon as={FiInfo} color={accentColor} />
                    <Text fontSize="md" fontWeight="600">Document Info</Text>
                  </HStack>

                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel fontSize="sm" fontWeight="600">Title</FormLabel>
                      <Input
                        size="lg"
                        placeholder="Enter document title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        borderRadius="lg"
                      />
                    </FormControl>

                    <FormControl>
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
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="600">Description (Optional)</FormLabel>
                      <Textarea
                        placeholder="Brief description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        borderRadius="lg"
                      />
                    </FormControl>
                  </VStack>
                </>
              ) : (
                /* AI Research Session Details */
                <>
                  <HStack mb={3} spacing={2}>
                    <Icon as={FiPackage} color="purple.500" boxSize={4} />
                    <Text fontSize="xs" fontWeight="700" color={mutedColor} letterSpacing="wide">SESSION DETAILS</Text>
                  </HStack>

                  {selectedResearchSession ? (
                    <VStack spacing={2} align="stretch">
                      <Box p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                        <Text fontSize="2xs" fontWeight="600" color={mutedColor} mb={1.5} textTransform="uppercase" letterSpacing="wide">Question</Text>
                        <Text fontSize="sm" fontWeight="600" lineHeight="1.4" noOfLines={3}>{selectedResearchSession.question}</Text>
                      </Box>

                      <HStack spacing={2}>
                        <Box flex={1} p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                          <Text fontSize="2xs" fontWeight="600" color={mutedColor} mb={1.5} textTransform="uppercase" letterSpacing="wide">Model</Text>
                          <Badge colorScheme="purple" fontSize="2xs" px={2} py={1}>{selectedResearchSession.model.replace('deep-research', 'DR')}</Badge>
                        </Box>

                        <Box flex={1} p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                          <Text fontSize="2xs" fontWeight="600" color={mutedColor} mb={1.5} textTransform="uppercase" letterSpacing="wide">Status</Text>
                          <Badge colorScheme="green" fontSize="2xs" px={2} py={1}>{selectedResearchSession.status}</Badge>
                        </Box>
                      </HStack>

                      {selectedResearchSession.completed_at && (
                        <Box p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                          <Text fontSize="2xs" fontWeight="600" color={mutedColor} mb={1.5} textTransform="uppercase" letterSpacing="wide">Completed</Text>
                          <Text fontSize="xs" fontWeight="500">{new Date(selectedResearchSession.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </Box>
                      )}

                      {selectedResearchSession.actual_cost != null && (
                        <Box p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                          <Text fontSize="2xs" fontWeight="600" color={mutedColor} mb={1.5} textTransform="uppercase" letterSpacing="wide">Cost</Text>
                          <Text fontSize="sm" fontWeight="700" color="purple.600">${Number(selectedResearchSession.actual_cost).toFixed(2)}</Text>
                        </Box>
                      )}
                    </VStack>
                  ) : (
                    <Box p={8} bg={cardBg} borderRadius="lg" textAlign="center" borderWidth="1px" borderColor={borderColor} borderStyle="dashed">
                      <Icon as={FiPackage} boxSize={10} color={mutedColor} mb={2} />
                      <Text color={mutedColor} fontSize="xs">Select a session to view details</Text>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* RIGHT PANE: Conditional based on tab */}
            <Box>
              {activeTab === 'upload' ? (
                <>
                  <HStack mb={4} spacing={2}>
                    <Icon as={FiSettings} color={accentColor} />
                    <Text fontSize="md" fontWeight="600">AI Analysis</Text>
                  </HStack>

                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="600">
                        <HStack>
                          <Text>Analysis Model</Text>
                        </HStack>
                      </FormLabel>
                      <Select
                        value={analysisModel}
                        onChange={(e) => setAnalysisModel(e.target.value)}
                        size="lg"
                        borderRadius="lg"
                      >
                        <optgroup label="🚀 OpenAI">
                          <option value="gpt-4o-mini">⚡ GPT-4o Mini (Recommended)</option>
                          <option value="gpt-4o">🎯 GPT-4o</option>
                        </optgroup>
                        <optgroup label="🔒 Google Gemini">
                          <option value="gemini-2-5-flash">⚡ Gemini 2.5 Flash</option>
                          <option value="gemini-2-5-pro">🎯 Gemini 2.5 Pro</option>
                          <option value="gemini-2-0-flash">⚡ Gemini 2.0 Flash</option>
                          <option value="gemini-1-5-pro">🎯 Gemini 1.5 Pro</option>
                          <option value="gemini-1-5-flash">⚡ Gemini 1.5 Flash</option>
                        </optgroup>
                      </Select>
                      <Text fontSize="xs" color={mutedColor} mt={2}>
                        💡 Gemini 2.5 Flash: Best for PDF analysis
                      </Text>
                    </FormControl>

                    <Box p={4} bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                      <Text fontSize="sm" fontWeight="600" mb={2}>Analysis Features</Text>
                      <VStack align="stretch" spacing={2} fontSize="xs" color={mutedColor}>
                        <HStack><Text>✓</Text><Text>Text extraction</Text></HStack>
                        <HStack><Text>✓</Text><Text>Summary generation</Text></HStack>
                        <HStack><Text>✓</Text><Text>Key topics identification</Text></HStack>
                        <HStack><Text>✓</Text><Text>Word & page count</Text></HStack>
                        <HStack><Text>✓</Text><Text>Caching for faster reuse</Text></HStack>
                      </VStack>
                    </Box>
                  </VStack>
                </>
              ) : (
                /* AI Research Session Preview */
                <>
                  <HStack mb={3} spacing={2}>
                    <Icon as={FiFileText} color="purple.500" boxSize={4} />
                    <Text fontSize="xs" fontWeight="700" color={mutedColor} letterSpacing="wide">REPORT PREVIEW</Text>
                  </HStack>

                  {selectedResearchSession?.report ? (
                    <Box
                      p={3}
                      bg={cardBg}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={borderColor}
                      h="400px"
                      overflowY="auto"
                      fontSize="xs"
                      lineHeight="1.6"
                      css={{
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#CBD5E0',
                          borderRadius: '3px',
                        },
                      }}
                    >
                      <Text
                        whiteSpace="pre-wrap"
                        wordBreak="break-word"
                        color={textColor}
                      >
                        {selectedResearchSession.report.substring(0, 2000)}{selectedResearchSession.report.length > 2000 ? '...' : ''}
                      </Text>
                      {selectedResearchSession.report.length > 2000 && (
                        <Box mt={3} pt={3} borderTopWidth="1px" borderColor={borderColor}>
                          <Text color={mutedColor} fontSize="2xs" fontStyle="italic" textAlign="center">
                            Preview limited to first 2,000 characters • Full report will be imported
                          </Text>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box
                      p={8}
                      bg={cardBg}
                      borderRadius="lg"
                      textAlign="center"
                      h="400px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexDirection="column"
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderStyle="dashed"
                    >
                      <Icon as={FiFileText} boxSize={10} color={mutedColor} mb={2} />
                      <Text color={mutedColor} fontSize="xs">Select a session to preview report</Text>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </ModalBody>

        {/* Conditional Footer based on tab */}
        {activeTab === 'upload' && (
          <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
            <Button
              variant="ghost"
              onClick={handleClose}
              isDisabled={isUploading}
              size="lg"
              mr={3}
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
              isDisabled={!selectedFile || !title}
            >
              Add Source
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

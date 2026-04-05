/**
 * Workspace Analysis Page - Email Attachment Analysis with AI
 * 
 * Features:
 * - Import emails with attachments for analysis
 * - Claude Code CLI integration for chart/document analysis
 * - Generate summaries, statistics, insights, recommendations
 * - Create working documents with agentic capabilities
 * 
 * @module pages/workspace-analysis
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Flex,
  useToast,
  Button,
  IconButton,
  Badge,
  Divider,
  Textarea,
  Spinner,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  Progress,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  DocumentIcon,
  PhotoIcon,
  ChartBarIcon,
  TableCellsIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

// Attachment type definitions
interface Attachment {
  filename: string;
  content_type: string;
  size: number;
  source_path?: string;
  is_inline?: boolean;
  data?: string; // Base64 encoded
  analysis?: AttachmentAnalysis;
}

interface AttachmentAnalysis {
  description?: string;
  extracted_text?: string;
  insights?: string[];
  recommendations?: string[];
  statistics?: Record<string, any>;
  chart_summary?: string;
}

interface EmailWithAttachments {
  id: string;
  subject: string;
  from_addr: string;
  from_name?: string;
  date: string;
  attachments: Attachment[];
  body_preview?: string;
}

interface AnalysisDocument {
  id: string;
  title: string;
  created_at: string;
  emails: EmailWithAttachments[];
  summary?: string;
  insights?: string[];
  recommendations?: string[];
  topics?: string[];
  status: 'pending' | 'analyzing' | 'complete' | 'error';
}

const WorkspaceAnalysisPage: React.FC = () => {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // State
  const [documents, setDocuments] = useState<AnalysisDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<AnalysisDocument | null>(null);
  const [emailsWithAttachments, setEmailsWithAttachments] = useState<EmailWithAttachments[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  
  // Fetch emails with attachments
  const fetchEmailsWithAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${GRAPHRAG_URL}/emails/recent?folder=inbox&limit=100`);
      const data = await response.json();
      
      // Filter emails that have attachments
      const withAttachments = (data.emails || []).filter(
        (email: any) => email.has_attachment || (email.attachments && email.attachments.length > 0)
      );
      
      setEmailsWithAttachments(withAttachments.map((email: any) => ({
        id: email.id,
        subject: email.subject || '(No Subject)',
        from_addr: email.from_email || email.from_addr?.email || 'unknown',
        from_name: email.from_name || email.from_addr?.name,
        date: email.date,
        attachments: email.attachments || [],
        body_preview: email.body_preview || email.summary,
      })));
      
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch emails with attachments',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchEmailsWithAttachments();
  }, [fetchEmailsWithAttachments]);
  
  // Retrieve attachment content
  const retrieveAttachment = async (email: EmailWithAttachments, attachment: Attachment) => {
    try {
      const response = await fetch(`${GRAPHRAG_URL}/attachments/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emlx_path: attachment.source_path,
          filename: attachment.filename,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedAttachment({ ...attachment, data: data.data });
        onPreviewOpen();
      } else {
        throw new Error('Failed to retrieve attachment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retrieve attachment content',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Create new analysis document
  const createAnalysisDocument = (selectedEmails: EmailWithAttachments[]) => {
    const newDoc: AnalysisDocument = {
      id: `doc-${Date.now()}`,
      title: `Analysis: ${selectedEmails[0]?.subject || 'New Document'}`,
      created_at: new Date().toISOString(),
      emails: selectedEmails,
      status: 'pending',
    };
    
    setDocuments([newDoc, ...documents]);
    setSelectedDoc(newDoc);
    
    return newDoc;
  };
  
  // Analyze document with Claude Code CLI
  const analyzeWithClaudeCode = async (doc: AnalysisDocument) => {
    setAnalyzing(true);
    
    try {
      // Update status
      setDocuments(docs => docs.map(d => 
        d.id === doc.id ? { ...d, status: 'analyzing' as const } : d
      ));
      
      // Collect all attachment analyses
      const allInsights: string[] = [];
      const allRecommendations: string[] = [];
      const allTopics: string[] = [];
      let summaryParts: string[] = [];
      
      // Analyze each attachment
      for (const email of doc.emails) {
        for (const att of email.attachments) {
          try {
            // First retrieve the attachment content
            const retrieveResponse = await fetch(`${GRAPHRAG_URL}/attachments/retrieve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                emlx_path: att.source_path,
                filename: att.filename,
              }),
            });
            
            if (!retrieveResponse.ok) continue;
            
            const attachmentData = await retrieveResponse.json();
            
            // Analyze with Claude
            const analyzeResponse = await fetch(`${GRAPHRAG_URL}/analyze/attachment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: att.filename,
                content_type: att.content_type,
                data: attachmentData.data,
                context: `From email "${email.subject}" by ${email.from_name || email.from_addr}`,
              }),
            });
            
            if (analyzeResponse.ok) {
              const result = await analyzeResponse.json();
              const analysis = result.analysis || {};
              
              if (analysis.description) {
                summaryParts.push(`${att.filename}: ${analysis.description}`);
              }
              if (analysis.insights) {
                allInsights.push(...analysis.insights);
              }
              if (analysis.recommendations) {
                allRecommendations.push(...analysis.recommendations);
              }
              
              // Store analysis on attachment
              att.analysis = analysis;
            }
          } catch (error) {
            console.error(`Error analyzing ${att.filename}:`, error);
          }
        }
      }
      
      // Build combined analysis
      const analysis: Partial<AnalysisDocument> = {
        summary: summaryParts.length > 0 
          ? summaryParts.join('\n\n')
          : `Analysis of ${doc.emails.length} email(s) with ${doc.emails.reduce((sum, e) => sum + e.attachments.length, 0)} attachment(s).`,
        insights: allInsights.length > 0 ? allInsights : [
          'Analysis complete - review individual attachments for details',
        ],
        recommendations: allRecommendations.length > 0 ? allRecommendations : [
          'Consider reviewing attachments for additional context',
        ],
        topics: allTopics.length > 0 ? allTopics : ['Email Attachments'],
        status: 'complete' as const,
      };
      
      setDocuments(docs => docs.map(d => 
        d.id === doc.id ? { ...d, ...analysis } : d
      ));
      
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc({ ...doc, ...analysis });
      }
      
      toast({
        title: 'Analysis Complete',
        description: 'Document analyzed successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error) {
      setDocuments(docs => docs.map(d => 
        d.id === doc.id ? { ...d, status: 'error' as const } : d
      ));
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze document',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Get file icon based on content type
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return PhotoIcon;
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return TableCellsIcon;
    if (contentType.includes('pdf')) return DocumentTextIcon;
    if (contentType.includes('chart')) return ChartBarIcon;
    return DocumentIcon;
  };
  
  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout>
      <Container maxW="container.2xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center">
            <Box>
              <Heading size="lg" display="flex" alignItems="center" gap={2}>
                <BeakerIcon className="h-8 w-8" />
                Workspace Analysis
              </Heading>
              <Text color="gray.500" mt={1}>
                Analyze email attachments with AI-powered insights
              </Text>
            </Box>
            <HStack spacing={3}>
              <Button
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={fetchEmailsWithAttachments}
                isLoading={loading}
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>
          </Flex>

          {/* Main Content */}
          <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
            {/* Left Panel - Emails with Attachments */}
            <Box w={{ base: '100%', lg: '400px' }} flexShrink={0}>
              <GlassPanel>
                <VStack align="stretch" spacing={4} p={4}>
                  <Heading size="sm" display="flex" alignItems="center" gap={2}>
                    <PaperClipIcon className="h-5 w-5" />
                    Emails with Attachments
                    <Badge colorScheme="blue" ml="auto">
                      {emailsWithAttachments.length}
                    </Badge>
                  </Heading>
                  
                  <Box maxH="500px" overflowY="auto">
                    <VStack spacing={2} align="stretch">
                      {emailsWithAttachments.map((email) => (
                        <Card
                          key={email.id}
                          size="sm"
                          cursor="pointer"
                          _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                          onClick={() => {
                            const doc = createAnalysisDocument([email]);
                            toast({
                              title: 'Document Created',
                              description: 'Email added to workspace for analysis',
                              status: 'info',
                              duration: 2000,
                            });
                          }}
                        >
                          <CardBody py={2} px={3}>
                            <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                              {email.subject}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {email.from_name || email.from_addr}
                            </Text>
                            <HStack mt={1} spacing={1} flexWrap="wrap">
                              {email.attachments.slice(0, 3).map((att, idx) => (
                                <Badge
                                  key={idx}
                                  size="sm"
                                  colorScheme={
                                    att.content_type.startsWith('image/') ? 'purple' :
                                    att.content_type.includes('pdf') ? 'red' :
                                    att.content_type.includes('excel') ? 'green' : 'gray'
                                  }
                                  fontSize="10px"
                                >
                                  {att.filename.slice(0, 20)}
                                  {att.filename.length > 20 ? '...' : ''}
                                </Badge>
                              ))}
                              {email.attachments.length > 3 && (
                                <Badge colorScheme="gray" fontSize="10px">
                                  +{email.attachments.length - 3} more
                                </Badge>
                              )}
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                      
                      {emailsWithAttachments.length === 0 && !loading && (
                        <Text color="gray.500" textAlign="center" py={8}>
                          No emails with attachments found
                        </Text>
                      )}
                      
                      {loading && (
                        <Flex justify="center" py={8}>
                          <Spinner />
                        </Flex>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              </GlassPanel>
            </Box>

            {/* Right Panel - Analysis Workspace */}
            <Box flex={1}>
              <GlassPanel h="100%">
                {selectedDoc ? (
                  <VStack align="stretch" spacing={4} p={4}>
                    {/* Document Header */}
                    <Flex justify="space-between" align="start">
                      <Box>
                        <Heading size="md">{selectedDoc.title}</Heading>
                        <Text fontSize="sm" color="gray.500">
                          Created: {new Date(selectedDoc.created_at).toLocaleString()}
                        </Text>
                      </Box>
                      <HStack>
                        <Badge
                          colorScheme={
                            selectedDoc.status === 'complete' ? 'green' :
                            selectedDoc.status === 'analyzing' ? 'blue' :
                            selectedDoc.status === 'error' ? 'red' : 'gray'
                          }
                        >
                          {selectedDoc.status}
                        </Badge>
                        <Button
                          leftIcon={<SparklesIcon className="h-4 w-4" />}
                          colorScheme="purple"
                          size="sm"
                          onClick={() => analyzeWithClaudeCode(selectedDoc)}
                          isLoading={analyzing}
                          isDisabled={selectedDoc.status === 'analyzing'}
                        >
                          Analyze with Claude
                        </Button>
                      </HStack>
                    </Flex>

                    <Divider />

                    {/* Attachments Grid */}
                    <Box>
                      <Heading size="sm" mb={3}>Attachments</Heading>
                      <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
                        {selectedDoc.emails.flatMap(email => 
                          email.attachments.map((att, idx) => {
                            const FileIcon = getFileIcon(att.content_type);
                            return (
                              <Card
                                key={`${email.id}-${idx}`}
                                size="sm"
                                cursor="pointer"
                                _hover={{ shadow: 'md' }}
                                onClick={() => retrieveAttachment(email, att)}
                              >
                                <CardBody textAlign="center" py={3}>
                                  <Box as={FileIcon} className="h-8 w-8 mx-auto text-gray-400" />
                                  <Text fontSize="xs" fontWeight="medium" mt={2} noOfLines={2}>
                                    {att.filename}
                                  </Text>
                                  <Text fontSize="10px" color="gray.500">
                                    {formatSize(att.size)}
                                  </Text>
                                </CardBody>
                              </Card>
                            );
                          })
                        )}
                      </SimpleGrid>
                    </Box>

                    {/* Analysis Results */}
                    {selectedDoc.status === 'complete' && (
                      <Tabs variant="enclosed" colorScheme="purple">
                        <TabList>
                          <Tab>Summary</Tab>
                          <Tab>Insights</Tab>
                          <Tab>Recommendations</Tab>
                        </TabList>
                        <TabPanels>
                          <TabPanel>
                            <Text>{selectedDoc.summary}</Text>
                            {selectedDoc.topics && (
                              <HStack mt={3} flexWrap="wrap">
                                {selectedDoc.topics.map((topic, idx) => (
                                  <Badge key={idx} colorScheme="purple">{topic}</Badge>
                                ))}
                              </HStack>
                            )}
                          </TabPanel>
                          <TabPanel>
                            <List spacing={2}>
                              {selectedDoc.insights?.map((insight, idx) => (
                                <ListItem key={idx} display="flex" alignItems="start">
                                  <ListIcon as={LightBulbIcon} color="yellow.500" mt={1} />
                                  <Text>{insight}</Text>
                                </ListItem>
                              ))}
                            </List>
                          </TabPanel>
                          <TabPanel>
                            <List spacing={2}>
                              {selectedDoc.recommendations?.map((rec, idx) => (
                                <ListItem key={idx} display="flex" alignItems="start">
                                  <ListIcon as={CheckCircleIcon} color="green.500" mt={1} />
                                  <Text>{rec}</Text>
                                </ListItem>
                              ))}
                            </List>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    )}

                    {/* Analyzing Progress */}
                    {selectedDoc.status === 'analyzing' && (
                      <Box textAlign="center" py={8}>
                        <Spinner size="xl" color="purple.500" />
                        <Text mt={4}>Analyzing with Claude Code CLI...</Text>
                        <Progress
                          size="xs"
                          isIndeterminate
                          colorScheme="purple"
                          mt={4}
                        />
                      </Box>
                    )}
                  </VStack>
                ) : (
                  <Flex h="100%" align="center" justify="center" direction="column" p={8}>
                    <Box as={DocumentIcon} className="h-16 w-16 text-gray-300" mb={4} />
                    <Text color="gray.500" textAlign="center">
                      Select an email with attachments to create an analysis document
                    </Text>
                  </Flex>
                )}
              </GlassPanel>
            </Box>
          </Flex>

          {/* Documents History */}
          {documents.length > 0 && (
            <GlassPanel>
              <VStack align="stretch" spacing={4} p={4}>
                <Heading size="sm">Analysis Documents</Heading>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {documents.map((doc) => (
                    <Card
                      key={doc.id}
                      cursor="pointer"
                      onClick={() => setSelectedDoc(doc)}
                      borderWidth={selectedDoc?.id === doc.id ? 2 : 1}
                      borderColor={selectedDoc?.id === doc.id ? 'purple.500' : borderColor}
                    >
                      <CardBody>
                        <Flex justify="space-between" align="start">
                          <Box>
                            <Text fontWeight="medium" noOfLines={1}>{doc.title}</Text>
                            <Text fontSize="sm" color="gray.500">
                              {doc.emails.length} email(s), {doc.emails.reduce((sum, e) => sum + e.attachments.length, 0)} attachment(s)
                            </Text>
                          </Box>
                          <Badge
                            colorScheme={
                              doc.status === 'complete' ? 'green' :
                              doc.status === 'analyzing' ? 'blue' :
                              doc.status === 'error' ? 'red' : 'gray'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </VStack>
            </GlassPanel>
          )}
        </VStack>
      </Container>

      {/* Attachment Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedAttachment?.filename}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAttachment?.data && selectedAttachment.content_type.startsWith('image/') ? (
              <Image
                src={`data:${selectedAttachment.content_type};base64,${selectedAttachment.data}`}
                alt={selectedAttachment.filename}
                maxH="500px"
                mx="auto"
              />
            ) : (
              <Box textAlign="center" py={8}>
                <Box as={DocumentIcon} className="h-16 w-16 text-gray-300 mx-auto" mb={4} />
                <Text>
                  {selectedAttachment?.content_type}
                </Text>
                <Text color="gray.500" fontSize="sm">
                  {selectedAttachment && formatSize(selectedAttachment.size)}
                </Text>
                <Button
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  mt={4}
                  colorScheme="blue"
                  onClick={() => {
                    if (selectedAttachment?.data) {
                      const link = document.createElement('a');
                      link.href = `data:${selectedAttachment.content_type};base64,${selectedAttachment.data}`;
                      link.download = selectedAttachment.filename;
                      link.click();
                    }
                  }}
                >
                  Download
                </Button>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onPreviewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

export default WorkspaceAnalysisPage;

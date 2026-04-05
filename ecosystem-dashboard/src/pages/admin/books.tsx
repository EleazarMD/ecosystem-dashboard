/**
 * Children's Books Admin Page
 * 
 * Upload and manage books for children's library
 * Supports CBZ (comics), PDF, and EPUB formats
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  IconButton,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Select,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiBook,
  FiUpload,
  FiTrash2,
  FiUser,
  FiCheckCircle,
  FiAlertTriangle,
  FiFolder,
  FiFileText,
  FiImage,
  FiZap,
  FiCheckSquare,
  FiSquare,
} from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface ChildOption {
  id: string;
  name: string;
}

interface Book {
  id: string;
  filename: string;
  original_filename: string;
  title: string;
  series_name: string | null;
  series_volume: number | null;
  author: string | null;
  file_type: string;
  file_size: number;
  is_processed: boolean;
  processing_status: string;
  graphrag_indexed: boolean;
  security_scan_passed: boolean;
  assigned_child_name: string | null;
  created_at: string;
}

export default function BooksAdminPage() {
  const toast = useToast();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [booksBySeries, setBooksBySeries] = useState<Record<string, Book[]>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [scanResult, setScanResult] = useState<{ passed: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form fields
  const [bookTitle, setBookTitle] = useState('');
  const [bookSeries, setBookSeries] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  
  // Delete modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  
  // Bulk assignment
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [bulkChildId, setBulkChildId] = useState<string>('');

  useEffect(() => {
    fetchChildren();
    fetchBooks();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/admin/children');
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    }
  };

  const fetchBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch('/api/admin/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
        setBooksBySeries(data.booksBySeries || {});
      }
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[Books Admin] Starting upload:', file.name, file.size, file.type);
    setUploading(true);
    setUploadProgress(0);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', bookTitle || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('series', bookSeries);
      formData.append('author', bookAuthor);
      if (selectedChild) {
        formData.append('childId', selectedChild);
      }

      console.log('[Books Admin] FormData prepared, sending to API...');

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const res = await fetch('/api/admin/upload-book', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[Books Admin] Response status:', res.status);

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      console.log('[Books Admin] Response data:', data);

      if (res.ok) {
        setScanResult({ passed: true, message: data.securityScan?.message || 'File passed security scan' });
        toast({ 
          title: 'Book uploaded successfully', 
          description: `"${data.book.title}" is ready for processing`,
          status: 'success',
          duration: 5000,
        });
        fetchBooks();
        // Reset form
        setBookTitle('');
        setBookSeries('');
        setBookAuthor('');
      } else {
        setScanResult({ passed: false, message: data.message || data.error });
        toast({ 
          title: data.error || 'Upload failed', 
          description: data.message,
          status: 'error',
          duration: 10000,
        });
      }
    } catch (error) {
      toast({ title: 'Failed to upload book', status: 'error' });
      setScanResult({ passed: false, message: 'Network error during upload' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      const res = await fetch('/api/admin/books', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: bookToDelete.id }),
      });

      if (res.ok) {
        toast({ title: 'Book deleted', status: 'success' });
        fetchBooks();
      } else {
        toast({ title: 'Failed to delete book', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to delete book', status: 'error' });
    } finally {
      onDeleteClose();
      setBookToDelete(null);
    }
  };

  const handleProcessBook = async (bookId: string) => {
    try {
      const res = await fetch(`/api/admin/books/${bookId}/process`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        toast({ 
          title: '🧠 Processing Started', 
          description: 'Extracting characters, themes & vocabulary...',
          status: 'info',
          duration: 5000,
        });
        fetchBooks(); // Refresh to show processing status
      } else {
        toast({ 
          title: 'Processing failed', 
          description: data.message || data.error,
          status: 'error' 
        });
      }
    } catch (error) {
      toast({ title: 'Failed to start processing', status: 'error' });
    }
  };

  const handleAssignBook = async (bookId: string, childId: string | null) => {
    try {
      const res = await fetch('/api/admin/books/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, childId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ 
          title: 'Assignment updated', 
          description: data.message,
          status: 'success',
          duration: 3000,
        });
        fetchBooks(); // Refresh to show updated assignment
      } else {
        toast({ 
          title: 'Assignment failed', 
          description: data.error || data.message,
          status: 'error' 
        });
      }
    } catch (error) {
      toast({ title: 'Failed to update assignment', status: 'error' });
    }
  };

  const handleBulkAssign = async () => {
    if (selectedBooks.size === 0) {
      toast({ title: 'No books selected', status: 'warning' });
      return;
    }

    try {
      const res = await fetch('/api/admin/books/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookIds: Array.from(selectedBooks), 
          childId: bulkChildId || null 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ 
          title: 'Bulk assignment complete', 
          description: data.message,
          status: 'success',
          duration: 3000,
        });
        setSelectedBooks(new Set());
        setBulkChildId('');
        onBulkClose();
        fetchBooks();
      } else {
        toast({ 
          title: 'Bulk assignment failed', 
          description: data.error || data.message,
          status: 'error' 
        });
      }
    } catch (error) {
      toast({ title: 'Failed to bulk assign', status: 'error' });
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'cbz':
      case 'cbr':
        return FiImage;
      case 'pdf':
        return FiFileText;
      default:
        return FiBook;
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Children's Books</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Header */}
          <HStack spacing={4}>
            <Icon as={FiBook} boxSize={8} color="pink.500" />
            <Box>
              <Heading size="lg">Children's Book Library</Heading>
              <Text color="gray.600">Upload and manage books for Sofia's reading adventures</Text>
            </Box>
          </HStack>

          {/* Upload Section */}
          <GlassPanel p={6}>
            <VStack align="stretch" spacing={6}>
              <Heading size="md">📚 Upload New Book</Heading>
              <Text fontSize="sm" color="gray.600">
                Upload CBZ (comic books), PDF, or EPUB files. Files are scanned for security before being added to the library.
              </Text>

              {/* Book metadata form */}
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl>
                  <FormLabel>Book Title</FormLabel>
                  <Input 
                    placeholder="e.g., Mallory and the Trouble with Twins"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Series Name</FormLabel>
                  <Input 
                    placeholder="e.g., The Baby-Sitters Club"
                    value={bookSeries}
                    onChange={(e) => setBookSeries(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Author</FormLabel>
                  <Input 
                    placeholder="e.g., Ann M. Martin"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <HStack spacing={4} flexWrap="wrap">
                <FormControl maxW="250px">
                  <FormLabel>Assign to Child (Optional)</FormLabel>
                  <Select 
                    value={selectedChild} 
                    onChange={(e) => setSelectedChild(e.target.value)}
                    placeholder="All children"
                    icon={<FiUser />}
                  >
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl maxW="300px">
                  <FormLabel>Select Book File</FormLabel>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".cbz,.cbr,.pdf,.epub"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    leftIcon={<FiUpload />}
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={uploading}
                    loadingText="Uploading & Scanning..."
                    colorScheme="pink"
                    size="lg"
                  >
                    Upload Book (.cbz, .pdf, .epub)
                  </Button>
                </FormControl>
              </HStack>

              {/* Upload progress */}
              {uploading && (
                <Box>
                  <Text fontSize="sm" mb={2}>Uploading and scanning for security...</Text>
                  <Progress value={uploadProgress} colorScheme="pink" borderRadius="full" />
                </Box>
              )}

              {/* Scan result */}
              {scanResult && (
                <Alert status={scanResult.passed ? 'success' : 'error'} borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>{scanResult.passed ? 'Security Scan Passed' : 'Security Scan Failed'}</AlertTitle>
                    <AlertDescription>{scanResult.message}</AlertDescription>
                  </Box>
                </Alert>
              )}
            </VStack>
          </GlassPanel>

          {/* Books Library */}
          <GlassPanel p={6}>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" flexWrap="wrap">
                <Heading size="md">📖 Library ({books.length} books)</Heading>
                <HStack>
                  {selectedBooks.size > 0 && (
                    <Button 
                      size="sm" 
                      colorScheme="purple" 
                      onClick={onBulkOpen}
                      leftIcon={<FiUser />}
                    >
                      Assign {selectedBooks.size} book{selectedBooks.size > 1 ? 's' : ''}
                    </Button>
                  )}
                  <Button size="sm" onClick={fetchBooks} isLoading={loadingBooks}>
                    Refresh
                  </Button>
                </HStack>
              </HStack>

              {loadingBooks ? (
                <Box textAlign="center" py={8}>
                  <Spinner size="lg" color="pink.500" />
                  <Text mt={2} color="gray.500">Loading books...</Text>
                </Box>
              ) : books.length === 0 ? (
                <Box 
                  p={8} 
                  textAlign="center" 
                  bg="gray.50" 
                  borderRadius="lg"
                  border="2px dashed"
                  borderColor="gray.300"
                >
                  <Icon as={FiBook} boxSize={12} color="gray.400" mb={4} />
                  <Text color="gray.500" fontWeight="medium">
                    No books in the library yet.
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Upload a book to get started!
                  </Text>
                </Box>
              ) : (
                <Accordion allowMultiple defaultIndex={[0]}>
                  {/* Books by Series */}
                  {Object.entries(booksBySeries).map(([seriesName, seriesBooks]) => (
                    <AccordionItem key={seriesName}>
                      <AccordionButton>
                        <HStack flex={1}>
                          <Icon as={FiFolder} color="pink.500" />
                          <Text fontWeight="medium">{seriesName}</Text>
                          <Badge colorScheme="pink">{seriesBooks.length} books</Badge>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel>
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                          {seriesBooks.map((book) => (
                            <BookCard 
                              key={book.id} 
                              book={book} 
                              onDelete={() => {
                                setBookToDelete(book);
                                onDeleteOpen();
                              }}
                              onProcess={() => handleProcessBook(book.id)}
                              onAssign={(childId) => handleAssignBook(book.id, childId)}
                              formatFileSize={formatFileSize}
                              getFileTypeIcon={getFileTypeIcon}
                              children={children}
                              isSelected={selectedBooks.has(book.id)}
                              onToggleSelect={() => toggleBookSelection(book.id)}
                            />
                          ))}
                        </SimpleGrid>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}

                  {/* Standalone books */}
                  {books.filter(b => !b.series_name).length > 0 && (
                    <AccordionItem>
                      <AccordionButton>
                        <HStack flex={1}>
                          <Icon as={FiBook} color="gray.500" />
                          <Text fontWeight="medium">Standalone Books</Text>
                          <Badge>{books.filter(b => !b.series_name).length}</Badge>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel>
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                          {books.filter(b => !b.series_name).map((book) => (
                            <BookCard 
                              key={book.id} 
                              book={book} 
                              onDelete={() => {
                                setBookToDelete(book);
                                onDeleteOpen();
                              }}
                              onProcess={() => handleProcessBook(book.id)}
                              onAssign={(childId) => handleAssignBook(book.id, childId)}
                              formatFileSize={formatFileSize}
                              getFileTypeIcon={getFileTypeIcon}
                              children={children}
                              isSelected={selectedBooks.has(book.id)}
                              onToggleSelect={() => toggleBookSelection(book.id)}
                            />
                          ))}
                        </SimpleGrid>
                      </AccordionPanel>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </VStack>
          </GlassPanel>
        </VStack>
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Book</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete "{bookToDelete?.title}"? This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onDeleteClose}>Cancel</Button>
            <Button colorScheme="red" onClick={handleDeleteBook}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Assignment Modal */}
      <Modal isOpen={isBulkOpen} onClose={onBulkClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Assign {selectedBooks.size} Books</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Assign the selected books to a specific child or make them available to all children.
              </Text>
              <FormControl>
                <FormLabel>Assign to:</FormLabel>
                <Select 
                  value={bulkChildId} 
                  onChange={(e) => setBulkChildId(e.target.value)}
                  placeholder="All children"
                  icon={<FiUser />}
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onBulkClose}>Cancel</Button>
            <Button colorScheme="purple" onClick={handleBulkAssign}>
              Assign Books
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

interface BookCardProps {
  book: Book;
  onDelete: () => void;
  onProcess: () => void;
  onAssign: (childId: string | null) => void;
  formatFileSize: (bytes: number) => string;
  getFileTypeIcon: (type: string) => any;
  children: ChildOption[];
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function BookCard({ book, onDelete, onProcess, onAssign, formatFileSize, getFileTypeIcon, children, isSelected, onToggleSelect }: BookCardProps) {
  const isProcessing = book.processing_status === 'processing';
  const isProcessed = book.is_processed || book.graphrag_indexed;
  const [isAssigning, setIsAssigning] = React.useState(false);
  
  const handleAssignChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const childId = e.target.value || null;
    setIsAssigning(true);
    try {
      await onAssign(childId);
    } finally {
      setIsAssigning(false);
    }
  };
  
  return (
    <Box
      p={4}
      borderRadius="lg"
      border="2px solid"
      borderColor={isSelected ? 'purple.400' : 'gray.200'}
      bg={isSelected ? 'purple.50' : 'white'}
      _hover={{ borderColor: isSelected ? 'purple.500' : 'pink.300', shadow: 'md' }}
      transition="all 0.2s"
      position="relative"
    >
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <Box position="absolute" top={2} left={2}>
          <IconButton
            aria-label="Select book"
            icon={<Icon as={isSelected ? FiCheckSquare : FiSquare} />}
            size="sm"
            variant="ghost"
            colorScheme={isSelected ? 'purple' : 'gray'}
            onClick={onToggleSelect}
          />
        </Box>
      )}

      <HStack justify="space-between" mb={2}>
        <HStack>
          <Icon as={getFileTypeIcon(book.file_type)} color="pink.500" />
          <Badge colorScheme="purple" fontSize="xs">{book.file_type.toUpperCase()}</Badge>
        </HStack>
        <HStack spacing={1}>
          {!isProcessed && !isProcessing && (
            <IconButton
              aria-label="Process book for GraphRAG"
              icon={<FiZap />}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              onClick={onProcess}
              title="Extract characters, themes & vocabulary"
            />
          )}
          <IconButton
            aria-label="Delete book"
            icon={<FiTrash2 />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={onDelete}
          />
        </HStack>
      </HStack>
      
      <Text fontWeight="medium" noOfLines={2} mb={1}>
        {book.title}
      </Text>
      
      {book.author && (
        <Text fontSize="sm" color="gray.600" mb={2}>
          by {book.author}
        </Text>
      )}
      
      <HStack spacing={2} flexWrap="wrap" mb={2}>
        <Badge colorScheme="gray" fontSize="xs">
          {formatFileSize(book.file_size)}
        </Badge>
        {book.security_scan_passed && (
          <Badge colorScheme="green" fontSize="xs">
            <HStack spacing={1}>
              <Icon as={FiCheckCircle} />
              <Text>Verified</Text>
            </HStack>
          </Badge>
        )}
        {isProcessing && (
          <Badge colorScheme="orange" fontSize="xs">
            <HStack spacing={1}>
              <Spinner size="xs" />
              <Text>Processing...</Text>
            </HStack>
          </Badge>
        )}
        {isProcessed && (
          <Badge colorScheme="blue" fontSize="xs">
            <HStack spacing={1}>
              <Icon as={FiZap} />
              <Text>GraphRAG Ready</Text>
            </HStack>
          </Badge>
        )}
      </HStack>
      
      {/* Assignment Selector */}
      <FormControl size="sm" mt={2}>
        <FormLabel fontSize="xs" mb={1}>Assign to:</FormLabel>
        <Select 
          size="sm"
          value={book.assigned_child_name ? children.find(c => c.name === book.assigned_child_name)?.id || '' : ''}
          onChange={handleAssignChange}
          isDisabled={isAssigning}
          icon={<FiUser />}
          fontSize="xs"
        >
          <option value="">All children</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

export { familyAdminRouteGuard as getServerSideProps } from '@/lib/auth/admin-route-guard';

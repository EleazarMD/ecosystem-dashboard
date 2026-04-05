/**
 * Family Books Section
 * 
 * Browse and assign books to children from the family hub.
 * Parents can view available books and assign them to specific children.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Button,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Icon,
  Avatar,
  useToast,
  Spinner,
  Card,
  CardBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Checkbox,
  CheckboxGroup,
  Stack,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiBook,
  FiSearch,
  FiFilter,
  FiUser,
  FiCheckCircle,
  FiClock,
  FiStar,
  FiShoppingCart,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Book {
  id: string;
  title: string;
  author?: string;
  series_name?: string;
  series_volume?: number;
  file_type: string;
  page_count?: number;
  cover_image_path?: string;
  min_age_recommendation?: number;
  is_processed: boolean;
  graphrag_indexed: boolean;
  assigned_children?: string[]; // IDs of children who have access
}

interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
}

interface FamilyBooksSectionProps {
  children: Child[];
}

export default function FamilyBooksSection({ children }: FamilyBooksSectionProps) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Failed to fetch books:', error);
      toast({ title: 'Failed to load books', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBook = (book: Book) => {
    setSelectedBook(book);
    setSelectedChildren([]);
    onOpen();
  };

  const handleConfirmAssignment = async () => {
    if (!selectedBook || selectedChildren.length === 0) {
      toast({ title: 'Please select at least one child', status: 'warning' });
      return;
    }

    setAssigning(true);
    try {
      // Assign book to each selected child
      const promises = selectedChildren.map(childId =>
        fetch('/api/admin/books/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: selectedBook.id, childId }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        toast({
          title: 'Books assigned!',
          description: `"${selectedBook.title}" is now available to ${selectedChildren.length} child${selectedChildren.length > 1 ? 'ren' : ''}`,
          status: 'success',
          duration: 5000,
        });
        onClose();
        fetchBooks();
      } else {
        toast({ title: 'Some assignments failed', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to assign book', status: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.series_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap">
          <VStack align="start" spacing={1}>
            <HStack>
              <Icon as={FiBook} boxSize={6} color="purple.500" />
              <Text fontSize="2xl" fontWeight="bold">Family Book Library</Text>
            </HStack>
            <Text color="gray.600">
              Browse and assign books to your children
            </Text>
          </VStack>
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            {books.length} books available
          </Badge>
        </HStack>

        {/* Search & Filters */}
        <GlassPanel p={4}>
          <HStack spacing={4}>
            <InputGroup flex={1}>
              <InputLeftElement>
                <Icon as={FiSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search books by title, author, or series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Button leftIcon={<FiFilter />} variant="outline">
              Filters
            </Button>
          </HStack>
        </GlassPanel>

        {/* Books Grid */}
        {loading ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" color="purple.500" />
            <Text mt={4} color="gray.500">Loading books...</Text>
          </Box>
        ) : filteredBooks.length === 0 ? (
          <GlassPanel p={12} textAlign="center">
            <Icon as={FiBook} boxSize={16} color="gray.300" mb={4} />
            <Text fontSize="lg" fontWeight="medium" color="gray.500">
              {searchQuery ? 'No books match your search' : 'No books available yet'}
            </Text>
            <Text color="gray.400" mt={2}>
              {searchQuery ? 'Try a different search term' : 'Upload books from the admin panel to get started'}
            </Text>
          </GlassPanel>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={4}>
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                children={children}
                onAssign={() => handleAssignBook(book)}
              />
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* Assignment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiShoppingCart} color="purple.500" />
              <Text>Assign Book to Children</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {selectedBook && (
                <Box p={4} bg="purple.50" borderRadius="md">
                  <Text fontWeight="bold" fontSize="lg">{selectedBook.title}</Text>
                  {selectedBook.author && (
                    <Text color="gray.600">by {selectedBook.author}</Text>
                  )}
                  {selectedBook.min_age_recommendation && (
                    <Badge colorScheme="purple" mt={2}>
                      Ages {selectedBook.min_age_recommendation}+
                    </Badge>
                  )}
                </Box>
              )}

              <Divider />

              <Box>
                <Text fontWeight="medium" mb={3}>Select children:</Text>
                <CheckboxGroup
                  value={selectedChildren}
                  onChange={(values) => setSelectedChildren(values as string[])}
                >
                  <Stack spacing={3}>
                    {children.map((child) => {
                      const age = calculateAge(child.dateOfBirth);
                      const ageAppropriate = !selectedBook?.min_age_recommendation || 
                        age >= selectedBook.min_age_recommendation;
                      
                      return (
                        <Tooltip
                          key={child.id}
                          label={!ageAppropriate ? `Recommended for ages ${selectedBook?.min_age_recommendation}+` : ''}
                          isDisabled={ageAppropriate}
                        >
                          <Checkbox value={child.id} isDisabled={!ageAppropriate}>
                            <HStack>
                              <Avatar size="sm" name={child.name} />
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="medium">{child.name}</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {age} years old
                                  {!ageAppropriate && ' (too young)'}
                                </Text>
                              </VStack>
                            </HStack>
                          </Checkbox>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </CheckboxGroup>
              </Box>

              {children.length === 0 && (
                <Text color="gray.500" textAlign="center" py={4}>
                  No children in your family yet. Add a child account first.
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="purple"
              onClick={handleConfirmAssignment}
              isLoading={assigning}
              isDisabled={selectedChildren.length === 0}
              leftIcon={<FiCheckCircle />}
            >
              Assign to {selectedChildren.length} Child{selectedChildren.length !== 1 ? 'ren' : ''}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

interface BookCardProps {
  book: Book;
  children: Child[];
  onAssign: () => void;
}

function BookCard({ book, children, onAssign }: BookCardProps) {
  return (
    <Card
      variant="outline"
      _hover={{ shadow: 'lg', borderColor: 'purple.300' }}
      transition="all 0.2s"
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          {/* Book Cover Placeholder */}
          <Box
            h="200px"
            bg="purple.100"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={FiBook} boxSize={16} color="purple.400" />
          </Box>

          {/* Book Info */}
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="bold" noOfLines={2} minH="40px">
              {book.title}
            </Text>
            {book.author && (
              <Text fontSize="sm" color="gray.600" noOfLines={1}>
                by {book.author}
              </Text>
            )}
            {book.series_name && (
              <Badge colorScheme="blue" fontSize="xs">
                {book.series_name} #{book.series_volume}
              </Badge>
            )}
          </VStack>

          {/* Metadata */}
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="gray" fontSize="xs">
              {book.file_type.toUpperCase()}
            </Badge>
            {book.page_count && (
              <Badge colorScheme="gray" fontSize="xs">
                {book.page_count} pages
              </Badge>
            )}
            {book.graphrag_indexed && (
              <Tooltip label="AI-enhanced with characters, themes & vocabulary">
                <Badge colorScheme="purple" fontSize="xs">
                  <HStack spacing={1}>
                    <Icon as={FiStar} />
                    <Text>Enhanced</Text>
                  </HStack>
                </Badge>
              </Tooltip>
            )}
          </HStack>

          {/* Age Recommendation */}
          {book.min_age_recommendation && (
            <Badge colorScheme="orange" fontSize="xs">
              Ages {book.min_age_recommendation}+
            </Badge>
          )}

          {/* Assign Button */}
          <Button
            colorScheme="purple"
            size="sm"
            leftIcon={<FiUser />}
            onClick={onAssign}
            isDisabled={children.length === 0}
          >
            Assign to Child
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
}

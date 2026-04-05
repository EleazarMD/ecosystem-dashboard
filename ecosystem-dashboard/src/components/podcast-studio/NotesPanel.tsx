import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Button,
  Input,
  Textarea,
  Editable,
  EditableInput,
  EditablePreview,
} from '@chakra-ui/react';
import { FiFileText, FiPlus, FiX, FiEdit, FiSave } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  category: 'synthesis' | 'outline' | 'script-idea';
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Key Medical Terminology',
      content: 'Focus on explaining procedures in layman terms first, then technical details',
      timestamp: new Date('2025-11-22T12:00:00'),
      category: 'synthesis',
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  const createNote = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setNotes(prev => [
      {
        id: Date.now().toString(),
        title: newTitle,
        content: newContent,
        timestamp: new Date(),
        category: 'synthesis',
      },
      ...prev,
    ]);
    setNewTitle('');
    setNewContent('');
    setIsCreating(false);
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const getCategoryColor = (category: Note['category']) => {
    switch (category) {
      case 'synthesis': return 'blue';
      case 'outline': return 'purple';
      case 'script-idea': return 'green';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <HStack spacing={2}>
          <FiFileText color="blue" />
          <Text 
            fontSize="14px" 
            fontWeight="500" 
            color={textColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            Notes
          </Text>
        </HStack>
        <Badge colorScheme="blue" fontSize="11px">
          {notes.length} notes
        </Badge>
      </HStack>

      {/* Create Note */}
      {!isCreating ? (
        <Box px={4} pb={4}>
          <Button
            leftIcon={<FiPlus />}
            size="md"
            variant="ghost"
            borderRadius="xl"
            border="2px dashed"
            borderColor={borderColor}
            color={textColor}
            onClick={() => setIsCreating(true)}
            fontSize="13px"
            fontWeight="500"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            py={6}
            w="full"
            transition="all 0.2s ease"
            _hover={{ 
              bg: surfaceHover,
              borderColor: 'blue.500',
              color: 'blue.500',
              transform: 'scale(1.02)',
            }}
          >
            New Note
          </Button>
        </Box>
      ) : (
        <Box px={4} pb={4}>
          <Box
            p={4}
            bg={cardBg}
            border="2px solid"
            borderColor="blue.500"
            borderRadius="2xl"
            boxShadow="lg"
            position="relative"
            overflow="hidden"
          >
            <VStack spacing={3} position="relative" zIndex={1}>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title..."
                size="sm"
                fontSize="14px"
                fontWeight="600"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                borderRadius="xl"
                bg={useSemanticToken('surface.elevated')}
                border="none"
                _focus={{ 
                  boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.3)',
                }}
              />
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your synthesized content..."
                size="sm"
                rows={5}
                fontSize="13px"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                borderRadius="xl"
                bg={useSemanticToken('surface.elevated')}
                border="none"
                _focus={{ 
                  boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.3)',
                }}
              />
              <HStack w="full" spacing={2}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  flex={1}
                  onClick={createNote}
                  borderRadius="xl"
                  fontWeight="600"
                  leftIcon={<FiSave />}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTitle('');
                    setNewContent('');
                  }}
                  borderRadius="xl"
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Notes List */}
      <VStack spacing={3} px={4} pb={4}>
        {notes.map((note) => (
          <Box
            key={note.id}
            p={4}
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            border="1px solid"
            borderColor={borderColor}
            w="full"
            transition="all 0.2s ease"
            _hover={{ boxShadow: 'lg', transform: 'translateY(-1px)' }}
          >
            <HStack justify="space-between" mb={2}>
              <Badge 
                fontSize="10px" 
                px={2.5} 
                py={0.5} 
                borderRadius="full" 
                colorScheme={getCategoryColor(note.category)}
                fontWeight="600"
              >
                {note.category}
              </Badge>
              <IconButton
                aria-label="Delete note"
                icon={<FiX />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={() => deleteNote(note.id)}
              />
            </HStack>
            
            <Text 
              fontSize="14px" 
              fontWeight="600" 
              color={textColor}
              mb={2}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              {note.title}
            </Text>
            
            <Text 
              fontSize="13px" 
              color={mutedColor}
              mb={3}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              {note.content}
            </Text>
            
            <HStack justify="space-between">
              <Text 
                fontSize="11px" 
                color={mutedColor}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                {note.timestamp.toLocaleString()}
              </Text>
              <Button size="xs" variant="ghost" leftIcon={<FiEdit />}>
                Edit
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Info */}
      <Box
        mx={4}
        mb={4}
        p={4}
        bg={cardBg}
        borderRadius="xl"
        borderLeft="4px solid"
        borderLeftColor="blue.400"
      >
        <Text 
          fontSize="12px" 
          color={textColor}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          fontWeight="500"
        >
          📝 Create notes from synthesized information. These can be exported as new source materials.
        </Text>
      </Box>
    </VStack>
  );
}

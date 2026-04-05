/**
 * WorkspaceNotes - Notes view within the Workspace
 * 
 * Displays notes list with filtering, action items panel, and note management.
 * Rendered as a view inside the main workspace page (like NotionHome and WorkspaceAI).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Textarea,
  Checkbox,
  Divider,
  Flex,
  Spacer,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Spinner,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiCheckSquare,
  FiSquare,
  FiCalendar,
  FiUser,
  FiTag,
  FiFileText,
  FiTrash2,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  due_date?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  note_type: 'meeting' | 'quick' | 'project' | 'journal' | 'reference';
  tags: string[];
  action_items: ActionItem[];
  meeting_date?: string;
  attendees?: string[];
  created_at: string;
  updated_at: string;
}

const NOTE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  meeting: { icon: '📋', color: 'blue', label: 'Meeting' },
  quick: { icon: '📝', color: 'gray', label: 'Quick Note' },
  project: { icon: '📁', color: 'purple', label: 'Project' },
  journal: { icon: '📔', color: 'orange', label: 'Journal' },
  reference: { icon: '📚', color: 'green', label: 'Reference' },
};

interface WorkspaceNotesProps {
  workspaceId?: string;
  userId?: string;
  onNoteClick?: (noteId: string) => void;
}

export function WorkspaceNotes({ workspaceId, userId = 'eleazar', onNoteClick }: WorkspaceNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, pendingActions: 0 });

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const toast = useToast();

  // Theme tokens
  const surfaceElevated = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');
  const borderDefault = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');

  // New note form state
  const [newNote, setNewNote] = useState<{
    title: string;
    content: string;
    note_type: 'meeting' | 'quick' | 'project' | 'journal' | 'reference';
    tags: string[];
    tagInput: string;
    action_items: { text: string; completed: boolean }[];
    actionInput: string;
    meeting_date: string;
    attendees: string;
  }>({
    title: '',
    content: '',
    note_type: 'quick',
    tags: [],
    tagInput: '',
    action_items: [],
    actionInput: '',
    meeting_date: '',
    attendees: '',
  });

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterType) params.set('note_type', filterType);
      if (filterTag) params.set('tag', filterTag);
      params.set('limit', '50');

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setNotes(data.notes || []);
        setStats({
          total: data.pagination?.total || 0,
          pendingActions: (data.notes || []).reduce(
            (acc: number, n: Note) => acc + n.action_items.filter(a => !a.completed).length,
            0
          ),
        });

        // Collect all unique tags
        const tags = new Set<string>();
        (data.notes || []).forEach((n: Note) => n.tags?.forEach(t => tags.add(t)));
        setAllTags(Array.from(tags).sort());
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType, filterTag]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      toast({ title: 'Title is required', status: 'warning', duration: 2000 });
      return;
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNote.title,
          content: newNote.content,
          note_type: newNote.note_type,
          tags: newNote.tags,
          action_items: newNote.action_items,
          meeting_date: newNote.meeting_date || undefined,
          attendees: newNote.attendees ? newNote.attendees.split(',').map(a => a.trim()) : undefined,
        }),
      });

      if (res.ok) {
        toast({ title: 'Note created', status: 'success', duration: 2000 });
        onCreateClose();
        setNewNote({
          title: '',
          content: '',
          note_type: 'quick',
          tags: [],
          tagInput: '',
          action_items: [],
          actionInput: '',
          meeting_date: '',
          attendees: '',
        });
        fetchNotes();
      } else {
        const err = await res.json();
        toast({ title: err.error || 'Failed to create note', status: 'error', duration: 3000 });
      }
    } catch (error) {
      toast({ title: 'Error creating note', status: 'error', duration: 3000 });
    }
  };

  const handleToggleActionItem = async (noteId: string, actionItemId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/action-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_item_id: actionItemId, completed }),
      });

      if (res.ok) {
        fetchNotes();
        if (selectedNote?.id === noteId) {
          const updatedNote = { ...selectedNote };
          updatedNote.action_items = updatedNote.action_items.map(a =>
            a.id === actionItemId ? { ...a, completed } : a
          );
          setSelectedNote(updatedNote);
        }
      }
    } catch (error) {
      toast({ title: 'Error updating action item', status: 'error', duration: 2000 });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Archive this note?')) return;

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Note archived', status: 'success', duration: 2000 });
        fetchNotes();
        if (selectedNote?.id === noteId) {
          onDetailClose();
          setSelectedNote(null);
        }
      }
    } catch (error) {
      toast({ title: 'Error archiving note', status: 'error', duration: 2000 });
    }
  };

  const openNoteDetail = (note: Note) => {
    setSelectedNote(note);
    onDetailOpen();
  };

  const addTagToNewNote = () => {
    if (newNote.tagInput.trim() && !newNote.tags.includes(newNote.tagInput.trim())) {
      setNewNote({
        ...newNote,
        tags: [...newNote.tags, newNote.tagInput.trim()],
        tagInput: '',
      });
    }
  };

  const addActionToNewNote = () => {
    if (newNote.actionInput.trim()) {
      setNewNote({
        ...newNote,
        action_items: [...newNote.action_items, { text: newNote.actionInput.trim(), completed: false }],
        actionInput: '',
      });
    }
  };

  // Get all pending action items across notes
  const pendingActionItems = notes.flatMap(note =>
    note.action_items
      .filter(a => !a.completed)
      .map(a => ({ ...a, noteId: note.id, noteTitle: note.title }))
  );

  return (
    <Box px={8} py={6} maxW="1400px" mx="auto">
      {/* Header */}
      <HStack mb={6} justify="space-between">
        <VStack align="start" spacing={1}>
          <Heading size="lg">📝 Notes</Heading>
          <Text color={textSecondary}>
            {stats.total} notes • {stats.pendingActions} pending action items
          </Text>
        </VStack>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onCreateOpen}>
          New Note
        </Button>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: '1fr 320px' }} gap={6}>
        {/* Notes List */}
        <GridItem>
          {/* Filters */}
          <HStack spacing={4} mb={4} wrap="wrap">
            <InputGroup maxW="280px" size="sm">
              <InputLeftElement>
                <FiSearch color="gray" />
              </InputLeftElement>
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                bg={surfaceElevated}
              />
            </InputGroup>
            <Select
              placeholder="All types"
              maxW="140px"
              size="sm"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              bg={surfaceElevated}
            >
              {Object.entries(NOTE_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.icon} {cfg.label}
                </option>
              ))}
            </Select>
            {allTags.length > 0 && (
              <Select
                placeholder="All tags"
                maxW="140px"
                size="sm"
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
                bg={surfaceElevated}
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </Select>
            )}
          </HStack>

          {/* Notes Grid */}
          {loading ? (
            <Flex justify="center" py={12}>
              <Spinner size="lg" />
            </Flex>
          ) : notes.length === 0 ? (
            <Flex direction="column" align="center" py={12} color={textSecondary}>
              <FiFileText size={48} />
              <Text mt={4}>No notes found</Text>
              <Button mt={4} size="sm" onClick={onCreateOpen}>
                Create your first note
              </Button>
            </Flex>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {notes.map(note => {
                const cfg = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.quick;
                const pendingCount = note.action_items.filter(a => !a.completed).length;

                return (
                  <Box
                    key={note.id}
                    p={4}
                    bg={surfaceElevated}
                    borderWidth="1px"
                    borderColor={borderDefault}
                    borderRadius="lg"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
                    onClick={() => openNoteDetail(note)}
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <Text fontSize="xl">{cfg.icon}</Text>
                        <Text fontWeight="semibold" noOfLines={1}>
                          {note.title}
                        </Text>
                      </HStack>
                      <HStack spacing={2}>
                        {pendingCount > 0 && (
                          <Badge colorScheme="orange" size="sm">
                            {pendingCount}
                          </Badge>
                        )}
                        <Badge colorScheme={cfg.color} size="sm">{cfg.label}</Badge>
                      </HStack>
                    </HStack>
                    {note.content && (
                      <Text fontSize="sm" color={textSecondary} noOfLines={2} mb={2}>
                        {note.content}
                      </Text>
                    )}
                    <HStack spacing={2} fontSize="xs" color={textSecondary}>
                      {note.meeting_date && (
                        <HStack spacing={1}>
                          <FiCalendar size={12} />
                          <Text>{new Date(note.meeting_date).toLocaleDateString()}</Text>
                        </HStack>
                      )}
                      {note.tags?.length > 0 && (
                        <HStack spacing={1}>
                          <FiTag size={12} />
                          <Text>{note.tags.slice(0, 2).join(', ')}</Text>
                        </HStack>
                      )}
                      <Spacer />
                      <Text>{new Date(note.updated_at).toLocaleDateString()}</Text>
                    </HStack>
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
        </GridItem>

        {/* Action Items Panel */}
        <GridItem>
          <Box
            position="sticky"
            top={4}
            p={4}
            bg={surfaceElevated}
            borderWidth="1px"
            borderColor={borderDefault}
            borderRadius="lg"
          >
            <HStack mb={4}>
              <FiCheckSquare />
              <Heading size="sm">Pending Actions</Heading>
              {pendingActionItems.length > 0 && (
                <Badge colorScheme="orange">{pendingActionItems.length}</Badge>
              )}
            </HStack>

            {pendingActionItems.length === 0 ? (
              <Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>
                No pending action items ✨
              </Text>
            ) : (
              <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                {pendingActionItems.slice(0, 10).map(item => (
                  <Box
                    key={`${item.noteId}-${item.id}`}
                    p={3}
                    borderWidth="1px"
                    borderColor={borderDefault}
                    borderRadius="md"
                    fontSize="sm"
                  >
                    <HStack align="start">
                      <Checkbox
                        mt={0.5}
                        isChecked={item.completed}
                        onChange={e =>
                          handleToggleActionItem(item.noteId, item.id, e.target.checked)
                        }
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text>{item.text}</Text>
                        <Text
                          fontSize="xs"
                          color={textSecondary}
                          cursor="pointer"
                          _hover={{ textDecoration: 'underline' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const note = notes.find(n => n.id === item.noteId);
                            if (note) openNoteDetail(note);
                          }}
                        >
                          {item.noteTitle}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </GridItem>
      </Grid>

      {/* Create Note Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Note</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={newNote.title}
                  onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Note title"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={newNote.note_type}
                  onChange={e => setNewNote({ ...newNote, note_type: e.target.value as any })}
                >
                  {Object.entries(NOTE_TYPE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Content</FormLabel>
                <Textarea
                  value={newNote.content}
                  onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Note content..."
                  rows={4}
                />
              </FormControl>

              {newNote.note_type === 'meeting' && (
                <>
                  <FormControl>
                    <FormLabel>Meeting Date</FormLabel>
                    <Input
                      type="date"
                      value={newNote.meeting_date}
                      onChange={e => setNewNote({ ...newNote, meeting_date: e.target.value })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Attendees</FormLabel>
                    <Input
                      value={newNote.attendees}
                      onChange={e => setNewNote({ ...newNote, attendees: e.target.value })}
                      placeholder="Comma-separated names"
                    />
                  </FormControl>
                </>
              )}

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <HStack>
                  <Input
                    value={newNote.tagInput}
                    onChange={e => setNewNote({ ...newNote, tagInput: e.target.value })}
                    placeholder="Add tag"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTagToNewNote())}
                  />
                  <IconButton aria-label="Add tag" icon={<FiPlus />} onClick={addTagToNewNote} />
                </HStack>
                {newNote.tags.length > 0 && (
                  <Wrap mt={2}>
                    {newNote.tags.map(tag => (
                      <WrapItem key={tag}>
                        <Tag>
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton
                            onClick={() =>
                              setNewNote({ ...newNote, tags: newNote.tags.filter(t => t !== tag) })
                            }
                          />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Action Items</FormLabel>
                <HStack>
                  <Input
                    value={newNote.actionInput}
                    onChange={e => setNewNote({ ...newNote, actionInput: e.target.value })}
                    placeholder="Add action item"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addActionToNewNote())}
                  />
                  <IconButton aria-label="Add action" icon={<FiPlus />} onClick={addActionToNewNote} />
                </HStack>
                {newNote.action_items.length > 0 && (
                  <VStack mt={2} align="stretch" spacing={1}>
                    {newNote.action_items.map((item, idx) => (
                      <HStack key={idx} fontSize="sm">
                        <FiSquare />
                        <Text flex={1}>{item.text}</Text>
                        <IconButton
                          aria-label="Remove"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            setNewNote({
                              ...newNote,
                              action_items: newNote.action_items.filter((_, i) => i !== idx),
                            })
                          }
                        />
                      </HStack>
                    ))}
                  </VStack>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateNote}>
              Create Note
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Note Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          {selectedNote && (
            <>
              <ModalHeader>
                <HStack>
                  <Text fontSize="2xl">
                    {NOTE_TYPE_CONFIG[selectedNote.note_type]?.icon || '📝'}
                  </Text>
                  <Text>{selectedNote.title}</Text>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack align="stretch" spacing={4}>
                  <HStack wrap="wrap" spacing={2}>
                    <Badge colorScheme={NOTE_TYPE_CONFIG[selectedNote.note_type]?.color}>
                      {NOTE_TYPE_CONFIG[selectedNote.note_type]?.label}
                    </Badge>
                    {selectedNote.meeting_date && (
                      <Badge variant="outline">
                        <HStack spacing={1}>
                          <FiCalendar />
                          <Text>{new Date(selectedNote.meeting_date).toLocaleDateString()}</Text>
                        </HStack>
                      </Badge>
                    )}
                    {selectedNote.tags?.map(tag => (
                      <Tag key={tag} size="sm">#{tag}</Tag>
                    ))}
                  </HStack>

                  {selectedNote.attendees?.length > 0 && (
                    <HStack fontSize="sm" color={textSecondary}>
                      <FiUser />
                      <Text>Attendees: {selectedNote.attendees.join(', ')}</Text>
                    </HStack>
                  )}

                  {selectedNote.content && (
                    <Box p={4} bg={surfaceHover} borderRadius="md" whiteSpace="pre-wrap">
                      {selectedNote.content}
                    </Box>
                  )}

                  {selectedNote.action_items?.length > 0 && (
                    <Box>
                      <Heading size="sm" mb={3}>
                        Action Items ({selectedNote.action_items.filter(a => !a.completed).length} pending)
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        {selectedNote.action_items.map(item => (
                          <HStack key={item.id} p={2} borderWidth="1px" borderRadius="md">
                            <Checkbox
                              isChecked={item.completed}
                              onChange={e =>
                                handleToggleActionItem(selectedNote.id, item.id, e.target.checked)
                              }
                            />
                            <Text
                              flex={1}
                              textDecoration={item.completed ? 'line-through' : 'none'}
                              color={item.completed ? textSecondary : 'inherit'}
                            >
                              {item.text}
                            </Text>
                            {item.assignee && <Badge size="sm">@{item.assignee}</Badge>}
                            {item.due_date && (
                              <Badge size="sm" colorScheme="orange">
                                {new Date(item.due_date).toLocaleDateString()}
                              </Badge>
                            )}
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  <Divider />

                  <HStack fontSize="xs" color={textSecondary} justify="space-between">
                    <Text>Created: {new Date(selectedNote.created_at).toLocaleString()}</Text>
                    <Text>Updated: {new Date(selectedNote.updated_at).toLocaleString()}</Text>
                  </HStack>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="ghost"
                  colorScheme="red"
                  leftIcon={<FiTrash2 />}
                  onClick={() => handleDeleteNote(selectedNote.id)}
                >
                  Archive
                </Button>
                <Spacer />
                <Button onClick={onDetailClose}>Close</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
}

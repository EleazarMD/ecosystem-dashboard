/**
 * Children's Planner Page
 * 
 * Kid-friendly planner with:
 * - Activities & Events tracking
 * - Homework planning & due dates
 * - Notes & reminders
 * - AI Study Buddy assistant
 * - Theme-aware design
 * - Notion-inspired workspace integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  SimpleGrid,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Progress,
  Checkbox,
  Divider,
  Collapse,
  Spinner,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiCalendar,
  FiBook,
  FiFileText,
  FiClock,
  FiCheck,
  FiStar,
  FiMessageCircle,
  FiSend,
  FiTrash2,
  FiEdit2,
  FiTarget,
  FiBell,
} from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { StudentProgressProvider, useStudentProgress } from '@/contexts/StudentProgressContext';

// Types
interface PlannerItem {
  id: string;
  type: 'activity' | 'homework' | 'reminder' | 'note';
  title: string;
  description?: string;
  date: string;
  time?: string;
  subject?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  emoji?: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Category configs
const CATEGORIES = {
  activity: { emoji: '🎯', label: 'Activity', color: 'blue' },
  homework: { emoji: '📚', label: 'Homework', color: 'purple' },
  reminder: { emoji: '⏰', label: 'Reminder', color: 'orange' },
  note: { emoji: '📝', label: 'Note', color: 'green' },
};

const SUBJECTS = [
  { value: 'math', label: '🔢 Math', color: 'blue' },
  { value: 'reading', label: '📖 Reading', color: 'green' },
  { value: 'science', label: '🔬 Science', color: 'purple' },
  { value: 'writing', label: '✏️ Writing', color: 'orange' },
  { value: 'art', label: '🎨 Art', color: 'pink' },
  { value: 'music', label: '🎵 Music', color: 'cyan' },
  { value: 'pe', label: '⚽ P.E.', color: 'red' },
  { value: 'other', label: '📋 Other', color: 'gray' },
];

// Helper functions
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  return { daysInMonth, startingDay, year, month };
};

const formatDate = (date: Date) => {
  // Use local timezone instead of UTC to avoid date shifting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const isToday = (dateStr: string) => {
  return dateStr === formatDate(new Date());
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PlannerPageContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras } = useChildTheme();
  const { setContext, setIsOpen } = useRightPanel();
  const { progress } = useStudentProgress();
  
  // Set right panel context on mount
  // Set right panel context - keep closed by default
  // Only run on mount to avoid closing panel when user opens it
  useEffect(() => {
    setContext('child-planner');
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'ai'>('calendar');
  
  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<PlannerItem>>({
    type: 'homework',
    title: '',
    description: '',
    date: selectedDate,
    priority: 'medium',
    completed: false,
  });
  
  // Theme
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.default;
  const primaryColor = colors?.primary || '#667eea';
  const cardBg = colors?.backgroundSecondary || 'white';
  
  // Background mode state
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  const bgStyles = getBackgroundStyles(bgMode);

  // Fetch items
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/child/planner');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch planner items:', error);
      // Use mock data for now
      setItems([
        { id: '1', type: 'homework', title: 'Math worksheet', date: formatDate(new Date()), priority: 'high', completed: false, subject: 'math' },
        { id: '2', type: 'activity', title: 'Soccer practice', date: formatDate(new Date()), priority: 'medium', completed: false, time: '4:00 PM' },
        { id: '3', type: 'reminder', title: 'Return library books', date: formatDate(new Date(Date.now() + 86400000)), priority: 'low', completed: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Save item
  const handleSaveItem = async () => {
    if (!newItem.title?.trim()) {
      toast({
        title: '📝 Add a title!',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    const itemToSave = editingItem 
      ? { ...editingItem, ...newItem }
      : { ...newItem, id: Date.now().toString(), completed: false };

    try {
      const res = await fetch('/api/child/planner', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave),
      });

      if (res.ok) {
        const savedItem = await res.json();
        if (editingItem) {
          setItems(prev => prev.map(i => i.id === editingItem.id ? savedItem : i));
        } else {
          setItems(prev => [...prev, savedItem]);
        }
      } else {
        // Fallback for when API doesn't exist yet
        if (editingItem) {
          setItems(prev => prev.map(i => i.id === editingItem.id ? itemToSave as PlannerItem : i));
        } else {
          setItems(prev => [...prev, itemToSave as PlannerItem]);
        }
      }
      
      toast({
        title: editingItem ? '✅ Updated!' : '✅ Added!',
        status: 'success',
        duration: 2000,
      });
      onClose();
      resetForm();
    } catch (error) {
      // Fallback - save locally
      if (editingItem) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? itemToSave as PlannerItem : i));
      } else {
        setItems(prev => [...prev, itemToSave as PlannerItem]);
      }
      toast({
        title: editingItem ? '✅ Updated!' : '✅ Added!',
        status: 'success',
        duration: 2000,
      });
      onClose();
      resetForm();
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    // Optimistic update
    setItems(prev => prev.filter(i => i.id !== id));
    
    try {
      await fetch(`/api/child/planner?id=${id}`, { method: 'DELETE' });
      toast({
        title: '🗑️ Deleted!',
        status: 'info',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      // Refetch to restore state on error
      fetchItems();
    }
  };

  // Toggle complete
  const handleToggleComplete = async (item: PlannerItem) => {
    const updated = { ...item, completed: !item.completed };
    
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    
    try {
      await fetch('/api/child/planner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      
      if (updated.completed) {
        toast({
          title: '🎉 Great job!',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      // Revert on error
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    }
  };

  // Reset form
  const resetForm = () => {
    setNewItem({
      type: 'homework',
      title: '',
      description: '',
      date: selectedDate,
      priority: 'medium',
      completed: false,
    });
    setEditingItem(null);
  };

  // Open add modal
  const handleQuickAdd = (type: string) => {
    resetForm();
    setNewItem(prev => ({ ...prev, type: type as PlannerItem['type'], date: selectedDate }));
    onOpen();
  };

  // Open edit modal
  const handleEdit = (item: PlannerItem) => {
    setEditingItem(item);
    setNewItem(item);
    onOpen();
  };

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDate(today));
  };

  // Get items for a specific date
  const getItemsForDate = (dateStr: string) => {
    return items.filter(item => item.date === dateStr);
  };

  // Get items for selected date
  const selectedDateItems = getItemsForDate(selectedDate);

  // Get upcoming items (next 7 days)
  const upcomingItems = items.filter(item => {
    const itemDate = new Date(item.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return itemDate >= today && itemDate <= weekFromNow && !item.completed;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calendar grid
  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);
  const calendarDays: (null | { day: number; dateStr: string })[] = [];
  
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ day, dateStr });
  }

  // Stats
  const totalTasks = items.length;
  const completedTasks = items.filter(i => i.completed).length;
  const homeworkCount = items.filter(i => i.type === 'homework' && !i.completed).length;

  return (
    <ChildDashboardLayout pageType="planner">
      <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box
        minH="calc(100vh - 60px)"
        bg={colors?.background || '#f0f4ff'}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundAttachment={bgStyles.backgroundAttachment}
        position="relative"
      >
        {/* Overlay for readability */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
        />
        
        <Box position="relative" zIndex={1} py={4}>
          <Container maxW="container.xl">
            {/* Header */}
            <HStack mb={4} justify="space-between" flexWrap="wrap" gap={2}>
              <HStack spacing={3}>
                <IconButton
                  icon={<FiArrowLeft />}
                  aria-label="Back"
                  variant="ghost"
                  onClick={() => router.push('/child/home')}
                  size="sm"
                />
                <Text fontSize="2xl" fontWeight="bold">📅 My Planner</Text>
              </HStack>
              
              <HStack spacing={2}>
                <Button
                  size="sm"
                  leftIcon={<FiPlus />}
                  colorScheme="purple"
                  onClick={() => handleQuickAdd('homework')}
                >
                  Add New
                </Button>
              </HStack>
            </HStack>

            {/* Stats Bar */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>
              <Box bg={cardBg} p={3} borderRadius="xl" boxShadow="sm">
                <HStack>
                  <Text fontSize="2xl">📚</Text>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Homework</Text>
                    <Text fontWeight="bold">{homeworkCount} pending</Text>
                  </Box>
                </HStack>
              </Box>
              <Box bg={cardBg} p={3} borderRadius="xl" boxShadow="sm">
                <HStack>
                  <Text fontSize="2xl">✅</Text>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Completed</Text>
                    <Text fontWeight="bold">{completedTasks} / {totalTasks}</Text>
                  </Box>
                </HStack>
              </Box>
              <Box bg={cardBg} p={3} borderRadius="xl" boxShadow="sm">
                <HStack>
                  <Text fontSize="2xl">🎯</Text>
                  <Box>
                    <Text fontSize="xs" color="gray.500">This Week</Text>
                    <Text fontWeight="bold">{upcomingItems.length} items</Text>
                  </Box>
                </HStack>
              </Box>
              <Box 
                bg={cardBg} 
                p={3} 
                borderRadius="xl" 
                boxShadow="sm"
                cursor="pointer"
                onClick={() => setActiveView('ai')}
                _hover={{ bg: 'purple.50' }}
                transition="all 0.2s"
              >
                <HStack>
                  <Text fontSize="2xl">🤖</Text>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Study Buddy</Text>
                    <Text fontWeight="bold" color="purple.500">Ask me!</Text>
                  </Box>
                </HStack>
              </Box>
            </SimpleGrid>

            {/* Main Content */}
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
              {/* Calendar */}
              <Box gridColumn={{ lg: 'span 2' }}>
                <Box bg={cardBg} borderRadius="2xl" boxShadow="md" overflow="hidden">
                  {/* Calendar Header */}
                  <HStack p={4} justify="space-between" bg="purple.50">
                    <HStack>
                      <IconButton
                        icon={<FiChevronLeft />}
                        aria-label="Previous month"
                        size="sm"
                        variant="ghost"
                        onClick={goToPrevMonth}
                      />
                      <Text fontWeight="bold" fontSize="lg" minW="150px" textAlign="center">
                        {MONTHS[month]} {year}
                      </Text>
                      <IconButton
                        icon={<FiChevronRight />}
                        aria-label="Next month"
                        size="sm"
                        variant="ghost"
                        onClick={goToNextMonth}
                      />
                    </HStack>
                    <Button size="sm" variant="outline" onClick={goToToday}>
                      Today
                    </Button>
                  </HStack>

                  {/* Days Header */}
                  <SimpleGrid columns={7} bg="gray.50" py={2}>
                    {DAYS.map(day => (
                      <Text key={day} textAlign="center" fontSize="xs" fontWeight="bold" color="gray.500">
                        {day}
                      </Text>
                    ))}
                  </SimpleGrid>

                  {/* Calendar Grid */}
                  <SimpleGrid columns={7} p={2} gap={1}>
                    {calendarDays.map((dayData, idx) => {
                      if (!dayData) {
                        return <Box key={`empty-${idx}`} h="60px" />;
                      }
                      
                      const { day, dateStr } = dayData;
                      const dayItems = getItemsForDate(dateStr);
                      const isSelected = dateStr === selectedDate;
                      const isTodayDate = isToday(dateStr);
                      
                      return (
                        <Box
                          key={dateStr}
                          h="60px"
                          p={1}
                          borderRadius="lg"
                          cursor="pointer"
                          bg={isSelected ? 'purple.100' : isTodayDate ? 'blue.50' : 'transparent'}
                          border={isTodayDate ? '2px solid' : '1px solid'}
                          borderColor={isTodayDate ? 'blue.400' : isSelected ? 'purple.300' : 'transparent'}
                          _hover={{ bg: 'purple.50' }}
                          onClick={() => setSelectedDate(dateStr)}
                          transition="all 0.2s"
                        >
                          <Text 
                            fontSize="sm" 
                            fontWeight={isTodayDate ? 'bold' : 'medium'}
                            color={isTodayDate ? 'blue.600' : 'gray.700'}
                          >
                            {day}
                          </Text>
                          {dayItems.length > 0 && (
                            <HStack spacing={0.5} mt={1} flexWrap="wrap">
                              {dayItems.slice(0, 3).map(item => (
                                <Box
                                  key={item.id}
                                  w="6px"
                                  h="6px"
                                  borderRadius="full"
                                  bg={item.completed ? 'green.400' : 
                                      item.type === 'homework' ? 'purple.400' :
                                      item.type === 'activity' ? 'blue.400' :
                                      item.type === 'reminder' ? 'orange.400' : 'green.400'}
                                />
                              ))}
                              {dayItems.length > 3 && (
                                <Text fontSize="2xs" color="gray.500">+{dayItems.length - 3}</Text>
                              )}
                            </HStack>
                          )}
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </Box>

                {/* Selected Date Items */}
                <Box bg={cardBg} borderRadius="2xl" boxShadow="md" mt={4} p={4}>
                  <HStack justify="space-between" mb={3}>
                    <Text fontWeight="bold">
                      📌 {formatDisplayDate(selectedDate)}
                      {isToday(selectedDate) && <Badge ml={2} colorScheme="blue">Today</Badge>}
                    </Text>
                    <Button size="xs" leftIcon={<FiPlus />} onClick={() => handleQuickAdd('homework')}>
                      Add
                    </Button>
                  </HStack>
                  
                  {selectedDateItems.length === 0 ? (
                    <Text color="gray.500" textAlign="center" py={4}>
                      Nothing planned for this day! 🎉
                    </Text>
                  ) : (
                    <VStack spacing={2} align="stretch">
                      {selectedDateItems.map(item => (
                        <HStack
                          key={item.id}
                          p={3}
                          bg={item.completed ? 'green.50' : 'gray.50'}
                          borderRadius="lg"
                          opacity={item.completed ? 0.7 : 1}
                        >
                          <Checkbox
                            isChecked={item.completed}
                            onChange={() => handleToggleComplete(item)}
                            colorScheme="green"
                          />
                          <Text fontSize="lg">{CATEGORIES[item.type].emoji}</Text>
                          <Box flex={1}>
                            <Text
                              fontWeight="medium"
                              textDecoration={item.completed ? 'line-through' : 'none'}
                            >
                              {item.title}
                            </Text>
                            {item.time && (
                              <Text fontSize="xs" color="gray.500">
                                🕐 {item.time}
                              </Text>
                            )}
                          </Box>
                          <HStack spacing={1}>
                            <IconButton
                              icon={<FiEdit2 />}
                              aria-label="Edit"
                              size="xs"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                            />
                            <IconButton
                              icon={<FiTrash2 />}
                              aria-label="Delete"
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDeleteItem(item.id)}
                            />
                          </HStack>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Box>
              </Box>

              {/* Right Panel - AI Assistant & Quick Actions */}
              <Box>
                {/* Quick Add Buttons */}
                <Box bg={cardBg} borderRadius="2xl" boxShadow="md" p={4} mb={4}>
                  <Text fontWeight="bold" mb={3}>➕ Quick Add</Text>
                  <SimpleGrid columns={2} spacing={2}>
                    {Object.entries(CATEGORIES).map(([type, config]) => (
                      <Button
                        key={type}
                        size="sm"
                        variant="outline"
                        leftIcon={<Text>{config.emoji}</Text>}
                        onClick={() => handleQuickAdd(type)}
                        justifyContent="flex-start"
                      >
                        {config.label}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Box>

                {/* Upcoming Items */}
                <Box bg={cardBg} borderRadius="2xl" boxShadow="md" p={4} mb={4}>
                  <Text fontWeight="bold" mb={3}>📋 Coming Up</Text>
                  {upcomingItems.length === 0 ? (
                    <Text color="gray.500" fontSize="sm" textAlign="center" py={2}>
                      All caught up! 🎉
                    </Text>
                  ) : (
                    <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                      {upcomingItems.slice(0, 5).map(item => (
                        <HStack key={item.id} fontSize="sm" p={2} bg="gray.50" borderRadius="md">
                          <Text>{CATEGORIES[item.type].emoji}</Text>
                          <Box flex={1}>
                            <Text fontWeight="medium" noOfLines={1}>{item.title}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatDisplayDate(item.date)}
                            </Text>
                          </Box>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Box>

                {/* Today's Focus */}
                <Box bg={cardBg} borderRadius="2xl" boxShadow="md" p={4}>
                  <HStack mb={3}>
                    <Text fontSize="xl">🎯</Text>
                    <Text fontWeight="bold">Today's Focus</Text>
                  </HStack>
                  
                  {/* Today's priority items */}
                  <VStack spacing={2} align="stretch">
                    {items.filter(i => i.date === formatDate(new Date()) && !i.completed).length === 0 ? (
                      <Box textAlign="center" py={4}>
                        <Text fontSize="3xl" mb={2}>🌟</Text>
                        <Text color="gray.600" fontSize="sm">No tasks for today!</Text>
                        <Text color="gray.500" fontSize="xs">Add something to get started</Text>
                      </Box>
                    ) : (
                      items
                        .filter(i => i.date === formatDate(new Date()) && !i.completed)
                        .slice(0, 3)
                        .map((item, idx) => (
                          <HStack
                            key={item.id}
                            p={3}
                            bg={idx === 0 ? 'purple.50' : 'gray.50'}
                            borderRadius="lg"
                            border={idx === 0 ? '2px solid' : 'none'}
                            borderColor="purple.200"
                          >
                            <Text fontSize="lg">{CATEGORIES[item.type].emoji}</Text>
                            <Box flex={1}>
                              <Text fontWeight={idx === 0 ? 'bold' : 'medium'} fontSize="sm">
                                {item.title}
                              </Text>
                              {item.time && (
                                <Text fontSize="xs" color="gray.500">🕐 {item.time}</Text>
                              )}
                            </Box>
                            {idx === 0 && <Badge colorScheme="purple" fontSize="2xs">Priority</Badge>}
                          </HStack>
                        ))
                    )}
                  </VStack>

                  {/* Motivational tip */}
                  <Box mt={4} p={3} bg="blue.50" borderRadius="lg">
                    <Text fontSize="xs" color="blue.700" fontWeight="medium">
                      💡 Tip: Use the Study Buddy in the right panel for homework help!
                    </Text>
                  </Box>
                </Box>

                {/* Workspace Progress - Integration with Workspace */}
                <Box bg={cardBg} borderRadius="2xl" boxShadow="md" p={4}>
                  <HStack justify="space-between" mb={3}>
                    <HStack>
                      <Text fontSize="xl">📊</Text>
                      <Text fontWeight="bold">Learning Progress</Text>
                    </HStack>
                    <Button 
                      size="xs" 
                      variant="ghost" 
                      colorScheme="blue"
                      onClick={() => router.push('/child/workspace')}
                    >
                      Open Workspace
                    </Button>
                  </HStack>
                  
                  <SimpleGrid columns={2} spacing={3}>
                    {/* Math Progress */}
                    <Box p={3} bg="green.50" borderRadius="lg">
                      <HStack mb={2}>
                        <Text>🧮</Text>
                        <Text fontSize="sm" fontWeight="medium">Math</Text>
                      </HStack>
                      <Text fontSize="xl" fontWeight="bold" color="green.600">
                        {progress.totalMathProblems}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">problems solved</Text>
                      {progress.mathAccuracy > 0 && (
                        <Badge colorScheme="green" fontSize="2xs" mt={1}>
                          {progress.mathAccuracy}% accuracy
                        </Badge>
                      )}
                    </Box>

                    {/* Reading Progress */}
                    <Box p={3} bg="purple.50" borderRadius="lg">
                      <HStack mb={2}>
                        <Text>📚</Text>
                        <Text fontSize="sm" fontWeight="medium">Reading</Text>
                      </HStack>
                      <Text fontSize="xl" fontWeight="bold" color="purple.600">
                        {progress.booksExplored}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">books explored</Text>
                    </Box>

                    {/* Writing Progress */}
                    <Box p={3} bg="blue.50" borderRadius="lg">
                      <HStack mb={2}>
                        <Text>✍️</Text>
                        <Text fontSize="sm" fontWeight="medium">Writing</Text>
                      </HStack>
                      <Text fontSize="xl" fontWeight="bold" color="blue.600">
                        {progress.documents.length}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">documents</Text>
                    </Box>

                    {/* Streak */}
                    <Box p={3} bg="orange.50" borderRadius="lg">
                      <HStack mb={2}>
                        <Text>🔥</Text>
                        <Text fontSize="sm" fontWeight="medium">Streak</Text>
                      </HStack>
                      <Text fontSize="xl" fontWeight="bold" color="orange.600">
                        {progress.dailyStreak}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">days</Text>
                      <Text fontSize="2xs" color="orange.500" fontWeight="medium">
                        ⭐ {progress.totalPointsEarned} pts
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>
              </Box>
            </SimpleGrid>
          </Container>
        </Box>
      </Box>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader>
            {editingItem ? '✏️ Edit Item' : '➕ Add New Item'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={newItem.type}
                  onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value as PlannerItem['type'] }))}
                >
                  {Object.entries(CATEGORIES).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.emoji} {config.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  placeholder="What do you need to do?"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                />
              </FormControl>

              {newItem.type === 'homework' && (
                <FormControl>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    value={newItem.subject || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, subject: e.target.value }))}
                  >
                    <option value="">Select subject...</option>
                    {SUBJECTS.map(subj => (
                      <option key={subj.value} value={subj.value}>
                        {subj.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={newItem.date}
                  onChange={(e) => setNewItem(prev => ({ ...prev, date: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Time (optional)</FormLabel>
                <Input
                  type="time"
                  value={newItem.time || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, time: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Priority</FormLabel>
                <Select
                  value={newItem.priority}
                  onChange={(e) => setNewItem(prev => ({ ...prev, priority: e.target.value as PlannerItem['priority'] }))}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Notes (optional)</FormLabel>
                <Textarea
                  placeholder="Any extra details..."
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSaveItem}>
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      </BackgroundContextMenu>
    </ChildDashboardLayout>
  );
}

export default function ChildPlannerPage() {
  return (
    <ChildDashboardLayout pageType="planner">
      <StudentProgressProvider>
        <PlannerPageContent />
      </StudentProgressProvider>
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/calendar',
        permanent: false,
      },
    };
  }

  return { props: {} };
};

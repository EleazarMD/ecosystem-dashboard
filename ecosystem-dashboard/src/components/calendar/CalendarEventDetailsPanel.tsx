/**
 * CalendarEventDetailsPanel - Right panel component for displaying calendar event details
 * Shows event information, attendees, AI analysis, and provides actions like edit/delete
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Divider,
  Avatar,
  AvatarGroup,
  useColorModeValue,
  useToast,
  Tooltip,
  Icon,
  Collapse,
  Spinner,
  Progress,
  Skeleton,
  SkeletonText,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiMail,
  FiVideo,
  FiCopy,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiZap,
  FiAlertTriangle,
  FiTrendingUp,
  FiFileText,
  FiTarget,
  FiMessageSquare,
  FiRefreshCw,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface AIAnalysis {
  summary: string;
  preparationTips: string[];
  conflictWarnings: string[];
  relatedContext: string[];
  suggestedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  meetingType: string;
  estimatedImportance: number;
  relatedEvents?: Array<{
    id: string;
    title: string;
    date: string;
    relevance: string;
  }>;
  relatedEmails?: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    preview: string;
    similarity: number;
    source?: 'thread' | 'ical_ref' | 'attendee' | 'semantic';
  }>;
  attendeeInsights?: Array<{
    email: string;
    name?: string;
    relationship?: string;
    lastInteraction?: string;
  }>;
}

interface CalendarEvent {
  id: string;
  calendar_id: string;
  calendar_name?: string;
  calendar_color?: string;
  calendar_type?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  status?: string;
  priority?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    response_status?: string;
  }>;
  ai_extracted?: boolean;
}

interface CustomData {
  event?: CalendarEvent;
  type?: string;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
}

/**
 * DescriptionSection - Handles long descriptions with collapse/expand
 * Parses Microsoft Teams meeting details into a cleaner format
 */
function DescriptionSection({ 
  description, 
  bgColor, 
  borderColor, 
  mutedColor 
}: { 
  description: string; 
  bgColor: string; 
  borderColor: string; 
  mutedColor: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse Microsoft Teams meeting info
  const isMSTeamsMeeting = description.includes('Microsoft Teams') || 
                           description.includes('teams.microsoft.com');
  
  // Extract meeting link from Teams description
  const extractTeamsLink = (desc: string): string | null => {
    const linkMatch = desc.match(/https:\/\/teams\.microsoft\.com\/[^\s<>]+/);
    return linkMatch ? linkMatch[0] : null;
  };
  
  // Clean up the description for display
  const getCleanDescription = (desc: string): string => {
    if (!isMSTeamsMeeting) return desc;
    
    // Remove excessive whitespace and formatting
    let cleaned = desc
      .replace(/_{10,}/g, '') // Remove long underscores
      .replace(/\*{2,}/g, '') // Remove asterisks
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .trim();
    
    return cleaned;
  };
  
  const teamsLink = isMSTeamsMeeting ? extractTeamsLink(description) : null;
  const cleanedDescription = getCleanDescription(description);
  const isLongDescription = cleanedDescription.length > 200;
  const displayDescription = isExpanded || !isLongDescription 
    ? cleanedDescription 
    : cleanedDescription.slice(0, 200) + '...';
  
  return (
    <Box bg={bgColor} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="medium">Description</Text>
        {isLongDescription && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            rightIcon={<Icon as={isExpanded ? FiChevronUp : FiChevronDown} />}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        )}
      </HStack>
      
      {/* Teams Meeting Quick Join */}
      {isMSTeamsMeeting && teamsLink && (
        <HStack 
          mb={3} 
          p={2} 
          bg="blue.50" 
          _dark={{ bg: 'blue.900' }}
          borderRadius="md"
          spacing={2}
        >
          <Icon as={FiVideo} color="blue.500" />
          <Text fontSize="xs" color="blue.600" _dark={{ color: 'blue.300' }} flex={1}>
            Microsoft Teams Meeting
          </Text>
          <Button
            size="xs"
            colorScheme="blue"
            leftIcon={<FiExternalLink />}
            onClick={() => window.open(teamsLink, '_blank')}
          >
            Join
          </Button>
        </HStack>
      )}
      
      <Collapse in={isExpanded || !isLongDescription} startingHeight={isLongDescription ? 60 : 'auto'}>
        <Text 
          fontSize="sm" 
          color={mutedColor} 
          whiteSpace="pre-wrap"
          sx={{
            wordBreak: 'break-word',
            '& a': { color: 'blue.500', textDecoration: 'underline' }
          }}
        >
          {displayDescription}
        </Text>
      </Collapse>
      
      {isLongDescription && !isExpanded && (
        <Button
          size="xs"
          variant="link"
          color="blue.500"
          mt={2}
          onClick={() => setIsExpanded(true)}
        >
          Show more
        </Button>
      )}
    </Box>
  );
}

export function CalendarEventDetailsPanel() {
  const { customData, setIsOpen } = useRightPanel();
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const aiSectionBg = useColorModeValue('purple.50', 'purple.900');
  const aiAccentColor = useColorModeValue('purple.600', 'purple.300');
  
  const data = customData as CustomData | undefined;
  const event = data?.event;
  
  // AI Analysis state
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Generate AI analysis when section is opened
  const generateAIAnalysis = async () => {
    if (!event) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Call the real API endpoint that integrates with PIC and Hermes Core
      const response = await fetch('/api/calendar/analyze-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
        
        // Log which sources were available
        console.log('[AI Analysis] Sources:', data.sources);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[AI Analysis] Error:', error);
      setAnalysisError('Failed to generate analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Toggle AI analysis section
  const handleToggleAI = () => {
    const newState = !showAIAnalysis;
    setShowAIAnalysis(newState);
    if (newState && !aiAnalysis && !isAnalyzing) {
      generateAIAnalysis();
    }
  };
  
  // Reset analysis when event changes
  useEffect(() => {
    setAiAnalysis(null);
    setShowAIAnalysis(false);
    setAnalysisError(null);
  }, [event?.id]);
  
  if (!event) {
    return (
      <Box p={4} textAlign="center">
        <Text color={mutedColor}>No event selected</Text>
        <Text fontSize="sm" color={mutedColor} mt={2}>
          Click on an event in the calendar to view its details
        </Text>
      </Box>
    );
  }
  
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const getDuration = () => {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'tentative': return 'yellow';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };
  
  const getResponseColor = (response?: string) => {
    switch (response) {
      case 'accepted': return 'green.500';
      case 'declined': return 'red.500';
      case 'tentative': return 'yellow.500';
      default: return 'gray.500';
    }
  };
  
  const handleCopyLocation = () => {
    if (event.location) {
      navigator.clipboard.writeText(event.location);
      toast({
        title: 'Location copied',
        status: 'success',
        duration: 2000,
      });
    }
  };
  
  const handleDelete = async () => {
    if (data?.onEventDeleted) {
      data.onEventDeleted(event.id);
      toast({
        title: 'Event deleted',
        status: 'success',
        duration: 2000,
      });
    }
  };
  
  const isVideoMeeting = event.location?.includes('zoom') || 
                         event.location?.includes('meet.google') ||
                         event.location?.includes('teams');

  return (
    <Box h="full" overflow="auto">
      <VStack spacing={4} align="stretch" p={4}>
        {/* Header with calendar color */}
        <Box
          bg={event.calendar_color || 'blue.500'}
          color="white"
          p={4}
          borderRadius="lg"
          position="relative"
        >
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1} flex={1}>
              <Text fontSize="lg" fontWeight="bold" lineHeight="short">
                {event.title}
              </Text>
              {event.calendar_name && (
                <Text fontSize="sm" opacity={0.9}>
                  {event.calendar_name}
                </Text>
              )}
            </VStack>
            <HStack spacing={1}>
              {event.status && (
                <Badge colorScheme={getStatusColor(event.status)} variant="solid" fontSize="xs">
                  {event.status}
                </Badge>
              )}
              {event.ai_extracted && (
                <Badge colorScheme="purple" variant="solid" fontSize="xs">
                  AI
                </Badge>
              )}
            </HStack>
          </HStack>
        </Box>
        
        {/* Date & Time */}
        <Box bg={bgColor} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
          <HStack spacing={3} mb={3}>
            <Icon as={FiCalendar} color="blue.500" />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">{formatDate(startDate)}</Text>
              {!event.all_day && (
                <Text fontSize="sm" color={mutedColor}>
                  {formatTime(startDate)} - {formatTime(endDate)}
                </Text>
              )}
            </VStack>
          </HStack>
          
          <HStack spacing={3}>
            <Icon as={FiClock} color="blue.500" />
            <Text fontSize="sm" color={mutedColor}>
              {event.all_day ? 'All day' : getDuration()}
            </Text>
          </HStack>
        </Box>
        
        {/* Location */}
        {event.location && (
          <Box bg={bgColor} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
            <HStack spacing={3} justify="space-between">
              <HStack spacing={3} flex={1}>
                <Icon as={isVideoMeeting ? FiVideo : FiMapPin} color="green.500" />
                <Text fontSize="sm" noOfLines={2}>{event.location}</Text>
              </HStack>
              <HStack spacing={1}>
                {isVideoMeeting && (
                  <Tooltip label="Join meeting">
                    <IconButton
                      aria-label="Join meeting"
                      icon={<FiExternalLink />}
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(event.location, '_blank')}
                    />
                  </Tooltip>
                )}
                <Tooltip label="Copy location">
                  <IconButton
                    aria-label="Copy location"
                    icon={<FiCopy />}
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyLocation}
                  />
                </Tooltip>
              </HStack>
            </HStack>
          </Box>
        )}
        
        {/* Description - Collapsible for long content */}
        {event.description && (
          <DescriptionSection 
            description={event.description} 
            bgColor={bgColor} 
            borderColor={borderColor} 
            mutedColor={mutedColor}
          />
        )}
        
        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <Box bg={bgColor} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
            <HStack spacing={2} mb={3}>
              <Icon as={FiUsers} color="purple.500" />
              <Text fontSize="sm" fontWeight="medium">
                {event.attendees.length} Attendee{event.attendees.length > 1 ? 's' : ''}
              </Text>
            </HStack>
            
            <VStack align="stretch" spacing={2}>
              {event.attendees.slice(0, 5).map((attendee, idx) => (
                <HStack key={idx} spacing={3} p={2} borderRadius="md" _hover={{ bg: hoverBg }}>
                  <Avatar size="sm" name={attendee.name || attendee.email} />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {attendee.name || attendee.email.split('@')[0]}
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>{attendee.email}</Text>
                  </VStack>
                  {attendee.response_status && (
                    <Icon
                      as={attendee.response_status === 'accepted' ? FiCheck : 
                          attendee.response_status === 'declined' ? FiX : FiClock}
                      color={getResponseColor(attendee.response_status)}
                    />
                  )}
                </HStack>
              ))}
              {event.attendees.length > 5 && (
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  +{event.attendees.length - 5} more
                </Text>
              )}
            </VStack>
          </Box>
        )}
        
        {/* AI Analysis Section - Collapsible */}
        <Box
          bg={aiSectionBg}
          borderRadius="lg"
          border="1px"
          borderColor={showAIAnalysis ? 'purple.300' : borderColor}
          overflow="hidden"
          transition="all 0.2s"
        >
          {/* Toggle Header */}
          <HStack
            p={3}
            cursor="pointer"
            onClick={handleToggleAI}
            _hover={{ bg: useColorModeValue('purple.100', 'purple.800') }}
            transition="background 0.2s"
          >
            <HStack spacing={2} flex={1}>
              <Box
                p={1.5}
                borderRadius="md"
                bg={useColorModeValue('purple.100', 'purple.700')}
              >
                <Icon as={FiZap} color={aiAccentColor} boxSize={4} />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="semibold" color={aiAccentColor}>
                  AI Analysis
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  {showAIAnalysis ? 'Click to collapse' : 'Get intelligent insights'}
                </Text>
              </VStack>
            </HStack>
            <Icon
              as={showAIAnalysis ? FiChevronUp : FiChevronDown}
              color={aiAccentColor}
              transition="transform 0.2s"
            />
          </HStack>
          
          {/* Collapsible Content */}
          <Collapse in={showAIAnalysis} animateOpacity>
            <Box px={3} pb={3}>
              <Divider mb={3} borderColor={useColorModeValue('purple.200', 'purple.700')} />
              
              {isAnalyzing ? (
                <VStack spacing={3} py={4}>
                  <Spinner size="md" color="purple.500" thickness="3px" />
                  <Text fontSize="sm" color={mutedColor}>Analyzing event...</Text>
                  <SkeletonText noOfLines={3} spacing={2} w="full" />
                </VStack>
              ) : analysisError ? (
                <VStack spacing={2} py={3}>
                  <Icon as={FiAlertTriangle} color="red.500" boxSize={6} />
                  <Text fontSize="sm" color="red.500">{analysisError}</Text>
                  <Button size="xs" leftIcon={<FiRefreshCw />} onClick={generateAIAnalysis}>
                    Retry
                  </Button>
                </VStack>
              ) : aiAnalysis ? (
                <VStack align="stretch" spacing={3}>
                  {/* Summary & Type */}
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                        {aiAnalysis.meetingType}
                      </Badge>
                      <HStack spacing={1}>
                        <Text fontSize="xs" color={mutedColor}>Importance:</Text>
                        <Progress
                          value={aiAnalysis.estimatedImportance}
                          size="xs"
                          colorScheme={
                            aiAnalysis.estimatedImportance >= 70 ? 'red' :
                            aiAnalysis.estimatedImportance >= 40 ? 'yellow' : 'green'
                          }
                          w="50px"
                          borderRadius="full"
                        />
                      </HStack>
                    </HStack>
                    <Text fontSize="sm" color={mutedColor}>
                      {aiAnalysis.summary}
                    </Text>
                  </Box>
                  
                  {/* Conflict Warnings */}
                  {aiAnalysis.conflictWarnings.length > 0 && (
                    <Box
                      bg={useColorModeValue('orange.50', 'orange.900')}
                      p={2}
                      borderRadius="md"
                      borderLeft="3px solid"
                      borderLeftColor="orange.400"
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={FiAlertTriangle} color="orange.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="semibold" color="orange.600" _dark={{ color: 'orange.300' }}>
                          Heads Up
                        </Text>
                      </HStack>
                      <VStack align="start" spacing={0.5}>
                        {aiAnalysis.conflictWarnings.map((warning, idx) => (
                          <Text key={idx} fontSize="xs" color={mutedColor}>
                            • {warning}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Preparation Tips */}
                  {aiAnalysis.preparationTips.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiTarget} color="blue.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="semibold" color={aiAccentColor}>
                          Preparation Tips
                        </Text>
                      </HStack>
                      <VStack align="start" spacing={1}>
                        {aiAnalysis.preparationTips.map((tip, idx) => (
                          <HStack key={idx} spacing={2} align="start">
                            <Box w={1.5} h={1.5} borderRadius="full" bg="blue.400" mt={1.5} flexShrink={0} />
                            <Text fontSize="xs" color={mutedColor}>{tip}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Suggested Actions */}
                  {aiAnalysis.suggestedActions.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiTrendingUp} color="green.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="semibold" color={aiAccentColor}>
                          Suggested Actions
                        </Text>
                      </HStack>
                      <VStack align="stretch" spacing={1.5}>
                        {aiAnalysis.suggestedActions.map((item, idx) => (
                          <HStack
                            key={idx}
                            p={2}
                            bg={useColorModeValue('white', 'gray.800')}
                            borderRadius="md"
                            justify="space-between"
                            _hover={{ bg: hoverBg }}
                            cursor="pointer"
                          >
                            <Text fontSize="xs" color={mutedColor}>{item.action}</Text>
                            <Badge
                              size="sm"
                              colorScheme={
                                item.priority === 'high' ? 'red' :
                                item.priority === 'medium' ? 'yellow' : 'gray'
                              }
                              variant="subtle"
                              fontSize="9px"
                            >
                              {item.priority}
                            </Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Related Context */}
                  {aiAnalysis.relatedContext.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiFileText} color="cyan.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="semibold" color={aiAccentColor}>
                          Related Context
                        </Text>
                      </HStack>
                      <VStack align="start" spacing={1}>
                        {aiAnalysis.relatedContext.map((ctx, idx) => (
                          <HStack key={idx} spacing={2}>
                            <Icon as={FiMessageSquare} color="cyan.400" boxSize={3} />
                            <Text fontSize="xs" color="cyan.600" _dark={{ color: 'cyan.300' }} cursor="pointer" _hover={{ textDecoration: 'underline' }}>
                              {ctx}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Related Events from Hermes Core */}
                  {aiAnalysis.relatedEvents && aiAnalysis.relatedEvents.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiCalendar} color="teal.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="semibold" color={aiAccentColor}>
                          Related Events
                        </Text>
                      </HStack>
                      <VStack align="stretch" spacing={1.5}>
                        {aiAnalysis.relatedEvents.map((relEvent, idx) => (
                          <HStack
                            key={idx}
                            p={2}
                            bg={useColorModeValue('white', 'gray.800')}
                            borderRadius="md"
                            borderLeft="2px solid"
                            borderLeftColor="teal.400"
                            _hover={{ bg: hoverBg }}
                            cursor="pointer"
                          >
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                                {relEvent.title}
                              </Text>
                              <Text fontSize="10px" color={mutedColor}>
                                {new Date(relEvent.date).toLocaleDateString([], { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Text>
                            </VStack>
                            <Badge fontSize="9px" colorScheme="teal" variant="subtle">
                              {relEvent.relevance}
                            </Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Related Emails from Hermes Core */}
                  {aiAnalysis.relatedEmails && aiAnalysis.relatedEmails.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiMail} color="orange.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="semibold" color={aiAccentColor}>
                          Related Emails
                        </Text>
                      </HStack>
                      <VStack align="stretch" spacing={1.5}>
                        {aiAnalysis.relatedEmails.map((email, idx) => {
                          // Color-code by source type
                          const isThreadEmail = email.source === 'thread' || email.source === 'ical_ref';
                          const borderColor = isThreadEmail ? 'green.500' : 
                                             email.source === 'attendee' ? 'blue.400' : 'orange.400';
                          const sourceLabel = isThreadEmail ? 'Meeting Thread' :
                                             email.source === 'attendee' ? 'From Attendee' : 'Related';
                          
                          return (
                            <Box
                              key={idx}
                              p={2}
                              bg={useColorModeValue('white', 'gray.800')}
                              borderRadius="md"
                              borderLeft="3px solid"
                              borderLeftColor={borderColor}
                              _hover={{ bg: hoverBg }}
                              cursor="pointer"
                            >
                              <HStack justify="space-between" align="start">
                                <Text fontSize="xs" fontWeight="medium" noOfLines={1} flex={1}>
                                  {email.subject || 'No subject'}
                                </Text>
                                {isThreadEmail && (
                                  <Badge 
                                    colorScheme="green" 
                                    fontSize="8px" 
                                    variant="subtle"
                                    flexShrink={0}
                                  >
                                    {sourceLabel}
                                  </Badge>
                                )}
                              </HStack>
                              <HStack spacing={2} mt={0.5}>
                                <Text fontSize="10px" color={mutedColor} noOfLines={1}>
                                  From: {email.from}
                                </Text>
                                {email.date && (
                                  <>
                                    <Text fontSize="10px" color={mutedColor}>•</Text>
                                    <Text fontSize="10px" color={mutedColor}>
                                      {new Date(email.date).toLocaleDateString([], { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </Text>
                                  </>
                                )}
                              </HStack>
                              {email.preview && (
                                <Text fontSize="10px" color={mutedColor} noOfLines={2} mt={1}>
                                  {email.preview}
                                </Text>
                              )}
                            </Box>
                          );
                        })}
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Refresh Button */}
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={<FiRefreshCw />}
                    onClick={generateAIAnalysis}
                    color={mutedColor}
                    alignSelf="center"
                    mt={1}
                  >
                    Regenerate Analysis
                  </Button>
                </VStack>
              ) : null}
            </Box>
          </Collapse>
        </Box>
        
        <Divider />
        
        {/* Actions */}
        <HStack spacing={2}>
          <Button
            leftIcon={<FiEdit2 />}
            size="sm"
            variant="outline"
            flex={1}
            isDisabled
          >
            Edit
          </Button>
          <Button
            leftIcon={<FiTrash2 />}
            size="sm"
            variant="outline"
            colorScheme="red"
            flex={1}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </HStack>
        
        {/* Calendar source info */}
        <Box textAlign="center" pt={2}>
          <Text fontSize="xs" color={mutedColor}>
            Source: {event.calendar_type || 'Local'} Calendar
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}

export default CalendarEventDetailsPanel;

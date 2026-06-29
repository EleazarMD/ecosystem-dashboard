/**
 * Child Team View — Child UI
 *
 * Shows a child their learning teams, teammates (info-flow controlled),
 * and shared team activities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Heading, Text, Button, Badge, SimpleGrid,
  Spinner, useToast, Avatar, Progress, Tag, TagLabel, Icon,
  Tooltip,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FiUsers, FiTarget, FiChevronRight, FiZap, FiAward,
} from 'react-icons/fi';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

const slideUp = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

interface Team {
  id: string;
  name: string;
  description?: string;
  teamEmoji: string;
  maxMembers: number;
  infoFlowLevel: 'full' | 'limited' | 'anonymous';
  sharedActivitiesEnabled: boolean;
  peerComparisonEnabled: boolean;
  teamChallengesEnabled: boolean;
  members: TeamMember[];
  activeMembers: number;
  pendingActivities: number;
  completedActivities: number;
  activePaths: number;
}

interface TeamMember {
  id: string;
  childUserId: string;
  childName: string;
  role: 'member' | 'captain';
  displayNameToTeam?: string;
}

interface TeammateView {
  displayName: string;
  role: 'member' | 'captain';
  completionStatus?: 'not_started' | 'in_progress' | 'completed';
  score?: number;
}

interface TeamActivity {
  id: string;
  title: string;
  description?: string;
  activityEmoji: string;
  activityType: string;
  status: string;
  difficulty?: number;
  participants: TeamActivityParticipant[];
}

interface TeamActivityParticipant {
  id: string;
  childUserId: string;
  childName: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  score?: number;
}

const ACTIVITY_TYPE_EMOJI: Record<string, string> = {
  challenge: '🎯',
  collaborative: '🤝',
  discussion: '💬',
  quiz_battle: '⚔️',
  team_quest: '🗺️',
};

export default function ChildTeamView() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teammates, setTeammates] = useState<TeammateView[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/child/teams?action=list');
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams || []);
        if (data.teams?.length > 0 && !selectedTeamId) {
          setSelectedTeamId(data.teams[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  const fetchTeamDetails = useCallback(async (teamId: string) => {
    try {
      const [tmRes, actRes] = await Promise.all([
        fetch(`/api/child/teams?action=teammates&teamId=${teamId}`),
        fetch(`/api/child/teams?action=activities&teamId=${teamId}`),
      ]);
      const tmData = await tmRes.json();
      const actData = await actRes.json();
      if (tmRes.ok) setTeammates(tmData.teammates || []);
      if (actRes.ok) setActivities(actData.activities || []);
    } catch (err) {
      console.error('Failed to fetch team details:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) fetchTeamDetails(selectedTeamId);
  }, [selectedTeamId, fetchTeamDetails]);

  const handleStartActivity = async (activityId: string) => {
    try {
      await fetch('/api/child/teams?action=start-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });
      toast({ title: 'Activity started!', status: 'success', duration: 3000 });
      if (selectedTeamId) fetchTeamDetails(selectedTeamId);
    } catch (err) {
      console.error('Failed to start activity:', err);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      await fetch('/api/child/teams?action=complete-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, score: 1.0 }),
      });
      toast({ title: 'Activity completed! 🎉', status: 'success', duration: 3000 });
      if (selectedTeamId) fetchTeamDetails(selectedTeamId);
    } catch (err) {
      console.error('Failed to complete activity:', err);
    }
  };

  if (loading) {
    return (
      <VStack justify="center" h="300px" spacing={4}>
        <Box animation={`${pulse} 1.5s ease-in-out infinite`} fontSize="5xl">
          🏆
        </Box>
        <Text fontSize="sm" color="gray.500">Loading your teams...</Text>
        <Spinner size="sm" color="purple.400" />
      </VStack>
    );
  }

  if (teams.length === 0) {
    return (
      <VStack spacing={8} py={12} animation={`${slideUp} 0.5s ease-out`}>
        <Box fontSize="6xl" animation={`${pulse} 2s ease-in-out infinite`}>
          🏆
        </Box>
        <VStack spacing={3}>
          <Heading size="md" color="gray.600">No Teams Yet</Heading>
          <Text fontSize="sm" color="gray.400" textAlign="center" maxW="350px">
            Ask your parent to create a learning team for you and your friends!
          </Text>
        </VStack>
      </VStack>
    );
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <VStack spacing={5} align="stretch">
      {/* Team Selector - Premium pill buttons */}
      {teams.length > 1 && (
        <HStack spacing={2} overflowX="auto" pb={1}>
          {teams.map((team) => (
            <Button
              key={team.id}
              size="sm"
              variant={team.id === selectedTeamId ? 'solid' : 'outline'}
              colorScheme="purple"
              borderRadius="full"
              leftIcon={<Text>{team.teamEmoji}</Text>}
              onClick={() => setSelectedTeamId(team.id)}
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              whiteSpace="nowrap"
            >
              {team.name}
            </Button>
          ))}
        </HStack>
      )}

      {selectedTeam && (
        <>
          {/* Team Header - Premium card with gradient icon */}
          <SimpleGlassPanel p={5}>
            <HStack justify="space-between" align="start">
              <HStack spacing={4}>
                <Box
                  w="64px" h="64px" borderRadius="2xl"
                  bgGradient="linear(135deg, purple.400, blue.500)"
                  display="flex" alignItems="center" justifyContent="center"
                  boxShadow="0 4px 12px rgba(159, 122, 234, 0.3)"
                  flexShrink={0}
                >
                  <Text fontSize="3xl">{selectedTeam.teamEmoji}</Text>
                </Box>
                <VStack align="start" spacing={1}>
                  <Heading size="md">{selectedTeam.name}</Heading>
                  {selectedTeam.description && (
                    <Text fontSize="xs" color="gray.500" maxW="400px">{selectedTeam.description}</Text>
                  )}
                  <HStack spacing={2}>
                    <Badge colorScheme="blue" fontSize="2xs" borderRadius="full" px={2} py={0.5}>
                      <Icon as={FiUsers} mr={1} /> {selectedTeam.activeMembers} members
                    </Badge>
                    {selectedTeam.teamChallengesEnabled && (
                      <Badge colorScheme="orange" fontSize="2xs" borderRadius="full" px={2} py={0.5}>
                        Challenges on
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              </HStack>
            </HStack>
          </SimpleGlassPanel>

          {/* Teammates - Premium avatar cards */}
          <SimpleGlassPanel p={5}>
            <VStack align="stretch" spacing={4}>
              <HStack>
                <Icon as={FiUsers} color="purple.400" />
                <Text fontSize="md" fontWeight="bold">Your Teammates</Text>
              </HStack>
              {teammates.length === 0 ? (
                <Box p={4} borderRadius="lg" bg="gray.50" textAlign="center">
                  <Text fontSize="sm" color="gray.400">You're the only one in this team so far! 🌟</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={4}>
                  {teammates.map((tm, i) => (
                    <VStack
                      key={i}
                      spacing={2}
                      p={3}
                      borderRadius="xl"
                      bg="rgba(159, 122, 234, 0.05)"
                      transition="all 0.2s"
                      _hover={{ transform: 'translateY(-3px)', bg: 'rgba(159, 122, 234, 0.1)' }}
                      animation={`${slideUp} 0.3s ease-out ${i * 0.08}s both`}
                    >
                      <Box position="relative">
                        <Avatar
                          size="lg"
                          name={tm.displayName}
                          bg={tm.role === 'captain' ? 'yellow.100' : 'purple.100'}
                          border="3px solid"
                          borderColor={tm.role === 'captain' ? 'yellow.300' : 'purple.200'}
                        />
                        {tm.role === 'captain' && (
                          <Box
                            position="absolute"
                            top="-4px"
                            right="-4px"
                            bg="yellow.400"
                            borderRadius="full"
                            w="24px" h="24px"
                            display="flex" alignItems="center" justifyContent="center"
                            fontSize="xs"
                            boxShadow="sm"
                          >
                            👑
                          </Box>
                        )}
                      </Box>
                      <Text fontSize="sm" fontWeight="bold" textAlign="center">{tm.displayName}</Text>
                      {tm.role === 'captain' && (
                        <Badge colorScheme="yellow" fontSize="2xs" borderRadius="full">Captain</Badge>
                      )}
                      {tm.completionStatus && (
                        <Badge
                          colorScheme={tm.completionStatus === 'completed' ? 'green' : tm.completionStatus === 'in_progress' ? 'blue' : 'gray'}
                          fontSize="2xs"
                          borderRadius="full"
                        >
                          {tm.completionStatus === 'completed' ? '✓ Done' : tm.completionStatus === 'in_progress' ? 'Working...' : 'Not started'}
                        </Badge>
                      )}
                    </VStack>
                  ))}
                </SimpleGrid>
              )}
            </VStack>
          </SimpleGlassPanel>

          {/* Team Activities - Premium challenge cards */}
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Icon as={FiTarget} color="purple.400" />
              <Text fontSize="md" fontWeight="bold">Team Challenges</Text>
            </HStack>

            {activities.length === 0 ? (
              <SimpleGlassPanel p={6}>
                <VStack spacing={2}>
                  <Text fontSize="3xl">🎯</Text>
                  <Text fontSize="sm" color="gray.400" textAlign="center">
                    No challenges yet. Your parent can assign team challenges!
                  </Text>
                </VStack>
              </SimpleGlassPanel>
            ) : (
              activities.map((act, idx) => {
                const myParticipation = act.participants.find((p) => p.childUserId === teams[0]?.members[0]?.childUserId);
                const myStatus = myParticipation?.status || 'not_started';
                const completedCount = act.participants.filter((p) => p.status === 'completed').length;
                const progressPct = act.participants.length > 0 ? (completedCount / act.participants.length) * 100 : 0;

                return (
                  <Box
                    key={act.id}
                    animation={`${slideUp} 0.3s ease-out ${idx * 0.08}s both`}
                  >
                    <SimpleGlassPanel p={5}>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Box
                              w="48px" h="48px" borderRadius="xl"
                              bgGradient="linear(135deg, orange.300, pink.400)"
                              display="flex" alignItems="center" justifyContent="center"
                              flexShrink={0}
                            >
                              <Text fontSize="2xl">{act.activityEmoji || ACTIVITY_TYPE_EMOJI[act.activityType] || '🎯'}</Text>
                            </Box>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="bold">{act.title}</Text>
                              {act.description && (
                                <Text fontSize="xs" color="gray.500" noOfLines={2}>{act.description}</Text>
                              )}
                            </VStack>
                          </HStack>
                          <Badge
                            colorScheme={act.status === 'completed' ? 'green' : act.status === 'in_progress' ? 'blue' : 'gray'}
                            borderRadius="full"
                            px={3} py={1}
                          >
                            {act.status === 'completed' ? 'Done' : act.status === 'in_progress' ? 'Active' : 'Waiting'}
                          </Badge>
                        </HStack>

                        {/* Team Progress Bar - Premium gradient */}
                        <Box>
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="xs" color="gray.500">
                              {completedCount}/{act.participants.length} teammates completed
                            </Text>
                            <Text fontSize="xs" fontWeight="bold" color="purple.500">
                              {Math.round(progressPct)}%
                            </Text>
                          </HStack>
                          <Progress
                            value={progressPct}
                            size="sm"
                            borderRadius="full"
                            bg="gray.100"
                            sx={{
                              '& > div': {
                                background: 'linear-gradient(90deg, #9f7aea, #d6bcfa)',
                              },
                            }}
                          />
                        </Box>

                        {/* Participant avatars */}
                        {act.participants.length > 0 && (
                          <HStack spacing={1}>
                            {act.participants.slice(0, 5).map((p, i) => (
                              <Tooltip key={i} label={`${p.childName}: ${p.status}`}>
                                <Box position="relative">
                                  <Avatar
                                    size="xs"
                                    name={p.childName}
                                    bg={p.status === 'completed' ? 'green.100' : p.status === 'in_progress' ? 'blue.100' : 'gray.100'}
                                  />
                                  {p.status === 'completed' && (
                                    <Box
                                      position="absolute"
                                      bottom="-2px"
                                      right="-2px"
                                      bg="green.400"
                                      borderRadius="full"
                                      w="12px" h="12px"
                                      display="flex" alignItems="center" justifyContent="center"
                                      fontSize="2xs"
                                      color="white"
                                      border="2px solid white"
                                    >
                                      ✓
                                    </Box>
                                  )}
                                </Box>
                              </Tooltip>
                            ))}
                            {act.participants.length > 5 && (
                              <Text fontSize="xs" color="gray.400" ml={1}>
                                +{act.participants.length - 5} more
                              </Text>
                            )}
                          </HStack>
                        )}

                        {/* Action Button - Premium styled */}
                        {myStatus === 'not_started' && act.status !== 'completed' && (
                          <Button
                            size="sm"
                            colorScheme="purple"
                            leftIcon={<FiZap />}
                            borderRadius="full"
                            boxShadow="0 4px 12px rgba(159, 122, 234, 0.3)"
                            _hover={{ transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(159, 122, 234, 0.4)' }}
                            transition="all 0.2s"
                            onClick={() => handleStartActivity(act.id)}
                          >
                            Start Challenge
                          </Button>
                        )}
                        {myStatus === 'in_progress' && (
                          <Button
                            size="sm"
                            colorScheme="green"
                            leftIcon={<FiAward />}
                            borderRadius="full"
                            boxShadow="0 4px 12px rgba(56, 161, 105, 0.3)"
                            _hover={{ transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(56, 161, 105, 0.4)' }}
                            transition="all 0.2s"
                            onClick={() => handleCompleteActivity(act.id)}
                          >
                            Mark as Done
                          </Button>
                        )}
                        {myStatus === 'completed' && (
                          <Badge colorScheme="green" alignSelf="start" borderRadius="full" px={3} py={1}>
                            <Icon as={FiAward} mr={1} /> You completed this! 🎉
                          </Badge>
                        )}
                      </VStack>
                    </SimpleGlassPanel>
                  </Box>
                );
              })
            )}
          </VStack>
        </>
      )}
    </VStack>
  );
}

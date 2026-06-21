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
} from '@chakra-ui/react';
import {
  FiUsers, FiTarget, FiChevronRight, FiZap, FiAward,
} from 'react-icons/fi';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

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
      <VStack justify="center" h="200px">
        <Spinner size="lg" color="purple.400" />
        <Text fontSize="sm" color="gray.500">Loading your teams...</Text>
      </VStack>
    );
  }

  if (teams.length === 0) {
    return (
      <VStack spacing={4} py={8}>
        <Text fontSize="4xl">🏆</Text>
        <Heading size="sm" color="gray.500">No Teams Yet</Heading>
        <Text fontSize="sm" color="gray.400" textAlign="center" maxW="300px">
          Ask your parent to create a learning team for you and your friends!
        </Text>
      </VStack>
    );
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <VStack spacing={4} align="stretch">
      {/* Team Selector */}
      {teams.length > 1 && (
        <HStack spacing={2} overflowX="auto">
          {teams.map((team) => (
            <Button
              key={team.id}
              size="sm"
              variant={team.id === selectedTeamId ? 'solid' : 'outline'}
              colorScheme="purple"
              onClick={() => setSelectedTeamId(team.id)}
              leftIcon={<Text>{team.teamEmoji}</Text>}
            >
              {team.name}
            </Button>
          ))}
        </HStack>
      )}

      {selectedTeam && (
        <>
          {/* Team Header */}
          <SimpleGlassPanel p={4}>
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="3xl">{selectedTeam.teamEmoji}</Text>
                <VStack align="start" spacing={0}>
                  <Heading size="sm">{selectedTeam.name}</Heading>
                  {selectedTeam.description && (
                    <Text fontSize="xs" color="gray.500">{selectedTeam.description}</Text>
                  )}
                </VStack>
              </HStack>
              <Badge colorScheme="blue">{selectedTeam.activeMembers} members</Badge>
            </HStack>
          </SimpleGlassPanel>

          {/* Teammates */}
          <SimpleGlassPanel p={4}>
            <VStack align="stretch" spacing={3}>
              <HStack>
                <Icon as={FiUsers} color="purple.400" />
                <Text fontSize="sm" fontWeight="bold">Your Teammates</Text>
              </HStack>
              {teammates.length === 0 ? (
                <Text fontSize="sm" color="gray.400">You're the only one in this team so far!</Text>
              ) : (
                <HStack spacing={4}>
                  {teammates.map((tm, i) => (
                    <VStack key={i} spacing={1}>
                      <Avatar size="md" name={tm.displayName} bg="purple.100" />
                      <Text fontSize="xs" fontWeight="medium">{tm.displayName}</Text>
                      {tm.role === 'captain' && (
                        <Badge colorScheme="yellow" fontSize="2xs">Captain</Badge>
                      )}
                      {tm.completionStatus && (
                        <Badge
                          colorScheme={tm.completionStatus === 'completed' ? 'green' : tm.completionStatus === 'in_progress' ? 'blue' : 'gray'}
                          fontSize="2xs"
                        >
                          {tm.completionStatus === 'completed' ? 'Done' : tm.completionStatus === 'in_progress' ? 'Working' : 'Not started'}
                        </Badge>
                      )}
                    </VStack>
                  ))}
                </HStack>
              )}
            </VStack>
          </SimpleGlassPanel>

          {/* Team Activities */}
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Icon as={FiTarget} color="purple.400" />
              <Text fontSize="sm" fontWeight="bold">Team Activities</Text>
            </HStack>

            {activities.length === 0 ? (
              <SimpleGlassPanel p={4}>
                <Text fontSize="sm" color="gray.400" textAlign="center">
                  No activities yet. Your parent can assign team challenges!
                </Text>
              </SimpleGlassPanel>
            ) : (
              activities.map((act) => {
                const myParticipation = act.participants.find((p) => p.childUserId === teams[0]?.members[0]?.childUserId);
                const myStatus = myParticipation?.status || 'not_started';
                const completedCount = act.participants.filter((p) => p.status === 'completed').length;

                return (
                  <SimpleGlassPanel key={act.id} p={4}>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <HStack>
                          <Text fontSize="2xl">{act.activityEmoji || ACTIVITY_TYPE_EMOJI[act.activityType] || '🎯'}</Text>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="bold">{act.title}</Text>
                            {act.description && (
                              <Text fontSize="xs" color="gray.500">{act.description}</Text>
                            )}
                          </VStack>
                        </HStack>
                        <Badge colorScheme={act.status === 'completed' ? 'green' : act.status === 'in_progress' ? 'blue' : 'gray'}>
                          {act.status}
                        </Badge>
                      </HStack>

                      {/* Team Progress */}
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500">
                          {completedCount}/{act.participants.length} teammates completed
                        </Text>
                        <Progress
                          value={act.participants.length > 0 ? (completedCount / act.participants.length) * 100 : 0}
                          size="xs"
                          colorScheme="purple"
                          flex={1}
                          borderRadius="full"
                        />
                      </HStack>

                      {/* Action Button */}
                      {myStatus === 'not_started' && act.status !== 'completed' && (
                        <Button
                          size="sm"
                          colorScheme="purple"
                          leftIcon={<FiZap />}
                          onClick={() => handleStartActivity(act.id)}
                        >
                          Start Activity
                        </Button>
                      )}
                      {myStatus === 'in_progress' && (
                        <Button
                          size="sm"
                          colorScheme="green"
                          leftIcon={<FiAward />}
                          onClick={() => handleCompleteActivity(act.id)}
                        >
                          Mark as Done
                        </Button>
                      )}
                      {myStatus === 'completed' && (
                        <Badge colorScheme="green" alignSelf="start">
                          ✓ You completed this!
                        </Badge>
                      )}
                    </VStack>
                  </SimpleGlassPanel>
                );
              })
            )}
          </VStack>
        </>
      )}
    </VStack>
  );
}

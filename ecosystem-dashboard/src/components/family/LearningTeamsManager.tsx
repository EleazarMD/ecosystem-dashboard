/**
 * Learning Teams Manager — Parent UI
 *
 * Parents can create teams of 2-3 children, assign their children to teams,
 * configure information flow controls, and assign team activities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Heading, Text, Button, IconButton, Badge,
  SimpleGrid, Spinner, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalCloseButton, ModalFooter, useDisclosure,
  Input, Textarea, Select, Checkbox, Divider, Tag, TagLabel, TagCloseButton,
  Avatar, Progress, Alert, AlertIcon, AlertTitle, AlertDescription,
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody,
  PopoverArrow, PopoverCloseButton, FormControl, FormLabel,
} from '@chakra-ui/react';
import {
  FiPlus, FiTrash2, FiUsers, FiSettings, FiRefreshCw, FiUserPlus,
  FiTarget, FiInfo, FiChevronRight, FiZap,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Team {
  id: string;
  name: string;
  description?: string;
  teamEmoji: string;
  parentUserId: string;
  maxMembers: number;
  infoFlowLevel: 'full' | 'limited' | 'anonymous';
  sharedActivitiesEnabled: boolean;
  peerComparisonEnabled: boolean;
  teamChallengesEnabled: boolean;
  isActive: boolean;
  members: TeamMember[];
  activeMembers: number;
  pendingActivities: number;
  completedActivities: number;
  activePaths: number;
}

interface TeamMember {
  id: string;
  teamId: string;
  childUserId: string;
  childName: string;
  role: 'member' | 'captain';
  displayNameToTeam?: string;
  joinedAt: string;
  isActive: boolean;
}

interface Child {
  id: string;
  name: string;
}

const INFO_FLOW_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  full: { label: 'Full Visibility', desc: 'Teammates see progress, achievements, and names', color: 'green' },
  limited: { label: 'Limited', desc: 'Teammates see first name + completion status only', color: 'yellow' },
  anonymous: { label: 'Anonymous', desc: 'Teammates see only team aggregate, no individual data', color: 'orange' },
};

export default function LearningTeamsManager() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activities, setActivities] = useState<any[]>([]);

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isActivityOpen, onOpen: onActivityOpen, onClose: onActivityClose } = useDisclosure();

  // Create form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    teamEmoji: '🏆',
    maxMembers: 3 as 2 | 3,
    infoFlowLevel: 'limited' as 'full' | 'limited' | 'anonymous',
    sharedActivitiesEnabled: true,
    peerComparisonEnabled: false,
    teamChallengesEnabled: true,
  });

  // Activity form state
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    activityEmoji: '🎯',
    activityType: 'challenge' as const,
    skillCode: '',
    subject: '',
    difficulty: 3,
  });

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/family/teams?action=list');
      const data = await res.json();
      if (res.ok) setTeams(data.teams || []);
    } catch (err: any) {
      toast({ title: 'Error loading teams', description: err.message, status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/family/teams?action=children');
      const data = await res.json();
      if (res.ok) setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchChildren();
  }, [fetchTeams, fetchChildren]);

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast({ title: 'Team name required', status: 'warning', duration: 3000 });
      return;
    }
    try {
      const res = await fetch('/api/family/teams?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam),
      });
      if (res.ok) {
        toast({ title: 'Team created!', status: 'success', duration: 3000 });
        onCreateClose();
        setNewTeam({ name: '', description: '', teamEmoji: '🏆', maxMembers: 3, infoFlowLevel: 'limited', sharedActivitiesEnabled: true, peerComparisonEnabled: false, teamChallengesEnabled: true });
        fetchTeams();
      } else {
        const data = await res.json();
        toast({ title: 'Failed to create team', description: data.error, status: 'error', duration: 5000 });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleAddMember = async (teamId: string, childUserId: string) => {
    try {
      const res = await fetch(`/api/family/teams?action=add-member&teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childUserId }),
      });
      if (res.ok) {
        toast({ title: 'Member added!', status: 'success', duration: 3000 });
        fetchTeams();
      } else {
        const data = await res.json();
        toast({ title: 'Failed to add member', description: data.error, status: 'error', duration: 5000 });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleRemoveMember = async (teamId: string, childUserId: string) => {
    try {
      const res = await fetch(`/api/family/teams?action=remove-member&teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childUserId }),
      });
      if (res.ok) {
        toast({ title: 'Member removed', status: 'info', duration: 3000 });
        fetchTeams();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/family/teams?teamId=${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Team deleted', status: 'info', duration: 3000 });
        fetchTeams();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedTeam || !newActivity.title.trim()) return;
    try {
      const res = await fetch(`/api/family/teams?action=create-activity&teamId=${selectedTeam.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity),
      });
      if (res.ok) {
        toast({ title: 'Activity created!', status: 'success', duration: 3000 });
        onActivityClose();
        setNewActivity({ title: '', description: '', activityEmoji: '🎯', activityType: 'challenge', skillCode: '', subject: '', difficulty: 3 });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 5000 });
    }
  };

  const handleFetchActivities = async (teamId: string) => {
    try {
      const res = await fetch(`/api/family/teams?action=activities&teamId=${teamId}`);
      const data = await res.json();
      if (res.ok) setActivities(data.activities || []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  };

  const availableChildren = (team: Team) =>
    children.filter((c) => !team.members.some((m) => m.childUserId === c.id));

  if (loading) {
    return (
      <VStack justify="center" h="300px">
        <Spinner size="xl" color="purple.400" />
        <Text color="gray.500">Loading teams...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Heading size="md">Learning Teams</Heading>
          <Text fontSize="sm" color="gray.500">
            Create small groups of 2-3 children for collaborative learning
          </Text>
        </VStack>
        <HStack>
          <IconButton aria-label="Refresh" icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={fetchTeams} />
          <Button leftIcon={<FiPlus />} colorScheme="purple" size="sm" onClick={onCreateOpen}>
            New Team
          </Button>
        </HStack>
      </HStack>

      {/* Info Banner */}
      <Alert status="info" borderRadius="md" variant="subtle">
        <AlertIcon as={FiInfo} />
        <Box>
          <AlertTitle fontSize="sm">About Learning Teams</AlertTitle>
          <AlertDescription fontSize="xs">
            Teams of 2-3 children can collaborate on shared activities. You control what team members can see about each other through information flow settings.
          </AlertDescription>
        </Box>
      </Alert>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <GlassPanel p={8}>
          <VStack spacing={4}>
            <FiUsers size={48} color="var(--chakra-colors-gray-300)" />
            <Heading size="sm" color="gray.500">No Teams Yet</Heading>
            <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
              Create your first learning team to start collaborative learning. Teams can include your own children and are limited to 2-3 members.
            </Text>
            <Button leftIcon={<FiPlus />} colorScheme="purple" onClick={onCreateOpen}>
              Create First Team
            </Button>
          </VStack>
        </GlassPanel>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {teams.map((team) => {
            const flowInfo = INFO_FLOW_LABELS[team.infoFlowLevel];
            return (
              <GlassPanel key={team.id} p={5}>
                <VStack align="stretch" spacing={3}>
                  {/* Team Header */}
                  <HStack justify="space-between">
                    <HStack>
                      <Text fontSize="2xl">{team.teamEmoji}</Text>
                      <VStack align="start" spacing={0}>
                        <Heading size="sm">{team.name}</Heading>
                        {team.description && (
                          <Text fontSize="xs" color="gray.500">{team.description}</Text>
                        )}
                      </VStack>
                    </HStack>
                    <IconButton
                      aria-label="Delete team"
                      icon={<FiTrash2 />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDeleteTeam(team.id)}
                    />
                  </HStack>

                  {/* Team Stats */}
                  <HStack spacing={3}>
                    <Badge colorScheme="blue" fontSize="xs">
                      {team.activeMembers}/{team.maxMembers} members
                    </Badge>
                    <Badge colorScheme={flowInfo.color} fontSize="xs">
                      {flowInfo.label}
                    </Badge>
                    {team.teamChallengesEnabled && (
                      <Badge colorScheme="purple" fontSize="xs">Challenges ON</Badge>
                    )}
                  </HStack>

                  {/* Members */}
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500">MEMBERS</Text>
                    {team.members.map((m) => (
                      <HStack key={m.id} justify="space-between">
                        <HStack>
                          <Avatar size="xs" name={m.childName} />
                          <Text fontSize="sm">{m.childName}</Text>
                          {m.role === 'captain' && (
                            <Badge colorScheme="yellow" fontSize="2xs">Captain</Badge>
                          )}
                        </HStack>
                        <IconButton
                          aria-label="Remove member"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleRemoveMember(team.id, m.childUserId)}
                        />
                      </HStack>
                    ))}
                    {/* Add member dropdown */}
                    {availableChildren(team).length > 0 && team.activeMembers < team.maxMembers && (
                      <Popover>
                        <PopoverTrigger>
                          <Button leftIcon={<FiUserPlus />} size="xs" variant="outline" colorScheme="purple" w="full">
                            Add Member
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <PopoverArrow />
                          <PopoverHeader fontSize="sm">Select child to add</PopoverHeader>
                          <PopoverBody>
                            <VStack align="stretch" spacing={2}>
                              {availableChildren(team).map((c) => (
                                <Button
                                  key={c.id}
                                  size="sm"
                                  variant="ghost"
                                  justifyContent="flex-start"
                                  onClick={() => handleAddMember(team.id, c.id)}
                                >
                                  <Avatar size="2xs" name={c.name} mr={2} />
                                  {c.name}
                                </Button>
                              ))}
                            </VStack>
                          </PopoverBody>
                        </PopoverContent>
                      </Popover>
                    )}
                  </VStack>

                  <Divider />

                  {/* Activity Stats */}
                  <HStack justify="space-between" fontSize="xs" color="gray.500">
                    <HStack>
                      <FiTarget />
                      <Text>{team.pendingActivities} pending · {team.completedActivities} completed</Text>
                    </HStack>
                    {team.activePaths > 0 && (
                      <HStack>
                        <FiZap />
                        <Text>{team.activePaths} active paths</Text>
                      </HStack>
                    )}
                  </VStack>

                  {/* Actions */}
                  <Button
                    leftIcon={<FiTarget />}
                    size="sm"
                    colorScheme="purple"
                    variant="outline"
                    onClick={() => {
                      setSelectedTeam(team);
                      handleFetchActivities(team.id);
                      onActivityOpen();
                    }}
                  >
                    Manage Activities
                  </Button>
                </VStack>
              </GlassPanel>
            );
          })}
        </SimpleGrid>
      )}

      {/* Create Team Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Learning Team</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Team Name</FormLabel>
                <Input
                  placeholder="e.g., The Explorers"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Description (optional)</FormLabel>
                <Textarea
                  placeholder="What will this team focus on?"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  rows={2}
                />
              </FormControl>

              <HStack>
                <FormControl>
                  <FormLabel fontSize="sm">Team Emoji</FormLabel>
                  <Input
                    placeholder="🏆"
                    value={newTeam.teamEmoji}
                    onChange={(e) => setNewTeam({ ...newTeam, teamEmoji: e.target.value })}
                    maxLength={2}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Max Members</FormLabel>
                  <Select
                    value={newTeam.maxMembers}
                    onChange={(e) => setNewTeam({ ...newTeam, maxMembers: parseInt(e.target.value) as 2 | 3 })}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontSize="sm">Information Flow Level</FormLabel>
                <Select
                  value={newTeam.infoFlowLevel}
                  onChange={(e) => setNewTeam({ ...newTeam, infoFlowLevel: e.target.value as any })}
                >
                  <option value="full">Full — teammates see progress, achievements, names</option>
                  <option value="limited">Limited — first name + completion status only</option>
                  <option value="anonymous">Anonymous — pseudonyms, no individual data</option>
                </Select>
              </FormControl>

              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="bold">Team Features</Text>
                <Checkbox
                  isChecked={newTeam.sharedActivitiesEnabled}
                  onChange={(e) => setNewTeam({ ...newTeam, sharedActivitiesEnabled: e.target.checked })}
                >
                  Shared Activities
                </Checkbox>
                <Checkbox
                  isChecked={newTeam.teamChallengesEnabled}
                  onChange={(e) => setNewTeam({ ...newTeam, teamChallengesEnabled: e.target.checked })}
                >
                  Team Challenges
                </Checkbox>
                <Checkbox
                  isChecked={newTeam.peerComparisonEnabled}
                  onChange={(e) => setNewTeam({ ...newTeam, peerComparisonEnabled: e.target.checked })}
                >
                  Peer Comparison (show how teammates are doing)
                </Checkbox>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>Cancel</Button>
            <Button colorScheme="purple" onClick={handleCreateTeam}>Create Team</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Activities Modal */}
      <Modal isOpen={isActivityOpen} onClose={onActivityClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedTeam && `${selectedTeam.teamEmoji} ${selectedTeam.name} — Activities`}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Existing Activities */}
              {activities.length > 0 && (
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="sm" fontWeight="bold">Current Activities</Text>
                  {activities.map((act) => (
                    <Box key={act.id} p={3} borderRadius="md" bg="gray.50">
                      <HStack justify="space-between">
                        <HStack>
                          <Text fontSize="lg">{act.activityEmoji}</Text>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium">{act.title}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {act.activityType} · {act.status}
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge colorScheme={act.status === 'completed' ? 'green' : act.status === 'in_progress' ? 'blue' : 'gray'}>
                          {act.status}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              )}

              <Divider />

              {/* Create New Activity */}
              <Text fontSize="sm" fontWeight="bold">Create New Activity</Text>
              <Input
                placeholder="Activity title"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
              />
              <Textarea
                placeholder="What should the team do?"
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                rows={2}
              />
              <HStack>
                <Input
                  placeholder="🎯"
                  value={newActivity.activityEmoji}
                  onChange={(e) => setNewActivity({ ...newActivity, activityEmoji: e.target.value })}
                  maxLength={2}
                  w="80px"
                />
                <Select
                  value={newActivity.activityType}
                  onChange={(e) => setNewActivity({ ...newActivity, activityType: e.target.value as any })}
                >
                  <option value="challenge">Challenge</option>
                  <option value="collaborative">Collaborative</option>
                  <option value="discussion">Discussion</option>
                  <option value="quiz_battle">Quiz Battle</option>
                  <option value="team_quest">Team Quest</option>
                </Select>
                <Select
                  value={newActivity.difficulty}
                  onChange={(e) => setNewActivity({ ...newActivity, difficulty: parseInt(e.target.value) })}
                >
                  <option value={1}>Easy</option>
                  <option value={2}>Medium-Easy</option>
                  <option value={3}>Medium</option>
                  <option value={4}>Hard</option>
                  <option value={5}>Expert</option>
                </Select>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onActivityClose}>Close</Button>
            <Button colorScheme="purple" onClick={handleCreateActivity} isDisabled={!newActivity.title.trim()}>
              Create Activity
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

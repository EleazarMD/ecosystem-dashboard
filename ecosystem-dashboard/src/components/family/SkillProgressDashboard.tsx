/**
 * Skill Progress Dashboard
 * 
 * Parent-facing dashboard for viewing child's skill-based progress:
 * - Skill domains with proficiency levels
 * - TEKS curriculum alignment
 * - Milestones and achievements
 * - Progress trends over time
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Progress,
  Badge,
  Button,
  IconButton,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tooltip,
  useToast,
  Spinner,
  Icon,
  CircularProgress,
  CircularProgressLabel,
  Wrap,
  WrapItem,
  Collapse,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  FiBook,
  FiEdit3,
  FiHash,
  FiCpu,
  FiMessageCircle,
  FiImage,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiAward,
  FiTarget,
  FiCheckCircle,
  FiRefreshCw,
  FiChevronRight,
  FiInfo,
  FiFlag,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

// ============================================================================
// Types
// ============================================================================

interface ProficiencyLevel {
  code: string;
  name: string;
  color: string;
  icon: string;
}

interface SkillProgress {
  skillId: string;
  skillCode: string;
  skillName: string;
  domainCode: string;
  domainName: string;
  currentScore: number;
  proficiencyLevel: ProficiencyLevel;
  trend: 'improving' | 'stable' | 'declining';
  assessmentsCount: number;
  streakDays: number;
  milestonesCompleted: number;
}

interface DomainProgress {
  domain: {
    code: string;
    name: string;
    icon: string;
    color: string;
  };
  avgScore: number;
  proficiencyLevel: string;
  skillsCount: number;
  skillsProficient: number;
  trend: string;
  skills: SkillProgress[];
}

interface SkillMilestone {
  id: string;
  skillId: string;
  gradeLevel: string;
  proficiencyLevel: string;
  title: string;
  description: string;
  successIndicators: string[];
  achieved: boolean;
  achievedAt?: string;
}

interface TEKSProgress {
  standard: {
    standardCode: string;
    fullCode: string;
    subject: string;
    domain: string;
    gradeLevel: string;
    title: string;
  };
  progress: number;
  proficiency: string;
  skills: { code: string; name: string; score: number }[];
}

interface CurriculumSettings {
  curriculumEnabled: boolean;
  frameworkCode?: string;
  frameworkName?: string;
  gradeLevel?: string;
  showStandardCodes: boolean;
}

interface CurriculumAlignment {
  frameworkName: string;
  standardsAligned: number;
  standardsMastered: number;
  nextStandards: any[];
}

interface ChildSkillSummary {
  childId: string;
  childName: string;
  gradeLevel: string;
  overallScore: number;
  overallProficiency: string;
  domains: DomainProgress[];
  recentMilestones: SkillMilestone[];
  recommendedActivities: string[];
  curriculumSettings: CurriculumSettings;
  curriculumAlignment?: CurriculumAlignment;  // OPTIONAL - only if enabled
}

interface SkillProgressDashboardProps {
  childId: string;
  childName?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

const getDomainIcon = (code: string) => {
  switch (code) {
    case 'reading': return FiBook;
    case 'writing': return FiEdit3;
    case 'math': return FiHash;
    case 'analytical': return FiCpu;
    case 'communication': return FiMessageCircle;
    case 'creativity': return FiImage;
    default: return FiTarget;
  }
};

const getProficiencyColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'advanced': return 'teal';
    case 'proficient': return 'green';
    case 'developing': return 'yellow';
    case 'emerging': return 'red';
    default: return 'gray';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return <Icon as={FiTrendingUp} color="green.500" />;
    case 'declining': return <Icon as={FiTrendingDown} color="orange.500" />;
    default: return <Icon as={FiMinus} color="gray.500" />;
  }
};

const ProficiencyBadge: React.FC<{ level: string }> = ({ level }) => (
  <Badge
    colorScheme={getProficiencyColor(level)}
    px={2}
    py={1}
    borderRadius="full"
    fontSize="xs"
  >
    {level}
  </Badge>
);

const SkillProgressBar: React.FC<{ skill: SkillProgress }> = ({ skill }) => (
  <Box>
    <HStack justify="space-between" mb={1}>
      <Text fontSize="sm" fontWeight="medium">{skill.skillName}</Text>
      <HStack spacing={2}>
        {getTrendIcon(skill.trend)}
        <ProficiencyBadge level={skill.proficiencyLevel?.name || 'Emerging'} />
      </HStack>
    </HStack>
    <Progress
      value={skill.currentScore * 100}
      size="sm"
      borderRadius="full"
      colorScheme={getProficiencyColor(skill.proficiencyLevel?.name)}
      bg="gray.100"
    />
    <HStack justify="space-between" mt={1}>
      <Text fontSize="xs" color="gray.500">
        {Math.round(skill.currentScore * 100)}% mastery
      </Text>
      <Text fontSize="xs" color="gray.500">
        {skill.assessmentsCount} assessments
      </Text>
    </HStack>
  </Box>
);

// ============================================================================
// Main Component
// ============================================================================

export default function SkillProgressDashboard({ childId, childName }: SkillProgressDashboardProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ChildSkillSummary | null>(null);
  const [teksProgress, setTeksProgress] = useState<TEKSProgress[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/family/skill-progress?action=summary&childId=${childId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch skill progress');
      }

      setSummary(data.data);
      if (data.data?.gradeLevel) {
        setSelectedGrade(data.data.gradeLevel);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error loading skill progress',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [childId, toast]);

  const fetchTEKSProgress = useCallback(async (grade: string) => {
    try {
      const res = await fetch(`/api/family/skill-progress?action=teks&childId=${childId}&grade=${grade}`);
      const data = await res.json();
      if (res.ok) {
        setTeksProgress(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch TEKS progress:', err);
    }
  }, [childId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (selectedGrade) {
      fetchTEKSProgress(selectedGrade);
    }
  }, [selectedGrade, fetchTEKSProgress]);

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading skill progress...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <AlertDescription>No skill progress data available yet. Progress will appear as activities are completed!</AlertDescription>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Heading size="md">{summary.childName}'s Skill Progress</Heading>
          <Text fontSize="sm" color="gray.500">
            Grade {summary.gradeLevel || 'Not set'} • Competency-based tracking
          </Text>
        </VStack>
        <IconButton
          aria-label="Refresh"
          icon={<FiRefreshCw />}
          size="sm"
          variant="ghost"
          onClick={fetchSummary}
        />
      </HStack>

      {/* Overall Progress Card */}
      <GlassPanel p={5}>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <VStack>
            <CircularProgress
              value={summary.overallScore * 100}
              color={getProficiencyColor(summary.overallProficiency) + '.400'}
              size="100px"
              thickness="8px"
            >
              <CircularProgressLabel>
                <VStack spacing={0}>
                  <Text fontSize="xl" fontWeight="bold">
                    {Math.round(summary.overallScore * 100)}%
                  </Text>
                  <Text fontSize="xs" color="gray.500">Overall</Text>
                </VStack>
              </CircularProgressLabel>
            </CircularProgress>
            <ProficiencyBadge level={summary.overallProficiency} />
          </VStack>

          <Stat textAlign="center">
            <StatLabel>Domains</StatLabel>
            <StatNumber>{summary.domains.length}</StatNumber>
            <StatHelpText>Skill areas tracked</StatHelpText>
          </Stat>

          {summary.curriculumAlignment ? (
            <Stat textAlign="center">
              <StatLabel>{summary.curriculumSettings.frameworkName || 'Curriculum'}</StatLabel>
              <StatNumber>
                {summary.curriculumAlignment.standardsMastered}/{summary.curriculumAlignment.standardsAligned}
              </StatNumber>
              <StatHelpText>Standards mastered</StatHelpText>
            </Stat>
          ) : (
            <Stat textAlign="center">
              <StatLabel>Curriculum</StatLabel>
              <StatNumber>—</StatNumber>
              <StatHelpText>Not enabled</StatHelpText>
            </Stat>
          )}

          <Stat textAlign="center">
            <StatLabel>Milestones</StatLabel>
            <StatNumber>{summary.recentMilestones.length}</StatNumber>
            <StatHelpText>Recently achieved</StatHelpText>
          </Stat>
        </SimpleGrid>
      </GlassPanel>

      {/* Tabbed Content */}
      <Tabs colorScheme="purple" variant="enclosed">
        <TabList>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiTarget} />
              <Text>Skills by Domain</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiFlag} />
              <Text>Curriculum</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiAward} />
              <Text>Milestones</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* Skills by Domain Tab */}
          <TabPanel px={0}>
            <Accordion allowMultiple defaultIndex={[0]}>
              {summary.domains.map((domain, idx) => (
                <AccordionItem key={domain.domain.code} border="none" mb={3}>
                  <GlassPanel>
                    <AccordionButton py={4} _hover={{ bg: 'transparent' }}>
                      <HStack flex="1" spacing={3}>
                        <Icon
                          as={getDomainIcon(domain.domain.code)}
                          boxSize={6}
                          color={`${getProficiencyColor(domain.proficiencyLevel)}.500`}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{domain.domain.name}</Text>
                          <Text fontSize="xs" color="gray.500">
                            {domain.skillsProficient}/{domain.skillsCount} skills proficient
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack spacing={3}>
                        {getTrendIcon(domain.trend)}
                        <ProficiencyBadge level={domain.proficiencyLevel} />
                        <CircularProgress
                          value={domain.avgScore * 100}
                          color={`${getProficiencyColor(domain.proficiencyLevel)}.400`}
                          size="40px"
                          thickness="10px"
                        >
                          <CircularProgressLabel fontSize="xs">
                            {Math.round(domain.avgScore * 100)}%
                          </CircularProgressLabel>
                        </CircularProgress>
                        <AccordionIcon />
                      </HStack>
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={4}>
                        {domain.skills.map((skill) => (
                          <SkillProgressBar key={skill.skillId} skill={skill} />
                        ))}
                        {domain.skills.length === 0 && (
                          <Text fontSize="sm" color="gray.500" textAlign="center">
                            No skills tracked yet in this domain
                          </Text>
                        )}
                      </VStack>
                    </AccordionPanel>
                  </GlassPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </TabPanel>

          {/* Curriculum Alignment Tab (OPTIONAL) */}
          <TabPanel px={0}>
            {!summary.curriculumSettings.curriculumEnabled ? (
              <GlassPanel p={5}>
                <VStack spacing={4} py={6}>
                  <Icon as={FiFlag} boxSize={12} color="gray.300" />
                  <Heading size="sm" color="gray.500">Curriculum Alignment Not Enabled</Heading>
                  <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
                    Curriculum alignment is optional. Your child's skills are tracked using our 
                    universal, research-based framework that works for all children.
                  </Text>
                  <Text fontSize="xs" color="gray.400" textAlign="center">
                    To enable alignment with Texas TEKS, Common Core, or other standards, 
                    visit Family Settings → Curriculum Preferences.
                  </Text>
                </VStack>
              </GlassPanel>
            ) : (
              <>
                <GlassPanel p={5} mb={4}>
                  <HStack justify="space-between" mb={4}>
                    <VStack align="start" spacing={0}>
                      <Heading size="sm">{summary.curriculumSettings.frameworkName || 'Curriculum'} Alignment</Heading>
                      <Text fontSize="xs" color="gray.500">
                        Track progress against {summary.curriculumSettings.frameworkName || 'curriculum'} standards
                      </Text>
                    </VStack>
                    <Select
                      size="sm"
                      w="100px"
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                    >
                      <option value="K">Grade K</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                    </Select>
                  </HStack>

                  {teksProgress.length > 0 ? (
                    <VStack align="stretch" spacing={3}>
                      {teksProgress.map((item, idx) => (
                        <Box
                          key={idx}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                          borderLeft="4px solid"
                          borderLeftColor={`${getProficiencyColor(item.proficiency)}.400`}
                        >
                          <HStack justify="space-between" mb={2}>
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Badge colorScheme="blue" fontSize="xs">{item.standard.fullCode}</Badge>
                                <Text fontSize="sm" fontWeight="medium">{item.standard.title}</Text>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {item.standard.subject} • {item.standard.domain}
                              </Text>
                            </VStack>
                            <ProficiencyBadge level={item.proficiency} />
                          </HStack>
                          <Progress
                            value={item.progress * 100}
                            size="sm"
                            borderRadius="full"
                            colorScheme={getProficiencyColor(item.proficiency)}
                          />
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {Math.round(item.progress * 100)}% mastery • {item.skills.length} related skills
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                      No standards mapped for Grade {selectedGrade} yet
                    </Text>
                  )}
                </GlassPanel>

                {/* Next Standards to Work On - only if curriculum enabled */}
                {summary.curriculumAlignment && summary.curriculumAlignment.nextStandards.length > 0 && (
                  <GlassPanel p={5}>
                    <Heading size="sm" mb={3}>📚 Next Standards to Focus On</Heading>
                    <VStack align="stretch" spacing={2}>
                      {summary.curriculumAlignment.nextStandards.map((std, idx) => (
                        <HStack key={idx} p={2} bg="blue.50" borderRadius="md">
                          <Icon as={FiChevronRight} color="blue.500" />
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium">{std.title}</Text>
                            <Text fontSize="xs" color="gray.500">{std.fullCode}</Text>
                          </VStack>
                        </HStack>
                      ))}
                    </VStack>
                  </GlassPanel>
                )}
              </>
            )}
          </TabPanel>

          {/* Milestones Tab */}
          <TabPanel px={0}>
            <GlassPanel p={5}>
              <Heading size="sm" mb={4}>🏆 Recent Milestones</Heading>
              {summary.recentMilestones.length > 0 ? (
                <VStack align="stretch" spacing={3}>
                  {summary.recentMilestones.map((milestone, idx) => (
                    <HStack
                      key={idx}
                      p={3}
                      bg="yellow.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="yellow.200"
                    >
                      <Icon as={FiAward} boxSize={6} color="yellow.500" />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="medium">{milestone.title}</Text>
                        <Text fontSize="xs" color="gray.500">{milestone.description}</Text>
                        {milestone.achievedAt && (
                          <Text fontSize="xs" color="gray.400">
                            Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </VStack>
                      <ProficiencyBadge level={milestone.proficiencyLevel} />
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                  No milestones achieved yet. Keep learning!
                </Text>
              )}
            </GlassPanel>

            {/* Recommended Activities */}
            {summary.recommendedActivities.length > 0 && (
              <GlassPanel p={5} mt={4}>
                <Heading size="sm" mb={3}>💡 Recommended Activities</Heading>
                <VStack align="stretch" spacing={2}>
                  {summary.recommendedActivities.map((activity, idx) => (
                    <HStack key={idx} p={2} bg="green.50" borderRadius="md">
                      <Icon as={FiCheckCircle} color="green.500" />
                      <Text fontSize="sm">{activity}</Text>
                    </HStack>
                  ))}
                </VStack>
              </GlassPanel>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Info Footer */}
      <Alert status="info" borderRadius="md" variant="subtle">
        <AlertIcon as={FiInfo} />
        <Box>
          <AlertTitle fontSize="sm">About Skill Tracking</AlertTitle>
          <AlertDescription fontSize="xs">
            Skills are assessed based on activities like reading, writing, and problem-solving. 
            Progress aligns with Texas TEKS curriculum standards for Grade {summary.gradeLevel || 'K-8'}.
          </AlertDescription>
        </Box>
      </Alert>
    </VStack>
  );
}

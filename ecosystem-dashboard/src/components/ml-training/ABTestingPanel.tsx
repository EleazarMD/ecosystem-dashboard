/**
 * A/B Testing Panel for Kids Portal
 * 
 * Manage experiments for recipe parameters, hints, and UI components
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Spinner,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  IconButton,
  useDisclosure,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import {
  BeakerIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PencilIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

interface Experiment {
  id: string;
  name: string;
  description: string;
  experiment_type: string;
  target_audience: string;
  target_themes: string[];
  target_age_min: number | null;
  target_age_max: number | null;
  traffic_percentage: number;
  status: string;
  primary_metric: string;
  variant_count: number;
  enrolled_users: number;
  created_at: string;
}

interface Variant {
  id: string;
  experiment_id: string;
  name: string;
  description: string;
  is_control: boolean;
  weight: number;
  config: Record<string, any>;
  enrolled_users?: number;
  event_count?: number;
}

const EXPERIMENT_TYPES = [
  { value: 'recipe_parameter', label: 'Recipe Parameters', description: 'Temperature, max_tokens, etc.' },
  { value: 'hint_injection', label: 'Hint Injection', description: 'Which hints to inject' },
  { value: 'character', label: 'Character/Recipe', description: 'Different character personas' },
  { value: 'ui_component', label: 'UI Component', description: 'Chat bubble styles, colors' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  running: 'green',
  paused: 'yellow',
  completed: 'blue',
  archived: 'gray',
};

export default function ABTestingPanel() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isVariantOpen, onOpen: onVariantOpen, onClose: onVariantClose } = useDisclosure();
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ab-testing/experiments');
      const data = await response.json();
      setExperiments(data.experiments || []);
    } catch (error) {
      toast({ title: 'Failed to load experiments', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/ab-testing/experiments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status: newStatus,
          start_date: newStatus === 'running' ? new Date().toISOString() : undefined,
          end_date: newStatus === 'completed' ? new Date().toISOString() : undefined,
        }),
      });

      if (response.ok) {
        toast({ title: `Experiment ${newStatus}`, status: 'success' });
        fetchExperiments();
      }
    } catch (error) {
      toast({ title: 'Failed to update status', status: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;

    try {
      const response = await fetch(`/api/ab-testing/experiments?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Experiment deleted', status: 'success' });
        fetchExperiments();
      }
    } catch (error) {
      toast({ title: 'Failed to delete experiment', status: 'error' });
    }
  };

  const selectExperiment = async (exp: Experiment) => {
    setSelectedExperiment(exp);
    try {
      const response = await fetch(`/api/ab-testing/variants?experiment_id=${exp.id}`);
      const data = await response.json();
      setVariants(data.variants || []);
    } catch (error) {
      toast({ title: 'Failed to load variants', status: 'error' });
    }
  };

  if (loading) {
    return (
      <VStack h="300px" justify="center">
        <Spinner size="xl" color="purple.500" />
        <Text color={textSecondary}>Loading A/B tests...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
            A/B Testing - Kids Portal
          </Text>
          <Text color={textSecondary}>
            Run controlled experiments on recipes, hints, and UI components
          </Text>
        </Box>
        <Button leftIcon={<PlusIcon className="w-4 h-4" />} colorScheme="purple" onClick={onOpen}>
          New Experiment
        </Button>
      </HStack>

      {/* Stats Overview */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <StatCard
          label="Active Experiments"
          value={experiments.filter(e => e.status === 'running').length}
          color="green"
        />
        <StatCard
          label="Draft Experiments"
          value={experiments.filter(e => e.status === 'draft').length}
          color="gray"
        />
        <StatCard
          label="Total Enrolled Users"
          value={experiments.reduce((sum, e) => sum + (e.enrolled_users || 0), 0)}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={experiments.filter(e => e.status === 'completed').length}
          color="purple"
        />
      </SimpleGrid>

      {/* Main Content */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Experiments List */}
        <SimpleGlassPanel variant="medium" p={4}>
          <Text fontSize="lg" fontWeight="bold" mb={4}>Experiments</Text>
          <VStack spacing={3} align="stretch">
            {experiments.length === 0 ? (
              <Text color={textSecondary} textAlign="center" py={8}>
                No experiments yet. Create your first A/B test!
              </Text>
            ) : (
              experiments.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  isSelected={selectedExperiment?.id === exp.id}
                  onSelect={() => selectExperiment(exp)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))
            )}
          </VStack>
        </SimpleGlassPanel>

        {/* Experiment Details */}
        <SimpleGlassPanel variant="medium" p={4}>
          {selectedExperiment ? (
            <ExperimentDetails
              experiment={selectedExperiment}
              variants={variants}
              onVariantOpen={onVariantOpen}
              onRefresh={() => selectExperiment(selectedExperiment)}
            />
          ) : (
            <VStack h="300px" justify="center">
              <BeakerIcon className="w-12 h-12 text-gray-400" />
              <Text color={textSecondary}>Select an experiment to view details</Text>
            </VStack>
          )}
        </SimpleGlassPanel>
      </SimpleGrid>

      {/* Create Experiment Modal */}
      <CreateExperimentModal
        isOpen={isOpen}
        onClose={onClose}
        onCreated={() => {
          fetchExperiments();
          onClose();
        }}
      />

      {/* Create Variant Modal */}
      {selectedExperiment && (
        <CreateVariantModal
          isOpen={isVariantOpen}
          onClose={onVariantClose}
          experimentId={selectedExperiment.id}
          experimentType={selectedExperiment.experiment_type}
          onCreated={() => {
            selectExperiment(selectedExperiment);
            onVariantClose();
          }}
        />
      )}
    </VStack>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <SimpleGlassPanel variant="light" p={4}>
      <Stat>
        <StatLabel color="gray.500">{label}</StatLabel>
        <StatNumber color={`${color}.500`}>{value}</StatNumber>
      </Stat>
    </SimpleGlassPanel>
  );
}

// Experiment Card Component
function ExperimentCard({
  experiment,
  isSelected,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  experiment: Experiment;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const borderColor = useSemanticToken('border.subtle');

  return (
    <Box
      p={4}
      borderRadius="md"
      border="1px solid"
      borderColor={isSelected ? 'purple.500' : borderColor}
      bg={isSelected ? 'purple.50' : 'transparent'}
      cursor="pointer"
      onClick={onSelect}
      _hover={{ borderColor: 'purple.300' }}
      transition="all 0.2s"
    >
      <HStack justify="space-between" mb={2}>
        <HStack>
          <Text fontWeight="bold">{experiment.name}</Text>
          <Badge colorScheme={STATUS_COLORS[experiment.status]}>{experiment.status}</Badge>
        </HStack>
        <HStack spacing={1}>
          {experiment.status === 'draft' && (
            <IconButton
              aria-label="Start"
              icon={<PlayIcon className="w-4 h-4" />}
              size="sm"
              colorScheme="green"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onStatusChange(experiment.id, 'running'); }}
            />
          )}
          {experiment.status === 'running' && (
            <IconButton
              aria-label="Pause"
              icon={<PauseIcon className="w-4 h-4" />}
              size="sm"
              colorScheme="yellow"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onStatusChange(experiment.id, 'paused'); }}
            />
          )}
          {experiment.status !== 'running' && (
            <IconButton
              aria-label="Delete"
              icon={<TrashIcon className="w-4 h-4" />}
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onDelete(experiment.id); }}
            />
          )}
        </HStack>
      </HStack>
      <Text fontSize="sm" color="gray.600" noOfLines={1}>{experiment.description}</Text>
      <HStack mt={2} spacing={4} fontSize="xs" color="gray.500">
        <HStack>
          <UserGroupIcon className="w-3 h-3" />
          <Text>{experiment.enrolled_users || 0} users</Text>
        </HStack>
        <HStack>
          <BeakerIcon className="w-3 h-3" />
          <Text>{experiment.variant_count || 0} variants</Text>
        </HStack>
        <Badge size="sm" variant="outline">{experiment.experiment_type}</Badge>
      </HStack>
    </Box>
  );
}

// Experiment Details Component
function ExperimentDetails({
  experiment,
  variants,
  onVariantOpen,
  onRefresh,
}: {
  experiment: Experiment;
  variants: Variant[];
  onVariantOpen: () => void;
  onRefresh: () => void;
}) {
  const textSecondary = useSemanticToken('text.secondary');

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="bold">{experiment.name}</Text>
        <Badge colorScheme={STATUS_COLORS[experiment.status]} size="lg">{experiment.status}</Badge>
      </HStack>

      <Text color={textSecondary}>{experiment.description}</Text>

      <Divider />

      {/* Targeting */}
      <Box>
        <Text fontWeight="semibold" mb={2}>Targeting</Text>
        <SimpleGrid columns={2} spacing={2} fontSize="sm">
          <Text color={textSecondary}>Audience:</Text>
          <Text>{experiment.target_audience}</Text>
          <Text color={textSecondary}>Themes:</Text>
          <Text>{experiment.target_themes?.length ? experiment.target_themes.join(', ') : 'All'}</Text>
          <Text color={textSecondary}>Age Range:</Text>
          <Text>
            {experiment.target_age_min || 'Any'} - {experiment.target_age_max || 'Any'}
          </Text>
          <Text color={textSecondary}>Traffic:</Text>
          <Text>{experiment.traffic_percentage}%</Text>
        </SimpleGrid>
      </Box>

      <Divider />

      {/* Variants */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="semibold">Variants</Text>
          {experiment.status === 'draft' && (
            <Button size="sm" leftIcon={<PlusIcon className="w-3 h-3" />} onClick={onVariantOpen}>
              Add Variant
            </Button>
          )}
        </HStack>

        <VStack spacing={3} align="stretch">
          {variants.map((variant) => (
            <Box
              key={variant.id}
              p={3}
              borderRadius="md"
              border="1px solid"
              borderColor={variant.is_control ? 'blue.200' : 'gray.200'}
              bg={variant.is_control ? 'blue.50' : 'gray.50'}
            >
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <Text fontWeight="medium">{variant.name}</Text>
                  {variant.is_control && <Badge colorScheme="blue">Control</Badge>}
                </HStack>
                <Text fontSize="sm" color={textSecondary}>
                  {Math.round((variant.weight / totalWeight) * 100)}% traffic
                </Text>
              </HStack>
              <Progress
                value={(variant.weight / totalWeight) * 100}
                size="sm"
                colorScheme={variant.is_control ? 'blue' : 'purple'}
                borderRadius="full"
              />
              {variant.description && (
                <Text fontSize="sm" color={textSecondary} mt={2}>{variant.description}</Text>
              )}
              {Object.keys(variant.config).length > 0 && (
                <Accordion allowToggle mt={2}>
                  <AccordionItem border="none">
                    <AccordionButton px={0} py={1}>
                      <Text fontSize="xs" color={textSecondary}>View Config</Text>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel px={0}>
                      <Code fontSize="xs" p={2} borderRadius="md" display="block" whiteSpace="pre">
                        {JSON.stringify(variant.config, null, 2)}
                      </Code>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              )}
              <HStack mt={2} fontSize="xs" color={textSecondary}>
                <Text>{variant.enrolled_users || 0} users</Text>
                <Text>•</Text>
                <Text>{variant.event_count || 0} events</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Metrics */}
      {experiment.primary_metric && (
        <>
          <Divider />
          <Box>
            <Text fontWeight="semibold" mb={2}>Metrics</Text>
            <Text fontSize="sm">
              <Text as="span" color={textSecondary}>Primary: </Text>
              {experiment.primary_metric}
            </Text>
          </Box>
        </>
      )}
    </VStack>
  );
}

// Create Experiment Modal
function CreateExperimentModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    experiment_type: 'recipe_parameter',
    target_audience: 'child',
    target_themes: [] as string[],
    target_age_min: null as number | null,
    target_age_max: null as number | null,
    traffic_percentage: 100,
    primary_metric: 'response_length',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: 'Name is required', status: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ab-testing/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({ title: 'Experiment created', status: 'success' });
        onCreated();
        setFormData({
          name: '',
          description: '',
          experiment_type: 'recipe_parameter',
          target_audience: 'child',
          target_themes: [],
          target_age_min: null,
          target_age_max: null,
          traffic_percentage: 100,
          primary_metric: 'response_length',
        });
      } else {
        const error = await response.json();
        toast({ title: error.error || 'Failed to create', status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to create experiment', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Experiment</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Experiment Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Temperature Optimization Test"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What are you testing and why?"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Experiment Type</FormLabel>
              <Select
                value={formData.experiment_type}
                onChange={(e) => setFormData({ ...formData, experiment_type: e.target.value })}
              >
                {EXPERIMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </Select>
            </FormControl>

            <SimpleGrid columns={2} spacing={4} w="full">
              <FormControl>
                <FormLabel>Target Themes</FormLabel>
                <Select
                  placeholder="All themes"
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({
                        ...formData,
                        target_themes: [...formData.target_themes, e.target.value],
                      });
                    }
                  }}
                >
                  <option value="pusheen">Pusheen</option>
                  <option value="minecraft">Minecraft</option>
                  <option value="space">Space</option>
                  <option value="science">Science</option>
                </Select>
                {formData.target_themes.length > 0 && (
                  <HStack mt={2} flexWrap="wrap">
                    {formData.target_themes.map((theme) => (
                      <Badge
                        key={theme}
                        cursor="pointer"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            target_themes: formData.target_themes.filter((t) => t !== theme),
                          })
                        }
                      >
                        {theme} ×
                      </Badge>
                    ))}
                  </HStack>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Traffic %</FormLabel>
                <NumberInput
                  value={formData.traffic_percentage}
                  onChange={(_, val) => setFormData({ ...formData, traffic_percentage: val })}
                  min={1}
                  max={100}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={4} w="full">
              <FormControl>
                <FormLabel>Min Age</FormLabel>
                <NumberInput
                  value={formData.target_age_min || ''}
                  onChange={(_, val) => setFormData({ ...formData, target_age_min: val || null })}
                  min={5}
                  max={18}
                >
                  <NumberInputField placeholder="Any" />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Max Age</FormLabel>
                <NumberInput
                  value={formData.target_age_max || ''}
                  onChange={(_, val) => setFormData({ ...formData, target_age_max: val || null })}
                  min={5}
                  max={18}
                >
                  <NumberInputField placeholder="Any" />
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Primary Metric</FormLabel>
              <Select
                value={formData.primary_metric}
                onChange={(e) => setFormData({ ...formData, primary_metric: e.target.value })}
              >
                <option value="response_length">Response Length</option>
                <option value="engagement_rate">Engagement Rate</option>
                <option value="session_duration">Session Duration</option>
                <option value="choice_click_rate">Choice Click Rate</option>
                <option value="messages_per_session">Messages per Session</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={handleSubmit} isLoading={loading}>
            Create Experiment
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Create Variant Modal
function CreateVariantModal({
  isOpen,
  onClose,
  experimentId,
  experimentType,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  experimentId: string;
  experimentType: string;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_control: false,
    weight: 50,
    config: {} as Record<string, any>,
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: 'Name is required', status: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ab-testing/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment_id: experimentId,
          ...formData,
        }),
      });

      if (response.ok) {
        toast({ title: 'Variant created', status: 'success' });
        onCreated();
        setFormData({
          name: '',
          description: '',
          is_control: false,
          weight: 50,
          config: {},
        });
      }
    } catch (error) {
      toast({ title: 'Failed to create variant', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderConfigFields = () => {
    switch (experimentType) {
      case 'recipe_parameter':
        return (
          <>
            <FormControl>
              <FormLabel>Temperature</FormLabel>
              <NumberInput
                value={formData.config.temperature || ''}
                onChange={(_, val) =>
                  setFormData({ ...formData, config: { ...formData.config, temperature: val } })
                }
                min={0}
                max={2}
                step={0.1}
              >
                <NumberInputField placeholder="0.7" />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Max Tokens</FormLabel>
              <NumberInput
                value={formData.config.max_tokens || ''}
                onChange={(_, val) =>
                  setFormData({ ...formData, config: { ...formData.config, max_tokens: val } })
                }
                min={50}
                max={1000}
              >
                <NumberInputField placeholder="300" />
              </NumberInput>
            </FormControl>
          </>
        );
      case 'hint_injection':
        return (
          <FormControl>
            <FormLabel>Hints per Message</FormLabel>
            <NumberInput
              value={formData.config.injection_count || ''}
              onChange={(_, val) =>
                setFormData({ ...formData, config: { ...formData.config, injection_count: val } })
              }
              min={0}
              max={10}
            >
              <NumberInputField placeholder="3" />
            </NumberInput>
          </FormControl>
        );
      case 'character':
        return (
          <FormControl>
            <FormLabel>Recipe ID Override</FormLabel>
            <Input
              value={formData.config.recipe_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, config: { ...formData.config, recipe_id: e.target.value } })
              }
              placeholder="UUID of recipe to use"
            />
          </FormControl>
        );
      default:
        return (
          <FormControl>
            <FormLabel>Custom Config (JSON)</FormLabel>
            <Textarea
              value={JSON.stringify(formData.config, null, 2)}
              onChange={(e) => {
                try {
                  setFormData({ ...formData, config: JSON.parse(e.target.value) });
                } catch {}
              }}
              placeholder="{}"
              fontFamily="mono"
            />
          </FormControl>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Variant</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Variant Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Variant B"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What makes this variant different?"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Traffic Weight</FormLabel>
              <NumberInput
                value={formData.weight}
                onChange={(_, val) => setFormData({ ...formData, weight: val })}
                min={1}
                max={100}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <Divider />
            <Text fontWeight="semibold" alignSelf="start">Configuration</Text>
            {renderConfigFields()}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={handleSubmit} isLoading={loading}>
            Add Variant
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

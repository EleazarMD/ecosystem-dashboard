/**
 * LearningConfigCard — Phase 7 control-plane component.
 *
 * Lets parents configure learning-specific parameters that affect how the
 * planner and AI tutor adapt to their child:
 * - Daily session target (how many guided sessions per day)
 * - Difficulty targeting (ZPD bias: gentle / balanced / stretch)
 * - Domain focus preferences (which subjects to prioritize)
 * - Companion tone (encouraging / challenge-focused / curious)
 *
 * Settings are stored client-side in localStorage and synced to the
 * child's profile via /api/child/learning-config. The planner reads
 * these via the child's context frame.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Card, CardBody,
  Select, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
  RadioGroup, Radio, Stack, Switch, FormControl, FormLabel,
  Button, useToast, Badge, Divider, Heading,
} from '@chakra-ui/react';
import { FiSliders, FiSave, FiCheckCircle } from 'react-icons/fi';

interface LearningConfigCardProps {
  childId: string;
  childName: string;
}

export interface LearningConfig {
  dailySessionTarget: number;
  difficultyBias: 'gentle' | 'balanced' | 'stretch';
  domainFocus: string[];
  companionTone: 'encouraging' | 'challenge' | 'curious';
  enableSpacedReview: boolean;
  enableAdaptivePath: boolean;
}

const DEFAULT_CONFIG: LearningConfig = {
  dailySessionTarget: 2,
  difficultyBias: 'balanced',
  domainFocus: ['math', 'reading'],
  companionTone: 'encouraging',
  enableSpacedReview: true,
  enableAdaptivePath: true,
};

const DOMAIN_OPTIONS = [
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'reading', label: 'Reading', emoji: '📖' },
  { value: 'writing', label: 'Writing', emoji: '✏️' },
  { value: 'science', label: 'Science', emoji: '🔬' },
];

export default function LearningConfigCard({ childId, childName }: LearningConfigCardProps) {
  const [config, setConfig] = useState<LearningConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/child/learning-config?childId=${childId}`);
        if (res.ok) {
          const data = await res.json();
          setConfig({ ...DEFAULT_CONFIG, ...data.config });
        }
      } catch {
        // Use defaults if endpoint not yet available
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [childId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/child/learning-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, config }),
      });

      if (res.ok) {
        toast({ title: 'Learning settings saved', status: 'success', duration: 3000 });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast({ title: 'Failed to save settings', status: 'error', duration: 4000 });
      }
    } catch {
      toast({ title: 'Network error', status: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const toggleDomain = (domain: string) => {
    setConfig((prev) => ({
      ...prev,
      domainFocus: prev.domainFocus.includes(domain)
        ? prev.domainFocus.filter((d) => d !== domain)
        : [...prev.domainFocus, domain],
    }));
  };

  if (loading) {
    return (
      <Card borderWidth="1px" borderRadius="lg">
        <CardBody p={4}>
          <Text fontSize="sm" color="gray.400">Loading learning settings...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card borderWidth="1px" borderRadius="lg">
      <CardBody p={4}>
        <VStack spacing={4} align="stretch">
          <HStack spacing={2}>
            <FiSliders color="var(--chakra-colors-purple-500)" />
            <Heading size="sm">Learning Configuration</Heading>
          </HStack>
          <Text fontSize="xs" color="gray.500">
            Fine-tune how the AI tutor and learning plan adapt to {childName}.
          </Text>

          <Divider />

          {/* Daily Session Target */}
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Daily Session Target</FormLabel>
            <HStack>
              <NumberInput
                size="sm"
                min={1}
                max={5}
                value={config.dailySessionTarget}
                onChange={(_, val) => setConfig((p) => ({ ...p, dailySessionTarget: val || 2 }))}
                maxW="100px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="xs" color="gray.500">guided sessions per day</Text>
            </HStack>
          </FormControl>

          {/* Difficulty Bias */}
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Difficulty Targeting (ZPD Bias)</FormLabel>
            <Select
              size="sm"
              value={config.difficultyBias}
              onChange={(e) => setConfig((p) => ({ ...p, difficultyBias: e.target.value as LearningConfig['difficultyBias'] }))}
            >
              <option value="gentle">Gentle — slower pace, more encouragement</option>
              <option value="balanced">Balanced — match the child's level</option>
              <option value="stretch">Stretch — push for growth, more challenge</option>
            </Select>
            <Text fontSize="2xs" color="gray.400" mt={1}>
              Controls how the planner targets the Zone of Proximal Development.
            </Text>
          </FormControl>

          {/* Domain Focus */}
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Domain Focus</FormLabel>
            <HStack spacing={2}>
              {DOMAIN_OPTIONS.map((domain) => (
                <Button
                  key={domain.value}
                  size="xs"
                  variant={config.domainFocus.includes(domain.value) ? 'solid' : 'outline'}
                  colorScheme="purple"
                  onClick={() => toggleDomain(domain.value)}
                >
                  {domain.emoji} {domain.label}
                </Button>
              ))}
            </HStack>
            <Text fontSize="2xs" color="gray.400" mt={1}>
              Prioritized subjects in the learning plan.
            </Text>
          </FormControl>

          {/* Companion Tone */}
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Companion Tone</FormLabel>
            <RadioGroup
              value={config.companionTone}
              onChange={(val) => setConfig((p) => ({ ...p, companionTone: val as LearningConfig['companionTone'] }))}
            >
              <Stack direction="row" spacing={4}>
                <Radio value="encouraging" size="sm" colorScheme="purple">Encouraging</Radio>
                <Radio value="challenge" size="sm" colorScheme="purple">Challenge-focused</Radio>
                <Radio value="curious" size="sm" colorScheme="purple">Curious</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          {/* Toggles */}
          <VStack spacing={2} align="stretch">
            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="sm" fontWeight="500">Spaced Review</Text>
                  <Text fontSize="2xs" color="gray.400">Revisit skills at optimal intervals</Text>
                </Box>
                <Switch
                  isChecked={config.enableSpacedReview}
                  onChange={(e) => setConfig((p) => ({ ...p, enableSpacedReview: e.target.checked }))}
                  colorScheme="purple"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="sm" fontWeight="500">Adaptive Learning Path</Text>
                  <Text fontSize="2xs" color="gray.400">Auto-adjust steps based on mastery</Text>
                </Box>
                <Switch
                  isChecked={config.enableAdaptivePath}
                  onChange={(e) => setConfig((p) => ({ ...p, enableAdaptivePath: e.target.checked }))}
                  colorScheme="purple"
                />
              </HStack>
            </FormControl>
          </VStack>

          <Divider />

          <HStack justify="flex-end">
            {saved && (
              <Badge colorScheme="green" fontSize="2xs">
                <HStack spacing={1}><FiCheckCircle /><Text>Saved</Text></HStack>
              </Badge>
            )}
            <Button
              size="sm"
              colorScheme="purple"
              leftIcon={<FiSave />}
              onClick={handleSave}
              isLoading={saving}
            >
              Save Settings
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
}

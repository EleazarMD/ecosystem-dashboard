/**
 * Step 3: Docker Infrastructure Provisioning
 * 
 * Configures Docker volumes, AI Gateway container, OpenClaw sandbox,
 * and network isolation per tenant.
 */

import React from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Code,
  Divider,
  Tag,
  TagLabel,
  TagLeftIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { CheckCircleIcon, LockIcon } from '@chakra-ui/icons';

import { InfrastructureFormData } from '@/lib/platform/onboarding-types';
import { TenantTier } from '@/lib/platform/tenant-types';

interface InfrastructureStepProps {
  data: InfrastructureFormData;
  tier: TenantTier;
  slug: string;
  onChange: (updates: Partial<InfrastructureFormData>) => void;
}

const RESOURCE_PROFILES = {
  starter: { cpu: '2 cores', ram: '4 GB', description: 'Suitable for individual or small family use' },
  pro: { cpu: '4 cores', ram: '8 GB', description: 'For power users and larger families' },
  enterprise: { cpu: '8 cores', ram: '16 GB', description: 'Maximum performance, no limits' },
};

export function InfrastructureStep({ data, tier, slug, onChange }: InfrastructureStepProps) {
  const profile = RESOURCE_PROFILES[data.openClawResourceProfile];

  const maxDisk: Record<TenantTier, number> = {
    free: 5,
    basic: 50,
    premium: 2000,
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Overview */}
      <Alert status="info" borderRadius="md" bg="blue.900" borderColor="blue.700" borderWidth="1px">
        <AlertIcon color="blue.300" />
        <AlertDescription fontSize="sm" color="blue.200">
          The following Docker infrastructure will be provisioned for your isolated workspace.
          Each tenant gets dedicated containers, storage volumes, and network isolation.
        </AlertDescription>
      </Alert>

      {/* Storage Allocation */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Storage Allocation</Text>
        <FormControl>
          <FormLabel color="gray.300" fontSize="sm">
            Disk Space: <strong>{data.diskAllocationGB} GB</strong>
          </FormLabel>
          <Slider
            value={data.diskAllocationGB}
            min={5}
            max={maxDisk[tier]}
            step={tier === 'enterprise' ? 50 : tier === 'pro' ? 10 : 5}
            onChange={(val) => onChange({ diskAllocationGB: val })}
            colorScheme="blue"
          >
            <SliderTrack bg="gray.700">
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb boxSize={5} bg="blue.400" />
          </Slider>
          <FormHelperText color="gray.500" fontSize="xs">
            Tier limit: {maxDisk[tier] === 2000 ? 'Unlimited' : `${maxDisk[tier]} GB`}. 
            Covers model cache, user data, logs, and knowledge base.
          </FormHelperText>
        </FormControl>

        <SimpleGrid columns={3} spacing={3} mt={4}>
          <Box bg="gray.900" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" color="gray.400">Data Volume</Text>
            <Code fontSize="xs" color="blue.300" bg="transparent">{data.volumeNames.data}</Code>
          </Box>
          <Box bg="gray.900" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" color="gray.400">Models Volume</Text>
            <Code fontSize="xs" color="blue.300" bg="transparent">{data.volumeNames.models}</Code>
          </Box>
          <Box bg="gray.900" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" color="gray.400">Logs Volume</Text>
            <Code fontSize="xs" color="blue.300" bg="transparent">{data.volumeNames.logs}</Code>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Container Configuration */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Containers</Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {/* AI Gateway */}
          <Box
            bg="gray.900"
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={data.provisionAIGateway ? 'blue.600' : 'gray.700'}
          >
            <HStack justify="space-between" mb={3}>
              <HStack>
                <Text fontSize="lg">🌐</Text>
                <Text color="white" fontWeight="medium" fontSize="sm">AI Gateway</Text>
              </HStack>
              <Switch
                isChecked={data.provisionAIGateway}
                onChange={(e) => onChange({ provisionAIGateway: e.target.checked })}
                colorScheme="blue"
                isDisabled
              />
            </HStack>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="gray.400">
                Container: <Code fontSize="xs" bg="transparent" color="blue.300">{data.containerNames.aiGateway}</Code>
              </Text>
              <Text fontSize="xs" color="gray.400">Dual-port architecture (external + internal)</Text>
              <Text fontSize="xs" color="gray.400">Routes LLM requests, enforces security perimeter</Text>
              <HStack mt={1}>
                <Tag size="sm" colorScheme="green">
                  <TagLabel>Required</TagLabel>
                </Tag>
                <Tag size="sm" colorScheme="blue">
                  <TagLabel>Port 8777</TagLabel>
                </Tag>
              </HStack>
            </VStack>
          </Box>

          {/* OpenClaw */}
          <Box
            bg="gray.900"
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={data.provisionOpenClaw ? 'purple.600' : 'gray.700'}
          >
            <HStack justify="space-between" mb={3}>
              <HStack>
                <Text fontSize="lg">🦀</Text>
                <Text color="white" fontWeight="medium" fontSize="sm">OpenClaw</Text>
              </HStack>
              <Switch
                isChecked={data.provisionOpenClaw}
                onChange={(e) => onChange({ provisionOpenClaw: e.target.checked })}
                colorScheme="purple"
              />
            </HStack>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="gray.400">
                Container: <Code fontSize="xs" bg="transparent" color="purple.300">{data.containerNames.openClaw}</Code>
              </Text>
              <Text fontSize="xs" color="gray.400">Sandboxed agentic execution environment</Text>
              <HStack mt={1} flexWrap="wrap" spacing={1}>
                <Tag size="sm" colorScheme="red"><TagLabel>seccomp</TagLabel></Tag>
                <Tag size="sm" colorScheme="red"><TagLabel>AppArmor</TagLabel></Tag>
                <Tag size="sm" colorScheme="red"><TagLabel>read-only rootfs</TagLabel></Tag>
                <Tag size="sm" colorScheme="blue"><TagLabel>Port 18789</TagLabel></Tag>
              </HStack>
            </VStack>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Resource Profile */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={4}>Resource Limits (OpenClaw)</Text>
        <SimpleGrid columns={3} spacing={4}>
          {(Object.entries(RESOURCE_PROFILES) as [string, typeof profile][]).map(([key, prof]) => (
            <Box
              key={key}
              p={4}
              borderRadius="lg"
              borderWidth="2px"
              borderColor={data.openClawResourceProfile === key ? 'green.500' : 'gray.700'}
              bg={data.openClawResourceProfile === key ? 'green.900' : 'gray.900'}
              cursor="pointer"
              onClick={() => onChange({ openClawResourceProfile: key as 'starter' | 'pro' | 'enterprise' })}
              _hover={{ borderColor: 'green.400' }}
              transition="all 0.2s"
            >
              <Text color="white" fontWeight="bold" fontSize="sm" textTransform="capitalize" mb={2}>
                {key}
              </Text>
              <Text fontSize="xs" color="gray.400">CPU: {prof.cpu}</Text>
              <Text fontSize="xs" color="gray.400">RAM: {prof.ram}</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>{prof.description}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* Network Isolation */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <HStack>
              <LockIcon color="green.400" />
              <Text fontWeight="semibold" color="white" fontSize="sm">Network Isolation</Text>
            </HStack>
            <Text fontSize="xs" color="gray.400">
              Containers communicate only via <Code fontSize="xs" bg="transparent" color="green.300">ai-homelab-network</Code>. 
              No public internet exposure. Tailscale mesh for remote access.
            </Text>
          </VStack>
          <Switch
            isChecked={data.networkIsolation}
            colorScheme="green"
            isDisabled
          />
        </HStack>
      </Box>
    </VStack>
  );
}

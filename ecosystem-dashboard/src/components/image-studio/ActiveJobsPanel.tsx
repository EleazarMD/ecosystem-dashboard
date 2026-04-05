/**
 * Active Jobs Panel
 * 
 * Displays currently running and pending image generation jobs.
 * Shows progress and allows cancellation of pending jobs.
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  IconButton,
  Badge,
  Collapse,
  useDisclosure,
  Icon,
  Tooltip,
  Image,
  Spinner,
} from '@chakra-ui/react';
import { FiX, FiChevronDown, FiChevronUp, FiClock, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { ImageJob } from '@/hooks/useImageJobs';
import { formatDistanceToNow } from 'date-fns';

interface ActiveJobsPanelProps {
  jobs: ImageJob[];
  onCancel: (jobId: string) => void;
  onJobComplete?: (job: ImageJob) => void;
}

export const ActiveJobsPanel: React.FC<ActiveJobsPanelProps> = ({
  jobs,
  onCancel,
  onJobComplete,
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const borderColor = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');

  if (jobs.length === 0) {
    return null;
  }

  return (
    <GlassPanel p={3} mb={3}>
      <HStack 
        justify="space-between" 
        cursor="pointer" 
        onClick={onToggle}
        mb={isOpen ? 2 : 0}
      >
        <HStack spacing={2}>
          <Spinner size="xs" color="blue.400" />
          <Text fontSize="sm" fontWeight="medium">
            Active Jobs ({jobs.length})
          </Text>
        </HStack>
        <Icon as={isOpen ? FiChevronUp : FiChevronDown} />
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <VStack spacing={2} align="stretch">
          {jobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onCancel={() => onCancel(job.id)}
            />
          ))}
        </VStack>
      </Collapse>
    </GlassPanel>
  );
};

interface JobCardProps {
  job: ImageJob;
  onCancel: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onCancel }) => {
  const borderColor = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending': return 'yellow';
      case 'processing': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending': return FiClock;
      case 'processing': return null; // Use spinner
      case 'completed': return FiCheck;
      case 'failed': return FiAlertCircle;
      default: return FiClock;
    }
  };

  return (
    <Box
      p={2}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      bg={surfaceHover}
    >
      <HStack justify="space-between" mb={1}>
        <HStack spacing={2} flex={1} minW={0}>
          {job.status === 'processing' ? (
            <Spinner size="xs" color="blue.400" />
          ) : getStatusIcon() ? (
            <Icon as={getStatusIcon()!} color={`${getStatusColor()}.400`} boxSize={3} />
          ) : null}
          <Text fontSize="xs" noOfLines={1} flex={1}>
            {job.prompt.substring(0, 40)}{job.prompt.length > 40 ? '...' : ''}
          </Text>
        </HStack>
        <HStack spacing={1}>
          <Badge colorScheme={getStatusColor()} fontSize="2xs">
            {job.status}
          </Badge>
          {job.status === 'pending' && (
            <Tooltip label="Cancel job">
              <IconButton
                aria-label="Cancel"
                icon={<FiX />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      {/* Progress bar */}
      <Progress
        value={job.progress?.percent || 0}
        size="xs"
        colorScheme={getStatusColor()}
        borderRadius="full"
        mb={1}
      />

      <HStack justify="space-between" fontSize="2xs" color="gray.500">
        <Text>{job.progress?.message || 'Queued'}</Text>
        <Text>
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </Text>
      </HStack>

      {/* Show result thumbnail if completed */}
      {job.status === 'completed' && job.resultUrl && (
        <Box mt={2}>
          <Image
            src={job.resultUrl}
            alt="Generated"
            maxH="60px"
            borderRadius="md"
            objectFit="cover"
          />
        </Box>
      )}
    </Box>
  );
};

export default ActiveJobsPanel;

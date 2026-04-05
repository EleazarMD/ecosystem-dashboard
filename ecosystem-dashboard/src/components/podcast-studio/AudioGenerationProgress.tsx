import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Icon,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import { FiClock, FiActivity, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AudioGenerationProgressProps {
  jobId: string | null;
  totalTurns: number;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    currentTurn: number;
    totalTurns: number;
    message: string;
  };
  estimatedSeconds: number;
  elapsedSeconds: number;
  outputUrl?: string;
  errorMessage?: string;
}

export default function AudioGenerationProgress({
  jobId,
  totalTurns,
  onComplete,
  onError,
}: AudioGenerationProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.base');

  // Calculate realistic ETA including rate limiting delays
  const calculateRealisticETA = (currentTurn: number, totalTurns: number): number => {
    const turnsRemaining = totalTurns - currentTurn;
    
    // Each turn takes:
    // - 6.1s rate limit delay (for Gemini)
    // - ~3-5s for actual TTS generation
    // - ~1s for processing/audio combining
    const secondsPerTurn = 6.1 + 4 + 1; // Total ~11 seconds per turn
    
    return Math.ceil(turnsRemaining * secondsPerTurn);
  };

  // Poll job status
  useEffect(() => {
    if (!jobId) {
      console.log('⏭️ AudioGenerationProgress: No jobId provided');
      return;
    }

    console.log('🎵 AudioGenerationProgress: Starting to poll job:', jobId);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/podcast-studio/audio-jobs/${jobId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Job status fetch failed:', response.status, errorText);
          throw new Error(`Failed to fetch job status: ${response.status} - ${errorText}`);
        }

        const data: JobStatus = await response.json();
        console.log('📊 Job status update:', data.status, `(${data.progress?.currentTurn}/${data.progress?.totalTurns})`);
        setJobStatus(data);

        // Calculate time remaining
        if (data.status === 'processing' && data.progress) {
          const eta = calculateRealisticETA(
            data.progress.currentTurn,
            data.progress.totalTurns
          );
          setEstimatedTimeRemaining(eta);
        }

        // Handle completion
        if (data.status === 'completed') {
          clearInterval(pollInterval);
          onComplete?.(data);
        }

        // Handle failure
        if (data.status === 'failed') {
          clearInterval(pollInterval);
          onError?.(data.errorMessage || 'Audio generation failed');
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, onComplete, onError]);

  // Update elapsed time
  useEffect(() => {
    if (!jobStatus || jobStatus.status !== 'processing') return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (jobStatus.progress) {
        const eta = calculateRealisticETA(
          jobStatus.progress.currentTurn,
          jobStatus.progress.totalTurns
        );
        setEstimatedTimeRemaining(eta);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [jobStatus, startTime]);

  if (!jobId || !jobStatus) return null;

  const progressPercent = jobStatus.progress
    ? (jobStatus.progress.currentTurn / jobStatus.progress.totalTurns) * 100
    : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusColor = () => {
    switch (jobStatus.status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'failed': return 'red';
      case 'cancelled': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (jobStatus.status) {
      case 'completed': return FiCheckCircle;
      case 'processing': return FiActivity;
      case 'failed': return FiAlertCircle;
      default: return FiClock;
    }
  };

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={getStatusIcon()} color={`${getStatusColor()}.500`} boxSize={5} />
            <Text fontSize="md" fontWeight="600" color={textColor}>
              Audio Generation
            </Text>
          </HStack>
          <Badge colorScheme={getStatusColor()} fontSize="xs">
            {jobStatus.status.toUpperCase()}
          </Badge>
        </HStack>

        <Divider />

        {/* Progress Bar */}
        {jobStatus.status === 'processing' && (
          <>
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color={mutedColor}>
                  Turn {jobStatus.progress.currentTurn} of {jobStatus.progress.totalTurns}
                </Text>
                <Text fontSize="sm" fontWeight="600" color={textColor}>
                  {progressPercent.toFixed(0)}%
                </Text>
              </HStack>
              <Progress
                value={progressPercent}
                size="sm"
                colorScheme="blue"
                borderRadius="full"
                hasStripe
                isAnimated
              />
            </Box>

            {/* Time Estimates */}
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Tooltip label="Includes 6s rate limit delay per turn + generation time">
                  <HStack spacing={1}>
                    <Icon as={FiClock} boxSize={3} color={mutedColor} />
                    <Text fontSize="xs" color={mutedColor}>
                      Time Remaining
                    </Text>
                  </HStack>
                </Tooltip>
                <Text fontSize="xs" fontWeight="600" color="blue.500">
                  ~{formatTime(estimatedTimeRemaining)}
                </Text>
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="xs" color={mutedColor}>
                  Elapsed
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  {formatTime(jobStatus.elapsedSeconds || 0)}
                </Text>
              </HStack>
            </VStack>

            {/* Status Message */}
            {jobStatus.progress.message && (
              <Box
                p={2}
                bg={cardBg}
                border="1px solid"
                borderColor="blue.500"
                borderRadius="md"
                borderLeft="3px solid"
                borderLeftColor="blue.500"
              >
                <Text fontSize="xs" color={textColor}>
                  {jobStatus.progress.message}
                </Text>
              </Box>
            )}

            {/* Rate Limiting Info */}
            <Box
              p={2}
              bg={cardBg}
              border="1px solid"
              borderColor="orange.500"
              borderRadius="md"
            >
              <Text fontSize="xs" color={mutedColor}>
                ⏱️ <strong>Rate Limited:</strong> 6s delay between turns to avoid API quota errors
              </Text>
            </Box>
          </>
        )}

        {/* Completed State */}
        {jobStatus.status === 'completed' && (
          <Box
            p={3}
            bg={cardBg}
            border="1px solid"
            borderColor="green.500"
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor="green.500"
          >
            <VStack align="start" spacing={3} w="full">
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="600" color="green.600">
                  ✅ Audio Generated Successfully
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  Total time: {formatTime(jobStatus.elapsedSeconds || 0)}
                </Text>
              </VStack>
              
              {/* Audio Player */}
              {jobStatus.outputUrl && (
                <Box w="full">
                  <audio 
                    controls 
                    src={jobStatus.outputUrl}
                    style={{ width: '100%' }}
                    preload="metadata"
                  />
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Failed State */}
        {jobStatus.status === 'failed' && jobStatus.errorMessage && (
          <Box
            p={3}
            bg={cardBg}
            border="1px solid"
            borderColor="red.500"
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor="red.500"
          >
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="600" color="red.600">
                ❌ Generation Failed
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                {jobStatus.errorMessage}
              </Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Icon,
  Collapse,
} from '@chakra-ui/react';
import { FiFile, FiCheck, FiClock, FiLoader } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface SourceAnalysisStatus {
  fileName: string;
  status: 'queued' | 'analyzing' | 'completed' | 'error';
  progress?: number;
  insightsExtracted?: number;
  error?: string;
}

interface SourceAnalysisProgressProps {
  sources: SourceAnalysisStatus[];
  isAnalyzing: boolean;
  onClose?: () => void;
}

export default function SourceAnalysisProgress({ 
  sources, 
  isAnalyzing 
}: SourceAnalysisProgressProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.base');

  if (!isAnalyzing && sources.every(s => s.status === 'completed')) {
    return null;
  }

  const completedCount = sources.filter(s => s.status === 'completed').length;
  const totalCount = sources.length;
  const overallProgress = (completedCount / totalCount) * 100;

  const currentSource = sources.find(s => s.status === 'analyzing');
  const estimatedTime = Math.max(15, (totalCount - completedCount) * 15); // 15 seconds per source

  return (
    <Collapse in={isAnalyzing} animateOpacity>
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        border="2px solid"
        borderColor={borderColor}
        mb={4}
        boxShadow="md"
      >
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FiLoader} boxSize={5} color="blue.500" className="spin" />
              <Text fontSize="14px" fontWeight="600" color={textColor}>
                Analyzing Sources...
              </Text>
            </HStack>
            <Badge colorScheme="blue" fontSize="11px">
              {completedCount}/{totalCount}
            </Badge>
          </HStack>

          {/* Overall Progress */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="12px" color={mutedColor}>
                Overall Progress
              </Text>
              <Text fontSize="12px" color={textColor} fontWeight="600">
                {Math.round(overallProgress)}%
              </Text>
            </HStack>
            <Progress
              value={overallProgress}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              hasStripe
              isAnimated
            />
          </Box>

          {/* Estimated Time */}
          {isAnalyzing && completedCount < totalCount && (
            <HStack spacing={2} fontSize="11px" color={mutedColor}>
              <Icon as={FiClock} />
              <Text>Estimated time: ~{estimatedTime} seconds</Text>
            </HStack>
          )}

          {/* Current Source */}
          {currentSource && (
            <Box
              p={3}
              bg={useSemanticToken('surface.elevated')}
              borderRadius="lg"
              border="1px solid"
              borderColor={useSemanticToken('border.default')}
            >
              <HStack spacing={3}>
                <Icon as={FiLoader} color="blue.500" className="spin" />
                <VStack align="start" spacing={0} flex="1">
                  <Text fontSize="12px" fontWeight="500" color={textColor} noOfLines={1}>
                    {currentSource.fileName}
                  </Text>
                  <Text fontSize="10px" color={mutedColor}>
                    Extracting insights and key points...
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}

          {/* Source List */}
          <VStack spacing={1} align="stretch">
            {sources.map((source, idx) => (
              <HStack
                key={idx}
                px={3}
                py={2}
                bg={useSemanticToken('surface.elevated')}
                borderRadius="md"
                spacing={3}
              >
                <Icon
                  as={
                    source.status === 'completed' ? FiCheck :
                    source.status === 'analyzing' ? FiLoader :
                    source.status === 'error' ? FiFile :
                    FiClock
                  }
                  color={
                    source.status === 'completed' ? 'green.500' :
                    source.status === 'analyzing' ? 'blue.500' :
                    source.status === 'error' ? 'red.500' :
                    mutedColor
                  }
                  className={source.status === 'analyzing' ? 'spin' : ''}
                />
                
                <VStack align="start" spacing={0} flex="1" minW={0}>
                  <Text fontSize="11px" fontWeight="500" color={textColor} noOfLines={1}>
                    {source.fileName}
                  </Text>
                  {source.status === 'completed' && source.insightsExtracted && (
                    <Text fontSize="10px" color="green.500">
                      ✓ {source.insightsExtracted} key insights extracted
                    </Text>
                  )}
                  {source.status === 'error' && (
                    <Text fontSize="10px" color="red.500">
                      {source.error || 'Analysis failed'}
                    </Text>
                  )}
                  {source.status === 'queued' && (
                    <Text fontSize="10px" color={mutedColor}>
                      Queued
                    </Text>
                  )}
                </VStack>

                <Badge
                  size="sm"
                  colorScheme={
                    source.status === 'completed' ? 'green' :
                    source.status === 'analyzing' ? 'blue' :
                    source.status === 'error' ? 'red' :
                    'gray'
                  }
                  fontSize="9px"
                >
                  {source.status}
                </Badge>
              </HStack>
            ))}
          </VStack>

          {/* Summary on Completion */}
          {completedCount === totalCount && !isAnalyzing && (
            <Box
              p={3}
              bg={cardBg}
              borderRadius="lg"
              border="1px solid"
              borderColor="green.500"
            >
              <HStack spacing={2}>
                <Icon as={FiCheck} color="green.500" boxSize={5} />
                <VStack align="start" spacing={0}>
                  <Text fontSize="12px" fontWeight="600" color={textColor}>
                    Analysis Complete!
                  </Text>
                  <Text fontSize="10px" color={mutedColor}>
                    {sources.reduce((sum, s) => sum + (s.insightsExtracted || 0), 0)} total insights extracted
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}
        </VStack>

        <style jsx global>{`
          .spin {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </Box>
    </Collapse>
  );
}

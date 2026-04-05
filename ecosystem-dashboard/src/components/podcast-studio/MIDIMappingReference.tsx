/**
 * MIDI Mapping Reference Card
 * Shows users how their MIDI controller maps to mixer controls
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from '@chakra-ui/react';

interface MIDIMappingReferenceProps {
  deviceName?: string | null;
}

export default function MIDIMappingReference({ deviceName }: MIDIMappingReferenceProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const infoBg = useSemanticToken('surface.highlight');
  
  const isHercules = deviceName?.toLowerCase().includes('hercules');

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="bold">
            🎛️ MIDI Mapping Reference
          </Text>
          {isHercules && (
            <Badge colorScheme="purple" fontSize="xs">
              Hercules DJ Control Mix Ultra
            </Badge>
          )}
        </HStack>

        {isHercules ? (
          // Hercules-specific mapping
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Control</Th>
                <Th>Function</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td><Badge colorScheme="blue">Deck A Channel Fader</Badge></Td>
                <Td>Speaker 1 Volume</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="blue">Deck B Channel Fader</Badge></Td>
                <Td>Speaker 2 Volume</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="purple">Deck A EQ (High/Mid/Low)</Badge></Td>
                <Td>Tracks 3/4/5 Volume</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="purple">Deck B EQ (High/Mid/Low)</Badge></Td>
                <Td>Tracks 6/7/8 Volume</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="green">Play/Cue Buttons</Badge></Td>
                <Td>Mute/Solo Main Speakers</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="orange">Sync Buttons</Badge></Td>
                <Td>Mute Additional Tracks</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="yellow">Crossfader</Badge></Td>
                <Td>Master Mix Balance</Td>
              </Tr>
            </Tbody>
          </Table>
        ) : (
          // Generic controller mapping
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Control</Th>
                <Th>CC/Note</Th>
                <Th>Function</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td><Badge colorScheme="blue">Fader 1-2</Badge></Td>
                <Td>CC 1-2</Td>
                <Td>Speakers 1-2 Volume</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="blue">Fader 3-8</Badge></Td>
                <Td>CC 3-8</Td>
                <Td>Tracks 3-8 Volume</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="purple">Knob 1-8</Badge></Td>
                <Td>CC 10-17</Td>
                <Td>EQ/Effects (future)</Td>
              </Tr>
              <Tr>
                <Td><Badge colorScheme="green">Button 1-8</Badge></Td>
                <Td>Note 60-67</Td>
                <Td>Mute Tracks 1-8</Td>
              </Tr>
            </Tbody>
          </Table>
        )}

        <Box
          p={2}
          bg={infoBg}
          borderRadius="md"
          fontSize="xs"
        >
          <Text fontWeight="bold" mb={1}>
            💡 Tip:
          </Text>
          {isHercules ? (
            <Text>
              Move the <strong>channel faders</strong> to control speaker volumes, 
              use <strong>EQ knobs</strong> for additional tracks, and press <strong>Play/Cue</strong> buttons to mute/solo!
            </Text>
          ) : (
            <Text>
              Move faders on your MIDI controller to see real-time updates in the mixer!
              Button presses toggle mute for each track.
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
}

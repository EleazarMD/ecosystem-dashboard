import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  IconButton,
  Badge,
  Tooltip,
  Button,
  Switch,
} from '@chakra-ui/react';
import { FiVolume2, FiVolumeX, FiHeadphones } from 'react-icons/fi';
import { useMIDIController } from '../../hooks/useMIDIController';
import MIDIControllerPanel from './MIDIControllerPanel';
import HerculesDJController from './HerculesDJController';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Track {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  pan: number;
  color: string;
}

interface EffectsSettings {
  noiseGate: { enabled: boolean; threshold: number };
  eq: { enabled: boolean; lowCut: number; midBoost: number; highShelf: number };
  compressor: { enabled: boolean; threshold: number; ratio: number; attack: number; release: number };
  limiter: { enabled: boolean; ceiling: number };
}

interface AudioMixerProps {
  tracks: Track[];
  onTrackChange: (trackId: string, changes: Partial<Track>) => void;
  effectsSettings?: EffectsSettings;
  onEffectsChange?: (settings: EffectsSettings) => void;
}

export default function AudioMixer({ tracks, onTrackChange, effectsSettings, onEffectsChange }: AudioMixerProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceSunken = useSemanticToken('surface.sunken');
  const borderDefault = useSemanticToken('border.default');

  // Store MIDI values for visual feedback
  const [midiValues, setMidiValues] = useState<Map<number, number>>(new Map());

  // Toggle for showing visual controller
  const [showVisualController, setShowVisualController] = useState(false);

  // MIDI Controller Integration
  const handleFaderChange = useCallback((channel: number, value: number) => {
    // Update visual feedback
    setMidiValues(prev => new Map(prev).set(channel, value));

    // Map MIDI fader (channel 1-8) to tracks (index 0-7)
    const trackIndex = channel - 1;
    if (trackIndex >= 0 && trackIndex < tracks.length) {
      const track = tracks[trackIndex];
      const dbValue = percentToDb(value * 100);
      console.log(`🎛️ MIDI Fader ${channel} → Track "${track.name}": ${dbValue.toFixed(1)} dB`);
      onTrackChange(track.id, { volume: dbValue });
    }
  }, [tracks, onTrackChange]);

  const handleKnobChange = useCallback((knob: number, value: number) => {
    // Update visual feedback for knobs
    setMidiValues(prev => new Map(prev).set(knob, value));

    if (!effectsSettings || !onEffectsChange) {
      console.log(`🎚️ MIDI Knob ${knob}: ${value.toFixed(2)} (no effects control)`);
      return;
    }

    // Map Hercules DJ Controller knobs to Effects Rack
    const newSettings = { ...effectsSettings };

    switch (knob) {
      // Deck A EQ Knobs → EQ Controls
      case 16: // High knob → High Shelf
        newSettings.eq.highShelf = (value - 0.5) * 12; // -6 to +6 dB
        console.log(`🎚️ EQ High Shelf: ${newSettings.eq.highShelf.toFixed(1)} dB`);
        break;
      case 17: // Mid knob → Mid Boost
        newSettings.eq.midBoost = (value - 0.5) * 12; // -6 to +6 dB
        console.log(`🎚️ EQ Mid Boost: ${newSettings.eq.midBoost.toFixed(1)} dB`);
        break;
      case 18: // Low knob → Low Cut
        newSettings.eq.lowCut = 20 + (value * 130); // 20-150 Hz
        console.log(`🎚️ EQ Low Cut: ${newSettings.eq.lowCut.toFixed(0)} Hz`);
        break;

      // Deck B EQ Knobs → Compressor Controls
      case 19: // High knob → Compressor Threshold
        newSettings.compressor.threshold = -30 + (value * 20); // -30 to -10 dB
        console.log(`🎚️ Compressor Threshold: ${newSettings.compressor.threshold.toFixed(1)} dB`);
        break;
      case 20: // Mid knob → Compressor Ratio
        newSettings.compressor.ratio = 1 + (value * 9); // 1:1 to 10:1
        console.log(`🎚️ Compressor Ratio: ${newSettings.compressor.ratio.toFixed(1)}:1`);
        break;
      case 21: // Low knob → Compressor Attack
        newSettings.compressor.attack = 1 + (value * 49); // 1-50 ms
        console.log(`🎚️ Compressor Attack: ${newSettings.compressor.attack.toFixed(0)} ms`);
        break;

      // Filter Knobs → Dynamics
      case 22: // Filter A → Noise Gate Threshold
        newSettings.noiseGate.threshold = -60 + (value * 50); // -60 to -10 dB
        console.log(`🎚️ Noise Gate Threshold: ${newSettings.noiseGate.threshold.toFixed(1)} dB`);
        break;
      case 23: // Filter B → Limiter Ceiling
        newSettings.limiter.ceiling = -3 + (value * 2.9); // -3 to -0.1 dB
        console.log(`🎚️ Limiter Ceiling: ${newSettings.limiter.ceiling.toFixed(1)} dB`);
        break;

      // Browser/Master knobs could control release or other params
      case 24: // Browser → Compressor Release
        newSettings.compressor.release = 10 + (value * 290); // 10-300 ms
        console.log(`🎚️ Compressor Release: ${newSettings.compressor.release.toFixed(0)} ms`);
        break;
    }

    onEffectsChange(newSettings);
  }, [effectsSettings, onEffectsChange]);

  const handleButtonPress = useCallback((button: number) => {
    // Map MIDI buttons (60-67) to track mutes (0-7)
    const trackIndex = button - 60;
    if (trackIndex >= 0 && trackIndex < tracks.length) {
      const track = tracks[trackIndex];
      console.log(`🔘 MIDI Button ${button} → Toggle mute "${track.name}"`);
      onTrackChange(track.id, { muted: !track.muted });
    }
  }, [tracks, onTrackChange]);

  const midi = useMIDIController(
    handleFaderChange,
    handleKnobChange,
    handleButtonPress,
    undefined  // onButtonRelease
  );

  const dbToPercent = (db: number) => {
    // Convert dB to percentage (0 to 100)
    // -60 dB = 0%, 0 dB = 100%
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  };

  const percentToDb = (percent: number) => {
    // Convert percentage to dB
    return (percent / 100) * 60 - 60;
  };

  const formatDb = (db: number) => {
    if (db === -60) return '-∞';
    return `${db > 0 ? '+' : ''}${db.toFixed(1)}`;
  };

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="600" color={textColor}>
            🎚️ Multi-Track Mixer
          </Text>
          <Badge colorScheme="purple" fontSize="xs">
            {tracks.filter(t => !t.muted).length} Active
          </Badge>
        </HStack>

        {/* MIDI Controller Panel */}
        <MIDIControllerPanel
          isConnected={midi.isConnected}
          isReady={midi.isReady}
          currentDevice={midi.currentDevice}
          availableDevices={midi.availableDevices}
          onConnect={midi.connectToDevice}
          onDisconnect={midi.disconnect}
          onRefresh={midi.initialize}
        />

        {/* Visual Controller Toggle */}
        <HStack
          justify="space-between"
          align="center"
          p={3}
          bg={useSemanticToken('surface.sunken')}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <HStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium" color={textColor}>
              🎛️ Visual DJ Controller
            </Text>
            {midi.currentDevice && (
              <Badge colorScheme="blue" fontSize="xs">
                {midi.currentDevice.name}
              </Badge>
            )}
          </HStack>
          <HStack spacing={3}>
            <Text fontSize="xs" color={mutedColor}>
              {showVisualController ? 'Hide' : 'Show'}
            </Text>
            <Switch
              isChecked={showVisualController}
              onChange={(e) => setShowVisualController(e.target.checked)}
              colorScheme="blue"
              size="md"
            />
          </HStack>
        </HStack>

        {/* Visual DJ Controller */}
        {showVisualController && (
          <Box>
            <HerculesDJController
              isConnected={midi.isConnected}
              midiValues={midiValues}
              onValueChange={(cc, value) => {
                // DON'T call handlers for UI changes - prevents re-render during drag
                // UI controls are purely visual and don't need to update parent state
                // Only physical MIDI input goes through handlers

                console.log(`🎛️ UI Control CC ${cc}: ${value.toFixed(2)} (UI only, no handler call)`);
              }}
            />
          </Box>
        )}

        {/* Mixer Channels */}
        <HStack spacing={3} align="start" justify="space-around">
          {tracks.map((track) => (
            <VStack
              key={track.id}
              spacing={2}
              p={3}
              bg={surfaceSunken}
              borderRadius="md"
              border="2px solid"
              borderColor={track.solo ? 'blue.400' : track.muted ? 'red.400' : borderColor}
              minW="80px"
              flex="1"
            >
              {/* Track Name */}
              <Text
                fontSize="xs"
                fontWeight="600"
                color={track.muted ? mutedColor : textColor}
                textAlign="center"
                noOfLines={1}
              >
                {track.name}
              </Text>

              {/* Volume Fader */}
              <Box h="150px" position="relative">
                <Slider
                  aria-label={`${track.name} volume`}
                  orientation="vertical"
                  value={dbToPercent(track.volume)}
                  onChange={(val) => {
                    const db = percentToDb(val);
                    onTrackChange(track.id, { volume: db });
                  }}
                  isDisabled={track.muted}
                  colorScheme={track.color || 'blue'}
                >
                  <SliderTrack bg={borderDefault}>
                    <SliderFilledTrack bg={track.muted ? 'gray.400' : `${track.color}.500`} />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>

                {/* Volume Level Display */}
                <Box
                  position="absolute"
                  bottom="0"
                  left="50%"
                  transform="translateX(-50%)"
                  mt={2}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    color={track.muted ? mutedColor : track.volume > -3 ? 'red.500' : textColor}
                    textAlign="center"
                  >
                    {formatDb(track.volume)}dB
                  </Text>
                </Box>
              </Box>

              {/* Control Buttons */}
              <VStack spacing={1} w="full">
                {/* Mute Button */}
                <Tooltip label={track.muted ? 'Unmute' : 'Mute'}>
                  <IconButton
                    icon={track.muted ? <FiVolumeX /> : <FiVolume2 />}
                    aria-label={track.muted ? 'Unmute' : 'Mute'}
                    size="xs"
                    w="full"
                    colorScheme={track.muted ? 'red' : 'gray'}
                    variant={track.muted ? 'solid' : 'outline'}
                    onClick={() => onTrackChange(track.id, { muted: !track.muted })}
                  />
                </Tooltip>

                {/* Solo Button */}
                <Tooltip label={track.solo ? 'Unsolo' : 'Solo'}>
                  <IconButton
                    icon={<FiHeadphones />}
                    aria-label={track.solo ? 'Unsolo' : 'Solo'}
                    size="xs"
                    w="full"
                    colorScheme={track.solo ? 'blue' : 'gray'}
                    variant={track.solo ? 'solid' : 'outline'}
                    onClick={() => onTrackChange(track.id, { solo: !track.solo })}
                  />
                </Tooltip>
              </VStack>
            </VStack>
          ))}
        </HStack>

        {/* Master Volume Indicator */}
        <Box
          p={2}
          bg={useSemanticToken('surface.highlight')}
          borderRadius="md"
          borderLeft="4px solid"
          borderLeftColor="blue.400"
        >
          <HStack justify="space-between">
            <Text fontSize="xs" fontWeight="600" color={textColor}>
              Master Output
            </Text>
            <Badge colorScheme="blue" fontSize="xs">
              -16 LUFS Target
            </Badge>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}

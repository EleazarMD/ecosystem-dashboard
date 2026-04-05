/**
 * Visual Hercules DJ Control Mix Ultra Interface
 * True-to-life DJ controller visualization with MIDI feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Grid,
  Badge,
  Circle,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Icon,
} from '@chakra-ui/react';
import { FiHeadphones } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface HerculesDJControllerProps {
  isConnected: boolean;
  midiValues?: Map<number, number>; // CC number -> value (0-1)
  onValueChange?: (cc: number, value: number) => void; // Callback when user adjusts controls
}

export default function HerculesDJController({ isConnected, midiValues = new Map(), onValueChange }: HerculesDJControllerProps) {
  console.log('🎛️ HerculesDJController rendering:', { isConnected });

  const deckBg = useSemanticToken('surface.sunken');
  const centerBg = useSemanticToken('surface.raised');
  const labelColor = useSemanticToken('text.muted');

  // Get MIDI value for a CC (normalized 0-1)
  const getMidiValue = (cc: number) => midiValues.get(cc) || 0;

  // Handle value changes from UI
  const handleValueChange = (cc: number, value: number) => {
    console.log(`🎛️ Value change - CC ${cc}: ${value.toFixed(2)}`);
    if (onValueChange) {
      onValueChange(cc, value);
    } else {
      console.warn('⚠️ onValueChange callback is not defined');
    }
  };

  // Interactive Rotary Knob Component with drag support and local state
  // DJ EQ knobs: 0.0 = -12dB (cut), 0.5 = 0dB (neutral/12 o'clock), 1.0 = +12dB (boost)
  const RotaryKnob = ({ cc, label, color = 'blue', size = '40px' }: { cc: number; label: string; color?: string; size?: string }) => {
    const [localValue, setLocalValue] = useState(0.5); // Start at center (0dB/neutral)
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startValue, setStartValue] = useState(0);
    const prevMidiValueRef = useRef<number | undefined>(undefined);

    // Sync from MIDI when not dragging (or initialize to center if no MIDI value)
    useEffect(() => {
      if (!isDragging) {
        const currentMidiVal = getMidiValue(cc);
        const prevMidiVal = prevMidiValueRef.current;

        // If there's MIDI input and it changed, sync to it
        if (currentMidiVal > 0 && currentMidiVal !== prevMidiVal && currentMidiVal !== localValue) {
          setLocalValue(currentMidiVal);
          prevMidiValueRef.current = currentMidiVal;
        }
        // If no MIDI value and we haven't initialized yet, stay at center (0.5)
      }
    }, [midiValues.get(cc), isDragging, cc, localValue]);

    const rotation = (localValue * 270) - 135; // -135° to 135° range

    console.log(`🎛️ Knob CC ${cc} render - localValue: ${localValue.toFixed(3)}, rotation: ${rotation.toFixed(1)}°, isDragging: ${isDragging}`);

    const handleMouseDown = (e: React.MouseEvent) => {
      console.log(`🎛️ Knob CC ${cc} - Mouse DOWN, starting drag`);
      setIsDragging(true);
      setStartY(e.clientY);
      setStartValue(localValue);
      e.preventDefault();
    };

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY; // Inverted: up = increase
        const sensitivity = 0.005; // Increased sensitivity for more responsive feel
        const newValue = Math.max(0, Math.min(1, startValue + deltaY * sensitivity));
        console.log(`🎛️ Knob CC ${cc} - MOVE: deltaY=${deltaY}, startValue=${startValue.toFixed(3)}, newValue=${newValue.toFixed(3)}`);
        setLocalValue(newValue);
        // DON'T call handleValueChange - prevents parent re-renders during drag
        // UI controls are display-only, only physical MIDI input updates parent
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, startY, startValue, cc]);

    return (
      <VStack spacing={1}>
        <Box position="relative">
          {/* Dot markers around knob */}
          {[-135, -90, -45, 0, 45, 90, 135].map((angle) => (
            <Box
              key={angle}
              position="absolute"
              top="50%"
              left="50%"
              w="3px"
              h="3px"
              bg={useSemanticToken('surface.sunken')}
              borderRadius="full"
              transform={`translate(-50%, -50%) rotate(${angle}deg) translateY(-${parseInt(size) / 2 + 5}px)`}
            />
          ))}

          <Circle
            size={size}
            bg={useSemanticToken('surface.elevated')}
            border="3px solid"
            borderColor={isDragging ? useSemanticToken('border.active') : useSemanticToken('border.default')}
            cursor="grab"
            _active={{ cursor: 'grabbing' }}
            _hover={{ borderColor: useSemanticToken('border.hover'), transform: 'scale(1.05)' }}
            transition="all 0.1s"
            onMouseDown={handleMouseDown}
            userSelect="none"
          >
            {/* Indicator line - Orange to match jog wheel center */}
            <Box
              position="absolute"
              bottom="50%"
              left="50%"
              w="2px"
              h="40%"
              bg="orange.500"
              transformOrigin="bottom center"
              transform={`translate(-50%, 0%) rotate(${rotation}deg)`}
              borderRadius="full"
            />
          </Circle>
        </Box>
        <Text fontSize="9px" color={useSemanticToken('text.secondary')} fontWeight="medium">{label}</Text>
      </VStack>
    );
  };

  // Interactive Jog Wheel Component with rotation tracking
  const JogWheel = ({ deckNum, side }: { deckNum: 1 | 2; side: 'left' | 'right' }) => {
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [lastAngle, setLastAngle] = useState(0);
    const wheelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
      console.log(`🎵 Jog wheel ${deckNum} DRAG STARTED (new interactive component)`);
      setIsDragging(true);
      const rect = wheelRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        setLastAngle(angle);
      }
      e.preventDefault();
      e.stopPropagation();
    };

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = wheelRef.current?.getBoundingClientRect();
        if (rect) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

          let delta = angle - lastAngle;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;

          setRotation(prev => prev + delta);
          setLastAngle(angle);

          console.log(`🎵 Jog wheel ${deckNum} rotation: ${delta.toFixed(1)}°`);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        console.log(`🎵 Jog wheel ${deckNum} released at ${rotation.toFixed(1)}°`);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, lastAngle, rotation, deckNum]);

    return (
      <Box
        ref={wheelRef}
        position="absolute"
        top="30px"
        left={side === 'left' ? '60%' : '40%'}
        transform="translateX(-50%)"
        w="300px"
        h="300px"
        zIndex={15}
        onMouseDown={handleMouseDown}
        cursor={isDragging ? 'grabbing' : 'grab'}
        userSelect="none"
      >
        <Circle
          size="300px"
          bg={useSemanticToken('surface.raised')}
          border="4px solid"
          borderColor={isDragging ? useSemanticToken('border.active') : useSemanticToken('border.default')}
          position="relative"
          boxShadow="inset 0 0 30px rgba(0,0,0,0.7)"
          _hover={{ borderColor: useSemanticToken('border.hover') }}
          transition="border-color 0.2s"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <Circle
            size="240px"
            bg={useSemanticToken('surface.base')}
            position="relative"
            bgGradient="radial(gray.900, black)"
          >
            <Circle
              size="120px"
              bgGradient="radial(orange.400, orange.500)"
              boxShadow="0 0 15px rgba(251, 146, 60, 0.3)"
            >
              <Circle size="10px" bg="black" />
            </Circle>

            {[...Array(14)].map((_, i) => (
              <Circle
                key={i}
                size={`${230 - i * 15}px`}
                border="1px solid"
                borderColor={useSemanticToken('border.subtle')}
                position="absolute"
              />
            ))}
          </Circle>
        </Circle>
      </Box>
    );
  };

  // Tempo Slider Component with independent state management
  const TempoSlider = ({ deckNum }: { deckNum: 1 | 2 }) => {
    const tempoFaderCC = deckNum === 1 ? 1 : 2;
    const [localValue, setLocalValue] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const prevMidiValueRef = useRef<number | undefined>(undefined);

    // Only update from MIDI when there's actual MIDI input (value changed from physical controller)
    useEffect(() => {
      if (!isDragging) {
        const currentMidiVal = getMidiValue(tempoFaderCC) * 100;
        const prevMidiVal = prevMidiValueRef.current;

        // Only update if MIDI value actually changed (from physical controller)
        if (currentMidiVal > 0 && currentMidiVal !== prevMidiVal) {
          console.log(`📥 MIDI input updated tempo ${deckNum}: ${currentMidiVal}%`);
          setLocalValue(currentMidiVal);
          prevMidiValueRef.current = currentMidiVal;
        }
      }
    }, [midiValues.get(tempoFaderCC), isDragging]);

    return (
      <Box
        bg={useSemanticToken('surface.base')}
        p={2}
        borderRadius="md"
        boxShadow="md"
        h="fit-content"
      >
        <VStack spacing={2}>
          {/* Minus label */}
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="bold">-</Text>

          {/* Tick marks and slider */}
          <HStack spacing={1} align="center">
            {/* Left tick marks */}
            <VStack spacing={1.5} justify="space-between" h="160px">
              {[...Array(11)].map((_, i) => (
                <Box key={i} w="8px" h="1px" bg={useSemanticToken('border.default')} />
              ))}
            </VStack>

            {/* Slider */}
            <Slider
              orientation="vertical"
              h="160px"
              min={0}
              max={100}
              step={0.1}
              value={localValue}
              onChange={(val) => {
                setLocalValue(val);
                handleValueChange(tempoFaderCC, val / 100);
              }}
              onChangeStart={() => {
                setIsDragging(true);
                console.log(`🎚️ Tempo ${deckNum} - Drag START`);
              }}
              onChangeEnd={(val) => {
                setIsDragging(false);
                console.log(`🎚️ Tempo ${deckNum} - Drag END at ${val}%`);
              }}
              colorScheme="orange"
              focusThumbOnChange={false}
            >
              <SliderTrack bg={useSemanticToken('surface.elevated')} w="8px" borderRadius="full" cursor="pointer">
                <SliderFilledTrack bg={useSemanticToken('surface.elevated')} />
              </SliderTrack>
              <SliderThumb
                boxSize={8}
                bg={useSemanticToken('surface.elevated')}
                border="3px solid"
                borderColor="orange.400"
                boxShadow="md"
                cursor="grab"
                _active={{ cursor: 'grabbing', transform: 'scale(1.1)' }}
                _hover={{ transform: 'scale(1.05)' }}
              />
            </Slider>

            {/* Right tick marks */}
            <VStack spacing={1.5} justify="space-between" h="160px">
              {[...Array(11)].map((_, i) => (
                <Box key={i} w="8px" h="1px" bg={useSemanticToken('border.default')} />
              ))}
            </VStack>
          </HStack>

          {/* Plus label */}
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="bold">+</Text>

          {/* Tempo label */}
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="bold">tempo</Text>
        </VStack>
      </Box>
    );
  };

  // Deck component
  const Deck = ({ side, deckNum }: { side: 'left' | 'right'; deckNum: 1 | 2 }) => {
    const channelFaderCC = deckNum === 1 ? 7 : 15;
    const tempoFaderCC = deckNum === 1 ? 1 : 2;
    const highEqCC = deckNum === 1 ? 16 : 19;
    const midEqCC = deckNum === 1 ? 17 : 20;
    const lowEqCC = deckNum === 1 ? 18 : 21;

    return (
      <Box position="relative" w="full" maxW="380px" minH="600px" p={4} bg={deckBg} borderRadius="lg">
        {/* Tempo Slider - Inside deck on left/right edge */}
        <Box
          position="absolute"
          left={side === 'left' ? '10px' : 'auto'}
          right={side === 'right' ? '10px' : 'auto'}
          top="40px"
          zIndex={10}
        >
          <TempoSlider deckNum={deckNum} />
        </Box>

        {/* Jog Wheel - Interactive with rotation tracking */}
        <JogWheel deckNum={deckNum} side={side} />

        {/* Control Area with deck label and buttons */}
        <VStack spacing={1} w="full" pt="340px">
          {/* Deck Label Banner */}
          <Box
            w="full"
            bg={useSemanticToken('surface.elevated')}
            py={1.5}
            px={4}
            borderRadius="md"
            mb={2}
          >
            <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.primary')} textAlign="left">
              deck {deckNum}
            </Text>
          </Box>

          {/* Control Area: Transport buttons + Performance modes + Hot cue pads */}
          <HStack spacing={2} align="start" w="full">
            {/* Left Column: Transport Controls */}
            <VStack spacing={2} minW="110px">
              <Box
                w="full"
                h="40px"
                bg={useSemanticToken('surface.elevated')}
                border="2px solid"
                borderColor={useSemanticToken('border.default')}
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ bg: useSemanticToken('surface.hover') }}
              >
                <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>shift</Text>
              </Box>

              <Box
                w="full"
                h="50px"
                bg={useSemanticToken('surface.elevated')}
                border="3px solid"
                borderColor="red.400"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ bg: useSemanticToken('surface.hover') }}
              >
                <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>sync</Text>
              </Box>

              <Box
                w="full"
                h="60px"
                bg={useSemanticToken('surface.elevated')}
                border="3px solid"
                borderColor="orange.400"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ bg: useSemanticToken('surface.hover') }}
              >
                <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>cue</Text>
              </Box>

              <Box
                w="full"
                h="60px"
                bgGradient="linear(to-r, cyan.400, green.400)"
                border="2px solid"
                borderColor="cyan.500"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ opacity: 0.9 }}
              >
                <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.primary')}>▶ / ❚❚</Text>
              </Box>
            </VStack>

            {/* Right Grid: Performance modes + Hot cue pads */}
            <VStack spacing={1} flex={1}>
              {/* Performance Mode Buttons Row */}
              <HStack spacing={1} w="full">
                <VStack spacing={0} flex={1}>
                  <Badge variant="solid" bg={useSemanticToken('surface.elevated')} color={useSemanticToken('text.primary')} fontSize="8px" px={2} py={1} fontWeight="bold" w="full" textAlign="center">HOT-CUE</Badge>
                  <Text fontSize="7px" color={labelColor} fontWeight="medium">pitch play</Text>
                </VStack>
                <VStack spacing={0} flex={1}>
                  <Badge variant="solid" bg={useSemanticToken('surface.elevated')} color={useSemanticToken('text.primary')} fontSize="8px" px={2} py={1} fontWeight="bold" w="full" textAlign="center">LOOP</Badge>
                  <Text fontSize="7px" color={labelColor} fontWeight="medium">bounce loop</Text>
                </VStack>
                <VStack spacing={0} flex={1}>
                  <Badge variant="solid" bg={useSemanticToken('surface.elevated')} color={useSemanticToken('text.primary')} fontSize="8px" px={2} py={1} fontWeight="bold" w="full" textAlign="center">FX</Badge>
                  <Text fontSize="7px" color={labelColor} fontWeight="medium">slicer</Text>
                </VStack>
                <VStack spacing={0} flex={1}>
                  <Badge variant="solid" bg={useSemanticToken('interactive.primary')} color={useSemanticToken('text.inverse')} fontSize="8px" px={1} py={1} fontWeight="bold" w="full" textAlign="center">NEURAL MIX</Badge>
                  <Text fontSize="7px" color={labelColor} fontWeight="medium">sampler</Text>
                </VStack>
              </HStack>

              {/* Hot Cue Pads Grid (4x2) */}
              <Grid templateColumns="repeat(4, 1fr)" gap={2} w="full" mt={1}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <Box
                    key={num}
                    h="55px"
                    bg={getMidiValue(60 + num - 1) > 0 ? 'cyan.300' : 'cyan.500'}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{ bg: 'cyan.400', transform: 'scale(1.05)' }}
                    _active={{ transform: 'scale(0.95)' }}
                    onClick={() => handleValueChange(60 + num - 1, getMidiValue(60 + num - 1) > 0 ? 0 : 1)}
                    boxShadow={getMidiValue(60 + num - 1) > 0 ? '0 0 12px cyan' : 'md'}
                    transition="all 0.2s"
                  >
                    <Text fontSize="2xl" fontWeight="bold" color={useSemanticToken('text.primary')}>
                      {num}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </VStack>
          </HStack>
        </VStack>
      </Box>
    );
  };

  // Center mixer section
  const CenterMixer = () => {
    return (
      <VStack spacing={1} w="260px" px={3} pt={1} pb={3} bg={centerBg} borderRadius="lg" boxShadow="lg" minH="600px" justify="space-between">
        {/* Top: Load Track Buttons - flush with top */}
        <HStack spacing={12} justify="center" w="full" pt={0}>
          <Circle
            size="45px"
            bg={useSemanticToken('surface.elevated')}
            cursor="pointer"
            _hover={{ bg: useSemanticToken('surface.hover') }}
            _active={{ transform: 'scale(0.95)' }}
          >
            <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.primary')}>1</Text>
          </Circle>

          <Circle
            size="45px"
            bg={useSemanticToken('surface.elevated')}
            cursor="pointer"
            _hover={{ bg: useSemanticToken('surface.hover') }}
            _active={{ transform: 'scale(0.95)' }}
          >
            <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.primary')}>2</Text>
          </Circle>
        </HStack>

        {/* Middle: EQ Knobs (3 columns: Left Deck, Center Browser, Right Deck) */}
        <HStack spacing={2} align="start" justify="space-between" w="full" pt={2}>
          {/* Left Deck EQ */}
          <VStack spacing={2}>
            <RotaryKnob cc={16} label="high / gain" color="gray" size="42px" />
            <RotaryKnob cc={17} label="mid" color="gray" size="42px" />
            <RotaryKnob cc={18} label="low" color="gray" size="42px" />
          </VStack>

          {/* Center: Browser Knob - Rotary encoder with push to select */}
          <VStack spacing={0.5} pt={0}>
            <Box
              position="relative"
              cursor="pointer"
              onClick={() => {
                console.log('🎵 Browser knob CLICKED - Load/Select track');
                // TODO: Trigger track load/select action
              }}
              _hover={{ transform: 'scale(1.05)' }}
              _active={{ transform: 'scale(0.98)' }}
              transition="all 0.1s"
            >
              <RotaryKnob cc={24} label="" color="gray" size="50px" />
            </Box>
            <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="bold">browser</Text>

            {/* Neural Mix Icon */}
            <Box
              w="40px"
              h="40px"
              border="2px solid"
              borderColor={useSemanticToken('border.default')}
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
              mt={1}
            >
              <Text fontSize="lg" color={useSemanticToken('text.secondary')}>⏭</Text>
              {/* Connection lines */}
              <Box position="absolute" left="-6px" top="50%" h="1px" w="6px" bg={useSemanticToken('border.default')} />
              <Box position="absolute" right="-6px" top="50%" h="1px" w="6px" bg={useSemanticToken('border.default')} />
            </Box>

            {/* Master Knob */}
            <VStack spacing={0.5} pt={1}>
              <RotaryKnob cc={25} label="" color="gray" size="42px" />
              <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="bold">master</Text>
            </VStack>
          </VStack>

          {/* Right Deck EQ */}
          <VStack spacing={2}>
            <RotaryKnob cc={19} label="high / gain" color="gray" size="42px" />
            <RotaryKnob cc={20} label="mid" color="gray" size="42px" />
            <RotaryKnob cc={21} label="low" color="gray" size="42px" />
          </VStack>
        </HStack>

        {/* Bottom: Filter Knobs + Headphone Cue Buttons (Gray Area) */}
        <HStack spacing={2} align="center" justify="space-between" w="full" bg={useSemanticToken('surface.elevated')} py={3} px={3} borderRadius="lg" mt={2}>
          {/* Left Filter */}
          <VStack spacing={0.5}>
            <RotaryKnob cc={22} label="" color="gray" size="42px" />
            <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="bold">filter</Text>
          </VStack>

          {/* Center: Headphone Cue Buttons */}
          <HStack spacing={3}>
            <VStack spacing={0.5}>
              <Circle
                size="35px"
                bg={getMidiValue(70) > 0 ? 'cyan.300' : 'cyan.400'}
                cursor="pointer"
                _hover={{ bg: 'cyan.300', transform: 'scale(1.05)' }}
                _active={{ transform: 'scale(0.95)' }}
                boxShadow={getMidiValue(70) > 0 ? '0 0 15px rgba(6, 182, 212, 0.8)' : '0 0 10px rgba(6, 182, 212, 0.5)'}
                onClick={() => handleValueChange(70, getMidiValue(70) > 0 ? 0 : 1)}
                transition="all 0.2s"
              >
                <Icon as={FiHeadphones} boxSize={5} color={useSemanticToken('text.primary')} />
              </Circle>
              <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="medium">1</Text>
            </VStack>

            <VStack spacing={0.5}>
              <Circle
                size="35px"
                bg={getMidiValue(71) > 0 ? 'cyan.300' : 'cyan.400'}
                cursor="pointer"
                _hover={{ bg: 'cyan.300', transform: 'scale(1.05)' }}
                _active={{ transform: 'scale(0.95)' }}
                boxShadow={getMidiValue(71) > 0 ? '0 0 15px rgba(6, 182, 212, 0.8)' : '0 0 10px rgba(6, 182, 212, 0.5)'}
                onClick={() => handleValueChange(71, getMidiValue(71) > 0 ? 0 : 1)}
                transition="all 0.2s"
              >
                <Icon as={FiHeadphones} boxSize={5} color={useSemanticToken('text.primary')} />
              </Circle>
              <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="medium">2</Text>
            </VStack>
          </HStack>

          {/* Right Filter */}
          <VStack spacing={0.5}>
            <RotaryKnob cc={23} label="" color="gray" size="42px" />
            <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="bold">filter</Text>
          </VStack>
        </HStack>

        {/* Hercules Logo */}
        <VStack spacing={0} mt={1}>
          <Text fontSize="xl" fontWeight="bold" color={useSemanticToken('text.subtle')} letterSpacing="wide">
            Hercules
          </Text>
          <HStack spacing={1}>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>▲</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>▲</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>▲</Text>
          </HStack>
        </VStack>

        {/* Channel Faders - Horizontal bars with round knobs */}
        <HStack spacing={6} justify="center" mt={2} w="full">
          <VStack spacing={1} flex={1} maxW="80px">
            <Slider
              orientation="vertical"
              h="100px"
              min={0}
              max={100}
              step={0.1}
              defaultValue={getMidiValue(7) * 100 || 75}
              onChange={(val) => handleValueChange(7, val / 100)}
              colorScheme="blue"
              focusThumbOnChange={false}
            >
              <SliderTrack bg="blue.400" w="6px" borderRadius="full" cursor="pointer">
                <SliderFilledTrack bg="blue.600" />
              </SliderTrack>
              <SliderThumb
                boxSize={6}
                bg={useSemanticToken('surface.elevated')}
                borderRadius="full"
                cursor="grab"
                _active={{ cursor: 'grabbing', transform: 'scale(1.1)' }}
                _hover={{ transform: 'scale(1.05)' }}
              />
            </Slider>
            <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="medium">deck 1</Text>
          </VStack>
          <VStack spacing={1} flex={1} maxW="80px">
            <Slider
              orientation="vertical"
              h="100px"
              min={0}
              max={100}
              step={0.1}
              defaultValue={getMidiValue(15) * 100 || 75}
              onChange={(val) => handleValueChange(15, val / 100)}
              colorScheme="purple"
              focusThumbOnChange={false}
            >
              <SliderTrack bg="purple.400" w="6px" borderRadius="full" cursor="pointer">
                <SliderFilledTrack bg="purple.600" />
              </SliderTrack>
              <SliderThumb
                boxSize={6}
                bg={useSemanticToken('surface.elevated')}
                borderRadius="full"
                cursor="grab"
                _active={{ cursor: 'grabbing', transform: 'scale(1.1)' }}
                _hover={{ transform: 'scale(1.05)' }}
              />
            </Slider>
            <Text fontSize="8px" color={useSemanticToken('text.secondary')} fontWeight="medium">deck 2</Text>
          </VStack>
        </HStack>

        {/* Crossfader - Constrained width */}
        <Box w="70%" mx="auto" mt={2}>
          <Slider
            min={0}
            max={100}
            step={0.1}
            defaultValue={getMidiValue(8) * 100 || 50}
            onChange={(val) => handleValueChange(8, val / 100)}
            colorScheme="gray"
            focusThumbOnChange={false}
          >
            <SliderTrack bg={useSemanticToken('border.default')} h="8px" borderRadius="full" cursor="pointer">
              <SliderFilledTrack bg={useSemanticToken('border.active')} />
            </SliderTrack>
            <SliderThumb
              boxSize={8}
              bg={useSemanticToken('surface.elevated')}
              borderRadius="full"
              cursor="grab"
              _active={{ cursor: 'grabbing', transform: 'scale(1.1)' }}
              _hover={{ transform: 'scale(1.05)' }}
            />
          </Slider>
          <Text fontSize="8px" color={useSemanticToken('text.secondary')} textAlign="center" mt={1} fontWeight="medium">
            crossfader
          </Text>
        </Box>

        {/* Mini faders at bottom - styled as bars */}
        <HStack spacing={1} justify="center" mt={1} mb={0}>
          {[...Array(6)].map((_, i) => (
            <Box key={i} w="6px" h="20px" bg={useSemanticToken('border.default')} borderRadius="sm" border="1px solid" borderColor={useSemanticToken('border.subtle')} />
          ))}
        </HStack>
      </VStack>
    );
  };

  return (
    <Box
      w="full"
      maxW="1400px"
      mx="auto"
      bg={useSemanticToken('surface.elevated')}
      borderRadius="2xl"
      p={4}
      boxShadow="none"
      border="none"
      position="relative"
      aspectRatio="2.4"
    >
      {/* Top bar */}
      <HStack justify="space-between" mb={1} px={2}>
        {/* djay branding */}
        <VStack align="start" spacing={0}>
          <Text fontSize="md" fontWeight="bold" color={useSemanticToken('text.secondary')} letterSpacing="tight">
            djay
          </Text>
        </VStack>

        {/* Controller Title */}
        <Text
          fontSize="xs"
          color={useSemanticToken('text.secondary')}
          fontWeight="bold"
          letterSpacing="wide"
        >
          DJCONTROL MIX ULTRA
        </Text>
      </HStack>

      {/* Connection Status */}
      <Badge
        position="absolute"
        top={4}
        right={4}
        colorScheme={isConnected ? 'green' : 'red'}
        fontSize="xs"
        px={3}
        py={1}
      >
        {isConnected ? '✓ CONNECTED' : '✗ DISCONNECTED'}
      </Badge>

      <HStack spacing={1} align="start" position="relative">
        {/* Deck 1 */}
        <Deck side="left" deckNum={1} />

        {/* Center Mixer */}
        <CenterMixer />

        {/* Deck 2 */}
        <Deck side="right" deckNum={2} />
      </HStack>
    </Box>
  );
}

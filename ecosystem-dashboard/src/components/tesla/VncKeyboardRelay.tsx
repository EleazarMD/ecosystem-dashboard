/**
 * VNC Compact Virtual Keyboard for Tesla Browser
 *
 * Tesla's native on-screen keyboard is large and obstructive.
 * noVNC's virtual keyboard doesn't work inside cross-origin iframes.
 *
 * This component provides a compact custom QWERTY keyboard (~180px tall)
 * that floats over the browser view. Keystrokes are buffered into a text
 * field and sent to VNC via clipboard copy + paste.
 *
 * Also includes a dictation button (Web Speech API — may be blocked by
 * Tesla's Chromium, fails gracefully with a hint to use Nova instead).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Input,
  IconButton,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  Collapse,
} from '@chakra-ui/react';
import {
  Keyboard,
  Send,
  X,
  Mic,
  MicOff,
  Delete,
  ArrowBigUp,
  Space,
  Clipboard,
} from 'lucide-react';
import { Icon } from '@chakra-ui/react';

interface VncKeyboardRelayProps {
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  isExpanded?: boolean;
}

// Compact QWERTY layout
const ROWS_LOWER = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];
const ROWS_UPPER = ROWS_LOWER.map(row => row.map(k => k.toUpperCase()));
const NUMS_ROW = ['1','2','3','4','5','6','7','8','9','0'];
const SYMS_ROW = ['@','#','$','%','&','*','-','+','(',')'];

type KeyboardMode = 'lower' | 'upper' | 'numbers';

export default function VncKeyboardRelay({ iframeRef, isExpanded }: VncKeyboardRelayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [textBuffer, setTextBuffer] = useState('');
  const [mode, setMode] = useState<KeyboardMode>('lower');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const toast = useToast();

  const keyBgLight = useColorModeValue('gray.100', 'whiteAlpha.150');
  const keyBgHoverLight = useColorModeValue('gray.200', 'whiteAlpha.250');
  const keyColorLight = useColorModeValue('gray.800', 'white');
  const specialKeyBgLight = useColorModeValue('gray.300', 'whiteAlpha.200');
  const panelBgLight = useColorModeValue('white', 'gray.800');
  const panelBorderLight = useColorModeValue('gray.200', 'gray.600');
  const mutedColorLight = useColorModeValue('gray.500', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.400');
  const inputBgLight = useColorModeValue('gray.50', 'gray.700');
  const keyActiveLight = useColorModeValue('gray.300', 'whiteAlpha.300');
  const toggleBgLight = useColorModeValue('white', 'gray.700');

  // Resolve expanded vs default — solid opaque backgrounds for readability
  const keyBg = isExpanded ? 'gray.600' : keyBgLight;
  const keyBgHover = isExpanded ? 'gray.500' : keyBgHoverLight;
  const keyColor = isExpanded ? 'white' : keyColorLight;
  const specialKeyBg = isExpanded ? 'gray.700' : specialKeyBgLight;
  const panelBg = isExpanded ? 'gray.900' : panelBgLight;
  const panelBorder = isExpanded ? 'gray.600' : panelBorderLight;
  const textColor = isExpanded ? 'white' : keyColorLight;
  const mutedColor = isExpanded ? 'gray.400' : mutedColorLight;
  const inputBg = isExpanded ? 'gray.800' : inputBgLight;
  const keyActive = isExpanded ? 'gray.400' : keyActiveLight;
  const toggleBg = isExpanded ? 'gray.700' : toggleBgLight;

  // Relay a single keystroke to the noVNC iframe via postMessage
  // Requires keyboard-relay.js deployed in the noVNC container
  const relayKey = useCallback((key: string) => {
    if (!iframeRef?.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        { type: 'keyboard', key }, '*'
      );
    } catch {
      // Cross-origin — expected if relay not deployed
    }
  }, [iframeRef]);

  // Send buffered text — types each character as real keystrokes in VNC
  const handleSendText = useCallback(async () => {
    if (!textBuffer.trim()) return;
    // Primary: use typestring to send real keystrokes (requires keyboard-relay.js)
    if (iframeRef?.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: 'typestring', text: textBuffer }, '*'
        );
        toast({
          title: 'Sent to browser',
          status: 'success',
          duration: 1500,
          position: 'top',
          isClosable: true,
        });
        setTextBuffer('');
        return;
      } catch {
        // Fall through to clipboard fallback
      }
    }
    // Fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(textBuffer);
      toast({
        title: 'Copied — tap browser then Ctrl+V',
        status: 'info',
        duration: 2500,
        position: 'top',
      });
      setTextBuffer('');
    } catch {
      toast({
        title: 'Could not send text',
        status: 'warning',
        duration: 3000,
        position: 'top',
      });
    }
  }, [textBuffer, toast, iframeRef]);

  // Key press handler — buffer locally AND try relay to VNC
  const handleKey = useCallback((key: string) => {
    setTextBuffer(prev => prev + key);
    relayKey(key);
    // Auto-return to lowercase after typing one uppercase letter
    if (mode === 'upper') setMode('lower');
  }, [mode, relayKey]);

  const handleBackspace = useCallback(() => {
    setTextBuffer(prev => prev.slice(0, -1));
    relayKey('Backspace');
  }, [relayKey]);

  const handleEnter = useCallback(() => {
    // Relay Enter key to VNC, then also copy buffer to clipboard
    relayKey('Enter');
    handleSendText();
  }, [handleSendText, relayKey]);

  // Web Speech API dictation (graceful fail on Tesla)
  const toggleDictation = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: 'Speech not available',
        description: 'Tesla blocks mic access. Use Nova voice: "Hey Nova, type [text]"',
        status: 'info',
        duration: 4000,
        position: 'top',
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setTextBuffer(prev => prev + transcript);
      };
      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: 'Mic blocked by Tesla browser',
          description: 'Use Nova voice instead: "Hey Nova, type [text]"',
          status: 'info',
          duration: 4000,
          position: 'top',
        });
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      toast({
        title: 'Mic blocked by Tesla browser',
        description: 'Use Nova voice instead: "Hey Nova, type [text]"',
        status: 'info',
        duration: 4000,
        position: 'top',
      });
    }
  }, [isListening, toast]);

  // Cleanup speech recognition
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const rows = mode === 'upper' ? ROWS_UPPER : mode === 'numbers' ? [NUMS_ROW, SYMS_ROW] : ROWS_LOWER;

  // Common key button style
  const KeyBtn = ({ label, onPress, w, bg: bgOverride, color: colorOverride, children }: {
    label: string; onPress: () => void; w?: string; bg?: string; color?: string; children?: React.ReactNode;
  }) => (
    <Box
      as="button"
      h="36px"
      w={w || 'auto'}
      minW={w ? undefined : '28px'}
      flex={w ? undefined : 1}
      bg={bgOverride || keyBg}
      color={colorOverride || textColor}
      borderRadius="md"
      fontSize="sm"
      fontWeight="semibold"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="all 0.1s"
      _hover={{ bg: bgOverride ? undefined : keyBgHover }}
      _active={{ transform: 'scale(0.95)', bg: keyActive }}
      onClick={onPress}
      aria-label={label}
      userSelect="none"
    >
      {children || label}
    </Box>
  );

  return (
    <Box
      position={isExpanded ? 'absolute' : 'relative'}
      bottom={isExpanded ? 0 : undefined}
      left={isExpanded ? 0 : undefined}
      right={isExpanded ? 0 : undefined}
      zIndex={20}
      w={isExpanded ? '100%' : '100%'}
    >
      {/* Keyboard toggle button (when closed) */}
      {!isOpen && (
        <Box position={isExpanded ? 'absolute' : 'relative'} bottom={isExpanded ? 3 : undefined} left={isExpanded ? 3 : undefined}>
          <Tooltip label="Open compact keyboard" placement="top">
            <IconButton
              aria-label="Open keyboard"
              icon={<Icon as={Keyboard} boxSize={4} />}
              size="sm"
              variant="solid"
              bg={toggleBg}
              color={isExpanded ? 'whiteAlpha.900' : accentColor}
              backdropFilter={isExpanded ? 'blur(8px)' : undefined}
              borderRadius="full"
              onClick={() => setIsOpen(true)}
              _hover={{ bg: isExpanded ? 'blackAlpha.700' : undefined }}
              boxShadow="md"
            />
          </Tooltip>
        </Box>
      )}

      {/* Compact Virtual Keyboard */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          bg={panelBg}
          backdropFilter="blur(16px)"
          borderTop="1px solid"
          borderColor={panelBorder}
          px={2}
          pt={2}
          pb={3}
          borderTopRadius={isExpanded ? 'xl' : undefined}
        >
          {/* Text buffer + action bar */}
          <HStack mb={2} spacing={1}>
            <Input
              value={textBuffer}
              onChange={(e) => setTextBuffer(e.target.value)}
              placeholder="Text appears here..."
              size="sm"
              bg={inputBg}
              border="none"
              borderRadius="lg"
              color={textColor}
              _placeholder={{ color: mutedColor }}
              _focus={{ bg: inputBg, boxShadow: 'none' }}
              readOnly
            />
            <Tooltip label="Copy to clipboard" placement="top">
              <IconButton
                aria-label="Copy to clipboard"
                icon={<Icon as={Clipboard} boxSize={3.5} />}
                size="sm"
                variant="ghost"
                color={textBuffer ? accentColor : mutedColor}
                onClick={handleSendText}
                isDisabled={!textBuffer}
              />
            </Tooltip>
            <Tooltip label={isListening ? 'Stop dictation' : 'Dictate (may need Nova)'} placement="top">
              <IconButton
                aria-label="Dictate"
                icon={<Icon as={isListening ? MicOff : Mic} boxSize={3.5} />}
                size="sm"
                variant="ghost"
                color={isListening ? 'red.400' : mutedColor}
                onClick={toggleDictation}
              />
            </Tooltip>
            <IconButton
              aria-label="Close keyboard"
              icon={<Icon as={X} boxSize={3.5} />}
              size="sm"
              variant="ghost"
              color={mutedColor}
              onClick={() => { setIsOpen(false); setTextBuffer(''); }}
            />
          </HStack>

          {/* Keyboard rows */}
          <VStack spacing={1} align="stretch">
            {rows.map((row, ri) => (
              <HStack key={ri} spacing={1} justify="center">
                {/* Shift on left of bottom row */}
                {ri === (mode === 'numbers' ? -1 : 2) && (
                  <KeyBtn
                    label="Shift"
                    onPress={() => setMode(mode === 'upper' ? 'lower' : 'upper')}
                    w="42px"
                    bg={mode === 'upper' ? accentColor : (isExpanded ? 'whiteAlpha.200' : specialKeyBg)}
                    color={mode === 'upper' ? 'white' : undefined}
                  >
                    <Icon as={ArrowBigUp} boxSize={4} />
                  </KeyBtn>
                )}
                {row.map((key) => (
                  <KeyBtn key={key} label={key} onPress={() => handleKey(key)}>
                    {key}
                  </KeyBtn>
                ))}
                {/* Backspace on right of bottom row */}
                {ri === (mode === 'numbers' ? 1 : 2) && (
                  <KeyBtn
                    label="Backspace"
                    onPress={handleBackspace}
                    w="42px"
                    bg={isExpanded ? 'whiteAlpha.200' : specialKeyBg}
                  >
                    <Icon as={Delete} boxSize={4} />
                  </KeyBtn>
                )}
              </HStack>
            ))}

            {/* Bottom row: mode switch, space, enter/send */}
            <HStack spacing={1}>
              <KeyBtn
                label={mode === 'numbers' ? 'ABC' : '123'}
                onPress={() => setMode(mode === 'numbers' ? 'lower' : 'numbers')}
                w="48px"
                bg={isExpanded ? 'whiteAlpha.200' : specialKeyBg}
              >
                <Text fontSize="xs" fontWeight="bold">{mode === 'numbers' ? 'ABC' : '123'}</Text>
              </KeyBtn>
              <KeyBtn label="Space" onPress={() => handleKey(' ')}>
                <Icon as={Space} boxSize={4} />
              </KeyBtn>
              <KeyBtn label="." onPress={() => handleKey('.')} w="32px">.</KeyBtn>
              <KeyBtn
                label="Send"
                onPress={handleEnter}
                w="64px"
                bg={textBuffer ? accentColor : (isExpanded ? 'whiteAlpha.200' : specialKeyBg)}
                color={textBuffer ? 'white' : undefined}
              >
                <HStack spacing={1}>
                  <Icon as={Send} boxSize={3} />
                  <Text fontSize="xs">Send</Text>
                </HStack>
              </KeyBtn>
            </HStack>
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
}

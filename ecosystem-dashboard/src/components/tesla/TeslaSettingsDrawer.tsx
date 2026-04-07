/**
 * Tesla Dashboard Settings Drawer
 * 
 * Settings panel for noVNC browser config, bookmarks, and display preferences.
 * Syncs to localStorage + API for cross-device persistence.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Select,
  IconButton,
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Divider,
  Badge,
  Tooltip,
  FormControl,
  FormLabel,
  FormHelperText,
  InputGroup,
  InputRightElement,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import {
  Settings,
  Globe,
  Bookmark,
  Monitor,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Icon } from '@chakra-ui/react';
import type { TeslaDashboardSettings, TeslaBookmark } from '@/hooks/useTeslaSettings';

interface TeslaSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TeslaDashboardSettings;
  isSaving: boolean;
  onUpdateSettings: (updates: Partial<TeslaDashboardSettings>) => Promise<TeslaDashboardSettings>;
  onUpdateVnc: (updates: Partial<TeslaDashboardSettings['vnc']>) => Promise<TeslaDashboardSettings>;
  onUpdateBookmarks: (bookmarks: TeslaBookmark[]) => Promise<TeslaDashboardSettings>;
  onAddBookmark: (bookmark: TeslaBookmark) => Promise<TeslaDashboardSettings>;
  onRemoveBookmark: (id: string) => Promise<TeslaDashboardSettings>;
}

const ICON_OPTIONS = [
  'Play', 'ShoppingCart', 'BookOpen', 'Map', 'Newspaper', 'TrendingUp',
  'Globe', 'Search', 'Mail', 'Coffee', 'Music', 'Camera',
  'FileText', 'Video', 'Monitor', 'Brain',
];

const COLOR_OPTIONS = [
  { label: 'Red', value: 'red.400' },
  { label: 'Orange', value: 'orange.400' },
  { label: 'Blue', value: 'blue.400' },
  { label: 'Green', value: 'green.400' },
  { label: 'Purple', value: 'purple.400' },
  { label: 'Teal', value: 'teal.400' },
  { label: 'Pink', value: 'pink.400' },
  { label: 'Yellow', value: 'yellow.400' },
];

export default function TeslaSettingsDrawer({
  isOpen,
  onClose,
  settings,
  isSaving,
  onUpdateSettings,
  onUpdateVnc,
  onUpdateBookmarks,
  onAddBookmark,
  onRemoveBookmark,
}: TeslaSettingsDrawerProps) {
  const toast = useToast();
  const bgCard = useColorModeValue('white', 'gray.800');
  const bgSection = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.400');

  const [showPassword, setShowPassword] = useState(false);
  const [newBookmark, setNewBookmark] = useState<Partial<TeslaBookmark>>({
    label: '',
    url: '',
    icon: 'Globe',
    color: 'blue.400',
  });

  const handleAddBookmark = useCallback(() => {
    if (!newBookmark.label || !newBookmark.url) {
      toast({ title: 'Label and URL required', status: 'warning', duration: 2000, position: 'top' });
      return;
    }
    const bookmark: TeslaBookmark = {
      id: `custom-${Date.now()}`,
      label: newBookmark.label!,
      url: newBookmark.url!.startsWith('http') ? newBookmark.url! : `https://${newBookmark.url}`,
      icon: newBookmark.icon || 'Globe',
      color: newBookmark.color || 'blue.400',
    };
    onAddBookmark(bookmark);
    setNewBookmark({ label: '', url: '', icon: 'Globe', color: 'blue.400' });
    toast({ title: 'Bookmark added', status: 'success', duration: 1500, position: 'top' });
  }, [newBookmark, onAddBookmark, toast]);

  const handleResetDefaults = useCallback(() => {
    onUpdateSettings({
      vnc: {
        host: 'vnc.hyperspaceanalytics.com',
        password: '',
        autoConnect: true,
        resize: 'scale',
        quality: 6,
        showDotCursor: true,
        viewOnly: false,
      },
    });
    toast({ title: 'VNC settings reset to defaults', status: 'info', duration: 2000, position: 'top' });
  }, [onUpdateSettings, toast]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="md" placement="right">
      <DrawerOverlay />
      <DrawerContent bg={bgCard}>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
          <HStack spacing={3}>
            <Box bg={accentColor} p={2} borderRadius="lg">
              <Icon as={Settings} color="white" boxSize={5} />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" fontSize="lg">Tesla Dashboard</Text>
              <Text fontSize="sm" color={textSecondary}>Settings & Configuration</Text>
            </VStack>
            {isSaving && <Badge colorScheme="blue" ml="auto">Saving...</Badge>}
          </HStack>
        </DrawerHeader>

        <DrawerBody py={4}>
          <VStack spacing={6} align="stretch">

            {/* === VNC Browser Section === */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Icon as={Globe} color={accentColor} boxSize={4} />
                <Text fontWeight="bold" fontSize="md">Browser Connection</Text>
              </HStack>
              <VStack spacing={4} bg={bgSection} p={4} borderRadius="xl" border="1px solid" borderColor={borderColor}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">VNC Host</FormLabel>
                  <Input
                    size="sm"
                    borderRadius="lg"
                    value={settings.vnc.host}
                    onChange={(e) => onUpdateVnc({ host: e.target.value })}
                    placeholder="vnc.example.com"
                  />
                  <FormHelperText fontSize="xs">noVNC server hostname (without https://)</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">Password</FormLabel>
                  <InputGroup size="sm">
                    <Input
                      borderRadius="lg"
                      type={showPassword ? 'text' : 'password'}
                      value={settings.vnc.password}
                      onChange={(e) => onUpdateVnc({ password: e.target.value })}
                      placeholder="VNC password (optional)"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle password"
                        icon={<Icon as={showPassword ? EyeOff : Eye} boxSize={3.5} />}
                        size="xs"
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormHelperText fontSize="xs">Auto-authenticates on connect</FormHelperText>
                </FormControl>

                <HStack w="100%" spacing={4}>
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm" fontWeight="medium">Resize Mode</FormLabel>
                    <Select
                      size="sm"
                      borderRadius="lg"
                      value={settings.vnc.resize}
                      onChange={(e) => onUpdateVnc({ resize: e.target.value as 'scale' | 'remote' | 'off' })}
                    >
                      <option value="scale">Scale to fit</option>
                      <option value="remote">Remote resize</option>
                      <option value="off">No resize</option>
                    </Select>
                  </FormControl>
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm" fontWeight="medium">Quality ({settings.vnc.quality})</FormLabel>
                    <Slider
                      min={0}
                      max={9}
                      step={1}
                      value={settings.vnc.quality}
                      onChange={(val) => onUpdateVnc({ quality: val })}
                    >
                      <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                      <SliderThumb boxSize={4} />
                    </Slider>
                  </FormControl>
                </HStack>

                <HStack w="100%" spacing={6}>
                  <FormControl display="flex" alignItems="center" flex={1}>
                    <FormLabel fontSize="sm" mb={0} mr={2}>Auto-connect</FormLabel>
                    <Switch
                      size="sm"
                      isChecked={settings.vnc.autoConnect}
                      onChange={(e) => onUpdateVnc({ autoConnect: e.target.checked })}
                      colorScheme="blue"
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center" flex={1}>
                    <FormLabel fontSize="sm" mb={0} mr={2}>Show cursor</FormLabel>
                    <Switch
                      size="sm"
                      isChecked={settings.vnc.showDotCursor}
                      onChange={(e) => onUpdateVnc({ showDotCursor: e.target.checked })}
                      colorScheme="blue"
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center" flex={1}>
                    <FormLabel fontSize="sm" mb={0} mr={2}>View only</FormLabel>
                    <Switch
                      size="sm"
                      isChecked={settings.vnc.viewOnly}
                      onChange={(e) => onUpdateVnc({ viewOnly: e.target.checked })}
                      colorScheme="blue"
                    />
                  </FormControl>
                </HStack>

                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Icon as={RotateCcw} boxSize={3.5} />}
                  onClick={handleResetDefaults}
                  color={textSecondary}
                >
                  Reset to defaults
                </Button>
              </VStack>
            </Box>

            <Divider borderColor={borderColor} />

            {/* === Bookmarks Section === */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Icon as={Bookmark} color={accentColor} boxSize={4} />
                <Text fontWeight="bold" fontSize="md">Quick Launch Bookmarks</Text>
                <Badge colorScheme="blue" fontSize="2xs">{settings.bookmarks.length}</Badge>
              </HStack>

              <VStack spacing={2} mb={4}>
                {settings.bookmarks.map((bm: TeslaBookmark) => (
                  <HStack
                    key={bm.id}
                    w="100%"
                    bg={bgSection}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                    spacing={3}
                  >
                    <Box w={3} h={3} borderRadius="full" bg={bm.color} flexShrink={0} />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="sm" fontWeight="medium">{bm.label}</Text>
                      <Text fontSize="xs" color={textSecondary} noOfLines={1}>{bm.url}</Text>
                    </VStack>
                    <Tooltip label="Remove bookmark">
                      <IconButton
                        aria-label="Remove"
                        icon={<Icon as={Trash2} boxSize={3.5} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => onRemoveBookmark(bm.id)}
                      />
                    </Tooltip>
                  </HStack>
                ))}
              </VStack>

              {/* Add new bookmark */}
              <VStack spacing={3} bg={bgSection} p={4} borderRadius="xl" border="1px dashed" borderColor={borderColor}>
                <Text fontSize="sm" fontWeight="bold" color={textSecondary}>Add Bookmark</Text>
                <HStack w="100%" spacing={2}>
                  <Input
                    size="sm"
                    borderRadius="lg"
                    placeholder="Label"
                    value={newBookmark.label}
                    onChange={(e) => setNewBookmark((prev: Partial<TeslaBookmark>) => ({ ...prev, label: e.target.value }))}
                    flex={1}
                  />
                  <Select
                    size="sm"
                    borderRadius="lg"
                    value={newBookmark.color}
                    onChange={(e) => setNewBookmark((prev: Partial<TeslaBookmark>) => ({ ...prev, color: e.target.value }))}
                    w="120px"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </HStack>
                <Input
                  size="sm"
                  borderRadius="lg"
                  placeholder="https://example.com"
                  value={newBookmark.url}
                  onChange={(e) => setNewBookmark((prev: Partial<TeslaBookmark>) => ({ ...prev, url: e.target.value }))}
                />
                <HStack w="100%" spacing={2}>
                  <Select
                    size="sm"
                    borderRadius="lg"
                    value={newBookmark.icon}
                    onChange={(e) => setNewBookmark((prev: Partial<TeslaBookmark>) => ({ ...prev, icon: e.target.value }))}
                    flex={1}
                  >
                    {ICON_OPTIONS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    leftIcon={<Icon as={Plus} boxSize={3.5} />}
                    onClick={handleAddBookmark}
                    borderRadius="lg"
                  >
                    Add
                  </Button>
                </HStack>
              </VStack>
            </Box>

            <Divider borderColor={borderColor} />

            {/* === Display Section === */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Icon as={Monitor} color={accentColor} boxSize={4} />
                <Text fontWeight="bold" fontSize="md">Display Preferences</Text>
              </HStack>
              <VStack spacing={4} bg={bgSection} p={4} borderRadius="xl" border="1px solid" borderColor={borderColor}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">Theme</FormLabel>
                  <Select
                    size="sm"
                    borderRadius="lg"
                    value={settings.display.theme}
                    onChange={(e) => onUpdateSettings({ display: { ...settings.display, theme: e.target.value as 'auto' | 'light' | 'dark' } })}
                  >
                    <option value="auto">Auto (match system)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">Dashboard Style</FormLabel>
                  <Select
                    size="sm"
                    borderRadius="lg"
                    value={settings.display.themeStyle}
                    onChange={(e) => onUpdateSettings({ display: { ...settings.display, themeStyle: e.target.value as 'classic' | 'futuristic' } })}
                  >
                    <option value="classic">Classic (Current)</option>
                    <option value="futuristic">Futuristic (Tesla UI)</option>
                  </Select>
                  <FormHelperText fontSize="xs">Choose between classic cards or futuristic Tesla-style interface</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">
                    Browser Height ({settings.display.browserHeightPercent}%)
                  </FormLabel>
                  <Slider
                    min={40}
                    max={80}
                    step={5}
                    value={settings.display.browserHeightPercent}
                    onChange={(val) => onUpdateSettings({ display: { ...settings.display, browserHeightPercent: val } })}
                  >
                    <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                    <SliderThumb boxSize={4} />
                  </Slider>
                  <FormHelperText fontSize="xs">Height of the browser panel on Page 2</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium">
                    Nova Panel Width ({settings.display.novaWidthPercent}%)
                  </FormLabel>
                  <Slider
                    min={25}
                    max={50}
                    step={1}
                    value={settings.display.novaWidthPercent}
                    onChange={(val) => onUpdateSettings({ display: { ...settings.display, novaWidthPercent: val } })}
                  >
                    <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                    <SliderThumb boxSize={4} />
                  </Slider>
                  <FormHelperText fontSize="xs">Width of the Nova voice assistant panel</FormHelperText>
                </FormControl>
              </VStack>
            </Box>

          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

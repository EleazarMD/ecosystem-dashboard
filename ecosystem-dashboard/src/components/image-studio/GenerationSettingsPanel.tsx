import React from 'react';
import {
    Box,
    VStack,
    Text,
    HStack,
    Select,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    FormControl,
    FormLabel,
    Switch,
    SimpleGrid,
    Icon,
    Button,
    Tooltip,
} from '@chakra-ui/react';
import { FiInfo, FiSettings, FiMaximize, FiSmartphone, FiMonitor, FiSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface StylePresetProps {
    label: string;
    image: string;
    isSelected?: boolean;
    onClick?: () => void;
}

const StylePreset: React.FC<StylePresetProps> = ({ label, image, isSelected, onClick }) => {
    const borderColor = useSemanticToken('interactive.primary');
    const hoverBg = useSemanticToken('surface.hover');

    return (
        <Box
            cursor="pointer"
            onClick={onClick}
            borderRadius="md"
            overflow="hidden"
            borderWidth="2px"
            borderColor={isSelected ? borderColor : 'transparent'}
            transition="all 0.2s"
            _hover={{ transform: 'scale(1.02)' }}
            position="relative"
        >
            <Box h="60px" bg={hoverBg} backgroundImage={`url(${image})`} backgroundSize="cover" backgroundPosition="center" />
            <Box p={1} bg="rgba(0,0,0,0.6)" position="absolute" bottom={0} w="100%">
                <Text fontSize="xs" color="whiteAlpha.900" textAlign="center" isTruncated>
                    {label}
                </Text>
            </Box>
        </Box>
    );
};

export const GenerationSettingsPanel: React.FC = () => {
    const sectionTitleColor = useSemanticToken('text.secondary');
    const activeIconColor = useSemanticToken('interactive.primary');

    return (
        <Box h="100%" w="300px" flexShrink={0}>
            <GlassPanel h="100%" p={4} overflowY="auto">
                <VStack align="stretch" spacing={6}>

                    <HStack justify="space-between">
                        <Text fontWeight="bold" fontSize="md">Settings</Text>
                        <Icon as={FiSettings} color={sectionTitleColor} />
                    </HStack>

                    {/* Model Selection */}
                    <FormControl>
                        <FormLabel fontSize="sm" fontWeight="medium">Model</FormLabel>
                        <Select size="sm" borderRadius="md" defaultValue="sdxl">
                            <option value="sdxl">Stable Diffusion XL</option>
                            <option value="mj">Midjourney v6</option>
                            <option value="dalle3">DALL-E 3</option>
                            <option value="flux">Flux.1 Pro</option>
                        </Select>
                    </FormControl>

                    {/* Aspect Ratio */}
                    <FormControl>
                        <FormLabel fontSize="sm" fontWeight="medium">Aspect Ratio</FormLabel>
                        <SimpleGrid columns={4} spacing={2}>
                            <Button size="sm" variant="outline" colorScheme="blue"><Icon as={FiSquare} /></Button>
                            <Button size="sm" variant="ghost"><Icon as={FiMonitor} /></Button>
                            <Button size="sm" variant="ghost"><Icon as={FiSmartphone} /></Button>
                            <Button size="sm" variant="ghost"><Icon as={FiMaximize} /></Button>
                        </SimpleGrid>
                        <Text fontSize="xs" color={sectionTitleColor} mt={1} textAlign="center">1:1 Square</Text>
                    </FormControl>

                    {/* Style Presets */}
                    <Box>
                        <FormLabel fontSize="sm" fontWeight="medium" mb={2}>Style</FormLabel>
                        <SimpleGrid columns={3} spacing={2}>
                            <StylePreset label="None" image="" isSelected />
                            <StylePreset label="Cinematic" image="" />
                            <StylePreset label="Anime" image="" />
                            <StylePreset label="Digital Art" image="" />
                            <StylePreset label="Photo" image="" />
                            <StylePreset label="3D Model" image="" />
                        </SimpleGrid>
                    </Box>

                    {/* Advanced Settings */}
                    <VStack align="stretch" spacing={4}>
                        <FormControl>
                            <HStack justify="space-between" mb={1}>
                                <FormLabel fontSize="sm" m={0}>Steps</FormLabel>
                                <Text fontSize="xs" color={sectionTitleColor}>30</Text>
                            </HStack>
                            <Slider aria-label="steps" defaultValue={30} min={10} max={150}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb />
                            </Slider>
                        </FormControl>

                        <FormControl>
                            <HStack justify="space-between" mb={1}>
                                <FormLabel fontSize="sm" m={0}>CFG Scale</FormLabel>
                                <Text fontSize="xs" color={sectionTitleColor}>7.0</Text>
                            </HStack>
                            <Slider aria-label="cfg" defaultValue={7} min={1} max={20} step={0.5}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb />
                            </Slider>
                        </FormControl>

                        <FormControl display="flex" alignItems="center" justifyContent="space-between">
                            <FormLabel fontSize="sm" mb={0}>High Res Fix</FormLabel>
                            <Switch size="sm" />
                        </FormControl>
                    </VStack>

                </VStack>
            </GlassPanel>
        </Box>
    );
};

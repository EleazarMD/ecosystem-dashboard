import React, { useEffect, useState } from 'react';
import {
    Box,
    VStack,
    Text,
    Icon,
    HStack,
    Divider,
    Badge,
    Button,
} from '@chakra-ui/react';
import {
    FiImage,
    FiGrid,
    FiLayers,
    FiClock,
    FiStar,
    FiUploadCloud,
    FiPlus,
    FiEdit3,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useImageStudio } from '@/contexts/ImageStudioContext';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    badge?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, badge }) => {
    const activeBg = useSemanticToken('surface.active');
    const hoverBg = useSemanticToken('surface.hover');
    const activeColor = useSemanticToken('interactive.primary');
    const textColor = useSemanticToken('text.primary');
    const mutedColor = useSemanticToken('text.secondary');

    return (
        <HStack
            w="100%"
            p={3}
            cursor="pointer"
            borderRadius="md"
            bg={isActive ? activeBg : 'transparent'}
            color={isActive ? activeColor : mutedColor}
            _hover={{
                bg: isActive ? activeBg : hoverBg,
                color: isActive ? activeColor : textColor,
            }}
            onClick={onClick}
            justify="space-between"
            transition="all 0.2s"
        >
            <HStack spacing={3}>
                <Icon as={icon} boxSize={5} />
                <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'medium'}>
                    {label}
                </Text>
            </HStack>
            {badge && (
                <Badge colorScheme={isActive ? 'blue' : 'gray'} variant="subtle" fontSize="xs">
                    {badge}
                </Badge>
            )}
        </HStack>
    );
};

export const ImageStudioSidebar: React.FC = () => {
    const borderColor = useSemanticToken('border.subtle');
    const sectionTitleColor = useSemanticToken('text.secondary');
    const { activeView, setActiveView, galleryImages, collections } = useImageStudio();

    return (
        <Box h="100%" w="280px" flexShrink={0}>
            <GlassPanel h="100%" p={4} display="flex" flexDirection="column">
                <VStack align="stretch" spacing={6} flex={1}>

                    {/* Main Navigation */}
                    <Box>
                        <Text
                            fontSize="xs"
                            fontWeight="bold"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            color={sectionTitleColor}
                            mb={3}
                            px={3}
                        >
                            Studio
                        </Text>
                        <VStack spacing={1}>
                            <NavItem 
                                icon={FiImage} 
                                label="Generate" 
                                isActive={activeView === 'generate'} 
                                onClick={() => setActiveView('generate')}
                            />
                            <NavItem 
                                icon={FiEdit3} 
                                label="Edit" 
                                isActive={activeView === 'edit'} 
                                onClick={() => setActiveView('edit')}
                            />
                            <NavItem 
                                icon={FiGrid} 
                                label="Gallery" 
                                badge={galleryImages.length.toString()}
                                isActive={activeView === 'gallery'}
                                onClick={() => setActiveView('gallery')}
                            />
                            <NavItem 
                                icon={FiLayers} 
                                label="Collections" 
                                badge={collections.length.toString()}
                                isActive={activeView === 'collections'}
                                onClick={() => setActiveView('collections')}
                            />
                        </VStack>
                    </Box>

                    <Divider borderColor={borderColor} />

                    {/* Assets & History */}
                    <Box>
                        <Text
                            fontSize="xs"
                            fontWeight="bold"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            color={sectionTitleColor}
                            mb={3}
                            px={3}
                        >
                            Assets
                        </Text>
                        <VStack spacing={1}>
                            <NavItem 
                                icon={FiClock} 
                                label="Recent Prompts" 
                                isActive={activeView === 'recent'}
                                onClick={() => setActiveView('recent')}
                            />
                            <NavItem 
                                icon={FiStar} 
                                label="Favorites" 
                                isActive={activeView === 'favorites'}
                                onClick={() => setActiveView('favorites')}
                            />
                            <NavItem 
                                icon={FiUploadCloud} 
                                label="Uploads" 
                                isActive={activeView === 'uploads'}
                                onClick={() => setActiveView('uploads')}
                            />
                        </VStack>
                    </Box>

                    <Divider borderColor={borderColor} />

                    {/* Quick Drop Zone */}
                    <Box
                        p={4}
                        border="2px dashed"
                        borderColor={borderColor}
                        borderRadius="md"
                        textAlign="center"
                        cursor="pointer"
                        _hover={{ borderColor: useSemanticToken('interactive.primary') }}
                        transition="all 0.2s"
                    >
                        <VStack spacing={2}>
                            <Icon as={FiPlus} boxSize={6} color={sectionTitleColor} />
                            <Text fontSize="xs" color={sectionTitleColor}>
                                Drop reference images here
                            </Text>
                        </VStack>
                    </Box>

                </VStack>

                {/* Bottom Actions */}
                <Box pt={4}>
                    <Button w="100%" variant="outline" size="sm" leftIcon={<FiPlus />}>
                        New Project
                    </Button>
                </Box>
            </GlassPanel>
        </Box>
    );
};

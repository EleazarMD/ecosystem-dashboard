import React from 'react';
import {
    Box,
    VStack,
    Text,
    HStack,
    Icon,
    Button,
    Divider,
} from '@chakra-ui/react';
import {
    HomeIcon,
    GlobeAltIcon,
    BookOpenIcon,
    UserCircleIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EntropySidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onNewThread: () => void;
}

export const EntropySidebar: React.FC<EntropySidebarProps> = ({
    activeTab,
    onTabChange,
    onNewThread,
}) => {
    const bg = useSemanticToken('surface.default');
    const borderColor = useSemanticToken('border.subtle');
    const textColor = useSemanticToken('text.primary');
    const secondaryTextColor = useSemanticToken('text.secondary');
    const hoverBg = useSemanticToken('surface.hover');

    const navItems = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'discover', label: 'Discover', icon: GlobeAltIcon },
        { id: 'library', label: 'Library', icon: BookOpenIcon },
    ];

    return (
        <Box
            w="220px"
            h="full"
            borderRight="1px solid"
            borderColor={borderColor}
            bg={bg}
            py={6}
            px={3}
            display={{ base: 'none', md: 'flex' }}
            flexDirection="column"
        >
            {/* New Thread Button */}
            <Button
                w="full"
                leftIcon={<Icon as={PlusIcon} w={5} h={5} />}
                colorScheme="gray"
                variant="outline"
                borderRadius="full"
                mb={6}
                justifyContent="flex-start"
                pl={4}
                onClick={onNewThread}
                borderColor={borderColor}
                _hover={{ bg: hoverBg }}
            >
                New Thread
            </Button>

            {/* Navigation Items */}
            <VStack spacing={1} align="stretch" flex={1}>
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <HStack
                            key={item.id}
                            px={4}
                            py={3}
                            cursor="pointer"
                            borderRadius="lg"
                            bg={isActive ? 'blackAlpha.50' : 'transparent'}
                            _hover={{ bg: hoverBg }}
                            onClick={() => onTabChange(item.id)}
                            spacing={3}
                            color={isActive ? textColor : secondaryTextColor}
                        >
                            <Icon as={item.icon} w={5} h={5} strokeWidth={isActive ? 2 : 1.5} />
                            <Text fontWeight={isActive ? '600' : '500'} fontSize="sm">
                                {item.label}
                            </Text>
                        </HStack>
                    );
                })}
            </VStack>

            {/* Footer / Profile Placeholder */}
            <VStack spacing={4} align="stretch">
                <Divider />
                <HStack
                    px={3}
                    py={2}
                    cursor="pointer"
                    borderRadius="lg"
                    _hover={{ bg: hoverBg }}
                    spacing={3}
                >
                    <Icon as={UserCircleIcon} w={6} h={6} color={secondaryTextColor} />
                    <Text fontSize="sm" fontWeight="500" color={textColor}>
                        User
                    </Text>
                </HStack>
            </VStack>
        </Box>
    );
};

import React from 'react';
import {
    VStack,
    Icon,
    Tooltip,
    Box,
    Divider,
    IconButton,
} from '@chakra-ui/react';
import {
    HomeIcon,
    GlobeAltIcon,
    BookOpenIcon,
    PlusIcon,
    UserCircleIcon,
    ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRouter } from 'next/router';

interface PerplexitySidebarProps {
    onNewThread: () => void;
}

export const PerplexitySidebar: React.FC<PerplexitySidebarProps> = ({ onNewThread }) => {
    const router = useRouter();
    const bg = useSemanticToken('surface.base');
    const border = useSemanticToken('border.subtle');
    const iconColor = useSemanticToken('text.secondary');
    const activeIconColor = useSemanticToken('interactive.primary');

    const navItems = [
        { label: 'Home', icon: HomeIcon, path: '/search', isActive: true },
        { label: 'Discover', icon: GlobeAltIcon, path: '/search?tab=discover', isActive: false },
        { label: 'Library', icon: BookOpenIcon, path: '/search?tab=library', isActive: false },
    ];

    return (
        <Box
            position="fixed"
            left={0}
            top={0}
            bottom={0}
            w="60px"
            bg={bg}
            borderRight="1px solid"
            borderColor={border}
            zIndex={100}
            display="flex"
            flexDirection="column"
            alignItems="center"
            py={4}
        >
            {/* Logo Placeholder or Back to Dashboard */}
            <Tooltip label="Back to Dashboard" placement="right">
                <IconButton
                    aria-label="Back"
                    icon={<ArrowLeftOnRectangleIcon width={20} />}
                    variant="ghost"
                    color={iconColor}
                    onClick={() => router.push('/dashboard')}
                    mb={6}
                />
            </Tooltip>

            {/* New Thread */}
            <Tooltip label="New Thread" placement="right">
                <IconButton
                    aria-label="New Thread"
                    icon={<PlusIcon width={20} />}
                    isRound
                    bg="transparent"
                    border="1px solid"
                    borderColor={border}
                    mb={6}
                    onClick={onNewThread}
                    _hover={{ bg: 'gray.100' }}
                />
            </Tooltip>

            {/* Nav Items */}
            <VStack spacing={4} flex={1}>
                {navItems.map((item) => (
                    <Tooltip key={item.label} label={item.label} placement="right">
                        <IconButton
                            aria-label={item.label}
                            icon={<Icon as={item.icon} w={6} h={6} />}
                            variant="ghost"
                            color={item.isActive ? activeIconColor : iconColor}
                            onClick={() => router.push(item.path)}
                            _hover={{ color: activeIconColor }}
                        />
                    </Tooltip>
                ))}
            </VStack>

            {/* Footer / Profile */}
            <VStack spacing={4}>
                <Divider />
                <Tooltip label="Profile" placement="right">
                    <IconButton
                        aria-label="Profile"
                        icon={<UserCircleIcon width={24} />}
                        variant="ghost"
                        color={iconColor}
                    />
                </Tooltip>
            </VStack>
        </Box>
    );
};

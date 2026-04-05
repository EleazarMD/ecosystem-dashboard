import React from 'react';
import { HStack, Input, InputGroup, InputLeftElement, Menu, MenuButton, MenuList, MenuItem, IconButton, Button, Box, Text, Divider } from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, AddIcon } from '@chakra-ui/icons';
import { FiFilter, FiSliders, FiMoreHorizontal, FiDownload, FiTrash2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassButton, GlassIconButton } from '@/components/design-system/GlassComponents';

interface DatabaseToolbarProps {
    onSearch: (query: string) => void;
    onFilter?: () => void;
    onSort?: () => void;
    onNew?: () => void;
    onExport?: () => void;
    title?: string;
    viewName?: string;
}

export const DatabaseToolbar: React.FC<DatabaseToolbarProps> = ({
    onSearch,
    onFilter,
    onSort,
    onNew,
    onExport,
    title,
    viewName
}) => {
    const borderColor = useSemanticToken('border.default');
    const textColor = useSemanticToken('text.secondary');

    return (
        <HStack
            w="full"
            p={2}
            spacing={2}
            borderBottom="1px solid"
            borderColor={borderColor}
            justify="space-between"
        >
            <HStack spacing={2} flex={1}>
                {/* View Name / Title */}
                {viewName && (
                    <HStack spacing={1} mr={2}>
                        <Text fontWeight="medium" fontSize="sm">{viewName}</Text>
                        <Box h="16px" w="1px" bg={borderColor} mx={2} />
                    </HStack>
                )}

                {/* Filter */}
                <Menu>
                    <MenuButton
                        as={GlassButton}
                        size="sm"
                        leftIcon={<FiFilter />}
                        variant="ghost"
                        glassOptions={{ intensity: 0.1 }}
                        color={textColor}
                    >
                        Filter
                    </MenuButton>
                    <MenuList>
                        <MenuItem fontSize="sm">Add filter</MenuItem>
                        <MenuItem fontSize="sm">Advanced filter</MenuItem>
                    </MenuList>
                </Menu>

                {/* Sort */}
                <Menu>
                    <MenuButton
                        as={GlassButton}
                        size="sm"
                        leftIcon={<FiSliders />}
                        variant="ghost"
                        glassOptions={{ intensity: 0.1 }}
                        color={textColor}
                    >
                        Sort
                    </MenuButton>
                    <MenuList>
                        <MenuItem fontSize="sm">Sort by name</MenuItem>
                        <MenuItem fontSize="sm">Sort by date</MenuItem>
                    </MenuList>
                </Menu>

                {/* Search */}
                <InputGroup size="sm" maxW="200px">
                    <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search..."
                        variant="filled"
                        bg="transparent"
                        _hover={{ bg: 'rgba(0,0,0,0.05)' }}
                        _focus={{ bg: 'white', borderColor: 'blue.400' }}
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </InputGroup>
            </HStack>

            <HStack spacing={1}>
                <GlassButton
                    size="sm"
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={onNew}
                    glassOptions={{ intensity: 0.2 }}
                >
                    New
                </GlassButton>

                <Menu>
                    <MenuButton
                        as={GlassIconButton}
                        icon={<FiMoreHorizontal />}
                        size="sm"
                        variant="ghost"
                        aria-label="More options"
                        glassOptions={{ intensity: 0.1 }}
                        color={textColor}
                    />
                    <MenuList>
                        <MenuItem icon={<FiDownload />} onClick={onExport} fontSize="sm">Export CSV</MenuItem>
                        <Divider my={1} />
                        <MenuItem icon={<FiTrash2 />} color="red.500" fontSize="sm">Delete database</MenuItem>
                    </MenuList>
                </Menu>
            </HStack>
        </HStack>
    );
};

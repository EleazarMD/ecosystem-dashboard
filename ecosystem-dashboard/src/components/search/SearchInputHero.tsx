import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Icon,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    SimpleGrid,
    HStack,
    Text,
    Button,
} from '@chakra-ui/react';
import {
    ArrowUpIcon,
    GlobeAltIcon,
    AcademicCapIcon,
    VideoCameraIcon,
    ChatBubbleLeftRightIcon,
    PencilSquareIcon,
    CalculatorIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import TextareaAutosize from 'react-textarea-autosize';

interface SearchInputHeroProps {
    onSearch: (query: string) => void;
    isCompact?: boolean;
    mode: string;
    onModeChange: (mode: string) => void;
}

export const SearchInputHero: React.FC<SearchInputHeroProps> = ({
    onSearch,
    isCompact = false,
    mode,
    onModeChange
}) => {
    const [value, setValue] = useState('');
    const [textareaRows, setTextareaRows] = useState(1);
    const [formMode, setFormMode] = useState<'single' | 'multi'>('single');
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (textareaRows >= 2 && value && formMode === 'single') {
            setFormMode('multi');
        } else if (!value && formMode === 'multi') {
            setFormMode('single');
        }
    }, [textareaRows, formMode, value]);

    // Auto-focus on '/' key like Perplexica
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInputFocused =
                activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                activeElement?.hasAttribute('contenteditable');

            if (e.key === '/' && !isInputFocused) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSearch(value);
            setValue('');
        }
    };

    const focusModes = [
        { id: 'webSearch', label: 'All', description: 'Search across all of the internet', icon: GlobeAltIcon },
        { id: 'academicSearch', label: 'Academic', description: 'Search in published academic papers', icon: AcademicCapIcon },
        { id: 'writingAssistant', label: 'Writing', description: 'Chat without searching the web', icon: PencilSquareIcon },
        { id: 'knowledgeBase', label: 'Wolfram Alpha', description: 'Computational knowledge engine', icon: CalculatorIcon },
        { id: 'youtubeSearch', label: 'YouTube', description: 'Search and watch videos', icon: VideoCameraIcon },
        { id: 'redditSearch', label: 'Reddit', description: 'Search for discussions and opinions', icon: ChatBubbleLeftRightIcon },
    ];

    const currentMode = focusModes.find(m => m.id === mode) || focusModes[0];

    return (
        <Box
            as="form"
            onSubmit={handleSubmit}
            onKeyDown={(e: any) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (value.trim()) {
                        onSearch(value);
                        setValue('');
                    }
                }
            }}
            bg="surface.elevated"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius={formMode === 'multi' ? '2xl' : 'full'}
            p={4}
            display="flex"
            flexDirection={formMode === 'multi' ? 'column' : 'row'}
            alignItems="center"
            transition="all 0.2s"
            _focusWithin={{ borderColor: 'interactive.primary' }}
        >
            {/* Focus Mode Selector (single mode only) */}
            {formMode === 'single' && (
                <Popover placement="bottom-start" closeOnBlur={true}>
                    <PopoverTrigger>
                        <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Icon as={currentMode.icon} w={4} h={4} />}
                            rightIcon={<Icon as={ChevronDownIcon} w={3} h={3} />}
                            borderRadius="full"
                            fontSize="xs"
                            color="gray.500"
                            fontWeight="medium"
                            _hover={{ bg: 'gray.100', color: 'gray.700' }}
                            _dark={{ _hover: { bg: 'whiteAlpha.200' } }}
                            mr={2}
                        >
                            {currentMode.label}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent w="600px" p={2} borderRadius="xl" boxShadow="2xl" bg="surface.elevated" borderColor="border.subtle">
                        <PopoverBody p={0}>
                            <SimpleGrid columns={2} spacing={2}>
                                {focusModes.map((m) => (
                                    <HStack
                                        key={m.id}
                                        p={3}
                                        cursor="pointer"
                                        borderRadius="lg"
                                        bg={mode === m.id ? 'surface.hover' : 'transparent'}
                                        _hover={{ bg: 'surface.hover' }}
                                        onClick={() => onModeChange(m.id)}
                                        align="start"
                                        spacing={4}
                                    >
                                        <Icon as={m.icon} w={5} h={5} color={mode === m.id ? 'blue.400' : 'gray.400'} mt={1} />
                                        <Box textAlign="left">
                                            <Text fontWeight="bold" fontSize="sm" color="whiteAlpha.900">
                                                {m.label}
                                            </Text>
                                            <Text fontSize="xs" color="gray.400">
                                                {m.description}
                                            </Text>
                                        </Box>
                                    </HStack>
                                ))}
                            </SimpleGrid>
                        </PopoverBody>
                    </PopoverContent>
                </Popover>
            )}

            {/* Textarea Input */}
            <TextareaAutosize
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onHeightChange={(height, props: any) => {
                    setTextareaRows(Math.ceil(height / props.rowHeight));
                }}
                style={{ background: 'transparent' }}
                className="transition placeholder:text-sm text-sm resize-none focus:outline-none w-full px-2 max-h-24 lg:max-h-36 xl:max-h-48 flex-grow flex-shrink"
                color="text.primary"
                placeholder={isCompact ? "Ask a follow-up" : "Ask anything..."}
            />

            {/* Send Button & Actions */}
            {formMode === 'single' && (
                <button
                    type="submit"
                    disabled={value.trim().length === 0}
                    className="bg-[#24A0ED] text-white disabled:text-gray-500 hover:bg-opacity-85 transition duration-100 disabled:bg-gray-200 dark:disabled:bg-gray-800 rounded-full p-2 ml-2"
                >
                    <ArrowUpIcon className="w-4 h-4" />
                </button>
            )}

            {formMode === 'multi' && (
                <div className="flex flex-row items-center justify-between w-full pt-2">
                    <Popover placement="bottom-start" closeOnBlur={true}>
                        <PopoverTrigger>
                            <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Icon as={currentMode.icon} w={4} h={4} />}
                                rightIcon={<Icon as={ChevronDownIcon} w={3} h={3} />}
                                borderRadius="full"
                                fontSize="xs"
                                color="gray.500"
                                fontWeight="medium"
                                _hover={{ bg: 'gray.100', color: 'gray.700' }}
                                _dark={{ _hover: { bg: 'whiteAlpha.200' } }}
                            >
                                {currentMode.label}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent w="600px" p={2} borderRadius="xl" boxShadow="2xl" bg="surface.elevated" borderColor="border.subtle">
                            <PopoverBody p={0}>
                                <SimpleGrid columns={2} spacing={2}>
                                    {focusModes.map((m) => (
                                        <HStack
                                            key={m.id}
                                            p={3}
                                            cursor="pointer"
                                            borderRadius="lg"
                                            bg={mode === m.id ? 'surface.hover' : 'transparent'}
                                            _hover={{ bg: 'surface.hover' }}
                                            onClick={() => onModeChange(m.id)}
                                            align="start"
                                            spacing={4}
                                        >
                                            <Icon as={m.icon} w={5} h={5} color={mode === m.id ? 'blue.400' : 'gray.400'} mt={1} />
                                            <Box textAlign="left">
                                                <Text fontWeight="bold" fontSize="sm" color="whiteAlpha.900">
                                                    {m.label}
                                                </Text>
                                                <Text fontSize="xs" color="gray.400">
                                                    {m.description}
                                                </Text>
                                            </Box>
                                        </HStack>
                                    ))}
                                </SimpleGrid>
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>

                    <button
                        type="submit"
                        disabled={value.trim().length === 0}
                        className="bg-[#24A0ED] text-white disabled:text-gray-500 hover:bg-opacity-85 transition duration-100 disabled:bg-gray-200 dark:disabled:bg-gray-800 rounded-full p-2"
                    >
                        <ArrowUpIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </Box>
    );
};

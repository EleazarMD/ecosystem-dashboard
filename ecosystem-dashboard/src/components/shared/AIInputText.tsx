import React, { useRef, useState, useEffect } from 'react';
import {
    Box,
    HStack,
    Text,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    VStack,
    Badge,
} from '@chakra-ui/react';
import { FiSend, FiPaperclip, FiChevronDown, FiCheck, FiGlobe, FiDatabase, FiLayout, FiCode } from 'react-icons/fi';
import { ChatTextarea } from '@/components/shared/ChatTextarea';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { RecipeSelector } from '@/components/goose/RecipeSelector';
import { PerplexityModeSelector, PerplexityMode } from '@/components/common/PerplexityEnhancedInput';
import { useAgentConfiguration } from '@/hooks/useAgentConfiguration';

interface AIInputTextProps {
    agentId: string;
    sessionId: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    isProcessing: boolean;
    isInitializing?: boolean;
    pageTitle?: string;
    placeholder?: string;
    mode?: 'floating' | 'sidebar';
    activeRecipeId?: string | null;
    onRecipeChange?: (recipeId: string | null) => void;
}

export const AIInputText: React.FC<AIInputTextProps> = ({
    agentId,
    sessionId,
    value,
    onChange,
    onSubmit,
    isProcessing,
    isInitializing = false,
    pageTitle,
    placeholder = "Ask, search, or make anything... (⌘+Return to send)",
    mode = 'sidebar',
    activeRecipeId,
    onRecipeChange,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load agent configuration
    const { config: agentConfig, updateConfig } = useAgentConfiguration(agentId);

    // Local state for tools
    const [enabledTools, setEnabledTools] = useState<string[]>([]);
    const [perplexityMode, setPerplexityMode] = useState<PerplexityMode>(null);

    // Sync enabled tools from config
    useEffect(() => {
        if (agentConfig?.enabledTools) {
            setEnabledTools(agentConfig.enabledTools);
        } else if (agentConfig?.mcpServers) {
            // Fallback for older config structure
            const tools = Object.entries(agentConfig.mcpServers)
                .filter(([_, enabled]) => enabled)
                .map(([name]) => name);
            setEnabledTools(tools);
        }
    }, [agentConfig]);

    // Toggle tool handler
    const handleToggleTool = async (toolName: string) => {
        const newTools = enabledTools.includes(toolName)
            ? enabledTools.filter(t => t !== toolName)
            : [...enabledTools, toolName];

        setEnabledTools(newTools);

        // Persist to backend
        if (agentConfig) {
            await updateConfig({
                ...agentConfig,
                enabledTools: newTools,
                // Also update mcpServers object for backward compatibility
                mcpServers: {
                    ...agentConfig.mcpServers,
                    [toolName]: !enabledTools.includes(toolName)
                }
            });
        }
    };

    // Colors
    const bgColor = useSemanticToken('surface.elevated');
    const inputBorder = 'blue.500';
    const borderColor = useSemanticToken('border.default');
    const badgeBg = useSemanticToken('surface.base');
    const badgeColor = useSemanticToken('text.secondary');
    const placeholderColor = useSemanticToken('text.tertiary');
    const sendBtnBg = useSemanticToken('surface.base');
    const sendBtnHoverBg = useSemanticToken('border.default');
    const menuBg = useSemanticToken('surface.elevated');

    const isPerplexityEnabled = enabledTools.includes('perplexity');

    return (
        <Box
            px={mode === 'sidebar' ? 4 : 2.5}
            pb={mode === 'sidebar' ? 4 : 2}
            pt={2}
            borderTop="1px solid"
            borderColor={borderColor}
            bg={bgColor}
        >
            {/* Input Field with prominent blue border */}
            <Box
                position="relative"
                w="100%"
                border="3px solid"
                borderColor={isPerplexityEnabled ? 'purple.400' : inputBorder}
                borderRadius="20px"
                bg={bgColor}
                p={2.5}
                pb={2}
                boxShadow="0 0 0 1px rgba(0,0,0,0.05)"
                transition="border-color 0.2s"
            >
                {/* Context Badge inside input */}
                {pageTitle && (
                    <HStack
                        mb={2}
                        px={2}
                        py={1}
                        bg={badgeBg}
                        borderRadius="6px"
                        fontSize="xs"
                        color={badgeColor}
                        display="inline-flex"
                        w="fit-content"
                    >
                        <Text fontWeight="medium">@</Text>
                        <Text>📄</Text>
                        <Text fontWeight="medium">{pageTitle}</Text>
                    </HStack>
                )}

                <ChatTextarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onSubmit={onSubmit}
                    placeholder={placeholder}
                    variant="compact"
                    fontSize="sm"
                    border="none"
                    p={0}
                    px={2}
                    _focus={{ outline: 'none', boxShadow: 'none' }}
                    _placeholder={{ color: placeholderColor }}
                    isDisabled={isInitializing || isProcessing}
                />

                {/* Perplexity Mode Selector (if enabled) */}
                {isPerplexityEnabled && (
                    <Box px={2} pt={2} pb={1}>
                        <PerplexityModeSelector
                            selectedMode={perplexityMode}
                            onModeSelect={setPerplexityMode}
                            detectedMode={null} // TODO: Add detection logic if needed
                        />
                    </Box>
                )}

                <HStack mt={1.5} pt={1.5} justify="space-between" borderTop="1px solid" borderColor={borderColor}>
                    <HStack spacing={2.5} fontSize="xs" color={useSemanticToken('text.secondary')}>
                        <HStack cursor="pointer" spacing={1} _hover={{ color: 'gray.700' }}>
                            <FiPaperclip size={13} />
                            <Text fontWeight="medium">Auto</Text>
                        </HStack>

                        {/* All Sources Menu */}
                        <Menu placement="top-start" closeOnSelect={false}>
                            <MenuButton
                                as={HStack}
                                cursor="pointer"
                                spacing={1}
                                _hover={{ color: 'gray.700' }}
                            >
                                <Text fontWeight="medium">All sources</Text>
                                <FiChevronDown />
                            </MenuButton>
                            <MenuList bg={menuBg} fontSize="sm" zIndex={10}>
                                <MenuItem
                                    icon={enabledTools.includes('workspace') ? <FiCheck color="green" /> : <FiLayout />}
                                    onClick={() => handleToggleTool('workspace')}
                                >
                                    Workspace
                                </MenuItem>
                                <MenuItem
                                    icon={enabledTools.includes('perplexity') ? <FiCheck color="green" /> : <FiGlobe />}
                                    onClick={() => handleToggleTool('perplexity')}
                                >
                                    Perplexity (Web Search)
                                </MenuItem>
                                <MenuDivider />
                                <MenuItem
                                    icon={enabledTools.includes('knowledgeGraph') ? <FiCheck color="green" /> : <FiDatabase />}
                                    onClick={() => handleToggleTool('knowledgeGraph')}
                                >
                                    Knowledge Graph
                                </MenuItem>
                                <MenuItem
                                    icon={enabledTools.includes('github') ? <FiCheck color="green" /> : <FiCode />}
                                    onClick={() => handleToggleTool('github')}
                                >
                                    GitHub
                                </MenuItem>
                            </MenuList>
                        </Menu>

                        <Box w="180px">
                            <RecipeSelector
                                agentId={agentId}
                                sessionId={sessionId}
                                size="xs"
                                selectedRecipeId={activeRecipeId}
                                onRecipeSelect={onRecipeChange}
                            />
                        </Box>
                    </HStack>

                    <IconButton
                        icon={<FiSend />}
                        aria-label="Send message"
                        size="sm"
                        colorScheme={isPerplexityEnabled ? "purple" : "gray"}
                        borderRadius="full"
                        isLoading={isProcessing}
                        isDisabled={!value.trim() || isInitializing}
                        onClick={onSubmit}
                        bg={sendBtnBg}
                        _hover={{ bg: sendBtnHoverBg }}
                    />
                </HStack>
            </Box>
        </Box>
    );
};

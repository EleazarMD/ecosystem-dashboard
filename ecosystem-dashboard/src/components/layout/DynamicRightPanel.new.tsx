/**
 * Dynamic Right Panel (New Architecture)
 * Clean, maintainable implementation using panel registry + resolver pattern
 * 
 * This replaces the 967-line monolithic version with ~150 lines
 */

import React from 'react';
import {
  Box,
  HStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  IconButton,
  Text,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import {
  FiX,
  FiCpu,
  FiZap,
  FiFileText,
  FiShare2,
  FiPlay,
  FiMic,
  FiMusic,
  FiMessageCircle,
  FiActivity,
  FiLayers,
  FiFolder,
  FiSettings,
  FiCalendar,
  FiUser,
  FiDatabase,
  FiLink,
  FiDollarSign,
  FiTarget,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { usePanelResolver } from './panels/resolver/usePanelResolver';
import { PanelRenderer } from './panels/renderer/PanelRenderer';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Icon mapping for tabs
const iconMap: Record<string, any> = {
  FiCpu,
  FiZap,
  FiFileText,
  FiShare2,
  FiPlay,
  FiMic,
  FiMusic,
  FiMessageCircle,
  FiActivity,
  FiLayers,
  FiFolder,
  FiSettings,
  FiCalendar,
  FiUser,
  FiDatabase,
  FiLink,
  FiDollarSign,
  FiTarget,
};

interface DynamicRightPanelProps {
  systemData?: {
    health: string;
    services: any[];
    metrics: any;
    alerts: number;
  };
  onClose: () => void;
}

export default function DynamicRightPanelNew({ systemData, onClose }: DynamicRightPanelProps) {
  const { activeTab, setActiveTab, config, context, width, setWidth, customData } = useRightPanel();

  // Colors
  const bgColor = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const resizeHandleColor = useSemanticToken('border.default');
  const resizeHandleHoverColor = useSemanticToken('interactive.primary');

  // Resize state
  const [isResizing, setIsResizing] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [startWidth, setStartWidth] = React.useState(width);

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX;
      // Max width is 20% of viewport width for child contexts
      const isChildContext = context.startsWith('child-');
      const maxWidth = isChildContext ? Math.min(800, window.innerWidth * 0.20) : 800;
      const newWidth = Math.max(280, Math.min(maxWidth, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startX, startWidth, setWidth, context]);

  // Resolve which panel to show
  const resolved = usePanelResolver({
    context,
    activeTab,
    customData,
    systemData,
    width,
  });

  // Filter tabs based on customData.visibleTabs if provided
  // This allows main tabs to control which right panel tabs are shown
  const visibleTabs = React.useMemo(() => {
    if (customData?.visibleTabs && Array.isArray(customData.visibleTabs)) {
      return config.tabs.filter(tab => customData.visibleTabs.includes(tab.id));
    }
    return config.tabs;
  }, [config.tabs, customData?.visibleTabs]);

  const activeTabIndex = visibleTabs.findIndex((tab) => tab.id === activeTab);
  
  // If active tab is not in visible tabs, switch to first visible tab
  React.useEffect(() => {
    if (activeTabIndex === -1 && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTabIndex, visibleTabs, setActiveTab]);

  return (
    <Box
      position="fixed"
      right="0"
      top="70px"
      h="calc(100vh - 70px)"
      w={`${width}px`}
      bg={bgColor}
      backdropFilter="blur(12px) saturate(180%)"
      borderLeft="1px solid"
      borderColor={borderColor}
      borderTopLeftRadius="24px"
      borderBottomLeftRadius="24px"
      boxShadow={useSemanticToken('glass.shadow')}
      transition={isResizing ? 'none' : 'width 0.2s ease-out'}
      zIndex={1000}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      sx={{
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      }}
    >
      {/* Resize Handle */}
      <Box
        position="absolute"
        left="0"
        top="0"
        bottom="0"
        w="4px"
        cursor="ew-resize"
        bg={resizeHandleColor}
        opacity={isResizing ? 1 : 0}
        _hover={{ opacity: 1, bg: resizeHandleHoverColor }}
        transition="opacity 0.2s, background-color 0.2s"
        onMouseDown={handleResizeStart}
        zIndex={10}
      />

      {/* Header */}
      <HStack
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor={borderColor}
        justify="space-between"
      >
        <HStack spacing={2}>
          {resolved.metadata.icon && (
            <Icon as={iconMap[resolved.metadata.icon]} color={resolved.metadata.iconColor} boxSize={5} />
          )}
          <Text fontSize="md" fontWeight="600" color={textColor}>
            {resolved.metadata.displayName}
          </Text>
        </HStack>
        <Tooltip label="Close panel" placement="left">
          <IconButton
            aria-label="Close panel"
            icon={<FiX />}
            size="sm"
            variant="ghost"
            onClick={onClose}
            color={mutedColor}
            _hover={{
              bg: useSemanticToken('interactive.baseHover'),
            }}
          />
        </Tooltip>
      </HStack>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <Tabs
          index={activeTabIndex}
          onChange={(index) => setActiveTab(visibleTabs[index].id)}
          variant="soft-rounded"
          colorScheme="blue"
          size="sm"
        >
          <TabList px={2} pt={2} pb={0} overflowX="auto" css={{ '&::-webkit-scrollbar': { display: 'none' } }}>
            {visibleTabs.map((tab) => (
              <Tab key={tab.id} fontSize="xs" px={3} py={1.5}>
                {iconMap[tab.icon] && <Icon as={iconMap[tab.icon]} boxSize={3} mr={1.5} />}
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      )}

      {/* Panel Content */}
      <Box flex="1" overflow="hidden" position="relative">
        <PanelRenderer resolved={resolved} />
      </Box>
    </Box>
  );
}

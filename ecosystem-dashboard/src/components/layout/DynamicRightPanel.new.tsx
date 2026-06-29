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
  XMarkIcon,
  CpuChipIcon,
  BoltIcon,
  DocumentTextIcon,
  ShareIcon,
  PlayIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  RectangleStackIcon,
  FolderIcon,
  Cog6ToothIcon,
  CalendarIcon,
  UserIcon,
  CircleStackIcon,
  LinkIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
  CursorArrowRaysIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  PhotoIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  MapIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  RadioIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  Squares2X2Icon,
  UsersIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { usePanelResolver } from './panels/resolver/usePanelResolver';
import { PanelRenderer } from './panels/renderer/PanelRenderer';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { useContextHeader } from '@/domains/learning/shared/useContextHeader';

// Icon mapping for tabs
const iconMap: Record<string, any> = {
  FiCpu: CpuChipIcon,
  FiZap: BoltIcon,
  FiFileText: DocumentTextIcon,
  FiShare2: ShareIcon,
  FiPlay: PlayIcon,
  FiMic: MicrophoneIcon,
  FiMusic: MusicalNoteIcon,
  FiMessageCircle: ChatBubbleLeftRightIcon,
  FiActivity: ChartBarIcon,
  FiLayers: RectangleStackIcon,
  FiFolder: FolderIcon,
  FiSettings: Cog6ToothIcon,
  FiCalendar: CalendarIcon,
  FiUser: UserIcon,
  FiDatabase: CircleStackIcon,
  FiLink: LinkIcon,
  FiBookOpen: BookOpenIcon,
  FiDollarSign: CurrencyDollarIcon,
  FiTarget: CursorArrowRaysIcon,
  FiStar: StarIcon,
  FiTrendingUp: ArrowTrendingUpIcon,
  FiCompass: GlobeAltIcon,
  FiLightbulb: LightBulbIcon,
  FiImage: PhotoIcon,
  FiEdit: PencilSquareIcon,
  FiMail: EnvelopeIcon,
  FiBook: BookOpenIcon,
  FiMap: MapIcon,
  FiSearch: MagnifyingGlassIcon,
  FiHelpCircle: QuestionMarkCircleIcon,
  FiRadio: RadioIcon,
  FiAlertTriangle: ExclamationTriangleIcon,
  FiClock: ClockIcon,
  FiGrid: Squares2X2Icon,
  FiUsers: UsersIcon,
  FiShield: ShieldCheckIcon,
  FiPieChart: ChartPieIcon,
  FiSliders: AdjustmentsHorizontalIcon,
  FiCheckCircle: CheckCircleIcon,
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
  const { colors, effectiveTheme } = useChildTheme();

  // Colors
  const bgColor = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const resizeHandleColor = useSemanticToken('border.default');
  const resizeHandleHoverColor = useSemanticToken('interactive.primary');
  const isChildContext = context.startsWith('child-');
  const childSurface = effectiveTheme.surface;
  const panelBg = isChildContext ? childSurface?.panel ?? colors.backgroundSecondary : bgColor;
  const panelBorder = isChildContext ? childSurface?.border ?? colors.border : borderColor;
  const panelText = isChildContext ? childSurface?.title ?? colors.text : textColor;
  const panelMuted = isChildContext ? childSurface?.muted ?? colors.textMuted : mutedColor;
  const panelCard = isChildContext ? childSurface?.card ?? colors.backgroundSecondary : bgColor;

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

  // Contextual header info from Context Hub (child contexts only)
  const ctxHeader = useContextHeader();

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
      top="64px"
      h="calc(100vh - 64px)"
      w={`${width}px`}
      bg={panelBg}
      backdropFilter={isChildContext ? 'none' : 'blur(12px) saturate(180%)'}
      borderLeft="1px solid"
      borderColor={panelBorder}
      borderTopLeftRadius={isChildContext ? '20px' : '24px'}
      borderBottomLeftRadius={isChildContext ? '20px' : '24px'}
      boxShadow={isChildContext ? '-12px 0 28px rgba(15, 23, 42, 0.10)' : useSemanticToken('glass.shadow')}
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
        px={isChildContext ? 3 : 4}
        py={isChildContext ? 2 : 3}
        borderBottom="1px solid"
        borderColor={panelBorder}
        justify="space-between"
        minH={isChildContext ? '46px' : undefined}
      >
        <HStack spacing={2} minW={0} flex={1} overflow="hidden">
          {resolved.metadata.icon && (
            <Icon as={iconMap[resolved.metadata.icon]} color={isChildContext ? colors.primary : resolved.metadata.iconColor} boxSize={isChildContext ? 4 : 5} flexShrink={0} />
          )}
          <Box minW={0} overflow="hidden">
            <Text fontSize={isChildContext ? 'sm' : 'md'} fontWeight="700" letterSpacing={isChildContext ? '-0.01em' : undefined} color={panelText} noOfLines={1}>
              {isChildContext && ctxHeader.frameTitle ? ctxHeader.frameTitle : resolved.metadata.displayName}
            </Text>
            {isChildContext && ctxHeader.personaName && (
              <Text fontSize="2xs" color={panelMuted} noOfLines={1}>
                {ctxHeader.personaName}
                {ctxHeader.toolCount > 0 && ` · ${ctxHeader.toolCount} tools`}
              </Text>
            )}
          </Box>
        </HStack>
        <Tooltip label="Close panel" placement="left">
          <IconButton
            aria-label="Close panel"
            icon={<Icon as={XMarkIcon} boxSize={5} />}
            size="sm"
            variant="ghost"
            onClick={onClose}
            color={panelMuted}
            _hover={{
              bg: isChildContext ? panelCard : useSemanticToken('interactive.baseHover'),
            }}
          />
        </Tooltip>
      </HStack>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <Tabs
          index={activeTabIndex}
          onChange={(index) => setActiveTab(visibleTabs[index].id)}
          variant={isChildContext ? 'unstyled' : 'soft-rounded'}
          colorScheme="blue"
          size="sm"
        >
          <TabList px={isChildContext ? 3 : 2} pt={isChildContext ? 2.5 : 2} pb={isChildContext ? 1.5 : 0} gap={isChildContext ? 1.5 : 0} overflowX="auto" css={{ '&::-webkit-scrollbar': { display: 'none' } }}>
            {visibleTabs.map((tab) => (
              <Tab
                key={tab.id}
                fontSize="xs"
                px={isChildContext ? 3 : 3}
                py={isChildContext ? 2 : 1.5}
                borderRadius="full"
                border={isChildContext ? '1px solid' : undefined}
                borderColor={isChildContext ? 'transparent' : undefined}
                color={isChildContext ? panelMuted : undefined}
                fontWeight="700"
                letterSpacing="-0.01em"
                whiteSpace="nowrap"
                _selected={isChildContext ? {
                  bg: panelCard,
                  borderColor: colors.primary,
                  color: panelText,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                } : undefined}
                _hover={isChildContext ? { bg: panelCard, color: panelText } : undefined}
              >
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

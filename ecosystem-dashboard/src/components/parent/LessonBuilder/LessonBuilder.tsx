/**
 * Lesson Builder — Parent-facing control room for the multi-agent
 * lesson authoring pipeline.
 *
 * Tabs:
 * 1. Lessons — list and create lessons
 * 2. Pipeline — monitor and advance a lesson's pipeline
 * 3. Review — review generated content
 * 4. Agents — configure agent registry (swap models, rebind tasks)
 */

import React, { useState } from 'react';
import {
  Box, VStack, HStack, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
  IconButton, Tooltip,
} from '@chakra-ui/react';
import {
  FiBookOpen, FiActivity, FiEye, FiSettings, FiArrowLeft,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { LessonList } from './LessonList';
import { PipelineDashboard } from './PipelineDashboard';
import { ReviewPanel } from './ReviewPanel';
import { AgentConfigPanel } from './AgentConfigPanel';

type TabId = 'lessons' | 'pipeline' | 'review' | 'agents';

export function LessonBuilder() {
  const [activeTab, setActiveTab] = useState<TabId>('lessons');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setActiveTab('pipeline');
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handlePublishComplete = () => {
    setActiveTab('lessons');
    handleRefresh();
  };

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} flexShrink={0}>
        <HStack justify="space-between">
          <HStack spacing={3}>
            {selectedLessonId && activeTab !== 'lessons' && (
              <Tooltip label="Back to lessons">
                <IconButton
                  aria-label="Back to lessons"
                  icon={<FiArrowLeft />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveTab('lessons')}
                />
              </Tooltip>
            )}
            <Text fontSize="xl" fontWeight="bold">Lesson Builder</Text>
            <Text fontSize="sm" color={textSecondary}>
              Multi-agent lesson authoring pipeline
            </Text>
          </HStack>
        </HStack>
      </Box>

      {/* Tabs */}
      <Tabs
        flex={1}
        display="flex"
        flexDirection="column"
        colorScheme="blue"
        index={activeTab === 'lessons' ? 0 : activeTab === 'pipeline' ? 1 : activeTab === 'review' ? 2 : 3}
        onChange={(idx) => {
          const tabs: TabId[] = ['lessons', 'pipeline', 'review', 'agents'];
          setActiveTab(tabs[idx]);
        }}
      >
        <TabList px={4} borderBottom="1px solid" borderColor={borderColor}>
          <Tab fontSize="sm">
            <HStack spacing={1}>
              <FiBookOpen size={14} />
              <Text>Lessons</Text>
            </HStack>
          </Tab>
          <Tab fontSize="sm" isDisabled={!selectedLessonId}>
            <HStack spacing={1}>
              <FiActivity size={14} />
              <Text>Pipeline</Text>
            </HStack>
          </Tab>
          <Tab fontSize="sm" isDisabled={!selectedLessonId}>
            <HStack spacing={1}>
              <FiEye size={14} />
              <Text>Review</Text>
            </HStack>
          </Tab>
          <Tab fontSize="sm">
            <HStack spacing={1}>
              <FiSettings size={14} />
              <Text>Agents</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels flex={1} overflowY="auto">
          <TabPanel p={4}>
            <LessonList
              onSelectLesson={handleSelectLesson}
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          </TabPanel>

          <TabPanel p={4}>
            {selectedLessonId ? (
              <PipelineDashboard
                lessonId={selectedLessonId}
                onPublishComplete={handlePublishComplete}
              />
            ) : (
              <Text color={textSecondary}>Select a lesson first.</Text>
            )}
          </TabPanel>

          <TabPanel p={4}>
            {selectedLessonId ? (
              <ReviewPanel
                lessonId={selectedLessonId}
                onReviewed={handleRefresh}
              />
            ) : (
              <Text color={textSecondary}>Select a lesson first.</Text>
            )}
          </TabPanel>

          <TabPanel p={4}>
            <AgentConfigPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

export default LessonBuilder;

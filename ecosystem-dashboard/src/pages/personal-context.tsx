/**
 * Personal Context Dashboard
 * 
 * Comprehensive UI for viewing and managing your Unified Personal Context:
 * - Identity profile
 * - Learned preferences with approval workflow
 * - Observation history
 * - Context preview (what AI sees)
 * - Privacy controls
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Divider,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Button, Badge, IconButton, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Input, Textarea, Select, Switch, FormControl, FormLabel,
  Table, Thead, Tbody, Tr, Th, Td, Tooltip,
  Alert, AlertIcon, AlertTitle, AlertDescription,
  Stat, StatLabel, StatNumber, StatHelpText,
  SimpleGrid, Code, Collapse, Editable, EditableInput, EditablePreview, EditableTextarea,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiUser, FiSettings, FiEye, FiCheck, FiX, FiAlertCircle,
  FiClock, FiTrendingUp, FiShield, FiRefreshCw, FiChevronDown, FiChevronUp, FiEdit2, FiSave, FiDatabase
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

const PIC_API = '/api/pic';

const PersonalContextDashboard = () => {
  const [identity, setIdentity] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [observations, setObservations] = useState([]);
  const [contextPreview, setContextPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPreferences: 0,
    pendingObservations: 0,
    confirmedPreferences: 0,
    lastUpdated: null
  });
  const [editingObs, setEditingObs] = useState(null);
  const [editedKey, setEditedKey] = useState('');
  const [editedValue, setEditedValue] = useState('');
  const [editedExplanation, setEditedExplanation] = useState('');
  
  const toast = useToast();
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const bgHighlight = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    loadContextData();
  }, []);

  const loadContextData = async () => {
    setLoading(true);
    try {
      // Fetch identity from PIC (via proxy)
      const identityRes = await fetch(`${PIC_API}/identity`);
      if (!identityRes.ok) {
        throw new Error(`Failed to fetch identity: ${identityRes.statusText}`);
      }
      const identityData = await identityRes.json();
      setIdentity(identityData.identity);
      
      // Fetch preferences from PIC (via proxy)
      const prefsRes = await fetch(`${PIC_API}/preferences`);
      if (!prefsRes.ok) {
        throw new Error(`Failed to fetch preferences: ${prefsRes.statusText}`);
      }
      const prefsData = await prefsRes.json();
      setPreferences(prefsData.preferences || []);
      
      // Fetch observations from PIC (via proxy)
      const obsRes = await fetch(`${PIC_API}/learn/observations?processed=false&limit=100`);
      if (!obsRes.ok) {
        throw new Error(`Failed to fetch observations: ${obsRes.statusText}`);
      }
      const obsData = await obsRes.json();
      setObservations(obsData.observations || []);
      
      // Build context preview
      setContextPreview({
        identity: identityData.identity,
        preferences: prefsData.preferences,
        observations: obsData.observations,
        generated_at: new Date().toISOString(),
      });
      
      // Calculate stats
      const confirmedCount = (prefsData.preferences || []).filter(p => 
        p.confidence === 'established' || p.confidence === 'confirmed'
      ).length;
      
      setStats({
        totalPreferences: prefsData.preferences?.length || 0,
        pendingObservations: obsData.observations?.length || 0,
        confirmedPreferences: confirmedCount,
        lastUpdated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to load PIC data:', error);
      toast({
        title: 'Failed to load context',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditObservation = (obs) => {
    setEditingObs(obs.id);
    setEditedKey(obs.key);
    setEditedValue(typeof obs.value === 'object' ? JSON.stringify(obs.value) : String(obs.value));
    setEditedExplanation(obs.explanation || '');
  };

  const handleCancelEdit = () => {
    setEditingObs(null);
    setEditedKey('');
    setEditedValue('');
    setEditedExplanation('');
  };

  const handleSaveEdit = async (obsId) => {
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: editedKey,
          value: editedValue,
          explanation: editedExplanation,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update observation');
      }

      toast({
        title: 'Observation updated',
        description: 'The observation content has been saved.',
        status: 'success',
        duration: 3000,
      });

      // Reload data to reflect changes
      await loadContextData();
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update observation:', error);
      toast({
        title: 'Update failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Heading size="lg">Personal Context</Heading>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={loadContextData}
                isLoading={loading}
                size="sm"
              >
                Refresh
              </Button>
            </HStack>
            <Text color={textSecondary}>
              View and manage what your AI assistants know about you
            </Text>
          </Box>

          {/* Stats Overview */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>Total Preferences</StatLabel>
                <StatNumber>{stats.totalPreferences}</StatNumber>
                <StatHelpText>Learned behaviors</StatHelpText>
              </Stat>
            </GlassPanel>
            
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>Pending Review</StatLabel>
                <StatNumber color="orange.400">{stats.pendingObservations}</StatNumber>
                <StatHelpText>Needs approval</StatHelpText>
              </Stat>
            </GlassPanel>
            
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>Confirmed</StatLabel>
                <StatNumber color="green.400">{stats.confirmedPreferences}</StatNumber>
                <StatHelpText>High confidence</StatHelpText>
              </Stat>
            </GlassPanel>
            
            <GlassPanel p={4}>
              <Stat>
                <StatLabel>Last Updated</StatLabel>
                <StatNumber fontSize="lg">
                  {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                </StatNumber>
                <StatHelpText>Context age</StatHelpText>
              </Stat>
            </GlassPanel>
          </SimpleGrid>

          <Divider />

          {/* Main Tabs */}
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList>
              <Tab><FiUser style={{ marginRight: 8 }} /> Identity</Tab>
              <Tab><FiSettings style={{ marginRight: 8 }} /> Preferences ({preferences.length})</Tab>
              <Tab>
                <FiAlertCircle style={{ marginRight: 8 }} /> 
                Pending Review ({stats.pendingObservations})
              </Tab>
              <Tab><FiEye style={{ marginRight: 8 }} /> Context Preview</Tab>
              <Tab><FiShield style={{ marginRight: 8 }} /> Privacy</Tab>
              <Tab><FiDatabase style={{ marginRight: 8 }} /> Cache Analytics</Tab>
            </TabList>

            <TabPanels mt={6}>
              {/* Identity Tab */}
              <TabPanel p={0}>
                <IdentityPanel identity={identity} onUpdate={loadContextData} />
              </TabPanel>

              {/* Preferences Tab */}
              <TabPanel p={0}>
                <PreferencesPanel preferences={preferences} onUpdate={loadContextData} />
              </TabPanel>

              {/* Pending Review Tab */}
              <TabPanel p={0}>
                <ObservationsPanel 
                  observations={observations} 
                  onUpdate={loadContextData}
                  editingObs={editingObs}
                  editedKey={editedKey}
                  editedValue={editedValue}
                  editedExplanation={editedExplanation}
                  onEdit={handleEditObservation}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  onKeyChange={setEditedKey}
                  onValueChange={setEditedValue}
                  onExplanationChange={setEditedExplanation}
                />
              </TabPanel>

              {/* Context Preview Tab */}
              <TabPanel p={0}>
                <ContextPreviewPanel context={contextPreview} />
              </TabPanel>

              {/* Privacy Tab */}
              <TabPanel p={0}>
                <PrivacyPanel />
              </TabPanel>

              {/* Cache Analytics Tab */}
              <TabPanel p={0}>
                <CacheAnalyticsPanel />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </DashboardLayout>
  );
};

// Identity Panel Component
const IdentityPanel = ({ identity, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(identity || {});
  const toast = useToast();

  const handleSave = async () => {
    try {
      const response = await fetch(`${PIC_API}/identity`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }
      
      toast({
        title: 'Identity updated',
        status: 'success',
        duration: 3000,
      });
      
      setEditing(false);
      onUpdate();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  if (!identity) {
    return (
      <GlassPanel p={6}>
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No identity profile yet</AlertTitle>
          <AlertDescription>
            Create your identity profile to personalize AI interactions
          </AlertDescription>
        </Alert>
        <Button mt={4} colorScheme="blue" onClick={() => setEditing(true)}>
          Create Profile
        </Button>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Your Identity Profile</Heading>
        <Button
          size="sm"
          onClick={() => editing ? handleSave() : setEditing(true)}
          colorScheme={editing ? 'green' : 'blue'}
        >
          {editing ? 'Save' : 'Edit'}
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>Name</FormLabel>
          {editing ? (
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          ) : (
            <Text fontSize="lg" fontWeight="bold">{identity.name}</Text>
          )}
        </FormControl>

        <FormControl>
          <FormLabel>Preferred Name</FormLabel>
          {editing ? (
            <Input
              value={formData.preferred_name || ''}
              onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
            />
          ) : (
            <Text>{identity.preferred_name || 'Not set'}</Text>
          )}
        </FormControl>

        <FormControl>
          <FormLabel>Email</FormLabel>
          {editing ? (
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          ) : (
            <Text>{identity.email || 'Not set'}</Text>
          )}
        </FormControl>

        <FormControl>
          <FormLabel>Timezone</FormLabel>
          {editing ? (
            <Select
              value={formData.timezone || 'UTC'}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            >
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="UTC">UTC</option>
            </Select>
          ) : (
            <Text>{identity.timezone}</Text>
          )}
        </FormControl>

        <FormControl>
          <FormLabel>Roles</FormLabel>
          {identity.roles && identity.roles.length > 0 ? (
            <HStack spacing={2}>
              {identity.roles.map((role) => (
                <Badge key={role} colorScheme="purple">{role}</Badge>
              ))}
            </HStack>
          ) : (
            <Text color="gray.500">No roles set</Text>
          )}
        </FormControl>
      </VStack>
    </GlassPanel>
  );
};

// Preferences Panel Component
const PreferencesPanel = ({ preferences, onUpdate }) => {
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  const filteredPrefs = preferences.filter(p => 
    filter === 'all' || p.category === filter
  );

  const categories = Array.from(new Set(preferences.map(p => p.category).filter(Boolean))) as string[];

  const handleDelete = async (prefId) => {
    try {
      const response = await fetch(`${PIC_API}/preferences/${prefId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      toast({
        title: 'Preference deleted',
        status: 'success',
        duration: 3000,
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getConfidenceBadge = (confidence) => {
    const colors = {
      emerging: 'gray',
      observed: 'blue',
      confirmed: 'green',
      explicit: 'purple'
    };
    return <Badge colorScheme={colors[confidence] || 'gray'}>{confidence}</Badge>;
  };

  return (
    <GlassPanel p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Learned Preferences</Heading>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} w="200px">
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      </HStack>

      {filteredPrefs.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          No preferences learned yet. Your AI will learn from your interactions.
        </Alert>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Category</Th>
              <Th>Preference</Th>
              <Th>Value</Th>
              <Th>Confidence</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredPrefs.map((pref, idx) => (
              <Tr key={idx}>
                <Td>
                  <Badge colorScheme="cyan">{pref.category}</Badge>
                </Td>
                <Td fontWeight="medium">{pref.key}</Td>
                <Td>{typeof pref.value === 'object' ? JSON.stringify(pref.value) : String(pref.value)}</Td>
                <Td>{getConfidenceBadge(pref.confidence)}</Td>
                <Td>
                  <IconButton
                    icon={<FiX />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => handleDelete(pref.id)}
                    aria-label="Delete preference"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </GlassPanel>
  );
};

// Observations Panel Component
const ObservationsPanel = ({ 
  observations, 
  onUpdate, 
  editingObs, 
  editedKey, 
  editedValue, 
  editedExplanation,
  onEdit, 
  onSave, 
  onCancel,
  onKeyChange,
  onValueChange,
  onExplanationChange
}) => {
  const toast = useToast();
  const [expandedObs, setExpandedObs] = useState(null);

  const handleApprove = async (obsId) => {
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true }),
      });
      
      if (!response.ok) {
        throw new Error(`Approval failed: ${response.statusText}`);
      }
      
      toast({
        title: 'Observation approved',
        description: 'This will be promoted to a preference',
        status: 'success',
        duration: 3000,
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: 'Approval failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleReject = async (obsId) => {
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: false }),
      });
      
      if (!response.ok) {
        throw new Error(`Rejection failed: ${response.statusText}`);
      }
      
      toast({
        title: 'Observation rejected',
        description: 'This will not be learned',
        status: 'info',
        duration: 3000,
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: 'Rejection failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  if (observations.length === 0) {
    return (
      <GlassPanel p={6}>
        <Alert status="success">
          <AlertIcon />
          <AlertTitle>All caught up!</AlertTitle>
          <AlertDescription>
            No pending observations to review. Your AI will continue learning from your interactions.
          </AlertDescription>
        </Alert>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel p={6}>
      <Heading size="md" mb={4}>Pending Observations</Heading>
      <Text color="gray.500" mb={6}>
        Review what your AI has observed about your behavior. Approve to learn, reject to ignore.
      </Text>

      <VStack spacing={4} align="stretch">
        {observations.map((obs) => (
          <GlassPanel key={obs.id} p={4} borderWidth="1px">
            <HStack justify="space-between" mb={3}>
              <HStack spacing={2} flexWrap="wrap">
                <Badge colorScheme="orange">Pending</Badge>
                <Badge>{obs.category}</Badge>
                {obs.source_ui && (
                  <Badge colorScheme="purple" variant="outline">
                    {obs.source_ui}
                  </Badge>
                )}
              </HStack>
              <HStack>
                {editingObs === obs.id ? (
                  <>
                    <Tooltip label="Save changes">
                      <IconButton
                        icon={<FiSave />}
                        colorScheme="blue"
                        size="sm"
                        onClick={() => onSave(obs.id)}
                        aria-label="Save"
                      />
                    </Tooltip>
                    <Tooltip label="Cancel editing">
                      <IconButton
                        icon={<FiX />}
                        colorScheme="gray"
                        size="sm"
                        onClick={onCancel}
                        aria-label="Cancel"
                      />
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <Tooltip label="Edit content">
                      <IconButton
                        icon={<FiEdit2 />}
                        colorScheme="blue"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(obs)}
                        aria-label="Edit"
                      />
                    </Tooltip>
                    <Tooltip label="Approve and learn">
                      <IconButton
                        icon={<FiCheck />}
                        colorScheme="green"
                        size="sm"
                        onClick={() => handleApprove(obs.id)}
                        aria-label="Approve"
                      />
                    </Tooltip>
                    <Tooltip label="Reject and ignore">
                      <IconButton
                        icon={<FiX />}
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleReject(obs.id)}
                        aria-label="Reject"
                      />
                    </Tooltip>
                  </>
                )}
                <IconButton
                  icon={expandedObs === obs.id ? <FiChevronUp /> : <FiChevronDown />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedObs(expandedObs === obs.id ? null : obs.id)}
                  aria-label="Toggle details"
                />
              </HStack>
            </HStack>

            {editingObs === obs.id ? (
              <VStack spacing={3} align="stretch" mb={2}>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1} fontWeight="bold">Explanation (What does this mean?)</FormLabel>
                  <Textarea
                    value={editedExplanation}
                    onChange={(e) => onExplanationChange(e.target.value)}
                    size="sm"
                    placeholder="Explain what this observation means and why it matters..."
                    rows={3}
                    bg="blue.50"
                    _dark={{ bg: "blue.900" }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>Key</FormLabel>
                  <Input
                    value={editedKey}
                    onChange={(e) => onKeyChange(e.target.value)}
                    size="sm"
                    placeholder="Preference key"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>Value</FormLabel>
                  <Textarea
                    value={editedValue}
                    onChange={(e) => onValueChange(e.target.value)}
                    size="sm"
                    placeholder="Preference value"
                    rows={2}
                  />
                </FormControl>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch" mb={2}>
                {obs.explanation && (
                  <Box p={3} bg="blue.50" _dark={{ bg: "blue.900" }} borderRadius="md" borderLeftWidth="3px" borderLeftColor="blue.500">
                    <Text fontSize="sm" fontWeight="medium" color="blue.700" _dark={{ color: "blue.200" }} mb={1}>
                      What this means:
                    </Text>
                    <Text fontSize="sm" color="gray.700" _dark={{ color: "gray.300" }}>
                      {obs.explanation}
                    </Text>
                  </Box>
                )}
                <Text fontWeight="bold">
                  {obs.key}: {typeof obs.value === 'object' ? JSON.stringify(obs.value) : String(obs.value)}
                </Text>
              </VStack>
            )}

            {/* Metadata row - always visible */}
            <HStack spacing={4} fontSize="xs" color="gray.500" mb={2} flexWrap="wrap">
              <HStack spacing={1}>
                <FiClock />
                <Text>
                  {new Date(obs.created_at).toLocaleDateString('en-US')} at {new Date(obs.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </HStack>
              {obs.source_agent && (
                <HStack spacing={1}>
                  <Text fontWeight="medium">Agent:</Text>
                  <Text>{obs.source_agent}</Text>
                </HStack>
              )}
              {obs.observation_count && obs.observation_count > 1 && (
                <HStack spacing={1}>
                  <Text fontWeight="medium">Seen:</Text>
                  <Text>{obs.observation_count}x</Text>
                </HStack>
              )}
            </HStack>
            
            <Collapse in={expandedObs === obs.id}>
              <Box mt={3} p={3} bg="whiteAlpha.100" borderRadius="md">
                <VStack spacing={2} align="stretch">
                  {obs.source_agent && (
                    <Text fontSize="sm" color="gray.400">
                      <strong>Source Agent:</strong> {obs.source_agent}
                    </Text>
                  )}
                  {obs.source_ui && (
                    <Text fontSize="sm" color="gray.400">
                      <strong>Source UI:</strong> {obs.source_ui}
                    </Text>
                  )}
                  {obs.context && (
                    <Text fontSize="sm" color="gray.400">
                      <strong>Context:</strong> {typeof obs.context === 'object' ? JSON.stringify(obs.context) : obs.context}
                    </Text>
                  )}
                  <Text fontSize="sm" color="gray.400">
                    <strong>Timestamp:</strong> {new Date(obs.created_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    <strong>Observation Count:</strong> {obs.observation_count || 1} time(s)
                  </Text>
                  {obs.metadata && Object.keys(obs.metadata).length > 0 && (
                    <Box>
                      <Text fontSize="sm" color="gray.400" fontWeight="bold" mb={1}>
                        Additional Metadata:
                      </Text>
                      <Code fontSize="xs" p={2} borderRadius="md" display="block" whiteSpace="pre-wrap">
                        {JSON.stringify(obs.metadata, null, 2)}
                      </Code>
                    </Box>
                  )}
                </VStack>
              </Box>
            </Collapse>
          </GlassPanel>
        ))}
      </VStack>
    </GlassPanel>
  );
};

// Context Preview Panel Component
const ContextPreviewPanel = ({ context }) => {
  if (!context) {
    return (
      <GlassPanel p={6}>
        <Alert status="info">
          <AlertIcon />
          Loading context preview...
        </Alert>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel p={6}>
      <Heading size="md" mb={4}>What Your AI Sees</Heading>
      <Text color="gray.500" mb={6}>
        This is the personal context that gets injected into AI requests
      </Text>

      <VStack spacing={6} align="stretch">
        {/* Personalization Prompt */}
        <Box>
          <Text fontWeight="bold" mb={2}>Injected System Prompt</Text>
          <Box
            p={4}
            bg="gray.900"
            borderRadius="md"
            borderWidth="1px"
            borderColor="blue.500"
            fontFamily="mono"
            fontSize="sm"
            whiteSpace="pre-wrap"
          >
            {context.personalization_prompt || 'No personalization prompt generated'}
          </Box>
        </Box>

        {/* Raw Context Data */}
        <Box>
          <Text fontWeight="bold" mb={2}>Raw Context Data</Text>
          <Code
            display="block"
            p={4}
            borderRadius="md"
            whiteSpace="pre"
            overflow="auto"
            maxH="400px"
          >
            {JSON.stringify(context, null, 2)}
          </Code>
        </Box>

        {/* Cache Info */}
        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Cache Status</AlertTitle>
            <AlertDescription>
              {context.cached ? (
                <>Cached response (age: {context.cache_age_seconds}s)</>
              ) : (
                <>Fresh context generated at {new Date(context.generated_at).toLocaleString()}</>
              )}
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </GlassPanel>
  );
};

// Privacy Panel Component
const PrivacyPanel = () => {
  const [settings, setSettings] = useState({
    enableLearning: true,
    autoApprove: false,
    shareWithAgents: true,
    retentionDays: 90,
  });

  return (
    <GlassPanel p={6}>
      <Heading size="md" mb={4}>Privacy & Learning Controls</Heading>
      
      <VStack spacing={6} align="stretch">
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <FormLabel mb={0}>Enable Learning</FormLabel>
            <Text fontSize="sm" color="gray.500">
              Allow AI to observe and learn from your behavior
            </Text>
          </Box>
          <Switch
            isChecked={settings.enableLearning}
            onChange={(e) => setSettings({ ...settings, enableLearning: e.target.checked })}
            colorScheme="green"
          />
        </FormControl>

        <Divider />

        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <FormLabel mb={0}>Auto-Approve Observations</FormLabel>
            <Text fontSize="sm" color="gray.500">
              Automatically promote observations to preferences (not recommended)
            </Text>
          </Box>
          <Switch
            isChecked={settings.autoApprove}
            onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
            colorScheme="orange"
          />
        </FormControl>

        <Divider />

        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <FormLabel mb={0}>Share Context with Agents</FormLabel>
            <Text fontSize="sm" color="gray.500">
              Inject personal context into AI requests
            </Text>
          </Box>
          <Switch
            isChecked={settings.shareWithAgents}
            onChange={(e) => setSettings({ ...settings, shareWithAgents: e.target.checked })}
            colorScheme="blue"
          />
        </FormControl>

        <Divider />

        <FormControl>
          <FormLabel>Data Retention</FormLabel>
          <Select
            value={settings.retentionDays}
            onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) })}
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
            <option value={-1}>Forever</option>
          </Select>
          <Text fontSize="sm" color="gray.500" mt={2}>
            How long to keep observations and preferences
          </Text>
        </FormControl>

        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>Data Control</AlertTitle>
            <AlertDescription>
              You can export or delete all your personal context data at any time.
            </AlertDescription>
          </Box>
        </Alert>

        <HStack spacing={4}>
          <Button colorScheme="blue">Export Data</Button>
          <Button colorScheme="red" variant="outline">Delete All Data</Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};


// Cache Analytics Panel Component
const CacheAnalyticsPanel = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const CONTEXT_LABELS: Record<string, string> = {
    emails: '📧 Emails',
    calendar: '📅 Calendar',
    reminders: '✅ Reminders',
    conversations: '💬 Conversations',
    knowledgeGraph: '🧠 Knowledge',
    approvals: '🔔 Approvals',
    weather: '🌤️ Weather'
  };

  useEffect(() => {
    fetchCacheAnalytics();
    const interval = setInterval(fetchCacheAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCacheAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, heatmapRes] = await Promise.all([
        fetch('/api/cache/analytics?user_id=eleazar'),
        fetch('/api/cache/heatmap?user_id=eleazar')
      ]);
      
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
      if (heatmapRes.ok) {
        setHeatmap(await heatmapRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch cache analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  if (loading && !analytics) {
    return (
      <GlassPanel>
        <VStack py={8}>
          <Text>Loading cache analytics...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Overview Stats */}
      <GlassPanel>
        <Heading size="md" mb={4}>Cache Performance Overview</Heading>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat>
            <StatLabel>Total Queries</StatLabel>
            <StatNumber>{analytics?.total_queries || 0}</StatNumber>
            <StatHelpText>Session: {formatDuration(analytics?.session_duration_seconds || 0)}</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Hit Rate</StatLabel>
            <StatNumber>{((analytics?.overall_hit_rate || 0) * 100).toFixed(1)}%</StatNumber>
            <StatHelpText>{analytics?.total_cache_hits || 0} hits / {analytics?.total_cache_misses || 0} misses</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Active Contexts</StatLabel>
            <StatNumber>
              {analytics?.context_stats ? Object.values(analytics.context_stats).filter((s: any) => s.query_count > 0).length : 0}
            </StatNumber>
            <StatHelpText>of {analytics?.context_stats ? Object.keys(analytics.context_stats).length : 7} total</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Recommendations</StatLabel>
            <StatNumber>{analytics?.recommendations?.length || 0}</StatNumber>
            <StatHelpText>{analytics?.recommendations?.filter((r: any) => r.type === 'warning').length || 0} warnings</StatHelpText>
          </Stat>
        </SimpleGrid>
      </GlassPanel>

      {/* Context Performance Table */}
      <GlassPanel>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Context Performance</Heading>
          <Button size="sm" leftIcon={<FiRefreshCw />} onClick={fetchCacheAnalytics} isLoading={loading}>
            Refresh
          </Button>
        </HStack>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Context</Th>
                <Th isNumeric>Queries</Th>
                <Th isNumeric>Hit Rate</Th>
                <Th isNumeric>Default TTL</Th>
                <Th isNumeric>Adaptive TTL</Th>
                <Th isNumeric>Change</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analytics?.context_stats && Object.entries(analytics.context_stats).map(([ctx, stats]: [string, any]) => (
                <Tr key={ctx}>
                  <Td>{CONTEXT_LABELS[ctx] || ctx}</Td>
                  <Td isNumeric>{stats.query_count}</Td>
                  <Td isNumeric>{(stats.hit_rate * 100).toFixed(0)}%</Td>
                  <Td isNumeric>{stats.default_ttl}s</Td>
                  <Td isNumeric fontWeight="bold">{stats.adaptive_ttl}s</Td>
                  <Td isNumeric>
                    <Text color={stats.ttl_change_percent > 0 ? 'green.500' : stats.ttl_change_percent < 0 ? 'red.500' : 'gray.500'}>
                      {stats.ttl_change_percent > 0 ? '+' : ''}{stats.ttl_change_percent.toFixed(0)}%
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={
                      stats.query_count === 0 ? 'gray' :
                      stats.hit_rate > 0.8 ? 'green' :
                      stats.hit_rate > 0.5 ? 'yellow' : 'red'
                    }>
                      {stats.query_count === 0 ? 'Inactive' :
                       stats.hit_rate > 0.8 ? 'Optimal' :
                       stats.hit_rate > 0.5 ? 'Fair' : 'Poor'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </GlassPanel>

      {/* Recommendations */}
      {analytics?.recommendations?.length > 0 && (
        <GlassPanel>
          <Heading size="md" mb={4}>Optimization Recommendations</Heading>
          <VStack spacing={3} align="stretch">
            {analytics.recommendations.map((rec: any, idx: number) => (
              <Alert
                key={idx}
                status={rec.type === 'warning' ? 'warning' : rec.type === 'success' ? 'success' : 'info'}
                borderRadius="md"
              >
                <AlertIcon />
                <Box>
                  <AlertTitle>{CONTEXT_LABELS[rec.context] || rec.context}</AlertTitle>
                  <AlertDescription>{rec.message}</AlertDescription>
                </Box>
              </Alert>
            ))}
          </VStack>
        </GlassPanel>
      )}

      {/* Usage Heatmap */}
      {heatmap && (
        <GlassPanel>
          <Heading size="md" mb={4}>24-Hour Usage Patterns</Heading>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Context</Th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <Th key={i} isNumeric fontSize="xs" px={1}>{i.toString().padStart(2, '0')}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(heatmap.heatmap || {}).map(([ctx, hours]: [string, any]) => {
                  const maxVal = Math.max(...hours, 1);
                  return (
                    <Tr key={ctx}>
                      <Td fontSize="sm">{CONTEXT_LABELS[ctx] || ctx}</Td>
                      {hours.map((count: number, hour: number) => (
                        <Td
                          key={hour}
                          isNumeric
                          px={1}
                          bg={count > 0 ? `blue.${Math.min(Math.round((count / maxVal) * 5) * 100 + 100, 500)}` : 'transparent'}
                          color={count > maxVal * 0.5 ? 'white' : 'inherit'}
                          fontSize="xs"
                        >
                          {count > 0 ? count : ''}
                        </Td>
                      ))}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
          <Text fontSize="sm" color="gray.500" mt={4}>
            Shows query distribution across hours (00-23). Darker colors indicate higher usage.
          </Text>
        </GlassPanel>
      )}
    </VStack>
  );
};


export default PersonalContextDashboard;

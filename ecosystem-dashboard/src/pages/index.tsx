import React, { useEffect, useState, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  SimpleGrid,
  Grid,
  GridItem,
  Spinner,
  Center,
  Text,
  Heading,
  Badge,
  Icon,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';
import {
  Brain,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  Mic,
  BookOpen,
  Shield,
  Sparkles,
  ChevronRight,
  Cpu,
  Smartphone,
  ArrowRight,
  Search,
  Headphones,
  Radio,
  Image as ImageIcon,
  Zap,
  Activity,
  Lock,
} from 'lucide-react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useTeslaDetection, getTeslaCSSVariables } from '@/hooks/useTeslaDetection';

// ============================================================
// Time-aware greeting
// ============================================================
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================
// Quick Action Card — Tesla-optimized with larger touch targets
// ============================================================
interface QuickActionProps {
  icon: any;
  label: string;
  description: string;
  href: string;
  accentColor: string;
  isTesla?: boolean;
}

function QuickAction({ icon: ActionIcon, label, description, href, accentColor, isTesla }: QuickActionProps) {
  const router = useRouter();
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  return (
    <Box
      bg={surfaceElevated}
      borderWidth="1px"
      borderColor={borderSubtle}
      borderRadius={isTesla ? '2xl' : 'xl'}
      p={isTesla ? 6 : 5}
      cursor="pointer"
      onClick={() => router.push(href)}
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        bg: surfaceHover,
        borderColor: `${accentColor}.400`,
        transform: 'translateY(-2px)',
        shadow: 'lg',
      }}
      role="group"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="2px"
        bgGradient={`linear(to-r, ${accentColor}.400, ${accentColor}.600)`}
        opacity={0}
        transition="opacity 0.2s"
        _groupHover={{ opacity: 1 }}
      />
      <HStack spacing={4}>
        <Flex
          w={isTesla ? '48px' : '40px'}
          h={isTesla ? '48px' : '40px'}
          borderRadius="xl"
          bgGradient={`linear(135deg, ${accentColor}.400, ${accentColor}.600)`}
          align="center"
          justify="center"
          flexShrink={0}
          shadow="sm"
        >
          <Icon as={ActionIcon} boxSize={isTesla ? 6 : 5} color="white" />
        </Flex>
        <VStack align="start" spacing={0} flex={1}>
          <Text
            fontWeight="600"
            fontSize={isTesla ? 'md' : 'sm'}
            color={textPrimary}
            lineHeight="1.3"
          >
            {label}
          </Text>
          <Text fontSize={isTesla ? 'sm' : 'xs'} color={textSecondary} lineHeight="1.4">
            {description}
          </Text>
        </VStack>
        <Icon
          as={ChevronRight}
          boxSize={4}
          color={textSecondary}
          opacity={0}
          transition="all 0.2s"
          _groupHover={{ opacity: 1, transform: 'translateX(2px)' }}
        />
      </HStack>
    </Box>
  );
}

// ============================================================
// Featured Action — larger prominent card for Voice & Chat
// ============================================================
interface FeaturedActionProps {
  icon: any;
  label: string;
  description: string;
  href: string;
  gradient: string;
  badge?: string;
  isTesla?: boolean;
}

function FeaturedAction({ icon: ActionIcon, label, description, href, gradient, badge, isTesla }: FeaturedActionProps) {
  const router = useRouter();
  const textPrimary = useSemanticToken('text.primary');
  const borderSubtle = useSemanticToken('border.subtle');

  return (
    <Box
      bgGradient={gradient}
      borderRadius={isTesla ? '2xl' : 'xl'}
      p={isTesla ? 7 : 6}
      cursor="pointer"
      onClick={() => router.push(href)}
      transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        transform: 'translateY(-3px)',
        shadow: 'xl',
      }}
      role="group"
      position="relative"
      overflow="hidden"
      minH={isTesla ? '140px' : '120px'}
    >
      <Box
        position="absolute"
        top={0}
        right={0}
        w="120px"
        h="120px"
        borderRadius="full"
        bg="whiteAlpha.100"
        transform="translate(30%, -30%)"
      />
      <VStack align="start" spacing={3} h="full" justify="space-between">
        <HStack spacing={3} w="full">
          <Flex
            w={isTesla ? '52px' : '44px'}
            h={isTesla ? '52px' : '44px'}
            borderRadius="xl"
            bg="whiteAlpha.200"
            backdropFilter="blur(8px)"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Icon as={ActionIcon} boxSize={isTesla ? 7 : 6} color="white" />
          </Flex>
          {badge && (
            <Badge
              colorScheme="whiteAlpha"
              bg="whiteAlpha.200"
              color="white"
              fontSize="xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {badge}
            </Badge>
          )}
          <Icon
            as={ArrowRight}
            boxSize={5}
            color="whiteAlpha.600"
            ml="auto"
            opacity={0}
            transition="all 0.2s"
            _groupHover={{ opacity: 1, transform: 'translateX(4px)' }}
          />
        </HStack>
        <VStack align="start" spacing={0.5}>
          <Text fontWeight="700" fontSize={isTesla ? 'xl' : 'lg'} color="white" lineHeight="1.2">
            {label}
          </Text>
          <Text fontSize={isTesla ? 'sm' : 'xs'} color="whiteAlpha.800" lineHeight="1.4">
            {description}
          </Text>
        </VStack>
      </VStack>
    </Box>
  );
}

// ============================================================
// Status Indicator — minimal inline
// ============================================================
function StatusIndicator({ label, value, color }: { label: string; value: string; color: string }) {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  return (
    <HStack spacing={2}>
      <Box w="8px" h="8px" borderRadius="full" bg={`${color}.400`} shadow={`0 0 6px var(--chakra-colors-${color}-400)`} />
      <Text fontSize="xs" color={textSecondary} fontWeight="500">{label}</Text>
      <Text fontSize="xs" color={textPrimary} fontWeight="600">{value}</Text>
    </HStack>
  );
}

// ============================================================
// Main Dashboard — Redesigned with Tesla compatibility
// ============================================================
const DashboardHome = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const tesla = useTeslaDetection();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const surfaceBase = useSemanticToken('surface.base');
  const surfaceHover = useSemanticToken('surface.hover');

  const [searchQuery, setSearchQuery] = useState('');

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    if (status === 'loading') return;
    if (!router.isReady) return;
    if (!session) { router.push('/landing'); return; }
    if ((session.user as any)?.accountType === 'child') { router.push('/child/home'); return; }
    
    // Auto-redirect Tesla browsers to dedicated Tesla dashboard
    // Skip if user explicitly navigated away (has ?noTeslaRedirect query param)
    if (tesla.isTesla && !router.query.noTeslaRedirect) {
      console.log('[Home] 🚗 Tesla browser detected — redirecting to Tesla dashboard');
      router.replace('/tesla');
    }
  }, [session, status, router, router.isReady, tesla.isTesla]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/workspace-ai?message=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  const quickActions: QuickActionProps[] = [
    { icon: MessageSquare, label: 'AI Chat', description: 'Converse with your local AI agent', href: '/workspace-ai', accentColor: 'blue' },
    { icon: Mail, label: 'Email', description: 'Inbox, drafts, and smart replies', href: '/email', accentColor: 'purple' },
    { icon: Calendar, label: 'Calendar', description: 'AI-synced schedule and events', href: '/calendar', accentColor: 'cyan' },
    { icon: FileText, label: 'Workspace', description: 'Notes, pages, and documents', href: '/workspace', accentColor: 'green' },
    { icon: BookOpen, label: 'Research', description: 'Deep research and analysis', href: '/ai-research', accentColor: 'orange' },
    { icon: ImageIcon, label: 'Image Studio', description: 'AI image generation', href: '/image-studio', accentColor: 'pink' },
  ];

  const teslaVars = tesla.isTesla ? getTeslaCSSVariables(tesla) : {};

  return (
    <DashboardLayout>
      <Head>
        <title>Hyperspace AI - Home</title>
        <meta name="description" content="Your personal AI dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <Box
        bg={surfaceBase}
        minH="calc(100vh - 70px)"
        style={teslaVars as React.CSSProperties}
      >
        <Container
          maxW={tesla.isTesla ? '1200px' : '960px'}
          py={{ base: 4, md: tesla.isTesla ? 6 : 8 }}
          px={{ base: 3, md: 4 }}
        >
          <VStack align="stretch" spacing={{ base: 5, md: tesla.isTesla ? 5 : 7 }}>

            {/* ============ Header: Greeting + Status Row ============ */}
            <Flex
              justify="space-between"
              align={{ base: 'start', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              gap={3}
            >
              <VStack align="start" spacing={0.5}>
                <Heading
                  size={tesla.isTesla ? 'xl' : 'lg'}
                  color={textPrimary}
                  fontWeight="700"
                  letterSpacing="-0.025em"
                >
                  {greeting}, {firstName}
                </Heading>
                <Text fontSize={tesla.isTesla ? 'md' : 'sm'} color={textSecondary}>
                  How can I help you today?
                </Text>
              </VStack>

              <HStack
                spacing={4}
                bg={surfaceElevated}
                borderRadius="xl"
                px={4}
                py={2.5}
                borderWidth="1px"
                borderColor={borderSubtle}
                display={{ base: 'none', md: 'flex' }}
              >
                <StatusIndicator label="Models" value="Online" color="green" />
                <Box w="1px" h="16px" bg={borderSubtle} />
                <StatusIndicator label="GPU" value="Ready" color="purple" />
                <Box w="1px" h="16px" bg={borderSubtle} />
                <StatusIndicator label="Security" value="Active" color="blue" />
                {!tesla.isTesla && (
                  <>
                    <Box w="1px" h="16px" bg={borderSubtle} />
                    <StatusIndicator label="ExoMind" value="Connected" color="cyan" />
                  </>
                )}
              </HStack>
            </Flex>

            {/* ============ Search / Prompt Bar ============ */}
            <Box as="form" onSubmit={handleSearch}>
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none" h={tesla.isTesla ? '64px' : '56px'}>
                  <Icon as={Sparkles} boxSize={5} color={textSecondary} />
                </InputLeftElement>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask anything, search your knowledge, or start a task..."
                  h={tesla.isTesla ? '64px' : '56px'}
                  bg={surfaceElevated}
                  borderColor={borderSubtle}
                  borderRadius="2xl"
                  fontSize={tesla.isTesla ? 'lg' : 'md'}
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                  _placeholder={{ color: textSecondary }}
                  pr="48px"
                />
                <InputRightElement h={tesla.isTesla ? '64px' : '56px'} pr={2}>
                  <Tooltip label="Send to Workspace AI" placement="left">
                    <IconButton
                      aria-label="Send"
                      icon={<Icon as={ArrowRight} boxSize={4} />}
                      size="sm"
                      variant="ghost"
                      borderRadius="lg"
                      color={textSecondary}
                      _hover={{ bg: surfaceHover, color: textPrimary }}
                      type="submit"
                    />
                  </Tooltip>
                </InputRightElement>
              </InputGroup>
            </Box>

            {/* ============ Featured: Voice Agent & Chat ============ */}
            <Grid
              templateColumns={{ base: '1fr', md: '1fr 1fr' }}
              gap={tesla.isTesla ? 4 : 3}
            >
              <GridItem>
                <FeaturedAction
                  icon={Mic}
                  label="Voice Agent"
                  description="Talk to Nova — real-time voice conversation with your AI"
                  href="/openclaw"
                  gradient="linear(135deg, #6366f1, #8b5cf6, #a855f7)"
                  badge="Nova Voice"
                  isTesla={tesla.isTesla}
                />
              </GridItem>
              <GridItem>
                <FeaturedAction
                  icon={MessageSquare}
                  label="Workspace AI"
                  description="Chat with your local AI agent — research, write, and plan"
                  href="/workspace-ai"
                  gradient="linear(135deg, #3b82f6, #2563eb, #1d4ed8)"
                  badge="Local LLM"
                  isTesla={tesla.isTesla}
                />
              </GridItem>
            </Grid>

            {/* ============ Quick Actions Grid ============ */}
            <Box>
              <Text
                fontSize="xs"
                fontWeight="600"
                color={textTertiary}
                textTransform="uppercase"
                letterSpacing="0.08em"
                mb={3}
              >
                Quick Actions
              </Text>
              <SimpleGrid
                columns={{ base: 1, sm: 2, md: tesla.isTesla ? 2 : 3 }}
                spacing={tesla.isTesla ? 4 : 3}
              >
                {quickActions.map((action) => (
                  <QuickAction key={action.label} {...action} isTesla={tesla.isTesla} />
                ))}
              </SimpleGrid>
            </Box>

            {/* ============ Secondary Quick Links (Tesla-visible) ============ */}
            <SimpleGrid columns={{ base: 2, sm: 3, md: 6 }} spacing={2}>
              {[
                { label: 'Podcast', icon: Radio, href: '/podcast-studio' },
                { label: 'Personal AI', icon: Brain, href: '/openclaw' },
                { label: 'Knowledge', icon: BookOpen, href: '/knowledge' },
                { label: 'Workflows', icon: Zap, href: '/agentic-workflows' },
                { label: 'Monitoring', icon: Activity, href: '/monitoring' },
                { label: 'Settings', icon: Lock, href: '/settings' },
              ].map((item) => (
                <Flex
                  key={item.label}
                  align="center"
                  justify="center"
                  direction="column"
                  gap={1.5}
                  py={tesla.isTesla ? 4 : 3}
                  px={2}
                  borderRadius="xl"
                  bg={surfaceElevated}
                  borderWidth="1px"
                  borderColor={borderSubtle}
                  cursor="pointer"
                  onClick={() => router.push(item.href)}
                  transition="all 0.2s"
                  _hover={{
                    bg: surfaceHover,
                    transform: 'translateY(-1px)',
                    shadow: 'sm',
                  }}
                >
                  <Icon as={item.icon} boxSize={tesla.isTesla ? 5 : 4} color={textSecondary} />
                  <Text fontSize={tesla.isTesla ? 'xs' : '2xs'} fontWeight="600" color={textSecondary}>
                    {item.label}
                  </Text>
                </Flex>
              ))}
            </SimpleGrid>

            {/* ============ Mobile Status (visible on small screens) ============ */}
            <SimpleGrid columns={2} spacing={2} display={{ base: 'grid', md: 'none' }}>
              <StatusIndicator label="Models" value="Online" color="green" />
              <StatusIndicator label="GPU" value="Ready" color="purple" />
              <StatusIndicator label="Security" value="Active" color="blue" />
              <StatusIndicator label="ExoMind" value="Connected" color="cyan" />
            </SimpleGrid>

            {/* ============ Footer ============ */}
            <HStack justify="center" pt={2} pb={1}>
              <Icon as={Shield} boxSize={3} color={textTertiary} />
              <Text fontSize="2xs" color={textTertiary} fontWeight="500">
                Local-first AI &middot; Your data stays on your hardware
              </Text>
              {tesla.isTesla && (
                <>
                  <Text fontSize="2xs" color={textTertiary}>&middot;</Text>
                  <Text fontSize="2xs" color={textTertiary} fontWeight="500">
                    Tesla Mode Active
                  </Text>
                </>
              )}
            </HStack>

          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
};

export default DashboardHome;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/landing',
        permanent: false,
      },
    };
  }
  
  if (session?.user && (session.user as any).accountType === 'child') {
    return {
      redirect: {
        destination: '/child/home',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
};

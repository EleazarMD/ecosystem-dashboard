import React, { useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  Badge,
  Kbd,
  chakra,
} from '@chakra-ui/react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Brain,
  Shield,
  Zap,
  MessageSquare,
  Eye,
  Volume2,
  Lock,
  Smartphone,
  Server,
  Database,
  Globe,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const MotionBox = motion(Box);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);
const MotionFlex = motion(Flex);

// ============================================================
// Animated Section Wrapper
// ============================================================
function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <MotionBox
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </MotionBox>
  );
}

// ============================================================
// Gradient Orb Background
// ============================================================
function GradientOrbs() {
  return (
    <Box position="absolute" inset={0} overflow="hidden" pointerEvents="none" zIndex={0}>
      <MotionBox
        position="absolute"
        top="-20%"
        left="-10%"
        w="600px"
        h="600px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)"
        filter="blur(80px)"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <MotionBox
        position="absolute"
        top="30%"
        right="-15%"
        w="500px"
        h="500px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)"
        filter="blur(80px)"
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <MotionBox
        position="absolute"
        bottom="-10%"
        left="30%"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)"
        filter="blur(80px)"
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </Box>
  );
}

// ============================================================
// Feature Card
// ============================================================
interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  accentColor: string;
  delay: number;
}

function FeatureCard({ icon: FeatureIcon, title, description, accentColor, delay }: FeatureCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <MotionBox
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Box
        bg="rgba(255,255,255,0.03)"
        backdropFilter="blur(12px)"
        borderRadius="2xl"
        borderWidth="1px"
        borderColor="whiteAlpha.100"
        p={7}
        h="full"
        position="relative"
        overflow="hidden"
        role="group"
        cursor="default"
        transition="all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)"
        _hover={{
          borderColor: `${accentColor}.500`,
          bg: 'rgba(255,255,255,0.05)',
          transform: 'translateY(-4px)',
          boxShadow: `0 20px 40px -12px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor === 'blue' ? 'rgba(59,130,246,0.2)' : accentColor === 'purple' ? 'rgba(139,92,246,0.2)' : accentColor === 'cyan' ? 'rgba(6,182,212,0.2)' : 'rgba(16,185,129,0.2)'}`,
        }}
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="1px"
          bgGradient={`linear(to-r, transparent, ${accentColor}.500, transparent)`}
          opacity={0}
          transition="opacity 0.4s"
          _groupHover={{ opacity: 0.6 }}
        />
        <VStack align="start" spacing={4}>
          <Flex
            w="48px"
            h="48px"
            borderRadius="xl"
            bg={`${accentColor}.500`}
            bgGradient={`linear(135deg, ${accentColor}.400, ${accentColor}.600)`}
            align="center"
            justify="center"
            boxShadow={`0 4px 14px 0 ${accentColor === 'blue' ? 'rgba(59,130,246,0.3)' : accentColor === 'purple' ? 'rgba(139,92,246,0.3)' : accentColor === 'cyan' ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.3)'}`}
          >
            <Icon as={FeatureIcon} boxSize={5} color="white" />
          </Flex>
          <Heading size="sm" color="white" fontWeight="600" letterSpacing="-0.01em">
            {title}
          </Heading>
          <Text color="gray.400" fontSize="sm" lineHeight="1.7">
            {description}
          </Text>
        </VStack>
      </Box>
    </MotionBox>
  );
}

// ============================================================
// Capability Pill
// ============================================================
function CapabilityPill({ icon: PillIcon, label }: { icon: any; label: string }) {
  return (
    <HStack
      bg="whiteAlpha.50"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      borderRadius="full"
      px={4}
      py={2}
      spacing={2}
    >
      <Icon as={PillIcon} boxSize={4} color="blue.400" />
      <Text fontSize="sm" color="gray.300" fontWeight="500">{label}</Text>
    </HStack>
  );
}

// ============================================================
// Main Landing Page
// ============================================================
const LandingPage: React.FC = () => {
  const router = useRouter();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const features = [
    { icon: Brain, title: 'Local AI Inference', description: 'Run MiniMax, Qwen Vision, and Qwen TTS on your own hardware. Zero API costs, complete privacy, full control over your models.', accentColor: 'blue' },
    { icon: MessageSquare, title: 'ExoMind Agent', description: 'Your personal AI assistant across iOS and web. Context-aware conversations, deep research, and intelligent task automation.', accentColor: 'purple' },
    { icon: Eye, title: 'Vision Understanding', description: 'Analyze images, documents, charts, and screenshots with Qwen Vision LM. Multimodal intelligence at your fingertips.', accentColor: 'cyan' },
    { icon: Shield, title: 'Zero-Tolerance Security', description: 'JIT access controls, immutable audit trails, encrypted credentials. Every action authorized, every operation traceable.', accentColor: 'green' },
    { icon: Volume2, title: 'Voice Intelligence', description: 'Speech-to-text and text-to-speech with Qwen TTS and Deepgram Nova. Natural voice interactions with your AI.', accentColor: 'blue' },
    { icon: Database, title: 'Knowledge Graph', description: 'Neo4j-powered semantic relationships with vector embeddings. Your personal knowledge base grows smarter over time.', accentColor: 'purple' },
    { icon: Smartphone, title: 'iOS Companion', description: 'Capture thoughts, transcribe meetings, research on the go. Seamless sync between your phone and homelab.', accentColor: 'cyan' },
    { icon: Server, title: 'Multi-Tenant Isolation', description: 'Each family member gets their own Docker containers, model endpoints, and encrypted storage. Complete data separation.', accentColor: 'green' },
  ];

  return (
    <>
      <Head>
        <title>Hyperspace - Your Personal AI</title>
        <meta name="description" content="Private AI infrastructure for your family. Local models, zero-tolerance security, and intelligent automation." />
      </Head>

      <Box minH="100vh" bg="#09090b" color="white" overflowX="hidden">
        <GradientOrbs />

        {/* ============ NAV ============ */}
        <Box
          as="nav"
          position="fixed"
          top={0}
          left={0}
          right={0}
          zIndex={50}
          bg="rgba(9,9,11,0.8)"
          backdropFilter="blur(20px) saturate(180%)"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
        >
          <Container maxW="7xl">
            <Flex h="64px" align="center" justify="space-between">
              <HStack spacing={2}>
                <Box
                  w="32px"
                  h="32px"
                  borderRadius="lg"
                  bgGradient="linear(135deg, blue.400, purple.500)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={Sparkles} boxSize={4} color="white" />
                </Box>
                <Text fontWeight="700" fontSize="lg" letterSpacing="-0.02em">
                  Hyperspace
                </Text>
              </HStack>
              <HStack spacing={3}>
                <a href="/auth/signin" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="ghost"
                    color="gray.400"
                    fontWeight="500"
                    fontSize="sm"
                    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  >
                    Sign In
                  </Button>
                </a>
                <a href="/auth/signup" style={{ textDecoration: 'none' }}>
                  <Button
                    size="sm"
                    bg="white"
                    color="black"
                    fontWeight="600"
                    borderRadius="lg"
                    _hover={{ bg: 'gray.200', transform: 'translateY(-1px)' }}
                    transition="all 0.2s"
                  >
                    Get Started
                  </Button>
                </a>
              </HStack>
            </Flex>
          </Container>
        </Box>

        {/* ============ HERO ============ */}
        <MotionBox
          ref={heroRef}
          style={{ opacity: heroOpacity, scale: heroScale }}
          position="relative"
          zIndex={1}
        >
          <Container maxW="4xl" pt={{ base: '140px', md: '180px' }} pb={{ base: 16, md: 24 }}>
            <VStack spacing={8} textAlign="center">
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Badge
                  bg="whiteAlpha.100"
                  color="blue.300"
                  borderRadius="full"
                  px={4}
                  py={1.5}
                  fontSize="xs"
                  fontWeight="600"
                  letterSpacing="0.05em"
                  textTransform="uppercase"
                  borderWidth="1px"
                  borderColor="whiteAlpha.100"
                >
                  Local-First AI Infrastructure
                </Badge>
              </MotionBox>

              <MotionHeading
                fontSize={{ base: '40px', md: '64px', lg: '76px' }}
                fontWeight="700"
                lineHeight="1.05"
                letterSpacing="-0.035em"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Your AI.{' '}
                <chakra.span
                  bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
                  bgClip="text"
                >
                  Your Hardware.
                </chakra.span>
                <br />
                Your Rules.
              </MotionHeading>

              <MotionText
                fontSize={{ base: 'lg', md: 'xl' }}
                color="gray.400"
                maxW="2xl"
                lineHeight="1.8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
              >
                Private AI infrastructure for your family. Run powerful language models,
                vision AI, and voice synthesis on your own hardware with zero-tolerance security
                and complete data ownership.
              </MotionText>

              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <HStack spacing={4} pt={4}>
                  <a href="/auth/signup" style={{ textDecoration: 'none' }}>
                    <Button
                      size="lg"
                      bg="white"
                      color="black"
                      fontWeight="600"
                      borderRadius="xl"
                      px={8}
                      h="56px"
                      fontSize="md"
                      rightIcon={<Icon as={ArrowRight} boxSize={4} />}
                      _hover={{
                        bg: 'gray.100',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 20px 40px -12px rgba(255,255,255,0.15)',
                      }}
                      transition="all 0.3s"
                    >
                      Start Building
                    </Button>
                  </a>
                  <a href="/auth/signin" style={{ textDecoration: 'none' }}>
                    <Button
                      size="lg"
                      variant="outline"
                      borderColor="whiteAlpha.200"
                      color="gray.300"
                      fontWeight="500"
                      borderRadius="xl"
                      px={8}
                      h="56px"
                      fontSize="md"
                      _hover={{
                        borderColor: 'whiteAlpha.400',
                        bg: 'whiteAlpha.50',
                        color: 'white',
                      }}
                      transition="all 0.3s"
                    >
                      Sign In
                    </Button>
                  </a>
                </HStack>
              </MotionBox>

              {/* Capability Pills */}
              <MotionBox
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                pt={6}
              >
                <Flex gap={3} flexWrap="wrap" justify="center">
                  <CapabilityPill icon={Brain} label="MiniMax LLM" />
                  <CapabilityPill icon={Eye} label="Qwen Vision" />
                  <CapabilityPill icon={Volume2} label="Qwen TTS" />
                  <CapabilityPill icon={Lock} label="Zero-Trust" />
                  <CapabilityPill icon={Smartphone} label="ExoMind iOS" />
                </Flex>
              </MotionBox>
            </VStack>
          </Container>
        </MotionBox>

        {/* ============ PRODUCT PREVIEW ============ */}
        <AnimatedSection>
          <Container maxW="6xl" pb={24}>
            <Box
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.100"
              overflow="hidden"
              bg="rgba(255,255,255,0.02)"
              position="relative"
            >
              <Box
                h="1px"
                bgGradient="linear(to-r, transparent, blue.500, purple.500, transparent)"
              />
              <Box p={{ base: 6, md: 10 }}>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
                  {[
                    { label: 'AI Gateway', desc: 'Route requests to 20+ models across local and cloud providers', color: 'blue.400' },
                    { label: 'OpenClaw Sandbox', desc: 'Secure agentic execution with seccomp, AppArmor, and read-only rootfs', color: 'purple.400' },
                    { label: 'Knowledge Graph', desc: 'Neo4j semantic relationships with pgvector embeddings', color: 'cyan.400' },
                  ].map((item, i) => (
                    <VStack key={i} align="start" spacing={3}>
                      <Box w="40px" h="3px" borderRadius="full" bg={item.color} />
                      <Text fontWeight="600" color="white" fontSize="md">{item.label}</Text>
                      <Text color="gray.500" fontSize="sm" lineHeight="1.7">{item.desc}</Text>
                    </VStack>
                  ))}
                </SimpleGrid>
              </Box>
            </Box>
          </Container>
        </AnimatedSection>

        {/* ============ FEATURES GRID ============ */}
        <Box position="relative" zIndex={1}>
          <Container maxW="7xl" py={24}>
            <AnimatedSection>
              <VStack spacing={4} textAlign="center" mb={16}>
                <Badge
                  bg="whiteAlpha.100"
                  color="gray.300"
                  borderRadius="full"
                  px={4}
                  py={1.5}
                  fontSize="xs"
                  fontWeight="600"
                  letterSpacing="0.05em"
                  textTransform="uppercase"
                >
                  Capabilities
                </Badge>
                <Heading
                  fontSize={{ base: '2xl', md: '4xl' }}
                  fontWeight="700"
                  letterSpacing="-0.02em"
                >
                  Everything you need,{' '}
                  <chakra.span color="gray.500">nothing you don't</chakra.span>
                </Heading>
                <Text color="gray.500" fontSize="lg" maxW="2xl">
                  A complete AI platform running on your hardware. Private, powerful, and built for families.
                </Text>
              </VStack>
            </AnimatedSection>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5}>
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} delay={index * 0.08} />
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* ============ COMPARISON / DIFFERENTIATOR ============ */}
        <AnimatedSection>
          <Container maxW="5xl" py={24}>
            <Box
              bg="rgba(255,255,255,0.02)"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.100"
              p={{ base: 8, md: 14 }}
              position="relative"
              overflow="hidden"
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                h="1px"
                bgGradient="linear(to-r, transparent, green.500, transparent)"
              />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={12}>
                <VStack align="start" spacing={6}>
                  <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="xs">
                    Why Hyperspace
                  </Badge>
                  <Heading size="lg" letterSpacing="-0.02em" lineHeight="1.2">
                    Unlike ChatGPT or Gemini, your data never leaves your network.
                  </Heading>
                  <Text color="gray.400" lineHeight="1.8">
                    Cloud AI services process your data on their servers. Hyperspace runs 
                    entirely on your hardware with Tailscale mesh encryption. 
                    Your conversations, documents, and knowledge graph stay under your roof.
                  </Text>
                </VStack>
                <VStack align="start" spacing={4}>
                  {[
                    { label: 'Your hardware, your models', desc: 'RTX-accelerated inference with vLLM' },
                    { label: 'Per-member isolation', desc: 'Each user gets isolated Docker containers' },
                    { label: 'Parental intelligence', desc: 'AI safety monitoring for child accounts' },
                    { label: 'Zero API costs', desc: 'Local models run free after hardware investment' },
                    { label: 'Offline capable', desc: 'Core features work without internet' },
                  ].map((item, i) => (
                    <HStack key={i} align="start" spacing={3}>
                      <Flex
                        w="20px"
                        h="20px"
                        borderRadius="full"
                        bg="green.500"
                        align="center"
                        justify="center"
                        flexShrink={0}
                        mt="2px"
                      >
                        <Text fontSize="xs" color="white" fontWeight="bold">&#10003;</Text>
                      </Flex>
                      <VStack align="start" spacing={0}>
                        <Text color="white" fontWeight="500" fontSize="sm">{item.label}</Text>
                        <Text color="gray.500" fontSize="xs">{item.desc}</Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </SimpleGrid>
            </Box>
          </Container>
        </AnimatedSection>

        {/* ============ CTA ============ */}
        <AnimatedSection>
          <Container maxW="4xl" py={24} textAlign="center">
            <VStack spacing={8}>
              <Heading
                fontSize={{ base: '3xl', md: '5xl' }}
                fontWeight="700"
                letterSpacing="-0.03em"
                lineHeight="1.1"
              >
                Ready to own{' '}
                <chakra.span
                  bgGradient="linear(to-r, blue.400, purple.400)"
                  bgClip="text"
                >
                  your AI
                </chakra.span>
                ?
              </Heading>
              <Text color="gray.400" fontSize="lg" maxW="xl" lineHeight="1.8">
                Set up your personal AI homelab in minutes. 
                Onboard your family, configure local models, and start building with complete privacy.
              </Text>
              <a href="/auth/signup" style={{ textDecoration: 'none' }}>
                <Button
                  size="lg"
                  bg="white"
                  color="black"
                  fontWeight="600"
                  borderRadius="xl"
                  px={10}
                  h="60px"
                  fontSize="md"
                  rightIcon={<Icon as={ChevronRight} boxSize={5} />}
                  _hover={{
                    bg: 'gray.100',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 20px 40px -12px rgba(255,255,255,0.15)',
                  }}
                  transition="all 0.3s"
                >
                  Create Your Homelab
                </Button>
              </a>
            </VStack>
          </Container>
        </AnimatedSection>

        {/* ============ FOOTER ============ */}
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" py={8}>
          <Container maxW="7xl">
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <HStack spacing={2}>
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="md"
                  bgGradient="linear(135deg, blue.400, purple.500)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={Sparkles} boxSize={3} color="white" />
                </Box>
                <Text color="gray.600" fontSize="sm">
                  &copy; {new Date().getFullYear()} Hyperspace AI Homelab
                </Text>
              </HStack>
              <HStack spacing={6}>
                {['Documentation', 'Privacy', 'Security'].map((link) => (
                  <Text
                    key={link}
                    color="gray.600"
                    fontSize="sm"
                    cursor="pointer"
                    transition="color 0.2s"
                    _hover={{ color: 'gray.300' }}
                  >
                    {link}
                  </Text>
                ))}
              </HStack>
            </Flex>
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default LandingPage;

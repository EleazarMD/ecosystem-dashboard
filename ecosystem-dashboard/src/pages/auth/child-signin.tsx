/**
 * Child-Friendly Sign In Page
 * 
 * A fun, themed login experience for child accounts with:
 * - Large, colorful buttons
 * - Themed backgrounds and icons
 * - Simple, friendly language
 * - Visual feedback and animations
 */

import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { signIn, getCsrfToken } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Image,
  useColorModeValue,
  Icon,
  Flex,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiMail, FiLock } from 'react-icons/fi';

interface ChildSignInProps {
  csrfToken: string | null;
}

// Theme configurations for child accounts
const CHILD_THEMES = {
  pusheen: {
    name: 'Pusheen',
    emoji: '🐱',
    colors: {
      primary: '#8B7355',
      secondary: '#FFB6C1',
      background: '#FFF5EE',
      cardBg: 'rgba(255, 255, 255, 0.9)',
    },
    pattern: 'url("/themes/pusheen/pattern.png")',
    icon: '/themes/pusheen/Icons/W-Clan.png',
  },
  minecraft: {
    name: 'Minecraft',
    emoji: '⛏️',
    colors: {
      primary: '#8B4513',
      secondary: '#4CAF50',
      background: '#E8F5E9',
      cardBg: 'rgba(255, 255, 255, 0.9)',
    },
    pattern: 'url("/themes/minecraft/pattern.png")',
    icon: '/themes/minecraft/Icons/Minecraft.png',
  },
};

export default function ChildSignIn({ csrfToken }: ChildSignInProps) {
  const router = useRouter();
  const { error, callbackUrl, theme } = router.query;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'pusheen' | 'minecraft' | null>(
    (theme as 'pusheen' | 'minecraft') || null
  );
  
  const [localError, setLocalError] = useState<string | null>(null);

  const currentTheme = selectedTheme ? CHILD_THEMES[selectedTheme] : null;

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        setLocalError('Oops! Check your username and password 🤔');
        setIsLoading(false);
      } else if (result?.ok) {
        // Success - redirect to child home
        router.push('/child/home');
      }
    } catch (err) {
      setLocalError('Something went wrong. Let\'s try again! 🔄');
      setIsLoading(false);
    }
  };

  // Theme selection screen
  if (!selectedTheme) {
    return (
      <>
        <Head>
          <title>Welcome! | AI Homelab</title>
        </Head>
        
        <Box 
          minH="100vh" 
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          py={12}
          position="relative"
          overflow="hidden"
        >
          {/* Decorative elements */}
          <Box
            position="absolute"
            top="10%"
            left="10%"
            fontSize="6xl"
            opacity={0.2}
            animation="float 3s ease-in-out infinite"
          >
            ⭐
          </Box>
          <Box
            position="absolute"
            top="60%"
            right="15%"
            fontSize="6xl"
            opacity={0.2}
            animation="float 4s ease-in-out infinite"
          >
            🌈
          </Box>
          
          <Container maxW="4xl">
            <VStack spacing={12}>
              {/* Welcome Header */}
              <VStack spacing={4}>
                <Text fontSize="6xl" animation="wave 1s ease-in-out infinite">
                  👋
                </Text>
                <Heading 
                  size="2xl" 
                  color="white"
                  textAlign="center"
                  textShadow="0 2px 10px rgba(0,0,0,0.3)"
                >
                  Welcome Back!
                </Heading>
                <Text fontSize="xl" color="whiteAlpha.900" textAlign="center">
                  Choose your theme to get started
                </Text>
              </VStack>
              
              {/* Theme Selection */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="100%">
                {/* Pusheen Theme */}
                <Box
                  bg="white"
                  borderRadius="3xl"
                  p={8}
                  cursor="pointer"
                  transition="all 0.3s"
                  boxShadow="xl"
                  _hover={{
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '2xl',
                  }}
                  onClick={() => setSelectedTheme('pusheen')}
                >
                  <VStack spacing={6}>
                    <Box
                      w="120px"
                      h="120px"
                      borderRadius="2xl"
                      bg={CHILD_THEMES.pusheen.colors.background}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      boxShadow="md"
                    >
                      <Image 
                        src={CHILD_THEMES.pusheen.icon} 
                        alt="Pusheen"
                        w="80px"
                        h="80px"
                      />
                    </Box>
                    <VStack spacing={2}>
                      <Heading size="lg" color={CHILD_THEMES.pusheen.colors.primary}>
                        {CHILD_THEMES.pusheen.emoji} Pusheen
                      </Heading>
                      <Text color="gray.600" textAlign="center">
                        Cute and cozy!
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="pink"
                      size="lg"
                      w="100%"
                      borderRadius="xl"
                    >
                      Choose Pusheen
                    </Button>
                  </VStack>
                </Box>

                {/* Minecraft Theme */}
                <Box
                  bg="white"
                  borderRadius="3xl"
                  p={8}
                  cursor="pointer"
                  transition="all 0.3s"
                  boxShadow="xl"
                  _hover={{
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '2xl',
                  }}
                  onClick={() => setSelectedTheme('minecraft')}
                >
                  <VStack spacing={6}>
                    <Box
                      w="120px"
                      h="120px"
                      borderRadius="2xl"
                      bg={CHILD_THEMES.minecraft.colors.background}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      boxShadow="md"
                    >
                      <Image 
                        src={CHILD_THEMES.minecraft.icon} 
                        alt="Minecraft"
                        w="80px"
                        h="80px"
                      />
                    </Box>
                    <VStack spacing={2}>
                      <Heading size="lg" color={CHILD_THEMES.minecraft.colors.primary}>
                        {CHILD_THEMES.minecraft.emoji} Minecraft
                      </Heading>
                      <Text color="gray.600" textAlign="center">
                        Adventure awaits!
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="green"
                      size="lg"
                      w="100%"
                      borderRadius="xl"
                    >
                      Choose Minecraft
                    </Button>
                  </VStack>
                </Box>
              </SimpleGrid>
            </VStack>
          </Container>

          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            @keyframes wave {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(20deg); }
              75% { transform: rotate(-20deg); }
            }
          `}</style>
        </Box>
      </>
    );
  }

  // Login screen with selected theme
  if (!currentTheme) return null;
  
  return (
    <>
      <Head>
        <title>Sign In | AI Homelab</title>
      </Head>
      
      <Box 
        minH="100vh" 
        bg={currentTheme.colors.background}
        backgroundImage={currentTheme.pattern}
        backgroundSize="200px"
        py={12}
        position="relative"
      >
        <Container maxW="md">
          <VStack spacing={8}>
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={() => setSelectedTheme(null)}
              alignSelf="flex-start"
              size="lg"
              leftIcon={<Text fontSize="xl">👈</Text>}
            >
              Choose Different Theme
            </Button>

            {/* Logo/Brand */}
            <VStack spacing={4}>
              <Box
                w="100px"
                h="100px"
                borderRadius="2xl"
                bg="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="xl"
                border="4px solid"
                borderColor={currentTheme.colors.secondary}
              >
                <Image 
                  src={currentTheme.icon} 
                  alt={currentTheme.name}
                  w="70px"
                  h="70px"
                />
              </Box>
              <Heading 
                size="xl" 
                color={currentTheme.colors.primary}
                textAlign="center"
              >
                {currentTheme.emoji} Welcome Back!
              </Heading>
              <Text color="gray.600" fontSize="lg" textAlign="center">
                Sign in to continue your adventure
              </Text>
            </VStack>
            
            {/* Sign In Card */}
            <Box
              bg={currentTheme.colors.cardBg}
              backdropFilter="blur(10px)"
              borderRadius="3xl"
              p={8}
              w="100%"
              boxShadow="2xl"
              border="3px solid"
              borderColor={currentTheme.colors.secondary}
            >
              <VStack spacing={6}>
                {/* Error Alert */}
                {(error || localError) && (
                  <Alert 
                    status="warning" 
                    borderRadius="xl"
                    bg="orange.100"
                    border="2px solid"
                    borderColor="orange.300"
                  >
                    <AlertIcon />
                    <Text fontWeight="600">
                      {localError || 'Oops! Something went wrong 😅'}
                    </Text>
                  </Alert>
                )}
                
                {/* Credentials Form */}
                <form onSubmit={handleCredentialsSignIn} style={{ width: '100%' }}>
                  <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
                  
                  <VStack spacing={5}>
                    <FormControl>
                      <FormLabel fontSize="lg" fontWeight="600" color={currentTheme.colors.primary}>
                        📧 Your Email
                      </FormLabel>
                      <Input
                        type="email"
                        placeholder="your.name@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        size="lg"
                        borderRadius="xl"
                        borderWidth="2px"
                        borderColor={currentTheme.colors.secondary}
                        _focus={{
                          borderColor: currentTheme.colors.primary,
                          boxShadow: `0 0 0 1px ${currentTheme.colors.primary}`,
                        }}
                        fontSize="md"
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel fontSize="lg" fontWeight="600" color={currentTheme.colors.primary}>
                        🔒 Your Password
                      </FormLabel>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        size="lg"
                        borderRadius="xl"
                        borderWidth="2px"
                        borderColor={currentTheme.colors.secondary}
                        _focus={{
                          borderColor: currentTheme.colors.primary,
                          boxShadow: `0 0 0 1px ${currentTheme.colors.primary}`,
                        }}
                        fontSize="md"
                      />
                    </FormControl>
                    
                    <Button
                      type="submit"
                      bg={currentTheme.colors.primary}
                      color="white"
                      size="lg"
                      w="100%"
                      isLoading={isLoading}
                      borderRadius="xl"
                      fontSize="xl"
                      h="60px"
                      _hover={{
                        transform: 'scale(1.05)',
                        boxShadow: 'xl',
                      }}
                      _active={{
                        transform: 'scale(0.98)',
                      }}
                      transition="all 0.2s"
                      leftIcon={<Text fontSize="2xl">🚀</Text>}
                    >
                      Let's Go!
                    </Button>
                  </VStack>
                </form>
                
                {/* Help Text */}
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Need help? Ask a parent or guardian! 👨‍👩‍👧‍👦
                </Text>
              </VStack>
            </Box>
            
            {/* Footer */}
            <HStack spacing={2} fontSize="2xl">
              <Text>✨</Text>
              <Text>🎮</Text>
              <Text>📚</Text>
              <Text>🎨</Text>
              <Text>🌟</Text>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const csrfToken = await getCsrfToken(context);
  
  return {
    props: {
      csrfToken: csrfToken ?? null,
    },
  };
};

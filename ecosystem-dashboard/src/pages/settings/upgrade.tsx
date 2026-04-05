/**
 * Subscription Upgrade Page
 * 
 * Allows users to view plans and upgrade their subscription
 * Uses simulated payment processing for development
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Badge,
  List,
  ListItem,
  ListIcon,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Divider,
  Icon,
  Switch,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FiCheck, 
  FiCreditCard, 
  FiShield, 
  FiZap,
  FiHardDrive,
  FiImage,
  FiStar,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRouter } from 'next/router';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  storage: {
    bytes: number | null;
    formatted: string;
  };
  limits: {
    images: number | null;
    dailyGenerations: number | null;
    monthlyGenerations: number | null;
  };
  pricing: {
    monthly: { cents: number; formatted: string };
    yearly: { cents: number; formatted: string; monthlyEquivalent: string; savings: number };
  };
  features: Record<string, boolean>;
  isFree: boolean;
}

interface CurrentQuota {
  plan: { name: string; displayName: string };
  storage: { usedPercent: number; usedFormatted: string };
}

export default function UpgradePage() {
  const router = useRouter();
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const cardBg = useColorModeValue('white', 'gray.800');
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentQuota, setCurrentQuota] = useState<CurrentQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, quotaRes] = await Promise.all([
        fetch('/api/subscription/plans'),
        fetch('/api/user/quota'),
      ]);
      
      const plansData = await plansRes.json();
      const quotaData = await quotaRes.json();
      
      if (plansRes.ok) setPlans(plansData.plans || []);
      if (quotaRes.ok) setCurrentQuota(quotaData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = (plan: Plan) => {
    setSelectedPlan(plan);
    onOpen();
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setProcessing(true);
    try {
      // Extract last 4 digits from card number
      const cardLastFour = cardNumber.replace(/\s/g, '').slice(-4);
      
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          billing_cycle: isYearly ? 'yearly' : 'monthly',
          card_last_four: cardLastFour,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({
          title: '🎉 Upgrade Successful!',
          description: data.message,
          status: 'success',
          duration: 5000,
        });
        onClose();
        // Redirect to dashboard or refresh
        router.push('/dashboard');
      } else {
        throw new Error(data.message || data.error || 'Upgrade failed');
      }
    } catch (error: any) {
      toast({
        title: 'Upgrade Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const isCurrentPlan = (plan: Plan) => {
    return currentQuota?.plan?.name === plan.name;
  };

  const canUpgrade = (plan: Plan) => {
    if (!currentQuota) return true;
    const currentPlan = plans.find(p => p.name === currentQuota.plan.name);
    if (!currentPlan) return true;
    return plan.pricing.monthly.cents > currentPlan.pricing.monthly.cents;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center" py={20}>
            <Spinner size="xl" />
            <Text mt={4}>Loading plans...</Text>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading size="xl" mb={2}>Upgrade Your Plan</Heading>
            <Text color={textSecondary} fontSize="lg">
              Get more storage, more generations, and unlock premium features
            </Text>
            
            {/* Development Notice */}
            <Alert status="info" mt={4} borderRadius="md" maxW="600px" mx="auto">
              <AlertIcon />
              <Text fontSize="sm">
                <strong>Development Mode:</strong> Payments are simulated. Use card 4242 4242 4242 4242 for success, or 0000 0000 0000 0002 to test decline.
              </Text>
            </Alert>
          </Box>

          {/* Billing Toggle */}
          <HStack justify="center" spacing={4}>
            <Text fontWeight={!isYearly ? 'bold' : 'normal'}>Monthly</Text>
            <Switch
              size="lg"
              isChecked={isYearly}
              onChange={(e) => setIsYearly(e.target.checked)}
              colorScheme="blue"
            />
            <HStack>
              <Text fontWeight={isYearly ? 'bold' : 'normal'}>Yearly</Text>
              <Badge colorScheme="green">Save up to 17%</Badge>
            </HStack>
          </HStack>

          {/* Plans Grid */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan);
              const canUpgradeTo = canUpgrade(plan);
              const isPopular = plan.name === 'standard';
              
              return (
                <GlassPanel
                  key={plan.id}
                  p={6}
                  position="relative"
                  borderWidth={isPopular ? '2px' : '1px'}
                  borderColor={isPopular ? 'blue.500' : 'transparent'}
                  bg={isCurrent ? highlightBg : cardBg}
                >
                  {isPopular && (
                    <Badge
                      position="absolute"
                      top="-12px"
                      left="50%"
                      transform="translateX(-50%)"
                      colorScheme="blue"
                      px={3}
                      py={1}
                    >
                      Most Popular
                    </Badge>
                  )}

                  <VStack spacing={4} align="stretch">
                    {/* Plan Name */}
                    <Box textAlign="center">
                      <Heading size="md">{plan.displayName}</Heading>
                      <Text fontSize="sm" color={textSecondary}>
                        {plan.description}
                      </Text>
                    </Box>

                    {/* Price */}
                    <Box textAlign="center" py={4}>
                      {plan.isFree ? (
                        <Text fontSize="4xl" fontWeight="bold">Free</Text>
                      ) : (
                        <>
                          <HStack justify="center" align="baseline">
                            <Text fontSize="4xl" fontWeight="bold">
                              {isYearly ? plan.pricing.yearly.monthlyEquivalent : plan.pricing.monthly.formatted}
                            </Text>
                            <Text color={textSecondary}>/mo</Text>
                          </HStack>
                          {isYearly && plan.pricing.yearly.savings > 0 && (
                            <Text fontSize="sm" color="green.500">
                              Save {plan.pricing.yearly.savings}% with yearly billing
                            </Text>
                          )}
                        </>
                      )}
                    </Box>

                    <Divider />

                    {/* Features */}
                    <List spacing={2}>
                      <ListItem>
                        <ListIcon as={FiHardDrive} color="blue.500" />
                        {plan.storage.formatted} storage
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiImage} color="blue.500" />
                        {plan.limits.images || 'Unlimited'} images
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiZap} color="blue.500" />
                        {plan.limits.dailyGenerations || 'Unlimited'} generations/day
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheck} color="green.500" />
                        {plan.limits.monthlyGenerations || 'Unlimited'} generations/month
                      </ListItem>
                      {plan.features.sharing && (
                        <ListItem>
                          <ListIcon as={FiCheck} color="green.500" />
                          Family sharing
                        </ListItem>
                      )}
                      {plan.features.priority_generation && (
                        <ListItem>
                          <ListIcon as={FiStar} color="yellow.500" />
                          Priority generation
                        </ListItem>
                      )}
                      {plan.features.hd_images && (
                        <ListItem>
                          <ListIcon as={FiStar} color="yellow.500" />
                          HD image quality
                        </ListItem>
                      )}
                    </List>

                    {/* Action Button */}
                    <Box pt={4}>
                      {isCurrent ? (
                        <Button w="100%" isDisabled variant="outline">
                          Current Plan
                        </Button>
                      ) : canUpgradeTo ? (
                        <Button
                          w="100%"
                          colorScheme={isPopular ? 'blue' : 'gray'}
                          onClick={() => openCheckout(plan)}
                        >
                          {plan.isFree ? 'Downgrade' : 'Upgrade'}
                        </Button>
                      ) : (
                        <Button w="100%" isDisabled variant="outline">
                          Contact Support
                        </Button>
                      )}
                    </Box>
                  </VStack>
                </GlassPanel>
              );
            })}
          </SimpleGrid>

          {/* Security Notice */}
          <HStack justify="center" spacing={2} color={textSecondary}>
            <Icon as={FiShield} />
            <Text fontSize="sm">
              Secure payment processing. Cancel anytime.
            </Text>
          </HStack>
        </VStack>

        {/* Checkout Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiCreditCard} />
                <Text>Complete Your Upgrade</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                {/* Order Summary */}
                <Box w="100%" p={4} bg="gray.50" borderRadius="md">
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold">{selectedPlan?.displayName}</Text>
                    <Text fontWeight="bold">
                      {isYearly 
                        ? selectedPlan?.pricing.yearly.formatted 
                        : selectedPlan?.pricing.monthly.formatted}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textSecondary}>
                    {isYearly ? 'Billed annually' : 'Billed monthly'}
                  </Text>
                </Box>

                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">
                    <strong>Test Mode:</strong> No real charges will be made.
                  </Text>
                </Alert>

                {/* Card Form */}
                <FormControl>
                  <FormLabel>Card Number</FormLabel>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                  />
                </FormControl>

                <HStack w="100%">
                  <FormControl>
                    <FormLabel>Expiry</FormLabel>
                    <Input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>CVC</FormLabel>
                    <Input
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      type="password"
                    />
                  </FormControl>
                </HStack>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleUpgrade}
                isLoading={processing}
                loadingText="Processing..."
              >
                Pay {isYearly 
                  ? selectedPlan?.pricing.yearly.formatted 
                  : selectedPlan?.pricing.monthly.formatted}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}

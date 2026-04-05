import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Card,
  CardBody
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectOnboardingWizard from '@/components/onboarding/ProjectOnboardingWizard';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const OnboardingPage: NextPage = () => {
  const router = useRouter();
  const toast = useToast();

  const handleOnboardingComplete = (projectId: string) => {
    toast({
      title: 'Onboarding completed',
      description: `Project has been successfully onboarded to the AI Homelab Ecosystem.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    // Navigate to the project details page
    router.push(`/ecosystem/projects/${projectId}`);
  };

  return (
    <DashboardLayout>
      <Box p={4}>
        <Breadcrumb separator={<ChevronRightIcon color={useSemanticToken('text.secondary')} />} mb={6}>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ecosystem">Ecosystem</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ecosystem/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Onboarding</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <Container maxW="container.xl" p={0}>
          <Box mb={8}>
            <Heading size="lg" mb={2}>Project Onboarding</Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Onboard your project to the AI Homelab Ecosystem by following the guided steps.
              This process will register your project, configure services, and set up documentation.
            </Text>
          </Box>

          <Card variant="outline" mb={8}>
            <CardBody>
              <ProjectOnboardingWizard onComplete={handleOnboardingComplete} />
            </CardBody>
          </Card>
        </Container>
      </Box>
    </DashboardLayout>
  );
};

// Add getLayout property for the Next.js layout system
type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode
};

(OnboardingPage as PageWithLayout).getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default OnboardingPage;

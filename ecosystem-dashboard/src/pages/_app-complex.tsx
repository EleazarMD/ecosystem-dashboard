import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ChakraProvider } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ProgressProvider } from '@/context/ProgressContext';
import { SystemStatusProvider } from '@/context/SystemStatusContext';
import { ServiceStatusProvider } from '@/context/ServiceStatusContext';
import { ActivityFeedProvider } from '@/context/ActivityFeedContext';
import { AgenticCommandProvider } from '@/context/AgenticCommandContext';
import { PredictiveActionsProvider } from '@/context/PredictiveActionsContext';
import { ExplainabilityProvider } from '@/context/ExplainabilityContext';
import bridgedTheme from '@/styles/ThemeBridge';
import muiTheme from '@/styles/muiTheme';
import '@/styles/globals.css';

import { AuthProvider } from '@/context/AuthContext';
import { AHISClientProvider } from '@/lib/ahis-client-provider';
import { AgentRegistryProvider } from '@/context/AgentRegistryContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { initializeKGGateway } from '@/lib/kg-gateway-initializer';
import logger from '@/lib/logger';

interface MyAppProps extends AppProps {}

function MyApp(props: MyAppProps) {
  const { Component, pageProps } = props;
  
  // Initialize Knowledge Graph Gateway
  useEffect(() => {
    // Log initialization
    logger.info('[Dashboard] Initializing Knowledge Graph Gateway');
    
    // Initialize KG Gateway
    initializeKGGateway()
      .then(() => {
        logger.info('[Dashboard] Knowledge Graph Gateway initialization complete');
      })
      .catch((error) => {
        logger.error(`[Dashboard] Knowledge Graph Gateway initialization failed: ${error.message}`);
      });
  }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ChakraProvider theme={bridgedTheme} resetCSS={false}>
        <Head>
          <title>AI Homelab Ecosystem Dashboard</title>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <meta name="description" content="Dashboard for the AI Homelab Ecosystem" />
        </Head>
        <AuthProvider>
          <AHISClientProvider>
            <AgentRegistryProvider>
              <ProgressProvider>
                <SystemStatusProvider>
                  <ServiceStatusProvider>
                    <ActivityFeedProvider>
                      <AgenticCommandProvider>
                        <PredictiveActionsProvider>
                          <ExplainabilityProvider>
                            <Component {...pageProps} />
                          </ExplainabilityProvider>
                        </PredictiveActionsProvider>
                      </AgenticCommandProvider>
                    </ActivityFeedProvider>
                  </ServiceStatusProvider>
                </SystemStatusProvider>
              </ProgressProvider>
            </AgentRegistryProvider>
          </AHISClientProvider>
        </AuthProvider>
      </ChakraProvider>
    </ThemeProvider>
  );
}

export default MyApp;

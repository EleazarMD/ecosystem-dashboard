import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';

// Context Providers
import { ProgressProvider } from '@/context/ProgressContext';
import { SystemStatusProvider } from '@/context/SystemStatusContext';
import { ServiceStatusProvider } from '@/context/ServiceStatusContext';
import { ActivityFeedProvider } from '@/context/ActivityFeedContext';
import { AgenticCommandProvider } from '@/context/AgenticCommandContext';
import { PredictiveActionsProvider } from '@/context/PredictiveActionsContext';
import { ExplainabilityProvider } from '@/context/ExplainabilityContext';
import { AuthProvider } from '@/context/AuthContext';
import { AIGatewayClientProvider } from '@/lib/ai-gateway-client-provider';
import { AgentRegistryProvider } from '@/context/AgentRegistryContext';
import { RightSidebarProvider } from '@/contexts/RightSidebarContext';
import { RightPanelProvider } from '@/contexts/RightPanelContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { AIContextProvider } from '@/contexts/AIContextManager';
import { ViewContextProvider } from '@/contexts/ViewContextManager';
import { DashboardThemeProvider } from '@/theme/ThemeProvider';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

// Theme and Styles
import muiTheme from '@/styles/muiTheme';
import '@/styles/globals.css';

// Utils
import { initializeKGGateway } from '@/lib/kg-gateway-initializer';
import logger from '@/lib/logger';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname || '';
  const isPublicRoute = pathname === '/landing' || pathname === '/login' || pathname.startsWith('/auth');

  // Initialize Knowledge Graph Gateway
  useEffect(() => {
    if (isPublicRoute) {
      return;
    }

    logger.info('[Dashboard] Initializing Knowledge Graph Gateway');
    initializeKGGateway()
      .then(() => {
        logger.info('[Dashboard] Knowledge Graph Gateway initialization complete');
      })
      .catch((error) => {
        logger.error(`[Dashboard] Knowledge Graph Gateway initialization failed: ${error?.message || error}`);
      });
  }, [isPublicRoute]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
        <Head>
          <title>AI Homelab Ecosystem Dashboard</title>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <meta name="description" content="Dashboard for the AI Homelab Ecosystem" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <SessionProvider session={pageProps.session}>
          <FeatureFlagsProvider>
            <DashboardThemeProvider>
              {isPublicRoute ? (
                <AuthProvider>
                  <Component {...pageProps} />
                </AuthProvider>
              ) : (
                <AuthProvider>
                  <AIGatewayClientProvider>
                    <AgentRegistryProvider>
                      <AIContextProvider>
                        <SidebarProvider>
                          <RightSidebarProvider>
                            <ViewContextProvider>
                              <RightPanelProvider>
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
                              </RightPanelProvider>
                            </ViewContextProvider>
                          </RightSidebarProvider>
                        </SidebarProvider>
                      </AIContextProvider>
                    </AgentRegistryProvider>
                  </AIGatewayClientProvider>
                </AuthProvider>
              )}
            </DashboardThemeProvider>
          </FeatureFlagsProvider>
        </SessionProvider>
    </ThemeProvider>
  );
}

export default MyApp;

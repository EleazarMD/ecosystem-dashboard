/**
 * AgentBrowserViewer — Multi-tenant noVNC component
 *
 * Embeds the noVNC iframe for supervising the OpenClaw agent's browser.
 * Uses /api/openclaw/browser-session to:
 *  1. Verify the user has tenant-level permission to view
 *  2. Resolve the correct noVNC origin (Cloudflare / Tailscale / localhost)
 *  3. Determine interact vs view-only mode
 *  4. Audit-log every access
 *
 * Rendering modes:
 *  - "interact"  → full noVNC (keyboard + mouse forwarded to the VNC session)
 *  - "view-only" → noVNC with ?view_only=true (observe only)
 *  - "denied"    → permission error banner
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  Link,
} from '@chakra-ui/react';
import { FiRefreshCw, FiExternalLink, FiEye, FiMousePointer, FiGlobe } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useTenantHeaders } from '@/hooks/useTenantContext';

interface BrowserSessionData {
  allowed: boolean;
  mode: 'interact' | 'view-only';
  vncUrl: string | null;
  vncOrigin: string | null;
  agentUrl: string | null;
  noVncReachable: boolean;
  tenant: { id: string; name: string } | null;
  user: { id: string; name: string; role: string } | null;
  error?: string;
}

interface AgentBrowserViewerProps {
  /** Override height of the iframe container (default 600px) */
  height?: string;
  /** If true, hide the toolbar header */
  minimal?: boolean;
}

export default function AgentBrowserViewer({ height = '600px', minimal = false }: AgentBrowserViewerProps) {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const border = useSemanticToken('border.subtle');
  const tenantHeaders = useTenantHeaders();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<BrowserSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Fetch browser session from tenant-aware API
  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/openclaw/browser-session', {
        headers: { ...tenantHeaders },
      });
      const data: BrowserSessionData = await res.json();
      setSession(data);
    } catch (err) {
      setSession({
        allowed: false,
        mode: 'view-only',
        vncUrl: null,
        vncOrigin: null,
        agentUrl: null,
        noVncReachable: false,
        tenant: null,
        user: null,
        error: 'Failed to connect to dashboard API',
      });
    } finally {
      setLoading(false);
    }
  }, [tenantHeaders]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Reload the iframe
  const handleReload = useCallback(() => {
    setIframeStatus('loading');
    if (iframeRef.current && session?.vncUrl) {
      iframeRef.current.src = session.vncUrl;
    }
  }, [session]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <VStack spacing={4} py={12} align="center">
        <Spinner size="lg" color="blue.400" />
        <Text fontSize="sm" color={textSecondary}>Verifying browser access…</Text>
      </VStack>
    );
  }

  // ── Not allowed ─────────────────────────────────────────────────────────────
  if (!session?.allowed) {
    return (
      <Alert status="warning" borderRadius="lg">
        <AlertIcon />
        <VStack align="start" spacing={0}>
          <Text fontWeight="600">Access Denied</Text>
          <Text fontSize="sm">{session?.error || 'You do not have permission to view the agent browser in this tenant.'}</Text>
        </VStack>
      </Alert>
    );
  }

  // ── noVNC unreachable ───────────────────────────────────────────────────────
  if (!session.noVncReachable || !session.vncUrl) {
    return (
      <Alert status="info" borderRadius="lg">
        <AlertIcon />
        <VStack align="start" spacing={0}>
          <Text fontWeight="600">Agent Browser Offline</Text>
          <Text fontSize="sm">The noVNC service is not currently reachable. The agent may not be running a browser session.</Text>
          <Button size="xs" mt={2} leftIcon={<FiRefreshCw />} onClick={fetchSession}>
            Retry
          </Button>
        </VStack>
      </Alert>
    );
  }

  // ── Connected — render noVNC iframe ─────────────────────────────────────────
  const isViewOnly = session.mode === 'view-only';
  const ModeIcon = isViewOnly ? FiEye : FiMousePointer;
  const modeLabel = isViewOnly ? 'View Only' : 'Interactive';
  const modeColor = isViewOnly ? 'yellow' : 'green';

  return (
    <VStack align="stretch" spacing={3}>
      {!minimal && (
        <>
          <HStack justify="space-between" wrap="wrap" gap={2}>
            <HStack spacing={2}>
              <Text fontWeight="600" color={textPrimary}>Agent Browser View</Text>
              <Badge colorScheme={iframeStatus === 'ready' ? 'green' : iframeStatus === 'loading' ? 'yellow' : 'red'} fontSize="xs">
                {iframeStatus === 'ready' ? 'Connected' : iframeStatus === 'loading' ? 'Loading…' : 'Unavailable'}
              </Badge>
              <Tooltip label={isViewOnly ? 'You can observe but not control the browser (tenant member)' : 'Full keyboard + mouse control (tenant admin)'}>
                <Badge colorScheme={modeColor} fontSize="xs" variant="subtle">
                  <HStack spacing={1}>
                    <ModeIcon size={10} />
                    <Text>{modeLabel}</Text>
                  </HStack>
                </Badge>
              </Tooltip>
            </HStack>
            <HStack spacing={2}>
              {session.agentUrl && (
                <Tooltip label={session.agentUrl}>
                  <Badge fontSize="2xs" variant="outline" colorScheme="blue" maxW="200px" isTruncated>
                    <HStack spacing={1}>
                      <FiGlobe size={9} />
                      <Text isTruncated>{new URL(session.agentUrl).hostname}</Text>
                    </HStack>
                  </Badge>
                </Tooltip>
              )}
              <Button size="xs" leftIcon={<FiRefreshCw />} onClick={handleReload}>
                Reload
              </Button>
              <Button
                size="xs"
                leftIcon={<FiExternalLink />}
                as="a"
                href={session.vncOrigin || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Tab
              </Button>
            </HStack>
          </HStack>
          <Text fontSize="xs" color={textSecondary}>
            Live view of the OpenClaw agent&apos;s browser.
            {session.tenant && <> Tenant: <strong>{session.tenant.name}</strong>.</>}
            {' '}{isViewOnly ? 'View-only mode — contact a tenant admin for interactive access.' : 'You have full interactive control.'}
          </Text>
        </>
      )}

      <Box
        border="1px solid"
        borderColor={border}
        borderRadius="lg"
        overflow="hidden"
        position="relative"
        h={height}
      >
        <iframe
          ref={iframeRef}
          src={session.vncUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setIframeStatus('ready')}
          onError={() => setIframeStatus('error')}
          allow="clipboard-read; clipboard-write"
        />
        {iframeStatus === 'error' && (
          <VStack
            position="absolute"
            inset={0}
            bg="blackAlpha.700"
            justify="center"
            spacing={3}
          >
            <Text color="white" fontWeight="600">Connection Lost</Text>
            <Button size="sm" colorScheme="blue" onClick={handleReload}>
              Reconnect
            </Button>
          </VStack>
        )}
      </Box>
    </VStack>
  );
}

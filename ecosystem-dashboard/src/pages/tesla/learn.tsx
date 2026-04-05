/**
 * Tesla Learn Page - YouTube learning optimized for in-vehicle use
 * Theme-aware (light/dark) matching Tesla dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Input, InputGroup,
  InputLeftElement, AspectRatio, Spinner, Image, SimpleGrid,
} from '@chakra-ui/react';
import { ArrowLeft, Search, Play, Youtube, Grid, Clock, X, Library, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Video { id: string; title: string; thumbnail: string; channel: string; }
interface Channel { id: string; title: string; thumbnail: string; }

type ViewMode = 'channels' | 'collections' | 'channel-videos' | 'recent' | 'search';

// Curated collections - educational YouTube channels (free content)
// Channel IDs will be resolved dynamically via API on first load
const COLLECTION_HANDLES = [
  { handle: '@thegreatcourses-collection', title: 'The Great Courses Collection' },
];

export default function TeslaLearn() {
  const router = useRouter();
  
  // Theme tokens - matches Tesla dashboard
  const bgBase = useSemanticToken('surface.base');
  const bgCard = useSemanticToken('surface.elevated');
  const bgHover = useSemanticToken('surface.hover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const accentColor = useSemanticToken('interactive.primary');
  
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  const [subscriptions, setSubscriptions] = useState<Channel[]>([]);
  const [collections, setCollections] = useState<Channel[]>([]);
  const [channelVideos, setChannelVideos] = useState<Video[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  const handleUnsubscribe = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (unsubscribing) return;
    setUnsubscribing(channelId);
    try {
      const res = await fetch(`/api/youtube/channel/${channelId}/unsubscribe`, { method: 'POST' });
      const data = await res.json();
      console.log('[Learn] Unsubscribe response:', res.status, data);
      if (res.ok) {
        setSubscriptions(prev => prev.filter(c => c.id !== channelId));
        // Go back to channels view after unsubscribing
        setViewMode('channels');
        setSelectedChannel(null);
        setChannelVideos([]);
      } else if (data.needsReauth) {
        // Token has old read-only scope, need to re-authenticate
        if (confirm('Need to re-authenticate with YouTube to allow unsubscribing. Sign out now?')) {
          await fetch('/api/youtube/auth/logout', { method: 'POST' });
          setIsAuthenticated(false);
        }
      } else {
        console.error('[Learn] Unsubscribe failed:', data);
        alert(data.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      console.error('[Learn] Unsubscribe error:', err);
    }
    setUnsubscribing(null);
  };

  useEffect(() => {
    fetch('/api/youtube/auth/status').then(r => r.json()).then(d => {
      setIsAuthenticated(d.authenticated);
      if (d.authenticated) {
        loadContent();
        loadCollections();
      }
    }).catch(() => {});
    
    // Check for video ID in URL (from Nova youtube tool)
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('video');
    if (videoId) {
      setCurrentVideo(videoId);
      setCurrentVideoTitle('Playing from Nova');
    }
  }, []);

  const loadCollections = async () => {
    const resolved: Channel[] = [];
    for (const col of COLLECTION_HANDLES) {
      try {
        const res = await fetch(`/api/youtube/channel/resolve?q=${encodeURIComponent(col.handle)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.channel) {
            resolved.push(data.channel);
          }
        }
      } catch {}
    }
    setCollections(resolved);
  };

  const loadContent = async () => {
    setIsLoading(true);
    const [subs, history] = await Promise.all([
      fetch('/api/youtube/subscriptions').then(r => r.ok ? r.json() : { channels: [] }),
      fetch('/api/youtube/history').then(r => r.ok ? r.json() : { videos: [] }),
    ]);
    setSubscriptions(subs.channels || []);
    setRecentVideos(history.videos || []);
    setIsLoading(false);
  };

  const loadChannelVideos = async (channel: Channel) => {
    setSelectedChannel(channel);
    setViewMode('channel-videos');
    setIsLoading(true);
    const res = await fetch(`/api/youtube/channel/${channel.id}`);
    if (res.ok) {
      const data = await res.json();
      setChannelVideos(data.videos || []);
    }
    setIsLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    
    // If in channel view, search within that channel; otherwise wide YouTube search
    if (viewMode === 'channel-videos' && selectedChannel) {
      const res = await fetch(`/api/youtube/channel/${selectedChannel.id}/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setChannelVideos(data.videos || []);
      }
    } else {
      setViewMode('search');
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.videos || []);
      }
    }
    setIsLoading(false);
    setShowSearch(false);
  };

  const goBack = () => {
    if (currentVideo) {
      setCurrentVideo(null);
      setCurrentVideoTitle('');
    } else if (viewMode === 'search') {
      setViewMode('channels');
      setSearchQuery('');
    } else if (viewMode === 'channel-videos') {
      setViewMode('channels');
      setSelectedChannel(null);
      setSearchQuery('');
    } else {
      window.location.href = '/tesla';
    }
  };

  // Video playback - redirect to static HTML player for Tesla performance
  // This bypasses React entirely, reducing memory pressure on Tesla's browser
  useEffect(() => {
    if (currentVideo) {
      // Use static HTML player to avoid React overhead during video playback
      const videoUrl = `/tesla-video.html?v=${currentVideo}&title=${encodeURIComponent(currentVideoTitle)}`;
      window.location.href = videoUrl;
    }
  }, [currentVideo, currentVideoTitle]);

  return (
    <Box minH="100vh" bg={bgBase} p={4} color={textPrimary}>
      <VStack spacing={4} maxW="1400px" mx="auto">
        {/* Header */}
        <HStack w="100%" justify="space-between">
          <HStack spacing={3}>
            <Box as="button" display="flex" alignItems="center" gap={2} px={4} h="44px"
              bg={bgCard} borderRadius="full" onClick={goBack} _hover={{ bg: bgHover }}>
              <ArrowLeft size={18} />
              <Text fontSize="sm">{viewMode === 'channels' ? 'Tesla' : 'Back'}</Text>
            </Box>
            <HStack spacing={2}>
              <Youtube size={24} color="#f00" />
              <Text fontSize="xl" fontWeight="semibold">
                {viewMode === 'channel-videos' && selectedChannel ? selectedChannel.title : 'Learn'}
              </Text>
              {viewMode === 'channel-videos' && selectedChannel && (
                <Box as="button" px={3} py={1} bg="red.500" color="white" borderRadius="full" fontSize="xs"
                  onClick={(e: React.MouseEvent) => handleUnsubscribe(selectedChannel.id, e)}
                  _hover={{ bg: 'red.600' }} ml={2}>
                  {unsubscribing === selectedChannel.id ? <Spinner size="xs" /> : 'Unsubscribe'}
                </Box>
              )}
            </HStack>
          </HStack>
          <Box as="button" w="44px" h="44px" bg={bgCard} borderRadius="full" display="flex"
            alignItems="center" justifyContent="center" onClick={() => setShowSearch(!showSearch)} _hover={{ bg: bgHover }}>
            {showSearch ? <X size={20} /> : <Search size={20} />}
          </Box>
        </HStack>

        {/* Search */}
        {showSearch && (
          <InputGroup size="lg">
            <InputLeftElement h="48px"><Search size={20} color={textSecondary} /></InputLeftElement>
            <Input placeholder={viewMode === 'channel-videos' && selectedChannel ? `Search ${selectedChannel.title}...` : 'Search YouTube...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()} bg={bgCard} border="1px solid" borderColor={borderColor}
              borderRadius="full" h="48px" pl={12} color={textPrimary} _placeholder={{ color: textSecondary }}
              _focus={{ boxShadow: `0 0 0 1px ${accentColor}` }} autoFocus />
          </InputGroup>
        )}

        {/* Auth */}
        {!isAuthenticated ? (
          <VStack py={16} spacing={4} bg={bgCard} borderRadius="2xl" w="100%">
            <Youtube size={64} color="#f00" />
            <Text fontSize="xl" fontWeight="semibold">Connect YouTube</Text>
            <Text color={textSecondary}>Access your subscriptions</Text>
            <Box as="button" px={6} py={3} bg={accentColor} color="white" borderRadius="full" fontWeight="medium"
              onClick={() => window.location.href = '/api/youtube/auth/login'} _hover={{ opacity: 0.9 }}>
              Sign In with Google
            </Box>
          </VStack>
        ) : (
          <>
            {/* Nav pills */}
            {viewMode !== 'channel-videos' && (
              <HStack spacing={2} w="100%" justify="space-between">
                <HStack spacing={2}>
                  <Box as="button" px={4} py={2} bg={viewMode === 'channels' ? accentColor : bgCard} color={viewMode === 'channels' ? 'white' : textPrimary}
                    borderRadius="full" fontSize="sm" onClick={() => setViewMode('channels')} _hover={{ bg: viewMode === 'channels' ? accentColor : bgHover }}>
                    <HStack spacing={2}><Grid size={14} /><Text>Channels</Text></HStack>
                  </Box>
                  <Box as="button" px={4} py={2} bg={viewMode === 'collections' ? accentColor : bgCard} color={viewMode === 'collections' ? 'white' : textPrimary}
                    borderRadius="full" fontSize="sm" onClick={() => setViewMode('collections')} _hover={{ bg: viewMode === 'collections' ? accentColor : bgHover }}>
                    <HStack spacing={2}><Library size={14} /><Text>Collections</Text></HStack>
                  </Box>
                  <Box as="button" px={4} py={2} bg={viewMode === 'recent' ? accentColor : bgCard} color={viewMode === 'recent' ? 'white' : textPrimary}
                    borderRadius="full" fontSize="sm" onClick={() => setViewMode('recent')} _hover={{ bg: viewMode === 'recent' ? accentColor : bgHover }}>
                    <HStack spacing={2}><Clock size={14} /><Text>Recent</Text></HStack>
                  </Box>
                </HStack>
                <Box as="button" px={3} py={2} bg={bgCard} borderRadius="full" fontSize="sm"
                  onClick={async () => {
                    await fetch('/api/youtube/auth/logout', { method: 'POST' });
                    setIsAuthenticated(false);
                  }}
                  _hover={{ bg: bgHover }}>
                  <Text color={textSecondary}>Sign Out</Text>
                </Box>
              </HStack>
            )}

            {/* Content */}
            {isLoading ? (
              <VStack py={16}><Spinner color={accentColor} size="lg" /><Text color={textSecondary}>Loading...</Text></VStack>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} w="100%">
                {(viewMode === 'channels' ? subscriptions : viewMode === 'collections' ? collections : []).map(c => (
                  <Box key={c.id} bg={bgCard} borderRadius="xl" p={3} cursor="pointer"
                    onClick={() => loadChannelVideos(c)} _hover={{ bg: bgHover }}>
                    <HStack spacing={3}>
                      <Image src={c.thumbnail} w="48px" h="48px" borderRadius="full" objectFit="cover" />
                      <Text fontSize="sm" fontWeight="medium" noOfLines={2} flex={1}>{c.title}</Text>
                      <Play size={16} color={textSecondary} />
                    </HStack>
                  </Box>
                ))}
                {(viewMode === 'channel-videos' ? channelVideos : viewMode === 'recent' ? recentVideos : searchResults).map(v => (
                  <Box key={v.id} bg={bgCard} borderRadius="xl" overflow="hidden" cursor="pointer"
                    onClick={() => { setCurrentVideo(v.id); setCurrentVideoTitle(v.title); }} _hover={{ bg: bgHover }}>
                    <Image src={v.thumbnail} w="100%" aspectRatio={16/9} objectFit="cover" />
                    <VStack align="start" p={3} spacing={1}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={2}>{v.title}</Text>
                      <Text fontSize="xs" color={textSecondary}>{v.channel}</Text>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}

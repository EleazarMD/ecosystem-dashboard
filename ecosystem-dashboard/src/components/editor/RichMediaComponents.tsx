/**
 * Rich Media Components (Phase 3 & 4)
 * Renders spacers, enhanced dividers, images, videos, and files
 */

import React from 'react';
import { Box, Image as ChakraImage, Text, Link, HStack, Icon } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { FiFile, FiDownload } from 'react-icons/fi';
import { Block } from '@/lib/editor/BlockModel';

// Phase 3: Spacer Block
export const SpacerBlock: React.FC<{ block: Block }> = ({ block }) => {
  const sizeMap = { small: '1rem', medium: '2rem', large: '4rem' };
  const height = block.properties.height || sizeMap[block.properties.size as keyof typeof sizeMap] || '2rem';
  
  return <Box height={height} width="100%" />;
};

// Phase 3: Enhanced Divider
export const EnhancedDivider: React.FC<{ block: Block }> = ({ block }) => {
  const dividerStyle = block.style?.dividerStyle || {};
  const thicknessMap = { thin: '1px', medium: '2px', thick: '4px' };
  const borderStyle = dividerStyle.style || 'solid';
  const thickness = thicknessMap[dividerStyle.thickness as keyof typeof thicknessMap] || '1px';
  const color = dividerStyle.color || 'gray.400';
  
  return (
    <Box
      borderBottom={`${thickness} ${borderStyle}`}
      borderColor={color}
      my={4}
      width="100%"
    />
  );
};

// Phase 4: Image Block
export const ImageBlock: React.FC<{ block: Block }> = ({ block }) => {
  const { url, caption, width, alignment } = block.properties;
  const widthMap = { small: '400px', medium: '600px', large: '800px', full: '100%' };
  const imgWidth = widthMap[width as keyof typeof widthMap] || '600px';
  const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const justify = alignMap[alignment as keyof typeof alignMap] || 'center';
  
  // Extract text from caption (handle rich text objects/arrays)
  const captionText = typeof caption === 'string' 
    ? caption 
    : Array.isArray(caption)
      ? caption.map(c => typeof c === 'object' && c.text ? c.text : c).join('')
      : typeof caption === 'object' && caption?.text
        ? caption.text
        : '';
  
  return (
    <Box display="flex" justifyContent={justify} width="100%" my={4}>
      <Box>
        <ChakraImage
          src={url}
          alt={captionText || 'Image'}
          maxW={imgWidth}
          width="100%"
          borderRadius="md"
          boxShadow="md"
          fallback={<Box bg={useSemanticToken('surface.elevated')} width={imgWidth} height="300px" borderRadius="md" display="flex" alignItems="center" justifyContent="center"><Text>Image</Text></Box>}
        />
        {captionText && (
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2} textAlign={alignment || 'center'}>
            {captionText}
          </Text>
        )}
      </Box>
    </Box>
  );
};

// Phase 4: Video Block
export const VideoBlock: React.FC<{ block: Block }> = ({ block }) => {
  const { url, caption, width } = block.properties;
  const widthMap = { medium: '640px', large: '800px', full: '100%' };
  const videoWidth = widthMap[width as keyof typeof widthMap] || '800px';
  
  // Extract text from caption (handle rich text objects/arrays)
  const captionText = typeof caption === 'string' 
    ? caption 
    : Array.isArray(caption)
      ? caption.map(c => typeof c === 'object' && c.text ? c.text : c).join('')
      : typeof caption === 'object' && caption?.text
        ? caption.text
        : '';
  
  // Extract YouTube/Vimeo embed URLs
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
    return url;
  };
  
  const embedUrl = getEmbedUrl(url);
  const isEmbed = embedUrl !== url;
  
  return (
    <Box display="flex" justifyContent="center" width="100%" my={4}>
      <Box maxW={videoWidth} width="100%">
        {isEmbed ? (
          <Box
            as="iframe"
            src={embedUrl}
            width="100%"
            height="450px"
            borderRadius="md"
            boxShadow="md"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <Box
            as="video"
            src={url}
            controls
            width="100%"
            borderRadius="md"
            boxShadow="md"
          />
        )}
        {captionText && (
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2} textAlign="center">
            {captionText}
          </Text>
        )}
      </Box>
    </Box>
  );
};

// Phase 4: File Block
export const FileBlock: React.FC<{ block: Block }> = ({ block }) => {
  const { url, filename, file_type } = block.properties;
  const bg = useSemanticToken('surface.base');
  const hoverBg = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');
  
  return (
    <Link href={url} isExternal _hover={{ textDecor: 'none' }}>
      <HStack
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="md"
        p={4}
        spacing={3}
        transition="all 0.2s"
        _hover={{ bg: hoverBg, boxShadow: 'md' }}
        my={2}
      >
        <Icon as={FiFile} boxSize={6} color="blue.500" />
        <Box flex={1}>
          <Text fontWeight="medium">{filename}</Text>
          {file_type && (
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{file_type.toUpperCase()}</Text>
          )}
        </Box>
        <Icon as={FiDownload} boxSize={5} color={useSemanticToken('text.tertiary')} />
      </HStack>
    </Link>
  );
};

// Phase 4: Embed Block - for external content (Twitter, CodePen, Figma, etc.)
export const EmbedBlock: React.FC<{ block: Block }> = ({ block }) => {
  const { url, caption, width, embedType } = block.properties;
  const widthMap = { medium: '640px', large: '800px', full: '100%' };
  const embedWidth = widthMap[width as keyof typeof widthMap] || '100%';
  const bg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  // Detect embed type and generate appropriate embed URL
  const getEmbedConfig = (url: string): { embedUrl: string; height: string; type: string } => {
    // Twitter/X
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return { embedUrl: url, height: '400px', type: 'twitter' };
    }
    // CodePen
    if (url.includes('codepen.io')) {
      const match = url.match(/codepen\.io\/([^\/]+)\/pen\/([^\/\?]+)/);
      if (match) {
        return { 
          embedUrl: `https://codepen.io/${match[1]}/embed/${match[2]}?default-tab=result`, 
          height: '400px', 
          type: 'codepen' 
        };
      }
    }
    // Figma
    if (url.includes('figma.com')) {
      return { 
        embedUrl: `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(url)}`, 
        height: '450px', 
        type: 'figma' 
      };
    }
    // Google Maps
    if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) {
      return { embedUrl: url.replace('/maps/', '/maps/embed/'), height: '400px', type: 'maps' };
    }
    // Spotify
    if (url.includes('spotify.com')) {
      const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
      return { embedUrl, height: '152px', type: 'spotify' };
    }
    // SoundCloud
    if (url.includes('soundcloud.com')) {
      return { 
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500`, 
        height: '166px', 
        type: 'soundcloud' 
      };
    }
    // GitHub Gist
    if (url.includes('gist.github.com')) {
      return { embedUrl: url, height: '300px', type: 'gist' };
    }
    // Default iframe
    return { embedUrl: url, height: '400px', type: 'generic' };
  };

  const config = getEmbedConfig(url || '');

  if (!url) {
    return (
      <Box
        bg={bg}
        border="1px dashed"
        borderColor={borderColor}
        borderRadius="md"
        p={8}
        textAlign="center"
        my={4}
      >
        <Text color={useSemanticToken('text.secondary')}>
          Paste a URL to embed content (Twitter, CodePen, Figma, Spotify, etc.)
        </Text>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" width="100%" my={4}>
      <Box maxW={embedWidth} width="100%">
        <Box
          as="iframe"
          src={config.embedUrl}
          width="100%"
          height={config.height}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {caption && (
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2} textAlign="center">
            {caption}
          </Text>
        )}
      </Box>
    </Box>
  );
};

/**
 * PlotlyChartBlock - Interactive charts with Plotly.js
 * Phase 2: Interactive visualizations with hover, zoom, pan
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import {
  FiDownload,
  FiRefreshCw,
  FiEdit,
  FiMoreVertical,
  FiTrash2,
  FiCamera,
} from 'react-icons/fi';

// Lazy load Plotly with React state
let PlotlyModule: any = null;

export interface PlotlyChartBlockProps {
  blockId: string;
  plotlyConfig: {
    data: any[];
    layout?: any;
    config?: any;
  };
  title?: string;
  narrative?: string;
  metadata?: {
    createdByAgent?: string;
    chartType?: string;
    insights?: string[];
    lastRefreshed?: string;
  };
  editable?: boolean;
  onRefresh?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function PlotlyChartBlock({
  blockId,
  plotlyConfig,
  title,
  narrative,
  metadata,
  editable = false,
  onRefresh,
  onDelete,
  onEdit,
}: PlotlyChartBlockProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [Plotly, setPlotly] = useState<any>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const footerBg = useSemanticToken('surface.base');

  // Load Plotly dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !PlotlyModule) {
      import('plotly.js-dist-min')
        .then((module) => {
          PlotlyModule = module.default || module;
          setPlotly(PlotlyModule);
        })
        .catch((err) => {
          console.error('Failed to load Plotly:', err);
        });
    } else if (PlotlyModule) {
      setPlotly(PlotlyModule);
    }
  }, []);

  // Initialize Plotly chart
  useEffect(() => {
    if (!plotRef.current || !plotlyConfig || !Plotly) return;

    setIsLoading(true);

    const defaultLayout: any = {
      autosize: true,
      margin: { t: 40, r: 20, b: 40, l: 50 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      ...plotlyConfig.layout,
    };

    const defaultConfig: any = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: title || 'chart',
        height: 800,
        width: 1200,
        scale: 2,
      },
      ...plotlyConfig.config,
    };

    Plotly.newPlot(
      plotRef.current,
      plotlyConfig.data,
      defaultLayout,
      defaultConfig
    )
      .then(() => setIsLoading(false))
      .catch((error: any) => {
        console.error('Plotly chart error:', error);
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      if (plotRef.current && Plotly) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [plotlyConfig, title]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (plotRef.current && Plotly) {
        Plotly.Plots.resize(plotRef.current);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleDownloadPNG = () => {
    if (!plotRef.current || !Plotly) return;

    Plotly.toImage(plotRef.current, {
      format: 'png',
      width: 1200,
      height: 800,
      scale: 2,
    }).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${title || 'chart'}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleDownloadSVG = () => {
    if (!plotRef.current) return;

    Plotly.toImage(plotRef.current, {
      format: 'svg',
    }).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${title || 'chart'}.svg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleDownloadHTML = () => {
    if (!plotRef.current) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <title>${title || 'Chart'}</title>
</head>
<body>
  <div id="chart"></div>
  <script>
    Plotly.newPlot('chart', ${JSON.stringify(plotlyConfig.data)}, ${JSON.stringify(plotlyConfig.layout)}, ${JSON.stringify(plotlyConfig.config)});
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.download = `${title || 'chart'}.html`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Show loading message if Plotly hasn't loaded yet
  if (!Plotly) {
    return (
      <Box p={4} textAlign="center" color={useSemanticToken('text.secondary')}>
        <Spinner size="sm" mr={2} />
        Loading chart library...
      </Box>
    );
  }

  return (
    <Box
      position="relative"
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
      bg={bgColor}
      transition="all 0.2s"
      _hover={{ borderColor: 'blue.400', bg: hoverBg }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chart Header */}
      {(title || editable) && (
        <HStack
          px={4}
          py={2}
          borderBottomWidth="1px"
          borderColor={borderColor}
          justify="space-between"
        >
          <HStack spacing={2}>
            {title && (
              <Text fontWeight="semibold" fontSize="sm">
                {title}
              </Text>
            )}
            <Badge colorScheme="blue" fontSize="xs">
              Interactive
            </Badge>
            {metadata?.createdByAgent === 'claude_code' && (
              <Badge colorScheme="purple" fontSize="xs">
                AI Generated
              </Badge>
            )}
          </HStack>

          {/* Action Buttons */}
          {editable && (
            <HStack spacing={1} opacity={isHovered ? 1 : 0} transition="opacity 0.2s">
              {onRefresh && (
                <Tooltip label="Refresh data" placement="top">
                  <IconButton
                    aria-label="Refresh chart"
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                    onClick={onRefresh}
                  />
                </Tooltip>
              )}

              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Download options"
                  icon={<FiCamera />}
                  size="sm"
                  variant="ghost"
                />
                <MenuList>
                  <MenuItem onClick={handleDownloadPNG}>Download PNG</MenuItem>
                  <MenuItem onClick={handleDownloadSVG}>Download SVG</MenuItem>
                  <MenuItem onClick={handleDownloadHTML}>Download HTML</MenuItem>
                </MenuList>
              </Menu>

              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="More options"
                  icon={<FiMoreVertical />}
                  size="sm"
                  variant="ghost"
                />
                <MenuList>
                  {onEdit && (
                    <MenuItem icon={<FiEdit />} onClick={onEdit}>
                      Edit chart
                    </MenuItem>
                  )}
                  {onDelete && (
                    <MenuItem icon={<FiTrash2 />} onClick={onDelete} color="red.500">
                      Delete chart
                    </MenuItem>
                  )}
                </MenuList>
              </Menu>
            </HStack>
          )}
        </HStack>
      )}

      {/* Narrative/Description */}
      {narrative && (
        <Box px={4} pt={3} pb={2}>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            {narrative}
          </Text>
        </Box>
      )}

      {/* Plotly Chart Container */}
      <Box p={4} minHeight="400px" position="relative">
        {isLoading && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
          >
            <Text color={useSemanticToken('text.secondary')}>Loading chart...</Text>
          </Box>
        )}
        <div ref={plotRef} style={{ width: '100%', height: '100%' }} />
      </Box>

      {/* Insights Footer */}
      {metadata?.insights && metadata.insights.length > 0 && (
        <Box px={4} pb={4}>
          <VStack align="start" spacing={1}>
            <Text fontSize="xs" fontWeight="semibold" color={useSemanticToken('text.secondary')}>
              KEY INSIGHTS:
            </Text>
            {metadata.insights.slice(0, 3).map((insight, idx) => (
              <Text key={idx} fontSize="xs" color={useSemanticToken('text.secondary')}>
                • {insight}
              </Text>
            ))}
          </VStack>
        </Box>
      )}

      {/* Metadata Footer */}
      {(metadata?.chartType || metadata?.lastRefreshed) && (
        <Box
          px={4}
          py={2}
          borderTopWidth="1px"
          borderColor={borderColor}
          bg={footerBg}
        >
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            {metadata.chartType && `${metadata.chartType} chart`}
            {metadata.lastRefreshed && ` • Updated ${metadata.lastRefreshed}`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

import React, { useRef, useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
  useToast,
  Tooltip,
  MenuGroup,
  MenuDivider,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FiDownload, FiImage, FiFileText, FiFilePlus } from 'react-icons/fi';
import { exportChartAsImage, exportDataAsCsv, exportDataAsJson, ExportFormat } from '@/lib/utils/chart-export';

interface ChartExportMenuProps {
  chartRef: React.RefObject<HTMLElement>;
  data: Array<Record<string, any>>;
  columns: Array<{ key: string; header: string }>;
  filename?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
  colorScheme?: string;
  isDisabled?: boolean;
}

/**
 * ChartExportMenu Component
 * 
 * Provides a standard menu for exporting charts as images or data in various formats
 * To be used across all chart components for consistent export functionality
 */
const ChartExportMenu: React.FC<ChartExportMenuProps> = ({
  chartRef,
  data,
  columns,
  filename = 'chart-export',
  size = 'sm',
  variant = 'outline',
  colorScheme = 'blue',
  isDisabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const handleExportImage = async (format: ExportFormat) => {
    if (!chartRef.current) return;

    try {
      setIsExporting(true);
      await exportChartAsImage(chartRef.current, format as 'png' | 'jpeg' | 'svg', {
        filename,
      });

      toast({
        title: 'Export Successful',
        description: `Chart exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportData = (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);

      if (format === 'csv') {
        exportDataAsCsv(data, columns, { filename });
      } else {
        exportDataAsJson(data, { filename });
      }

      toast({
        title: 'Export Successful',
        description: `Data exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Menu>
      <Tooltip label="Export chart or data">
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          leftIcon={<Icon as={FiDownload} />}
          size={size}
          variant={variant}
          colorScheme={colorScheme}
          isLoading={isExporting}
          isDisabled={isDisabled}
        >
          Export
        </MenuButton>
      </Tooltip>
      <MenuList>
        <MenuGroup title="Image">
          <MenuItem 
            icon={<Icon as={FiImage} />}
            onClick={() => handleExportImage('png')}
          >
            PNG Image
          </MenuItem>
          <MenuItem 
            icon={<Icon as={FiImage} />}
            onClick={() => handleExportImage('jpeg')}
          >
            JPEG Image
          </MenuItem>
          <MenuItem 
            icon={<Icon as={FiFilePlus} />}
            onClick={() => handleExportImage('svg')}
          >
            SVG Vector
          </MenuItem>
        </MenuGroup>
        <MenuDivider />
        <MenuGroup title="Data">
          <MenuItem 
            icon={<Icon as={FiFileText} />}
            onClick={() => handleExportData('csv')}
          >
            CSV File
          </MenuItem>
          <MenuItem 
            icon={<Icon as={FiFileText} />}
            onClick={() => handleExportData('json')}
          >
            JSON File
          </MenuItem>
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};

export default ChartExportMenu;

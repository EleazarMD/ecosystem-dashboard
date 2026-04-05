/**
 * Chart Export Utilities
 * 
 * Provides functionality to export chart data and visualizations
 * for use in reports and external applications
 */
import { saveAs } from 'file-saver';
import { toPng, toJpeg, toSvg } from 'html-to-image';

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'csv' | 'json';

interface ExportOptions {
  filename?: string;
  quality?: number; // For JPEG only (0-1)
  backgroundColor?: string; // For PNG/JPEG
  width?: number;
  height?: number;
  style?: Record<string, any>;
}

const DEFAULT_OPTIONS: ExportOptions = {
  filename: 'chart-export',
  quality: 0.95,
  backgroundColor: '#ffffff'
};

/**
 * Export chart as an image (PNG, JPEG, or SVG)
 */
export async function exportChartAsImage(
  elementRef: HTMLElement,
  format: 'png' | 'jpeg' | 'svg' = 'png',
  options: ExportOptions = {}
): Promise<void> {
  if (!elementRef) {
    throw new Error('Element reference is required for chart export');
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const filename = `${mergedOptions.filename || 'chart-export'}.${format}`;

  try {
    let dataUrl: string;
    
    switch (format) {
      case 'png':
        dataUrl = await toPng(elementRef, {
          backgroundColor: mergedOptions.backgroundColor,
          width: mergedOptions.width,
          height: mergedOptions.height,
          style: mergedOptions.style
        });
        break;
      case 'jpeg':
        dataUrl = await toJpeg(elementRef, {
          backgroundColor: mergedOptions.backgroundColor,
          quality: mergedOptions.quality,
          width: mergedOptions.width,
          height: mergedOptions.height,
          style: mergedOptions.style
        });
        break;
      case 'svg':
        dataUrl = await toSvg(elementRef, {
          backgroundColor: mergedOptions.backgroundColor,
          width: mergedOptions.width,
          height: mergedOptions.height,
          style: mergedOptions.style
        });
        break;
      default:
        throw new Error(`Unsupported image format: ${format}`);
    }

    saveAs(dataUrl, filename);
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw error;
  }
}

/**
 * Export chart data as CSV
 */
export function exportDataAsCsv(
  data: Array<Record<string, any>>,
  columns: Array<{ key: string, header: string }>,
  options: ExportOptions = {}
): void {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const filename = `${mergedOptions.filename || 'chart-data'}.csv`;

  try {
    // Create CSV header
    let csvContent = columns.map(col => `"${col.header}"`).join(',') + '\n';

    // Add data rows
    csvContent += data.map(row => {
      return columns
        .map(col => {
          const value = row[col.key];
          // Handle different data types
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(',');
    }).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}

/**
 * Export chart data as JSON
 */
export function exportDataAsJson(
  data: any,
  options: ExportOptions = {}
): void {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const filename = `${mergedOptions.filename || 'chart-data'}.json`;

  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    throw error;
  }
}

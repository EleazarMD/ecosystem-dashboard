/**
 * CSVParser - Import CSV files into database entries
 * Auto-detects column types and creates database schema + rows
 */

import { nanoid } from 'nanoid';

export interface CSVColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'url' | 'email' | 'select';
  values: string[];
}

export interface CSVImportResult {
  columns: CSVColumn[];
  rows: Record<string, any>[];
  schema: Record<string, { type: string; name: string }>;
  rowCount: number;
}

export class CSVParser {
  /**
   * Parse CSV text into structured data with auto-detected types
   */
  static parse(csvText: string, hasHeader: boolean = true): CSVImportResult {
    const lines = this.splitLines(csvText);
    if (lines.length === 0) {
      return { columns: [], rows: [], schema: {}, rowCount: 0 };
    }

    const parsedRows = lines.map(line => this.parseLine(line));
    const headerRow = hasHeader ? parsedRows[0] : parsedRows[0].map((_, i) => `Column ${i + 1}`);
    const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;

    // Build columns with type detection
    const columns: CSVColumn[] = headerRow.map((name, colIdx) => {
      const values = dataRows.map(row => row[colIdx] || '');
      const type = this.detectType(values);
      return { name: name.trim(), type, values };
    });

    // Build schema
    const schema: Record<string, { type: string; name: string }> = {};
    columns.forEach((col, idx) => {
      const key = col.name.toLowerCase().replace(/\s+/g, '_');
      schema[key] = { type: idx === 0 ? 'title' : col.type, name: col.name };
    });

    // Build rows
    const rows = dataRows.map(dataRow => {
      const row: Record<string, any> = { id: nanoid() };
      columns.forEach((col, idx) => {
        const key = col.name.toLowerCase().replace(/\s+/g, '_');
        row[key] = this.convertValue(dataRow[idx] || '', col.type);
      });
      return row;
    });

    return { columns, rows, schema, rowCount: rows.length };
  }

  /**
   * Parse from a File object (browser)
   */
  static async parseFile(file: File, hasHeader: boolean = true): Promise<CSVImportResult> {
    const text = await file.text();
    return this.parse(text, hasHeader);
  }

  private static splitLines(text: string): string[] {
    return text.split(/\r?\n/).filter(line => line.trim().length > 0);
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private static parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  /**
   * Auto-detect column type from sample values
   */
  private static detectType(values: string[]): CSVColumn['type'] {
    const nonEmpty = values.filter(v => v.trim() !== '');
    if (nonEmpty.length === 0) return 'text';

    // Check if all values are numbers
    const allNumbers = nonEmpty.every(v => !isNaN(parseFloat(v)) && isFinite(Number(v)));
    if (allNumbers) return 'number';

    // Check if all values are booleans
    const boolValues = new Set(['true', 'false', 'yes', 'no', '1', '0']);
    const allBool = nonEmpty.every(v => boolValues.has(v.toLowerCase()));
    if (allBool) return 'checkbox';

    // Check if most values look like dates
    const dateCount = nonEmpty.filter(v => !isNaN(Date.parse(v)) && v.length > 4).length;
    if (dateCount > nonEmpty.length * 0.8) return 'date';

    // Check for URLs
    const urlCount = nonEmpty.filter(v => /^https?:\/\//i.test(v)).length;
    if (urlCount > nonEmpty.length * 0.8) return 'url';

    // Check for emails
    const emailCount = nonEmpty.filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).length;
    if (emailCount > nonEmpty.length * 0.8) return 'email';

    // Check if select-like (few unique values relative to total)
    const uniqueValues = new Set(nonEmpty.map(v => v.toLowerCase()));
    if (uniqueValues.size <= Math.max(5, nonEmpty.length * 0.3)) return 'select';

    return 'text';
  }

  private static convertValue(value: string, type: CSVColumn['type']): any {
    if (!value.trim()) return null;

    switch (type) {
      case 'number':
        return parseFloat(value) || 0;
      case 'checkbox':
        return ['true', 'yes', '1'].includes(value.toLowerCase());
      case 'date':
        return new Date(value).toISOString();
      default:
        return value;
    }
  }
}

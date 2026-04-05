/**
 * AdvancedViews - Multi-sort, grouped views, and linked database views
 */

export interface SortRule {
  propertyKey: string;
  direction: 'ascending' | 'descending';
}

export interface FilterRule {
  propertyKey: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with'
    | 'ends_with' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface GroupConfig {
  propertyKey: string;
  hideEmpty: boolean;
  sortGroups: 'alphabetical' | 'count_asc' | 'count_desc';
}

export interface ViewConfig {
  id: string;
  name: string;
  type: 'table' | 'board' | 'gallery' | 'calendar' | 'list';
  sorts: SortRule[];
  filters: FilterRule[];
  group?: GroupConfig;
  visibleProperties: string[];
  propertyWidths: Record<string, number>;
}

export type DatabaseRow = Record<string, any>;

export class AdvancedViews {
  /**
   * Apply multi-sort to rows
   */
  static multiSort(rows: DatabaseRow[], sorts: SortRule[], schema: Record<string, any>): DatabaseRow[] {
    if (sorts.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = a[sort.propertyKey];
        const bVal = b[sort.propertyKey];
        const cmp = this.compareValues(aVal, bVal, schema[sort.propertyKey]?.type);
        if (cmp !== 0) {
          return sort.direction === 'ascending' ? cmp : -cmp;
        }
      }
      return 0;
    });
  }

  /**
   * Apply filters to rows
   */
  static applyFilters(rows: DatabaseRow[], filters: FilterRule[]): DatabaseRow[] {
    if (filters.length === 0) return rows;

    return rows.filter(row => {
      return filters.every(filter => this.matchesFilter(row, filter));
    });
  }

  /**
   * Group rows by a property
   */
  static groupBy(
    rows: DatabaseRow[],
    config: GroupConfig,
    schema: Record<string, any>
  ): { groupName: string; rows: DatabaseRow[] }[] {
    const groups = new Map<string, DatabaseRow[]>();

    for (const row of rows) {
      const value = row[config.propertyKey];
      const groupKey = this.getGroupKey(value, schema[config.propertyKey]?.type);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    }

    let entries = Array.from(groups.entries()).map(([name, rows]) => ({
      groupName: name,
      rows,
    }));

    // Filter empty groups
    if (config.hideEmpty) {
      entries = entries.filter(e => e.rows.length > 0);
    }

    // Sort groups
    switch (config.sortGroups) {
      case 'alphabetical':
        entries.sort((a, b) => a.groupName.localeCompare(b.groupName));
        break;
      case 'count_asc':
        entries.sort((a, b) => a.rows.length - b.rows.length);
        break;
      case 'count_desc':
        entries.sort((a, b) => b.rows.length - a.rows.length);
        break;
    }

    return entries;
  }

  /**
   * Apply a full view config (filters → sorts → group)
   */
  static applyViewConfig(
    rows: DatabaseRow[],
    config: ViewConfig,
    schema: Record<string, any>
  ): { rows: DatabaseRow[]; groups?: { groupName: string; rows: DatabaseRow[] }[] } {
    let filtered = this.applyFilters(rows, config.filters);
    let sorted = this.multiSort(filtered, config.sorts, schema);

    if (config.group) {
      return { rows: sorted, groups: this.groupBy(sorted, config.group, schema) };
    }

    return { rows: sorted };
  }

  private static compareValues(a: any, b: any, propertyType?: string): number {
    // Handle nulls
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    switch (propertyType) {
      case 'number':
        return (Number(a) || 0) - (Number(b) || 0);
      case 'date':
        return new Date(a).getTime() - new Date(b).getTime();
      case 'checkbox':
        return (a ? 1 : 0) - (b ? 1 : 0);
      default:
        return String(a).localeCompare(String(b));
    }
  }

  private static matchesFilter(row: DatabaseRow, filter: FilterRule): boolean {
    const value = row[filter.propertyKey];

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return String(value || '').toLowerCase().includes(String(filter.value).toLowerCase());
      case 'not_contains':
        return !String(value || '').toLowerCase().includes(String(filter.value).toLowerCase());
      case 'starts_with':
        return String(value || '').toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'ends_with':
        return String(value || '').toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(filter.value);
      case 'less_than':
        return Number(value) < Number(filter.value);
      case 'is_empty':
        return value == null || value === '' || (Array.isArray(value) && value.length === 0);
      case 'is_not_empty':
        return value != null && value !== '' && !(Array.isArray(value) && value.length === 0);
      default:
        return true;
    }
  }

  private static getGroupKey(value: any, propertyType?: string): string {
    if (value == null || value === '') return '(empty)';

    switch (propertyType) {
      case 'select':
      case 'multi_select':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'checkbox':
        return value ? 'Checked' : 'Unchecked';
      case 'date':
        try {
          const d = new Date(value);
          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } catch {
          return String(value);
        }
      case 'number':
        const num = Number(value);
        if (num < 0) return 'Negative';
        if (num === 0) return 'Zero';
        if (num <= 10) return '1-10';
        if (num <= 50) return '11-50';
        if (num <= 100) return '51-100';
        return '100+';
      default:
        return String(value);
    }
  }
}

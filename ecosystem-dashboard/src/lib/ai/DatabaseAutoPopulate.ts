/**
 * DatabaseAutoPopulate - AI-powered database entry suggestions
 * Analyzes existing rows and suggests new entries or fills missing fields
 */

export interface PopulateRequest {
  schema: Record<string, { type: string; name: string }>;
  existingRows: Record<string, any>[];
  targetField?: string;
  count?: number;
}

export interface PopulateSuggestion {
  row: Record<string, any>;
  confidence: number;
  source: 'pattern' | 'inference';
}

export class DatabaseAutoPopulate {
  /**
   * Suggest values for empty cells in a row based on patterns in other rows
   */
  static suggestMissingValues(
    row: Record<string, any>,
    schema: Record<string, { type: string; name: string }>,
    existingRows: Record<string, any>[]
  ): Record<string, any> {
    const suggestions: Record<string, any> = {};

    for (const [key, config] of Object.entries(schema)) {
      if (row[key] != null && row[key] !== '') continue;

      switch (config.type) {
        case 'select':
          suggestions[key] = this.suggestSelect(key, existingRows);
          break;
        case 'number':
          suggestions[key] = this.suggestNumber(key, existingRows);
          break;
        case 'date':
          suggestions[key] = this.suggestDate(key, existingRows);
          break;
        case 'checkbox':
          suggestions[key] = this.suggestCheckbox(key, existingRows);
          break;
        case 'text':
          suggestions[key] = this.suggestText(key, row, existingRows);
          break;
      }
    }

    return suggestions;
  }

  /**
   * Generate new row suggestions based on existing patterns
   */
  static suggestNewRows(request: PopulateRequest): PopulateSuggestion[] {
    const { schema, existingRows, count = 3 } = request;
    const suggestions: PopulateSuggestion[] = [];

    for (let i = 0; i < count; i++) {
      const newRow: Record<string, any> = {};

      for (const [key, config] of Object.entries(schema)) {
        switch (config.type) {
          case 'title':
            newRow[key] = `New ${config.name} ${existingRows.length + i + 1}`;
            break;
          case 'select':
            newRow[key] = this.suggestSelect(key, existingRows);
            break;
          case 'number':
            newRow[key] = this.suggestNumber(key, existingRows);
            break;
          case 'date':
            newRow[key] = this.suggestDate(key, existingRows);
            break;
          case 'checkbox':
            newRow[key] = false;
            break;
          case 'text':
            newRow[key] = '';
            break;
          default:
            newRow[key] = null;
        }
      }

      suggestions.push({
        row: newRow,
        confidence: 0.6 - (i * 0.1),
        source: 'pattern',
      });
    }

    return suggestions;
  }

  /**
   * Infer a database schema from a text description
   */
  static inferSchema(description: string): Record<string, { type: string; name: string }> {
    const desc = description.toLowerCase();
    const schema: Record<string, { type: string; name: string }> = {};

    // Always include a name/title field
    schema['name'] = { type: 'title', name: 'Name' };

    // Pattern-based schema inference
    if (this.matches(desc, ['task', 'todo', 'project', 'sprint', 'ticket'])) {
      schema['status'] = { type: 'select', name: 'Status' };
      schema['priority'] = { type: 'select', name: 'Priority' };
      schema['assignee'] = { type: 'text', name: 'Assignee' };
      schema['due_date'] = { type: 'date', name: 'Due Date' };
      schema['completed'] = { type: 'checkbox', name: 'Completed' };
    }

    if (this.matches(desc, ['inventory', 'product', 'item', 'stock'])) {
      schema['category'] = { type: 'select', name: 'Category' };
      schema['quantity'] = { type: 'number', name: 'Quantity' };
      schema['price'] = { type: 'number', name: 'Price' };
      schema['in_stock'] = { type: 'checkbox', name: 'In Stock' };
    }

    if (this.matches(desc, ['contact', 'people', 'team', 'member', 'employee'])) {
      schema['email'] = { type: 'email', name: 'Email' };
      schema['phone'] = { type: 'phone', name: 'Phone' };
      schema['role'] = { type: 'select', name: 'Role' };
      schema['department'] = { type: 'select', name: 'Department' };
    }

    if (this.matches(desc, ['book', 'reading', 'library'])) {
      schema['author'] = { type: 'text', name: 'Author' };
      schema['genre'] = { type: 'select', name: 'Genre' };
      schema['rating'] = { type: 'number', name: 'Rating' };
      schema['read'] = { type: 'checkbox', name: 'Read' };
      schema['date_read'] = { type: 'date', name: 'Date Read' };
    }

    if (this.matches(desc, ['bug', 'issue', 'error', 'defect'])) {
      schema['severity'] = { type: 'select', name: 'Severity' };
      schema['status'] = { type: 'select', name: 'Status' };
      schema['reporter'] = { type: 'text', name: 'Reporter' };
      schema['assignee'] = { type: 'text', name: 'Assignee' };
      schema['created'] = { type: 'date', name: 'Created' };
    }

    if (this.matches(desc, ['expense', 'budget', 'finance', 'cost'])) {
      schema['amount'] = { type: 'number', name: 'Amount' };
      schema['category'] = { type: 'select', name: 'Category' };
      schema['date'] = { type: 'date', name: 'Date' };
      schema['approved'] = { type: 'checkbox', name: 'Approved' };
    }

    // Add notes field if not already present
    if (!schema['notes']) {
      schema['notes'] = { type: 'text', name: 'Notes' };
    }

    return schema;
  }

  private static suggestSelect(key: string, rows: Record<string, any>[]): string {
    const values = rows.map(r => r[key]).filter(Boolean);
    if (values.length === 0) return '';
    // Return most common value
    const freq = new Map<string, number>();
    values.forEach(v => freq.set(String(v), (freq.get(String(v)) || 0) + 1));
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  private static suggestNumber(key: string, rows: Record<string, any>[]): number {
    const values = rows.map(r => Number(r[key])).filter(v => !isNaN(v));
    if (values.length === 0) return 0;
    // Return average rounded to 2 decimal places
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return Math.round(avg * 100) / 100;
  }

  private static suggestDate(key: string, rows: Record<string, any>[]): string {
    // Suggest tomorrow by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private static suggestCheckbox(key: string, rows: Record<string, any>[]): boolean {
    const values = rows.map(r => !!r[key]);
    const trueCount = values.filter(v => v).length;
    return trueCount > values.length / 2;
  }

  private static suggestText(key: string, row: Record<string, any>, rows: Record<string, any>[]): string {
    return '';
  }

  private static matches(text: string, keywords: string[]): boolean {
    return keywords.some(kw => text.includes(kw));
  }
}

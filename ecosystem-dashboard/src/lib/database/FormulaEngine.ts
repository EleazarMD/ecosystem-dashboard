/**
 * FormulaEngine - Evaluate formula expressions for database properties
 * Supports basic math, text, date, and logical operations
 */

export type FormulaValueType = 'number' | 'string' | 'boolean' | 'date';

export interface FormulaResult {
  value: any;
  type: FormulaValueType;
  error?: string;
}

export class FormulaEngine {
  /**
   * Evaluate a formula expression against a row's properties
   */
  static evaluate(
    expression: string,
    rowProperties: Record<string, any>,
    schema: Record<string, any>
  ): FormulaResult {
    try {
      const resolvedExpr = this.resolvePropertyReferences(expression, rowProperties, schema);
      const result = this.evaluateExpression(resolvedExpr);
      return result;
    } catch (error: any) {
      return { value: null, type: 'string', error: error.message || 'Formula error' };
    }
  }

  /**
   * Replace property references (prop("Name")) with actual values
   */
  private static resolvePropertyReferences(
    expression: string,
    rowProperties: Record<string, any>,
    schema: Record<string, any>
  ): string {
    return expression.replace(/prop\("([^"]+)"\)/g, (match, propName) => {
      const value = this.extractPropertyValue(rowProperties[propName], schema[propName]?.type);
      if (typeof value === 'string') return `"${value}"`;
      if (value === null || value === undefined) return '""';
      return String(value);
    });
  }

  /**
   * Extract a usable value from a property based on its type
   */
  private static extractPropertyValue(property: any, propertyType: string): any {
    if (!property) return null;

    switch (propertyType) {
      case 'title':
      case 'rich_text':
      case 'text':
        if (Array.isArray(property)) {
          return property.map(p => p?.text?.content || p?.text || '').join('');
        }
        return property?.text?.content || '';

      case 'number':
        return typeof property === 'number' ? property : parseFloat(property) || 0;

      case 'checkbox':
        return property === true || property?.checkbox === true;

      case 'select':
        return property?.select?.name || property?.name || '';

      case 'date':
        return property?.date?.start || property?.start || '';

      default:
        if (typeof property === 'number') return property;
        if (typeof property === 'string') return property;
        if (typeof property === 'boolean') return property;
        return String(property);
    }
  }

  /**
   * Evaluate a resolved expression
   */
  private static evaluateExpression(expr: string): FormulaResult {
    const trimmed = expr.trim();

    // Handle built-in functions
    if (trimmed.startsWith('if(')) return this.evalIf(trimmed);
    if (trimmed.startsWith('concat(')) return this.evalConcat(trimmed);
    if (trimmed.startsWith('length(')) return this.evalLength(trimmed);
    if (trimmed.startsWith('contains(')) return this.evalContains(trimmed);
    if (trimmed.startsWith('toNumber(')) return this.evalToNumber(trimmed);
    if (trimmed.startsWith('round(')) return this.evalRound(trimmed);
    if (trimmed.startsWith('abs(')) return this.evalAbs(trimmed);
    if (trimmed.startsWith('now()')) return { value: new Date().toISOString(), type: 'date' };
    if (trimmed.startsWith('empty(')) return this.evalEmpty(trimmed);
    if (trimmed.startsWith('format(')) return this.evalFormat(trimmed);
    if (trimmed.startsWith('slice(')) return this.evalSlice(trimmed);
    if (trimmed.startsWith('replace(')) return this.evalReplace(trimmed);
    if (trimmed.startsWith('replaceAll(')) return this.evalReplaceAll(trimmed);
    if (trimmed.startsWith('lower(')) return this.evalLower(trimmed);
    if (trimmed.startsWith('upper(')) return this.evalUpper(trimmed);
    if (trimmed.startsWith('min(')) return this.evalMinMax(trimmed, 'min');
    if (trimmed.startsWith('max(')) return this.evalMinMax(trimmed, 'max');

    // Handle arithmetic
    if (/[+\-*/%]/.test(trimmed) && !trimmed.startsWith('"')) {
      return this.evalArithmetic(trimmed);
    }

    // Handle comparison
    if (/[<>=!]/.test(trimmed) && !trimmed.startsWith('"')) {
      return this.evalComparison(trimmed);
    }

    // Handle string literals
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return { value: trimmed.slice(1, -1), type: 'string' };
    }

    // Handle number literals
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return { value: num, type: 'number' };
    }

    // Handle boolean literals
    if (trimmed === 'true') return { value: true, type: 'boolean' };
    if (trimmed === 'false') return { value: false, type: 'boolean' };

    return { value: trimmed, type: 'string' };
  }

  private static parseArgs(argsStr: string): string[] {
    const args: string[] = [];
    let depth = 0;
    let current = '';
    let inString = false;

    for (const char of argsStr) {
      if (char === '"' && !inString) { inString = true; current += char; continue; }
      if (char === '"' && inString) { inString = false; current += char; continue; }
      if (inString) { current += char; continue; }
      if (char === '(') { depth++; current += char; continue; }
      if (char === ')') { depth--; current += char; continue; }
      if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) args.push(current.trim());
    return args;
  }

  private static extractFuncArgs(expr: string): string[] {
    const start = expr.indexOf('(');
    const end = expr.lastIndexOf(')');
    if (start === -1 || end === -1) return [];
    return this.parseArgs(expr.substring(start + 1, end));
  }

  private static evalIf(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 3) return { value: null, type: 'string', error: 'if() requires 3 arguments' };
    const condition = this.evaluateExpression(args[0]);
    return condition.value ? this.evaluateExpression(args[1]) : this.evaluateExpression(args[2]);
  }

  private static evalConcat(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    const values = args.map(a => this.evaluateExpression(a).value);
    return { value: values.join(''), type: 'string' };
  }

  private static evalLength(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: 0, type: 'number' };
    const val = this.evaluateExpression(args[0]).value;
    return { value: String(val).length, type: 'number' };
  }

  private static evalContains(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 2) return { value: false, type: 'boolean' };
    const str = String(this.evaluateExpression(args[0]).value);
    const search = String(this.evaluateExpression(args[1]).value);
    return { value: str.includes(search), type: 'boolean' };
  }

  private static evalToNumber(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: 0, type: 'number' };
    const val = this.evaluateExpression(args[0]).value;
    return { value: parseFloat(val) || 0, type: 'number' };
  }

  private static evalRound(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length < 1) return { value: 0, type: 'number' };
    const val = Number(this.evaluateExpression(args[0]).value);
    const precision = args.length > 1 ? Number(this.evaluateExpression(args[1]).value) : 0;
    const factor = Math.pow(10, precision);
    return { value: Math.round(val * factor) / factor, type: 'number' };
  }

  private static evalAbs(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: 0, type: 'number' };
    return { value: Math.abs(Number(this.evaluateExpression(args[0]).value)), type: 'number' };
  }

  private static evalEmpty(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: true, type: 'boolean' };
    const val = this.evaluateExpression(args[0]).value;
    return { value: val === null || val === undefined || val === '' || val === 0, type: 'boolean' };
  }

  private static evalFormat(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: '', type: 'string' };
    return { value: String(this.evaluateExpression(args[0]).value), type: 'string' };
  }

  private static evalSlice(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length < 2) return { value: '', type: 'string' };
    const str = String(this.evaluateExpression(args[0]).value);
    const start = Number(this.evaluateExpression(args[1]).value);
    const end = args.length > 2 ? Number(this.evaluateExpression(args[2]).value) : undefined;
    return { value: str.slice(start, end), type: 'string' };
  }

  private static evalReplace(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 3) return { value: '', type: 'string' };
    const str = String(this.evaluateExpression(args[0]).value);
    const search = String(this.evaluateExpression(args[1]).value);
    const replacement = String(this.evaluateExpression(args[2]).value);
    return { value: str.replace(search, replacement), type: 'string' };
  }

  private static evalReplaceAll(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 3) return { value: '', type: 'string' };
    const str = String(this.evaluateExpression(args[0]).value);
    const search = String(this.evaluateExpression(args[1]).value);
    const replacement = String(this.evaluateExpression(args[2]).value);
    return { value: str.replaceAll(search, replacement), type: 'string' };
  }

  private static evalLower(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: '', type: 'string' };
    return { value: String(this.evaluateExpression(args[0]).value).toLowerCase(), type: 'string' };
  }

  private static evalUpper(expr: string): FormulaResult {
    const args = this.extractFuncArgs(expr);
    if (args.length !== 1) return { value: '', type: 'string' };
    return { value: String(this.evaluateExpression(args[0]).value).toUpperCase(), type: 'string' };
  }

  private static evalMinMax(expr: string, func: 'min' | 'max'): FormulaResult {
    const args = this.extractFuncArgs(expr);
    const nums = args.map(a => Number(this.evaluateExpression(a).value)).filter(n => !isNaN(n));
    if (nums.length === 0) return { value: 0, type: 'number' };
    return { value: func === 'min' ? Math.min(...nums) : Math.max(...nums), type: 'number' };
  }

  private static evalArithmetic(expr: string): FormulaResult {
    // Simple arithmetic evaluation (no eval, only safe math)
    try {
      const sanitized = expr.replace(/[^0-9+\-*/%().]/g, '');
      if (!sanitized) return { value: 0, type: 'number' };

      // Use Function constructor for safe math evaluation
      const result = new Function(`return (${sanitized})`)();
      return { value: typeof result === 'number' ? result : 0, type: 'number' };
    } catch {
      return { value: 0, type: 'number', error: 'Invalid arithmetic' };
    }
  }

  private static evalComparison(expr: string): FormulaResult {
    const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];

    for (const op of operators) {
      const idx = expr.indexOf(op);
      if (idx !== -1) {
        const left = this.evaluateExpression(expr.substring(0, idx)).value;
        const right = this.evaluateExpression(expr.substring(idx + op.length)).value;

        let result: boolean;
        switch (op) {
          case '===': case '==': result = left == right; break;
          case '!==': case '!=': result = left != right; break;
          case '>=': result = Number(left) >= Number(right); break;
          case '<=': result = Number(left) <= Number(right); break;
          case '>': result = Number(left) > Number(right); break;
          case '<': result = Number(left) < Number(right); break;
          default: result = false;
        }
        return { value: result, type: 'boolean' };
      }
    }

    return { value: false, type: 'boolean' };
  }

  /**
   * Format a formula result for display
   */
  static formatResult(result: FormulaResult): string {
    if (result.error) return `⚠ ${result.error}`;
    if (result.value === null || result.value === undefined) return '';

    switch (result.type) {
      case 'number': return String(result.value);
      case 'boolean': return result.value ? '✓' : '✗';
      case 'date': return new Date(result.value).toLocaleDateString();
      default: return String(result.value);
    }
  }
}

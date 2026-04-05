/**
 * RollupEngine - Compute rollup values from related database rows
 */

export type RollupFunction =
  | 'count'
  | 'count_values'
  | 'count_unique_values'
  | 'count_all'
  | 'percent_empty'
  | 'percent_not_empty'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'range'
  | 'show_original';

export interface RollupConfig {
  relationPropertyId: string;
  rollupPropertyId: string;
  function: RollupFunction;
}

export interface RollupResult {
  value: number | string | any[];
  type: 'number' | 'string' | 'array';
}

export class RollupEngine {
  /**
   * Compute rollup value from an array of related values
   */
  static compute(values: any[], func: RollupFunction): RollupResult {
    switch (func) {
      case 'count':
      case 'count_all':
        return { value: values.length, type: 'number' };

      case 'count_values':
        return {
          value: values.filter(v => v !== null && v !== undefined && v !== '').length,
          type: 'number',
        };

      case 'count_unique_values':
        return {
          value: new Set(values.filter(v => v !== null && v !== undefined).map(String)).size,
          type: 'number',
        };

      case 'percent_empty':
        if (values.length === 0) return { value: 0, type: 'number' };
        return {
          value: Math.round(
            (values.filter(v => v === null || v === undefined || v === '').length / values.length) * 100
          ),
          type: 'number',
        };

      case 'percent_not_empty':
        if (values.length === 0) return { value: 0, type: 'number' };
        return {
          value: Math.round(
            (values.filter(v => v !== null && v !== undefined && v !== '').length / values.length) * 100
          ),
          type: 'number',
        };

      case 'sum': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return { value: nums.reduce((a, b) => a + b, 0), type: 'number' };
      }

      case 'average': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return { value: 0, type: 'number' };
        return { value: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100, type: 'number' };
      }

      case 'median': {
        const nums = values.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (nums.length === 0) return { value: 0, type: 'number' };
        const mid = Math.floor(nums.length / 2);
        return {
          value: nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2,
          type: 'number',
        };
      }

      case 'min': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return { value: 0, type: 'number' };
        return { value: Math.min(...nums), type: 'number' };
      }

      case 'max': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return { value: 0, type: 'number' };
        return { value: Math.max(...nums), type: 'number' };
      }

      case 'range': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return { value: 0, type: 'number' };
        return { value: Math.max(...nums) - Math.min(...nums), type: 'number' };
      }

      case 'show_original':
        return { value: values, type: 'array' };

      default:
        return { value: values.length, type: 'number' };
    }
  }

  /**
   * Fetch rollup value via API for a specific row and rollup config
   */
  static async fetchRollupValue(
    databaseId: string,
    rowId: string,
    rollupConfig: RollupConfig
  ): Promise<RollupResult> {
    try {
      const response = await fetch(
        `/api/database/${databaseId}/rollup?rowId=${rowId}&relationPropertyId=${rollupConfig.relationPropertyId}&rollupPropertyId=${rollupConfig.rollupPropertyId}&function=${rollupConfig.function}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.result || { value: 0, type: 'number' };
      }
      return { value: 0, type: 'number' };
    } catch (error) {
      console.error('Failed to compute rollup:', error);
      return { value: 0, type: 'number' };
    }
  }

  /**
   * Format rollup result for display
   */
  static formatResult(result: RollupResult, func: RollupFunction): string {
    if (result.type === 'array') {
      const arr = result.value as any[];
      return arr.map(v => String(v)).join(', ');
    }

    const num = result.value as number;

    switch (func) {
      case 'percent_empty':
      case 'percent_not_empty':
        return `${num}%`;

      case 'average':
        return num.toFixed(2);

      default:
        return String(num);
    }
  }
}

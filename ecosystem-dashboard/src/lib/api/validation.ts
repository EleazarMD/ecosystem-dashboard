/**
 * API Input Validation Utilities
 * Production-grade validation for API endpoints
 */

import { z } from 'zod';

export const validateQueryParam = (
  value: string | string[] | undefined,
  schema: z.ZodType,
  defaultValue?: any
): any => {
  if (value === undefined) {
    return defaultValue;
  }
  
  const parsed = schema.safeParse(Array.isArray(value) ? value[0] : value);
  if (!parsed.success) {
    throw new Error(`Invalid query parameter: ${parsed.error.message}`);
  }
  
  return parsed.data;
};

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idSchema = z.string().uuid();

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

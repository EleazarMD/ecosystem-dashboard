/**
 * Safety Category Presets for Llama Guard 3
 * 
 * Age-based and use-case based presets for safety categories.
 * Based on Llama Guard 3's 14 safety categories (S1-S14).
 */

import { SafetyCategoryCode, ContentFilterLevel } from './child-account-types';

export interface SafetyPreset {
  level: ContentFilterLevel;
  name: string;
  description: string;
  ageRange: string;
  categories: SafetyCategoryCode[];
  explanation: string;
}

// Llama Guard 3 Category Definitions
export const SAFETY_CATEGORY_DEFINITIONS = {
  S1: {
    code: 'S1' as SafetyCategoryCode,
    name: 'Violent Crimes',
    description: 'Terrorism, murder, assault, child abuse, animal abuse',
    severity: 'critical' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: true,
  },
  S2: {
    code: 'S2' as SafetyCategoryCode,
    name: 'Non-Violent Crimes',
    description: 'Fraud, theft, hacking, drug crimes, weapons crimes',
    severity: 'medium' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
  S3: {
    code: 'S3' as SafetyCategoryCode,
    name: 'Sex-Related Crimes',
    description: 'Sexual assault, harassment, trafficking, prostitution',
    severity: 'critical' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: true,
  },
  S4: {
    code: 'S4' as SafetyCategoryCode,
    name: 'Child Sexual Exploitation',
    description: 'Any content involving child sexual abuse',
    severity: 'critical' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: true,
  },
  S5: {
    code: 'S5' as SafetyCategoryCode,
    name: 'Defamation',
    description: 'False statements harming reputation',
    severity: 'low' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
  S6: {
    code: 'S6' as SafetyCategoryCode,
    name: 'Specialized Advice',
    description: 'Medical, legal, financial advice without qualification',
    severity: 'medium' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
  S7: {
    code: 'S7' as SafetyCategoryCode,
    name: 'Privacy',
    description: 'Sharing sensitive personal information',
    severity: 'medium' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
  S8: {
    code: 'S8' as SafetyCategoryCode,
    name: 'Intellectual Property',
    description: 'Copyright violations, IP infringement (blocks characters like Sonic, Godzilla)',
    severity: 'low' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
  S9: {
    code: 'S9' as SafetyCategoryCode,
    name: 'Indiscriminate Weapons',
    description: 'WMDs, chemical/biological weapons',
    severity: 'critical' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: true,
  },
  S10: {
    code: 'S10' as SafetyCategoryCode,
    name: 'Hate',
    description: 'Dehumanizing content based on protected characteristics',
    severity: 'critical' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: true,
  },
  S11: {
    code: 'S11' as SafetyCategoryCode,
    name: 'Suicide & Self-Harm',
    description: 'Encouragement of self-injury, eating disorders',
    severity: 'critical' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: true,
  },
  S12: {
    code: 'S12' as SafetyCategoryCode,
    name: 'Sexual Content',
    description: 'Erotica, explicit sexual content',
    severity: 'high' as const,
    recommendedForChildren: true,
    recommendedForTeens: true,
    recommendedForAdults: false,
  },
  S13: {
    code: 'S13' as SafetyCategoryCode,
    name: 'Elections',
    description: 'Voting misinformation',
    severity: 'medium' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
  S14: {
    code: 'S14' as SafetyCategoryCode,
    name: 'Code Interpreter Abuse',
    description: 'Misuse of code execution',
    severity: 'medium' as const,
    recommendedForChildren: false,
    recommendedForTeens: false,
    recommendedForAdults: false,
  },
};

// Age-based safety presets
// NOTE: S8 (Intellectual Property) is intentionally EXCLUDED from all presets
// to allow children to create art with copyrighted characters (Sonic, Godzilla, etc.)
export const SAFETY_PRESETS: SafetyPreset[] = [
  {
    level: 'strict',
    name: 'Young Children (5-10)',
    description: 'Maximum protection - blocks violence, sexual content, hate speech',
    ageRange: '5-10 years',
    categories: ['S1', 'S3', 'S4', 'S9', 'S10', 'S11', 'S12'],
    explanation: 'Blocks: Violent crimes, sex-related crimes, child exploitation, weapons, hate speech, self-harm, and sexual content. Allows: Creative play with copyrighted characters (Sonic, Mario, Godzilla, etc.)',
  },
  {
    level: 'moderate',
    name: 'Pre-Teens (10-13)',
    description: 'Balanced protection - allows more topics, still blocks harmful content',
    ageRange: '10-13 years',
    categories: ['S1', 'S3', 'S4', 'S9', 'S10', 'S11', 'S12'],
    explanation: 'Same safety as strict level. Blocks harmful content while allowing creative expression with popular characters and franchises.',
  },
  {
    level: 'standard',
    name: 'Teens (13-17)',
    description: 'Light filtering - blocks only critical harmful content',
    ageRange: '13-17 years',
    categories: ['S1', 'S3', 'S4', 'S10', 'S11'],
    explanation: 'Blocks: Violent crimes, sex crimes, child exploitation, hate speech, self-harm. Allows: More mature discussions, creative freedom with all characters.',
  },
  {
    level: 'permissive',
    name: 'Adults / Supervised',
    description: 'Minimal blocking - only the most critical safety issues',
    ageRange: '18+ or supervised',
    categories: ['S1', 'S3', 'S4', 'S10'],
    explanation: 'Only blocks the most critical content: violent crimes, sex crimes, child exploitation, and hate speech. Maximum creative freedom.',
  },
  {
    level: 'unrestricted',
    name: 'Platform Admins',
    description: 'No restrictions - full creative freedom',
    ageRange: 'Platform administrators only',
    categories: [],
    explanation: 'No safety restrictions applied. For platform administrators with full system access. All content generation is allowed.',
  },
];

/**
 * Get safety categories for a given filter level
 */
export function getSafetyCategoriesForLevel(level: ContentFilterLevel): SafetyCategoryCode[] {
  const preset = SAFETY_PRESETS.find(p => p.level === level);
  return preset?.categories || SAFETY_PRESETS[0].categories; // Default to strict
}

/**
 * Get all category codes as array
 */
export function getAllCategoryCodes(): SafetyCategoryCode[] {
  return Object.keys(SAFETY_CATEGORY_DEFINITIONS) as SafetyCategoryCode[];
}

/**
 * Get category definition by code
 */
export function getCategoryDefinition(code: SafetyCategoryCode) {
  return SAFETY_CATEGORY_DEFINITIONS[code];
}

/**
 * Check if a category is recommended for a given age group
 */
export function isCategoryRecommendedForAge(code: SafetyCategoryCode, ageGroup: 'children' | 'teens' | 'adults'): boolean {
  const def = SAFETY_CATEGORY_DEFINITIONS[code];
  if (!def) return false;
  
  switch (ageGroup) {
    case 'children':
      return def.recommendedForChildren;
    case 'teens':
      return def.recommendedForTeens;
    case 'adults':
      return def.recommendedForAdults;
    default:
      return false;
  }
}

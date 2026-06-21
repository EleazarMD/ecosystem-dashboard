/**
 * Nova Design Tokens — mirrored from iOS Hyperspace
 * Source of truth: Shared/Design/NovaLabels.swift + DesignSystem.swift
 * Do NOT edit hex values here without syncing the Swift files.
 */

// ── Semantic activity colors (mirrors NovaLabels.Colors) ─────────────────────
export const novaColors = {
  // Activity types
  thinking:   "#6B5CD9", // Indigo   r:0.42 g:0.36 b:0.85 — internal cognition
  searching:  "#2E9ED9", // Cerulean r:0.18 g:0.62 b:0.85 — web / lookup
  analyzing:  "#E68C33", // Amber    r:0.90 g:0.55 b:0.20 — inference / judgment
  reading:    "#33B373", // Emerald  r:0.20 g:0.70 b:0.45 — passive retrieval
  memory:     "#A651C7", // Violet   r:0.65 g:0.32 b:0.78 — recall / storage
  calendar:   "#EB9E2E", // Saffron  r:0.92 g:0.62 b:0.18 — time / scheduling
  email:      "#3380EB", // Royal    r:0.20 g:0.50 b:0.92 — communication
  workspace:  "#4DA86B", // Forest   r:0.30 g:0.66 b:0.42 — creation / docs
  code:       "#29B8B8", // Teal     r:0.16 g:0.72 b:0.72 — technical / precise
  approval:   "#E14D59", // Crimson  r:0.88 g:0.30 b:0.35 — requires human action
  delegating: "#8C66D9", // Purple   r:0.55 g:0.40 b:0.85 — routing to agent
  result:     "#38B880", // Mint     r:0.22 g:0.72 b:0.50 — completion
  toolCall:   "#7389B8", // Slate    r:0.45 g:0.55 b:0.72 — unknown / fallback

  // Phase progression
  phaseIdle:       "#8E8E93",
  phaseHypothesis: "#6B5CD9", // = thinking
  phaseValidating: "#E68C33", // = analyzing
  phaseDone:       "#38B880", // = result

  // Step status
  stepPending:   "#8E8E93",
  stepActive:    "#E68C33", // = analyzing
  stepCompleted: "#38B880", // = result
  stepFailed:    "#E14D59", // = approval
} as const;

// ── Glass tint surfaces (mirrors GlassTint enum) ──────────────────────────────
// Maps state name → { color, tintOpacity, borderOpacity }
export const novaGlassTint = {
  neutral:    { color: "#737880", tintOpacity: 0.03, borderOpacity: 0.10 },
  thinking:   { color: novaColors.thinking,   tintOpacity: 0.05, borderOpacity: 0.18 },
  processing: { color: novaColors.analyzing,  tintOpacity: 0.06, borderOpacity: 0.22 },
  speaking:   { color: novaColors.result,     tintOpacity: 0.04, borderOpacity: 0.18 },
  listening:  { color: novaColors.thinking,   tintOpacity: 0.05, borderOpacity: 0.20 },
  agent:      { color: novaColors.analyzing,  tintOpacity: 0.06, borderOpacity: 0.22 },
  error:      { color: novaColors.approval,   tintOpacity: 0.06, borderOpacity: 0.22 },
  success:    { color: novaColors.result,     tintOpacity: 0.04, borderOpacity: 0.18 },
} as const;

export type NovaGlassTintKey = keyof typeof novaGlassTint;

// ── Typography ramp (mirrors GMTypography) ────────────────────────────────────
export const novaType = {
  displayLarge:  { size: "32px", weight: 700, family: "var(--font-rounded, system-ui)" },
  displayMedium: { size: "28px", weight: 600, family: "var(--font-rounded, system-ui)" },
  displaySmall:  { size: "24px", weight: 600, family: "var(--font-rounded, system-ui)" },
  headlineLarge: { size: "20px", weight: 600 },
  headlineMedium:{ size: "18px", weight: 600 },
  headlineSmall: { size: "16px", weight: 600 },
  bodyLarge:     { size: "17px", weight: 400 },
  bodyMedium:    { size: "16px", weight: 400 },
  bodySmall:     { size: "15px", weight: 400 },
  labelLarge:    { size: "14px", weight: 500 },
  labelMedium:   { size: "13px", weight: 500 },
  labelSmall:    { size: "12px", weight: 500 },
  caption:       { size: "12px", weight: 400 },
  captionSmall:  { size: "11px", weight: 400 },
  captionMono:   { size: "10px", weight: 500, family: "monospace" },
  labelMono:     { size: "11px", weight: 500, family: "monospace" },
} as const;

// ── Spacing (mirrors GMSpacing) ───────────────────────────────────────────────
export const novaSpace = {
  xxs: "2px",
  xs:  "4px",
  sm:  "8px",
  md:  "12px",
  lg:  "16px",
  xl:  "20px",
  xxl: "24px",
  xxxl:"32px",
} as const;

// ── Corner radius (mirrors GMRadius) ─────────────────────────────────────────
export const novaRadius = {
  small:  "8px",
  medium: "12px",
  large:  "16px",
  xl:     "20px",
  pill:   "24px",
  circle: "9999px",
} as const;

// ── Phase/state helpers ───────────────────────────────────────────────────────
// Maps mirror-service state strings to a GlassTint key
export function novaPhase(state: string): NovaGlassTintKey {
  switch (state) {
    case "listening":  return "listening";
    case "processing":
    case "thinking":   return "processing";
    case "speaking":   return "speaking";
    case "error":      return "error";
    default:           return "neutral";
  }
}

// ── Step activity type → color ────────────────────────────────────────────────
export function novaStep(type: string): string {
  const map: Record<string, string> = {
    thinking:   novaColors.thinking,
    searching:  novaColors.searching,
    analyzing:  novaColors.analyzing,
    reading:    novaColors.reading,
    memory:     novaColors.memory,
    calendar:   novaColors.calendar,
    email:      novaColors.email,
    workspace:  novaColors.workspace,
    code:       novaColors.code,
    approval:   novaColors.approval,
    delegating: novaColors.delegating,
    result:     novaColors.result,
  };
  return map[type.toLowerCase()] ?? novaColors.toolCall;
}

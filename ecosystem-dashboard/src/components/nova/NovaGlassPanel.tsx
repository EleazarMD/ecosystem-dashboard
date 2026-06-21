/**
 * NovaGlassPanel — mirrors iOS AuroraGlassModifier
 * Applies a frosted-glass surface with contextual Nova color tinting.
 * Usage: <NovaGlassPanel tint="processing">…children…</NovaGlassPanel>
 *
 * Tesla browser compatibility notes:
 * - color-mix(in srgb, ...) requires Chromium 111+. Tesla browser is older.
 *   Replaced with pre-computed rgba() blends via hexBlend().
 * - backdrop-filter is not supported on all Tesla browser versions.
 *   Fallback: solid semi-opaque background so content is always visible.
 */
import React, { useId } from "react";
import { novaGlassTint, novaRadius, NovaGlassTintKey } from "@/theme/nova";

interface NovaGlassPanelProps {
  tint?: NovaGlassTintKey;
  radius?: string;
  padding?: string;
  borderHighlight?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Blend a hex color with a base rgba at the given opacity weight.
 * Replaces color-mix(in srgb, hex weight%, base) — works on all browsers.
 *
 * @param hex     6-char hex e.g. "#6B5CD9"
 * @param weight  0–1 weight of the hex color (= tintOpacity / borderOpacity)
 * @param baseR/G/B/A  the "other" color (defaults to rgba(20,20,30,0.55))
 */
function hexBlend(
  hex: string,
  weight: number,
  baseR = 20,
  baseG = 20,
  baseB = 30,
  baseA = 0.55
): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const or = Math.round(r * weight + baseR * (1 - weight));
  const og = Math.round(g * weight + baseG * (1 - weight));
  const ob = Math.round(b * weight + baseB * (1 - weight));
  const oa = baseA + (1 - baseA) * weight;
  return `rgba(${or},${og},${ob},${oa.toFixed(3)})`;
}

/**
 * Same but blends toward fully transparent (for border colors).
 */
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

export function NovaGlassPanel({
  tint = "neutral",
  radius = novaRadius.large,
  padding = "16px",
  borderHighlight = true,
  children,
  style,
  className,
}: NovaGlassPanelProps) {
  const token = novaGlassTint[tint];
  const uid = useId().replace(/:/g, "");

  const bgColor    = hexBlend(token.color, token.tintOpacity);
  const bgSolid    = hexBlend(token.color, token.tintOpacity, 14, 14, 24, 0.92);
  const borderColor = borderHighlight
    ? hexAlpha(token.color, token.borderOpacity)
    : "rgba(255,255,255,0.08)";

  const panelStyle: React.CSSProperties = {
    backdropFilter: "blur(20px) saturate(1.6)",
    WebkitBackdropFilter: "blur(20px) saturate(1.6)",
    backgroundColor: bgColor,
    borderRadius: radius,
    padding,
    border: `1px solid ${borderColor}`,
    boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
    transition: "border-color 0.3s ease, background-color 0.3s ease",
    ...style,
  };

  return (
    <>
      {/*
        * @supports fallback for browsers that don't support backdrop-filter
        * (older Tesla Chromium builds). In that case we swap to a fully-opaque
        * solid background so the panel is still readable against the dark bg.
        * Using a scoped class keeps specificity low and avoids global pollution.
        */}
      <style>{`
        .ngp-${uid} {
          background-color: ${bgColor};
        }
        @supports not (backdrop-filter: blur(1px)) {
          .ngp-${uid} {
            background-color: ${bgSolid} !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }
      `}</style>
      <div style={panelStyle} className={`ngp-${uid}${className ? ` ${className}` : ""}`}>
        {children}
      </div>
    </>
  );
}

export default NovaGlassPanel;

/**
 * Theme Generator Utility
 * 
 * Extracts dominant colors from an image and generates a cohesive ThemePreset.
 * Uses the HTML5 Canvas API to analyze pixel data.
 */

import { ThemePreset } from '../theme/types';
import { v4 as uuidv4 } from 'uuid';

interface RGB {
    r: number;
    g: number;
    b: number;
}

interface HSL {
    h: number;
    s: number;
    l: number;
}

// --- Color Utilities ---

function rgbToHsl(r: number, g: number, b: number): HSL {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// --- Image Processing ---

export async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Resize for performance
            const MAX_SIZE = 100;
            const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colorCounts: Record<string, number> = {};

            // Sample pixels
            for (let i = 0; i < imageData.length; i += 4 * 5) { // Skip every 5 pixels for speed
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];

                if (a < 128) continue; // Skip transparent

                // Quantize colors to reduce noise (round to nearest 10)
                const qr = Math.round(r / 10) * 10;
                const qg = Math.round(g / 10) * 10;
                const qb = Math.round(b / 10) * 10;

                const hex = rgbToHex(qr, qg, qb);
                colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }

            // Sort by frequency
            const sortedColors = Object.entries(colorCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([hex]) => hex);

            resolve(sortedColors.slice(0, 10)); // Return top 10
        };

        img.onerror = (e) => reject(e);
    });
}

// --- Theme Generation ---

export async function generateThemeFromImage(imageUrl: string): Promise<ThemePreset> {
    const colors = await extractColorsFromImage(imageUrl);

    if (colors.length === 0) {
        throw new Error('No colors found in image');
    }

    // Heuristic: Determine if image is dark or light based on dominant color
    const dominantHex = colors[0];
    const r = parseInt(dominantHex.slice(1, 3), 16);
    const g = parseInt(dominantHex.slice(3, 5), 16);
    const b = parseInt(dominantHex.slice(5, 7), 16);
    const { l: luminance } = rgbToHsl(r, g, b);

    const isDark = luminance < 0.5;

    // Find vibrant colors for accents
    // Sort remaining colors by saturation
    const vibrantColors = colors.slice(1).map(hex => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { hex, ...rgbToHsl(r, g, b) };
    }).sort((a, b) => b.s - a.s);

    const primary = vibrantColors[0]?.hex || (isDark ? '#ffffff' : '#000000');
    const accent = vibrantColors[1]?.hex || primary;

    // Generate palette
    const background = isDark ? dominantHex : '#ffffff';
    const text = isDark ? '#ffffff' : '#000000';

    return {
        id: `generated-${uuidv4()}`,
        name: 'Generated Theme',
        description: 'Automatically generated from uploaded image',
        mode: isDark ? 'dark' : 'light',

        colors: {
            primary: primary,
            primaryHover: primary, // TODO: Adjust lightness
            primaryActive: primary,

            secondary: isDark ? '#2d3748' : '#e2e8f0',
            secondaryHover: isDark ? '#4a5568' : '#cbd5e1',

            accent: accent,
            accentHover: accent,

            background: background,
            backgroundSecondary: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            backgroundTertiary: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',

            text: text,
            textSecondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            textMuted: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            textInverse: isDark ? '#000000' : '#ffffff',

            border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderHover: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',

            glassBackground: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
            glassBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },

        typography: {
            fontHeading: '"Inter", sans-serif',
            fontBody: '"Inter", sans-serif',
            fontMono: '"JetBrains Mono", monospace',
            fontSizeScale: 'md',
        },

        radii: {
            card: '16px',
            button: '8px',
            input: '8px',
            modal: '16px',
        },

        shadows: {
            card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            popover: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },

        components: {
            Card: { variant: 'elevated' },
            Button: { variant: 'solid' },
            Input: { variant: 'outline' },
        },

        glassBlur: '12px',
        density: 'comfortable',
    };
}

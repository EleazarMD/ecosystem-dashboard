/**
 * Color Extraction & Palette Generation
 * Extracts dominant colors from images and generates harmonious theme palettes
 */

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

interface ColorPalette {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  accent: string;
  accentHover: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderHover: string;
}

/**
 * Extract dominant colors from an image using canvas
 */
export async function extractColorsFromImage(
  imageFile: File,
  numColors: number = 5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Resize for performance (sample at lower resolution)
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Extract colors using k-means clustering
        const colors = kMeansClustering(pixels, numColors);
        
        // Convert to hex
        const hexColors = colors.map(rgbToHex);
        
        resolve(hexColors);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * K-means clustering to find dominant colors
 */
function kMeansClustering(pixels: Uint8ClampedArray, k: number): RGB[] {
  const points: RGB[] = [];
  
  // Sample pixels (every 4th pixel for performance)
  for (let i = 0; i < pixels.length; i += 16) {
    points.push({
      r: pixels[i],
      g: pixels[i + 1],
      b: pixels[i + 2],
    });
  }
  
  // Initialize centroids randomly
  let centroids: RGB[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(points[Math.floor(Math.random() * points.length)]);
  }
  
  // Run k-means iterations
  const maxIterations = 10;
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const clusters: RGB[][] = Array(k).fill(null).map(() => []);
    
    for (const point of points) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < k; i++) {
        const dist = colorDistance(point, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }
      
      clusters[closestCluster].push(point);
    }
    
    // Recalculate centroids
    centroids = clusters.map(cluster => {
      if (cluster.length === 0) return centroids[0]; // Handle empty clusters
      
      const sum = cluster.reduce(
        (acc, point) => ({
          r: acc.r + point.r,
          g: acc.g + point.g,
          b: acc.b + point.b,
        }),
        { r: 0, g: 0, b: 0 }
      );
      
      return {
        r: Math.round(sum.r / cluster.length),
        g: Math.round(sum.g / cluster.length),
        b: Math.round(sum.b / cluster.length),
      };
    });
  }
  
  return centroids;
}

/**
 * Calculate color distance in RGB space
 */
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Convert RGB to hex
 */
function rgbToHex(rgb: RGB): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Generate a complete theme palette from extracted colors
 */
export function generateThemePalette(
  dominantColors: string[],
  mode: 'light' | 'dark' = 'dark'
): ColorPalette {
  // Sort colors by saturation and lightness
  const sortedColors = dominantColors
    .map(hex => ({ hex, hsl: rgbToHsl(hexToRgb(hex)) }))
    .sort((a, b) => {
      // Prioritize saturated colors for primary
      return (b.hsl.s * b.hsl.l) - (a.hsl.s * a.hsl.l);
    });
  
  // Select primary (most vibrant)
  const primaryHsl = sortedColors[0].hsl;
  const primary = sortedColors[0].hex;
  
  // Generate primary variants
  const primaryHover = hslToHex({ ...primaryHsl, l: primaryHsl.l - 10 });
  const primaryActive = hslToHex({ ...primaryHsl, l: primaryHsl.l - 20 });
  
  // Select accent (complementary or analogous)
  const accentHsl = sortedColors[1] ? sortedColors[1].hsl : {
    h: (primaryHsl.h + 180) % 360, // Complementary
    s: primaryHsl.s * 0.8,
    l: primaryHsl.l,
  };
  const accent = hslToHex(accentHsl);
  const accentHover = hslToHex({ ...accentHsl, l: accentHsl.l - 10 });
  
  // Generate backgrounds and text based on mode
  if (mode === 'dark') {
    return {
      primary,
      primaryHover,
      primaryActive,
      accent,
      accentHover,
      background: '#0F172A',
      backgroundSecondary: '#1E293B',
      backgroundTertiary: '#334155',
      text: '#F1F5F9',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      border: '#334155',
      borderHover: '#475569',
    };
  } else {
    return {
      primary,
      primaryHover,
      primaryActive,
      accent,
      accentHover,
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAFC',
      backgroundTertiary: '#F1F5F9',
      text: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      border: '#E2E8F0',
      borderHover: '#CBD5E1',
    };
  }
}

/**
 * Helper to convert HSL to hex
 */
function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Analyze image brightness to suggest light/dark mode
 */
export function suggestThemeMode(dominantColors: string[]): 'light' | 'dark' {
  const avgLightness = dominantColors
    .map(hex => rgbToHsl(hexToRgb(hex)).l)
    .reduce((sum, l) => sum + l, 0) / dominantColors.length;
  
  return avgLightness < 50 ? 'dark' : 'light';
}

/**
 * Validate WCAG contrast ratio
 */
export function checkContrast(foreground: string, background: string): number {
  const rgb1 = hexToRgb(foreground);
  const rgb2 = hexToRgb(background);
  
  const luminance = (rgb: RGB) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const lum1 = luminance(rgb1);
  const lum2 = luminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

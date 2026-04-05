/**
 * Child Dashboard Themes
 * 
 * Themed experiences for child accounts, integrated with the
 * main dashboard ThemePreset system.
 * 
 * - Pusheen: Soft pastels, cute cat aesthetic (Sofia, 9 y.o.)
 * - Minecraft: Blocky, pixelated, adventure theme (Luca, 7 y.o.)
 */

import { ThemePreset } from '@/theme/types';

export type ChildThemeId = 'child-default' | 'child-pusheen' | 'child-minecraft';

/**
 * Child-specific extras that extend the base ThemePreset
 */
export interface ChildThemeExtras {
  themeName?: 'minecraft' | 'pusheen' | 'default';
  ageRange: string;
  avatar: {
    default: string;
    options: string[];
  };
  decorations: {
    emoji: string[];
    cardStyle: 'rounded' | 'pixelated' | 'soft';
    backgroundImages?: {
      home?: string;
      chat?: string;
      email?: string;
      dictionary?: string;
      journal?: string;
      default?: string;
    };
    headerBanner?: {
      background?: string;
      pattern?: string;
      texture?: string;
    };
  };
  serviceIcons: {
    home?: string;
    chat: string;
    art: string;
    writing: string;
    email: string;
    planner?: string;
    clock?: string;
    books?: string;
    camera?: string;
    dictionary?: string;
    journal?: string;
  };
  welcomeMessages: string[];
  badges: {
    firstChat: string;
    streak3: string;
    streak7: string;
    helper: string;
    creative: string;
  };
  widgets?: string[];
}

export type ChildTheme = ThemePreset & { childExtras: ChildThemeExtras };

// ============================================================
// PUSHEEN THEME - Soft, cute, pastel cat aesthetic (Sofia, 9 y.o.)
// ============================================================
export const pusheenTheme: ChildTheme = {
  id: 'child-pusheen',
  name: 'Pusheen',
  description: 'Cute and cozy with Pusheen the cat!',
  mode: 'light',

  colors: {
    primary: '#8B7355',           // Pusheen brown
    primaryHover: '#7A6548',
    primaryActive: '#695739',
    secondary: '#F5E6D3',         // Cream
    secondaryHover: '#EDD9C0',
    accent: '#FFB6C1',            // Light pink
    accentHover: '#FFA0AE',

    background: '#FFF5EE',        // Seashell (fallback, pattern used in CSS)
    backgroundSecondary: 'rgba(255, 255, 255, 0.75)',  // More transparent for background visibility
    backgroundTertiary: 'rgba(255, 240, 230, 0.8)',

    text: '#5D4E37',
    textSecondary: '#7A6B54',
    textMuted: '#9B8B7A',
    textInverse: '#FFFFFF',

    border: '#F5E6D3',
    borderHover: '#EDD9C0',

    glassBackground: 'rgba(255, 245, 238, 0.8)',
    glassBorder: '1px solid rgba(139, 115, 85, 0.2)',
  },

  typography: {
    fontHeading: '"Nunito", "Comic Neue", sans-serif',
    fontBody: '"Nunito", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    fontSizeScale: 'md',
  },

  radii: {
    card: '24px',
    button: '20px',
    input: '16px',
    modal: '28px',
  },

  shadows: {
    card: '0 4px 20px rgba(139, 115, 85, 0.15)',
    cardHover: '0 8px 30px rgba(139, 115, 85, 0.2)',
    popover: '0 10px 40px rgba(139, 115, 85, 0.2)',
    modal: '0 20px 60px rgba(139, 115, 85, 0.25)',
  },

  components: {
    Card: { variant: 'elevated' },
    Button: { variant: 'solid' },
    Input: { variant: 'outline' },
  },

  glassBlur: '16px',
  density: 'comfortable',

  childExtras: {
    themeName: 'pusheen',
    ageRange: '8-12',
    avatar: {
      default: '/themes/pusheen/Widgets/pusheen-cat-drawing.png',  // Pusheen theme icon
      options: [
        '/themes/pusheen/Widgets/pusheen-cat-drawing.png',
        '/themes/pusheen/Widgets/parakeet-bird.png',
        '/themes/pusheen/Widgets/shooting-star.png',
        '/themes/pusheen/Widgets/donut-sweet.png',
        '/themes/pusheen/Widgets/butterfly-nature.png',
        '/themes/pusheen/Widgets/rawr-text.png',
      ],
    },
    decorations: {
      emoji: ['🐱', '💕', '🌸', '☁️', '⭐', '🍩', '🧁', '🎀', '💫', '🌈'],
      cardStyle: 'soft',
      backgroundImages: {
        home: '/themes/pusheen/Wallpapers/1.jpg',
        chat: '/themes/pusheen/Wallpapers/2.jpg',
        email: '/themes/pusheen/Wallpapers/3.jpg',
        journal: '/themes/pusheen/Wallpapers/1.jpg',
        default: '/themes/pusheen/Wallpapers/4.jpg',
      },
      headerBanner: {
        background: 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 50%, #FFB6C1 100%)',
        pattern: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
        texture: 'data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="30" cy="30" r="2" fill="%23fff" opacity="0.3"/%3E%3Ccircle cx="10" cy="10" r="1.5" fill="%23fff" opacity="0.2"/%3E%3Ccircle cx="50" cy="20" r="1" fill="%23fff" opacity="0.25"/%3E%3C/svg%3E',
      },
    },
    serviceIcons: {
      home: '/themes/pusheen/Icons/W-Clan.png',
      chat: '/themes/pusheen/Icons/Messages.png',
      art: '/themes/pusheen/Icons/Photos.png',
      writing: '/themes/pusheen/Icons/Notes.png',
      email: '/themes/pusheen/Icons/Mail.png',
      planner: '/themes/pusheen/Icons/Calendar.png',
      clock: '/themes/pusheen/Icons/Clock.png',
      books: '/themes/pusheen/Icons/Books.png',
      camera: '/themes/pusheen/Icons/Camera.png',
      dictionary: '/themes/pusheen/Icons/Books.png',
      journal: '/themes/pusheen/Icons/Notes.png',
    },
    welcomeMessages: [
      "Hi there! 🐱 I'm your cozy helper. What shall we do today?",
      "Meow! 😺 Ready for some fun? Let's chat!",
      "Hello friend! 💕 I'm here to help you with anything!",
      "*purrs* 🐾 What would you like to talk about?",
    ],
    badges: {
      firstChat: '🐱',
      streak3: '⭐',
      streak7: '🌟',
      helper: '💕',
      creative: '🎨',
    },
    // Pusheen widget images for decorations
    widgets: [
      '/themes/pusheen/Widgets/donut-sweet-alt.png',
      '/themes/pusheen/Widgets/parakeet-bird-alt.png',
      '/themes/pusheen/Widgets/shooting-star-alt.png',
      '/themes/pusheen/Widgets/pusheen-cat-drawing-alt.png',
      '/themes/pusheen/Widgets/butterfly-nature-alt.png',
      '/themes/pusheen/Widgets/rawr-text-alt.png',
    ],
  },
};

// ============================================================
// MINECRAFT THEME - Blocky, adventurous, pixelated (Luca, 7 y.o.)
// ============================================================
export const minecraftTheme: ChildTheme = {
  id: 'child-minecraft',
  name: 'Minecraft',
  description: 'Build and explore like in Minecraft!',
  mode: 'light',

  colors: {
    primary: '#5D8C3E',           // Grass green
    primaryHover: '#4E7A33',
    primaryActive: '#3F6828',
    secondary: '#55CDFC',         // Diamond blue (changed from brown)
    secondaryHover: '#3DC1FA',
    accent: '#55CDFC',            // Diamond blue
    accentHover: '#3DC1FA',

    background: '#87CEEB',        // Sky blue
    backgroundSecondary: 'rgba(135, 206, 235, 0.75)', // Sky blue tint - more boy-friendly
    backgroundTertiary: 'rgba(152, 216, 170, 0.8)',   // Light green

    text: '#2C2C2C',
    textSecondary: '#4A4A4A',
    textMuted: '#5A5A5A',
    textInverse: '#FFFFFF',

    border: '#5D8C3E',            // Green border instead of brown
    borderHover: '#55CDFC',       // Blue on hover

    glassBackground: 'rgba(135, 206, 235, 0.85)',  // Sky blue glass
    glassBorder: '2px solid #5D8C3E',
  },

  typography: {
    fontHeading: '"VT323", "Press Start 2P", monospace',
    fontBody: '"Nunito", sans-serif',
    fontMono: '"VT323", monospace',
    fontSizeScale: 'lg',
  },

  radii: {
    card: '4px',      // Blocky/pixelated
    button: '4px',
    input: '4px',
    modal: '4px',
  },

  shadows: {
    card: '4px 4px 0px #5D8C3E',
    cardHover: '6px 6px 0px #55CDFC',
    popover: '4px 4px 0px #8B5A2B',
    modal: '8px 8px 0px #5D8C3E',
  },

  components: {
    Card: { variant: 'outline' },
    Button: { variant: 'solid' },
    Input: { variant: 'filled' },
  },

  glassBlur: '0px',   // No blur for pixelated look
  density: 'comfortable',

  childExtras: {
    themeName: 'minecraft',
    ageRange: '6-10',
    avatar: {
      default: '/themes/minecraft/Widgets/creeper-face.png',  // Minecraft theme icon
      options: [
        '/themes/minecraft/Widgets/creeper-face.png',
        '/themes/minecraft/Widgets/steve-character-blue.png',
        '/themes/minecraft/Widgets/steve-character-green.png',
        '/themes/minecraft/Widgets/tnt-block.png',
        '/themes/minecraft/Widgets/diamond-sword.png',
        '/themes/minecraft/Widgets/creeper-enderman.png',
      ],
    },
    decorations: {
      emoji: ['⛏️', '💎', '🗡️', '🧱', '🌲', '🔥', '⭐', '🎮', '🏆', '💪'],
      cardStyle: 'pixelated',
      backgroundImages: {
        home: '/themes/minecraft/Wallpapers/1.png',
        chat: '/themes/minecraft/Wallpapers/2.png',
        email: '/themes/minecraft/Wallpapers/3.png',
        dictionary: '/themes/minecraft/Wallpapers/4.png',
        journal: '/themes/minecraft/Wallpapers/1.png',
        default: '/themes/minecraft/Wallpapers/4.png',
      },
      headerBanner: {
        background: 'linear-gradient(180deg, #3d6b1f 0%, #2d5016 50%, #1a3010 100%)',
        pattern: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='tnt' x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Crect width='40' height='40' fill='%23dc143c'/%3E%3Crect x='2' y='2' width='36' height='36' fill='%23ff1744'/%3E%3Crect x='4' y='4' width='32' height='32' fill='%23dc143c'/%3E%3Crect x='0' y='15' width='40' height='10' fill='%23ffd700'/%3E%3Crect x='2' y='16' width='36' height='8' fill='%23ffeb3b'/%3E%3Ctext x='8' y='24' font-family='Arial Black' font-size='10' font-weight='bold' fill='%23000' letter-spacing='-1'%3ETNT%3C/text%3E%3Crect x='0' y='0' width='40' height='1' fill='%23000' opacity='0.3'/%3E%3Crect x='0' y='39' width='40' height='1' fill='%23000' opacity='0.3'/%3E%3Crect x='0' y='0' width='1' height='40' fill='%23000' opacity='0.3'/%3E%3Crect x='39' y='0' width='1' height='40' fill='%23000' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='80' height='80' fill='url(%23tnt)'/%3E%3C/svg%3E")`,
        texture: `
          repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 8px,
            rgba(0,0,0,0.05) 8px,
            rgba(0,0,0,0.05) 9px
          ),
          repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 8px,
            rgba(0,0,0,0.05) 8px,
            rgba(0,0,0,0.05) 9px
          ),
          linear-gradient(
            135deg,
            rgba(255,255,255,0.1) 0%,
            transparent 50%,
            rgba(0,0,0,0.1) 100%
          )
        `,
      },
    },
    serviceIcons: {
      home: '/themes/minecraft/Icons/Minecraft.png',
      chat: '/themes/minecraft/Icons/Messages.png',
      art: '/themes/minecraft/Icons/Photos.png',
      writing: '/themes/minecraft/Icons/Notes.png',
      email: '/themes/minecraft/Icons/Mail.png',
      planner: '/themes/minecraft/Icons/Calendar.png',
      clock: '/themes/minecraft/Icons/Clock.png',
      books: '/themes/minecraft/Icons/Books.png',
      camera: '/themes/minecraft/Icons/Camera.png',
      dictionary: '/themes/minecraft/Icons/Books.png',
      journal: '/themes/minecraft/Icons/Notes.png',
    },
    welcomeMessages: [
      "Hey there, adventurer! ⛏️ Ready to explore?",
      "Welcome back! 💎 What quest shall we go on today?",
      "Let's build something awesome! 🧱 What do you need help with?",
      "Achievement unlocked: New chat! 🏆 What's on your mind?",
    ],
    badges: {
      firstChat: '⛏️',
      streak3: '💎',
      streak7: '🏆',
      helper: '🛡️',
      creative: '🎨',
    },
    // Minecraft widget images for decorations
    widgets: [
      '/themes/minecraft/Widgets/diamond-sword.png',
      '/themes/minecraft/Widgets/spawn-egg.png',
      '/themes/minecraft/Widgets/Medium-widget-1.png',
      '/themes/minecraft/Widgets/Medium-widget-2.png',
      '/themes/minecraft/Widgets/Medium-widget-3.png',
      '/themes/minecraft/Widgets/Medium-widget-4.png',
    ],
  },
};

// ============================================================
// DEFAULT CHILD THEME - Generic child-friendly rainbow
// ============================================================
export const defaultChildTheme: ChildTheme = {
  id: 'child-default',
  name: 'Rainbow',
  description: 'Colorful and fun for everyone!',
  mode: 'light',

  colors: {
    primary: '#667eea',
    primaryHover: '#5a6fd6',
    primaryActive: '#4e60c2',
    secondary: '#764ba2',
    secondaryHover: '#6a4392',
    accent: '#FF6B9D',
    accentHover: '#FF5588',

    background: '#F8FAFC',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#EDF2F7',

    text: '#2D3748',
    textSecondary: '#4A5568',
    textMuted: '#718096',
    textInverse: '#FFFFFF',

    border: '#E2E8F0',
    borderHover: '#CBD5E0',

    glassBackground: 'rgba(255, 255, 255, 0.8)',
    glassBorder: '1px solid rgba(102, 126, 234, 0.2)',
  },

  typography: {
    fontHeading: '"Nunito", "Comic Neue", sans-serif',
    fontBody: '"Nunito", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    fontSizeScale: 'md',
  },

  radii: {
    card: '16px',
    button: '9999px',  // Fully rounded
    input: '12px',
    modal: '20px',
  },

  shadows: {
    card: '0 4px 15px rgba(102, 126, 234, 0.15)',
    cardHover: '0 8px 25px rgba(102, 126, 234, 0.2)',
    popover: '0 10px 40px rgba(102, 126, 234, 0.2)',
    modal: '0 20px 60px rgba(102, 126, 234, 0.25)',
  },

  components: {
    Card: { variant: 'elevated' },
    Button: { variant: 'solid' },
    Input: { variant: 'outline' },
  },

  glassBlur: '12px',
  density: 'comfortable',

  childExtras: {
    themeName: 'default',
    ageRange: '6-12',
    avatar: {
      default: '🦊',
      options: ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐶', '🐱', '🐰', '🐻', '🦖'],
    },
    decorations: {
      emoji: ['✨', '🌟', '🎉', '🌈', '💫', '⭐', '🎨', '🚀', '🎮', '🎯'],
      cardStyle: 'rounded',
    },
    serviceIcons: {
      chat: '💬',
      art: '🎨',
      writing: '✏️',
      email: '✉️',
    },
    welcomeMessages: [
      "Hi there! 👋 I'm your AI helper. What would you like to talk about today?",
      "Hello friend! ✨ Ready for some fun?",
      "Hey! 🌟 What can I help you with?",
    ],
    badges: {
      firstChat: '🎉',
      streak3: '⭐',
      streak7: '🏆',
      helper: '💪',
      creative: '🎨',
    },
  },
};

// ============================================================
// THEME REGISTRY
// ============================================================
export const childThemes: Record<ChildThemeId, ChildTheme> = {
  'child-default': defaultChildTheme,
  'child-pusheen': pusheenTheme,
  'child-minecraft': minecraftTheme,
};

export function getChildTheme(themeId: ChildThemeId | string | null | undefined): ChildTheme {
  if (themeId && themeId in childThemes) {
    return childThemes[themeId as ChildThemeId];
  }
  return defaultChildTheme;
}

export function getRandomWelcomeMessage(theme: ChildTheme): string {
  const messages = theme.childExtras.welcomeMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getThemedEmoji(theme: ChildTheme): string {
  const emojis = theme.childExtras.decorations.emoji;
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Get child themes as ThemePresets for registration with main theme system
 */
export function getChildThemePresets(): ThemePreset[] {
  return Object.values(childThemes);
}

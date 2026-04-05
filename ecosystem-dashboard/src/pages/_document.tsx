import React from 'react';
import { ColorModeScript } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import theme from '@/styles/theme';

export default class MyDocument extends Document {

  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Modern Inter font */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          {/* Minecraft-style fonts for child themes */}
          <link href="https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&display=swap" rel="stylesheet" />
          {/* Emotion insertion point for consistent style order */}
          <meta name="emotion-insertion-point" content="" />
          {/* Prevent browser extension errors from affecting the application */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Defensive programming against browser extension errors
                window.addEventListener('error', function(e) {
                  // Suppress content script errors from browser extensions
                  if ((e.filename && e.filename.includes('content.js')) || 
                      (e.message && (e.message.includes('Extension context invalidated') || 
                                   e.message.includes('sendMessage')))) {
                    e.preventDefault();
                    console.warn('Suppressed browser extension error:', e.message);
                    return false;
                  }
                });
                
                // Handle unhandled promise rejections from extensions
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && e.reason.message && 
                      e.reason.message.includes('Extension context invalidated')) {
                    e.preventDefault();
                    console.warn('Suppressed extension context error');
                    return false;
                  }
                });
                
                // Provide fallback for extension APIs if they don't exist
                if (typeof chrome === 'undefined') {
                  window.chrome = {};
                }
                if (typeof chrome.runtime === 'undefined') {
                  chrome.runtime = {
                    sendMessage: function() {
                      console.warn('Chrome extension runtime not available');
                    }
                  };
                }
              `
            }}
          />
        </Head>
        <body>
          {/* Persist Chakra color mode to avoid mismatch */}
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

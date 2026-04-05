/**
 * noVNC Keyboard Relay — postMessage Bridge
 *
 * Drop this file into the noVNC container at /usr/share/novnc/app/keyboard-relay.js
 * and add to vnc.html:
 *   <script type="module" src="app/keyboard-relay.js"></script>
 *
 * Listens for postMessage events from the parent window (Tesla dashboard)
 * and translates them into RFB keystrokes or clipboard paste operations.
 *
 * Protocol:
 *   { type: 'keyboard', key: 'a' }           → sendKey for character 'a'
 *   { type: 'keyboard', key: 'Backspace' }    → sendKey for Backspace
 *   { type: 'keyboard', key: 'Enter' }        → sendKey for Enter
 *   { type: 'clipboard', text: 'hello' }      → clipboardPasteFrom('hello')
 *   { type: 'typestring', text: 'hello' }     → sendKey for each character sequentially
 */

import UI from "./ui.js";

// X11 keysym mapping for special keys
const SPECIAL_KEYS = {
  'Backspace':  0xff08,
  'Tab':        0xff09,
  'Enter':      0xff0d,
  'Escape':     0xff1b,
  'Delete':     0xffff,
  'ArrowLeft':  0xff51,
  'ArrowUp':    0xff52,
  'ArrowRight': 0xff53,
  'ArrowDown':  0xff54,
  'Home':       0xff50,
  'End':        0xff57,
  'PageUp':     0xff55,
  'PageDown':   0xff56,
  'Insert':     0xff63,
  'F1':         0xffbe,
  'F2':         0xffbf,
  'F3':         0xffc0,
  'F4':         0xffc1,
  'F5':         0xffc2,
  'Shift':      0xffe1,
  'Control':    0xffe3,
  'Alt':        0xffe9,
  'Meta':       0xffe7,
  ' ':          0x0020,  // Space
};

// Convert a single character to its X11 keysym
function charToKeysym(ch) {
  // Special keys
  if (SPECIAL_KEYS[ch] !== undefined) {
    return SPECIAL_KEYS[ch];
  }
  // Standard printable ASCII/Unicode → keysym is the Unicode code point
  const code = ch.charCodeAt(0);
  // Latin-1 range maps directly
  if (code >= 0x20 && code <= 0x7e) {
    return code;
  }
  // Extended Unicode: keysym = 0x01000000 + Unicode code point
  if (code > 0x00ff) {
    return 0x01000000 + code;
  }
  return code;
}

// Map key string to a DOM-like code for sendKey's second argument
function keyToCode(key) {
  if (key.length === 1) {
    const upper = key.toUpperCase();
    if (upper >= 'A' && upper <= 'Z') return 'Key' + upper;
    if (upper >= '0' && upper <= '9') return 'Digit' + upper;
  }
  // For special keys, the key name IS a reasonable code
  return key;
}

// Type a string character by character with small delays for reliability
function typeString(rfb, text) {
  let i = 0;
  function next() {
    if (i >= text.length) return;
    const ch = text[i];
    const keysym = charToKeysym(ch);
    const code = keyToCode(ch);
    rfb.sendKey(keysym, code);
    i++;
    // Small delay between keystrokes for the remote to process
    setTimeout(next, 30);
  }
  next();
}

// Listen for postMessage from parent (Tesla dashboard iframe host)
window.addEventListener('message', (event) => {
  // Safety: only process messages with our expected structure
  const data = event.data;
  if (!data || typeof data !== 'object' || !data.type) return;

  // Ensure RFB connection exists and is connected
  if (!UI.rfb) {
    console.warn('[keyboard-relay] No RFB connection');
    return;
  }

  switch (data.type) {
    case 'keyboard': {
      // Single keystroke
      const key = data.key;
      if (!key) return;
      const keysym = charToKeysym(key);
      const code = keyToCode(key);

      if (data.down !== undefined) {
        // Explicit keydown/keyup
        UI.rfb.sendKey(keysym, code, data.down);
      } else {
        // Press + release
        UI.rfb.sendKey(keysym, code);
      }
      break;
    }

    case 'clipboard': {
      // Send text to remote clipboard
      if (data.text) {
        UI.rfb.clipboardPasteFrom(data.text);
      }
      break;
    }

    case 'typestring': {
      // Type a string character by character (most reliable for text fields)
      if (data.text) {
        typeString(UI.rfb, data.text);
      }
      break;
    }

    default:
      // Unknown message type — ignore
      break;
  }
});

console.log('[keyboard-relay] postMessage bridge loaded — ready for Tesla dashboard keystrokes');

/**
 * MIDI Profile for Hercules DJ Control Mix Ultra
 * Optimized for Podcast Mixer control
 */

import { MIDIMapping } from '../midi-controller';

export const HerculesMixUltraProfile = {
  name: 'Hercules DJ Control Mix Ultra',
  manufacturer: 'Hercules',
  description: 'DJ controller with 2 decks, EQ knobs, and transport controls',
  
  mappings: new Map<number, MIDIMapping>([
    // ========================================
    // CHANNEL FADERS (Volume Control)
    // ========================================
    // Deck A Channel Fader - Controls Speaker 1 Volume
    [7, {
      type: 'fader' as const,
      channel: 1,
      target: 'speaker-1-volume'
    }],
    
    // Deck B Channel Fader - Controls Speaker 2 Volume  
    [15, {
      type: 'fader' as const,
      channel: 2,
      target: 'speaker-2-volume'
    }],
    
    // Crossfader - Controls Master Mix (if needed)
    [8, {
      type: 'fader' as const,
      channel: 9,
      target: 'master-mix'
    }],
    
    // ========================================
    // EQ KNOBS (Track Control)
    // ========================================
    // Deck A - High EQ → Track 3 Volume
    [16, {
      type: 'knob' as const,
      channel: 3,
      target: 'speaker-3-volume'
    }],
    
    // Deck A - Mid EQ → Track 4 Volume
    [17, {
      type: 'knob' as const,
      channel: 4,
      target: 'speaker-4-volume'
    }],
    
    // Deck A - Low EQ → Track 5 Volume
    [18, {
      type: 'knob' as const,
      channel: 5,
      target: 'speaker-5-volume'
    }],
    
    // Deck B - High EQ → Track 6 Volume
    [19, {
      type: 'knob' as const,
      channel: 6,
      target: 'speaker-6-volume'
    }],
    
    // Deck B - Mid EQ → Track 7 Volume
    [20, {
      type: 'knob' as const,
      channel: 7,
      target: 'speaker-7-volume'
    }],
    
    // Deck B - Low EQ → Track 8 Volume
    [21, {
      type: 'knob' as const,
      channel: 8,
      target: 'speaker-8-volume'
    }],
    
    // ========================================
    // GAIN KNOBS (Fine Control)
    // ========================================
    // Deck A Gain
    [14, {
      type: 'knob' as const,
      channel: 10,
      target: 'speaker-1-gain'
    }],
    
    // Deck B Gain
    [22, {
      type: 'knob' as const,
      channel: 11,
      target: 'speaker-2-gain'
    }],
    
    // ========================================
    // TRANSPORT BUTTONS (Mute/Solo)
    // ========================================
    // Deck A - Play Button → Mute Speaker 1
    [42, {
      type: 'button' as const,
      channel: 60,
      target: 'speaker-1-mute'
    }],
    
    // Deck B - Play Button → Mute Speaker 2
    [54, {
      type: 'button' as const,
      channel: 61,
      target: 'speaker-2-mute'
    }],
    
    // Deck A - Cue Button → Solo Speaker 1
    [43, {
      type: 'button' as const,
      channel: 62,
      target: 'speaker-1-solo'
    }],
    
    // Deck B - Cue Button → Solo Speaker 2
    [55, {
      type: 'button' as const,
      channel: 63,
      target: 'speaker-2-solo'
    }],
    
    // Deck A - Sync Button → Mute Track 3
    [36, {
      type: 'button' as const,
      channel: 64,
      target: 'speaker-3-mute'
    }],
    
    // Deck B - Sync Button → Mute Track 4
    [50, {
      type: 'button' as const,
      channel: 65,
      target: 'speaker-4-mute'
    }],
    
    // ========================================
    // PAD BUTTONS (Additional Functions)
    // ========================================
    // Hot Cue 1 (Deck A) → Mute Track 5
    [20, {
      type: 'button' as const,
      channel: 66,
      target: 'speaker-5-mute'
    }],
    
    // Hot Cue 2 (Deck A) → Mute Track 6
    [21, {
      type: 'button' as const,
      channel: 67,
      target: 'speaker-6-mute'
    }],
    
    // Hot Cue 1 (Deck B) → Mute Track 7
    [28, {
      type: 'button' as const,
      channel: 68,
      target: 'speaker-7-mute'
    }],
    
    // Hot Cue 2 (Deck B) → Mute Track 8
    [29, {
      type: 'button' as const,
      channel: 69,
      target: 'speaker-8-mute'
    }],
  ]),
  
  // Usage guide for users
  usage: {
    faders: {
      'Deck A Channel Fader': 'Speaker 1 Volume',
      'Deck B Channel Fader': 'Speaker 2 Volume',
      'Crossfader': 'Master Mix Balance'
    },
    knobs: {
      'Deck A EQ (High/Mid/Low)': 'Tracks 3/4/5 Volume',
      'Deck B EQ (High/Mid/Low)': 'Tracks 6/7/8 Volume',
      'Deck A/B Gain': 'Fine volume control'
    },
    buttons: {
      'Play/Cue Buttons': 'Mute/Solo main speakers',
      'Sync Buttons': 'Mute additional tracks',
      'Hot Cue Pads': 'Mute remaining tracks'
    }
  }
};

export default HerculesMixUltraProfile;

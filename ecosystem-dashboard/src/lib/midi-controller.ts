/**
 * MIDI Controller Integration for Podcast Mixer
 * Supports Bluetooth and USB MIDI controllers
 */

import { WebMidi, Input, Output } from 'webmidi';

export interface MIDIControllerConfig {
  onFaderChange?: (channel: number, value: number) => void;
  onKnobChange?: (knob: number, value: number) => void;
  onButtonPress?: (button: number) => void;
  onButtonRelease?: (button: number) => void;
}

export interface MIDIMapping {
  type: 'fader' | 'knob' | 'button';
  channel: number;
  target: string; // 'speaker-1-volume', 'speaker-2-eq', etc.
}

export class PodcastMixerMIDI {
  private input: Input | null = null;
  private output: Output | null = null;
  private config: MIDIControllerConfig;
  private mappings: Map<number, MIDIMapping> = new Map();
  private isEnabled: boolean = false;
  private learnMode: boolean = false;
  private learnCallback: ((cc: number) => void) | null = null;

  constructor(config: MIDIControllerConfig = {}) {
    this.config = config;
    this.initializeDefaultMappings();
  }

  /**
   * Initialize MIDI system
   */
  async initialize(): Promise<boolean> {
    // Only initialize MIDI in browser environment (not during SSR)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.log('⚠️ MIDI not available in server-side environment');
      return false;
    }

    try {
      await WebMidi.enable();
      console.log('✅ MIDI system enabled');
      this.isEnabled = true;
      
      // Auto-detect first available controller
      if (WebMidi.inputs.length > 0) {
        await this.connectToDevice(WebMidi.inputs[0].id);
        return true;
      }
      
      console.log('⚠️ No MIDI devices found');
      return false;
    } catch (error) {
      console.error('❌ MIDI initialization failed (non-critical):', error);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Connect to specific MIDI device
   */
  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      console.log(`🔍 Attempting to connect to device ID: ${deviceId}`);
      console.log(`🔍 Available inputs:`, WebMidi.inputs.map(i => ({ id: i.id, name: i.name })));
      
      const device = WebMidi.getInputById(deviceId);
      if (!device) {
        console.error(`❌ Device ${deviceId} not found`);
        console.error(`Available devices:`, WebMidi.inputs);
        return false;
      }

      console.log(`🔍 Device found:`, device);
      
      // Validate device before assignment
      if (!device || typeof device.addListener !== 'function') {
        console.error(`❌ Invalid MIDI device object - missing addListener method`);
        return false;
      }
      
      this.input = device;
      
      if (!this.input) {
        console.error(`❌ Device assignment failed - this.input is null`);
        return false;
      }
      
      // Only setup listeners if device is valid
      try {
        this.setupListeners();
      } catch (listenerError) {
        console.error('❌ Failed to setup MIDI listeners:', listenerError);
        this.input = null;
        return false;
      }
      
      console.log(`✅ Connected to MIDI controller: ${device.name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to device:', error);
      this.input = null;
      return false;
    }
  }

  /**
   * Setup MIDI event listeners
   */
  private setupListeners() {
    if (!this.input) {
      console.error('❌ Cannot setup listeners: this.input is null');
      return;
    }

    console.log('🎧 Setting up MIDI listeners for:', this.input.name);

    try {
      // Verify input still exists before adding listeners
      if (!this.input || typeof this.input.addListener !== 'function') {
        console.error('❌ MIDI input device lost or invalid before adding listeners');
        return;
      }

      // Control Change (CC) - Faders and Knobs
      this.input.addListener('controlchange', (e) => {
      const channel = e.controller.number;
      const value = Number(e.value) / 127; // Normalize to 0-1
      
      console.log(`🎛️ CC ${channel}: ${value.toFixed(2)}`);

      // Check if in learn mode
      if (this.learnMode && this.learnCallback) {
        this.learnCallback(channel);
        return;
      }

      // Get mapping for this CC
      const mapping = this.mappings.get(channel);
      
      if (mapping) {
        if (mapping.type === 'fader' && this.config.onFaderChange) {
          this.config.onFaderChange(channel, value);
        } else if (mapping.type === 'knob' && this.config.onKnobChange) {
          this.config.onKnobChange(channel, value);
        }
      }
    });

    // Note On - Buttons pressed
    this.input.addListener('noteon', (e) => {
      const button = e.note.number;
      console.log(`🔘 Button ${button} pressed`);
      
      if (this.config.onButtonPress) {
        this.config.onButtonPress(button);
      }
    });

    // Note Off - Buttons released
    this.input.addListener('noteoff', (e) => {
      const button = e.note.number;
      console.log(`🔘 Button ${button} released`);
      
      if (this.config.onButtonRelease) {
        this.config.onButtonRelease(button);
      }
    });
    } catch (error) {
      console.error('❌ Error setting up MIDI listeners:', error);
    }
  }

  /**
   * Default MIDI mappings for common controllers
   */
  private initializeDefaultMappings() {
    // Common fader mappings (CC 1-8)
    for (let i = 1; i <= 8; i++) {
      this.mappings.set(i, {
        type: 'fader',
        channel: i,
        target: `speaker-${i}-volume`
      });
    }

    // Common knob mappings (CC 10-17)
    for (let i = 10; i <= 17; i++) {
      this.mappings.set(i, {
        type: 'knob',
        channel: i,
        target: `speaker-${i - 9}-eq`
      });
    }

    // Common button mappings (Note 60-67)
    for (let i = 60; i <= 67; i++) {
      this.mappings.set(i, {
        type: 'button',
        channel: i,
        target: `speaker-${i - 59}-mute`
      });
    }
  }

  /**
   * Load a controller profile
   */
  loadProfile(profileMappings: Map<number, MIDIMapping>) {
    this.mappings = new Map(profileMappings);
    console.log(`🗺️ Loaded MIDI profile with ${profileMappings.size} mappings`);
  }

  /**
   * Add custom MIDI mapping
   */
  setMapping(cc: number, mapping: MIDIMapping) {
    this.mappings.set(cc, mapping);
    console.log(`🗺️ Mapped CC ${cc} to ${mapping.target}`);
  }

  /**
   * Get all mappings
   */
  getMappings(): Map<number, MIDIMapping> {
    return this.mappings;
  }

  /**
   * Enter MIDI learn mode
   */
  enterLearnMode(callback: (cc: number) => void) {
    this.learnMode = true;
    this.learnCallback = callback;
    console.log('🎓 MIDI Learn mode activated');
  }

  /**
   * Exit MIDI learn mode
   */
  exitLearnMode() {
    this.learnMode = false;
    this.learnCallback = null;
    console.log('🎓 MIDI Learn mode deactivated');
  }

  /**
   * Get list of available MIDI devices
   */
  getDevices(): Array<{ id: string; name: string; manufacturer: string }> {
    if (!this.isEnabled) return [];
    
    return WebMidi.inputs.map(input => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer || 'Unknown'
    }));
  }

  /**
   * Get currently connected device
   */
  getCurrentDevice(): { id: string; name: string } | null {
    if (!this.input) return null;
    
    return {
      id: this.input.id,
      name: this.input.name
    };
  }

  /**
   * Check if MIDI is enabled
   */
  isReady(): boolean {
    return this.isEnabled && this.input !== null;
  }

  /**
   * Connect to MIDI output (virtual MIDI port)
   */
  async connectToOutput(outputId?: string): Promise<boolean> {
    try {
      if (!this.isEnabled) {
        console.error('❌ MIDI system not enabled');
        return false;
      }

      // If no outputId specified, try to find IAC Driver (macOS) or loopMIDI (Windows)
      if (!outputId) {
        const virtualOutput = WebMidi.outputs.find(output => 
          output.name.toLowerCase().includes('iac') || 
          output.name.toLowerCase().includes('loopmidi') ||
          output.name.toLowerCase().includes('virtual')
        );
        
        if (virtualOutput) {
          this.output = virtualOutput;
          console.log(`✅ Connected to virtual MIDI output: ${virtualOutput.name}`);
          return true;
        }
        
        // If no virtual port, use first available output
        if (WebMidi.outputs.length > 0) {
          this.output = WebMidi.outputs[0];
          console.log(`✅ Connected to MIDI output: ${this.output.name}`);
          return true;
        }
        
        console.warn('⚠️ No MIDI outputs available');
        return false;
      }

      const device = WebMidi.getOutputById(outputId);
      if (!device) {
        console.error(`❌ Output device ${outputId} not found`);
        return false;
      }

      this.output = device;
      console.log(`✅ Connected to MIDI output: ${device.name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MIDI output:', error);
      return false;
    }
  }

  /**
   * Send MIDI Control Change message
   */
  sendCC(cc: number, value: number, channel: number = 1) {
    if (!this.output) {
      console.warn('⚠️ No MIDI output connected');
      return;
    }

    try {
      // Normalize value to 0-127 range
      const midiValue = Math.round(Math.max(0, Math.min(1, value)) * 127);
      this.output.sendControlChange(cc, midiValue, { channels: channel });
      console.log(`📤 MIDI OUT: CC ${cc} = ${midiValue} (${value.toFixed(2)}) on channel ${channel}`);
    } catch (error) {
      console.error('❌ Failed to send MIDI CC:', error);
    }
  }

  /**
   * Send MIDI Note On message
   */
  sendNoteOn(note: number, velocity: number = 127, channel: number = 1) {
    if (!this.output) {
      console.warn('⚠️ No MIDI output connected');
      return;
    }

    try {
      this.output.sendNoteOn(note, { channels: channel, rawAttack: velocity });
      console.log(`📤 MIDI OUT: Note ON ${note} velocity ${velocity} on channel ${channel}`);
    } catch (error) {
      console.error('❌ Failed to send MIDI Note On:', error);
    }
  }

  /**
   * Send MIDI Note Off message
   */
  sendNoteOff(note: number, channel: number = 1) {
    if (!this.output) {
      console.warn('⚠️ No MIDI output connected');
      return;
    }

    try {
      this.output.sendNoteOff(note, { channels: channel });
      console.log(`📤 MIDI OUT: Note OFF ${note} on channel ${channel}`);
    } catch (error) {
      console.error('❌ Failed to send MIDI Note Off:', error);
    }
  }

  /**
   * Get list of available MIDI outputs
   */
  getOutputDevices(): Array<{ id: string; name: string; manufacturer: string }> {
    if (!this.isEnabled) return [];
    
    return WebMidi.outputs.map(output => ({
      id: output.id,
      name: output.name,
      manufacturer: output.manufacturer || 'Unknown'
    }));
  }

  /**
   * Get currently connected output device
   */
  getCurrentOutput(): { id: string; name: string } | null {
    if (!this.output) return null;
    
    return {
      id: this.output.id,
      name: this.output.name
    };
  }

  /**
   * Disconnect from current device
   */
  disconnect() {
    if (this.input) {
      this.input.removeListener();
      this.input = null;
      console.log('🔌 MIDI input disconnected');
    }
    if (this.output) {
      this.output = null;
      console.log('🔌 MIDI output disconnected');
    }
  }

  /**
   * Cleanup and disable MIDI
   */
  destroy() {
    this.disconnect();
    if (this.isEnabled) {
      WebMidi.disable();
      this.isEnabled = false;
      console.log('❌ MIDI system disabled');
    }
  }
}

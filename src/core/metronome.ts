import { Vibration, Platform } from 'react-native';

/**
 * Generates an in-memory base64 WAV sound of a musical metronome click.
 * Frequency in Hz, duration in milliseconds with exponential decay.
 */
function createClickWavDataUri(freq: number, durationMs: number): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * (durationMs / 1000));
  const buffer = new Uint8Array(44 + numSamples * 2);

  const writeString = (str: string, offset: number) => {
    for (let i = 0; i < str.length; i++) {
      buffer[offset + i] = str.charCodeAt(i);
    }
  };

  const writeUint32LE = (val: number, offset: number) => {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
    buffer[offset + 2] = (val >> 16) & 0xff;
    buffer[offset + 3] = (val >> 24) & 0xff;
  };

  const writeUint16LE = (val: number, offset: number) => {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
  };

  // RIFF header
  writeString('RIFF', 0);
  writeUint32LE(36 + numSamples * 2, 4);
  writeString('WAVE', 8);
  writeString('fmt ', 12);
  writeUint32LE(16, 16); // subchunk1size
  writeUint16LE(1, 20); // audio format (PCM)
  writeUint16LE(1, 22); // mono
  writeUint32LE(sampleRate, 24);
  writeUint32LE(sampleRate * 2, 28);
  writeUint16LE(2, 32);
  writeUint16LE(16, 34);
  writeString('data', 36);
  writeUint32LE(numSamples * 2, 40);

  // Generate sine wave with decaying envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-i / (numSamples * 0.3));
    const sampleVal = Math.floor(Math.sin(2 * Math.PI * freq * t) * decay * 32767 * 0.95);
    const byteOffset = 44 + i * 2;
    buffer[byteOffset] = sampleVal & 0xff;
    buffer[byteOffset + 1] = (sampleVal >> 8) & 0xff;
  }

  // Convert Uint8Array to base64
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(buffer).toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

const HIGH_CLICK_URI = createClickWavDataUri(1100, 30);
const LOW_CLICK_URI = createClickWavDataUri(680, 22);

// Safely load expo-audio if available in Expo Go / native build
let ExpoAudio: typeof import('expo-audio') | null = null;
try {
  ExpoAudio = require('expo-audio');
} catch {
  ExpoAudio = null;
}

class SoundManager {
  private highPlayer: any = null;
  private lowPlayer: any = null;
  private isLoaded = false;
  private isLoading = false;

  private initAudio() {
    if (this.isLoaded || this.isLoading || !ExpoAudio?.createAudioPlayer) return;
    this.isLoading = true;

    try {
      this.highPlayer = ExpoAudio.createAudioPlayer({ uri: HIGH_CLICK_URI });
      this.lowPlayer = ExpoAudio.createAudioPlayer({ uri: LOW_CLICK_URI });
      this.isLoaded = true;
    } catch {
      // Fallback to haptics if audio initialization fails
    } finally {
      this.isLoading = false;
    }
  }

  async playClick(isFirstBeat: boolean): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        // Physical tactile pulse on device
        const vibDuration = isFirstBeat ? 20 : 10;
        Vibration.vibrate(vibDuration);

        // Sound click via expo-audio
        if (!this.isLoaded && !this.isLoading) {
          this.initAudio();
        }

        const player = isFirstBeat ? this.highPlayer : this.lowPlayer;
        if (player) {
          try {
            await player.seekTo(0);
            player.play();
          } catch {
            // ignore seek/play race conditions
          }
        }
      }
    } catch {
      // ignore
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      if (this.highPlayer?.remove) this.highPlayer.remove();
      if (this.lowPlayer?.remove) this.lowPlayer.remove();
    } catch {
      // ignore
    }
    this.highPlayer = null;
    this.lowPlayer = null;
    this.isLoaded = false;
  }
}

export const metronomeSounds = new SoundManager();

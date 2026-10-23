import { Platform } from 'react-native';

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

const CLICK_URI = createClickWavDataUri(980, 24);

// Safely load expo-audio if available in Expo Go / native build
let ExpoAudio: typeof import('expo-audio') | null = null;
try {
  ExpoAudio = require('expo-audio');
} catch {
  ExpoAudio = null;
}

class SoundManager {
  private clickPlayer: any = null;
  private isLoaded = false;
  private isLoading = false;
  private webAudioCtx: any = null;

  private initAudio() {
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;

    try {
      if (ExpoAudio?.createAudioPlayer) {
        this.clickPlayer = ExpoAudio.createAudioPlayer({ uri: CLICK_URI });
        this.isLoaded = true;
      }
    } catch {
      // Fallback
    } finally {
      this.isLoading = false;
    }
  }

  async playClick(_isFirstBeat?: boolean): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        // Sound click via expo-audio (unified sound across all beats, no vibration)
        if (!this.isLoaded && !this.isLoading) {
          this.initAudio();
        }

        if (this.clickPlayer) {
          try {
            await this.clickPlayer.seekTo(0);
            this.clickPlayer.play();
          } catch {
            // ignore seek/play race conditions
          }
        }
      } else {
        // Web Audio synthetic click fallback for testing in browser
        try {
          const AudioContextClass =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            if (!this.webAudioCtx) {
              this.webAudioCtx = new AudioContextClass();
            }
            if (this.webAudioCtx.state === 'suspended') {
              this.webAudioCtx.resume();
            }
            const osc = this.webAudioCtx.createOscillator();
            const gain = this.webAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(980, this.webAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, this.webAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.webAudioCtx.currentTime + 0.035);
            osc.connect(gain);
            gain.connect(this.webAudioCtx.destination);
            osc.start();
            osc.stop(this.webAudioCtx.currentTime + 0.04);
          }
        } catch {
          // ignore web audio errors
        }
      }
    } catch {
      // ignore
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.clickPlayer?.remove) this.clickPlayer.remove();
      if (this.webAudioCtx && this.webAudioCtx.close) {
        this.webAudioCtx.close().catch(() => {});
        this.webAudioCtx = null;
      }
    } catch {
      // ignore
    }
    this.clickPlayer = null;
    this.isLoaded = false;
  }
}

export const metronomeSounds = new SoundManager();

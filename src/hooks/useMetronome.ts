import { useState, useEffect, useRef, useCallback } from 'react';
import { metronomeSounds } from '../core/metronome';

interface UseMetronomeOptions {
  initialBpm?: number;
  timeSignature?: string;
  songKey?: string;
}

export function useMetronome({
  initialBpm = 115,
  timeSignature = '4/4',
  songKey,
}: UseMetronomeOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [currentBeat, setCurrentBeat] = useState(1);

  // Compute beats per measure from time signature (e.g. "4/4" -> 4, "3/4" -> 3, "6/8" -> 6)
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0] || '4', 10) || 4;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentBeatRef = useRef(1);
  const isPlayingRef = useRef(false);
  const bpmRef = useRef(bpm);

  const prevSongKeyRef = useRef(songKey);
  const prevInitialBpmRef = useRef(initialBpm);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentBeat(1);
    currentBeatRef.current = 1;
  }, []);

  // Update BPM ONLY when song changes or initialBpm changes (NEVER when stopping/pausing the metronome)
  useEffect(() => {
    const songChanged = songKey !== undefined && songKey !== prevSongKeyRef.current;
    const bpmChanged = initialBpm !== prevInitialBpmRef.current;

    if (songChanged) {
      prevSongKeyRef.current = songKey;
      prevInitialBpmRef.current = initialBpm;
      stop();
      if (initialBpm && initialBpm >= 30 && initialBpm <= 300) {
        bpmRef.current = initialBpm;
        setBpm(initialBpm);
      }
    } else if (bpmChanged) {
      prevInitialBpmRef.current = initialBpm;
      if (initialBpm && initialBpm >= 30 && initialBpm <= 300) {
        bpmRef.current = initialBpm;
        setBpm(initialBpm);
      }
    }
  }, [songKey, initialBpm, stop]);

  const tick = useCallback(() => {
    const nextBeat = currentBeatRef.current >= beatsPerMeasure ? 1 : currentBeatRef.current + 1;
    currentBeatRef.current = nextBeat;
    setCurrentBeat(nextBeat);

    // Audio click (high pitch on beat 1)
    metronomeSounds.playClick(nextBeat === 1);
  }, [beatsPerMeasure]);

  const start = useCallback(() => {
    currentBeatRef.current = 1;
    setCurrentBeat(1);
    metronomeSounds.playClick(true);

    const intervalMs = (60 / bpmRef.current) * 1000;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, intervalMs);

    setIsPlaying(true);
    isPlayingRef.current = true;
  }, [tick]);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  const changeBpm = useCallback(
    (newBpm: number) => {
      const clamped = Math.max(30, Math.min(280, Math.round(newBpm)));
      bpmRef.current = clamped;
      setBpm(clamped);
      if (isPlayingRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        const intervalMs = (60 / clamped) * 1000;
        timerRef.current = setInterval(tick, intervalMs);
      }
    },
    [tick]
  );

  const stepBpm = useCallback(
    (delta: number) => {
      changeBpm(bpmRef.current + delta);
    },
    [changeBpm]
  );

  const tapTimesRef = useRef<number[]>([]);

  const tapTempo = useCallback(() => {
    const now = Date.now();
    // Keep taps from the last 2.5 seconds (resets if user pauses longer)
    const recent = tapTimesRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      let totalDelta = 0;
      for (let i = 1; i < recent.length; i++) {
        totalDelta += recent[i] - recent[i - 1];
      }
      const avgDeltaMs = totalDelta / (recent.length - 1);
      if (avgDeltaMs > 180 && avgDeltaMs < 2000) {
        const calculatedBpm = Math.round(60000 / avgDeltaMs);
        changeBpm(calculatedBpm);
      }
    }
  }, [changeBpm]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      metronomeSounds.cleanup();
    };
  }, []);

  return {
    isPlaying,
    bpm,
    currentBeat,
    beatsPerMeasure,
    toggle,
    stop,
    setBpm: changeBpm,
    stepBpm,
    tapTempo,
  };
}

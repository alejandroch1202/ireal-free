import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '../theme/theme';

interface MetronomeBarProps {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beatsPerMeasure: number;
  currentKey: string;
  timeSignature?: string;
  theme: ThemeColors;
  onTogglePlay: () => void;
  onStepBpm: (delta: number) => void;
  onTapTempo: () => void;
}

export const MetronomeBar: React.FC<MetronomeBarProps> = ({
  isPlaying,
  bpm,
  currentBeat,
  beatsPerMeasure,
  currentKey,
  timeSignature = '4/4',
  theme,
  onTogglePlay,
  onStepBpm,
  onTapTempo,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.mode === 'dark' ? '#0f171e' : '#f8fafc',
          borderTopColor: theme.topBarBorder,
        },
      ]}
    >
      {/* Left: BPM Controls (Tap -1/+1, Hold -5/+5) & TAP Button */}
      <View style={styles.tempoSection}>
        <TouchableOpacity
          style={[styles.bpmStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={() => onStepBpm(-1)}
          onLongPress={() => onStepBpm(-5)}
          delayLongPress={350}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 2 }}
        >
          <Text style={[styles.bpmStepText, { color: theme.btnText }]}>-</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bpmDisplay}
          onPress={onTapTempo}
          activeOpacity={0.6}
        >
          <Text style={[styles.bpmNumber, { color: theme.textPrimary }]}>{bpm}</Text>
          <Text style={[styles.bpmLabel, { color: theme.textSecondary }]}>BPM</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bpmStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={() => onStepBpm(1)}
          onLongPress={() => onStepBpm(5)}
          delayLongPress={350}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 2, right: 6 }}
        >
          <Text style={[styles.bpmStepText, { color: theme.btnText }]}>+</Text>
        </TouchableOpacity>

        {/* Tap Tempo Button */}
        <TouchableOpacity
          style={[styles.tapBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={onTapTempo}
          activeOpacity={0.6}
        >
          <Text style={[styles.tapBtnText, { color: theme.activeKeyBg || '#0284c7' }]}>
            TAP
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center: Play / Pause Button & Beat Visualizer */}
      <View style={styles.centerSection}>
        <TouchableOpacity
          style={[
            styles.playButton,
            isPlaying ? styles.playButtonActive : styles.playButtonIdle,
          ]}
          onPress={onTogglePlay}
          activeOpacity={0.8}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Flashing Beat Dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: beatsPerMeasure }).map((_, idx) => {
            const beatNum = idx + 1;
            const isCurrent = isPlaying && currentBeat === beatNum;
            const isAccent = beatNum === 1;

            return (
              <View
                key={beatNum}
                style={[
                  styles.beatDot,
                  {
                    backgroundColor: isCurrent
                      ? isAccent
                        ? '#38bdf8'
                        : '#93c5fd'
                      : theme.mode === 'dark'
                      ? '#334155'
                      : '#cbd5e1',
                    transform: [{ scale: isCurrent ? 1.35 : 1.0 }],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Right: Key & Meter Badge */}
      <View style={styles.rightSection}>
        <View style={[styles.infoPill, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}>
          <Text style={[styles.infoPillText, { color: theme.textPrimary }]}>{currentKey}</Text>
        </View>
        <View style={[styles.infoPill, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}>
          <Text style={[styles.infoPillText, { color: theme.textSecondary }]}>{timeSignature}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderTopWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  tempoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
  },
  bpmStepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bpmStepText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  bpmDisplay: {
    alignItems: 'center',
    minWidth: 42,
  },
  bpmNumber: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  bpmLabel: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tapBtn: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapBtnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIdle: {
    backgroundColor: '#0284c7',
  },
  playButtonActive: {
    backgroundColor: '#f59e0b',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  beatDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  infoPill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  infoPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

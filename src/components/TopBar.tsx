import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SongAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface TopBarProps {
  song: SongAST;
  originalKey: string;
  theme: ThemeColors;
  hasPrevSong: boolean;
  hasNextSong: boolean;
  onTransposeStep: (step: number) => void;
  onOpenSettings: () => void;
  onOpenPlaylists: () => void;
  onPrevSong: () => void;
  onNextSong: () => void;
  onToggleFullScreen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  song,
  originalKey,
  theme,
  hasPrevSong,
  hasNextSong,
  onTransposeStep,
  onOpenSettings,
  onOpenPlaylists,
  onPrevSong,
  onNextSong,
  onToggleFullScreen,
}) => {
  const isTransposed = song.transposeAmount !== 0;

  // Compact metadata string (e.g. "Pop • ♩115 • 4/4")
  const metaParts: string[] = [];
  if (song.style) metaParts.push(song.style);
  if (song.tempo) metaParts.push(`♩${song.tempo}`);
  if (song.timeSignature) metaParts.push(song.timeSignature);
  const metaString = metaParts.join(' • ');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.topBarBackground,
          borderBottomColor: theme.topBarBorder,
        },
      ]}
    >
      {/* Left: Previous Song Navigation Arrow ‹ */}
      <TouchableOpacity
        style={[
          styles.songNavBtn,
          { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
          !hasPrevSong && styles.btnDisabled,
        ]}
        onPress={onPrevSong}
        disabled={!hasPrevSong}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
      >
        <Text
          style={[
            styles.songNavText,
            { color: hasPrevSong ? theme.textPrimary : theme.textSecondary },
          ]}
        >
          ‹
        </Text>
      </TouchableOpacity>

      {/* Center: Clickable Song Info Area (Opens Playlists & Library directly) */}
      <TouchableOpacity
        style={styles.infoColBtn}
        onPress={onOpenPlaylists}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {song.title}
          </Text>
          <View
            style={[
              styles.playlistIndicatorBadge,
              { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
            ]}
          >
            <Text style={[styles.playlistIndicatorText, { color: theme.activeKeyBg || '#0284c7' }]}>
              ▼
            </Text>
          </View>
        </View>
        <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
          {metaString || 'Toca para cambiar canción'}
        </Text>
      </TouchableOpacity>

      {/* Next Song Navigation Arrow › */}
      <TouchableOpacity
        style={[
          styles.songNavBtn,
          { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
          !hasNextSong && styles.btnDisabled,
        ]}
        onPress={onNextSong}
        disabled={!hasNextSong}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 6 }}
      >
        <Text
          style={[
            styles.songNavText,
            { color: hasNextSong ? theme.textPrimary : theme.textSecondary },
          ]}
        >
          ›
        </Text>
      </TouchableOpacity>

      {/* Right: Quick Transpose Stepper, Full-Screen & Settings Button */}
      <View style={styles.controlsRow}>
        {/* Step Down -1 */}
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={() => onTransposeStep(-1)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.stepBtnText, { color: theme.btnText }]}>-</Text>
        </TouchableOpacity>

        {/* Current Key Pill (shows original key if transposed) */}
        <TouchableOpacity
          style={[
            styles.keyPill,
            { backgroundColor: theme.btnBg, borderColor: theme.timeSigBorder },
            isTransposed && styles.keyPillTransposed,
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.7}
        >
          <Text style={[styles.keyPillText, { color: theme.timeSigText }]}>
            {song.currentKey}
          </Text>
          {isTransposed && (
            <Text style={styles.origKeySubText}>
              ({originalKey})
            </Text>
          )}
        </TouchableOpacity>

        {/* Step Up +1 */}
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={() => onTransposeStep(1)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.stepBtnText, { color: theme.btnText }]}>+</Text>
        </TouchableOpacity>

        {/* Full Screen Mode Toggle Button */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={onToggleFullScreen}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.iconBtnText, { color: theme.textPrimary }]}>⛶</Text>
        </TouchableOpacity>

        {/* Unified Settings & Controls Menu Button */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
          onPress={onOpenSettings}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Text style={[styles.iconBtnText, { color: theme.textPrimary }]}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  songNavBtn: {
    width: 32,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songNavText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  infoColBtn: {
    flex: 1,
    marginHorizontal: 6,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.1,
    maxWidth: '82%',
  },
  playlistIndicatorBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  playlistIndicatorText: {
    fontSize: 8,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stepBtn: {
    width: 24,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  keyPill: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  keyPillTransposed: {
    borderColor: '#e5a93b',
  },
  keyPillText: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  origKeySubText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#e5a93b',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 14,
  },
});

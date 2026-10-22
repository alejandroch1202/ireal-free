import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SongAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface TopBarProps {
  song: SongAST;
  originalKey: string;
  theme: ThemeColors;
  hasPrevSong: boolean;
  hasNextSong: boolean;
  onTransposeStep?: (step: number) => void;
  onOpenSettings: () => void;
  onOpenPlaylists: () => void;
  onPrevSong: () => void;
  onNextSong: () => void;
  onToggleFullScreen?: () => void;
  onBackToLibrary?: () => void;
  onOpenEditSong?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  song,
  originalKey,
  theme,
  hasPrevSong,
  hasNextSong,
  onOpenSettings,
  onOpenPlaylists,
  onPrevSong,
  onNextSong,
  onBackToLibrary,
}) => {
  const isTransposed = song.transposeAmount !== 0;

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
      {/* 1. Left: Mobile Back Button (‹) */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
        ]}
        onPress={onBackToLibrary || onOpenPlaylists}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Volver a canciones"
      >
        <Feather name="chevron-left" size={21} color={theme.activeKeyBg || '#0284c7'} />
      </TouchableOpacity>

      {/* 2. Center: Song Title & Composer (Clean, uncluttered, maximum readability) */}
      <TouchableOpacity
        style={styles.infoColBtn}
        onPress={onOpenPlaylists}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel="Abrir repertorio de canciones"
      >
        <Text
          style={[styles.title, { color: theme.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {song.title || 'Sin Título'}
        </Text>
        {Boolean(song.composer) && (
          <Text
            style={[styles.composerText, { color: theme.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {song.composer}
          </Text>
        )}
      </TouchableOpacity>

      {/* 3. Right: Prev/Next Song navigation, Key Badge & Settings Menu */}
      <View style={styles.controlsRow}>
        {/* Previous Song */}
        <TouchableOpacity
          style={[
            styles.navArrowBtn,
            { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
            !hasPrevSong && styles.btnDisabled,
          ]}
          onPress={onPrevSong}
          disabled={!hasPrevSong}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 2 }}
          accessibilityLabel="Canción anterior"
        >
          <Feather
            name="chevron-left"
            size={18}
            color={hasPrevSong ? theme.textPrimary : theme.textSecondary}
          />
        </TouchableOpacity>

        {/* Next Song */}
        <TouchableOpacity
          style={[
            styles.navArrowBtn,
            { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
            !hasNextSong && styles.btnDisabled,
          ]}
          onPress={onNextSong}
          disabled={!hasNextSong}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 2, right: 4 }}
          accessibilityLabel="Canción siguiente"
        >
          <Feather
            name="chevron-right"
            size={18}
            color={hasNextSong ? theme.textPrimary : theme.textSecondary}
          />
        </TouchableOpacity>

        {/* Current Key Pill (Tap opens Transposition / Settings menu) */}
        <TouchableOpacity
          style={[
            styles.keyPill,
            { backgroundColor: theme.btnBg, borderColor: theme.timeSigBorder },
            isTransposed && {
              backgroundColor: theme.mode === 'dark' ? '#3b2505' : '#fffbeb',
              borderColor: '#f59e0b',
            },
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityLabel={`Tonalidad: ${song.currentKey}. Toca para cambiar tono.`}
        >
          <Text
            style={[
              styles.keyPillText,
              { color: isTransposed ? '#f59e0b' : theme.timeSigText },
            ]}
          >
            {song.currentKey}
          </Text>
          {isTransposed && (
            <Text style={[styles.origKeySubText, { color: '#f59e0b' }]}>
              ({originalKey})
            </Text>
          )}
        </TouchableOpacity>

        {/* Settings Menu Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          accessibilityLabel="Menú y ajustes"
        >
          <Feather name="settings" size={17} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoColBtn: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  composerText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  navArrowBtn: {
    width: 30,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  keyPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  keyPillText: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  origKeySubText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
});

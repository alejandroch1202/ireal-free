import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SongAST } from '../types/ireal';

interface HeaderProps {
  song: SongAST;
}

export const Header: React.FC<HeaderProps> = ({ song }) => {
  const isTransposed = song.transposeAmount !== 0;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {song.title}
          </Text>
          <Text style={styles.composer} numberOfLines={1}>
            {song.composer || 'Desconocido'}
          </Text>
        </View>

        <View style={styles.keyBadge}>
          <Text style={styles.keyLabel}>TONO</Text>
          <Text style={styles.keyValue}>{song.currentKey}</Text>
          {isTransposed && (
            <Text style={styles.origKeySub}>
              Orig: {song.originalKey} ({song.transposeAmount > 0 ? `+${song.transposeAmount}` : song.transposeAmount})
            </Text>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>Estilo:</Text>
          <Text style={styles.metaValue}>{song.style}</Text>
        </View>

        {song.tempo ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Tempo:</Text>
            <Text style={styles.metaValue}>♩ = {song.tempo}</Text>
          </View>
        ) : null}

        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>Compás:</Text>
          <Text style={styles.metaValue}>{song.timeSignature || '4/4'}</Text>
        </View>

        {song.repeats ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Vueltas:</Text>
            <Text style={styles.metaValue}>{song.repeats}x</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#243442',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2f4354',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e6e3da',
    letterSpacing: 0.5,
  },
  composer: {
    fontSize: 15,
    color: '#9ba6b2',
    marginTop: 4,
    fontWeight: '500',
  },
  keyBadge: {
    backgroundColor: '#1b2730',
    borderColor: '#4daafc',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  keyLabel: {
    fontSize: 10,
    color: '#9ba6b2',
    fontWeight: '700',
    letterSpacing: 1,
  },
  keyValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4daafc',
    marginTop: -2,
  },
  origKeySub: {
    fontSize: 10,
    color: '#e5a93b',
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    backgroundColor: '#1b2730',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#7f8c9b',
    marginRight: 4,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#e6e3da',
    fontWeight: '700',
  },
});

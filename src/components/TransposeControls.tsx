import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { STANDARD_KEYS, getKeyRoot } from '../core/transposer';

interface TransposeControlsProps {
  currentKey: string;
  originalKey: string;
  transposeAmount: number;
  onTransposeStep: (step: number) => void;
  onSelectKey: (key: string) => void;
  onReset: () => void;
  onOpenImport: () => void;
}

export const TransposeControls: React.FC<TransposeControlsProps> = ({
  currentKey,
  originalKey,
  transposeAmount,
  onTransposeStep,
  onSelectKey,
  onReset,
  onOpenImport,
}) => {
  const currentRoot = getKeyRoot(currentKey);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.stepControls}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onTransposeStep(-1)}
            activeOpacity={0.7}
          >
            <Text style={styles.stepBtnText}>-1</Text>
            <Text style={styles.stepBtnSub}>semitono</Text>
          </TouchableOpacity>

          <View style={styles.deltaBox}>
            <Text style={styles.deltaLabel}>TRANSPOSICIÓN</Text>
            <Text style={[styles.deltaValue, transposeAmount !== 0 && styles.deltaValueActive]}>
              {transposeAmount > 0 ? `+${transposeAmount}` : transposeAmount} st
            </Text>
          </View>

          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onTransposeStep(1)}
            activeOpacity={0.7}
          >
            <Text style={styles.stepBtnText}>+1</Text>
            <Text style={styles.stepBtnSub}>semitono</Text>
          </TouchableOpacity>

          {transposeAmount !== 0 && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={onReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>Orig ({originalKey})</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.importBtn}
          onPress={onOpenImport}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="folder" size={14} color="#ffffff" />
            <Text style={styles.importBtnText}>Abrir Archivo</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.keySelectorWrapper}>
        <Text style={styles.keySelectorTitle}>Selección Rápida de Tono:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.keyChipsContainer}
        >
          {STANDARD_KEYS.map((key) => {
            const isSelected = currentRoot === key;
            const isOriginal = getKeyRoot(originalKey) === key;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.keyChip,
                  isSelected && styles.keyChipSelected,
                  isOriginal && !isSelected && styles.keyChipOriginal,
                ]}
                onPress={() => onSelectKey(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.keyChipText,
                    isSelected && styles.keyChipTextSelected,
                    isOriginal && !isSelected && styles.keyChipTextOriginal,
                  ]}
                >
                  {key}
                </Text>
                {isOriginal && (
                  <View style={[styles.origDot, isSelected && styles.origDotSelected]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1b2730',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b3b48',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    backgroundColor: '#243442',
    borderColor: '#374b5c',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 54,
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#e6e3da',
  },
  stepBtnSub: {
    fontSize: 9,
    color: '#8e9da8',
    fontWeight: '500',
    marginTop: -2,
  },
  deltaBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  deltaLabel: {
    fontSize: 9,
    color: '#7f8c9b',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  deltaValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#a3b3c2',
  },
  deltaValueActive: {
    color: '#e5a93b',
  },
  resetBtn: {
    backgroundColor: '#2f4354',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 12,
    color: '#4daafc',
    fontWeight: '700',
  },
  importBtn: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  importBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  keySelectorWrapper: {
    marginTop: 10,
  },
  keySelectorTitle: {
    fontSize: 11,
    color: '#7f8c9b',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  keyChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  keyChip: {
    backgroundColor: '#243442',
    borderWidth: 1,
    borderColor: '#334454',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 38,
    alignItems: 'center',
    position: 'relative',
  },
  keyChipSelected: {
    backgroundColor: '#4daafc',
    borderColor: '#4daafc',
  },
  keyChipOriginal: {
    borderColor: '#e5a93b',
  },
  keyChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d1cdc3',
  },
  keyChipTextSelected: {
    color: '#0f172a',
    fontWeight: '900',
  },
  keyChipTextOriginal: {
    color: '#e5a93b',
  },
  origDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5a93b',
  },
  origDotSelected: {
    backgroundColor: '#0f172a',
  },
});

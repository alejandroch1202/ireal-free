import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { STANDARD_KEYS, getKeyRoot, PITCH_MAP } from '../core/transposer';
import type { SongAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface EditSongModalProps {
  visible: boolean;
  theme: ThemeColors;
  song: SongAST;
  onClose: () => void;
  onSave: (updated: {
    title: string;
    composer: string;
    key: string;
    style: string;
    tempo?: number;
    setNewAsOriginal?: boolean;
  }) => Promise<void>;
}

const COMMON_STYLES = ['Ballad', 'Pop', 'Swing', 'Rock', 'Worship', 'Funk', 'Bossa Nova', 'Jazz'];

export const EditSongModal: React.FC<EditSongModalProps> = ({
  visible,
  theme,
  song,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(song.title);
  const [composer, setComposer] = useState(song.composer);
  const [selectedKey, setSelectedKey] = useState(song.originalKey || 'C');
  const [style, setStyle] = useState(song.style || 'Pop');
  const [tempo, setTempo] = useState<number>(song.tempo || 115);
  const [setNewAsOriginal, setSetNewAsOriginal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(song.title);
      setComposer(song.composer);
      setSelectedKey(song.originalKey || 'C');
      setStyle(song.style || 'Pop');
      setTempo(song.tempo || 115);
      setSetNewAsOriginal(false);
      setIsSubmitting(false);
    }
  }, [visible, song]);

  const handleStepTempo = (delta: number) => {
    setTempo((prev) => Math.max(30, Math.min(280, (prev || 115) + delta)));
  };

  const handleSetCurrentKeyAsOriginal = () => {
    setSelectedKey(song.currentKey);
    setSetNewAsOriginal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        composer: composer.trim(),
        key: selectedKey,
        style: style.trim(),
        tempo: tempo ? Number(tempo) : undefined,
        setNewAsOriginal,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTransposed = song.currentKey !== song.originalKey;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.modalCard, borderColor: theme.modalBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.topBarBorder }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Editar Información
            </Text>
            <TouchableOpacity
              style={[styles.closeIconBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onClose}
              hitSlop={10}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <Feather name="x" size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* 1. Título */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                TÍTULO DE LA CANCIÓN
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: theme.btnBorder,
                    color: theme.textPrimary,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Nombre de la canción..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* 2. Compositor / Artista */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                COMPOSITOR / ARTISTA
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: theme.btnBorder,
                    color: theme.textPrimary,
                  },
                ]}
                value={composer}
                onChangeText={setComposer}
                placeholder="Nombre del artista o compositor..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* 3. Tono Original */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithBadgeRow}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  TONO ORIGINAL
                </Text>
                <View style={[styles.keyBadge, { backgroundColor: theme.activeKeyBg }]}>
                  <Text style={[styles.keyBadgeText, { color: theme.activeKeyText }]}>
                    {selectedKey}
                  </Text>
                </View>
              </View>

              {/* Botón rápido para fijar el tono actual si está transportado */}
              {isTransposed && (
                <TouchableOpacity
                  style={[
                    styles.fixCurrentKeyBtn,
                    {
                      backgroundColor: setNewAsOriginal ? theme.activeKeyBg : theme.btnBg,
                      borderColor: theme.activeKeyBg,
                    },
                  ]}
                  onPress={handleSetCurrentKeyAsOriginal}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="star"
                    size={14}
                    color={setNewAsOriginal ? theme.activeKeyText : theme.textPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.fixCurrentKeyText,
                      { color: setNewAsOriginal ? theme.activeKeyText : theme.textPrimary },
                    ]}
                  >
                    Fijar tono actual ({song.currentKey}) como Tono Original
                  </Text>
                </TouchableOpacity>
              )}

              {/* Selector de las 12 notas */}
              <View style={styles.keyGrid}>
                {STANDARD_KEYS.map((k) => {
                  const isSelected = PITCH_MAP[k] !== undefined && PITCH_MAP[k] === PITCH_MAP[getKeyRoot(selectedKey)];
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[
                        styles.keyItem,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                        isSelected && {
                          backgroundColor: theme.activeKeyBg,
                          borderColor: theme.activeKeyBg,
                        },
                      ]}
                      onPress={() => {
                        setSelectedKey(k);
                        setSetNewAsOriginal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.keyItemText,
                          { color: isSelected ? theme.activeKeyText : theme.btnText },
                        ]}
                      >
                        {k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Estilo Musical */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                ESTILO MUSICAL
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: theme.btnBorder,
                    color: theme.textPrimary,
                  },
                ]}
                value={style}
                onChangeText={setStyle}
                placeholder="Ballad, Pop, Swing, Rock..."
                placeholderTextColor={theme.textSecondary}
              />
              {/* Chips rápidos */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {COMMON_STYLES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.chipBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      style.toLowerCase() === st.toLowerCase() && {
                        backgroundColor: theme.activeKeyBg,
                        borderColor: theme.activeKeyBg,
                      },
                    ]}
                    onPress={() => setStyle(st)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            style.toLowerCase() === st.toLowerCase()
                              ? theme.activeKeyText
                              : theme.btnText,
                        },
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 5. Tempo BPM */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                TEMPO PREDETERMINADO (BPM)
              </Text>
              <View style={styles.tempoControlRow}>
                <TouchableOpacity
                  style={[styles.tempoStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => handleStepTempo(-5)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tempoStepText, { color: theme.btnText }]}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tempoStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => handleStepTempo(-1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tempoStepText, { color: theme.btnText }]}>-1</Text>
                </TouchableOpacity>

                <View style={[styles.tempoDisplayBox, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}>
                  <Text style={[styles.tempoNumberText, { color: theme.textPrimary }]}>{tempo}</Text>
                  <Text style={[styles.tempoBpmLabel, { color: theme.textSecondary }]}>BPM</Text>
                </View>

                <TouchableOpacity
                  style={[styles.tempoStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => handleStepTempo(1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tempoStepText, { color: theme.btnText }]}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tempoStepBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
                  onPress={() => handleStepTempo(5)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tempoStepText, { color: theme.btnText }]}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footerRow, { borderTopColor: theme.topBarBorder }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.btnBg, borderColor: theme.btnBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.btnText }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.activeKeyBg }]}
              onPress={handleSave}
              disabled={isSubmitting || !title.trim()}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="check" size={15} color={theme.activeKeyText} />
                <Text style={[styles.saveBtnText, { color: theme.activeKeyText }]}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  keyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keyBadgeText: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '600',
  },
  fixCurrentKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 6,
  },
  fixCurrentKeyIcon: {
    fontSize: 14,
  },
  fixCurrentKeyText: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  keyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keyItem: {
    width: '15%',
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyItemText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipsScroll: {
    marginTop: 8,
  },
  chipBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tempoControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tempoStepBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempoStepText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tempoDisplayBox: {
    flex: 1.5,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempoNumberText: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  tempoBpmLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.5,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});

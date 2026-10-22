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
import type { BarAST, ChordToken } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';
import { parseChordToken, formatChordQuality } from '../core/parser';
import { SingleMeasureRepeat } from './RepeatSymbols';

interface EditChordModalProps {
  visible: boolean;
  bar: BarAST | null;
  initialChordIndex?: number;
  theme: ThemeColors;
  fontScale?: number;
  onClose: () => void;
  onSaveBar: (
    barNumber: number,
    updatedChords: ChordToken[],
    isRepeatMeasure: boolean
  ) => Promise<void> | void;
}

const ROOT_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

const QUALITY_OPTIONS = [
  { label: 'Mayor', value: '' },
  { label: 'm', value: 'm' },
  { label: '7', value: '7' },
  { label: 'm7', value: 'm7' },
  { label: 'maj7', value: 'maj7' },
  { label: 'sus4', value: 'sus4' },
  { label: 'sus2', value: 'sus2' },
  { label: 'dim', value: 'dim' },
  { label: 'm7b5', value: 'm7b5' },
  { label: 'aug', value: 'aug' },
  { label: '9', value: '9' },
  { label: 'm9', value: 'm9' },
  { label: 'add9', value: 'add9' },
  { label: '6', value: '6' },
  { label: 'm6', value: 'm6' },
  { label: '5', value: '5' },
];

const BASS_OPTIONS = [
  { label: 'Sin bajo', value: '' },
  { label: '/C', value: 'C' },
  { label: '/C#', value: 'C#' },
  { label: '/D', value: 'D' },
  { label: '/D#', value: 'D#' },
  { label: '/E', value: 'E' },
  { label: '/F', value: 'F' },
  { label: '/F#', value: 'F#' },
  { label: '/G', value: 'G' },
  { label: '/G#', value: 'G#' },
  { label: '/A', value: 'A' },
  { label: '/Bb', value: 'Bb' },
  { label: '/B', value: 'B' },
];

export const EditChordModal: React.FC<EditChordModalProps> = ({
  visible,
  bar,
  initialChordIndex = 0,
  theme,
  fontScale = 1.0,
  onClose,
  onSaveBar,
}) => {
  const [selectedChordIndex, setSelectedChordIndex] = useState(0);
  const [chordsList, setChordsList] = useState<ChordToken[]>([]);
  const [isRepeat, setIsRepeat] = useState(false);
  const [typedChord, setTypedChord] = useState('');
  const [currentRoot, setCurrentRoot] = useState('C');
  const [currentQuality, setCurrentQuality] = useState('');
  const [currentBass, setCurrentBass] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize modal state when opened with a bar
  useEffect(() => {
    if (visible && bar) {
      setIsRepeat(Boolean(bar.isRepeatMeasure));
      const initialChords =
        bar.chords && bar.chords.length > 0
          ? [...bar.chords]
          : [parseChordToken('C')!];
      setChordsList(initialChords);

      const targetIdx = Math.max(0, Math.min(initialChordIndex, initialChords.length - 1));
      setSelectedChordIndex(targetIdx);

      const activeChord = initialChords[targetIdx];
      if (activeChord) {
        setTypedChord(activeChord.displayText);
        setCurrentRoot(activeChord.root);
        setCurrentQuality(activeChord.quality);
        setCurrentBass(activeChord.bass || '');
      }
      setIsSaving(false);
    }
  }, [visible, bar, initialChordIndex]);

  // Sync builder when selecting another chord in the measure
  const handleSelectChordChip = (idx: number) => {
    setSelectedChordIndex(idx);
    const chord = chordsList[idx];
    if (chord) {
      setTypedChord(chord.displayText);
      setCurrentRoot(chord.root);
      setCurrentQuality(chord.quality);
      setCurrentBass(chord.bass || '');
    }
  };

  // Update active chord from components
  const applyChordChange = (root: string, quality: string, bass: string) => {
    setCurrentRoot(root);
    setCurrentQuality(quality);
    setCurrentBass(bass);

    const formattedQuality = formatChordQuality(quality);
    const assetText = bass ? `${root}${formattedQuality}/${bass}` : `${root}${formattedQuality}`;
    setTypedChord(assetText);

    const parsed = parseChordToken(assetText);
    if (parsed) {
      setChordsList((prev) => {
        const next = [...prev];
        next[selectedChordIndex] = parsed;
        return next;
      });
    }
  };

  // Handle direct text input
  const handleTypedChordChange = (text: string) => {
    setTypedChord(text);
    const parsed = parseChordToken(text);
    if (parsed) {
      setCurrentRoot(parsed.root);
      setCurrentQuality(parsed.quality);
      setCurrentBass(parsed.bass || '');

      setChordsList((prev) => {
        const next = [...prev];
        next[selectedChordIndex] = parsed;
        return next;
      });
    }
  };

  // Add a new chord to the current measure (max 4)
  const handleAddChord = () => {
    if (chordsList.length >= 4) return;
    const defaultNew = parseChordToken('C')!;
    const updated = [...chordsList, defaultNew];
    setChordsList(updated);
    const newIdx = updated.length - 1;
    setSelectedChordIndex(newIdx);
    setTypedChord('C');
    setCurrentRoot('C');
    setCurrentQuality('');
    setCurrentBass('');
    setIsRepeat(false);
  };

  // Delete current chord from measure
  const handleDeleteChord = () => {
    if (chordsList.length <= 1) {
      // If only 1 chord left, switch to repeat measure or set empty
      setIsRepeat(true);
      return;
    }
    const updated = chordsList.filter((_, idx) => idx !== selectedChordIndex);
    setChordsList(updated);
    const nextIdx = Math.max(0, selectedChordIndex - 1);
    setSelectedChordIndex(nextIdx);
    const nextChord = updated[nextIdx];
    if (nextChord) {
      setTypedChord(nextChord.displayText);
      setCurrentRoot(nextChord.root);
      setCurrentQuality(nextChord.quality);
      setCurrentBass(nextChord.bass || '');
    }
  };

  // Toggle measure repeat (%)
  const handleToggleRepeat = () => {
    setIsRepeat((prev) => !prev);
  };

  // Save changes
  const handleSave = async () => {
    if (!bar || isSaving) return;
    setIsSaving(true);
    try {
      let finalChords = [...chordsList];
      if (!isRepeat) {
        // If user typed in the text input, ensure it is committed before saving
        if (typedChord.trim()) {
          const parsed = parseChordToken(typedChord);
          if (parsed) {
            finalChords[selectedChordIndex] = parsed;
          }
        }
        if (finalChords.length === 0) {
          const fallback = parseChordToken('C')!;
          finalChords = [fallback];
        }
      }
      await onSaveBar(bar.barNumber, isRepeat ? [] : finalChords, isRepeat);
      onClose();
    } catch (err) {
      console.warn('Error saving chord:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!bar) return null;

  const currentDisplayChord = chordsList[selectedChordIndex] || parseChordToken(typedChord) || {
    root: currentRoot,
    quality: currentQuality,
    bass: currentBass,
    displayText: currentBass ? `${currentRoot}${currentQuality}/${currentBass}` : `${currentRoot}${currentQuality}`,
  };

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
          <View style={[styles.header, { borderBottomColor: theme.modalBorder }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconContainer,
                  { backgroundColor: (theme.activeKeyBg || '#0284c7') + '22' },
                ]}
              >
                <Feather name="edit-2" size={17} color={theme.activeKeyBg || '#0284c7'} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Editar Acorde</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Compás {bar.barNumber}
                  {bar.sectionLabel ? ` · ${bar.sectionLabel}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={19} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Measure Chords Sequence Strip */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                ACORDES EN EL COMPÁS
              </Text>
              <View style={styles.chipsRow}>
                {chordsList.map((ch, idx) => {
                  const isSelected = !isRepeat && idx === selectedChordIndex;
                  return (
                    <TouchableOpacity
                      key={`chord-chip-${idx}`}
                      style={[
                        styles.chordChip,
                        {
                          backgroundColor: isSelected
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.btnBg,
                          borderColor: isSelected
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.btnBorder,
                        },
                      ]}
                      onPress={() => {
                        setIsRepeat(false);
                        handleSelectChordChip(idx);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chordChipText,
                          {
                            color: isSelected
                              ? theme.activeKeyText || '#ffffff'
                              : theme.textPrimary,
                          },
                        ]}
                      >
                        {ch.displayText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {chordsList.length < 4 && !isRepeat && (
                  <TouchableOpacity
                    style={[
                      styles.addChordChip,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={handleAddChord}
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={16} color={theme.activeKeyBg || '#0284c7'} />
                    <Text
                      style={[
                        styles.addChordChipText,
                        { color: theme.activeKeyBg || '#0284c7' },
                      ]}
                    >
                      Añadir
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.repeatChip,
                    {
                      backgroundColor: isRepeat
                        ? (theme.repeatSymbolColor || '#ea580c') + '25'
                        : theme.btnBg,
                      borderColor: isRepeat
                        ? theme.repeatSymbolColor || '#ea580c'
                        : theme.btnBorder,
                    },
                  ]}
                  onPress={handleToggleRepeat}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <SingleMeasureRepeat
                      color={isRepeat ? theme.repeatSymbolColor || '#ea580c' : theme.textSecondary}
                      fontScale={0.5}
                    />
                    <Text
                      style={[
                        styles.repeatChipText,
                        {
                          color: isRepeat
                            ? theme.repeatSymbolColor || '#ea580c'
                            : theme.textSecondary,
                          fontWeight: isRepeat ? '700' : '500',
                        },
                      ]}
                    >
                      Repetir
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* If repeat measure is active */}
            {isRepeat ? (
              <View
                style={[
                  styles.repeatActiveCard,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: theme.modalBorder,
                  },
                ]}
              >
                <View style={{ marginVertical: 12 }}>
                  <SingleMeasureRepeat
                    color={theme.repeatSymbolColor || '#ea580c'}
                    fontScale={fontScale * 1.6}
                  />
                </View>
                <Text style={[styles.repeatActiveTitle, { color: theme.textPrimary }]}>
                  Compás de Repetición
                </Text>
                <Text style={[styles.repeatActiveSubtitle, { color: theme.textSecondary }]}>
                  Este compás repetirá armónicamente los acordes del compás anterior.
                </Text>
              </View>
            ) : (
              <>
                {/* 2. Live Chord Preview Card */}
                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: theme.btnBg,
                      borderColor: theme.btnBorder,
                    },
                  ]}
                >
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    VISTA PREVIA
                  </Text>
                  <View style={styles.previewChordRow}>
                    <Text style={[styles.previewRoot, { color: theme.chordRoot }]}>
                      {currentDisplayChord.root}
                    </Text>
                    {Boolean(currentDisplayChord.quality) && (
                      <Text style={[styles.previewQuality, { color: theme.chordRoot }]}>
                        {formatChordQuality(currentDisplayChord.quality)}
                      </Text>
                    )}
                    {Boolean(currentDisplayChord.bass) && (
                      <Text style={[styles.previewBass, { color: theme.chordRoot }]}>
                        /{currentDisplayChord.bass}
                      </Text>
                    )}
                  </View>
                </View>

                {/* 3. Direct Text Input */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    ESCRIBIR ACORDE
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                      backgroundColor: theme.btnBg,
                      borderColor: theme.btnBorder,
                      },
                    ]}
                  >
                    <Feather
                      name="edit-3"
                      size={17}
                      color={theme.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary }]}
                      value={typedChord}
                      onChangeText={handleTypedChordChange}
                      placeholder="Ej: Am7, C/E, G7, F#m7b5, Bb"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="sentences"
                      autoCorrect={false}
                    />
                    {typedChord.length > 0 && (
                      <TouchableOpacity
                        onPress={() => handleTypedChordChange('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x-circle" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 4. Visual Chord Builder Buttons */}
                {/* A. Tónica (Root) */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    TÓNICA (NOTA FUNDAMENTAL)
                  </Text>
                  <View style={styles.gridRowWrap}>
                    {ROOT_OPTIONS.map((rootNote) => {
                      const isSelected = currentRoot === rootNote;
                      return (
                        <TouchableOpacity
                          key={`root-${rootNote}`}
                          style={[
                            styles.rootBtn,
                            {
                              backgroundColor: isSelected
                                ? theme.activeKeyBg || '#0284c7'
                                : theme.btnBg,
                              borderColor: isSelected
                                ? theme.activeKeyBg || '#0284c7'
                                : theme.btnBorder,
                            },
                          ]}
                          onPress={() => applyChordChange(rootNote, currentQuality, currentBass)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.rootBtnText,
                              {
                                color: isSelected
                                  ? theme.activeKeyText || '#ffffff'
                                  : theme.textPrimary,
                              },
                            ]}
                          >
                            {rootNote}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* B. Tipo / Cualidad (Quality) */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    TIPO / CUALIDAD DEL ACORDE
                  </Text>
                  <View style={styles.gridRowWrap}>
                    {QUALITY_OPTIONS.map((q) => {
                      const isSelected = currentQuality === q.value;
                      return (
                        <TouchableOpacity
                          key={`quality-${q.label}`}
                          style={[
                            styles.qualityBtn,
                            {
                              backgroundColor: isSelected
                                ? theme.activeKeyBg || '#0284c7'
                                : theme.btnBg,
                              borderColor: isSelected
                                ? theme.activeKeyBg || '#0284c7'
                                : theme.btnBorder,
                            },
                          ]}
                          onPress={() => applyChordChange(currentRoot, q.value, currentBass)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.qualityBtnText,
                              {
                                color: isSelected
                                  ? theme.activeKeyText || '#ffffff'
                                  : theme.textPrimary,
                              },
                            ]}
                          >
                            {q.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* C. Bajo / Inversión (Slash Bass) */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    BAJO / INVERSIÓN (ACORDE CON BARRA)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.bassScrollContent}
                  >
                    {BASS_OPTIONS.map((b) => {
                      const isSelected = currentBass === b.value;
                      return (
                        <TouchableOpacity
                          key={`bass-${b.label}`}
                          style={[
                            styles.bassBtn,
                            {
                              backgroundColor: isSelected
                                ? theme.activeKeyBg || '#0284c7'
                                : theme.btnBg,
                              borderColor: isSelected
                                ? theme.activeKeyBg || '#0284c7'
                                : theme.btnBorder,
                            },
                          ]}
                          onPress={() => applyChordChange(currentRoot, currentQuality, b.value)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.bassBtnText,
                              {
                                color: isSelected
                                  ? theme.activeKeyText || '#ffffff'
                                  : theme.textPrimary,
                              },
                            ]}
                          >
                            {b.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Action: Delete selected chord */}
                {chordsList.length > 1 && (
                  <TouchableOpacity
                    style={[
                      styles.deleteChordBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={handleDeleteChord}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={15} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteChordBtnText}>
                      Eliminar este acorde del compás
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.modalBorder }]}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: theme.activeKeyBg || '#0284c7' },
                isSaving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Feather name="check" size={17} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Guardar Acordes</Text>
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
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chordChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 54,
    alignItems: 'center',
  },
  chordChipText: {
    fontSize: 15,
    fontWeight: '700',
  },
  addChordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  addChordChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  repeatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  repeatChipText: {
    fontSize: 13,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewChordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  previewRoot: {
    fontSize: 32,
    fontWeight: '800',
  },
  previewQuality: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 2,
  },
  previewBass: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.85,
    marginLeft: 2,
  },
  repeatActiveCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bigRepeatSymbol: {
    fontSize: 44,
    fontWeight: '800',
    marginBottom: 4,
  },
  repeatActiveTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  repeatActiveSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    paddingVertical: 0,
  },
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rootBtn: {
    width: '15.2%',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rootBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  qualityBtn: {
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bassScrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  bassBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bassBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteChordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  deleteChordBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

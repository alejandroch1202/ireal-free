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
import type { BarAST, ChordToken, MeasureElement } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';
import { parseChordToken, formatChordQuality } from '../core/parser';
import { SingleMeasureRepeat } from './RepeatSymbols';

export interface BarUpdatePayload {
  elements: MeasureElement[];
  chords: ChordToken[];
  isRepeatMeasure: boolean;
  leftBarline: '|' | '{' | '[';
  rightBarline: '|' | '}' | ']' | 'Z' | '||';
  ending?: string;
}

interface EditChordModalProps {
  visible: boolean;
  bar: BarAST | null;
  defaultKeyRoot?: string;
  initialChordIndex?: number;
  canDeleteBar?: boolean;
  theme: ThemeColors;
  fontScale?: number;
  onClose: () => void;
  onSaveBar: (barNumber: number, payload: BarUpdatePayload) => Promise<void> | void;
  onInsertBar?: (barNumber: number, position: 'before' | 'after') => void;
  onDeleteBar?: (barNumber: number) => void;
  onAddAnnotationToBar?: (bar: BarAST) => void;
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

type MeasureMode = 'elements' | 'repeat' | 'empty';

export const EditChordModal: React.FC<EditChordModalProps> = ({
  visible,
  bar,
  defaultKeyRoot = 'C',
  initialChordIndex = 0,
  canDeleteBar = true,
  theme,
  fontScale = 1.0,
  onClose,
  onSaveBar,
  onInsertBar,
  onDeleteBar,
  onAddAnnotationToBar,
}) => {
  const [measureMode, setMeasureMode] = useState<MeasureMode>('elements');
  const [elementsList, setElementsList] = useState<MeasureElement[]>([]);
  const [selectedElemIndex, setSelectedElemIndex] = useState(0);

  const [typedChord, setTypedChord] = useState('');
  const [currentRoot, setCurrentRoot] = useState('C');
  const [currentQuality, setCurrentQuality] = useState('');
  const [currentBass, setCurrentBass] = useState('');

  const [leftBarline, setLeftBarline] = useState<'|' | '{' | '['>('|');
  const [rightBarline, setRightBarline] = useState<'|' | '}' | ']' | 'Z' | '||'>('|');
  const [ending, setEnding] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const syncBuilderWithElement = (elem?: MeasureElement) => {
    if (!elem) return;
    const ch = elem.type === 'chord' ? elem.chord : elem.passingChord;
    if (ch) {
      setTypedChord(ch.displayText);
      setCurrentRoot(ch.root);
      setCurrentQuality(formatChordQuality(ch.quality));
      setCurrentBass(ch.bass || '');
    }
  };

  useEffect(() => {
    if (visible && bar) {
      setLeftBarline(bar.leftBarline || '|');
      setRightBarline(bar.rightBarline || '|');
      setEnding(bar.ending);

      const fallbackChord = parseChordToken(defaultKeyRoot) || parseChordToken('C')!;

      if (bar.isRepeatMeasure) {
        setMeasureMode('repeat');
        setElementsList([{ type: 'chord', chord: fallbackChord }]);
        setSelectedElemIndex(0);
        syncBuilderWithElement({ type: 'chord', chord: fallbackChord });
      } else if (bar.elements && bar.elements.length > 0) {
        setMeasureMode('elements');
        const cloned = bar.elements.map((e) => ({ ...e }));
        setElementsList(cloned);

        // Map initialChordIndex (chord ordinal) to element index
        let foundElemIdx = 0;
        let seenChords = 0;
        for (let i = 0; i < cloned.length; i++) {
          const el = cloned[i];
          if (el.type === 'chord' || el.passingChord) {
            if (seenChords === initialChordIndex) {
              foundElemIdx = i;
              break;
            }
            seenChords++;
          }
        }
        setSelectedElemIndex(foundElemIdx);
        syncBuilderWithElement(cloned[foundElemIdx]);
      } else if (bar.chords && bar.chords.length > 0) {
        setMeasureMode('elements');
        const built: MeasureElement[] = bar.chords.map((c) => ({ type: 'chord', chord: c }));
        setElementsList(built);
        const idx = Math.max(0, Math.min(initialChordIndex, built.length - 1));
        setSelectedElemIndex(idx);
        syncBuilderWithElement(built[idx]);
      } else {
        // Measure is currently empty: initialize chord builder with tonic chord ready to save in 1 tap!
        setMeasureMode('elements');
        const initial: MeasureElement[] = [{ type: 'chord', chord: fallbackChord }];
        setElementsList(initial);
        setSelectedElemIndex(0);
        syncBuilderWithElement(initial[0]);
      }

      setIsSaving(false);
    }
  }, [visible, bar, initialChordIndex, defaultKeyRoot]);

  const handleSelectElemChip = (idx: number) => {
    setMeasureMode('elements');
    setSelectedElemIndex(idx);
    syncBuilderWithElement(elementsList[idx]);
  };

  const applyChordChange = (root: string, quality: string, bass: string) => {
    setCurrentRoot(root);
    setCurrentQuality(quality);
    setCurrentBass(bass);

    const formattedQuality = formatChordQuality(quality);
    const assetText = bass ? `${root}${formattedQuality}/${bass}` : `${root}${formattedQuality}`;
    setTypedChord(assetText);

    const parsed = parseChordToken(assetText);
    if (parsed) {
      setElementsList((prev) => {
        const next = [...prev];
        const target = next[selectedElemIndex];
        if (!target || target.type === 'chord') {
          next[selectedElemIndex] = {
            type: 'chord',
            chord: parsed,
            isPassing: target?.type === 'chord' ? target.isPassing : undefined,
            isSmall: target?.type === 'chord' ? target.isSmall : undefined,
          };
        } else {
          next[selectedElemIndex] = {
            type: 'pulse',
            passingChord: parsed,
          };
        }
        return next;
      });
    }
  };

  const handleTypedChordChange = (text: string) => {
    setTypedChord(text);
    const parsed = parseChordToken(text);
    if (parsed) {
      setCurrentRoot(parsed.root);
      setCurrentQuality(formatChordQuality(parsed.quality));
      setCurrentBass(parsed.bass || '');

      setElementsList((prev) => {
        const next = [...prev];
        const target = next[selectedElemIndex];
        if (!target || target.type === 'chord') {
          next[selectedElemIndex] = {
            type: 'chord',
            chord: parsed,
            isPassing: target?.type === 'chord' ? target.isPassing : undefined,
            isSmall: target?.type === 'chord' ? target.isSmall : undefined,
          };
        } else {
          next[selectedElemIndex] = {
            type: 'pulse',
            passingChord: parsed,
          };
        }
        return next;
      });
    }
  };

  const handleAddChord = () => {
    if (elementsList.length >= 4) return;
    const defaultNew = parseChordToken(defaultKeyRoot) || parseChordToken('C')!;
    const updated: MeasureElement[] = [...elementsList, { type: 'chord', chord: defaultNew }];
    setElementsList(updated);
    const newIdx = updated.length - 1;
    setSelectedElemIndex(newIdx);
    syncBuilderWithElement(updated[newIdx]);
    setMeasureMode('elements');
  };

  const handleAddPulse = () => {
    if (elementsList.length >= 4) return;
    const updated: MeasureElement[] = [...elementsList, { type: 'pulse' }];
    setElementsList(updated);
    setSelectedElemIndex(updated.length - 1);
    setMeasureMode('elements');
  };

  const handleMoveElement = (dir: -1 | 1) => {
    const targetIdx = selectedElemIndex + dir;
    if (targetIdx < 0 || targetIdx >= elementsList.length) return;
    const next = [...elementsList];
    const tmp = next[selectedElemIndex];
    next[selectedElemIndex] = next[targetIdx];
    next[targetIdx] = tmp;
    setElementsList(next);
    setSelectedElemIndex(targetIdx);
  };

  const handleDeleteElement = () => {
    if (elementsList.length <= 1) {
      setMeasureMode('empty');
      return;
    }
    const updated = elementsList.filter((_, idx) => idx !== selectedElemIndex);
    setElementsList(updated);
    const nextIdx = Math.max(0, selectedElemIndex - 1);
    setSelectedElemIndex(nextIdx);
    syncBuilderWithElement(updated[nextIdx]);
  };

  const handleSave = async () => {
    if (!bar || isSaving) return;
    setIsSaving(true);
    try {
      let finalElements: MeasureElement[] = [];
      let finalChords: ChordToken[] = [];
      const isRepeat = measureMode === 'repeat';

      if (measureMode === 'elements') {
        finalElements = [...elementsList];
        const activeElem = finalElements[selectedElemIndex];
        if (activeElem && activeElem.type === 'chord' && typedChord.trim()) {
          const parsed = parseChordToken(typedChord);
          if (parsed) {
            finalElements[selectedElemIndex] = {
              ...activeElem,
              chord: parsed,
            };
          }
        }
        for (const el of finalElements) {
          if (el.type === 'chord') finalChords.push(el.chord);
          else if (el.passingChord) finalChords.push(el.passingChord);
        }
      }

      await onSaveBar(bar.barNumber, {
        elements: isRepeat || measureMode === 'empty' ? [] : finalElements,
        chords: isRepeat || measureMode === 'empty' ? [] : finalChords,
        isRepeatMeasure: isRepeat,
        leftBarline,
        rightBarline,
        ending,
      });
      onClose();
    } catch (err) {
      console.warn('Error saving bar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!bar) return null;

  const selectedElem = elementsList[selectedElemIndex];
  const isSelectedPulseOnly =
    measureMode === 'elements' && selectedElem?.type === 'pulse' && !selectedElem.passingChord;

  const currentDisplayChord =
    (selectedElem?.type === 'chord' ? selectedElem.chord : selectedElem?.passingChord) ||
    parseChordToken(typedChord) || {
      root: currentRoot,
      quality: currentQuality,
      bass: currentBass,
      displayText: currentBass
        ? `${currentRoot}${currentQuality}/${currentBass}`
        : `${currentRoot}${currentQuality}`,
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
                <Text style={[styles.title, { color: theme.textPrimary }]}>Editar Compás</Text>
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
            {/* 1. Measure Elements Strip (Chords, Pulses /, Repeat %, Empty) */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                CONTENIDO DEL COMPÁS (PULSOS Y ACORDES)
              </Text>
              <View style={styles.chipsRow}>
                {elementsList.map((el, idx) => {
                  const isSelected = measureMode === 'elements' && idx === selectedElemIndex;
                  const label =
                    el.type === 'chord'
                      ? el.chord.displayText
                      : el.passingChord
                      ? `${el.passingChord.displayText} /`
                      : '/';
                  return (
                    <TouchableOpacity
                      key={`elem-chip-${idx}`}
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
                      onPress={() => handleSelectElemChip(idx)}
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
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {measureMode === 'elements' && elementsList.length < 4 && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.addChordChip,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      ]}
                      onPress={handleAddChord}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={14} color={theme.activeKeyBg || '#0284c7'} />
                      <Text
                        style={[
                          styles.addChordChipText,
                          { color: theme.activeKeyBg || '#0284c7' },
                        ]}
                      >
                        Acorde
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.addChordChip,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      ]}
                      onPress={handleAddPulse}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.addChordChipText,
                          { color: theme.textPrimary, fontStyle: 'italic', fontWeight: '800' },
                        ]}
                      >
                        + / Pulso
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.repeatChip,
                    {
                      backgroundColor:
                        measureMode === 'repeat'
                          ? (theme.repeatSymbolColor || '#ea580c') + '25'
                          : theme.btnBg,
                      borderColor:
                        measureMode === 'repeat'
                          ? theme.repeatSymbolColor || '#ea580c'
                          : theme.btnBorder,
                    },
                  ]}
                  onPress={() =>
                    setMeasureMode((prev) => (prev === 'repeat' ? 'elements' : 'repeat'))
                  }
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <SingleMeasureRepeat
                      color={
                        measureMode === 'repeat'
                          ? theme.repeatSymbolColor || '#ea580c'
                          : theme.textSecondary
                      }
                      fontScale={0.48}
                    />
                    <Text
                      style={[
                        styles.repeatChipText,
                        {
                          color:
                            measureMode === 'repeat'
                              ? theme.repeatSymbolColor || '#ea580c'
                              : theme.textSecondary,
                          fontWeight: measureMode === 'repeat' ? '700' : '500',
                        },
                      ]}
                    >
                      Repetir
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.repeatChip,
                    {
                      backgroundColor:
                        measureMode === 'empty'
                          ? (theme.activeKeyBg || '#0284c7') + '22'
                          : theme.btnBg,
                      borderColor:
                        measureMode === 'empty'
                          ? theme.activeKeyBg || '#0284c7'
                          : theme.btnBorder,
                    },
                  ]}
                  onPress={() =>
                    setMeasureMode((prev) => (prev === 'empty' ? 'elements' : 'empty'))
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.repeatChipText,
                      {
                        color:
                          measureMode === 'empty'
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.textSecondary,
                        fontWeight: measureMode === 'empty' ? '700' : '500',
                      },
                    ]}
                  >
                    Vacío
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reorder / remove selected item when multiple items exist */}
              {measureMode === 'elements' && elementsList.length > 1 && (
                <View style={styles.reorderBar}>
                  <TouchableOpacity
                    style={[
                      styles.smallActionBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      selectedElemIndex === 0 && { opacity: 0.4 },
                    ]}
                    disabled={selectedElemIndex === 0}
                    onPress={() => handleMoveElement(-1)}
                  >
                    <Feather name="arrow-left" size={13} color={theme.textPrimary} />
                    <Text style={[styles.smallActionText, { color: theme.textPrimary }]}>
                      Mover izq.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.smallActionBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      selectedElemIndex === elementsList.length - 1 && { opacity: 0.4 },
                    ]}
                    disabled={selectedElemIndex === elementsList.length - 1}
                    onPress={() => handleMoveElement(1)}
                  >
                    <Text style={[styles.smallActionText, { color: theme.textPrimary }]}>
                      Mover der.
                    </Text>
                    <Feather name="arrow-right" size={13} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.smallActionBtn,
                      { backgroundColor: '#ef444415', borderColor: '#ef444466' },
                    ]}
                    onPress={handleDeleteElement}
                  >
                    <Feather name="x" size={13} color="#ef4444" />
                    <Text style={[styles.smallActionText, { color: '#ef4444' }]}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Body depending on measureMode */}
            {measureMode === 'repeat' ? (
              <View
                style={[
                  styles.repeatActiveCard,
                  { backgroundColor: theme.btnBg, borderColor: theme.modalBorder },
                ]}
              >
                <View style={{ marginVertical: 10 }}>
                  <SingleMeasureRepeat
                    color={theme.repeatSymbolColor || '#ea580c'}
                    fontScale={fontScale * 1.5}
                  />
                </View>
                <Text style={[styles.repeatActiveTitle, { color: theme.textPrimary }]}>
                  Compás de Repetición (%)
                </Text>
                <Text style={[styles.repeatActiveSubtitle, { color: theme.textSecondary }]}>
                  Repite los acordes del compás anterior.
                </Text>
              </View>
            ) : measureMode === 'empty' ? (
              <View
                style={[
                  styles.repeatActiveCard,
                  { backgroundColor: theme.btnBg, borderColor: theme.modalBorder },
                ]}
              >
                <Text style={[styles.repeatActiveTitle, { color: theme.textPrimary }]}>
                  Compás en Blanco
                </Text>
                <Text style={[styles.repeatActiveSubtitle, { color: theme.textSecondary }]}>
                  Este compás quedará sin acordes.
                </Text>
              </View>
            ) : isSelectedPulseOnly ? (
              <View
                style={[
                  styles.repeatActiveCard,
                  { backgroundColor: theme.btnBg, borderColor: theme.modalBorder },
                ]}
              >
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '900',
                    fontStyle: 'italic',
                    color: theme.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  /
                </Text>
                <Text style={[styles.repeatActiveTitle, { color: theme.textPrimary }]}>
                  Pulso Rítmico (Pulso {selectedElemIndex + 1})
                </Text>
                <Text style={[styles.repeatActiveSubtitle, { color: theme.textSecondary }]}>
                  Usa pulsos &quot;/&quot; antes de un acorde (ej. /  /  A) para indicar que el
                  acorde entra en el pulso 3 o 4. También puedes elegir una nota abajo para agregar
                  un acorde de paso sobre este pulso.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.convertPulseBtn,
                    { backgroundColor: theme.cardBackground, borderColor: theme.btnBorder },
                  ]}
                  onPress={() => applyChordChange(currentRoot, currentQuality, currentBass)}
                >
                  <Feather
                    name="plus-circle"
                    size={14}
                    color={theme.activeKeyBg || '#0284c7'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }}>
                    Poner acorde de paso encima de este &quot;/&quot;
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Live Chord Preview + Direct Input */}
                <View
                  style={[
                    styles.previewCard,
                    { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                  ]}
                >
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

                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    ESCRIBIR ACORDE
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                  >
                    <Feather
                      name="edit-3"
                      size={16}
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

                {/* Tónica */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    TÓNICA
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

                {/* Cualidad */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    CUALIDAD
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

                {/* Bajo */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    BAJO / INVERSIÓN
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
              </>
            )}

            {/* Barlines, Casillas & Notes */}
            <View style={[styles.sectionBlock, styles.dividerTop, { borderTopColor: theme.modalBorder }]}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                BARRAS DE REPETICIÓN, CASILLAS Y NOTAS
              </Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[
                    styles.barlineChip,
                    {
                      backgroundColor:
                        leftBarline === '{' ? (theme.activeKeyBg || '#0284c7') : theme.btnBg,
                      borderColor:
                        leftBarline === '{' ? (theme.activeKeyBg || '#0284c7') : theme.btnBorder,
                    },
                  ]}
                  onPress={() => setLeftBarline((p) => (p === '{' ? '|' : '{'))}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '700',
                      color:
                        leftBarline === '{'
                          ? theme.activeKeyText || '#ffffff'
                          : theme.textPrimary,
                    }}
                  >
                    ||: Inicio rep.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.barlineChip,
                    {
                      backgroundColor:
                        rightBarline === '}' ? (theme.activeKeyBg || '#0284c7') : theme.btnBg,
                      borderColor:
                        rightBarline === '}' ? (theme.activeKeyBg || '#0284c7') : theme.btnBorder,
                    },
                  ]}
                  onPress={() => setRightBarline((p) => (p === '}' ? '|' : '}'))}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '700',
                      color:
                        rightBarline === '}'
                          ? theme.activeKeyText || '#ffffff'
                          : theme.textPrimary,
                    }}
                  >
                    :|| Fin rep.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.barlineChip,
                    {
                      backgroundColor:
                        rightBarline === '||' ? (theme.activeKeyBg || '#0284c7') : theme.btnBg,
                      borderColor:
                        rightBarline === '||' ? (theme.activeKeyBg || '#0284c7') : theme.btnBorder,
                    },
                  ]}
                  onPress={() => setRightBarline((p) => (p === '||' ? '|' : '||'))}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '700',
                      color:
                        rightBarline === '||'
                          ? theme.activeKeyText || '#ffffff'
                          : theme.textPrimary,
                    }}
                  >
                    || Doble
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.barlineChip,
                    {
                      backgroundColor:
                        rightBarline === 'Z' ? (theme.activeKeyBg || '#0284c7') : theme.btnBg,
                      borderColor:
                        rightBarline === 'Z' ? (theme.activeKeyBg || '#0284c7') : theme.btnBorder,
                    },
                  ]}
                  onPress={() => setRightBarline((p) => (p === 'Z' ? '|' : 'Z'))}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '700',
                      color:
                        rightBarline === 'Z'
                          ? theme.activeKeyText || '#ffffff'
                          : theme.textPrimary,
                    }}
                  >
                    |] Final
                  </Text>
                </TouchableOpacity>

                {(['1', '2'] as const).map((endNum) => {
                  const active = ending === endNum;
                  return (
                    <TouchableOpacity
                      key={`ending-${endNum}`}
                      style={[
                        styles.barlineChip,
                        {
                          backgroundColor: active
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.btnBg,
                          borderColor: active
                            ? theme.activeKeyBg || '#0284c7'
                            : theme.btnBorder,
                        },
                      ]}
                      onPress={() => setEnding((p) => (p === endNum ? undefined : endNum))}
                    >
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '700',
                          color: active ? theme.activeKeyText || '#ffffff' : theme.textPrimary,
                        }}
                      >
                        Casilla {endNum}.
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {onAddAnnotationToBar && (
                  <TouchableOpacity
                    style={[
                      styles.barlineChip,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={() => {
                      onClose();
                      onAddAnnotationToBar(bar);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather
                        name="message-square"
                        size={13}
                        color={theme.activeKeyBg || '#0284c7'}
                      />
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '700',
                          color: theme.activeKeyBg || '#0284c7',
                        }}
                      >
                        + Nota / Indicación
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Structure Actions: Insert Before/After & Delete Bar */}
            {(onInsertBar || onDeleteBar) && (
              <View style={[styles.sectionBlock, styles.dividerTop, { borderTopColor: theme.modalBorder }]}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  COMPASES (INSERTAR O BORRAR)
                </Text>
                {onInsertBar && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.structBtn,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      ]}
                      onPress={() => {
                        onInsertBar(bar.barNumber, 'before');
                        onClose();
                      }}
                    >
                      <Feather
                        name="plus"
                        size={14}
                        color={theme.activeKeyBg || '#0284c7'}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.structBtnText, { color: theme.textPrimary }]}>
                        Compás antes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.structBtn,
                        { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                      ]}
                      onPress={() => {
                        onInsertBar(bar.barNumber, 'after');
                        onClose();
                      }}
                    >
                      <Feather
                        name="plus"
                        size={14}
                        color={theme.activeKeyBg || '#0284c7'}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.structBtnText, { color: theme.textPrimary }]}>
                        Compás después
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {onDeleteBar && canDeleteBar && (
                  <TouchableOpacity
                    style={[
                      styles.deleteBarBtn,
                      { backgroundColor: '#ef444415', borderColor: '#ef444466' },
                    ]}
                    onPress={() => {
                      onDeleteBar(bar.barNumber);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={15} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteChordBtnText}>Eliminar este compás</Text>
                  </TouchableOpacity>
                )}
              </View>
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
              <Text style={styles.saveBtnText}>Guardar Compás</Text>
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
    maxHeight: '92%',
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
    paddingVertical: 13,
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
    gap: 13,
  },
  sectionBlock: {
    gap: 6,
  },
  dividerTop: {
    borderTopWidth: 1,
    paddingTop: 12,
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
    gap: 7,
  },
  chordChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 46,
    alignItems: 'center',
  },
  chordChipText: {
    fontSize: 15,
    fontWeight: '700',
  },
  addChordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  addChordChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  repeatChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  repeatChipText: {
    fontSize: 12.5,
  },
  reorderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  barlineChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  previewRoot: {
    fontSize: 30,
    fontWeight: '900',
  },
  previewQuality: {
    fontSize: 19,
    fontWeight: '700',
    marginLeft: 1,
  },
  previewBass: {
    fontSize: 21,
    fontWeight: '800',
    marginLeft: 2,
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
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rootBtn: {
    width: '14.8%',
    minWidth: 42,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  qualityBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
  },
  qualityBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bassScrollContent: {
    gap: 6,
    paddingRight: 8,
  },
  bassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
  },
  bassBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  repeatActiveCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  repeatActiveSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  convertPulseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  structBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  structBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  deleteChordBtnText: {
    color: '#ef4444',
    fontSize: 13.5,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

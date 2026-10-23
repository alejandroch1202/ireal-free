import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SongAST, BarAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';
import { MeasureCell } from './MeasureCell';
import { TwoMeasureRepeatCell } from './TwoMeasureRepeatCell';

interface LeadSheetGridProps {
  song: SongAST;
  theme: ThemeColors;
  fontScale?: number;
  onEditBar?: (bar: BarAST, chordIndex?: number) => void;
  onEditSection?: (rowIndex: number, currentLabel: string) => void;
  onEditAnnotation?: (annotationText: string, bar?: BarAST, rowIndex?: number) => void;
  onAppendBarsToSection?: (rowIndex: number, count: number) => void;
  onAppendBarsToRow?: (rowIndex: number, count: number) => void;
  onDuplicateSection?: (rowIndex: number, placement?: 'after' | 'end') => void;
  onDeleteSection?: (rowIndex: number) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onOpenAddSection?: () => void;
  onLoadHosannaSample?: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const LeadSheetGridInner: React.FC<LeadSheetGridProps> = ({
  song,
  theme,
  fontScale = 1.0,
  onEditBar,
  onEditSection,
  onEditAnnotation,
  onAppendBarsToSection,
  onAppendBarsToRow,
  onDuplicateSection,
  onDeleteSection,
  onDeleteRow,
  onOpenAddSection,
  onLoadHosannaSample,
  isEditMode = false,
  onToggleEditMode,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const rowMarginBottom = Math.max(5, Math.round(15 * fontScale));

  const confirmDeleteSection = (rowIndex: number, label: string) => {
    if (!onDeleteSection) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Eliminar la sección "${label}" y todos sus compases?`)) {
        onDeleteSection(rowIndex);
      }
      return;
    }
    Alert.alert(
      'Eliminar sección',
      `¿Eliminar la sección "${label}" junto con todos sus compases?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDeleteSection(rowIndex) },
      ]
    );
  };

  const confirmDeleteRow = (rowIndex: number) => {
    if (!onDeleteRow) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('¿Eliminar esta fila de compases?')) {
        onDeleteRow(rowIndex);
      }
      return;
    }
    Alert.alert('Eliminar fila', '¿Eliminar los compases de esta fila?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDeleteRow(rowIndex) },
    ]);
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.sheetContainer}>
        {/* Visual Edit Mode Active Banner with Undo / Redo */}
        {isEditMode && (
          <View
            style={[
              styles.editModeBanner,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.activeKeyBg || '#0284c7',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
              <Feather
                name="edit-3"
                size={15}
                color={theme.activeKeyBg || '#0284c7'}
                style={{ marginRight: 7 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.editModeBannerText, { color: theme.textPrimary }]}>
                  Modo Edición
                </Text>
                <Text
                  style={[styles.editModeBannerSub, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  Toca compases, títulos o notas
                </Text>
              </View>
            </View>

            <View style={styles.editBannerActions}>
              {onUndo && (
                <TouchableOpacity
                  style={[
                    styles.editHistoryBtn,
                    { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    !canUndo && styles.editHistoryDisabled,
                  ]}
                  onPress={onUndo}
                  disabled={!canUndo}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityLabel="Deshacer último cambio"
                >
                  <Feather name="rotate-ccw" size={13} color={theme.textPrimary} />
                  <Text style={[styles.editHistoryBtnText, { color: theme.textPrimary }]}>
                    Deshacer
                  </Text>
                </TouchableOpacity>
              )}

              {onRedo && (
                <TouchableOpacity
                  style={[
                    styles.editRedoIconBtn,
                    { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    !canRedo && styles.editHistoryDisabled,
                  ]}
                  onPress={onRedo}
                  disabled={!canRedo}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityLabel="Rehacer cambio"
                >
                  <Feather name="rotate-cw" size={13} color={theme.textPrimary} />
                </TouchableOpacity>
              )}

              {onToggleEditMode && (
                <TouchableOpacity
                  style={[
                    styles.editModeDoneBtn,
                    { backgroundColor: theme.activeKeyBg || '#0284c7' },
                  ]}
                  onPress={onToggleEditMode}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.editModeDoneBtnText,
                      { color: theme.activeKeyText || '#ffffff' },
                    ]}
                  >
                    Listo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Authentic iReal Sheet Header: Style (left), Song Title (center), Composer (right) */}
        <View style={styles.sheetHeader}>
          <Text
            style={[styles.sheetStyle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {song.style ? `(${song.style})` : ''}
          </Text>
          <Text
            style={[styles.sheetTitle, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text
            style={[styles.sheetComposer, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {song.composer || ''}
          </Text>
        </View>

        {/* Lead Sheet Rows or Empty State */}
        {song.rows.length === 0 ? (
          <View style={styles.emptySheetContainer}>
            <Feather name="music" size={44} color={theme.textSecondary} style={{ marginBottom: 14 }} />
            <Text style={[styles.emptySheetTitle, { color: theme.textPrimary }]}>
              {song.title === 'Sin Canciones' ? 'Biblioteca Vacía' : 'Partitura sin compases'}
            </Text>
            <Text style={[styles.emptySheetSub, { color: theme.textSecondary }]}>
              Toca "Importar" en la parte superior para cargar canciones o abrir archivos .html de iReal Pro.
            </Text>
            {Boolean(onLoadHosannaSample) && (
              <TouchableOpacity
                style={[
                  styles.emptySampleBtn,
                  {
                    backgroundColor: theme.btnBg,
                    borderColor: theme.activeKeyBg || '#0284c7',
                  },
                ]}
                onPress={onLoadHosannaSample}
                activeOpacity={0.8}
              >
                <Feather
                  name="music"
                  size={15}
                  color={theme.activeKeyBg || '#0284c7'}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.emptySampleBtnText, { color: theme.activeKeyBg || '#0284c7' }]}>
                  Cargar canción de muestra
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          (() => {
            // Guarantee strictly at most 4 bars per musical line (4-column standard grid)
            const normalizedRows: Array<{
              rowKey: string;
              rowIndex: number;
              sectionLabel?: string;
              sectionLetter?: string;
              sectionSuffix?: string;
              sectionSign?: 'segno' | 'coda';
              bars: BarAST[];
              isDirectionBlockRow: boolean;
              isPreambleBannerRow: boolean;
            }> = [];

            song.rows.forEach((row) => {
              const isDirection =
                row.bars.length === 2 &&
                row.bars.every(
                  (b) =>
                    b.chords.length === 0 &&
                    !b.isRepeatMeasure &&
                    !b.isDoubleRepeatMeasure &&
                    (b.bottomAnnotations.some((a) => /^(VERSO|CORO|FINAL)/i.test(a)) ||
                      b.annotations.some((a) => /^(VERSO|CORO|FINAL)/i.test(a)))
                );

              const isPreambleBanner =
                row.rowIndex === 0 &&
                row.bars.length === 1 &&
                row.bars[0].chords.length === 0 &&
                !row.bars[0].isRepeatMeasure &&
                row.bars[0].rightBarline === ']';

              if (isDirection || isPreambleBanner || row.bars.length <= 4) {
                normalizedRows.push({
                  rowKey: `row-${row.rowIndex}`,
                  rowIndex: row.rowIndex,
                  sectionLabel: row.sectionLabel,
                  sectionLetter: row.sectionLetter,
                  sectionSuffix: row.sectionSuffix,
                  sectionSign: row.sectionSign,
                  bars: row.bars,
                  isDirectionBlockRow: isDirection,
                  isPreambleBannerRow: isPreambleBanner,
                });
              } else {
                let remaining = [...row.bars];
                let subIdx = 0;
                while (remaining.length > 0) {
                  const chunk = remaining.slice(0, 4);
                  remaining = remaining.slice(4);
                  normalizedRows.push({
                    rowKey: `row-${row.rowIndex}-${subIdx}`,
                    rowIndex: row.rowIndex,
                    sectionLabel: subIdx === 0 ? row.sectionLabel : undefined,
                    sectionLetter: subIdx === 0 ? row.sectionLetter : undefined,
                    sectionSuffix: subIdx === 0 ? row.sectionSuffix : undefined,
                    sectionSign: subIdx === 0 ? row.sectionSign : undefined,
                    bars: chunk,
                    isDirectionBlockRow: false,
                    isPreambleBannerRow: false,
                  });
                  subIdx++;
                }
              }
            });

            return normalizedRows.map((row) => {
              const colWidthPercent = row.isDirectionBlockRow
                ? '50%'
                : row.isPreambleBannerRow
                ? '100%'
                : '25%';

              // Fill empty cells up to 4 columns to preserve clean vertical barline alignment
              const filledBars: (BarAST | null)[] = [...row.bars];
              if (!row.isDirectionBlockRow && !row.isPreambleBannerRow) {
                while (filledBars.length < 4) {
                  filledBars.push(null);
                }
              }

              const hasSection = Boolean(row.sectionLetter || row.sectionLabel);
              const sectionLetter = row.sectionLetter || (row.sectionLabel ? row.sectionLabel[0] : '');
              const sectionSuffix =
                row.sectionSuffix !== undefined
                  ? row.sectionSuffix
                  : row.sectionLabel
                  ? row.sectionLabel.slice(1)
                  : '';

            // Collect phrase-wide performance notes to render spanning below the measures
            const rowAnnotations: string[] = [];
            row.bars.forEach((b) => {
              b.bottomAnnotations?.forEach((ann) => {
                if (
                  !/^(CORO|FINAL|VERSO|BREAK|INTRO)/i.test(ann) &&
                  !/^(D\.S\.|D\.C\.|Fine|Al\s)/i.test(ann) &&
                  (ann.length > 10 || ann.startsWith('(') || ann.startsWith('Solo Batería'))
                ) {
                  if (!rowAnnotations.includes(ann)) {
                    rowAnnotations.push(ann);
                  }
                }
              });
              b.topAnnotations?.forEach((ann) => {
                if (ann.length > 10 && !/^\d+x$/i.test(ann) && !ann.startsWith('Puente')) {
                  if (!rowAnnotations.includes(ann)) {
                    rowAnnotations.push(ann);
                  }
                }
              });
            });

            const sectionDisplayName = row.sectionLabel || `${sectionLetter}${sectionSuffix}`;

            return (
              <View key={row.rowKey} style={styles.rowWrapper}>
                {/* Clean, natural Section Mark with prominent Segno / Coda signs & Edit Mode controls */}
                {hasSection || row.sectionSign ? (
                  <View style={styles.sectionHeaderLine}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {hasSection && (
                        <TouchableOpacity
                          onPress={
                            isEditMode && onEditSection
                              ? () => onEditSection(row.rowIndex, sectionDisplayName)
                              : undefined
                          }
                          disabled={!isEditMode || !onEditSection}
                          activeOpacity={0.7}
                          style={styles.sectionHeaderBtn}
                          accessibilityRole={isEditMode && onEditSection ? 'button' : undefined}
                          accessibilityLabel={`Editar sección ${sectionDisplayName}`}
                        >
                          <Text style={[styles.sectionTitleText, { color: theme.textPrimary }]}>
                            {sectionDisplayName}
                          </Text>
                          {isEditMode && Boolean(onEditSection) && (
                            <Feather
                              name="edit-2"
                              size={11}
                              color={theme.activeKeyBg || '#0284c7'}
                              style={{ marginLeft: 5 }}
                            />
                          )}
                        </TouchableOpacity>
                      )}
                      {row.sectionSign && (
                        <Text
                          style={[
                            styles.sectionSignText,
                            {
                              color: theme.textPrimary,
                              fontSize: Math.round((row.sectionSign === 'coda' ? 42 : 24) * fontScale),
                              lineHeight: Math.round((row.sectionSign === 'coda' ? 44 : 26) * fontScale),
                              marginLeft: hasSection ? 6 : 0,
                            },
                          ]}
                        >
                          {row.sectionSign === 'segno' ? '𝄋' : '𝄌'}
                        </Text>
                      )}
                    </View>

                    {/* Quick Section Actions in Edit Mode */}
                    {isEditMode && hasSection && (
                      <View style={styles.rowEditActions}>
                        {onAppendBarsToSection && (
                          <>
                            <TouchableOpacity
                              style={[
                                styles.miniActionChip,
                                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                              ]}
                              onPress={() => onAppendBarsToSection(row.rowIndex, 1)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.miniActionText,
                                  { color: theme.activeKeyBg || '#0284c7' },
                                ]}
                              >
                                + Compás
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.miniActionChip,
                                { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                              ]}
                              onPress={() => onAppendBarsToSection(row.rowIndex, 4)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.miniActionText,
                                  { color: theme.activeKeyBg || '#0284c7' },
                                ]}
                              >
                                +4
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {onDuplicateSection && (
                          <TouchableOpacity
                            style={[
                              styles.miniActionChip,
                              {
                                backgroundColor: theme.btnBg,
                                borderColor: theme.btnBorder,
                                flexDirection: 'row',
                                alignItems: 'center',
                              },
                            ]}
                            onPress={() => onDuplicateSection(row.rowIndex, 'after')}
                            activeOpacity={0.7}
                            accessibilityLabel={`Duplicar sección ${sectionDisplayName}`}
                          >
                            <Feather
                              name="copy"
                              size={11}
                              color={theme.textPrimary}
                              style={{ marginRight: 3 }}
                            />
                            <Text style={[styles.miniActionText, { color: theme.textPrimary }]}>
                              Duplicar
                            </Text>
                          </TouchableOpacity>
                        )}
                        {onDeleteSection && song.rows.length > 1 && (
                          <TouchableOpacity
                            style={[
                              styles.miniDeleteChip,
                              { backgroundColor: '#ef444415', borderColor: '#ef444455' },
                            ]}
                            onPress={() => confirmDeleteSection(row.rowIndex, sectionDisplayName)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Eliminar sección ${sectionDisplayName}`}
                          >
                            <Feather name="trash-2" size={12} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ) : isEditMode && !row.isDirectionBlockRow && !row.isPreambleBannerRow ? (
                  /* Continuation row edit controls: allow naming a new section here or deleting this row */
                  <View style={styles.continuationEditStrip}>
                    {onEditSection ? (
                      <TouchableOpacity
                        style={styles.addSectionTitleHint}
                        onPress={() => onEditSection(row.rowIndex, '')}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="plus"
                          size={11}
                          color={theme.textSecondary}
                          style={{ marginRight: 3 }}
                        />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>
                          Título sección
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View />
                    )}
                    {onDeleteRow && song.rows.length > 1 && (
                      <TouchableOpacity
                        style={[
                          styles.miniDeleteChip,
                          { backgroundColor: '#ef444412', borderColor: '#ef444444' },
                        ]}
                        onPress={() => confirmDeleteRow(row.rowIndex)}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={11} color="#ef4444" style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#ef4444' }}>
                          Fila
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                {/* Musical Measures Line */}
                <View
                  style={[
                    styles.measuresRow,
                    {
                      marginBottom: rowAnnotations.length > 0 ? 4 : rowMarginBottom,
                    },
                  ]}
                >
                  {(() => {
                    const cells: React.ReactNode[] = [];
                    for (let barIndex = 0; barIndex < filledBars.length; barIndex++) {
                      const bar = filledBars[barIndex];
                      const isFirst = barIndex === 0;
                      const isLast = barIndex === row.bars.length - 1;

                      if (!bar) {
                        // In Edit Mode, turn the immediate next empty slot into a dashed "+ Compás" button!
                        if (isEditMode && barIndex === row.bars.length && onAppendBarsToRow) {
                          cells.push(
                            <TouchableOpacity
                              key={`add-bar-slot-${barIndex}`}
                              style={[
                                styles.addBarSlotBtn,
                                {
                                  width: colWidthPercent as any,
                                  minHeight: Math.max(36, Math.round(66 * fontScale)),
                                  borderColor: (theme.activeKeyBg || '#0284c7') + '66',
                                  backgroundColor: (theme.activeKeyBg || '#0284c7') + '0c',
                                },
                              ]}
                              onPress={() => onAppendBarsToRow(row.rowIndex, 1)}
                              activeOpacity={0.7}
                            >
                              <Feather
                                name="plus"
                                size={14}
                                color={theme.activeKeyBg || '#0284c7'}
                              />
                              <Text
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: '700',
                                  color: theme.activeKeyBg || '#0284c7',
                                  marginTop: 2,
                                }}
                              >
                                Compás
                              </Text>
                            </TouchableOpacity>
                          );
                          continue;
                        }

                        // Clean whitespace for incomplete rows without fake barlines
                        cells.push(
                          <View
                            key={`empty-bar-${barIndex}`}
                            style={[styles.placeholderCell, { width: (colWidthPercent as any) }]}
                          />
                        );
                        continue;
                      }

                      // When a two-measure repeat is present with a companion empty measure,
                      // group them into a single 50% width unit with the simile mark centered across both
                      const nextBar = barIndex + 1 < filledBars.length ? filledBars[barIndex + 1] : null;
                      const canGroupDoubleRepeat =
                        bar.isDoubleRepeatMeasure &&
                        nextBar !== null &&
                        nextBar.chords.length === 0 &&
                        !nextBar.isRepeatMeasure &&
                        !nextBar.isDoubleRepeatMeasure;

                      if (canGroupDoubleRepeat && nextBar) {
                        const isDoubleLast = (barIndex + 1) === row.bars.length - 1;
                        const doubleColWidth = row.isDirectionBlockRow ? '100%' : '50%';
                        cells.push(
                          <TwoMeasureRepeatCell
                            key={`double-repeat-${bar.id}-${nextBar.id}`}
                            firstBar={bar}
                            secondBar={nextBar}
                            theme={theme}
                            fontScale={fontScale}
                            cellWidth={doubleColWidth}
                            onPressBar={isEditMode ? onEditBar : undefined}
                            isFirstInRow={isFirst}
                            isLastInRow={isDoubleLast}
                          />
                        );
                        barIndex++; // Skip companion measure as it is rendered in TwoMeasureRepeatCell
                        continue;
                      }

                      cells.push(
                        <MeasureCell
                          key={bar.id}
                          bar={bar}
                          isFirstInRow={isFirst}
                          isLastInRow={isLast}
                          theme={theme}
                          fontScale={fontScale}
                          cellWidth={colWidthPercent}
                          onPressBar={isEditMode ? onEditBar : undefined}
                          onEditAnnotation={isEditMode ? onEditAnnotation : undefined}
                          isEditMode={isEditMode}
                        />
                      );
                    }
                    return cells;
                  })()}
                </View>

                {/* Spanning Row-Level Annotations (e.g. "(Tocar solamente una vez en la 2da vuelta)") */}
                {rowAnnotations.length > 0 && (
                  <View style={[styles.rowAnnotationsContainer, { marginBottom: rowMarginBottom }]}>
                    {rowAnnotations.map((ann, idx) => (
                      <TouchableOpacity
                        key={idx}
                        disabled={!isEditMode || !onEditAnnotation}
                        onPress={
                          isEditMode && onEditAnnotation
                            ? () => onEditAnnotation(ann, undefined, row.rowIndex)
                            : undefined
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rowAnnotationText,
                            {
                              color: theme.annotationColor,
                              fontSize: Math.round(13.5 * fontScale),
                            },
                            isEditMode && onEditAnnotation && { textDecorationLine: 'underline' },
                          ]}
                        >
                          {ann}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          });
        })()
        )}

        {/* Bottom Song Builder Toolbar (Visible in Edit Mode) */}
        {isEditMode && song.rows.length > 0 && song.title !== 'Sin Canciones' && (
          <View
            style={[
              styles.bottomBuilderCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.gridBorder,
              },
            ]}
          >
            <Text style={[styles.bottomBuilderTitle, { color: theme.textSecondary }]}>
              AÑADIR AL FINAL DE LA CANCIÓN
            </Text>
            <View style={styles.bottomBuilderBtnsRow}>
              {onAppendBarsToRow && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.builderBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={() => onAppendBarsToRow(song.rows.length - 1, 1)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="plus"
                      size={14}
                      color={theme.activeKeyBg || '#0284c7'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.builderBtnText, { color: theme.textPrimary }]}>
                      1 Compás
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.builderBtn,
                      { backgroundColor: theme.btnBg, borderColor: theme.btnBorder },
                    ]}
                    onPress={() => onAppendBarsToRow(song.rows.length - 1, 4)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="plus"
                      size={14}
                      color={theme.activeKeyBg || '#0284c7'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.builderBtnText, { color: theme.textPrimary }]}>
                      4 Compases
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {onOpenAddSection && (
                <TouchableOpacity
                  style={[
                    styles.builderBtnPrimary,
                    { backgroundColor: theme.activeKeyBg || '#0284c7' },
                  ]}
                  onPress={onOpenAddSection}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="plus-square"
                    size={14}
                    color={theme.activeKeyText || '#ffffff'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.builderBtnText,
                      { color: theme.activeKeyText || '#ffffff' },
                    ]}
                  >
                    Nueva Sección
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export const LeadSheetGrid = React.memo(LeadSheetGridInner);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 60,
  },
  sheetContainer: {
    width: '100%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 16,
    paddingTop: 4,
  },
  sheetStyle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'left',
  },
  sheetTitle: {
    flex: 2,
    fontSize: 14.5,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sheetComposer: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  rowWrapper: {
    width: '100%',
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 2,
  },
  sectionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionSignText: {
    fontWeight: '900',
    marginLeft: 6,
    includeFontPadding: false,
  },
  rowAnnotationsContainer: {
    width: '100%',
    paddingLeft: 4,
    paddingRight: 4,
    paddingTop: 2,
  },
  rowAnnotationText: {
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  measuresRow: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
  },
  placeholderCell: {
    flex: 1,
    width: '25%',
  },
  emptySheetContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySheetIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptySheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySheetSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  emptySampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  emptySampleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  editModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  editModeBannerText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  editModeBannerSub: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  editBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 7,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  editHistoryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  editRedoIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHistoryDisabled: {
    opacity: 0.35,
  },
  editModeDoneBtn: {
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  editModeDoneBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniActionChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniActionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  miniDeleteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  continuationEditStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingHorizontal: 2,
  },
  addSectionTitleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  addBarSlotBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 6,
    marginLeft: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBuilderCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bottomBuilderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bottomBuilderBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  builderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  builderBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
  builderBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});

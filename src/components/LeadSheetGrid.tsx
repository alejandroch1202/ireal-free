import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
}

export const LeadSheetGrid: React.FC<LeadSheetGridProps> = ({
  song,
  theme,
  fontScale = 1.0,
  onEditBar,
  onEditSection,
}) => {
  const rowMarginBottom = Math.max(5, Math.round(15 * fontScale));

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.sheetContainer}>
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

            return (
              <View key={row.rowKey} style={styles.rowWrapper}>
                {/* Clean, natural Section Mark with prominent Segno / Coda signs */}
                {(hasSection || row.sectionSign) && (
                  <View style={styles.sectionHeaderLine}>
                    {hasSection && (
                      <TouchableOpacity
                        onPress={
                          onEditSection
                            ? () =>
                                onEditSection(
                                  row.rowIndex,
                                  row.sectionLabel || `${sectionLetter}${sectionSuffix}`
                                )
                            : undefined
                        }
                        disabled={!onEditSection}
                        activeOpacity={0.7}
                        style={styles.sectionHeaderBtn}
                        accessibilityRole={onEditSection ? 'button' : undefined}
                        accessibilityLabel={`Editar sección ${row.sectionLabel || `${sectionLetter}${sectionSuffix}`}`}
                      >
                        <Text style={[styles.sectionTitleText, { color: theme.textPrimary }]}>
                          {row.sectionLabel || `${sectionLetter}${sectionSuffix}`}
                        </Text>
                        {Boolean(onEditSection) && (
                          <Feather
                            name="edit-2"
                            size={11}
                            color={theme.textSecondary}
                            style={{ marginLeft: 5, opacity: 0.7 }}
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
                )}

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
                            onPressBar={onEditBar}
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
                          onPressBar={onEditBar}
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
                      <Text
                        key={idx}
                        style={[
                          styles.rowAnnotationText,
                          {
                            color: theme.annotationColor,
                            fontSize: Math.round(13.5 * fontScale),
                          },
                        ]}
                      >
                        {ann}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          });
        })()
        )}
      </View>
    </ScrollView>
  );
};

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
});

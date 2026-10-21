import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { SongAST, BarAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';
import { MeasureCell } from './MeasureCell';

interface LeadSheetGridProps {
  song: SongAST;
  theme: ThemeColors;
  fontScale?: number;
}

export const LeadSheetGrid: React.FC<LeadSheetGridProps> = ({
  song,
  theme,
  fontScale = 1.0,
}) => {
  const rowMarginBottom = Math.max(12, Math.round(20 * fontScale));

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
            <Text style={styles.emptySheetIcon}>🎼</Text>
            <Text style={[styles.emptySheetTitle, { color: theme.textPrimary }]}>
              {song.title === 'Sin Canciones' ? 'Biblioteca Vacía' : 'Partitura sin compases'}
            </Text>
            <Text style={[styles.emptySheetSub, { color: theme.textSecondary }]}>
              Usa el menú superior o ⚙️ para importar canciones o abrir archivos .html de iReal Pro.
            </Text>
          </View>
        ) : (
          song.rows.map((row) => {
            const isDirectionBlockRow =
              row.bars.length === 2 &&
              row.bars.every(
                (b) =>
                  b.chords.length === 0 &&
                  !b.isRepeatMeasure &&
                  !b.isDoubleRepeatMeasure &&
                  (b.bottomAnnotations.some((a) => /^(VERSO|CORO|FINAL)/i.test(a)) ||
                    b.annotations.some((a) => /^(VERSO|CORO|FINAL)/i.test(a)))
              );

            const isPreambleRow = row.bars.length === 1;

            const colWidthPercent = isDirectionBlockRow
              ? '50%'
              : isPreambleRow
              ? '100%'
              : row.bars.length >= 5
              ? `${Math.floor(100 / row.bars.length)}%`
              : '25%';

            const filledBars: (BarAST | null)[] = [...row.bars];
            if (!isDirectionBlockRow && !isPreambleRow) {
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
              <View key={`row-${row.rowIndex}`} style={styles.rowWrapper}>
                {/* Clean, natural Section Mark with prominent Segno / Coda signs */}
                {(hasSection || row.sectionSign) && (
                  <View style={styles.sectionHeaderLine}>
                    {hasSection && (
                      <Text style={[styles.sectionTitleText, { color: theme.textPrimary }]}>
                        {row.sectionLabel || `${sectionLetter}${sectionSuffix}`}
                      </Text>
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
                  {filledBars.map((bar, barIndex) => {
                    const isFirst = barIndex === 0;
                    const isLast = barIndex === row.bars.length - 1;

                    if (!bar) {
                      // Clean whitespace for incomplete rows without fake barlines
                      return (
                        <View
                          key={`empty-bar-${barIndex}`}
                          style={[styles.placeholderCell, { width: (colWidthPercent as any) }]}
                        />
                      );
                    }

                    return (
                      <MeasureCell
                        key={bar.id}
                        bar={bar}
                        isFirstInRow={isFirst}
                        isLastInRow={isLast}
                        theme={theme}
                        fontScale={fontScale}
                        cellWidth={colWidthPercent}
                      />
                    );
                  })}
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
          })
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

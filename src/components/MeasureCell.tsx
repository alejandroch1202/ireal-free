import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BarAST, ChordToken } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';

interface MeasureCellProps {
  bar: BarAST;
  isFirstInRow: boolean;
  isLastInRow: boolean;
  theme: ThemeColors;
  fontScale?: number;
  cellWidth?: string;
}

export const MeasureCell: React.FC<MeasureCellProps> = ({
  bar,
  isFirstInRow,
  isLastInRow,
  theme,
  fontScale = 1.0,
  cellWidth,
}) => {
  const isRepeatStart = bar.leftBarline === '{';
  const isSectionStart = bar.leftBarline === '[';
  const isRepeatEnd = bar.rightBarline === '}';
  const isFinalBar = bar.rightBarline === 'Z';
  const isSectionEnd = bar.rightBarline === ']';

  const chordCount = bar.chords.length;
  const cellHeight = Math.max(54, Math.round(72 * fontScale));

  // Time signature parts (e.g. "4/4" -> ["4", "4"])
  const timeSigParts = bar.timeSignature ? bar.timeSignature.split('/') : null;

  // Prominent center direction (e.g. "CORO", "FINAL", "INTRO") if measure has no chords
  const centerAnnotation =
    chordCount === 0 && !bar.isRepeatMeasure && !bar.isDoubleRepeatMeasure
      ? bar.bottomAnnotations.find((a) => /^(CORO|FINAL|INTRO|BREAK|SOLO|CODA|PUENTE|VERSO)/i.test(a)) ||
        bar.annotations.find((a) => /^(CORO|FINAL|INTRO|BREAK|SOLO|CODA|PUENTE|VERSO)/i.test(a))
      : null;

  // Find D.S. / D.C. annotation if double repeat measure to position right under //
  const dsRepeatAnnotation =
    bar.isDoubleRepeatMeasure
      ? bar.bottomAnnotations.find((a) => /^(D\.S\.|D\.C\.)/i.test(a)) ||
        bar.annotations.find((a) => /^(D\.S\.|D\.C\.)/i.test(a))
      : null;

  // Filter bottom annotations to exclude center annotation, ds repeat annotation, and row-level notes
  const remainingBottomAnnotations = bar.bottomAnnotations.filter(
    (a) =>
      a !== centerAnnotation &&
      a !== dsRepeatAnnotation &&
      !a.startsWith('(') &&
      !/^(Solo Batería)/i.test(a) &&
      (a.length <= 10 || /^(D\.S\.|D\.C\.|Fine|Break|Al\s)/i.test(a))
  );

  return (
    <View
      style={[
        styles.cellContainer,
        {
          width: (cellWidth as any) || '25%',
          minHeight: cellHeight,
        },
        isFirstInRow && !isRepeatStart && !isSectionStart && {
          borderLeftWidth: 1.5,
          borderLeftColor: theme.barline,
        },
      ]}
    >
      {/* Alternate Ending Volta Bracket (1., 2., etc.) */}
      {bar.ending && (
        <View style={styles.endingVoltaContainer}>
          <View style={[styles.endingTopLine, { backgroundColor: theme.thickBarline }]} />
          <View style={[styles.endingHookLeft, { backgroundColor: theme.thickBarline }]} />
          <Text style={[styles.endingNumberText, { color: theme.textPrimary }]}>
            {bar.ending}.
          </Text>
          {(isRepeatEnd || isFinalBar || isSectionEnd) && (
            <View style={[styles.endingHookRight, { backgroundColor: theme.thickBarline }]} />
          )}
        </View>
      )}

      {/* Left Repeat Barline (:|) */}
      {isRepeatStart && (
        <View style={styles.leftRepeatContainer}>
          <View style={[styles.thickBarline, { backgroundColor: theme.thickBarline }]} />
          <View style={[styles.thinBarline, { backgroundColor: theme.barlineAccent }]} />
          <View style={styles.repeatDotsCol}>
            <View style={[styles.dot, { backgroundColor: theme.thickBarline }]} />
            <View style={[styles.dot, { backgroundColor: theme.thickBarline }]} />
          </View>
        </View>
      )}

      {/* Left Section Bracket ([) */}
      {isSectionStart && !isRepeatStart && (
        <View style={styles.sectionBracketLeft}>
          <View style={[styles.thickBarline, { backgroundColor: theme.thickBarline }]} />
          <View style={[styles.bracketHookTop, { backgroundColor: theme.thickBarline }]} />
          <View style={[styles.bracketHookBottom, { backgroundColor: theme.thickBarline }]} />
        </View>
      )}

      {/* Main Measure Content Area */}
      <View style={styles.contentArea}>
        {/* Navigation sign (Segno / Coda) inside measure if not first in row */}
        {bar.navigationSign && !isFirstInRow && (
          <View style={styles.topLeftNavSign}>
            <Text
              style={[
                styles.navSignSymbol,
                {
                  color: theme.textPrimary,
                  fontSize: Math.round((bar.navigationSign === 'coda' ? 36 : 22) * fontScale),
                  lineHeight: Math.round((bar.navigationSign === 'coda' ? 38 : 24) * fontScale),
                },
              ]}
            >
              {bar.navigationSign === 'segno' ? '𝄋' : '𝄌'}
            </Text>
          </View>
        )}

        {/* Top Indicators: Top Annotations (e.g. 3x, 4x) on right */}
        {bar.topAnnotations && bar.topAnnotations.length > 0 ? (
          <View style={styles.topRightAnnotation}>
            {bar.topAnnotations.map((ann, i) => (
              <Text key={i} style={[styles.topAnnotationText, { color: theme.textPrimary }]}>
                {ann}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Stacked Musical Time Signature firmly at the beginning of the measure */}
        {timeSigParts && timeSigParts.length === 2 && (
          <View style={styles.timeSigStacked}>
            <Text
              style={[
                styles.timeSigDigit,
                { color: theme.textPrimary, fontSize: Math.round(15 * fontScale) },
              ]}
            >
              {timeSigParts[0]}
            </Text>
            <Text
              style={[
                styles.timeSigDigit,
                { color: theme.textPrimary, fontSize: Math.round(15 * fontScale) },
              ]}
            >
              {timeSigParts[1]}
            </Text>
          </View>
        )}

        {/* Chords / Pulses / Repeat Measure / Centered Directions */}
        <View
          style={[
            styles.chordsArea,
            timeSigParts && timeSigParts.length === 2 && {
              paddingLeft: Math.round(18 * fontScale),
            },
          ]}
        >

          {/* Centered Direction (e.g. CORO, FINAL) */}
          {centerAnnotation ? (
            <View style={styles.centerAnnotationContainer}>
              <Text
                style={[
                  styles.centerAnnotationText,
                  {
                    color: theme.textPrimary,
                    fontSize: Math.round(13.5 * fontScale),
                  },
                ]}
              >
                {centerAnnotation}
              </Text>
            </View>
          ) : bar.isRepeatMeasure ? (
            /* Repeat Measure Symbol % */
            <View style={styles.repeatMeasureContainer}>
              <Text
                style={[
                  styles.repeatMeasureSymbol,
                  {
                    color: theme.repeatSymbolColor,
                    fontSize: Math.round(27 * fontScale),
                  },
                ]}
              >
                %
              </Text>
            </View>
          ) : bar.isDoubleRepeatMeasure ? (
            /* Two-Measure Repeat Symbol // with dots and centered navigation direction */
            <View style={styles.doubleRepeatContainer}>
              <View style={styles.doubleRepeatSymbolRow}>
                <View style={[styles.repeatDot, { backgroundColor: theme.repeatSymbolColor }]} />
                <Text
                  style={[
                    styles.repeatMeasureSymbol,
                    {
                      color: theme.repeatSymbolColor,
                      fontSize: Math.round(24 * fontScale),
                      marginHorizontal: 3,
                    },
                  ]}
                >
                  //
                </Text>
                <View style={[styles.repeatDot, { backgroundColor: theme.repeatSymbolColor }]} />
              </View>
              {dsRepeatAnnotation && (
                <Text
                  style={[
                    styles.dsAlCodaText,
                    {
                      color: theme.textPrimary,
                      fontSize: Math.round(10.5 * fontScale),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {dsRepeatAnnotation}
                </Text>
              )}
            </View>
          ) : bar.elements && bar.elements.length > 0 ? (
            /* Sequential Elements (chords & beat pulses placed in accurate rhythmic order) */
            <View
              style={[
                styles.chordsRow,
                bar.elements.length === 1 && styles.chordsRowSingle,
              ]}
            >
              {bar.elements.map((elem, idx) => {
                if (elem.type === 'pulse') {
                  return (
                    <View key={`pulse-${idx}`} style={styles.pulseItem}>
                      {elem.passingChord ? (
                        <View style={styles.passingChordOnPulse}>
                          <RenderChord
                            chord={elem.passingChord}
                            count={bar.elements.length}
                            theme={theme}
                            fontScale={fontScale}
                            isPassing={true}
                          />
                        </View>
                      ) : null}
                      <Text
                        style={[
                          styles.pulseSlashText,
                          {
                            color: theme.textSecondary,
                            fontSize: Math.round(20 * fontScale),
                            lineHeight: Math.round(22 * fontScale),
                          },
                        ]}
                      >
                        /
                      </Text>
                    </View>
                  );
                }
                return (
                  <View
                    key={`chord-${elem.chord.raw}-${idx}`}
                    style={[
                      elem.isPassing ? styles.standalonePassingChordItem : styles.elementChordItem,
                    ]}
                  >
                    <RenderChord
                      chord={elem.chord}
                      count={bar.elements.length}
                      theme={theme}
                      fontScale={fontScale}
                      isPassing={elem.isPassing}
                      isSmall={elem.isSmall}
                    />
                  </View>
                );
              })}
            </View>
          ) : chordCount > 0 ? (
            /* Fallback chords row */
            <View
              style={[
                styles.chordsRow,
                chordCount === 1 && styles.chordsRowSingle,
              ]}
            >
              {bar.chords.map((chord, index) => (
                <RenderChord
                  key={`${chord.raw}-${index}`}
                  chord={chord}
                  count={chordCount}
                  theme={theme}
                  fontScale={fontScale}
                />
              ))}
            </View>
          ) : (
            /* Empty Measure */
            <View style={styles.emptyMeasureContainer} />
          )}
        </View>

        {/* Bottom Staff Annotations (e.g. "Al Intro", "Break", "Fine") */}
        {remainingBottomAnnotations.length > 0 ? (
          <View style={styles.bottomAnnotationsRow}>
            {remainingBottomAnnotations.map((ann, i) => {
              const isRightAligned = /^(Fine|Al\s|D\.C\.)/i.test(ann);
              return (
                <Text
                  key={i}
                  style={[
                    styles.bottomAnnotationText,
                    {
                      color: theme.textPrimary,
                      fontSize: Math.round(9.5 * fontScale),
                    },
                    isRightAligned && styles.bottomAnnotationRight,
                  ]}
                  numberOfLines={2}
                >
                  {ann}
                </Text>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Right Barline / Repeat End / Final Double Bar / Section Bracket */}
      {isRepeatEnd ? (
        <View style={styles.rightRepeatContainer}>
          <View style={styles.repeatDotsCol}>
            <View style={[styles.dot, { backgroundColor: theme.thickBarline }]} />
            <View style={[styles.dot, { backgroundColor: theme.thickBarline }]} />
          </View>
          <View style={[styles.thinBarline, { backgroundColor: theme.barlineAccent }]} />
          <View style={[styles.thickBarline, { backgroundColor: theme.thickBarline }]} />
        </View>
      ) : isFinalBar || isSectionEnd ? (
        <View style={styles.finalBarContainer}>
          <View style={[styles.thinBarline, { backgroundColor: theme.barlineAccent }]} />
          <View style={[styles.thickBarline, { backgroundColor: theme.thickBarline }]} />
        </View>
      ) : (
        <View style={[styles.standardRightBorder, { backgroundColor: theme.barline }]} />
      )}
    </View>
  );
};

interface RenderChordProps {
  chord: ChordToken;
  count: number;
  theme: ThemeColors;
  fontScale: number;
  isPassing?: boolean;
  isSmall?: boolean;
}

const RenderChord: React.FC<RenderChordProps> = ({
  chord,
  count,
  theme,
  fontScale,
  isPassing = false,
  isSmall = false,
}) => {
  const slashIndex = chord.displayText.indexOf('/');
  const chordPart = slashIndex >= 0 ? chord.displayText.slice(0, slashIndex) : chord.displayText;
  const bassPart = slashIndex >= 0 ? chord.displayText.slice(slashIndex) : null;

  const root = chord.root;
  const quality = chordPart.slice(root.length);

  const baseRoot = isPassing
    ? 13
    : isSmall
    ? (count === 1 ? 20 : count === 2 ? 16 : 13)
    : (count === 1 ? 28 : count === 2 ? 21 : 16);
  const baseQuality = isPassing
    ? 9.5
    : isSmall
    ? (count === 1 ? 12 : count === 2 ? 10 : 9)
    : (count === 1 ? 17 : count === 2 ? 14 : 11);
  const baseBass = isPassing
    ? 9
    : isSmall
    ? (count === 1 ? 10 : count === 2 ? 9 : 8)
    : (count === 1 ? 14 : count === 2 ? 12 : 10);

  const rootSize = Math.round(baseRoot * fontScale);
  const qualitySize = Math.round(baseQuality * fontScale);
  const bassSize = Math.round(baseBass * fontScale);

  if (bassPart) {
    const bassNote = bassPart.startsWith('/') ? bassPart.slice(1) : bassPart;
    const slashSize = Math.round(bassSize * 1.22);
    const bassOffsetTop = Math.round(rootSize * 0.36);

    // Diagonal Slash Chord: Root on upper-left, /Bass on lower-right (like the % symbol)
    return (
      <View style={[styles.slashChordDiagonal, isPassing && styles.passingSlashChord]}>
        <View style={styles.rootQualityRow}>
          <Text style={[styles.chordRoot, { fontSize: rootSize, color: theme.chordRoot }]}>
            {root}
          </Text>
          {quality ? (
            <Text style={[styles.chordQuality, { fontSize: qualitySize, color: theme.chordRoot }]}>
              {quality}
            </Text>
          ) : null}
        </View>

        <View style={[styles.bassSlashRow, { marginTop: bassOffsetTop }]}>
          <Text style={[styles.slashChar, { fontSize: slashSize, color: theme.chordBass }]}>
            /
          </Text>
          <Text style={[styles.chordBassSub, { fontSize: bassSize, color: theme.chordBass }]}>
            {bassNote}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.chordWrapper, isPassing && styles.passingChordWrapper]}>
      <Text style={styles.chordText} numberOfLines={1}>
        <Text style={[styles.chordRoot, { fontSize: rootSize, color: theme.chordRoot }]}>
          {root}
        </Text>
        {quality ? (
          <Text style={[styles.chordQuality, { fontSize: qualitySize, color: theme.chordRoot }]}>
            {quality}
          </Text>
        ) : null}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cellContainer: {
    flex: 1,
    width: '25%',
    flexDirection: 'row',
    position: 'relative',
    overflow: 'visible',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  topRightAnnotation: {
    position: 'absolute',
    top: -1,
    right: 2,
    zIndex: 2,
  },
  topAnnotationText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  topLeftNavSign: {
    position: 'absolute',
    top: -2,
    left: 2,
    zIndex: 2,
  },
  navSignSymbol: {
    fontWeight: '900',
  },
  timeSigStacked: {
    position: 'absolute',
    left: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  timeSigDigit: {
    fontWeight: '900',
    lineHeight: 15,
  },
  chordsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chordsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 1,
    paddingBottom: 3,
  },
  chordsRowSingle: {
    justifyContent: 'center',
  },
  chordWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  chordText: {
    textAlign: 'center',
  },
  chordRoot: {
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  chordQuality: {
    fontWeight: '700',
  },
  slashChordDiagonal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  rootQualityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bassSlashRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 1,
  },
  slashChar: {
    fontWeight: '900',
    marginRight: 0.5,
  },
  chordBassSub: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 3,
  },
  pulseItem: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 2,
    minWidth: 16,
  },
  passingChordOnPulse: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  standalonePassingChordItem: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: 2,
  },
  elementChordItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  passingSlashChord: {
    opacity: 0.95,
  },
  passingChordWrapper: {
    opacity: 0.95,
  },
  pulseSlashText: {
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pulseSlash: {
    fontWeight: '900',
    fontStyle: 'italic',
    marginHorizontal: 1,
  },
  repeatMeasureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatMeasureSymbol: {
    fontWeight: '900',
  },
  doubleRepeatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleRepeatSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dsAlCodaText: {
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: 'center',
  },
  repeatDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  endingVoltaContainer: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    height: 14,
    zIndex: 5,
  },
  endingTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  endingHookLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1.5,
    height: 9,
  },
  endingHookRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 1.5,
    height: 9,
  },
  endingNumberText: {
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    marginLeft: 3,
    marginTop: 2,
  },
  centerAnnotationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAnnotationText: {
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  emptyMeasureContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAnnotationsRow: {
    position: 'absolute',
    bottom: -3,
    left: 2,
    right: 2,
    zIndex: 2,
  },
  bottomAnnotationText: {
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  bottomAnnotationRight: {
    alignSelf: 'flex-end',
    textAlign: 'right',
    paddingRight: 1,
  },
  standardRightBorder: {
    width: 1.5,
    alignSelf: 'stretch',
  },
  thickBarline: {
    width: 3.5,
    alignSelf: 'stretch',
  },
  thinBarline: {
    width: 1.5,
    alignSelf: 'stretch',
  },
  leftRepeatContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 1.5,
    paddingRight: 1,
  },
  rightRepeatContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 1.5,
    paddingLeft: 1,
  },
  finalBarContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2,
  },
  repeatDotsCol: {
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 1,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  sectionBracketLeft: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    position: 'relative',
    width: 5,
  },
  bracketHookTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 5,
    height: 2,
  },
  bracketHookBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 5,
    height: 2,
  },
});

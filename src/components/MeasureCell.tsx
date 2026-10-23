import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BarAST, ChordToken } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';
import { SingleMeasureRepeat, DoubleMeasureRepeat, RepeatBarlineDots } from './RepeatSymbols';

interface MeasureCellProps {
  bar: BarAST;
  isFirstInRow: boolean;
  isLastInRow: boolean;
  theme: ThemeColors;
  fontScale?: number;
  cellWidth?: string;
  onPressBar?: (bar: BarAST, chordIndex?: number) => void;
  onEditAnnotation?: (annotationText: string, bar: BarAST) => void;
  isEditMode?: boolean;
}

const MeasureCellInner: React.FC<MeasureCellProps> = ({
  bar,
  isFirstInRow,
  isLastInRow,
  theme,
  fontScale = 1.0,
  cellWidth,
  onPressBar,
  onEditAnnotation,
  isEditMode = false,
}) => {
  const isRepeatStart = bar.leftBarline === '{';
  const isSectionStart = bar.leftBarline === '[';
  const isRepeatEnd = bar.rightBarline === '}';
  const isFinalBar = bar.rightBarline === 'Z';
  const isSectionEnd = bar.rightBarline === ']';
  const isDoubleBarline = bar.rightBarline === '||';

  const chordCount = bar.chords.length;
  const isSingleChord =
    chordCount === 1 ||
    (bar.elements && bar.elements.length === 1 && bar.elements[0].type === 'chord');
  const cellHeight = Math.max(36, Math.round(66 * fontScale));

  // Time signature parts (e.g. "4/4" -> ["4", "4"])
  const timeSigParts = bar.timeSignature ? bar.timeSignature.split('/') : null;

  const elementCount = bar.elements ? bar.elements.length : chordCount;
  const isDenseBar = elementCount >= 3;

  // Single chords stay perfectly centered at the exact midpoint of the measure cell.
  // Multiple chords/pulses keep lateral padding so edge items never touch barlines,
  // tightening slightly on 3-4 beat measures so chords always have room.
  const leftPad = isSingleChord
    ? 0
    : timeSigParts && timeSigParts.length === 2
    ? Math.round((isDenseBar ? 14 : 18) * fontScale)
    : isRepeatStart
    ? Math.round((isDenseBar ? 11 : 15) * fontScale)
    : isSectionStart
    ? Math.round((isDenseBar ? 5 : 6) * fontScale)
    : 0;

  const rightPad = isSingleChord
    ? 0
    : isRepeatEnd
    ? Math.round((isDenseBar ? 11 : 15) * fontScale)
    : isFinalBar || isSectionEnd || isDoubleBarline
    ? Math.round((isDenseBar ? 6 : 8) * fontScale)
    : 0;

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
          <RepeatBarlineDots color={theme.thickBarline} fontScale={fontScale} />
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
      <TouchableOpacity
        style={styles.contentArea}
        onPress={onPressBar ? () => onPressBar(bar, 0) : undefined}
        disabled={!onPressBar}
        activeOpacity={0.85}
        accessibilityRole={onPressBar ? 'button' : undefined}
        accessibilityLabel={`Compás ${bar.barNumber}`}
      >
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
            {bar.topAnnotations.map((ann, i) => {
              const content = (
                <Text
                  key={i}
                  style={[
                    styles.topAnnotationText,
                    { color: theme.annotationColor || theme.textPrimary },
                    onEditAnnotation && { textDecorationLine: 'underline' },
                  ]}
                >
                  {ann}
                </Text>
              );
              if (onEditAnnotation) {
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onEditAnnotation(ann, bar)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {content}
                  </TouchableOpacity>
                );
              }
              return content;
            })}
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
            {
              paddingLeft: leftPad,
              paddingRight: rightPad,
            },
          ]}
        >

          {/* Centered Direction (e.g. CORO, FINAL) */}
          {centerAnnotation ? (
            <TouchableOpacity
              style={styles.centerAnnotationContainer}
              disabled={!onEditAnnotation}
              onPress={onEditAnnotation ? () => onEditAnnotation(centerAnnotation, bar) : undefined}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.centerAnnotationText,
                  {
                    color: theme.textPrimary,
                    fontSize: Math.round(13.5 * fontScale),
                  },
                  onEditAnnotation && { textDecorationLine: 'underline' },
                ]}
              >
                {centerAnnotation}
              </Text>
            </TouchableOpacity>
          ) : bar.isRepeatMeasure ? (
            /* Repeat Measure Symbol % */
            <View style={styles.repeatMeasureContainer}>
              <SingleMeasureRepeat
                color={theme.repeatSymbolColor}
                fontScale={fontScale}
              />
            </View>
          ) : bar.isDoubleRepeatMeasure ? (
            /* Two-Measure Repeat Symbol • // • with dots and centered navigation direction */
            <View style={styles.doubleRepeatContainer}>
              <DoubleMeasureRepeat
                color={theme.repeatSymbolColor}
                textColor={theme.textPrimary}
                fontScale={fontScale}
                annotation={dsRepeatAnnotation}
              />
            </View>
          ) : bar.elements && bar.elements.length > 0 ? (
            /* Sequential Elements (chords & beat pulses placed in accurate rhythmic order) */
            (() => {
              let chordCounter = 0;
              const elems = bar.elements;
              const hasPulses = elems.some((e) => e.type === 'pulse');
              const actualChordCount = elems.filter((e) => e.type === 'chord').length;

              // Build an authentic 4-beat spatial progression when the measure has rhythmic pulses or 4 beats
              let slots: Array<{
                key: string;
                elem: (typeof elems)[number] | null;
                chordIdx?: number;
              }> = [];

              if (elems.length === 4) {
                slots = elems.map((el, i) => ({
                  key: `slot-${i}`,
                  elem: el,
                  chordIdx:
                    el.type === 'chord'
                      ? chordCounter++
                      : el.passingChord
                      ? chordCounter++
                      : undefined,
                }));
              } else if (elems.length === 3 && elems[0].type === 'pulse' && elems[1].type === 'pulse') {
                // e.g. "ppA": beat 1 = pulse, beat 2 = pulse, beat 3 = chord A, beat 4 = empty
                slots = [
                  { key: 'slot-0', elem: elems[0] },
                  { key: 'slot-1', elem: elems[1] },
                  {
                    key: 'slot-2',
                    elem: elems[2],
                    chordIdx: elems[2].type === 'chord' ? chordCounter++ : undefined,
                  },
                  { key: 'slot-3', elem: null },
                ];
              } else if (elems.length === 3 && elems[0].type === 'chord' && elems[1].type === 'pulse' && elems[2].type === 'pulse') {
                // e.g. chord on beat 1, pulses on beats 2 and 3, beat 4 empty
                slots = [
                  {
                    key: 'slot-0',
                    elem: elems[0],
                    chordIdx: elems[0].type === 'chord' ? chordCounter++ : undefined,
                  },
                  { key: 'slot-1', elem: elems[1] },
                  { key: 'slot-2', elem: elems[2] },
                  { key: 'slot-3', elem: null },
                ];
              } else if (elems.length === 3 && elems[0].type === 'pulse' && elems[1].type === 'chord' && elems[2].type === 'pulse') {
                // e.g. "pAp": beat 1 = pulse, beat 2 = chord, beat 3 = pulse, beat 4 = empty
                slots = [
                  { key: 'slot-0', elem: elems[0] },
                  {
                    key: 'slot-1',
                    elem: elems[1],
                    chordIdx: chordCounter++,
                  },
                  { key: 'slot-2', elem: elems[2] },
                  { key: 'slot-3', elem: null },
                ];
              } else if (elems.length === 2 && elems[0].type === 'pulse' && elems[1].type === 'chord') {
                // e.g. "pA": beat 1 = pulse, beat 2 = chord, beats 3-4 = empty
                slots = [
                  { key: 'slot-0', elem: elems[0] },
                  {
                    key: 'slot-1',
                    elem: elems[1],
                    chordIdx: chordCounter++,
                  },
                  { key: 'slot-2', elem: null },
                  { key: 'slot-3', elem: null },
                ];
              } else {
                slots = elems.map((el, i) => ({
                  key: `slot-${i}`,
                  elem: el,
                  chordIdx:
                    el.type === 'chord'
                      ? chordCounter++
                      : el.passingChord
                      ? chordCounter++
                      : undefined,
                }));
              }

              const isGridMode = slots.length === 4 && hasPulses;
              // Effective density for sizing chords: chords always stay legible and NEVER clip to "..."
              const sizingCount = hasPulses
                ? actualChordCount <= 1
                  ? 2
                  : 3
                : Math.max(elems.length, actualChordCount);

              return (
                <View
                  style={[
                    styles.chordsRow,
                    elems.length === 1 && styles.chordsRowSingle,
                    isGridMode && styles.chordsRowPulseGrid,
                  ]}
                >
                  {slots.map((slot) => {
                    if (!slot.elem) {
                      return <View key={slot.key} style={styles.beatSlotEmpty} />;
                    }

                    const elem = slot.elem;
                    if (elem.type === 'pulse') {
                      const hasPassing = Boolean(elem.passingChord);
                      return (
                        <View
                          key={slot.key}
                          style={[
                            styles.pulseItem,
                            isGridMode &&
                              (hasPassing ? styles.beatSlotChord : styles.beatSlotPulse),
                          ]}
                        >
                          {elem.passingChord ? (
                            <View style={styles.passingChordOnPulse}>
                              <RenderChord
                                chord={elem.passingChord}
                                count={sizingCount}
                                theme={theme}
                                fontScale={fontScale}
                                isPassing={true}
                                onPress={
                                  onPressBar && slot.chordIdx !== undefined
                                    ? () => onPressBar(bar, slot.chordIdx)
                                    : undefined
                                }
                              />
                            </View>
                          ) : null}
                          <Text
                            style={[
                              styles.pulseSlashText,
                              {
                                color: theme.textSecondary,
                                fontSize: Math.round(14.5 * fontScale),
                                lineHeight: Math.round(18 * fontScale),
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
                        key={slot.key}
                        style={[
                          elem.isPassing
                            ? styles.standalonePassingChordItem
                            : styles.elementChordItem,
                          isGridMode && styles.beatSlotChord,
                        ]}
                      >
                        <RenderChord
                          chord={elem.chord}
                          count={sizingCount}
                          theme={theme}
                          fontScale={fontScale}
                          isPassing={elem.isPassing}
                          isSmall={elem.isSmall}
                          onPress={
                            onPressBar && slot.chordIdx !== undefined
                              ? () => onPressBar(bar, slot.chordIdx)
                              : undefined
                          }
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })()
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
                  onPress={onPressBar ? () => onPressBar(bar, index) : undefined}
                />
              ))}
            </View>
          ) : (
            /* Empty Measure (shows subtle + prompt when in Edit Mode) */
            <View style={styles.emptyMeasureContainer}>
              {isEditMode && (
                <Text
                  style={[
                    styles.emptyMeasureEditHint,
                    {
                      color: theme.textSecondary,
                      fontSize: Math.round(16 * fontScale),
                    },
                  ]}
                >
                  +
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom Staff Annotations (e.g. "Al Intro", "Break", "Fine") */}
        {remainingBottomAnnotations.length > 0 ? (
          <View
            style={[
              styles.bottomAnnotationsRow,
              isRepeatEnd && { right: Math.round(15 * fontScale) },
              isDoubleBarline && { right: Math.round(7 * fontScale) },
            ]}
          >
            {remainingBottomAnnotations.map((ann, i) => {
              const isRightAligned = /^(Fine|Al\s|D\.C\.)/i.test(ann);
              const content = (
                <Text
                  key={i}
                  style={[
                    styles.bottomAnnotationText,
                    {
                      color: theme.annotationColor || theme.textPrimary,
                      fontSize: Math.round(9.5 * fontScale),
                    },
                    isRightAligned && styles.bottomAnnotationRight,
                    onEditAnnotation && { textDecorationLine: 'underline' },
                  ]}
                  numberOfLines={2}
                >
                  {ann}
                </Text>
              );
              if (onEditAnnotation) {
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onEditAnnotation(ann, bar)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {content}
                  </TouchableOpacity>
                );
              }
              return content;
            })}
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Right Barline / Repeat End / Final Double Bar / Section Bracket / Double Barline || */}
      {isRepeatEnd ? (
        <View style={styles.rightRepeatContainer}>
          <RepeatBarlineDots color={theme.thickBarline} fontScale={fontScale} />
          <View style={[styles.thinBarline, { backgroundColor: theme.barlineAccent }]} />
          <View style={[styles.thickBarline, { backgroundColor: theme.thickBarline }]} />
        </View>
      ) : isFinalBar || isSectionEnd ? (
        <View style={styles.finalBarContainer}>
          <View style={[styles.thinBarline, { backgroundColor: theme.barlineAccent }]} />
          <View style={[styles.thickBarline, { backgroundColor: theme.thickBarline }]} />
        </View>
      ) : isDoubleBarline ? (
        <View style={styles.doubleBarlineRightContainer}>
          <View style={[styles.thinBarline, { backgroundColor: theme.barline }]} />
          <View style={[styles.thinBarline, { backgroundColor: theme.barline, marginLeft: 2.5 }]} />
        </View>
      ) : (
        <View style={[styles.standardRightBorder, { backgroundColor: theme.barline }]} />
      )}
    </View>
  );
};

export const MeasureCell = React.memo(MeasureCellInner);

interface RenderChordProps {
  chord: ChordToken;
  count: number;
  theme: ThemeColors;
  fontScale: number;
  isPassing?: boolean;
  isSmall?: boolean;
  onPress?: () => void;
}

const RenderChord: React.FC<RenderChordProps> = ({
  chord,
  count,
  theme,
  fontScale,
  isPassing = false,
  isSmall = false,
  onPress,
}) => {
  const slashIndex = chord.displayText.indexOf('/');
  const chordPart = slashIndex >= 0 ? chord.displayText.slice(0, slashIndex) : chord.displayText;
  const bassPart = slashIndex >= 0 ? chord.displayText.slice(slashIndex) : null;

  const root = chord.root;
  const quality = chordPart.slice(root.length);

  const baseRoot = isPassing
    ? 12
    : isSmall
    ? (count === 1 ? 20 : count === 2 ? 17.5 : count === 3 ? 15.5 : 13.5)
    : (count === 1 ? 28 : count === 2 ? 20.5 : count === 3 ? 17 : 14.5);
  const baseQuality = isPassing
    ? 9
    : isSmall
    ? (count === 1 ? 12 : count === 2 ? 10.5 : count === 3 ? 9.5 : 8.5)
    : (count === 1 ? 17 : count === 2 ? 13.5 : count === 3 ? 11 : 9.5);
  const baseBass = isPassing
    ? 8.5
    : isSmall
    ? (count === 1 ? 10 : count === 2 ? 9.5 : 8.5)
    : (count === 1 ? 14 : count === 2 ? 11.5 : 9.5);

  const rootSize = Math.round(baseRoot * fontScale);
  const qualitySize = Math.round(baseQuality * fontScale);
  const bassSize = Math.round(baseBass * fontScale);

  const rootColor = isPassing ? theme.annotationColor || '#e11d48' : theme.chordRoot;
  const qualityColor = isPassing ? theme.annotationColor || '#e11d48' : theme.chordRoot;
  const bassColor = isPassing ? theme.annotationColor || '#e11d48' : theme.chordBass;

  let chordNode: React.ReactNode;

  if (bassPart) {
    const bassNote = bassPart.startsWith('/') ? bassPart.slice(1) : bassPart;
    const slashSize = Math.round(bassSize * 1.22);
    const bassOffsetTop = Math.round(rootSize * 0.36);

    // Diagonal Slash Chord: Root on upper-left, /Bass on lower-right (like the % symbol)
    chordNode = (
      <View style={[styles.slashChordDiagonal, isPassing && styles.passingSlashChord]}>
        <View style={styles.rootQualityRow}>
          <Text style={[styles.chordRoot, { fontSize: rootSize, color: rootColor }]}>
            {root}
          </Text>
          {quality ? (
            <Text style={[styles.chordQuality, { fontSize: qualitySize, color: qualityColor }]}>
              {quality}
            </Text>
          ) : null}
        </View>

        <View style={[styles.bassSlashRow, { marginTop: bassOffsetTop }]}>
          <Text style={[styles.slashChar, { fontSize: slashSize, color: bassColor }]}>
            /
          </Text>
          <Text style={[styles.chordBassSub, { fontSize: bassSize, color: bassColor }]}>
            {bassNote}
          </Text>
        </View>
      </View>
    );
  } else {
    chordNode = (
      <View style={[styles.chordWrapper, isPassing && styles.passingChordWrapper]}>
        <View style={styles.rootQualityRow}>
          <Text style={[styles.chordRoot, { fontSize: rootSize, color: rootColor }]}>
            {root}
          </Text>
          {quality ? (
            <Text style={[styles.chordQuality, { fontSize: qualitySize, color: qualityColor }]}>
              {quality}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        {chordNode}
      </TouchableOpacity>
    );
  }

  return <>{chordNode}</>;
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
  chordsRowPulseGrid: {
    justifyContent: 'space-between',
  },
  chordWrapper: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0.5,
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
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 0.5,
  },
  rootQualityRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bassSlashRow: {
    flexShrink: 0,
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
    paddingHorizontal: 1,
    minWidth: 6,
  },
  beatSlotPulse: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 5,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  beatSlotChord: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  beatSlotEmpty: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 4,
  },
  passingChordOnPulse: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  standalonePassingChordItem: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: 2,
  },
  elementChordItem: {
    flexShrink: 0,
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
  emptyMeasureEditHint: {
    fontWeight: '700',
    opacity: 0.4,
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
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 2,
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
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    paddingRight: 1,
  },
  rightRepeatContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    paddingLeft: 1,
  },
  finalBarContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  doubleBarlineRightContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
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
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 4,
    flexDirection: 'row',
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

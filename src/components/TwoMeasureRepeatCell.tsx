import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BarAST } from '../types/ireal';
import type { ThemeColors } from '../theme/theme';
import { DoubleMeasureRepeat, RepeatBarlineDots } from './RepeatSymbols';

export interface TwoMeasureRepeatCellProps {
  firstBar: BarAST;
  secondBar: BarAST;
  theme: ThemeColors;
  fontScale?: number;
  cellWidth?: string;
  onPressBar?: (bar: BarAST, chordIndex?: number) => void;
  isFirstInRow?: boolean;
  isLastInRow?: boolean;
}

export const TwoMeasureRepeatCell: React.FC<TwoMeasureRepeatCellProps> = ({
  firstBar,
  secondBar,
  theme,
  fontScale = 1.0,
  cellWidth = '50%',
  onPressBar,
  isFirstInRow = false,
  isLastInRow = false,
}) => {
  const isRepeatStart = firstBar.leftBarline === '{';
  const isSectionStart = firstBar.leftBarline === '[';
  const isRepeatEnd = secondBar.rightBarline === '}';
  const isFinalBar = secondBar.rightBarline === 'Z';
  const isSectionEnd = secondBar.rightBarline === ']';
  const isDoubleBarline = secondBar.rightBarline === '||';

  const cellHeight = Math.max(36, Math.round(66 * fontScale));

  // Time signature on first bar if present
  const timeSigParts = firstBar.timeSignature ? firstBar.timeSignature.split('/') : null;

  // D.S. / D.C. annotation centered across the two-measure repeat
  const dsRepeatAnnotation =
    firstBar.bottomAnnotations.find((a) => /^(D\.S\.|D\.C\.)/i.test(a)) ||
    secondBar.bottomAnnotations.find((a) => /^(D\.S\.|D\.C\.)/i.test(a)) ||
    firstBar.annotations.find((a) => /^(D\.S\.|D\.C\.)/i.test(a)) ||
    secondBar.annotations.find((a) => /^(D\.S\.|D\.C\.)/i.test(a)) ||
    null;

  // Remaining bottom annotations (excluding DS annotation and row notes)
  const firstRemainingBottom = firstBar.bottomAnnotations.filter(
    (a) =>
      a !== dsRepeatAnnotation &&
      !a.startsWith('(') &&
      !/^(Solo Batería)/i.test(a) &&
      (a.length <= 10 || /^(Fine|Break|Al\s)/i.test(a))
  );

  const secondRemainingBottom = secondBar.bottomAnnotations.filter(
    (a) =>
      a !== dsRepeatAnnotation &&
      !a.startsWith('(') &&
      !/^(Solo Batería)/i.test(a) &&
      (a.length <= 10 || /^(Fine|Break|Al\s)/i.test(a))
  );

  // Check if both bars share a continuous volta ending
  const hasSharedEnding =
    Boolean(firstBar.ending) &&
    Boolean(secondBar.ending) &&
    firstBar.ending === secondBar.ending;

  return (
    <View
      style={[
        styles.container,
        {
          width: (cellWidth as any),
          minHeight: cellHeight,
          borderTopColor: theme.barline,
          borderBottomColor: theme.barline,
        },
        isFirstInRow && !isRepeatStart && !isSectionStart && {
          borderLeftWidth: 1.5,
          borderLeftColor: theme.barline,
        },
      ]}
    >
      {/* Continuous Ending Volta across both measures */}
      {hasSharedEnding && (
        <View style={styles.sharedEndingContainer}>
          <View style={[styles.endingTopLine, { backgroundColor: theme.thickBarline }]} />
          <View style={[styles.endingHookLeft, { backgroundColor: theme.thickBarline }]} />
          <Text style={[styles.endingNumberText, { color: theme.textPrimary }]}>
            {firstBar.ending}.
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

      {/* Left Half: First Measure */}
      <TouchableOpacity
        style={styles.halfMeasure}
        onPress={onPressBar ? () => onPressBar(firstBar, 0) : undefined}
        disabled={!onPressBar}
        activeOpacity={0.85}
        accessibilityRole={onPressBar ? 'button' : undefined}
        accessibilityLabel={`Compás ${firstBar.barNumber}`}
      >
        {/* Single Ending Volta (only on first bar) */}
        {!hasSharedEnding && firstBar.ending && (
          <View style={styles.halfEndingContainer}>
            <View style={[styles.endingTopLine, { backgroundColor: theme.thickBarline }]} />
            <View style={[styles.endingHookLeft, { backgroundColor: theme.thickBarline }]} />
            <Text style={[styles.endingNumberText, { color: theme.textPrimary }]}>
              {firstBar.ending}.
            </Text>
          </View>
        )}

        {/* Stacked Musical Time Signature if present */}
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

        {/* Navigation sign (Segno / Coda) on first bar */}
        {firstBar.navigationSign && !isFirstInRow && (
          <View style={styles.topLeftNavSign}>
            <Text
              style={[
                styles.navSignSymbol,
                {
                  color: theme.textPrimary,
                  fontSize: Math.round((firstBar.navigationSign === 'coda' ? 36 : 22) * fontScale),
                  lineHeight: Math.round((firstBar.navigationSign === 'coda' ? 38 : 24) * fontScale),
                },
              ]}
            >
              {firstBar.navigationSign === 'segno' ? '𝄋' : '𝄌'}
            </Text>
          </View>
        )}

        {/* Top Annotations on first bar */}
        {firstBar.topAnnotations && firstBar.topAnnotations.length > 0 && (
          <View style={styles.topRightAnnotation}>
            {firstBar.topAnnotations.map((ann, i) => (
              <Text key={i} style={[styles.topAnnotationText, { color: theme.textPrimary }]}>
                {ann}
              </Text>
            ))}
          </View>
        )}

        {/* Bottom annotations on first bar */}
        {firstRemainingBottom.length > 0 && (
          <View style={styles.bottomAnnotationsCol}>
            {firstRemainingBottom.map((ann, i) => (
              <Text
                key={i}
                style={[styles.bottomAnnotationText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {ann}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Exact Center Dividing Barline between Measure 1 and Measure 2 */}
      <View
        style={[
          styles.centerDividingBarline,
          { backgroundColor: theme.barline },
        ]}
      />

      {/* Right Half: Second Measure */}
      <TouchableOpacity
        style={styles.halfMeasure}
        onPress={onPressBar ? () => onPressBar(secondBar, 0) : undefined}
        disabled={!onPressBar}
        activeOpacity={0.85}
        accessibilityRole={onPressBar ? 'button' : undefined}
        accessibilityLabel={`Compás ${secondBar.barNumber}`}
      >
        {/* Single Ending Volta (only on second bar) */}
        {!hasSharedEnding && secondBar.ending && (
          <View style={styles.halfEndingContainer}>
            <View style={[styles.endingTopLine, { backgroundColor: theme.thickBarline }]} />
            <Text style={[styles.endingNumberText, { color: theme.textPrimary }]}>
              {secondBar.ending}.
            </Text>
            {(isRepeatEnd || isFinalBar || isSectionEnd) && (
              <View style={[styles.endingHookRight, { backgroundColor: theme.thickBarline }]} />
            )}
          </View>
        )}

        {/* Top Annotations on second bar */}
        {secondBar.topAnnotations && secondBar.topAnnotations.length > 0 && (
          <View style={styles.topRightAnnotation}>
            {secondBar.topAnnotations.map((ann, i) => (
              <Text key={i} style={[styles.topAnnotationText, { color: theme.textPrimary }]}>
                {ann}
              </Text>
            ))}
          </View>
        )}

        {/* Bottom annotations on second bar */}
        {secondRemainingBottom.length > 0 && (
          <View style={[styles.bottomAnnotationsCol, styles.bottomAnnotationsColRight]}>
            {secondRemainingBottom.map((ann, i) => (
              <Text
                key={i}
                style={[styles.bottomAnnotationText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {ann}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Centered Double Measure Repeat Symbol straddling the dividing barline */}
      <View style={styles.centeredDoubleRepeatOverlay} pointerEvents="none">
        <DoubleMeasureRepeat
          color={theme.repeatSymbolColor}
          textColor={theme.textPrimary}
          fontScale={fontScale}
          annotation={dsRepeatAnnotation}
        />
      </View>

      {/* Right Barline / Repeat End / Final Double Bar / Section Bracket */}
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

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  halfMeasure: {
    flex: 1,
    minHeight: 36,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDividingBarline: {
    width: 1.5,
    alignSelf: 'stretch',
    zIndex: 1,
  },
  centeredDoubleRepeatOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
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
  doubleBarlineRightContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2.5,
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
  sharedEndingContainer: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    height: 14,
    zIndex: 5,
  },
  halfEndingContainer: {
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
  timeSigStacked: {
    position: 'absolute',
    left: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  timeSigDigit: {
    fontWeight: '900',
    lineHeight: 15,
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
  topRightAnnotation: {
    position: 'absolute',
    top: 1,
    right: 3,
    zIndex: 2,
  },
  topAnnotationText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  bottomAnnotationsCol: {
    position: 'absolute',
    bottom: -3,
    left: 2,
    zIndex: 2,
  },
  bottomAnnotationsColRight: {
    left: undefined,
    right: 2,
  },
  bottomAnnotationText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
});

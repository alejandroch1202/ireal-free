import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SingleMeasureRepeatProps {
  color?: string;
  fontScale?: number;
}

interface DoubleMeasureRepeatProps {
  color?: string;
  textColor?: string;
  fontScale?: number;
  annotation?: string | null;
}

interface RepeatDotsProps {
  color?: string;
  fontScale?: number;
}

/**
 * Modern musical simile mark for 1-measure repeat (·/·).
 * Replaces generic font % character with authentic engraved music notation.
 */
export const SingleMeasureRepeat: React.FC<SingleMeasureRepeatProps> = ({
  color = '#ea580c',
  fontScale = 1.0,
}) => {
  const boxSize = Math.round(36 * fontScale);
  const slashLength = Math.round(28 * fontScale);
  const slashHeight = Math.max(3, Math.round(3.8 * fontScale));
  const dotSize = Math.max(5, Math.round(5.5 * fontScale));
  const dotOffset = Math.round(5 * fontScale);

  return (
    <View style={[styles.singleContainer, { width: boxSize, height: boxSize }]}>
      {/* Top-left dot */}
      <View
        style={[
          styles.solidDot,
          {
            position: 'absolute',
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            top: dotOffset,
            left: dotOffset,
          },
        ]}
      />

      {/* Central bold angled slash */}
      <View
        style={[
          styles.slashStroke,
          {
            width: slashLength,
            height: slashHeight,
            borderRadius: slashHeight / 2,
            backgroundColor: color,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />

      {/* Bottom-right dot */}
      <View
        style={[
          styles.solidDot,
          {
            position: 'absolute',
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            bottom: dotOffset,
            right: dotOffset,
          },
        ]}
      />
    </View>
  );
};

/**
 * Modern musical simile mark for 2-measure repeat (• // •).
 * Centers parallel slashes crossing the measure barline flanked by solid dots.
 */
export const DoubleMeasureRepeat: React.FC<DoubleMeasureRepeatProps> = ({
  color = '#ea580c',
  textColor = '#0f172a',
  fontScale = 1.0,
  annotation,
}) => {
  const slashLength = Math.round(30 * fontScale);
  const slashHeight = Math.max(3, Math.round(3.8 * fontScale));
  const dotSize = Math.max(5, Math.round(6 * fontScale));
  const slashBoxWidth = Math.round(32 * fontScale);
  const slashBoxHeight = Math.round(30 * fontScale);
  const halfSpacing = Math.max(3.5, Math.round(4.8 * fontScale));
  const dotMargin = Math.round(8 * fontScale);

  return (
    <View style={styles.doubleContainer}>
      <View style={styles.doubleSymbolRow}>
        {/* Left dot */}
        <View
          style={[
            styles.solidDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              marginRight: dotMargin,
            },
          ]}
        />

        {/* Two parallel diagonal slashes straddling the center vertical barline */}
        <View
          style={[
            styles.slashesBox,
            { width: slashBoxWidth, height: slashBoxHeight },
          ]}
        >
          {/* Left slash */}
          <View
            style={[
              styles.slashStroke,
              {
                position: 'absolute',
                width: slashLength,
                height: slashHeight,
                borderRadius: slashHeight / 2,
                backgroundColor: color,
                transform: [{ translateX: -halfSpacing }, { rotate: '-45deg' }],
              },
            ]}
          />
          {/* Right slash */}
          <View
            style={[
              styles.slashStroke,
              {
                position: 'absolute',
                width: slashLength,
                height: slashHeight,
                borderRadius: slashHeight / 2,
                backgroundColor: color,
                transform: [{ translateX: halfSpacing }, { rotate: '-45deg' }],
              },
            ]}
          />
        </View>

        {/* Right dot */}
        <View
          style={[
            styles.solidDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              marginLeft: dotMargin,
            },
          ]}
        />
      </View>

      {/* Centered navigation direction (e.g. D.S. al Coda) */}
      {Boolean(annotation) && (
        <Text
          style={[
            styles.doubleAnnotation,
            {
              color: textColor,
              fontSize: Math.round(11 * fontScale),
              marginTop: Math.round(3 * fontScale),
            },
          ]}
          numberOfLines={1}
        >
          {annotation}
        </Text>
      )}
    </View>
  );
};

/**
 * Vertical pair of dots for repeat barlines (|: and :|).
 */
export const RepeatBarlineDots: React.FC<RepeatDotsProps> = ({
  color = '#0f172a',
  fontScale = 1.0,
}) => {
  const dotSize = Math.max(4.5, Math.round(5 * fontScale));
  const dotGap = Math.round(8 * fontScale);

  return (
    <View style={[styles.barlineDotsCol, { gap: dotGap }]}>
      <View
        style={[
          styles.solidDot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.solidDot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  singleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidDot: {},
  slashStroke: {},
  doubleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slashesBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleAnnotation: {
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  barlineDotsCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 1.5,
  },
});

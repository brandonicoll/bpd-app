import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes } from '../../theme';

export default function ProgressRing({
  completed = 0,
  total = 1,
  size = 110,
  strokeWidth = 9,
  color = colors.primary,
  trackColor = colors.gray200,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  const isComplete = completed >= total && total > 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={isComplete ? colors.success : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center text */}
      <View style={styles.center}>
        {isComplete ? (
          <Ionicons name="checkmark" size={28} color={colors.success} />
        ) : (
          <>
            <Text style={[styles.count, { color: isComplete ? colors.success : color }]}>
              {completed}
            </Text>
            <Text style={styles.total}>/{total}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  count: {
    fontSize: 26,
    fontWeight: '700',
  },
  total: {
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  completeIcon: {
    fontSize: 28,
    color: colors.success,
    fontWeight: '700',
  },
});

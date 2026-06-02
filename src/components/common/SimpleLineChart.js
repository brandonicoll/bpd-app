import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { colors, fontSizes } from '../../theme';

// data: array of { date (ISO string), value (number) }
// Shows a clean line chart of the value over time
export default function SimpleLineChart({ data, width = 300, height = 150, color = colors.primary }) {
  if (!data || data.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Log at least 2 sessions to see a trend</Text>
      </View>
    );
  }

  const PAD_LEFT = 44;
  const PAD_RIGHT = 12;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;

  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 10; // avoid division by zero

  const toX = i => PAD_LEFT + (i / (data.length - 1)) * chartW;
  const toY = v => PAD_TOP + chartH - ((v - minVal) / range) * chartH;

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }));
  const polyPoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Y axis: 3 labels
  const yLabels = [
    { y: PAD_TOP, val: Math.round(maxVal) },
    { y: PAD_TOP + chartH / 2, val: Math.round((minVal + maxVal) / 2) },
    { y: PAD_TOP + chartH, val: Math.round(minVal) },
  ];

  // X axis: show up to 3 labels (first, mid, last)
  const xIndices = data.length <= 3
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  const xLabels = xIndices.map(i => ({
    x: toX(i),
    label: new Date(data[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <Svg width={width} height={height}>
      {/* Horizontal grid lines */}
      {yLabels.map((yl, i) => (
        <Line
          key={`grid-${i}`}
          x1={PAD_LEFT}
          y1={yl.y}
          x2={width - PAD_RIGHT}
          y2={yl.y}
          stroke={colors.border}
          strokeWidth="0.5"
          strokeDasharray="4 3"
        />
      ))}

      {/* Y axis labels */}
      {yLabels.map((yl, i) => (
        <SvgText
          key={`ylabel-${i}`}
          x={PAD_LEFT - 6}
          y={yl.y + 4}
          textAnchor="end"
          fontSize="10"
          fill={colors.textTertiary}
        >
          {yl.val}
        </SvgText>
      ))}

      {/* X axis labels */}
      {xLabels.map((xl, i) => (
        <SvgText
          key={`xlabel-${i}`}
          x={xl.x}
          y={height - 4}
          textAnchor="middle"
          fontSize="10"
          fill={colors.textTertiary}
        >
          {xl.label}
        </SvgText>
      ))}

      {/* Progress line */}
      <Polyline
        points={polyPoints}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data point dots */}
      {points.map((p, i) => (
        <Circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={points.length > 6 ? 3 : 4}
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

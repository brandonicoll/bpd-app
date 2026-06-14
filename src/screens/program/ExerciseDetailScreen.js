import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { getExerciseProgressTrend, getCustomExercises, getWeightUnit } from '../../services/storage';
import { exercises as exerciseLibrary } from '../../data/exercises';
import { JOINT_ACTION_LABELS } from '../../data/jointActionLabels';
import SimpleLineChart from '../../components/common/SimpleLineChart';
import { formatWeight, discomfortLabel } from '../../utils/workoutHelpers';
import { relativeDateLabel } from '../../utils/dateHelpers';

export default function ExerciseDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { exerciseId, dayLabel } = route.params;
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 2 - spacing.md * 2;

  const [exerciseDef, setExerciseDef] = useState(
    exerciseLibrary.find(e => e.id === exerciseId) || null
  );
  const [progressData, setProgressData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState('lbs');

  useEffect(() => {
    getWeightUnit().then(setWeightUnit);
  }, []);

  useLayoutEffect(() => {
    if (exerciseDef) {
      navigation.setOptions({ title: exerciseDef.name });
    }
  }, [exerciseDef]);

  useEffect(() => {
    async function load() {
      // Check custom exercises if not in the built-in library
      if (!exerciseDef) {
        const custom = await getCustomExercises();
        const found = custom.find(e => e.id === exerciseId);
        if (found) setExerciseDef(found);
      }
      const trend = await getExerciseProgressTrend(exerciseId, 12);
      setProgressData(trend);
      setIsLoading(false);
    }
    load();
  }, [exerciseId]);

  if (!exerciseDef) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Exercise not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartData = progressData
    .filter(p => p.e1RM > 0)
    .map(p => ({ date: p.date, value: p.e1RM }));

  const recentDiscomfort = progressData
    .filter(p => p.discomfortRating)
    .slice(-3)
    .map(p => p.discomfortRating);
  const avgDiscomfort = recentDiscomfort.length
    ? recentDiscomfort.reduce((a, b) => a + b, 0) / recentDiscomfort.length
    : 0;
  const hasDiscomfortFlag = avgDiscomfort >= 7;

  const bestE1RM = chartData.length ? Math.max(...chartData.map(d => d.value)) : 0;
  const progressDelta = chartData.length >= 2
    ? chartData[chartData.length - 1].value - chartData[0].value
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise name header */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{exerciseDef.name}</Text>
          {dayLabel && (
            <View style={styles.dayChip}>
              <Text style={styles.dayChipText}>{dayLabel}</Text>
            </View>
          )}
        </View>

        {/* Stats row (only if data exists) */}
        {chartData.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{bestE1RM}{weightUnit}</Text>
              <Text style={styles.statLabel}>Best est. 1RM</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, progressDelta >= 0 ? styles.positive : styles.negative]}>
                {progressDelta >= 0 ? '+' : ''}{progressDelta}{weightUnit}
              </Text>
              <Text style={styles.statLabel}>Over {chartData.length} sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{progressData.length}</Text>
              <Text style={styles.statLabel}>Sessions logged</Text>
            </View>
          </View>
        )}

        {/* Discomfort warning */}
        {hasDiscomfortFlag && (
          <View style={styles.discomfortAlert}>
            <Text style={styles.discomfortAlertTitle}>Recurring discomfort flagged</Text>
            <Text style={styles.discomfortAlertBody}>
              You've reported joint discomfort on this movement in recent sessions. Consider swapping it during your next optimization window (weeks 11–12).
            </Text>
          </View>
        )}

        {/* e1RM progress chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estimated 1RM over time</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
          ) : (
            <SimpleLineChart
              data={chartData}
              width={chartWidth}
              height={160}
            />
          )}
          <Text style={styles.chartNote}>
            Estimated 1RM = weight × (1 + reps/30). Shown in {weightUnit}.
          </Text>
        </View>

        {/* Session history */}
        {progressData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent sessions</Text>
            {[...progressData].reverse().slice(0, 6).map((session, i) => {
              const discomfort = discomfortLabel(session.discomfortRating);
              return (
                <View
                  key={i}
                  style={[styles.historyRow, i < Math.min(progressData.length, 6) - 1 && styles.historyRowBorder]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{relativeDateLabel(session.date)}</Text>
                    <Text style={styles.historyData}>
                      {formatWeight(session.bestWeight)}{weightUnit} × {session.bestReps} reps
                      {session.avgRPE ? ` · RPE ${session.avgRPE.toFixed(1)}` : ''}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyE1RM}>{session.e1RM}{weightUnit}</Text>
                    <Text style={styles.historyE1RMLabel}>est. 1RM</Text>
                    {discomfort && (
                      <Text style={[styles.historyDiscomfort, { color: discomfort.color }]}>
                        {discomfort.label}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Exercise info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exercise info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rep range</Text>
            <Text style={styles.infoValue}>
              {exerciseDef.defaultRepRange[0]}–{exerciseDef.defaultRepRange[1]} reps
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target RPE</Text>
            <Text style={styles.infoValue}>{exerciseDef.defaultRPE}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Stability</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
              {exerciseDef.stability}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coordination</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
              {exerciseDef.coordinationDemand}
            </Text>
          </View>

          {exerciseDef.notes && (
            <View style={[styles.infoRow, { flexDirection: 'column', gap: 4 }]}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.infoNotes}>{exerciseDef.notes}</Text>
            </View>
          )}

          <Text style={[styles.infoLabel, { marginTop: spacing.sm }]}>Joint actions</Text>
          <View style={styles.tagsRow}>
            {exerciseDef.jointActions.map(action => (
              <View key={action} style={styles.tag}>
                <Text style={styles.tagText}>
                  {JOINT_ACTION_LABELS[action] || action}
                </Text>
              </View>
            ))}
          </View>

          {exerciseDef.muscles?.length > 0 && (
            <>
              <Text style={[styles.infoLabel, { marginTop: spacing.sm }]}>Muscles</Text>
              <View style={styles.tagsRow}>
                {exerciseDef.muscles.map(muscle => (
                  <View key={muscle} style={[styles.tag, styles.muscleTag]}>
                    <Text style={[styles.tagText, styles.muscleTagText]}>
                      {muscle.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSizes.sm, color: colors.textSecondary },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: fontSizes.xl, fontWeight: '700', color: colors.text },
  dayChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dayChipText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.primary },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  statDivider: { width: 0.5, height: 30, backgroundColor: colors.border },
  positive: { color: colors.success },
  negative: { color: colors.danger },

  discomfortAlert: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  discomfortAlertTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.danger, marginBottom: 4 },
  discomfortAlertBody: { fontSize: fontSizes.sm, color: colors.danger, lineHeight: 20, opacity: 0.85 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartNote: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  historyData: { fontSize: fontSizes.sm, color: colors.text },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyE1RM: { fontSize: fontSizes.md, fontWeight: '700', color: colors.primary },
  historyE1RMLabel: { fontSize: 10, color: colors.textTertiary },
  historyDiscomfort: { fontSize: 14 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue: { fontSize: fontSizes.sm, fontWeight: '500', color: colors.text },
  infoNotes: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  muscleTag: { backgroundColor: colors.gray100 },
  muscleTagText: { color: colors.textSecondary, textTransform: 'capitalize' },
});

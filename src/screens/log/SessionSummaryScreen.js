import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import { exercises as exerciseLibrary } from '../../data/exercises';
import {
  calculateTotalVolume,
  getBestE1RM,
  getDurationMinutes,
  formatDuration,
  formatWeight,
  discomfortLabel,
} from '../../utils/workoutHelpers';
export default function SessionSummaryScreen({ navigation, route }) {
  const { session, startTime, endTime } = route.params;

  const durationMins = getDurationMinutes(startTime, endTime);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = session.exercises.reduce((sum, ex) => {
    return sum + calculateTotalVolume(ex.sets);
  }, 0);

  const exerciseSummaries = useMemo(() =>
    session.exercises.map(ex => {
      const def = exerciseLibrary.find(e => e.id === ex.exerciseId);
      const bestE1RM = getBestE1RM(ex.sets);
      const discomfort = discomfortLabel(ex.discomfortRating);
      return { def, sets: ex.sets, bestE1RM, discomfort, exerciseId: ex.exerciseId };
    }),
    [session]
  );

  function handleDone() {
    navigation.navigate('HomeTab', { screen: 'Home' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.headline}>{session.splitDayLabel} done.</Text>
          <Text style={styles.subheadline}>
            {new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(durationMins)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Total sets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {totalVolume >= 1000
                ? `${(totalVolume / 1000).toFixed(1)}t`
                : `${Math.round(totalVolume)}kg`}
            </Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        {/* Per-exercise breakdown */}
        <Text style={styles.sectionLabel}>Exercise breakdown</Text>
        {exerciseSummaries.map(({ def, sets, bestE1RM, discomfort, exerciseId }) => {
          if (!def || sets.length === 0) return null;
          return (
            <View key={exerciseId} style={styles.exCard}>
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{def.name}</Text>
                {discomfort && (
                  <View style={[styles.discomfortBadge, { backgroundColor: discomfort.color + '20' }]}>
                    <Text style={styles.discomfortEmoji}>{discomfort.emoji}</Text>
                  </View>
                )}
              </View>

              {/* Set summary */}
              {sets.map((set, i) => (
                <View key={i} style={styles.setRow}>
                  <Text style={styles.setNum}>Set {i + 1}</Text>
                  <Text style={styles.setData}>
                    {formatWeight(set.weight)}kg × {set.reps} reps
                    {set.rpe ? ` @ RPE ${set.rpe}` : ''}
                  </Text>
                </View>
              ))}

              {/* Best e1RM */}
              {bestE1RM > 0 && (
                <Text style={styles.e1rmText}>
                  Best estimated 1RM: <Text style={styles.e1rmValue}>{bestE1RM}kg</Text>
                </Text>
              )}
            </View>
          );
        })}

        {/* Discomfort flags */}
        {exerciseSummaries.some(ex => ex.discomfort?.value >= 8) && (
          <View style={styles.flagCard}>
            <Text style={styles.flagTitle}>😬 Joint discomfort noted</Text>
            <Text style={styles.flagBody}>
              You reported joint pain on one or more exercises. The app will monitor this — if it happens again, a swap recommendation will appear in the Insights tab.
            </Text>
          </View>
        )}

        <Button title="Done" onPress={handleDone} style={styles.doneBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerArea: { alignItems: 'center', marginBottom: spacing.xl },
  checkBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkIcon: { color: '#fff', fontSize: 28, fontWeight: '700' },
  headline: { fontSize: fontSizes.xxl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subheadline: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: '500' },
  statDivider: { width: 0.5, height: 36, backgroundColor: colors.border },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  exCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, flex: 1 },
  discomfortBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  discomfortEmoji: { fontSize: 16 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  setNum: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary, width: 40 },
  setData: { fontSize: fontSizes.sm, color: colors.text },
  e1rmText: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.sm },
  e1rmValue: { fontWeight: '700', color: colors.primary },
  flagCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  flagTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.danger, marginBottom: 4 },
  flagBody: { fontSize: fontSizes.sm, color: colors.danger, lineHeight: 20, opacity: 0.85 },
  doneBtn: { marginTop: spacing.md },
});

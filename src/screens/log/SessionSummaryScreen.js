import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../../components/common/Button';
import { exercises as exerciseLibrary } from '../../data/exercises';
import { getCustomExercises } from '../../services/storage';
import { updateSession } from '../../services/storage';
import {
  calculateTotalVolume,
  getBestE1RM,
  getDurationMinutes,
  formatDuration,
  formatWeight,
  discomfortLabel,
} from '../../utils/workoutHelpers';
export default function SessionSummaryScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [customExercises, setCustomExercises] = useState([]);

  useEffect(() => {
    getCustomExercises().then(setCustomExercises);
  }, []);

  function findExercise(id) {
    return exerciseLibrary.find(e => e.id === id) || customExercises.find(e => e.id === id);
  }

  const ENERGY_OPTIONS = [
    { value: 3, label: 'Great', icon: 'flash',               iconColor: colors.warning  },
    { value: 2, label: 'Okay',  icon: 'remove-circle-outline', iconColor: colors.textTertiary },
    { value: 1, label: 'Low',   icon: 'battery-dead-outline', iconColor: colors.danger   },
  ];

  const SLEEP_OPTIONS = [
    { value: 3, label: 'Good',  icon: 'moon',               iconColor: colors.primary      },
    { value: 2, label: 'Okay',  icon: 'moon-outline',        iconColor: colors.textTertiary },
    { value: 1, label: 'Poor',  icon: 'alert-circle-outline', iconColor: colors.danger      },
  ];

  const { session, startTime, endTime, weightUnit = 'lbs' } = route.params;
  const [energyRating, setEnergyRating] = useState(null);
  const [sleepQuality, setSleepQuality] = useState(null);

  const durationMins = getDurationMinutes(startTime, endTime);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = session.exercises.reduce((sum, ex) => {
    return sum + calculateTotalVolume(ex.sets);
  }, 0);

  const exerciseSummaries = useMemo(() =>
    session.exercises.map(ex => {
      const def = findExercise(ex.exerciseId);
      const bestE1RM = getBestE1RM(ex.sets);
      const discomfort = discomfortLabel(ex.discomfortRating);
      return { def, sets: ex.sets, bestE1RM, discomfort, exerciseId: ex.exerciseId };
    }),
    [session, customExercises]
  );

  async function handleDone() {
    const patch = {};
    if (energyRating !== null) patch.energyRating = energyRating;
    if (sleepQuality !== null) patch.sleepQuality = sleepQuality;
    if (Object.keys(patch).length > 0) {
      await updateSession(session.id, patch);
    }
    navigation.dispatch(StackActions.popToTop());
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
          <Text style={styles.headline}>{session.splitDayDisplayName || session.splitDayLabel} done.</Text>
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
                : `${Math.round(totalVolume)}${weightUnit}`}
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
                    <Text style={[styles.discomfortBadgeText, { color: discomfort.color }]}>
                      {discomfort.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Set summary */}
              {sets.map((set, i) => (
                <View key={i} style={styles.setRow}>
                  <Text style={styles.setNum}>Set {i + 1}</Text>
                  <Text style={styles.setData}>
                    {formatWeight(set.weight)}{weightUnit} × {set.reps} reps
                    {set.rpe ? ` @ RPE ${set.rpe}` : ''}
                  </Text>
                </View>
              ))}

              {/* Best e1RM */}
              {bestE1RM > 0 && (
                <Text style={styles.e1rmText}>
                  Best estimated 1RM: <Text style={styles.e1rmValue}>{bestE1RM}{weightUnit}</Text>
                </Text>
              )}
            </View>
          );
        })}

        {/* Session note */}
        {session.note && (
          <View style={styles.sessionNoteCard}>
            <Text style={styles.sessionNoteLabel}>Session note</Text>
            <Text style={styles.sessionNoteText}>{session.note}</Text>
          </View>
        )}

        {/* Discomfort flags */}
        {session.exercises.some(ex => ex.discomfortRating >= 8) && (
          <View style={styles.flagCard}>
            <Text style={styles.flagTitle}>Joint discomfort noted</Text>
            <Text style={styles.flagBody}>
              You reported joint pain on one or more exercises. The app will monitor this — if it happens again, a swap recommendation will appear in the Insights tab.
            </Text>
          </View>
        )}

        {/* Energy rating */}
        <View style={styles.energyCard}>
          <Text style={styles.energyTitle}>How did you feel during this session?</Text>
          <View style={styles.energyRow}>
            {ENERGY_OPTIONS.map(opt => {
              const isSelected = energyRating === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setEnergyRating(prev => prev === opt.value ? null : opt.value)}
                  activeOpacity={0.75}
                  style={[styles.energyOption, isSelected && styles.energyOptionSelected]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={24}
                    color={isSelected ? colors.primary : opt.iconColor}
                  />
                  <Text style={[styles.energyLabel, isSelected && styles.energyLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.energyNote}>Optional — helps the engine track fatigue trends</Text>
        </View>

        {/* Sleep quality */}
        <View style={styles.energyCard}>
          <Text style={styles.energyTitle}>How was your sleep last night?</Text>
          <View style={styles.energyRow}>
            {SLEEP_OPTIONS.map(opt => {
              const isSelected = sleepQuality === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSleepQuality(prev => prev === opt.value ? null : opt.value)}
                  activeOpacity={0.75}
                  style={[styles.energyOption, isSelected && styles.energyOptionSelected]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={24}
                    color={isSelected ? colors.primary : opt.iconColor}
                  />
                  <Text style={[styles.energyLabel, isSelected && styles.energyLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.energyNote}>Optional — poor sleep sessions are discounted in the algo</Text>
        </View>

        <Button title="Done" onPress={handleDone} style={styles.doneBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
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
  discomfortBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discomfortBadgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
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
  sessionNoteCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionNoteLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sessionNoteText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  energyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  energyTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  energyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  energyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
    backgroundColor: colors.background,
  },
  energyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  energyLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  energyLabelSelected: { color: colors.primary },
  energyNote: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

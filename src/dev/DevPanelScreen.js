import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../theme';
import { runAdjustmentEngine } from '../services/adjustmentEngine';
import {
  scenarioDiscomfort,
  scenarioIncreaseVolume,
  scenarioReduceRPE,
  scenarioLowerRepRange,
  scenarioNutrition,
  scenarioFatigue,
  scenarioReorder,
  scenarioHealthy,
  scenarioReset,
  jumpToWeek,
} from './devScenarios';

const SCENARIOS = [
  {
    id: 'discomfort',
    label: 'Discomfort swap',
    description: 'avg discomfort ≥ 7 over 3 sessions → SWAP_EXERCISE',
    fn: scenarioDiscomfort,
  },
  {
    id: 'increaseVolume',
    label: 'Increase volume',
    description: 'stall + low RPE + low discomfort (Block 4) → INCREASE_VOLUME',
    fn: scenarioIncreaseVolume,
  },
  {
    id: 'reduceRPE',
    label: 'Reduce RPE',
    description: 'stall + RPE ≥ 9 (Block 4) → REDUCE_RPE',
    fn: scenarioReduceRPE,
  },
  {
    id: 'lowerRepRange',
    label: 'Lower rep range',
    description: 'stall on coordination lift (Block 4) → LOWER_REP_RANGE',
    fn: scenarioLowerRepRange,
  },
  {
    id: 'nutrition',
    label: 'Nutrition flag',
    description: 'stall + 3 low nutrition check-ins (Block 4) → NUTRITION_FLAG',
    fn: scenarioNutrition,
  },
  {
    id: 'fatigue',
    label: 'Fatigue flag',
    description: 'stall + low energy ratings (Block 4) → FATIGUE_FLAG',
    fn: scenarioFatigue,
  },
  {
    id: 'reorder',
    label: 'Reorder exercise',
    description: 'late exercise stalling, early one progressing → REORDER_EXERCISE',
    fn: scenarioReorder,
  },
  {
    id: 'healthy',
    label: 'No recommendations',
    description: 'consistent progress across all sessions → 0 recs',
    fn: scenarioHealthy,
  },
];

export default function DevPanelScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [weekInput, setWeekInput] = useState('');
  const [weekLoading, setWeekLoading] = useState(false);

  async function runScenario(scenario) {
    setLoading(scenario.id);
    setResult(null);
    try {
      await scenario.fn();
      const engineResult = await runAdjustmentEngine();
      setResult({ scenarioLabel: scenario.label, ...engineResult });
    } catch (e) {
      console.error('[DevPanel] runScenario error:', e);
      Alert.alert('Scenario error', e?.message || String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleJumpWeek() {
    const w = parseInt(weekInput, 10);
    if (isNaN(w) || w < 1 || w > 20) {
      Alert.alert('Invalid week', 'Enter a number between 1 and 20.');
      return;
    }
    setWeekLoading(true);
    try {
      await jumpToWeek(w);
      Alert.alert('Done', `Jumped to week ${w}. Run a scenario to see engine output.`);
    } catch (e) {
      console.error('[DevPanel] jumpToWeek error:', e);
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setWeekLoading(false);
    }
  }

  async function handleReset() {
    Alert.alert(
      'Reset all data?',
      'This wipes all sessions, check-ins, and sets week back to 1.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResult(null);
            await scenarioReset();
          },
        },
      ]
    );
  }

  const recs = result?.recommendations ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Panel</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Scenarios */}
        <Text style={styles.sectionLabel}>Scenarios</Text>
        {SCENARIOS.map(scenario => (
          <View key={scenario.id} style={styles.scenarioRow}>
            <View style={styles.scenarioText}>
              <Text style={styles.scenarioLabel}>{scenario.label}</Text>
              <Text style={styles.scenarioDesc}>{scenario.description}</Text>
            </View>
            <TouchableOpacity
              style={[styles.runBtn, loading === scenario.id && styles.runBtnDisabled]}
              onPress={() => runScenario(scenario)}
              disabled={loading !== null}
              activeOpacity={0.7}
            >
              {loading === scenario.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.runBtnText}>Run</Text>
              }
            </TouchableOpacity>
          </View>
        ))}

        {/* Jump to week */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Jump to week</Text>
        <View style={styles.weekRow}>
          <TextInput
            style={styles.weekInput}
            value={weekInput}
            onChangeText={setWeekInput}
            placeholder="1–20"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={2}
          />
          <TouchableOpacity
            style={[styles.runBtn, weekLoading && styles.runBtnDisabled]}
            onPress={handleJumpWeek}
            disabled={weekLoading}
            activeOpacity={0.7}
          >
            {weekLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.runBtnText}>Jump</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Engine output */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {result.scenarioLabel} — {recs.length} recommendation{recs.length !== 1 ? 's' : ''}
            </Text>
            {recs.length === 0 && (
              <Text style={styles.resultEmpty}>No recommendations generated.</Text>
            )}
            {recs.map((rec, i) => (
              <View key={i} style={styles.recRow}>
                <View style={styles.recHeader}>
                  <Text style={styles.recType}>{rec.type}</Text>
                  <Text style={[
                    styles.recSeverity,
                    rec.severity === 'high' && { color: colors.danger },
                    rec.severity === 'medium' && { color: colors.primary },
                  ]}>
                    {rec.severity}
                  </Text>
                </View>
                {rec.exerciseId && (
                  <Text style={styles.recExercise}>{rec.exerciseId}</Text>
                )}
                <Text style={styles.recDesc} numberOfLines={4}>{rec.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reset */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
          <Text style={styles.resetText}>Reset all data</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  sectionLabel: {
    fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  scenarioRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  scenarioText: { flex: 1 },
  scenarioLabel: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
  scenarioDesc: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  runBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runBtnDisabled: { opacity: 0.5 },
  runBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: '#fff' },
  weekRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  weekInput: {
    flex: 1, fontSize: fontSizes.md, fontWeight: '600',
    color: colors.text,
  },
  resultCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  resultTitle: {
    fontSize: fontSizes.sm, fontWeight: '700', color: colors.text,
    marginBottom: spacing.md,
  },
  resultEmpty: { fontSize: fontSizes.sm, color: colors.textSecondary },
  recRow: {
    borderTopWidth: 0.5, borderTopColor: colors.border,
    paddingTop: spacing.sm, marginTop: spacing.sm,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  recType: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },
  recSeverity: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
  recExercise: { fontSize: fontSizes.xs, color: colors.textTertiary, marginBottom: 4 },
  recDesc: { fontSize: fontSizes.xs, color: colors.text, lineHeight: 18 },
  resetBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.danger,
  },
  resetText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.danger },
});

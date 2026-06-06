import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import {
  saveSession,
  getLastSessionForExercise,
  updateStreak,
  getWeightUnit,
  saveWeightUnit,
} from '../../services/storage';
import { exercises as exerciseLibrary } from '../../data/exercises';
import {
  calculateTotalVolume,
  getBestE1RM,
  formatWeight,
  DISCOMFORT_OPTIONS,
  getExerciseRPEGuidance,
} from '../../utils/workoutHelpers';
import { relativeDateLabel, getWeekStart } from '../../utils/dateHelpers';

// ─── RPE Selector (per set) ───────────────────────────────────────────────────
const RPE_OPTIONS = [6, 7, 8, 9, 10];

function RPESelector({ value, onChange }) {
  return (
    <View style={rpeStyles.row}>
      <Text style={rpeStyles.label}>RPE</Text>
      {RPE_OPTIONS.map(rpe => (
        <TouchableOpacity
          key={rpe}
          onPress={() => onChange(rpe === value ? null : rpe)}
          activeOpacity={0.7}
          style={[rpeStyles.chip, value === rpe && rpeStyles.chipSelected]}
        >
          <Text style={[rpeStyles.chipText, value === rpe && rpeStyles.chipTextSelected]}>
            {rpe}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const rpeStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingLeft: 36,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: '500',
    marginRight: 2,
  },
  chip: {
    width: 34,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.primary },
});

// ─── Set Row ──────────────────────────────────────────────────────────────────
function SetRow({ setNumber, set, weightUnit, onUpdate, onDelete }) {
  return (
    <View style={setStyles.container}>
      <View style={setStyles.row}>
        <View style={setStyles.setNum}>
          <Text style={setStyles.setNumText}>{setNumber}</Text>
        </View>

        <View style={setStyles.inputGroup}>
          <Text style={setStyles.inputLabel}>Weight</Text>
          <View style={setStyles.inputWrap}>
            <TextInput
              style={setStyles.input}
              value={set.weight}
              onChangeText={v => onUpdate('weight', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
            />
            <Text style={setStyles.inputUnit}>{weightUnit}</Text>
          </View>
        </View>

        <View style={setStyles.inputGroup}>
          <Text style={setStyles.inputLabel}>Reps</Text>
          <View style={setStyles.inputWrap}>
            <TextInput
              style={setStyles.input}
              value={set.reps}
              onChangeText={v => onUpdate('reps', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
            />
          </View>
        </View>

        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={setStyles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <RPESelector value={set.rpe} onChange={rpe => onUpdate('rpe', rpe)} />
    </View>
  );
}

const setStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  setNumText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
  inputGroup: { flex: 1 },
  inputLabel: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginBottom: 3,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
  },
  inputUnit: { fontSize: fontSizes.xs, color: colors.textTertiary },
  deleteIcon: { fontSize: 16, color: colors.textTertiary, paddingHorizontal: 4 },
});

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({
  exerciseData, exerciseDef, exConfig, currentBlock, weightUnit,
  previousData, onSetUpdate, onSetAdd, onSetDelete, onDiscomfortChange,
}) {
  const { sets, discomfortRating } = exerciseData;
  const rpeGuidance = getExerciseRPEGuidance(exConfig, currentBlock);

  return (
    <View style={exStyles.card}>
      <View style={exStyles.header}>
        <Text style={exStyles.name}>{exerciseDef.name}</Text>
        <Text style={exStyles.range}>
          {exConfig
            ? `${exConfig.sets} sets · ${exConfig.repRange[0]}–${exConfig.repRange[1]} reps`
            : `${exerciseDef.defaultRepRange[0]}–${exerciseDef.defaultRepRange[1]} reps`}
        </Text>
      </View>

      <View style={[exStyles.rpeBanner, { backgroundColor: rpeGuidance.color + '18', borderLeftColor: rpeGuidance.color }]}>
        <View style={exStyles.rpeBannerTop}>
          <Text style={[exStyles.rpeBannerTarget, { color: rpeGuidance.color }]}>
            {rpeGuidance.mode === 'prescribed'
              ? `Target: RPE ${rpeGuidance.rpe}`
              : `Target: ${rpeGuidance.label}`}
          </Text>
          {rpeGuidance.mode !== 'prescribed' && rpeGuidance.prescribedRPE && (
            <Text style={exStyles.rpeBannerPrescribed}>
              Prescribed: RPE {rpeGuidance.prescribedRPE}
            </Text>
          )}
        </View>
        {rpeGuidance.mode !== 'prescribed' && (
          <Text style={[exStyles.rpeBannerSublabel, { color: rpeGuidance.color }]}>
            {rpeGuidance.sublabel}
          </Text>
        )}
      </View>

      {previousData && previousData.sets?.length > 0 && (
        <View style={exStyles.prevRow}>
          <Text style={exStyles.prevLabel}>
            Last session ({relativeDateLabel(previousData.date)}):
          </Text>
          <Text style={exStyles.prevValue}>
            {formatWeight(previousData.sets[0]?.weight)} {weightUnit} × {previousData.sets[0]?.reps} reps
            {previousData.sets.length > 1 ? ` (+${previousData.sets.length - 1} more)` : ''}
          </Text>
        </View>
      )}

      {sets.map((set, setIndex) => (
        <SetRow
          key={setIndex}
          setNumber={setIndex + 1}
          set={set}
          weightUnit={weightUnit}
          onUpdate={(field, value) => onSetUpdate(setIndex, field, value)}
          onDelete={() => onSetDelete(setIndex)}
        />
      ))}

      <TouchableOpacity onPress={onSetAdd} style={exStyles.addSetBtn} activeOpacity={0.7}>
        <Text style={exStyles.addSetText}>+ Add set</Text>
      </TouchableOpacity>

      <View style={exStyles.discomfortSection}>
        <Text style={exStyles.discomfortLabel}>How did this feel on your joints?</Text>
        <View style={exStyles.discomfortRow}>
          {DISCOMFORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onDiscomfortChange(discomfortRating === opt.value ? null : opt.value)}
              activeOpacity={0.75}
              style={[
                exStyles.discomfortChip,
                discomfortRating === opt.value && { backgroundColor: opt.bg, borderColor: opt.color },
              ]}
            >
              <Text style={[
                exStyles.discomfortChipText,
                discomfortRating === opt.value && { color: opt.color },
              ]}>
                {opt.shortLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const exStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: { marginBottom: spacing.sm },
  name: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: 2 },
  range: { fontSize: fontSizes.xs, color: colors.textSecondary },
  rpeBanner: {
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    paddingLeft: 10,
    marginBottom: spacing.sm,
  },
  rpeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rpeBannerTarget: { fontSize: fontSizes.sm, fontWeight: '700' },
  rpeBannerPrescribed: { fontSize: fontSizes.xs, color: colors.textTertiary },
  rpeBannerSublabel: { fontSize: fontSizes.xs, lineHeight: 16, opacity: 0.85 },
  prevRow: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  prevLabel: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600', marginBottom: 1 },
  prevValue: { fontSize: fontSizes.sm, color: colors.primaryDark, fontWeight: '500' },
  addSetBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  addSetText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: '600' },
  discomfortSection: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  discomfortLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  discomfortRow: { flexDirection: 'row', gap: spacing.sm },
  discomfortChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  discomfortChipText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});

// ─── ActiveWorkoutScreen ──────────────────────────────────────────────────────
export default function ActiveWorkoutScreen({ navigation, route }) {
  const { splitDay, currentBlock = 1 } = route.params;

  const startTime = useRef(new Date().toISOString());
  const [weightUnit, setWeightUnitState] = useState('lbs');
  const [previousData, setPreviousData] = useState({});
  const [finishing, setFinishing] = useState(false);

  const [sessionExercises, setSessionExercises] = useState(
    splitDay.exercises.map(exConfig => ({
      exerciseId: exConfig.exerciseId,
      exConfig,
      discomfortRating: null,
      sets: Array.from({ length: exConfig.sets || 2 }, () => ({
        weight: '',
        reps: '',
        rpe: null,
        completedAt: new Date().toISOString(),
      })),
    }))
  );

  useEffect(() => {
    async function load() {
      const unit = await getWeightUnit();
      setWeightUnitState(unit);

      const results = {};
      for (const exConfig of splitDay.exercises) {
        const prev = await getLastSessionForExercise(exConfig.exerciseId);
        if (prev) results[exConfig.exerciseId] = prev;
      }
      setPreviousData(results);
    }
    load();
  }, []);

  async function toggleWeightUnit() {
    const newUnit = weightUnit === 'lbs' ? 'kg' : 'lbs';
    setWeightUnitState(newUnit);
    await saveWeightUnit(newUnit);
  }

  function updateSet(exerciseIndex, setIndex, field, value) {
    setSessionExercises(prev =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => j === setIndex ? { ...s, [field]: value } : s),
        };
      })
    );
  }

  function addSet(exerciseIndex) {
    setSessionExercises(prev => {
      const updated = [...prev];
      const ex = updated[exerciseIndex];
      const lastSet = ex.sets[ex.sets.length - 1];
      updated[exerciseIndex] = {
        ...ex,
        sets: [
          ...ex.sets,
          {
            weight: lastSet?.weight || '',
            reps: lastSet?.reps || '',
            rpe: null,
            completedAt: new Date().toISOString(),
          },
        ],
      };
      return updated;
    });
  }

  function deleteSet(exerciseIndex, setIndex) {
    setSessionExercises(prev =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) };
      })
    );
  }

  function updateDiscomfort(exerciseIndex, rating) {
    setSessionExercises(prev =>
      prev.map((ex, i) => i === exerciseIndex ? { ...ex, discomfortRating: rating } : ex)
    );
  }

  async function handleFinish() {
    const hasAnySets = sessionExercises.some(ex =>
      ex.sets.some(s => s.weight || s.reps)
    );

    if (!hasAnySets) {
      Alert.alert(
        'No sets logged',
        "You haven't entered any weight or reps yet. Are you sure you want to finish?",
        [
          { text: 'Keep going', style: 'cancel' },
          { text: 'End session', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }

    setFinishing(true);
    try {
      const endTime = new Date().toISOString();
      const session = {
        id: uuidv4(),
        date: startTime.current,
        splitDayLabel: splitDay.dayLabel,
        startTime: startTime.current,
        endTime,
        weightUnit,
        exercises: sessionExercises.filter(ex => ex.sets.some(s => s.weight || s.reps)),
      };

      await saveSession(session);

      const weekStart = getWeekStart().toISOString().split('T')[0];
      await updateStreak({ weekStartDate: weekStart, planned: 1 });

      navigation.replace('SessionSummary', {
        session,
        splitDay,
        startTime: startTime.current,
        endTime,
        weightUnit,
      });
    } catch (e) {
      console.error('Error saving session:', e);
      Alert.alert('Error', 'Could not save your session. Please try again.');
      setFinishing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'End workout?',
              'Your progress will not be saved.',
              [
                { text: 'Keep going', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
              ]
            )}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{splitDay.dayLabel}</Text>
            <TouchableOpacity onPress={toggleWeightUnit} style={styles.unitToggle} activeOpacity={0.7}>
              <Text style={styles.unitToggleText}>{weightUnit}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleFinish}
            disabled={finishing}
            style={styles.finishBtn}
            activeOpacity={0.8}
          >
            {finishing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.finishBtnText}>Finish</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sessionExercises.map((exData, exIndex) => {
            const exDef = exerciseLibrary.find(e => e.id === exData.exerciseId);
            if (!exDef) return null;
            return (
              <ExerciseCard
                key={exData.exerciseId}
                exerciseData={exData}
                exerciseDef={exDef}
                exConfig={exData.exConfig}
                currentBlock={currentBlock}
                weightUnit={weightUnit}
                previousData={previousData[exData.exerciseId]}
                onSetUpdate={(setIndex, field, value) => updateSet(exIndex, setIndex, field, value)}
                onSetAdd={() => addSet(exIndex)}
                onSetDelete={(setIndex) => deleteSet(exIndex, setIndex)}
                onDiscomfortChange={(rating) => updateDiscomfort(exIndex, rating)}
              />
            );
          })}

          <TouchableOpacity
            onPress={handleFinish}
            disabled={finishing}
            style={styles.bottomFinishBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomFinishText}>
              {finishing ? 'Saving...' : 'Finish workout'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  unitToggle: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unitToggleText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },
  closeBtn: { fontSize: 18, color: colors.textSecondary, width: 32 },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  bottomFinishBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  bottomFinishText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.md },
});

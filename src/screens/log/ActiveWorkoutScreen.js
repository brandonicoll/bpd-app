import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { saveSession, getLastSessionForExercise, updateStreak } from '../../services/storage';
import { exercises as exerciseLibrary } from '../../data/exercises';
import {
  formatWeight,
  DISCOMFORT_OPTIONS,
  getExerciseRPEGuidance,
} from '../../utils/workoutHelpers';
import { relativeDateLabel, getWeekStart } from '../../utils/dateHelpers';

// ─── RPE Selector sub-component ──────────────────────────────────────────────
const RPE_OPTIONS = [6, 7, 8, 9, 10];

function RPESelector({ value, onChange }) {
  return (
    <View style={rpeStyles.row}>
      {RPE_OPTIONS.map(rpe => (
        <TouchableOpacity
          key={rpe}
          onPress={() => onChange(rpe)}
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
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.primary },
});

// ─── Set row sub-component ────────────────────────────────────────────────────
function SetRow({ setNumber, set, onUpdate, onDelete }) {
  return (
    <View style={setStyles.row}>
      <View style={setStyles.setNum}>
        <Text style={setStyles.setNumText}>{setNumber}</Text>
      </View>

      <View style={setStyles.inputs}>
        {/* Weight */}
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
            <Text style={setStyles.inputUnit}>kg</Text>
          </View>
        </View>

        {/* Reps */}
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
      </View>

      {/* Delete set */}
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const setStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
  inputs: { flex: 1, flexDirection: 'row', gap: spacing.sm },
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

// ─── Exercise card sub-component ──────────────────────────────────────────────
function ExerciseCard({
  exerciseData, exerciseDef, exConfig, currentBlock,
  previousData, onSetUpdate, onSetAdd, onSetDelete, onDiscomfortChange,
}) {
  const { sets, discomfortRating } = exerciseData;
  const rpeGuidance = getExerciseRPEGuidance(exConfig, currentBlock);

  return (
    <View style={exStyles.card}>
      {/* Exercise header */}
      <View style={exStyles.header}>
        <View style={exStyles.headerLeft}>
          <Text style={exStyles.name}>{exerciseDef.name}</Text>
          <Text style={exStyles.range}>
            {exConfig
              ? `${exConfig.sets} sets · ${exConfig.repRange[0]}–${exConfig.repRange[1]} reps`
              : `${exerciseDef.defaultRepRange[0]}–${exerciseDef.defaultRepRange[1]} reps`}
          </Text>
        </View>
      </View>

      {/* RPE guidance banner */}
      <View style={[exStyles.rpeBanner, { backgroundColor: rpeGuidance.color + '18', borderLeftColor: rpeGuidance.color }]}>
        <View style={exStyles.rpeBannerTop}>
          <Text style={[exStyles.rpeBannerTarget, { color: rpeGuidance.color }]}>
            {rpeGuidance.mode === 'prescribed'
              ? `Target: RPE ${rpeGuidance.rpe}`
              : `Target: ${rpeGuidance.label}`}
          </Text>
          {rpeGuidance.mode !== 'prescribed' && rpeGuidance.prescribedRPE && (
            <Text style={exStyles.rpeBannerPrescribed}>Prescribed: RPE {rpeGuidance.prescribedRPE}</Text>
          )}
        </View>
        {rpeGuidance.mode !== 'prescribed' && (
          <Text style={[exStyles.rpeBannerSublabel, { color: rpeGuidance.color }]}>
            {rpeGuidance.sublabel}
          </Text>
        )}
      </View>

      {/* Previous session data */}
      {previousData && previousData.sets?.length > 0 && (
        <View style={exStyles.prevRow}>
          <Text style={exStyles.prevLabel}>Last session ({relativeDateLabel(previousData.date)}):</Text>
          <Text style={exStyles.prevValue}>
            {formatWeight(previousData.sets[0]?.weight)}kg × {previousData.sets[0]?.reps} reps
            {previousData.sets.length > 1 ? ` (+${previousData.sets.length - 1} more)` : ''}
          </Text>
        </View>
      )}

      {/* Column headers */}
      {sets.length > 0 && (
        <View style={exStyles.colHeaders}>
          <View style={{ width: 28 }} />
          <Text style={exStyles.colHeader}>Weight (kg)</Text>
          <Text style={exStyles.colHeader}>Reps</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* Set rows */}
      {sets.map((set, setIndex) => (
        <SetRow
          key={setIndex}
          setNumber={setIndex + 1}
          set={set}
          onUpdate={(field, value) => onSetUpdate(setIndex, field, value)}
          onDelete={() => onSetDelete(setIndex)}
        />
      ))}

      {/* Add set */}
      <TouchableOpacity onPress={onSetAdd} style={exStyles.addSetBtn} activeOpacity={0.7}>
        <Text style={exStyles.addSetText}>+ Add set</Text>
      </TouchableOpacity>

      {/* RPE selector */}
      {sets.length > 0 && (
        <View style={exStyles.rpeSection}>
          <Text style={exStyles.rpeSectionLabel}>
            RPE for last set
            <Text style={exStyles.rpeSectionHint}> (reps left in the tank?)</Text>
          </Text>
          <RPESelector
            value={sets[sets.length - 1]?.rpe}
            onChange={rpe => onSetUpdate(sets.length - 1, 'rpe', rpe)}
          />
        </View>
      )}

      {/* Discomfort rating */}
      <View style={exStyles.discomfortSection}>
        <Text style={exStyles.discomfortLabel}>How did this feel on your joints?</Text>
        <View style={exStyles.discomfortRow}>
          {DISCOMFORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onDiscomfortChange(opt.value)}
              activeOpacity={0.75}
              style={[
                exStyles.discomfortChip,
                discomfortRating === opt.value && { backgroundColor: opt.bg, borderColor: opt.color },
              ]}
            >
              <Text style={exStyles.discomfortEmoji}>{opt.emoji}</Text>
              <Text style={[
                exStyles.discomfortChipLabel,
                discomfortRating === opt.value && { color: opt.color },
              ]}>
                {opt.label}
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
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerLeft: { flex: 1 },
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
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  colHeader: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: '500',
  },
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
  rpeSection: { marginBottom: spacing.md },
  rpeSectionLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  rpeSectionHint: { fontWeight: '400', color: colors.textTertiary },
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
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 3,
  },
  discomfortEmoji: { fontSize: 20 },
  discomfortChipLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
});

// ─── ActiveWorkoutScreen ──────────────────────────────────────────────────────
export default function ActiveWorkoutScreen({ navigation, route }) {
  const { splitDay, currentBlock = 1 } = route.params;

  const startTime = useRef(new Date().toISOString());
  const [sessionExercises, setSessionExercises] = useState(
    splitDay.exercises.map(exConfig => ({
      exerciseId: exConfig.exerciseId,
      exConfig,
      discomfortRating: null,
      sets: [],
    }))
  );
  const [previousData, setPreviousData] = useState({});
  const [finishing, setFinishing] = useState(false);

  // Load previous session data for each exercise
  useEffect(() => {
    async function loadPrevious() {
      const results = {};
      for (const exConfig of splitDay.exercises) {
        const exerciseId = exConfig.exerciseId;
        const prev = await getLastSessionForExercise(exerciseId);
        if (prev) results[exerciseId] = prev;
      }
      setPreviousData(results);
    }
    loadPrevious();
  }, []);

  function updateSet(exerciseIndex, setIndex, field, value) {
    setSessionExercises(prev => {
      const updated = prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((s, j) =>
          j === setIndex ? { ...s, [field]: value } : s
        );
        return { ...ex, sets: updatedSets };
      });
      return updated;
    });
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
    setSessionExercises(prev => {
      const updated = [...prev];
      const ex = updated[exerciseIndex];
      updated[exerciseIndex] = {
        ...ex,
        sets: ex.sets.filter((_, j) => j !== setIndex),
      };
      return updated;
    });
  }

  function updateDiscomfort(exerciseIndex, rating) {
    setSessionExercises(prev =>
      prev.map((ex, i) => i === exerciseIndex ? { ...ex, discomfortRating: rating } : ex)
    );
  }

  async function handleFinish() {
    const emptyExercises = sessionExercises.filter(ex => ex.sets.length === 0);

    if (emptyExercises.length > 0 && sessionExercises.some(ex => ex.sets.length > 0)) {
      Alert.alert(
        'Some exercises have no sets',
        "You haven't logged any sets for some exercises. Finish anyway?",
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Finish anyway', onPress: () => saveAndNavigate() },
        ]
      );
      return;
    }

    if (sessionExercises.every(ex => ex.sets.length === 0)) {
      Alert.alert(
        'No sets logged',
        "You haven't logged any sets. Are you sure you want to finish?",
        [
          { text: 'Keep going', style: 'cancel' },
          { text: 'End session', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }

    await saveAndNavigate();
  }

  async function saveAndNavigate() {
    setFinishing(true);
    try {
      const endTime = new Date().toISOString();
      const session = {
        id: uuidv4(),
        date: startTime.current,
        splitDayLabel: splitDay.dayLabel,
        startTime: startTime.current,
        endTime,
        exercises: sessionExercises.filter(ex => ex.sets.length > 0),
      };

      await saveSession(session);

      const weekStart = getWeekStart().toISOString().split('T')[0];
      await updateStreak({
        weekStartDate: weekStart,
        completed: 1,
        planned: 1,
      });

      navigation.replace('SessionSummary', {
        session,
        splitDay,
        startTime: startTime.current,
        endTime,
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
        keyboardVerticalOffset={0}
      >
        {/* Header */}
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
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{splitDay.dayLabel}</Text>
          </View>

          <TouchableOpacity
            onPress={handleFinish}
            disabled={finishing}
            style={styles.finishBtn}
            activeOpacity={0.8}
          >
            {finishing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.finishBtnText}>Finish</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Exercises */}
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
                previousData={previousData[exData.exerciseId]}
                onSetUpdate={(setIndex, field, value) => updateSet(exIndex, setIndex, field, value)}
                onSetAdd={() => addSet(exIndex)}
                onSetDelete={(setIndex) => deleteSet(exIndex, setIndex)}
                onDiscomfortChange={(rating) => updateDiscomfort(exIndex, rating)}
              />
            );
          })}

          {/* Bottom finish button */}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  backArrow: { fontSize: 18, color: colors.textSecondary, width: 32 },
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

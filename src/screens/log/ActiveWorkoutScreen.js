import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator, Modal, FlatList, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import {
  saveSession,
  getLastSessionForExercise,
  updateStreak,
  getWeightUnit,
  saveWeightUnit,
  saveDraftSession,
  clearDraftSession,
  getCustomExercises,
} from '../../services/storage';
import CustomExerciseModal from '../../components/common/CustomExerciseModal';
import { exercises as exerciseLibrary } from '../../data/exercises';
import {
  formatWeight,
  DISCOMFORT_OPTIONS,
  getExerciseRPEGuidance,
} from '../../utils/workoutHelpers';
import { relativeDateLabel, getWeekStart } from '../../utils/dateHelpers';

// ─── RPE Selector ─────────────────────────────────────────────────────────────
const RPE_OPTIONS = [6, 7, 8, 9, 10];

function RPESelector({ value, onChange }) {
  const { colors } = useTheme();
  const rpeStyles = makeRpeStyles(colors);
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

const makeRpeStyles = (colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingLeft: 36 },
  label: { fontSize: fontSizes.xs, color: colors.textTertiary, fontWeight: '500', marginRight: 2 },
  chip: {
    width: 34, height: 28, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.primary },
});

// ─── Set Row ──────────────────────────────────────────────────────────────────
function SetRow({ setNumber, set, weightUnit, prevWeight, prevReps, onUpdate, onDelete }) {
  const { colors } = useTheme();
  const setStyles = makeSetStyles(colors);
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
              keyboardType="decimal-pad"
              placeholder={prevWeight ? String(prevWeight) : '0'}
              placeholderTextColor={prevWeight ? colors.gray400 : colors.textTertiary}
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
              keyboardType="number-pad"
              placeholder={prevReps ? String(prevReps) : '0'}
              placeholderTextColor={prevReps ? colors.gray400 : colors.textTertiary}
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

const makeSetStyles = (colors) => StyleSheet.create({
  container: { marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gray100,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  setNumText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, marginBottom: 3, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, height: 40,
  },
  input: { flex: 1, fontSize: fontSizes.md, fontWeight: '600', color: colors.text, padding: 0 },
  inputUnit: { fontSize: fontSizes.xs, color: colors.textTertiary },
  deleteIcon: { fontSize: 16, color: colors.textTertiary, paddingHorizontal: 4 },
});

// ─── Exercise Picker Modal ────────────────────────────────────────────────────
function ExercisePicker({ visible, exercises = [], onClose, onSelect, onCreateCustom, excludeIds = [] }) {
  const { colors } = useTheme();
  const pickerStyles = makePickerStyles(colors);
  const [query, setQuery] = useState('');

  const filtered = exercises.filter(ex =>
    !excludeIds.includes(ex.id) &&
    (query === '' ||
      ex.name.toLowerCase().includes(query.toLowerCase()) ||
      (ex.muscles || []).some(m => m.toLowerCase().includes(query.toLowerCase())))
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pickerStyles.container}>
        <View style={pickerStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={pickerStyles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={pickerStyles.title}>Select exercise</Text>
          <TouchableOpacity onPress={onCreateCustom} style={pickerStyles.createBtn} activeOpacity={0.7}>
            <Text style={pickerStyles.createBtnText}>+ Custom</Text>
          </TouchableOpacity>
        </View>
        <View style={pickerStyles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textTertiary} style={{ marginRight: 6 }} />
          <TextInput
            style={pickerStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or muscle..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { onSelect(item); onClose(); setQuery(''); }}
              style={pickerStyles.row}
              activeOpacity={0.7}
            >
              <Text style={pickerStyles.rowName}>{item.name}</Text>
              <Text style={pickerStyles.rowMeta}>
                {item.isCustom ? 'Custom' : (item.muscles || []).join(', ')}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={pickerStyles.empty}>
              <Text style={pickerStyles.emptyText}>No exercises found</Text>
              <TouchableOpacity onPress={onCreateCustom} activeOpacity={0.7}>
                <Text style={pickerStyles.emptyCreateText}>Create a custom exercise →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const makePickerStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  cancel: { fontSize: fontSizes.md, color: colors.primary, fontWeight: '600' },
  title: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    marginHorizontal: spacing.lg, marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm, height: 40,
  },
  searchInput: { flex: 1, fontSize: fontSizes.sm, color: colors.text },
  row: {
    paddingHorizontal: spacing.lg, paddingVertical: 13,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  rowName: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1 },
  createBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createBtnText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.textTertiary, fontSize: fontSizes.sm },
  emptyCreateText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.primary },
});

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({
  exerciseData, exerciseDef, exConfig, currentBlock, weightUnit,
  previousData, onSetUpdate, onSetAdd, onSetDelete, onDiscomfortChange,
  onNotesChange, onManage,
}) {
  const { colors } = useTheme();
  const exStyles = makeExStyles(colors);
  const { sets, discomfortRating, notes } = exerciseData;
  const rpeGuidance = getExerciseRPEGuidance(exConfig, currentBlock);
  const prevSets = previousData?.sets || [];

  return (
    <View style={exStyles.card}>
      <View style={exStyles.header}>
        <View style={exStyles.headerLeft}>
          <Text style={exStyles.name}>{exerciseDef.name}</Text>
          <Text style={exStyles.range}>
            {exConfig
              ? `${exConfig.sets} sets · ${exConfig.repRange[0]}–${exConfig.repRange[1]} reps`
              : `${exerciseDef.defaultRepRange?.[0]}–${exerciseDef.defaultRepRange?.[1]} reps`}
          </Text>
        </View>
        <TouchableOpacity onPress={onManage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={exStyles.manageBtn}>
          <Text style={exStyles.manageDots}>···</Text>
        </TouchableOpacity>
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

      {previousData && prevSets.length > 0 && (
        <View style={exStyles.prevRow}>
          <Text style={exStyles.prevLabel}>
            Last: {relativeDateLabel(previousData.date)}
          </Text>
          <Text style={exStyles.prevValue}>
            {formatWeight(prevSets[0]?.weight)} {weightUnit} × {prevSets[0]?.reps} reps
            {prevSets.length > 1 ? ` (+${prevSets.length - 1} more)` : ''}
          </Text>
        </View>
      )}

      {sets.map((set, setIndex) => (
        <SetRow
          key={setIndex}
          setNumber={setIndex + 1}
          set={set}
          weightUnit={weightUnit}
          prevWeight={prevSets[setIndex]?.weight}
          prevReps={prevSets[setIndex]?.reps}
          onUpdate={(field, value) => onSetUpdate(setIndex, field, value)}
          onDelete={() => onSetDelete(setIndex)}
        />
      ))}

      <TouchableOpacity onPress={onSetAdd} style={exStyles.addSetBtn} activeOpacity={0.7}>
        <Text style={exStyles.addSetText}>+ Add set</Text>
      </TouchableOpacity>

      {/* Notes field */}
      <View style={exStyles.notesSection}>
        <TextInput
          style={exStyles.notesInput}
          value={notes}
          onChangeText={onNotesChange}
          placeholder={previousData?.notes
            ? `Previous note: ${previousData.notes}`
            : 'Add notes for this exercise...'}
          placeholderTextColor={colors.textTertiary}
          multiline
          blurOnSubmit
          maxLength={300}
          returnKeyType="done"
        />
      </View>

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

const makeExStyles = (colors) => StyleSheet.create({
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
  manageBtn: { paddingLeft: spacing.sm },
  manageDots: { fontSize: 20, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1 },
  rpeBanner: {
    borderLeftWidth: 3, borderRadius: borderRadius.sm,
    padding: spacing.sm, paddingLeft: 10, marginBottom: spacing.sm,
  },
  rpeBannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  rpeBannerTarget: { fontSize: fontSizes.sm, fontWeight: '700' },
  rpeBannerPrescribed: { fontSize: fontSizes.xs, color: colors.textTertiary },
  rpeBannerSublabel: { fontSize: fontSizes.xs, lineHeight: 16, opacity: 0.85 },
  prevRow: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prevLabel: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600' },
  prevValue: { fontSize: fontSizes.xs, color: colors.primaryDark, fontWeight: '500' },
  addSetBtn: {
    paddingVertical: spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    borderStyle: 'dashed', marginTop: spacing.xs, marginBottom: spacing.sm,
  },
  addSetText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: '600' },
  notesSection: {
    borderTopWidth: 0.5, borderTopColor: colors.border,
    paddingTop: spacing.sm, marginBottom: spacing.sm,
  },
  notesInput: {
    fontSize: fontSizes.sm, color: colors.text,
    minHeight: 36, maxHeight: 80,
    lineHeight: 20,
  },
  discomfortSection: { borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: spacing.md },
  discomfortLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  discomfortRow: { flexDirection: 'row', gap: spacing.sm },
  discomfortChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  discomfortChipText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
});

// ─── ActiveWorkoutScreen ──────────────────────────────────────────────────────
export default function ActiveWorkoutScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { splitDay, currentBlock = 1, draftData } = route.params;

  const startTime = useRef(draftData?.startTime || new Date().toISOString());
  const draftTimerRef = useRef(null);
  const [restStartedAt, setRestStartedAt] = useState(Date.now());
  const [restElapsed, setRestElapsed] = useState(0);

  const [weightUnit, setWeightUnitState] = useState(draftData?.weightUnit || 'lbs');
  const [previousData, setPreviousData] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [pickerMode, setPickerMode] = useState(null); // null | 'add' | { mode: 'swap', index: number }
  const pickerModeRef = useRef(null);
  const createCustomContextRef = useRef(null);
  const [customExercises, setCustomExercises] = useState([]);
  const [showCreateCustom, setShowCreateCustom] = useState(false);

  const allExercises = useMemo(
    () => [...exerciseLibrary, ...customExercises],
    [customExercises]
  );

  const [sessionExercises, setSessionExercises] = useState(() => {
    if (draftData?.exercises) return draftData.exercises;
    return splitDay.exercises.map(exConfig => ({
      exerciseId: exConfig.exerciseId,
      exConfig,
      discomfortRating: null,
      notes: '',
      sets: Array.from({ length: exConfig.sets || 2 }, () => ({
        weight: '',
        reps: '',
        rpe: null,
        completedAt: new Date().toISOString(),
      })),
    }));
  });

  useEffect(() => {
    async function load() {
      const [unit, custom] = await Promise.all([getWeightUnit(), getCustomExercises()]);
      if (!draftData?.weightUnit) setWeightUnitState(unit);
      setCustomExercises(custom);
      await loadPreviousData(splitDay.exercises.map(e => e.exerciseId));
    }
    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [restStartedAt]);

  function formatRestTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function loadPreviousData(ids) {
    const results = {};
    for (const id of ids) {
      const prev = await getLastSessionForExercise(id);
      if (prev) results[id] = prev;
    }
    setPreviousData(prev => ({ ...prev, ...results }));
  }

  // Debounced draft auto-save
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraftSession({
        splitDay,
        currentBlock,
        startTime: startTime.current,
        exercises: sessionExercises,
        weightUnit,
      });
    }, 2000);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [sessionExercises, weightUnit]);

  async function toggleWeightUnit() {
    const newUnit = weightUnit === 'lbs' ? 'kg' : 'lbs';
    setWeightUnitState(newUnit);
    await saveWeightUnit(newUnit);
  }

  function updateSet(exerciseIndex, setIndex, field, value) {
    setSessionExercises(prev =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        return { ...ex, sets: ex.sets.map((s, j) => j === setIndex ? { ...s, [field]: value } : s) };
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
        sets: [...ex.sets, {
          weight: lastSet?.weight || '',
          reps: lastSet?.reps || '',
          rpe: null,
          completedAt: new Date().toISOString(),
        }],
      };
      return updated;
    });
  }

  function deleteSet(exerciseIndex, setIndex) {
    setSessionExercises(prev =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        if (ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) };
      })
    );
  }

  function updateDiscomfort(exerciseIndex, rating) {
    setSessionExercises(prev =>
      prev.map((ex, i) => i === exerciseIndex ? { ...ex, discomfortRating: rating } : ex)
    );
  }

  function updateNotes(exerciseIndex, notes) {
    setSessionExercises(prev =>
      prev.map((ex, i) => i === exerciseIndex ? { ...ex, notes } : ex)
    );
  }

  function handleManageExercise(exIndex) {
    const ex = sessionExercises[exIndex];
    const exDef = allExercises.find(e => e.id === ex.exerciseId);
    Alert.alert(
      exDef?.name || 'Exercise',
      'Manage this exercise',
      [
        ...(sessionExercises.length > 1 ? [{
          text: 'Reorder exercises',
          onPress: () => navigation.navigate('ReorderExercises', {
            exercises: sessionExercises.map(e => ({
              exerciseId: e.exerciseId,
              name: allExercises.find(x => x.id === e.exerciseId)?.name || 'Unknown',
            })),
            onSave: (reorderedIds) => {
              setSessionExercises(prev => {
                const map = Object.fromEntries(prev.map(e => [e.exerciseId, e]));
                return reorderedIds.map(id => map[id]).filter(Boolean);
              });
            },
          }),
        }] : []),
        {
          text: 'Swap exercise',
          onPress: () => {
            const mode = { mode: 'swap', index: exIndex };
            pickerModeRef.current = mode;
            setPickerMode(mode);
          },
        },
        {
          text: 'Delete exercise',
          style: 'destructive',
          onPress: () => {
            if (sessionExercises.length <= 1) {
              Alert.alert('Cannot delete', 'A session needs at least one exercise.');
              return;
            }
            Alert.alert(
              `Remove ${exDef?.name}?`,
              'This will remove it from your current session only.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => setSessionExercises(prev => prev.filter((_, i) => i !== exIndex)),
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handlePickerSelect(exerciseDef) {
    const mode = pickerModeRef.current;
    const exConfig = {
      exerciseId: exerciseDef.id,
      sets: 3,
      repRange: exerciseDef.defaultRepRange || [8, 12],
      rpe: exerciseDef.defaultRPE || 8,
    };
    const newEx = {
      exerciseId: exerciseDef.id,
      exConfig,
      discomfortRating: null,
      notes: '',
      sets: Array.from({ length: 3 }, () => ({
        weight: '', reps: '', rpe: null, completedAt: new Date().toISOString(),
      })),
    };

    if (mode === 'add') {
      setSessionExercises(prev => [...prev, newEx]);
    } else if (mode?.mode === 'swap') {
      setSessionExercises(prev => prev.map((ex, i) => i === mode.index ? newEx : ex));
    }

    await loadPreviousData([exerciseDef.id]);
  }

  async function handleCustomExerciseCreated(exercise) {
    const ctx = createCustomContextRef.current;
    createCustomContextRef.current = null;

    const updatedCustom = await getCustomExercises();
    setCustomExercises(updatedCustom);
    setShowCreateCustom(false);
    const exConfig = {
      exerciseId: exercise.id,
      sets: 3,
      repRange: exercise.defaultRepRange || [8, 12],
      rpe: exercise.defaultRPE || 8,
    };
    const newEx = {
      exerciseId: exercise.id,
      exConfig,
      discomfortRating: null,
      notes: '',
      sets: Array.from({ length: 3 }, () => ({
        weight: '', reps: '', rpe: null, completedAt: new Date().toISOString(),
      })),
    };
    if (ctx?.mode === 'swap') {
      setSessionExercises(prev => prev.map((ex, i) => i === ctx.index ? newEx : ex));
    } else {
      setSessionExercises(prev => [...prev, newEx]);
    }
    await loadPreviousData([exercise.id]);
  }

  async function handleFinish() {
    const hasAnySets = sessionExercises.some(ex => ex.sets.some(s => s.weight || s.reps));

    if (!hasAnySets) {
      Alert.alert(
        'No sets logged',
        "You haven't entered any weight or reps yet. Are you sure you want to finish?",
        [
          { text: 'Keep going', style: 'cancel' },
          {
            text: 'End session',
            onPress: async () => {
              await clearDraftSession();
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    setFinishing(true);
    try {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

      const endTime = new Date().toISOString();
      const session = {
        id: uuidv4(),
        date: startTime.current,
        splitDayLabel: splitDay.dayLabel,
        splitDayDisplayName: splitDay.displayName || null,
        startTime: startTime.current,
        endTime,
        weightUnit,
        exercises: sessionExercises
          .filter(ex => ex.sets.some(s => s.weight || s.reps))
          .map(ex => ({
            exerciseId: ex.exerciseId,
            discomfortRating: ex.discomfortRating,
            notes: ex.notes || '',
            sets: ex.sets,
          })),
      };

      await saveSession(session);
      await clearDraftSession();

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

  const currentExerciseIds = sessionExercises.map(e => e.exerciseId);
  const pickerExcludeIds = pickerMode === 'add'
    ? currentExerciseIds
    : pickerMode?.mode === 'swap'
      ? currentExerciseIds.filter((_, i) => i !== pickerMode.index)
      : [];

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
              'Your progress is saved as a draft — you can resume it next time.',
              [
                { text: 'Keep going', style: 'cancel' },
                {
                  text: 'Save & exit',
                  onPress: () => {
                    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
                    saveDraftSession({
                      splitDay, currentBlock,
                      startTime: startTime.current,
                      exercises: sessionExercises,
                      weightUnit,
                    }).then(() => navigation.goBack());
                  },
                },
              ]
            )}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{splitDay.displayName || splitDay.dayLabel}</Text>
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

        <TouchableOpacity
          style={styles.restTimer}
          onPress={() => { setRestStartedAt(Date.now()); setRestElapsed(0); }}
          activeOpacity={0.7}
        >
          <Text style={styles.restTimerLabel}>REST</Text>
          <Text style={styles.restTimerValue}>{formatRestTime(restElapsed)}</Text>
          <Ionicons name="refresh" size={14} color={colors.textTertiary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sessionExercises.map((exData, exIndex) => {
            const exDef = allExercises.find(e => e.id === exData.exerciseId);
            if (!exDef) return null;
            return (
              <ExerciseCard
                key={`${exData.exerciseId}-${exIndex}`}
                exerciseData={exData}
                exerciseDef={exDef}
                exConfig={exData.exConfig}
                currentBlock={currentBlock}
                weightUnit={weightUnit}
                previousData={previousData[exData.exerciseId]}
                onSetUpdate={(setIndex, field, value) => updateSet(exIndex, setIndex, field, value)}
                onSetAdd={() => addSet(exIndex)}
                onSetDelete={setIndex => deleteSet(exIndex, setIndex)}
                onDiscomfortChange={rating => updateDiscomfort(exIndex, rating)}
                onNotesChange={notes => updateNotes(exIndex, notes)}
                onManage={() => handleManageExercise(exIndex)}
              />
            );
          })}

          <TouchableOpacity
            onPress={async () => {
              const latest = await getCustomExercises();
              setCustomExercises(latest);
              pickerModeRef.current = 'add';
              setPickerMode('add');
            }}
            style={styles.addExerciseBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.addExercisePlus}>+</Text>
            <Text style={styles.addExerciseText}>Add exercise</Text>
          </TouchableOpacity>

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

      <ExercisePicker
        visible={pickerMode !== null}
        exercises={allExercises}
        onClose={() => {
          pickerModeRef.current = null;
          setPickerMode(null);
        }}
        onSelect={handlePickerSelect}
        onCreateCustom={() => {
          createCustomContextRef.current = pickerModeRef.current;
          pickerModeRef.current = null;
          setPickerMode(null);
          setTimeout(() => setShowCreateCustom(true), 400);
        }}
        excludeIds={pickerExcludeIds}
      />

      <CustomExerciseModal
        visible={showCreateCustom}
        onClose={() => setShowCreateCustom(false)}
        onSaved={handleCustomExerciseCreated}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  unitToggle: {
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  unitToggleText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },
  closeBtn: { fontSize: 18, color: colors.textSecondary, width: 32 },
  finishBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 8, minWidth: 64, alignItems: 'center',
  },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },
  restTimer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  restTimerLabel: {
    fontSize: 10, fontWeight: '700', color: colors.textTertiary,
    letterSpacing: 1.2, textTransform: 'uppercase', marginRight: 8,
  },
  restTimerValue: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: borderRadius.lg, borderStyle: 'dashed', marginBottom: spacing.md,
  },
  addExercisePlus: { fontSize: fontSizes.lg, color: colors.primary, fontWeight: '700' },
  addExerciseText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary },
  bottomFinishBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs,
  },
  bottomFinishText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.md },
});

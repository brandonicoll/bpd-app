import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, FlatList, Alert, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import {
  getCurrentProgram, swapExerciseInProgram, getCustomExercises,
  addExerciseToProgram, removeExerciseFromProgram, setExerciseOrderForDay,
  renameProgramDay, reorderSplitDays,
} from '../../services/storage';
import { getCurrentBlockInfo } from '../../services/programEngine';
import { exercises as exerciseLibrary, getSwapCandidates } from '../../data/exercises';
import { JOINT_ACTION_LABELS } from '../../data/jointActionLabels';
import CustomExerciseModal from '../../components/common/CustomExerciseModal';
import ChangeSplitModal from '../../components/program/ChangeSplitModal';
import DraggableFlatList, { NestableDraggableFlatList, NestableScrollContainer, ScaleDecorator } from 'react-native-draggable-flatlist';

function getExercise(id) {
  return exerciseLibrary.find(e => e.id === id);
}

// ─── Swap modal ───────────────────────────────────────────────────────────────
function SwapModal({ visible, exerciseId, dayLabel, currentBlock, onClose, onSwapped, onCreateCustom, preSelectedId }) {
  const { colors } = useTheme();
  const swapStyles = makeSwapStyles(colors);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customExercises, setCustomExercises] = useState([]);

  useEffect(() => {
    if (visible) {
      setSelected(preSelectedId || null);
      getCustomExercises().then(setCustomExercises);
    }
  }, [visible]);

  const currentEx = getExercise(exerciseId) || customExercises.find(e => e.id === exerciseId);
  const builtInCandidates = exerciseId ? getSwapCandidates(exerciseId) : [];
  const customCandidates = currentEx
    ? customExercises.filter(custom =>
        custom.id !== exerciseId &&
        custom.jointActions?.some(action => currentEx.jointActions?.includes(action))
      )
    : [];
  const candidates = [...builtInCandidates, ...customCandidates];

  async function handleConfirm() {
    if (!selected) return;

    // Warn during Block 3 (data collection phase)
    if (currentBlock === 3) {
      Alert.alert(
        '⚠️ Data collection phase',
        "You're in weeks 5–10 — the structured progression block. Swapping now resets your progression data for this movement. Only swap if there's a strong reason (joint pain, instability).",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Swap anyway', style: 'destructive', onPress: () => doSwap() },
        ]
      );
      return;
    }

    await doSwap();
  }

  async function doSwap() {
    setSaving(true);
    try {
      await swapExerciseInProgram(dayLabel, exerciseId, selected);
      onSwapped();
      onClose();
    } catch (e) {
      console.error('Swap error:', e);
      Alert.alert('Error', 'Could not swap exercise. Please try again.');
    } finally {
      setSaving(false);
      setSelected(null);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={swapStyles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={swapStyles.sheet}>
        {/* Handle */}
        <View style={swapStyles.handle} />

        <Text style={swapStyles.title}>Swap exercise</Text>
        {currentEx && (
          <Text style={swapStyles.subtitle}>
            Replacing: <Text style={swapStyles.subtitleBold}>{currentEx.name}</Text>
          </Text>
        )}
        <Text style={swapStyles.jointLabel}>
          Alternatives with matching joint actions
        </Text>

        {candidates.length === 0 ? (
          <Text style={swapStyles.noResults}>No alternative exercises found.</Text>
        ) : (
          <FlatList
            data={candidates}
            keyExtractor={item => item.id}
            style={swapStyles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelected(item.id)}
                activeOpacity={0.75}
                style={[
                  swapStyles.candidate,
                  selected === item.id && swapStyles.candidateSelected,
                ]}
              >
                <View style={swapStyles.candidateInfo}>
                  <Text style={[swapStyles.candidateName, selected === item.id && swapStyles.candidateNameSelected]}>
                    {item.name}
                  </Text>
                  <Text style={swapStyles.candidateMeta}>
                    {item.isCustom
                      ? item.jointActions.slice(0, 2).map(j => JOINT_ACTION_LABELS[j] || j).join(' · ')
                      : `${item.defaultRepRange[0]}–${item.defaultRepRange[1]} reps`
                    }
                  </Text>
                  {item.isCustom && (
                    <View style={swapStyles.customChip}>
                      <Text style={swapStyles.customChipText}>Custom</Text>
                    </View>
                  )}
                  {!item.isCustom && item.notes && (
                    <Text style={swapStyles.candidateNote} numberOfLines={1}>{item.notes}</Text>
                  )}
                </View>
                {selected === item.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        )}

        {/* Create custom exercise shortcut */}
        <TouchableOpacity
          onPress={() => onCreateCustom?.()}
          style={swapStyles.createBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={swapStyles.createBtnText}>Create custom exercise</Text>
        </TouchableOpacity>

        <View style={swapStyles.footer}>
          <TouchableOpacity onPress={onClose} style={swapStyles.cancelBtn} activeOpacity={0.7}>
            <Text style={swapStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!selected || saving}
            activeOpacity={0.8}
            style={[swapStyles.confirmBtn, (!selected || saving) && swapStyles.confirmBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={swapStyles.confirmText}>Confirm swap</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeSwapStyles = (colors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  subtitleBold: { fontWeight: '700', color: colors.text },
  jointLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  noResults: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  list: { maxHeight: 280 },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  candidateSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
  candidateNameSelected: { color: colors.primaryDark },
  candidateMeta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  candidateNote: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 2 },
  selectedCheck: { fontSize: 16, color: colors.primary, fontWeight: '700', marginLeft: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary },
  confirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.38 },
  confirmText: { fontSize: fontSizes.sm, fontWeight: '700', color: '#fff' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  createBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  customChip: {
    alignSelf: 'flex-start',
    marginTop: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  customChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});

// ─── Add exercise modal ───────────────────────────────────────────────────────
function AddExerciseModal({ visible, dayLabel, existingIds, onClose, onAdded, onCreateCustom, preSelectedId }) {
  const { colors } = useTheme();
  const swapStyles = makeSwapStyles(colors);
  const addStyles = makeAddStyles(colors);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customExercises, setCustomExercises] = useState([]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelected(preSelectedId || null);
      getCustomExercises().then(setCustomExercises);
    }
  }, [visible]);

  const allExercises = [
    ...exerciseLibrary,
    ...customExercises.map(e => ({ ...e, isCustom: true })),
  ];

  const filtered = allExercises.filter(ex => {
    if (existingIds.includes(ex.id)) return false;
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.muscles?.some(m => m.toLowerCase().includes(q))
    );
  });

  async function handleAdd() {
    if (!selected) return;
    let ex = allExercises.find(e => e.id === selected);
    if (!ex) {
      // Custom exercise may not be in allExercises yet (async load still in flight)
      const freshCustom = await getCustomExercises();
      ex = freshCustom.find(e => e.id === selected);
    }
    if (!ex) return;
    setSaving(true);
    try {
      await addExerciseToProgram(dayLabel, selected, {
        exerciseId: selected,
        sets: 3,
        repRange: ex.defaultRepRange || [8, 12],
        rpe: ex.defaultRPE || 7,
        addedAt: new Date().toISOString(),
      });
      onAdded();
      onClose();
    } catch (e) {
      console.error('Add exercise error:', e);
      Alert.alert('Error', 'Could not add exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={swapStyles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={addStyles.sheet}>
        <View style={swapStyles.handle} />
        <Text style={swapStyles.title}>Add exercise</Text>
        <Text style={swapStyles.subtitle}>
          Adding to: <Text style={swapStyles.subtitleBold}>{dayLabel}</Text>
        </Text>

        <View style={addStyles.searchRow}>
          <Ionicons name="search" size={16} color={colors.textTertiary} style={addStyles.searchIcon} />
          <TextInput
            style={addStyles.searchInput}
            placeholder="Search by name or muscle…"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <Text style={swapStyles.noResults}>No exercises found.</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            style={swapStyles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelected(item.id)}
                activeOpacity={0.75}
                style={[swapStyles.candidate, selected === item.id && swapStyles.candidateSelected]}
              >
                <View style={swapStyles.candidateInfo}>
                  <Text style={[swapStyles.candidateName, selected === item.id && swapStyles.candidateNameSelected]}>
                    {item.name}
                  </Text>
                  <Text style={swapStyles.candidateMeta}>
                    {item.isCustom
                      ? 'Custom exercise'
                      : `${item.defaultRepRange[0]}–${item.defaultRepRange[1]} reps · RPE ${item.defaultRPE}`}
                  </Text>
                  {!item.isCustom && item.muscles?.length > 0 && (
                    <Text style={swapStyles.candidateNote} numberOfLines={1}>
                      {item.muscles.slice(0, 3).join(' · ')}
                    </Text>
                  )}
                  {item.isCustom && (
                    <View style={swapStyles.customChip}>
                      <Text style={swapStyles.customChipText}>Custom</Text>
                    </View>
                  )}
                </View>
                {selected === item.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          onPress={() => onCreateCustom?.()}
          style={swapStyles.createBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={swapStyles.createBtnText}>Create custom exercise</Text>
        </TouchableOpacity>

        <View style={swapStyles.footer}>
          <TouchableOpacity onPress={onClose} style={swapStyles.cancelBtn} activeOpacity={0.7}>
            <Text style={swapStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!selected || saving}
            activeOpacity={0.8}
            style={[swapStyles.confirmBtn, (!selected || saving) && swapStyles.confirmBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={swapStyles.confirmText}>Add exercise</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeAddStyles = (colors) => StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    height: 40,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text,
    height: 40,
  },
});

// ─── Reorder days modal ───────────────────────────────────────────────────────
function ReorderDaysModal({ visible, splitDays, onClose, onSaved }) {
  const { colors } = useTheme();
  const swapStyles = makeSwapStyles(colors);
  const reorderStyles = makeReorderStyles(colors);
  const [days, setDays] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setDays(splitDays.map(d => ({ ...d })));
  }, [visible, splitDays]);

  async function handleSave() {
    setSaving(true);
    await onSaved(days.map(d => d.dayLabel));
    setSaving(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={swapStyles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={reorderStyles.sheet}>
        <View style={swapStyles.handle} />
        <Text style={swapStyles.title}>Reorder training days</Text>
        <Text style={reorderStyles.hint}>Hold and drag to reorder</Text>

        <DraggableFlatList
          data={days}
          keyExtractor={item => item.dayLabel}
          onDragEnd={({ data }) => setDays(data)}
          style={reorderStyles.list}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator>
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={120}
                activeOpacity={0.9}
                style={[reorderStyles.dayRow, isActive && reorderStyles.dayRowActive]}
              >
                <Ionicons name="reorder-three-outline" size={22} color={colors.textTertiary} style={reorderStyles.handle} />
                <Text style={reorderStyles.dayName}>{item.displayName || item.dayLabel}</Text>
                <Text style={reorderStyles.exerciseCount}>{item.exercises.length} exercises</Text>
              </TouchableOpacity>
            </ScaleDecorator>
          )}
        />

        <View style={swapStyles.footer}>
          <TouchableOpacity onPress={onClose} style={swapStyles.cancelBtn} activeOpacity={0.7}>
            <Text style={swapStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
            style={[swapStyles.confirmBtn, saving && swapStyles.confirmBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={swapStyles.confirmText}>Save order</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeReorderStyles = (colors) => StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  list: { marginBottom: spacing.sm },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  dayRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  handle: { marginRight: spacing.md },
  dayName: { flex: 1, fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  exerciseCount: { fontSize: fontSizes.xs, color: colors.textTertiary, fontWeight: '500' },
});

// ─── ProgramOverviewScreen ────────────────────────────────────────────────────
export default function ProgramOverviewScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [program, setProgram] = useState(null);
  const [customExercises, setCustomExercises] = useState([]);
  const [blockInfo, setBlockInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Checks built-in library first, then custom exercises
  function getExercise(id) {
    return exerciseLibrary.find(e => e.id === id) || customExercises.find(e => e.id === id);
  }
  const [swapModal, setSwapModal] = useState({ visible: false, exerciseId: null, dayLabel: null, preSelectedId: null });
  const [editingDay, setEditingDay] = useState(null);
  const [addModal, setAddModal] = useState({ visible: false, dayLabel: null, existingIds: [], preSelectedId: null });
  const [showChangeSplit, setShowChangeSplit] = useState(false);
  const [showReorderDays, setShowReorderDays] = useState(false);
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [showEditCustom, setShowEditCustom] = useState(false);
  const [editingCustomExercise, setEditingCustomExercise] = useState(null);
  const createCustomContext = useRef(null);

  // iOS only supports one Modal at a time. Close the sub-modal first,
  // wait for its dismiss animation (~350ms), then open CustomExerciseModal.
  function openCreateCustomFromAdd() {
    createCustomContext.current = {
      type: 'add',
      dayLabel: addModal.dayLabel,
      existingIds: addModal.existingIds,
    };
    setAddModal({ visible: false, dayLabel: null, existingIds: [], preSelectedId: null });
    setTimeout(() => setShowCreateCustom(true), 400);
  }

  function openCreateCustomFromSwap() {
    createCustomContext.current = {
      type: 'swap',
      exerciseId: swapModal.exerciseId,
      dayLabel: swapModal.dayLabel,
    };
    setSwapModal({ visible: false, exerciseId: null, dayLabel: null, preSelectedId: null });
    setTimeout(() => setShowCreateCustom(true), 400);
  }

  function handleCustomExerciseSaved(exercise) {
    setShowCreateCustom(false);
    const ctx = createCustomContext.current;
    createCustomContext.current = null;
    if (!ctx) return;

    if (ctx.type === 'add') {
      // Add directly — avoids async race between setSelected and getCustomExercises resolving
      addExerciseToProgram(ctx.dayLabel, exercise.id, {
        exerciseId: exercise.id,
        sets: 3,
        repRange: exercise.defaultRepRange || [8, 12],
        rpe: exercise.defaultRPE || 7,
        addedAt: new Date().toISOString(),
      }).then(() => load());
    } else if (ctx.type === 'swap') {
      // Swap needs user to confirm which exercise to replace, so reopen the modal
      setTimeout(() => {
        setSwapModal({ visible: true, exerciseId: ctx.exerciseId, dayLabel: ctx.dayLabel, preSelectedId: exercise.id });
      }, 400);
    }
  }

  const load = useCallback(async () => {
    const [p, custom] = await Promise.all([getCurrentProgram(), getCustomExercises()]);
    setProgram(p);
    setCustomExercises(custom);
    if (p) setBlockInfo(getCurrentBlockInfo(p.currentBlock));
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openSwap(exerciseId, dayLabel) {
    setSwapModal({ visible: true, exerciseId, dayLabel });
  }

  function closeSwap() {
    setSwapModal({ visible: false, exerciseId: null, dayLabel: null });
  }

  function openAddModal(dayLabel, existingIds) {
    setAddModal({ visible: true, dayLabel, existingIds });
  }

  async function handleRenameDay(dayLabel, displayName) {
    await renameProgramDay(dayLabel, displayName);
    load();
  }

  function closeAddModal() {
    setAddModal({ visible: false, dayLabel: null, existingIds: [] });
  }

  async function handleReorderDay(dayLabel, reorderedExercises) {
    await setExerciseOrderForDay(dayLabel, reorderedExercises);
    load();
  }

  function handleDeleteExercise(dayLabel, exerciseId, count) {
    if (count <= 1) {
      Alert.alert('Cannot remove', 'Each day must have at least one exercise.');
      return;
    }
    Alert.alert(
      'Remove exercise?',
      'This will remove the exercise from this training day.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeExerciseFromProgram(dayLabel, exerciseId);
            load();
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const weekProgress = program ? Math.min((program.currentWeek - 1) / 12, 1) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <NestableScrollContainer
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>My program</Text>
          <View style={styles.headerBtns}>
            {program?.splitDays?.length > 1 && (
              <TouchableOpacity
                onPress={() => setShowReorderDays(true)}
                style={styles.reorderDaysBtn}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="swap-vertical-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowChangeSplit(true)}
              style={styles.changeSplitBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.changeSplitBtnText}>Change split</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Block + week progress card */}
        {blockInfo && program && (
          <View style={[styles.blockCard, { borderLeftColor: blockInfo.color }]}>
            <View style={styles.blockCardRow}>
              <View>
                <Text style={styles.blockMeta}>Block {blockInfo.blockNumber} of 4</Text>
                <Text style={styles.blockName}>{blockInfo.name}</Text>
              </View>
              <View style={[styles.weekBadge, { backgroundColor: blockInfo.color + '20' }]}>
                <Text style={[styles.weekBadgeText, { color: blockInfo.color }]}>
                  Week {program.currentWeek}
                </Text>
              </View>
            </View>

            {/* 12-week progress bar */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, {
                width: `${weekProgress * 100}%`,
                backgroundColor: blockInfo.color,
              }]} />
            </View>
            <View style={styles.progressBarLabels}>
              <Text style={styles.progressBarLabel}>Week 1</Text>
              <Text style={styles.progressBarLabel}>Week 12</Text>
            </View>

            {blockInfo.blockNumber === 3 && (
              <View style={styles.blockNotice}>
                <Ionicons name="lock-closed" size={12} color={colors.warning} style={styles.blockNoticeIcon} />
                <Text style={styles.blockWarning}>
                  Data collection phase — keep exercises consistent until week 11.
                </Text>
              </View>
            )}
            {blockInfo.blockNumber === 4 && (
              <View style={styles.blockNotice}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} style={styles.blockNoticeIcon} />
                <Text style={styles.blockHint}>
                  Optimization phase — feel free to swap underperforming exercises.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Split days */}
        {program?.splitDays.map((day, dayIndex) => {
          const isEditing = editingDay === day.dayLabel;
          return (
            <View key={day.dayLabel} style={styles.dayCard}>
              {/* Day header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayIndexBadge}>
                  <Text style={styles.dayIndexText}>{dayIndex + 1}</Text>
                </View>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.dayLabelEditable}
                    activeOpacity={0.7}
                    onPress={() => Alert.prompt(
                      'Rename day',
                      null,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Save', onPress: (text) => {
                          const trimmed = text?.trim();
                          if (trimmed) handleRenameDay(day.dayLabel, trimmed);
                        }},
                      ],
                      'plain-text',
                      day.displayName || day.dayLabel,
                    )}
                  >
                    <Text style={[styles.dayLabel, styles.dayLabelEditActive]} numberOfLines={1}>
                      {day.displayName || day.dayLabel}
                    </Text>
                    <Ionicons name="pencil" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.dayLabel} numberOfLines={1}>
                    {day.displayName || day.dayLabel}
                  </Text>
                )}
                <Text style={styles.exerciseCount}>{day.exercises.length} exercises</Text>
                <TouchableOpacity
                  onPress={() => setEditingDay(isEditing ? null : day.dayLabel)}
                  style={styles.editDayBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isEditing ? 'checkmark-circle' : 'pencil-outline'}
                    size={16}
                    color={isEditing ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Exercise rows */}
              <NestableDraggableFlatList
                data={day.exercises}
                keyExtractor={(item, i) => `${item.exerciseId}-${i}`}
                onDragEnd={({ data }) => handleReorderDay(day.dayLabel, data)}
                scrollEnabled={false}
                renderItem={({ item: exConfig, drag, isActive, getIndex }) => {
                  const ex = getExercise(exConfig.exerciseId);
                  if (!ex) return null;
                  const exIndex = getIndex() ?? 0;
                  const isFirst = exIndex === 0;
                  return (
                    <ScaleDecorator>
                      <View style={[styles.exRow, isActive && styles.exRowActive]}>
                        <TouchableOpacity
                          style={styles.exInfo}
                          activeOpacity={0.7}
                          onPress={() => navigation.navigate('ExerciseDetail', {
                            exerciseId: exConfig.exerciseId,
                            dayLabel: day.dayLabel,
                          })}
                        >
                          <View style={[styles.exIndexDot, isFirst && styles.exIndexDotFirst]} />
                          <View style={styles.exTextGroup}>
                            <Text style={styles.exName}>{ex.name}</Text>
                            <Text style={styles.exMeta}>
                              {exConfig.sets} × {exConfig.repRange[0]}–{exConfig.repRange[1]} reps · RPE {exConfig.rpe}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {isEditing ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            {ex.isCustom && (
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingCustomExercise(ex);
                                  setShowEditCustom(true);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleDeleteExercise(day.dayLabel, exConfig.exerciseId, day.exercises.length)}
                              style={styles.deleteBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              onLongPress={drag}
                              delayLongPress={150}
                              style={styles.dragHandle}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                            >
                              <Ionicons name="reorder-three-outline" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => openSwap(exConfig.exerciseId, day.dayLabel)}
                              style={styles.swapBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </ScaleDecorator>
                  );
                }}
              />

              {/* Add exercise row — edit mode only */}
              {isEditing && (
                <TouchableOpacity
                  style={styles.addExRow}
                  onPress={() => openAddModal(day.dayLabel, day.exercises.map(e => e.exerciseId))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.addExText}>Add exercise</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Exercise library link */}
        <TouchableOpacity
          style={styles.libraryLink}
          onPress={() => navigation.navigate('ExerciseLibrary')}
          activeOpacity={0.7}
        >
          <Text style={styles.libraryLinkText}>Browse full exercise library</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </NestableScrollContainer>

      {/* Swap modal */}
      <SwapModal
        visible={swapModal.visible}
        exerciseId={swapModal.exerciseId}
        dayLabel={swapModal.dayLabel}
        currentBlock={program?.currentBlock}
        onClose={closeSwap}
        onSwapped={load}
        onCreateCustom={openCreateCustomFromSwap}
        preSelectedId={swapModal.preSelectedId}
      />

      {/* Add exercise modal */}
      <AddExerciseModal
        visible={addModal.visible}
        dayLabel={addModal.dayLabel}
        existingIds={addModal.existingIds}
        onClose={closeAddModal}
        onAdded={load}
        onCreateCustom={openCreateCustomFromAdd}
        preSelectedId={addModal.preSelectedId}
      />

      {/* Change split modal */}
      <ChangeSplitModal
        visible={showChangeSplit}
        currentProgram={program}
        onClose={() => setShowChangeSplit(false)}
        onChanged={() => { setShowChangeSplit(false); load(); }}
      />

      {/* Custom exercise creator — at screen level; sub-modal dismissed before this opens */}
      <CustomExerciseModal
        visible={showCreateCustom}
        onClose={() => {
          setShowCreateCustom(false);
          createCustomContext.current = null;
        }}
        onSaved={handleCustomExerciseSaved}
      />

      {/* Custom exercise editor */}
      <CustomExerciseModal
        visible={showEditCustom}
        editExercise={editingCustomExercise}
        onClose={() => { setShowEditCustom(false); setEditingCustomExercise(null); }}
        onSaved={() => { setShowEditCustom(false); setEditingCustomExercise(null); load(); }}
      />

      {/* Reorder split days modal */}
      <ReorderDaysModal
        visible={showReorderDays}
        splitDays={program?.splitDays || []}
        onClose={() => setShowReorderDays(false)}
        onSaved={async (orderedLabels) => {
          await reorderSplitDays(orderedLabels);
          setShowReorderDays(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.text,
  },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reorderDaysBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeSplitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  changeSplitBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: '#fff',
  },

  // Block card
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  blockCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  blockMeta: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  blockName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  weekBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  weekBadgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
  progressBarTrack: {
    height: 5,
    backgroundColor: colors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressBarLabel: { fontSize: 10, color: colors.textTertiary },
  blockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  blockNoticeIcon: { marginTop: 2 },
  blockWarning: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.warning,
    fontWeight: '500',
    lineHeight: 17,
  },
  blockHint: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.success,
    fontWeight: '500',
    lineHeight: 17,
  },

  // Day card
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.gray100,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  dayIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndexText: { fontSize: fontSizes.xs, fontWeight: '700', color: '#fff' },
  dayLabel: { flex: 1, fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  dayLabelEditable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dayLabelEditActive: { flex: 0, color: colors.primary },
  exerciseCount: { fontSize: fontSizes.xs, color: colors.textTertiary, fontWeight: '500' },

  // Exercise row
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  exInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exIndexDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray200,
    flexShrink: 0,
  },
  exIndexDotFirst: {
    backgroundColor: colors.primary,
  },
  exRowActive: { opacity: 0.95, shadowOpacity: 0.12, elevation: 4 },
  dragHandle: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exTextGroup: { flex: 1 },
  exName: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
  exMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  swapBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.sm,
  },
  swapIcon: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
  editDayBtn: {
    padding: 4,
    marginLeft: spacing.xs,
  },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  addExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  addExText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },

  // Library link
  libraryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },
  libraryLinkText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});

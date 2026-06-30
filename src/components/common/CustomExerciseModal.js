import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { saveCustomExercise, saveExerciseOverride } from '../../services/storage';
import { JOINT_ACTIONS_DATA, JOINT_ACTION_KEYS } from '../../data/jointActionLabels';

const RPE_OPTIONS = [6, 7, 8, 9, 10];

export default function CustomExerciseModal({ visible, onClose, onSaved, editExercise = null }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [name, setName] = useState('');
  const [selectedActions, setSelectedActions] = useState([]);
  const [actionPickerOpen, setActionPickerOpen] = useState(false);
  const [repMin, setRepMin] = useState('8');
  const [repMax, setRepMax] = useState('12');
  const [rpe, setRpe] = useState(8);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && editExercise) {
      setName(editExercise.name || '');
      setSelectedActions(editExercise.jointActions || []);
      setActionPickerOpen(false);
      setRepMin(String(editExercise.defaultRepRange?.[0] ?? 8));
      setRepMax(String(editExercise.defaultRepRange?.[1] ?? 12));
      setRpe(editExercise.defaultRPE ?? 8);
      setNotes(editExercise.notes || '');
      setSaving(false);
    } else if (visible) {
      reset();
    }
  }, [visible, editExercise]);

  function reset() {
    setName(''); setSelectedActions([]); setActionPickerOpen(false);
    setRepMin('8'); setRepMax('12'); setRpe(8); setNotes(''); setSaving(false);
  }

  function handleClose() { reset(); onClose(); }

  function toggleAction(key) {
    setSelectedActions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this exercise.');
      return;
    }
    if (selectedActions.length === 0) {
      Alert.alert('Joint action required', 'Select at least one joint action so the app can suggest this as a swap.');
      return;
    }
    const min = parseInt(repMin) || 0;
    const max = parseInt(repMax) || 0;
    if (min < 1 || max < 1 || min >= max) {
      Alert.alert('Invalid rep range', 'Make sure min reps is less than max reps.');
      return;
    }

    setSaving(true);
    try {
      const isBuiltIn = editExercise && !editExercise.isCustom;
      let exercise;

      if (isBuiltIn) {
        const overrideData = {
          name: name.trim(),
          jointActions: selectedActions,
          defaultRepRange: [min, max],
          defaultRPE: rpe,
          notes: notes.trim(),
        };
        await saveExerciseOverride(editExercise.id, overrideData);
        exercise = { ...editExercise, ...overrideData };
      } else if (editExercise) {
        exercise = {
          ...editExercise,
          name: name.trim(),
          jointActions: selectedActions,
          defaultRepRange: [min, max],
          defaultRPE: rpe,
          notes: notes.trim(),
          updatedAt: new Date().toISOString(),
        };
        await saveCustomExercise(exercise);
      } else {
        exercise = {
          id: `custom_${uuidv4()}`,
          name: name.trim(),
          jointActions: selectedActions,
          muscles: [],
          defaultRepRange: [min, max],
          defaultRPE: rpe,
          notes: notes.trim(),
          isCustom: true,
          stability: 'medium',
          coordinationDemand: 'medium',
          createdAt: new Date().toISOString(),
        };
        await saveCustomExercise(exercise);
      }
      reset();
      onSaved(exercise);
    } catch (e) {
      console.error('Save custom exercise error:', e);
      Alert.alert('Error', 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  const isValid = name.trim().length > 0 && selectedActions.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editExercise ? 'Edit exercise' : 'Custom exercise'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!isValid || saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={[styles.headerSave, !isValid && styles.headerSaveDisabled]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Exercise name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Smith machine row"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            maxLength={60}
          />

          <Text style={styles.label}>Joint action(s) *</Text>

          {/* Collapsed summary row */}
          <TouchableOpacity
            onPress={() => setActionPickerOpen(o => !o)}
            activeOpacity={0.7}
            style={[styles.pickerToggle, actionPickerOpen && styles.pickerToggleOpen]}
          >
            <View style={styles.pickerToggleLeft}>
              {selectedActions.length === 0 ? (
                <Text style={styles.pickerPlaceholder}>
                  Select — most exercises involve more than one
                </Text>
              ) : (
                <Text style={styles.pickerCount}>
                  {selectedActions.length} selected
                </Text>
              )}
            </View>
            <Ionicons
              name={actionPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Selected chips shown when collapsed */}
          {!actionPickerOpen && selectedActions.length > 0 && (
            <View style={styles.selectedChips}>
              {selectedActions.map(key => (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleAction(key)}
                  activeOpacity={0.7}
                  style={styles.selectedChip}
                >
                  <Text style={styles.selectedChipText}>{JOINT_ACTIONS_DATA[key]?.label}</Text>
                  <Ionicons name="close" size={11} color={colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Expanded picker list */}
          {actionPickerOpen && (
            <View style={styles.actionsList}>
              {JOINT_ACTION_KEYS.map(key => {
                const isSelected = selectedActions.includes(key);
                const data = JOINT_ACTIONS_DATA[key];
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggleAction(key)}
                    activeOpacity={0.7}
                    style={[styles.actionRow, isSelected && styles.actionRowSelected]}
                  >
                    <View style={styles.actionRowLeft}>
                      <Text style={[styles.actionRowLabel, isSelected && styles.actionRowLabelSelected]}>
                        {data.label}
                      </Text>
                      <Text style={[styles.actionRowExample, isSelected && styles.actionRowExampleSelected]}>
                        e.g. {data.example}
                      </Text>
                    </View>
                    <View style={[styles.actionRowCheck, isSelected && styles.actionRowCheckSelected]}>
                      {isSelected && <Text style={styles.actionRowCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setActionPickerOpen(false)}
                activeOpacity={0.7}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Rep range *</Text>
          <View style={styles.repRow}>
            <View style={styles.repGroup}>
              <Text style={styles.repGroupLabel}>Min reps</Text>
              <TextInput style={styles.repInput} value={repMin} onChangeText={setRepMin} keyboardType="number-pad" maxLength={2} />
            </View>
            <Text style={styles.repDash}>–</Text>
            <View style={styles.repGroup}>
              <Text style={styles.repGroupLabel}>Max reps</Text>
              <TextInput style={styles.repInput} value={repMax} onChangeText={setRepMax} keyboardType="number-pad" maxLength={2} />
            </View>
          </View>

          <Text style={styles.label}>Target RPE</Text>
          <View style={styles.rpeRow}>
            {RPE_OPTIONS.map(val => (
              <TouchableOpacity
                key={val}
                onPress={() => setRpe(val)}
                activeOpacity={0.7}
                style={[styles.rpeChip, rpe === val && styles.rpeChipSelected]}
              >
                <Text style={[styles.rpeChipText, rpe === val && styles.rpeChipTextSelected]}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Form cues, equipment, anything useful..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerCancel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600' },
  headerTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  headerSave: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: '700' },
  headerSaveDisabled: { color: colors.textTertiary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.xs, marginTop: spacing.md,
  },
  optional: { fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: colors.textTertiary },
  input: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 48,
    fontSize: fontSizes.md, color: colors.text,
  },
  notesInput: { height: 80, paddingTop: spacing.sm },

  // Picker toggle
  pickerToggle: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 13,
  },
  pickerToggleOpen: { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  pickerToggleLeft: { flex: 1 },
  pickerPlaceholder: { fontSize: fontSizes.sm, color: colors.textTertiary },
  pickerCount: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },

  // Selected chips (collapsed state)
  selectedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: colors.primary,
  },
  selectedChipText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.primary },

  // Expanded list
  actionsList: {
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.primary,
    borderBottomLeftRadius: borderRadius.md, borderBottomRightRadius: borderRadius.md,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionRowSelected: { backgroundColor: colors.primaryLight },
  actionRowLeft: { flex: 1, marginRight: spacing.sm },
  actionRowLabel: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary },
  actionRowLabelSelected: { color: colors.primary },
  actionRowExample: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1 },
  actionRowExampleSelected: { color: colors.primary, opacity: 0.75 },
  actionRowCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  actionRowCheckSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionRowCheckMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  doneBtn: {
    paddingVertical: 12, alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  doneBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary },

  repRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  repGroup: { flex: 1 },
  repGroupLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, marginBottom: 4 },
  repInput: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 48,
    fontSize: fontSizes.xl, fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  repDash: { fontSize: fontSizes.xl, color: colors.textTertiary, marginTop: 20 },
  rpeRow: { flexDirection: 'row', gap: spacing.sm },
  rpeChip: {
    flex: 1, height: 44, borderRadius: borderRadius.md, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  rpeChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rpeChipText: { fontSize: fontSizes.md, fontWeight: '600', color: colors.textSecondary },
  rpeChipTextSelected: { color: colors.primary },
});

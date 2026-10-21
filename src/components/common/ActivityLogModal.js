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
import { saveActivity, deleteActivity } from '../../services/storage';
import {
  ACTIVITY_TYPES, ACTIVITY_REGIONS, REGION_LABELS, INTENSITY, INTENSITY_OPTIONS, getActivityType,
} from '../../data/activities';

const DURATION_PRESETS = [30, 45, 60, 90];
const MAX_DAYS_BACK = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(isoDate) {
  return Math.round((startOfDay(new Date()) - startOfDay(isoDate)) / MS_PER_DAY);
}

function dayLabel(offset) {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Yesterday';
  const d = new Date(Date.now() - offset * MS_PER_DAY);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Past days have no time attached, so they're stamped at noon. "Today" uses
// the current time, since activities are usually logged right after.
function dateForOffset(offset) {
  if (offset === 0) return new Date().toISOString();
  const d = startOfDay(new Date(Date.now() - offset * MS_PER_DAY));
  d.setHours(12);
  return d.toISOString();
}

export default function ActivityLogModal({ visible, onClose, onSaved, editActivity = null }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [type, setType] = useState(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customRegion, setCustomRegion] = useState(null);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState(INTENSITY.MODERATE);
  const [dayOffset, setDayOffset] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editActivity) {
      setType(editActivity.type);
      setCustomLabel(editActivity.customLabel || '');
      setCustomRegion(editActivity.type === 'other' ? editActivity.region : null);
      setDuration(String(editActivity.durationMinutes || ''));
      setIntensity(editActivity.intensity || INTENSITY.MODERATE);
      setDayOffset(Math.min(Math.max(daysAgo(editActivity.date), 0), MAX_DAYS_BACK));
      setNote(editActivity.note || '');
    } else {
      setType(null); setCustomLabel(''); setCustomRegion(null); setDuration('');
      setIntensity(INTENSITY.MODERATE); setDayOffset(0); setNote('');
    }
    setSaving(false);
  }, [visible, editActivity]);

  const minutes = parseInt(duration, 10) || 0;
  const region = type === 'other' ? customRegion : getActivityType(type)?.region;
  const isValid = !!type && !!region && minutes > 0;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      const keepOriginalDate = editActivity && daysAgo(editActivity.date) === dayOffset;
      const activity = {
        ...(editActivity || {}),
        id: editActivity?.id || `activity_${uuidv4()}`,
        date: keepOriginalDate ? editActivity.date : dateForOffset(dayOffset),
        type,
        customLabel: type === 'other' ? customLabel.trim() : '',
        region,
        durationMinutes: minutes,
        intensity,
        note: note.trim(),
        createdAt: editActivity?.createdAt || new Date().toISOString(),
      };
      await saveActivity(activity);
      onSaved?.(activity);
      onClose();
    } catch (e) {
      console.error('saveActivity error:', e);
      Alert.alert('Error', 'Could not save this activity. Please try again.');
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete activity?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(editActivity.id);
          onSaved?.(null);
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editActivity ? 'Edit activity' : 'Log activity'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!isValid || saving}>
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={[styles.headerSave, !isValid && styles.headerSaveDisabled]}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Sport and cardio outside the gym use the same recovery as your lifting. Logging them lets the coaching engine tell a real plateau from a tired week.
          </Text>

          <Text style={styles.label}>Activity *</Text>
          <View style={styles.typeGrid}>
            {ACTIVITY_TYPES.map(t => {
              const selected = type === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setType(t.id)}
                  activeOpacity={0.7}
                  style={[styles.typeChip, selected && styles.chipSelected]}
                >
                  <Ionicons name={t.icon} size={16} color={selected ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.typeChipText, selected && styles.chipTextSelected]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {type === 'other' && (
            <>
              <Text style={styles.label}>Name <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder="e.g. Tennis"
                placeholderTextColor={colors.textTertiary}
                maxLength={40}
              />
              <Text style={styles.label}>Mostly worked *</Text>
              <View style={styles.row}>
                {Object.values(ACTIVITY_REGIONS).map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setCustomRegion(r)}
                    activeOpacity={0.7}
                    style={[styles.segment, customRegion === r && styles.chipSelected]}
                  >
                    <Text style={[styles.segmentText, customRegion === r && styles.chipTextSelected]}>{REGION_LABELS[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Duration (minutes) *</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.durationInput]}
              value={duration}
              onChangeText={t => setDuration(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={3}
            />
            {DURATION_PRESETS.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setDuration(String(m))}
                activeOpacity={0.7}
                style={[styles.presetChip, minutes === m && styles.chipSelected]}
              >
                <Text style={[styles.segmentText, minutes === m && styles.chipTextSelected]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Intensity</Text>
          <View style={styles.row}>
            {INTENSITY_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.value}
                onPress={() => setIntensity(o.value)}
                activeOpacity={0.7}
                style={[styles.segment, intensity === o.value && styles.chipSelected]}
              >
                <Text style={[styles.segmentText, intensity === o.value && styles.chipTextSelected]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>When</Text>
          <View style={styles.dayStepper}>
            <TouchableOpacity
              onPress={() => setDayOffset(o => Math.min(o + 1, MAX_DAYS_BACK))}
              disabled={dayOffset >= MAX_DAYS_BACK}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color={dayOffset >= MAX_DAYS_BACK ? colors.border : colors.text} />
            </TouchableOpacity>
            <Text style={styles.dayLabel}>{dayLabel(dayOffset)}</Text>
            <TouchableOpacity
              onPress={() => setDayOffset(o => Math.max(o - 1, 0))}
              disabled={dayOffset === 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={20} color={dayOffset === 0 ? colors.border : colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Note <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Anything worth remembering..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />

          {editActivity && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteText}>Delete activity</Text>
            </TouchableOpacity>
          )}
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
  intro: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
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
  noteInput: { height: 80, paddingTop: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipTextSelected: { color: colors.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  segment: {
    flexGrow: 1, alignItems: 'center', paddingVertical: 11,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary },
  durationInput: { width: 72, textAlign: 'center' },
  presetChip: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayStepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 48,
  },
  dayLabel: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: spacing.xl, paddingVertical: spacing.md,
  },
  deleteText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.danger },
});

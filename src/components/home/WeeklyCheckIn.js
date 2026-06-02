import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { saveWeeklyCheckIn } from '../../services/storage';
import { currentWeekKey } from '../../utils/dateHelpers';

const NUTRITION_OPTIONS = [
  { value: 3, label: 'On track',    emoji: '✅', color: colors.success, bg: colors.successLight },
  { value: 2, label: 'Roughly',     emoji: '🟡', color: colors.warning, bg: colors.warningLight },
  { value: 1, label: 'Off track',   emoji: '❌', color: colors.danger,  bg: colors.dangerLight  },
];

const FATIGUE_OPTIONS = [
  { value: 3, label: 'High energy', emoji: '⚡', color: colors.success, bg: colors.successLight },
  { value: 2, label: 'Okay',        emoji: '😐', color: colors.warning, bg: colors.warningLight },
  { value: 1, label: 'Low energy',  emoji: '🪫', color: colors.danger,  bg: colors.dangerLight  },
];

export default function WeeklyCheckIn({ onComplete }) {
  const [nutritionRating, setNutritionRating] = useState(null);
  const [fatigueRating, setFatigueRating]     = useState(null);
  const [saving, setSaving] = useState(false);

  const canSave = nutritionRating !== null && fatigueRating !== null;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await saveWeeklyCheckIn({
        weekStartDate: currentWeekKey(),
        nutritionRating,
        fatigueRating,
        completedAt: new Date().toISOString(),
      });
      onComplete?.();
    } catch (e) {
      console.error('Error saving check-in:', e);
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📋</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Weekly check-in</Text>
          <Text style={styles.subtitle}>2 quick questions — helps the engine understand your context</Text>
        </View>
      </View>

      <Text style={styles.questionLabel}>How was your nutrition this week?</Text>
      <View style={styles.optionsRow}>
        {NUTRITION_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setNutritionRating(opt.value)}
            activeOpacity={0.75}
            style={[
              styles.option,
              nutritionRating === opt.value && { backgroundColor: opt.bg, borderColor: opt.color },
            ]}
          >
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <Text style={[
              styles.optionLabel,
              nutritionRating === opt.value && { color: opt.color },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.questionLabel}>How were your energy levels?</Text>
      <View style={styles.optionsRow}>
        {FATIGUE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setFatigueRating(opt.value)}
            activeOpacity={0.75}
            style={[
              styles.option,
              fatigueRating === opt.value && { backgroundColor: opt.bg, borderColor: opt.color },
            ]}
          >
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <Text style={[
              styles.optionLabel,
              fatigueRating === opt.value && { color: opt.color },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={!canSave || saving}
        activeOpacity={0.75}
        style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.saveBtnText}>Save check-in</Text>
        }
      </TouchableOpacity>

      <Text style={styles.note}>
        These ratings help the engine distinguish programming issues from lifestyle ones.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerEmoji: { fontSize: 28 },
  headerText: { flex: 1 },
  title: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1, lineHeight: 16 },
  questionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 3,
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.38 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: fontSizes.sm },
  note: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

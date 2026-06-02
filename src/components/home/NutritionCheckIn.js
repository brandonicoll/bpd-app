import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { saveWeeklyCheckIn } from '../../services/storage';
import { currentWeekKey } from '../../utils/dateHelpers';

const OPTIONS = [
  { value: 3, label: 'On track', icon: 'checkmark-circle', color: colors.success, bg: colors.successLight },
  { value: 2, label: 'Roughly', icon: 'remove-circle', color: colors.warning, bg: colors.warningLight },
  { value: 1, label: 'Off track', icon: 'close-circle', color: colors.danger, bg: colors.dangerLight },
];

export default function NutritionCheckIn({ onComplete }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await saveWeeklyCheckIn({
        weekStartDate: currentWeekKey(),
        nutritionRating: selected,
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
        <Ionicons name="nutrition" size={28} color={colors.success} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Weekly nutrition check-in</Text>
          <Text style={styles.subtitle}>How was your nutrition this week?</Text>
        </View>
      </View>

      <View style={styles.optionsRow}>
        {OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setSelected(option.value)}
            activeOpacity={0.75}
            style={[
              styles.option,
              selected === option.value && { backgroundColor: option.bg, borderColor: option.color },
            ]}
          >
            <Ionicons name={option.icon} size={22} color={selected === option.value ? option.color : colors.textTertiary} />
            <Text style={[styles.optionLabel, selected === option.value && { color: option.color }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected && (
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.75}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save check-in</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.note}>
        This helps the app understand unexpected progress stalls.
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  optionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  note: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

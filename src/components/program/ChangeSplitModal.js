import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { SPLIT_RECOMMENDATIONS, SPLITS } from '../../data/splits';
import { changeProgramSplit } from '../../services/storage';

const DAY_OPTIONS = [2, 3, 4, 5, 6];

export default function ChangeSplitModal({ visible, currentProgram, onClose, onChanged }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [days, setDays] = useState(currentProgram?.daysPerWeek || 4);
  const [splitType, setSplitType] = useState(currentProgram?.splitType || null);
  const [saving, setSaving] = useState(false);

  const availableSplits = SPLIT_RECOMMENDATIONS[days] || [];

  function handleDayChange(d) {
    setDays(d);
    const splits = SPLIT_RECOMMENDATIONS[d] || [];
    setSplitType(splits[0] || null);
  }

  async function handleApply() {
    if (!splitType) return;
    Alert.alert(
      'Change your split?',
      "This rebuilds your program with the new split. Your logged history is kept, but your current exercises will be replaced. You'll stay on the same week of your cycle.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change split',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await changeProgramSplit({ splitType, daysPerWeek: days });
              setSaving(false);
              onChanged?.();
            } catch (e) {
              console.error('changeProgramSplit error:', e);
              Alert.alert('Error', 'Could not change split. Please try again.');
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change split</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>How many days per week?</Text>
          <View style={styles.daysRow}>
            {DAY_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => handleDayChange(d)}
                activeOpacity={0.7}
                style={[styles.dayChip, days === d && styles.dayChipSelected]}
              >
                <Text style={[styles.dayChipText, days === d && styles.dayChipTextSelected]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Choose your split</Text>
          {availableSplits.map(type => {
            const split = SPLITS[type];
            if (!split) return null;
            const isSelected = splitType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setSplitType(type)}
                activeOpacity={0.75}
                style={[styles.splitCard, isSelected && styles.splitCardSelected]}
              >
                <View style={styles.splitCardHeader}>
                  <Text style={[styles.splitName, isSelected && styles.splitNameSelected]}>{split.name}</Text>
                  {isSelected && <View style={styles.checkDot} />}
                </View>
                <Text style={styles.splitDesc}>{split.description}</Text>
                <View style={styles.dayChipsPreview}>
                  {split.days.map((day, i) => (
                    <View key={i} style={styles.dayPreviewChip}>
                      <Text style={styles.dayPreviewText}>{day.dayLabel}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleApply}
            disabled={!splitType || saving}
            activeOpacity={0.8}
            style={[styles.applyBtn, (!splitType || saving) && styles.applyBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.applyBtnText}>Apply new split</Text>
            }
          </TouchableOpacity>
        </View>
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
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  daysRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  dayChip: {
    flex: 1, height: 52, borderRadius: borderRadius.md, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dayChipText: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textSecondary },
  dayChipTextSelected: { color: colors.primary },
  splitCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  splitCardSelected: { borderColor: colors.primary },
  splitCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  splitName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  splitNameSelected: { color: colors.primary },
  checkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  splitDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.sm },
  dayChipsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayPreviewChip: { backgroundColor: colors.gray100, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  dayPreviewText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  footer: {
    padding: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.md },
});

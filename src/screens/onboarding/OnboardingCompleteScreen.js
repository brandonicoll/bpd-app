import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { buildDefaultProgram, getCurrentBlockInfo } from '../../services/programEngine';
import { saveUserProfile, saveCurrentProgram } from '../../services/storage';
import { TRAINING_AGE_LABELS } from '../../data/splits';

export default function OnboardingCompleteScreen({ route }) {
  const { trainingAge, daysPerWeek, splitType, age } = route.params;
  const { completeOnboarding } = useApp();
  const [saving, setSaving] = useState(false);

  const program = buildDefaultProgram({ trainingAge, daysPerWeek, splitType, age });
  const block = getCurrentBlockInfo(1);

  async function handleStart() {
    setSaving(true);
    try {
      await saveUserProfile({ trainingAge, daysPerWeek, splitType, age, createdAt: new Date().toISOString() });
      await saveCurrentProgram(program);
      await completeOnboarding(program);
    } catch (e) {
      console.error('Error saving onboarding data:', e);
      setSaving(false);
    }
  }

  const summaryItems = [
    { label: 'Training age', value: TRAINING_AGE_LABELS[trainingAge] },
    { label: 'Age', value: `${age} years old` },
    { label: 'Days per week', value: `${daysPerWeek} days` },
    { label: 'Split', value: splitType.replace(/_/g, ' / ').replace(/\b\w/g, l => l.toUpperCase()) },
    { label: 'Starting block', value: `Block 1 — ${block.name}` },
    { label: 'Weeks 1–2 focus', value: `${block.targetRIR} RIR · ${block.tempo} tempo` },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.headline}>Your program is ready.</Text>
          <Text style={styles.subheadline}>
            Here's what we've set up based on your answers.
          </Text>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          {summaryItems.map((item, i) => (
            <View
              key={item.label}
              style={[styles.summaryRow, i < summaryItems.length - 1 && styles.summaryRowBorder]}
            >
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Block 1 explainer */}
        <View style={[styles.blockCard, { borderLeftColor: block.color }]}>
          <Text style={styles.blockTitle}>Start here: {block.name}</Text>
          <Text style={styles.blockDesc}>{block.description}</Text>
        </View>

        {/* Note about exercises */}
        <Text style={styles.note}>
          We've set up default exercises for each training day. You can swap any of them from the Program tab once you're in.
        </Text>

        <Button
          title="Let's go"
          onPress={handleStart}
          loading={saving}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  checkBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkIcon: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  headline: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  blockTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  blockDesc: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  note: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  cta: {
    marginTop: 'auto',
  },
});

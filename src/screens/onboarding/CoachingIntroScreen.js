import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { buildDefaultProgram } from '../../services/programEngine';
import { saveUserProfile, saveCurrentProgram } from '../../services/storage';

const POINTS = [
  {
    icon: 'stats-chart',
    title: 'Your insights, from day one',
    body: "Every session you log — volume, estimated 1RMs, streaks, trends — is yours to see at any time. That never sits behind anything.",
  },
  {
    icon: 'bulb',
    title: 'Coaching recommendations as you train',
    body: "Once you've logged enough sessions on a lift, we start surfacing real coaching calls — swap an exercise, add volume, back off intensity — based on how you're actually responding, not a generic plan.",
  },
];

export default function CoachingIntroScreen({ route }) {
  const { trainingAge, daysPerWeek, splitType, age } = route.params;
  const { completeOnboarding } = useApp();
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      const program = buildDefaultProgram({ trainingAge, daysPerWeek, splitType, age });
      await saveUserProfile({ trainingAge, daysPerWeek, splitType, age, createdAt: new Date().toISOString() });
      await saveCurrentProgram(program);
      await completeOnboarding(program);
    } catch (e) {
      console.error('Error saving onboarding data:', e);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerArea}>
          <Text style={styles.headline}>What to expect</Text>
          <Text style={styles.subheadline}>
            Two things happen from here — one right away, one as your data builds up.
          </Text>
        </View>

        {POINTS.map(point => (
          <View key={point.title} style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name={point.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{point.title}</Text>
              <Text style={styles.cardText}>{point.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Let's go"
          onPress={handleContinue}
          loading={saving}
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
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerArea: {
    marginBottom: spacing.xl,
  },
  headline: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subheadline: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import Button from '../../components/common/Button';

const MIN_AGE = 16;
const MAX_AGE = 90;

export default function AgeScreen({ navigation, route }) {
  const { trainingAge, daysPerWeek, splitType } = route.params;
  const [age, setAge] = useState(25);

  function decrement() { setAge(v => Math.max(MIN_AGE, v - 1)); }
  function increment() { setAge(v => Math.min(MAX_AGE, v + 1)); }

  const isOlder = age >= 50;

  return (
    <OnboardingLayout
      currentStep={4}
      totalSteps={4}
      onBack={() => navigation.goBack()}
    >
      <Text style={styles.question}>How old are you?</Text>
      <Text style={styles.hint}>
        Your age helps calibrate how quickly the app expects you to progress and recover between sessions.
      </Text>

      <View style={styles.stepperCard}>
        <TouchableOpacity
          onPress={decrement}
          disabled={age <= MIN_AGE}
          style={[styles.stepBtn, age <= MIN_AGE && styles.stepBtnDisabled]}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="remove" size={28} color={age <= MIN_AGE ? colors.textTertiary : colors.text} />
        </TouchableOpacity>

        <View style={styles.ageDisplay}>
          <Text style={styles.ageNumber}>{age}</Text>
          <Text style={styles.ageLabel}>years old</Text>
        </View>

        <TouchableOpacity
          onPress={increment}
          disabled={age >= MAX_AGE}
          style={[styles.stepBtn, age >= MAX_AGE && styles.stepBtnDisabled]}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="add" size={28} color={age >= MAX_AGE ? colors.textTertiary : colors.text} />
        </TouchableOpacity>
      </View>

      {isOlder && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            For 50+ lifters, the app uses a longer progression window and more lenient recovery thresholds — both backed by research on age-related adaptation rates.
          </Text>
        </View>
      )}

      <Button
        title="Build my program"
        onPress={() =>
          navigation.navigate('OnboardingComplete', {
            trainingAge,
            daysPerWeek,
            splitType,
            age,
          })
        }
        style={styles.cta}
      />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  question: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    lineHeight: 30,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xl,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    borderColor: colors.border,
    opacity: 0.4,
  },
  ageDisplay: {
    alignItems: 'center',
    minWidth: 90,
  },
  ageNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 70,
  },
  ageLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  cta: {
    marginTop: 'auto',
  },
});

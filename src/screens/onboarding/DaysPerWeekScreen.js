import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import Button from '../../components/common/Button';

const DAY_OPTIONS = [2, 3, 4, 5, 6];

const SPLIT_HINTS = {
  2: 'Full Body split recommended',
  3: 'Full Body split recommended',
  4: 'Upper / Lower split recommended',
  5: 'Push / Pull / Legs recommended',
  6: 'Push / Pull / Legs recommended',
};

export default function DaysPerWeekScreen({ navigation, route }) {
  const { trainingAge } = route.params;
  const [selected, setSelected] = useState(null);

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={4}
      onBack={() => navigation.goBack()}
    >
      <Text style={styles.question}>How many days per week can you commit to training?</Text>
      <Text style={styles.hint}>Be realistic — consistency beats frequency every time.</Text>

      <View style={styles.grid}>
        {DAY_OPTIONS.map(days => (
          <TouchableOpacity
            key={days}
            onPress={() => setSelected(days)}
            activeOpacity={0.75}
            style={[styles.dayBox, selected === days && styles.dayBoxSelected]}
          >
            <Text style={[styles.dayNumber, selected === days && styles.dayNumberSelected]}>
              {days}
            </Text>
            <Text style={[styles.dayLabel, selected === days && styles.dayLabelSelected]}>
              {days === 1 ? 'day' : 'days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected && (
        <View style={styles.hintBox}>
          <Text style={styles.hintIcon}>💡</Text>
          <Text style={styles.hintText}>{SPLIT_HINTS[selected]}</Text>
        </View>
      )}

      <Button
        title="Continue"
        disabled={!selected}
        onPress={() =>
          navigation.navigate('SplitSelection', {
            trainingAge,
            daysPerWeek: selected,
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
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dayBox: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dayNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  dayNumberSelected: {
    color: colors.primary,
  },
  dayLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dayLabelSelected: {
    color: colors.primary,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  hintIcon: {
    fontSize: 18,
  },
  hintText: {
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  cta: {
    marginTop: 'auto',
  },
});

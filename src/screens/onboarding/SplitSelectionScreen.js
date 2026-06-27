import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../../theme';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import OptionCard from '../../components/onboarding/OptionCard';
import Button from '../../components/common/Button';
import { SPLIT_TYPES, SPLITS, SPLIT_RECOMMENDATIONS } from '../../data/splits';

const SPLIT_DESCRIPTIONS = {
  [SPLIT_TYPES.FULL_BODY]: 'Train every muscle group each session. Maximum frequency per muscle — great for building consistency with fewer days.',
  [SPLIT_TYPES.UPPER_LOWER]: 'Alternate upper and lower body. A great balance of volume and recovery — the most popular structure for a reason.',
  [SPLIT_TYPES.LOWER_UPPER_WOMEN]: "Lower-body first split with extra glute and leg volume. Includes hip thrusts, abductor work, and cable kickbacks that the standard Upper/Lower doesn't have.",
  [SPLIT_TYPES.PPL_UPPER_LOWER]: 'Three dedicated Push, Pull, and Legs days — then an Upper and Lower day to hit everything twice. The best structure for 5 days per week.',
  [SPLIT_TYPES.PPL]: 'Full Push / Pull / Legs cycle twice per week. Maximum volume per muscle group — best for 6 days per week.',
};

export default function SplitSelectionScreen({ navigation, route }) {
  const { trainingAge, daysPerWeek } = route.params;

  const recommendedSplits = useMemo(() =>
    SPLIT_RECOMMENDATIONS[daysPerWeek] || [SPLIT_TYPES.FULL_BODY],
    [daysPerWeek]
  );

  const [selected, setSelected] = useState(recommendedSplits[0]);

  return (
    <OnboardingLayout
      currentStep={3}
      totalSteps={4}
      onBack={() => navigation.goBack()}
    >
      <Text style={styles.question}>Choose your split</Text>
      <Text style={styles.hint}>
        Based on {daysPerWeek} days per week, {recommendedSplits.length === 1 ? 'this is our recommendation' : 'these are your best options'}.
      </Text>

      <View style={styles.options}>
        {recommendedSplits.map(splitType => {
          const split = SPLITS[splitType];
          return (
            <OptionCard
              key={splitType}
              title={split.name}
              subtitle={SPLIT_DESCRIPTIONS[splitType]}
              selected={selected === splitType}
              onPress={() => setSelected(splitType)}
            />
          );
        })}
      </View>

      {/* Preview of the selected split days */}
      {selected && (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Your training days</Text>
          <View style={styles.daysRow}>
            {SPLITS[selected].days.slice(0, daysPerWeek).map((day, i) => (
              <View key={i} style={styles.dayChip}>
                <Text style={styles.dayChipText}>{day.dayLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Button
        title="Build my program"
        disabled={!selected}
        onPress={() =>
          navigation.navigate('Age', {
            trainingAge,
            daysPerWeek,
            splitType: selected,
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
  options: {
    marginBottom: spacing.md,
  },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dayChipText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  cta: {
    marginTop: 'auto',
  },
});

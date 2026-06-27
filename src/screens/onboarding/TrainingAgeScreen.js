import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../../theme';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import OptionCard from '../../components/onboarding/OptionCard';
import Button from '../../components/common/Button';
import { TRAINING_AGE } from '../../data/splits';

const OPTIONS = [
  {
    value: TRAINING_AGE.BEGINNER,
    title: 'Beginner',
    subtitle: '0–1 years of consistent training. Still learning movements and building base strength.',
  },
  {
    value: TRAINING_AGE.INTERMEDIATE,
    title: 'Intermediate',
    subtitle: '1–3 years of training. Form is solid, progress is slower than when you first started.',
  },
  {
    value: TRAINING_AGE.ADVANCED,
    title: 'Advanced',
    subtitle: '4+ years of serious training. Progress is hard-earned and happens over months.',
  },
];

export default function TrainingAgeScreen({ navigation }) {
  const [selected, setSelected] = useState(null);

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={4}
      onBack={() => navigation.goBack()}
    >
      <Text style={styles.question}>How long have you been training seriously?</Text>
      <Text style={styles.hint}>This sets how often the app expects you to progress.</Text>

      <View style={styles.options}>
        {OPTIONS.map(option => (
          <OptionCard
            key={option.value}
            title={option.title}
            subtitle={option.subtitle}
            selected={selected === option.value}
            onPress={() => setSelected(option.value)}
          />
        ))}
      </View>

      <Button
        title="Continue"
        disabled={!selected}
        onPress={() => navigation.navigate('DaysPerWeek', { trainingAge: selected })}
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
    flex: 1,
    marginBottom: spacing.lg,
  },
  cta: {
    marginTop: spacing.sm,
  },
});

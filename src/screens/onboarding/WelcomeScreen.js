import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import Button from '../../components/common/Button';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>BPF</Text>
          </View>
          <Text style={styles.logoSub}>Programming</Text>
        </View>

        {/* Main copy */}
        <View style={styles.copyArea}>
          <Text style={styles.headline}>Your program,{'\n'}built around{'\n'}your progress.</Text>
          <Text style={styles.body}>
            Based on the BPF programming framework — the same system used in 1:1 coaching. Tracks your lifts, detects what's working, and adjusts so you never plateau.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pillsRow}>
          {['Smart adjustments', '12-week blocks', 'Progress tracking'].map(label => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <Button
            title="Get started"
            onPress={() => navigation.navigate('TrainingAge')}
          />
          <Text style={styles.disclaimer}>
            Takes about 2 minutes. No account needed to start.
          </Text>
        </View>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'flex-start',
  },
  logoBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  copyArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.xl,
  },
  pill: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    gap: spacing.sm,
  },
  disclaimer: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

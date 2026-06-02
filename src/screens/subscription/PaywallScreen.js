import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { getCurrentOffering, purchasePackage, restorePurchases } from '../../services/purchases';
import { useSubscription } from '../../context/SubscriptionContext';

const FEATURES = [
  { emoji: '🏋️', title: 'Smart program builder', body: 'Full Body, Upper/Lower, PPL — all configurable to your schedule.' },
  { emoji: '📊', title: 'Session-by-session logging', body: 'Log every set, track weight, reps, and RPE. Previous session shown automatically.' },
  { emoji: '🧠', title: 'Adjustment Engine', body: 'The app detects plateaus, discomfort patterns, and volume issues — then tells you exactly what to fix.' },
  { emoji: '📈', title: '12-week block system', body: 'Technique → Intensity → Progression → Optimize. Repeat. The same framework used in BPF 1:1 coaching.' },
  { emoji: '📤', title: 'Shareable progress card', body: 'A weekly snapshot card to share on stories. Built-in BPF branding.' },
];

export default function PaywallScreen() {
  const { refresh } = useSubscription();
  const [offering, setOffering] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    async function load() {
      const o = await getCurrentOffering();
      setOffering(o);
      setIsLoading(false);
    }
    load();
  }, []);

  const annualPackage = offering?.annual || offering?.availablePackages?.[0] || null;
  const priceString = annualPackage?.product?.priceString || null;

  async function handleStartTrial() {
    if (!annualPackage) {
      Alert.alert('Not available', 'Could not load subscription options. Check your connection and try again.');
      return;
    }
    setPurchasing(true);
    const result = await purchasePackage(annualPackage);
    setPurchasing(false);

    if (result.success) {
      await refresh();
    } else if (!result.userCancelled) {
      Alert.alert('Purchase failed', result.error || 'Something went wrong. Please try again.');
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      await refresh();
    } else {
      Alert.alert('No purchases found', 'No previous subscription was found for this Apple ID.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>BPF</Text>
          </View>
          <Text style={styles.headline}>Programming that adapts to you.</Text>
          <Text style={styles.subheadline}>
            The same system behind BPF 1:1 coaching — now in your pocket.
          </Text>
        </View>

        {/* Trial callout */}
        <View style={styles.trialCard}>
          <Text style={styles.trialEmoji}>🎉</Text>
          <View style={styles.trialText}>
            <Text style={styles.trialTitle}>12 weeks free — no charge today</Text>
            <Text style={styles.trialBody}>
              Try the full app for 12 weeks at no cost. Cancel anytime before the trial ends and you won't be charged.
            </Text>
          </View>
        </View>

        {/* Feature list */}
        <Text style={styles.featuresLabel}>Everything included</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Annual plan</Text>
            {priceString && (
              <Text style={styles.pricingValue}>{priceString}/year</Text>
            )}
          </View>
          <Text style={styles.pricingNote}>
            12 weeks free, then billed annually. Cancel anytime.
          </Text>
        </View>

        {/* CTA */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleStartTrial}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaBtnText}>Start 12-week free trial</Text>
                {priceString && (
                  <Text style={styles.ctaBtnSub}>Then {priceString}/year · Cancel anytime</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Restore */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restore purchase</Text>
          )}
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legal}>
          Payment will be charged to your Apple ID account at the confirmation of purchase. Subscription automatically renews unless it is cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  headerArea: { alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.md },
  logoBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: spacing.lg,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  trialCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.success + '44',
  },
  trialEmoji: { fontSize: 26 },
  trialText: { flex: 1 },
  trialTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.success, marginBottom: 4 },
  trialBody: { fontSize: fontSizes.sm, color: colors.success, lineHeight: 20, opacity: 0.9 },

  featuresLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  featureEmoji: { fontSize: 22, marginTop: 1, width: 28, textAlign: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text, marginBottom: 2 },
  featureBody: { fontSize: fontSizes.xs, color: colors.textSecondary, lineHeight: 17 },

  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pricingLabel: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  pricingValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.primary },
  pricingNote: { fontSize: fontSizes.xs, color: colors.textSecondary },

  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: fontSizes.lg },
  ctaBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.xs, marginTop: 3 },

  restoreBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginBottom: spacing.md },
  restoreText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: '500' },

  legal: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 15,
  },
});

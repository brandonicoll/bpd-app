import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes } from '../../theme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../services/proAccess';

// Pro paywall, presented as a modal from locked features.
// RevenueCatUI.Paywall renders the paywall configured in your RevenueCat dashboard
// (template, copy, products) — no hardcoded UI needed here.
export default function PaywallScreen({ navigation }) {
  const { refresh } = useSubscription();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const closedRef = useRef(false);

  // The paywall can fire onDismiss right after a purchase too — only pop once.
  function close() {
    if (closedRef.current) return;
    closedRef.current = true;
    navigation.goBack();
  }

  async function handlePurchaseCompleted() {
    await refresh();
    close();
  }

  async function handleRestoreCompleted() {
    await refresh();
    close();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RevenueCatUI.Paywall
        options={{ displayCloseButton: true }}
        onDismiss={close}
        onPurchaseCompleted={handlePurchaseCompleted}
        onRestoreCompleted={handleRestoreCompleted}
        onPurchaseError={({ error }) => console.error('[RC] Purchase error:', error)}
        onRestoreError={({ error }) => console.error('[RC] Restore error:', error)}
      />
      <View style={[styles.legalRow, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_USE_URL)} hitSlop={8}>
          <Text style={[styles.legalLink, { color: colors.textTertiary }]}>Terms of Use</Text>
        </TouchableOpacity>
        <Text style={[styles.legalLink, { color: colors.textTertiary }]}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
          <Text style={[styles.legalLink, { color: colors.textTertiary }]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  legalRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: spacing.sm, paddingTop: spacing.sm,
  },
  legalLink: { fontSize: fontSizes.xs, fontWeight: '500' },
});

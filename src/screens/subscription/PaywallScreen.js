import React from 'react';
import { View, StyleSheet } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscription } from '../../context/SubscriptionContext';

// Full-screen paywall gate. Shown when the user has not yet subscribed.
// RevenueCatUI.Paywall renders the paywall configured in your RevenueCat dashboard
// (template, copy, products) — no hardcoded UI needed here.
export default function PaywallScreen() {
  const { refresh } = useSubscription();

  async function handlePurchaseCompleted({ customerInfo }) {
    await refresh();
  }

  async function handleRestoreCompleted({ customerInfo }) {
    await refresh();
  }

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseCompleted={handlePurchaseCompleted}
        onRestoreCompleted={handleRestoreCompleted}
        onPurchaseError={({ error }) => console.error('[RC] Purchase error:', error)}
        onRestoreError={({ error }) => console.error('[RC] Restore error:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useSubscription } from '../context/SubscriptionContext';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import PaywallScreen from '../screens/subscription/PaywallScreen';

export default function RootNavigator() {
  const { hasCompletedOnboarding, isLoading: appLoading } = useApp();
  const { isSubscribed, isLoading: subLoading } = useSubscription();

  const isLoading = appLoading || subLoading;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <NavigationContainer>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  }

  // __DEV__ guard ensures this can never take effect in a production/TestFlight/
  // App Store build even if EXPO_PUBLIC_SKIP_PAYWALL is left set to 'true' in .env.
  const skipPaywall = __DEV__ && process.env.EXPO_PUBLIC_SKIP_PAYWALL === 'true';
  if (!isSubscribed && !skipPaywall) {
    return <PaywallScreen />;
  }

  return (
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  );
}

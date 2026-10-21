import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { useSubscription } from '../context/SubscriptionContext';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import PaywallScreen from '../screens/subscription/PaywallScreen';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { hasCompletedOnboarding, isLoading: appLoading } = useApp();
  const { isLoading: subLoading } = useSubscription();

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

  // Tracking is free, so the app is always reachable. The paywall is a modal
  // opened from Pro features (Insights recommendations, Settings).
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

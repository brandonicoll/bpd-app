import 'react-native-get-random-values';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { initializePurchases } from './src/services/purchases';
import RootNavigator from './src/navigation';

// Initialize RevenueCat before the app renders
initializePurchases();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <SubscriptionProvider>
            <RootNavigator />
          </SubscriptionProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

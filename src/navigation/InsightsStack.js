import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InsightsScreen from '../screens/insights/InsightsScreen';
import AdjustmentDetailScreen from '../screens/insights/AdjustmentDetailScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function InsightsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdjustmentDetail" component={AdjustmentDetailScreen} options={{ title: 'Recommendation' }} />
    </Stack.Navigator>
  );
}

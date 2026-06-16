import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import HistoryScreen from '../screens/history/HistoryScreen';
import HistoryDetailScreen from '../screens/history/HistoryDetailScreen';

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: 'Workout' }} />
    </Stack.Navigator>
  );
}

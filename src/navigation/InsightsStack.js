import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InsightsScreen from '../screens/insights/InsightsScreen';
import AdjustmentDetailScreen from '../screens/insights/AdjustmentDetailScreen';
import ExerciseDetailScreen from '../screens/program/ExerciseDetailScreen';
import ProgressPhotosScreen from '../screens/progress/ProgressPhotosScreen';
import PhotoComparisonScreen from '../screens/progress/PhotoComparisonScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export default function InsightsStack() {
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
      }}
    >
      <Stack.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdjustmentDetail"
        component={AdjustmentDetailScreen}
        options={{ title: 'Recommendation' }}
      />
      <Stack.Screen
        name="ExerciseDetailFromInsights"
        component={ExerciseDetailScreen}
        options={{ title: 'Exercise detail' }}
      />
      <Stack.Screen
        name="ProgressPhotos"
        component={ProgressPhotosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PhotoComparison"
        component={PhotoComparisonScreen}
        options={{ title: 'Comparison' }}
      />
    </Stack.Navigator>
  );
}

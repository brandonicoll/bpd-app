import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProgramOverviewScreen from '../screens/program/ProgramOverviewScreen';
import ExerciseDetailScreen from '../screens/program/ExerciseDetailScreen';
import ExerciseLibraryScreen from '../screens/program/ExerciseLibraryScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export default function ProgramStack() {
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
        name="ProgramOverview"
        component={ProgramOverviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Exercise detail' }}
      />
      <Stack.Screen
        name="ExerciseLibrary"
        component={ExerciseLibraryScreen}
        options={{ title: 'Exercise library' }}
      />
    </Stack.Navigator>
  );
}

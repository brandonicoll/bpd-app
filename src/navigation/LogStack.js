import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StartWorkoutScreen from '../screens/log/StartWorkoutScreen';
import ActiveWorkoutScreen from '../screens/log/ActiveWorkoutScreen';
import SessionSummaryScreen from '../screens/log/SessionSummaryScreen';
import WorkoutHistoryScreen from '../screens/log/WorkoutHistoryScreen';

const Stack = createNativeStackNavigator();

export default function LogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StartWorkout" component={StartWorkoutScreen} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
    </Stack.Navigator>
  );
}

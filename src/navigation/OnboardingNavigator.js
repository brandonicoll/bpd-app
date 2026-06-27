import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import TrainingAgeScreen from '../screens/onboarding/TrainingAgeScreen';
import DaysPerWeekScreen from '../screens/onboarding/DaysPerWeekScreen';
import SplitSelectionScreen from '../screens/onboarding/SplitSelectionScreen';
import AgeScreen from '../screens/onboarding/AgeScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="TrainingAge" component={TrainingAgeScreen} />
      <Stack.Screen name="DaysPerWeek" component={DaysPerWeekScreen} />
      <Stack.Screen name="SplitSelection" component={SplitSelectionScreen} />
      <Stack.Screen name="Age" component={AgeScreen} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
    </Stack.Navigator>
  );
}

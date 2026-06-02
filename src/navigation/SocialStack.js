import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShareableCardScreen from '../screens/social/ShareableCardScreen';

const Stack = createNativeStackNavigator();

export default function SocialStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShareableCard" component={ShareableCardScreen} />
    </Stack.Navigator>
  );
}

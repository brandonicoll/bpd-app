import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import HomeStack from './HomeStack';
import ProgramStack from './ProgramStack';
import LogStack from './LogStack';
import InsightsStack from './InsightsStack';
import SocialStack from './SocialStack';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="ProgramTab"
        component={ProgramStack}
        options={{ title: 'Program', tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="LogTab"
        component={LogStack}
        options={{ title: 'Log', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="InsightsTab"
        component={InsightsStack}
        options={{ title: 'Insights', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="SocialTab"
        component={SocialStack}
        options={{ title: 'Share', tabBarIcon: ({ color, size }) => <Ionicons name="share-social-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

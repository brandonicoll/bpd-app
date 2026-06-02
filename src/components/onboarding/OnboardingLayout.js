import React from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

// totalSteps: how many steps in the flow (not counting welcome)
// currentStep: 1-indexed current step
export default function OnboardingLayout({
  children,
  currentStep,
  totalSteps = 3,
  onBack,
  showBack = true,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          {showBack && onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          {/* Progress dots */}
          {currentStep ? (
            <View style={styles.dotsRow}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i + 1 === currentStep && styles.dotActive,
                    i + 1 < currentStep && styles.dotDone,
                  ]}
                />
              ))}
            </View>
          ) : (
            <View />
          )}

          {/* Spacer to balance back button */}
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: colors.text,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.gray200,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  dotDone: {
    backgroundColor: colors.primaryLight,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
});

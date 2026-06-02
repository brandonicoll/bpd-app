import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, borderRadius, fontSizes, spacing } from '../../theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',   // 'primary' | 'secondary' | 'ghost'
  disabled = false,
  loading = false,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`], isDisabled && styles.disabledLabel]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.38,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  primaryLabel: {
    color: '#fff',
  },
  secondaryLabel: {
    color: colors.primary,
  },
  ghostLabel: {
    color: colors.textSecondary,
  },
  disabledLabel: {},
});

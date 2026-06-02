import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSizes } from '../../theme';

export default function OptionCard({ title, subtitle, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  titleSelected: {
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  subtitleSelected: {
    color: colors.primary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

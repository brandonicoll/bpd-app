import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export default function SectionHeader({ title, action }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});

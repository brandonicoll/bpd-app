import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';

export default function ReorderExercisesScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { exercises } = route.params;

  const [items, setItems] = useState(exercises);

  function handleDone() {
    route.params.onSave(items.map(e => e.exerciseId));
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reorder</Text>
        <TouchableOpacity
          onPress={handleDone}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Hold and drag a row to change the order</Text>

      <DraggableFlatList
        data={items}
        keyExtractor={item => item.exerciseId}
        onDragEnd={({ data }) => setItems(data)}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, drag, isActive, getIndex }) => {
          const index = (getIndex() ?? 0) + 1;
          return (
            <ScaleDecorator activeScale={1.02}>
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={80}
                activeOpacity={0.85}
                style={[styles.row, isActive && styles.rowActive]}
              >
                <View style={styles.indexBadge}>
                  <Text style={styles.indexText}>{index}</Text>
                </View>
                <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                <Ionicons name="reorder-three-outline" size={26} color={colors.textTertiary} />
              </TouchableOpacity>
            </ScaleDecorator>
          );
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  cancelText: { fontSize: fontSizes.md, color: colors.textSecondary, fontWeight: '500' },
  doneText: { fontSize: fontSizes.md, color: colors.primary, fontWeight: '700' },
  hint: {
    fontSize: fontSizes.xs, color: colors.textTertiary, fontWeight: '500',
    textAlign: 'center', paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  listContent: { padding: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowActive: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  indexBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  indexText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
  exerciseName: { flex: 1, fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
});

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, SafeAreaView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { exercises as builtInExercises } from '../../data/exercises';
import { getCustomExercises, deleteCustomExercise } from '../../services/storage';
import { JOINT_ACTION_LABELS } from '../../data/jointActionLabels';
import CustomExerciseModal from '../../components/common/CustomExerciseModal';

export default function ExerciseLibraryScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [query, setQuery] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  const loadCustom = useCallback(async () => {
    const custom = await getCustomExercises();
    setCustomExercises(custom);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustom();
    }, [loadCustom])
  );

  const allExercises = useMemo(() => [
    ...builtInExercises,
    ...customExercises,
  ], [customExercises]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allExercises;
    const q = query.toLowerCase();
    return allExercises.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.muscles?.some(m => m.toLowerCase().includes(q)) ||
      e.jointActions?.some(j =>
        (JOINT_ACTION_LABELS[j] || j).toLowerCase().includes(q)
      )
    );
  }, [query, allExercises]);

  async function handleSaved() {
    const updated = await getCustomExercises();
    setCustomExercises(updated);
    setModalVisible(false);
  }

  async function handleEditSaved() {
    const updated = await getCustomExercises();
    setCustomExercises(updated);
    setEditingExercise(null);
  }

  function handleDelete(exercise) {
    Alert.alert(
      `Delete "${exercise.name}"?`,
      'This will remove it from your custom library. Any split days currently using it will need to be updated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomExercise(exercise.id);
            setCustomExercises(prev => prev.filter(e => e.id !== exercise.id));
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Exercise library</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+ Custom</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises, muscles, or joint actions..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>

        {/* Custom exercises banner */}
        {customExercises.length > 0 && !query.trim() && (
          <View style={styles.customBanner}>
            <Text style={styles.customBannerText}>
              {customExercises.length} custom exercise{customExercises.length !== 1 ? 's' : ''} · scroll to the bottom to see them
            </Text>
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.exRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
              onLongPress={item.isCustom ? () => handleDelete(item) : undefined}
            >
              <View style={styles.exInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.exName}>{item.name}</Text>
                  {item.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.exMeta}>
                  {item.isCustom
                    ? item.jointActions.map(j => JOINT_ACTION_LABELS[j] || j).join(' · ')
                    : item.muscles?.slice(0, 3).map(m => m.replace(/_/g, ' ')).join(' · ')
                  }
                </Text>
              </View>

              <View style={styles.rightCol}>
                <View style={styles.repBadge}>
                  <Text style={styles.repBadgeText}>
                    {item.defaultRepRange[0]}–{item.defaultRepRange[1]}
                  </Text>
                </View>
                {item.isCustom && (
                  <View style={styles.customActions}>
                    <TouchableOpacity
                      onPress={() => setEditingExercise(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No exercises found for "{query}"</Text>
            </View>
          }
          ListFooterComponent={
            !query.trim() && customExercises.length === 0 ? (
              <TouchableOpacity
                style={styles.addPrompt}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.addPromptText}>+ Add your first custom exercise</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      <CustomExerciseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
      />

      <CustomExerciseModal
        visible={!!editingExercise}
        editExercise={editingExercise}
        onClose={() => setEditingExercise(null)}
        onSaved={handleEditSaved}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { fontSize: fontSizes.xs, fontWeight: '700', color: '#fff' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSizes.sm, color: colors.text },

  customBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  customBannerText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: '500',
  },

  listContent: { paddingBottom: spacing.xxl },

  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  exName: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
  customBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  customBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  exMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  repBadge: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  repBadgeText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
  customActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },

  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary },

  addPrompt: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  addPromptText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});

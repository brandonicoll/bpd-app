import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { getExerciseRPEGuidance } from '../../utils/workoutHelpers';
import Button from '../../components/common/Button';
import { getCurrentProgram } from '../../services/storage';
import { getCurrentBlockInfo } from '../../services/programEngine';
import { exercises as exerciseLibrary } from '../../data/exercises';

function getExercise(id) {
  return exerciseLibrary.find(e => e.id === id);
}

export default function StartWorkoutScreen({ navigation, route }) {
  const preselectedDay = route.params?.splitDay || null;

  const [program, setProgram] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const p = await getCurrentProgram();
        setProgram(p);
        if (preselectedDay) {
          const found = p?.splitDays.find(d => d.dayLabel === preselectedDay.dayLabel);
          setSelectedDay(found || p?.splitDays[0] || null);
        } else {
          setSelectedDay(p?.splitDays[0] || null);
        }
        setIsLoading(false);
      }
      load();
    }, [])
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const blockInfo = program ? getCurrentBlockInfo(program.currentBlock) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start workout</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Block reminder */}
          {blockInfo && (
            <View style={[styles.blockBanner, { borderLeftColor: blockInfo.color }]}>
              <Text style={styles.blockBannerText}>
                Block {blockInfo.blockNumber} · {blockInfo.name} · Target: {blockInfo.targetRIR} RIR · Tempo {blockInfo.tempo}
              </Text>
            </View>
          )}

          {/* Day selector */}
          <Text style={styles.sectionLabel}>Select training day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayRow}
          >
            {program?.splitDays.map(day => (
              <TouchableOpacity
                key={day.dayLabel}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.75}
                style={[
                  styles.dayChip,
                  selectedDay?.dayLabel === day.dayLabel && styles.dayChipSelected,
                ]}
              >
                <Text style={[
                  styles.dayChipText,
                  selectedDay?.dayLabel === day.dayLabel && styles.dayChipTextSelected,
                ]}>
                  {day.dayLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise list preview */}
          {selectedDay && (
            <>
              <Text style={styles.sectionLabel}>
                {selectedDay.exercises.length} exercises
              </Text>
              {selectedDay.exercises.map((exConfig, i) => {
                const ex = getExercise(exConfig.exerciseId);
                if (!ex) return null;
                const rpeGuidance = getExerciseRPEGuidance(exConfig, program?.currentBlock || 1);
                return (
                  <View key={exConfig.exerciseId} style={styles.exercisePreviewRow}>
                    <View style={styles.exerciseIndex}>
                      <Text style={styles.exerciseIndexText}>{i + 1}</Text>
                    </View>
                    <View style={styles.exercisePreviewInfo}>
                      <Text style={styles.exercisePreviewName}>{ex.name}</Text>
                      <Text style={styles.exercisePreviewRange}>
                        {exConfig.sets} sets · {exConfig.repRange[0]}–{exConfig.repRange[1]} reps
                        {' · '}
                        {rpeGuidance.mode === 'prescribed'
                          ? `RPE ${rpeGuidance.rpe}`
                          : `${rpeGuidance.label} (this block)`
                        }
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Start button */}
        <View style={styles.footer}>
          <Button
            title={`Begin ${selectedDay?.dayLabel || 'workout'}`}
            disabled={!selectedDay}
            onPress={() => navigation.navigate('ActiveWorkout', {
              splitDay: selectedDay,
              currentBlock: program?.currentBlock || 1,
            })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backArrow: { fontSize: 22, color: colors.text },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  blockBanner: {
    borderLeftWidth: 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
  },
  blockBannerText: { fontSize: fontSizes.xs, color: colors.textSecondary, lineHeight: 18 },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dayRow: { paddingBottom: spacing.xs, gap: spacing.sm },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dayChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary },
  dayChipTextSelected: { color: colors.primary },
  exercisePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exerciseIndexText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary },
  exercisePreviewInfo: { flex: 1 },
  exercisePreviewName: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
  exercisePreviewRange: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});

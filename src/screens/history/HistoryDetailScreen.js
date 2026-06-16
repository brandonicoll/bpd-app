import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { getAllSessions, getCustomExercises, deleteSession } from '../../services/storage';
import { exercises as builtInExercises } from '../../data/exercises';
import {
  calculateTotalVolume, getBestE1RM, getDurationMinutes, formatDuration, discomfortLabel,
} from '../../utils/workoutHelpers';
import { weekdayShort, dayOfMonth, monthYearLabel } from '../../utils/dateHelpers';

export default function HistoryDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { sessionId } = route.params;

  const [session, setSession] = useState(null);
  const [exerciseMap, setExerciseMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [all, custom] = await Promise.all([getAllSessions(), getCustomExercises()]);
      const found = all.find(s => s.id === sessionId);
      const map = {};
      [...builtInExercises, ...custom].forEach(e => { map[e.id] = e.name; });
      setExerciseMap(map);
      setSession(found);
      setLoading(false);
    }
    load();
  }, [sessionId]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete session?',
      'This workout will be permanently removed from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            navigation.goBack();
          },
        },
      ]
    );
  }, [sessionId, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleDelete, colors.danger]);

  if (loading || !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const unit = session.weightUnit || 'lbs';
  const duration = getDurationMinutes(session.startTime, session.endTime);
  const totalVolume = session.exercises.reduce((sum, ex) => sum + calculateTotalVolume(ex.sets), 0);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const dayName = session.splitDayDisplayName || session.splitDayLabel;
  const [month] = monthYearLabel(session.date).split(' ');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateText}>
          {weekdayShort(session.date)}, {month} {dayOfMonth(session.date)}
        </Text>
        <Text style={styles.title}>{dayName}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(totalVolume).toLocaleString()}{unit}</Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        {session.energyRating != null && (
          <View style={styles.energyChip}>
            <Text style={styles.energyText}>
              Session energy: {session.energyRating === 3 ? 'Great' : session.energyRating === 2 ? 'Okay' : 'Low'}
            </Text>
          </View>
        )}

        {session.exercises.map((ex, exIndex) => {
          const name = exerciseMap[ex.exerciseId] || ex.exerciseId;
          const bestE1RM = getBestE1RM(ex.sets);
          const discomfort = discomfortLabel(ex.discomfortRating);
          return (
            <View key={exIndex} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{name}</Text>
                {bestE1RM > 0 && (
                  <Text style={styles.exerciseE1RM}>{bestE1RM}{unit} e1RM</Text>
                )}
              </View>

              <View style={styles.setsTable}>
                <View style={styles.setHeaderRow}>
                  <Text style={[styles.setHeaderText, styles.setNumCol]}>Set</Text>
                  <Text style={styles.setHeaderText}>Weight</Text>
                  <Text style={styles.setHeaderText}>Reps</Text>
                  <Text style={styles.setHeaderText}>RPE</Text>
                </View>
                {ex.sets.map((set, i) => (
                  <View key={i} style={styles.setRow}>
                    <Text style={[styles.setCell, styles.setNum, styles.setNumCol]}>{i + 1}</Text>
                    <Text style={styles.setCell}>
                      {set.weight ? `${set.weight} ${unit}` : '–'}
                    </Text>
                    <Text style={styles.setCell}>{set.reps || '–'}</Text>
                    <Text style={styles.setCell}>{set.rpe || '–'}</Text>
                  </View>
                ))}
              </View>

              {discomfort && (
                <Text style={[styles.discomfortTag, { color: discomfort.color }]}>
                  {discomfort.label}
                </Text>
              )}
              {ex.notes ? (
                <Text style={styles.notesText}>"{ex.notes}"</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  dateText: { fontSize: fontSizes.sm, color: colors.textTertiary, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: fontSizes.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

  statsRow: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary },
  statDivider: { width: 0.5, height: 30, backgroundColor: colors.border },

  energyChip: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: spacing.md,
  },
  energyText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },

  exerciseCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exerciseName: { flex: 1, fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  exerciseE1RM: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm },

  setsTable: { marginBottom: spacing.xs },
  setHeaderRow: {
    flexDirection: 'row', paddingBottom: 6,
    borderBottomWidth: 0.5, borderBottomColor: colors.border, marginBottom: 4,
  },
  setHeaderText: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  setNumCol: { flex: 0, width: 32 },
  setRow: { flexDirection: 'row', paddingVertical: 5 },
  setCell: { flex: 1, fontSize: fontSizes.sm, color: colors.text },
  setNum: { color: colors.textSecondary, fontWeight: '600' },

  discomfortTag: { fontSize: fontSizes.xs, fontWeight: '700', marginTop: spacing.xs },
  notesText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs, lineHeight: 20 },
});

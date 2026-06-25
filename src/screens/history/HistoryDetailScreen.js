import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { getAllSessions, getCustomExercises, updateSession } from '../../services/storage';
import { exercises as builtInExercises } from '../../data/exercises';
import {
  calculateTotalVolume, getBestE1RM, getDurationMinutes, formatDuration, discomfortLabel,
} from '../../utils/workoutHelpers';
import { weekdayShort, dayOfMonth, monthYearLabel } from '../../utils/dateHelpers';

function toLocalHHMM(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function applyHHMM(originalIso, hhmmString) {
  const parts = hhmmString.match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return originalIso;
  const h = parseInt(parts[1], 10);
  const m = parseInt(parts[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return originalIso;
  const d = new Date(originalIso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function deepCloneSession(session) {
  return {
    ...session,
    exercises: session.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s })),
    })),
  };
}

export default function HistoryDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { sessionId } = route.params;

  const [session, setSession] = useState(null);
  const [exerciseMap, setExerciseMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editedSession, setEditedSession] = useState(null);
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');

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

  const handleSave = useCallback(async () => {
    if (!editedSession) return;
    const updatedStart = applyHHMM(editedSession.startTime, startText);
    const updatedEnd   = applyHHMM(editedSession.endTime,   endText);
    if (new Date(updatedEnd) <= new Date(updatedStart)) {
      Alert.alert('Invalid time', 'End time must be after start time.');
      return;
    }
    const saved = { ...editedSession, startTime: updatedStart, endTime: updatedEnd };
    await updateSession(sessionId, saved);
    setSession(saved);
    setIsEditing(false);
  }, [editedSession, startText, endText, sessionId]);

  const enterEdit = useCallback(() => {
    const clone = deepCloneSession(session);
    setEditedSession(clone);
    setStartText(toLocalHHMM(clone.startTime));
    setEndText(toLocalHHMM(clone.endTime));
    setIsEditing(true);
  }, [session]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedSession(null);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => isEditing ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: fontSizes.sm, color: colors.primary, fontWeight: '700' }}>Save</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={enterEdit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ fontSize: fontSizes.sm, color: colors.primary, fontWeight: '600' }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditing, handleSave, enterEdit, cancelEdit, colors]);

  function updateSet(exIndex, setIndex, field, value) {
    setEditedSession(prev => {
      const exercises = prev.exercises.map((ex, ei) => {
        if (ei !== exIndex) return ex;
        const sets = ex.sets.map((s, si) =>
          si === setIndex ? { ...s, [field]: value } : s
        );
        return { ...ex, sets };
      });
      return { ...prev, exercises };
    });
  }

  function addSet(exIndex) {
    setEditedSession(prev => {
      const exercises = prev.exercises.map((ex, ei) => {
        if (ei !== exIndex) return ex;
        const last = ex.sets[ex.sets.length - 1] || {};
        return { ...ex, sets: [...ex.sets, { weight: last.weight || '', reps: last.reps || '', rpe: last.rpe || null, completedAt: new Date().toISOString() }] };
      });
      return { ...prev, exercises };
    });
  }

  function deleteSet(exIndex, setIndex) {
    setEditedSession(prev => {
      const exercises = prev.exercises.map((ex, ei) => {
        if (ei !== exIndex) return ex;
        if (ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) };
      });
      return { ...prev, exercises };
    });
  }

  if (loading || !session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const display = isEditing ? editedSession : session;
  const unit = display.weightUnit || 'lbs';
  const duration = getDurationMinutes(
    isEditing ? applyHHMM(display.startTime, startText) : display.startTime,
    isEditing ? applyHHMM(display.endTime, endText) : display.endTime
  );
  const totalVolume = display.exercises.reduce((sum, ex) => sum + calculateTotalVolume(ex.sets), 0);
  const totalSets = display.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const dayName = display.splitDayDisplayName || display.splitDayLabel;
  const [month] = monthYearLabel(display.date).split(' ');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.dateText}>
          {weekdayShort(display.date)}, {month} {dayOfMonth(display.date)}
        </Text>
        <Text style={styles.title}>{dayName}</Text>

        {/* Time edit row */}
        {isEditing && (
          <View style={styles.timeEditCard}>
            <View style={styles.timeEditField}>
              <Text style={styles.timeEditLabel}>Started</Text>
              <TextInput
                style={styles.timeEditInput}
                value={startText}
                onChangeText={setStartText}
                placeholder="H:MM"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                maxLength={5}
              />
            </View>
            <View style={styles.timeEditDivider} />
            <View style={styles.timeEditField}>
              <Text style={styles.timeEditLabel}>Ended</Text>
              <TextInput
                style={styles.timeEditInput}
                value={endText}
                onChangeText={setEndText}
                placeholder="H:MM"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                maxLength={5}
              />
            </View>
          </View>
        )}

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

        {display.energyRating != null && (
          <View style={styles.energyChip}>
            <Text style={styles.energyText}>
              Session energy: {display.energyRating === 3 ? 'Great' : display.energyRating === 2 ? 'Okay' : 'Low'}
            </Text>
          </View>
        )}

        {display.exercises.map((ex, exIndex) => {
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
                  {isEditing && <View style={styles.deleteCol} />}
                </View>
                {ex.sets.map((set, i) => (
                  <View key={i} style={styles.setRow}>
                    <Text style={[styles.setCell, styles.setNum, styles.setNumCol]}>{i + 1}</Text>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={[styles.setCell, styles.setCellInput]}
                          value={String(set.weight || '')}
                          onChangeText={v => updateSet(exIndex, i, 'weight', v)}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          placeholder="–"
                          placeholderTextColor={colors.textTertiary}
                        />
                        <TextInput
                          style={[styles.setCell, styles.setCellInput]}
                          value={String(set.reps || '')}
                          onChangeText={v => updateSet(exIndex, i, 'reps', v)}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          placeholder="–"
                          placeholderTextColor={colors.textTertiary}
                        />
                        <TextInput
                          style={[styles.setCell, styles.setCellInput]}
                          value={set.rpe != null ? String(set.rpe) : ''}
                          onChangeText={v => updateSet(exIndex, i, 'rpe', v ? parseFloat(v) : null)}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          placeholder="–"
                          placeholderTextColor={colors.textTertiary}
                        />
                        <TouchableOpacity
                          style={styles.deleteCol}
                          onPress={() => deleteSet(exIndex, i)}
                          disabled={ex.sets.length <= 1}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={ex.sets.length > 1 ? colors.danger : colors.border}
                          />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.setCell}>
                          {set.weight ? `${set.weight} ${unit}` : '–'}
                        </Text>
                        <Text style={styles.setCell}>{set.reps || '–'}</Text>
                        <Text style={styles.setCell}>{set.rpe || '–'}</Text>
                      </>
                    )}
                  </View>
                ))}
              </View>

              {isEditing && (
                <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIndex)} activeOpacity={0.7}>
                  <Text style={styles.addSetText}>+ Add set</Text>
                </TouchableOpacity>
              )}

              {discomfort && !isEditing && (
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

  timeEditCard: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.primary, padding: spacing.md,
    marginBottom: spacing.md, alignItems: 'center',
  },
  timeEditField: { flex: 1, alignItems: 'center' },
  timeEditLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, fontWeight: '600', marginBottom: 4 },
  timeEditInput: {
    fontSize: fontSizes.lg, fontWeight: '700', color: colors.text,
    textAlign: 'center', minWidth: 60,
  },
  timeEditDivider: { width: 0.5, height: 36, backgroundColor: colors.border, marginHorizontal: spacing.md },

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
  deleteCol: { width: 24, alignItems: 'center', justifyContent: 'center' },
  setRow: { flexDirection: 'row', paddingVertical: 5, alignItems: 'center' },
  setCell: { flex: 1, fontSize: fontSizes.sm, color: colors.text },
  setCellInput: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: 2, marginRight: 4,
  },
  setNum: { color: colors.textSecondary, fontWeight: '600' },

  addSetBtn: {
    marginTop: spacing.xs, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    borderStyle: 'dashed', alignItems: 'center',
  },
  addSetText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.primary },

  discomfortTag: { fontSize: fontSizes.xs, fontWeight: '700', marginTop: spacing.xs },
  notesText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs, lineHeight: 20 },
});

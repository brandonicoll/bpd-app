import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { getAllSessions, getCustomExercises, deleteSession, getActivityLog } from '../../services/storage';
import { exercises as builtInExercises } from '../../data/exercises';
import { getActivityType, getActivityLabel, INTENSITY_OPTIONS } from '../../data/activities';
import ActivityLogModal from '../../components/common/ActivityLogModal';
import { groupSessionsByMonth, weekdayShort, dayOfMonth } from '../../utils/dateHelpers';
import { getDurationMinutes, formatDuration } from '../../utils/workoutHelpers';

export default function HistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [exerciseMap, setExerciseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState(null);

  const load = useCallback(async () => {
    const [allSessions, custom, activityLog] = await Promise.all([
      getAllSessions(), getCustomExercises(), getActivityLog(),
    ]);
    const map = {};
    [...builtInExercises, ...custom].forEach(e => { map[e.id] = e.name; });
    setExerciseMap(map);
    setSessions(allSessions);
    setActivities(activityLog);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  function handleDelete(session) {
    const dayName = session.splitDayDisplayName || session.splitDayLabel;
    Alert.alert(
      'Delete session?',
      `Remove ${dayName} from your history? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            setSessions(prev => prev.filter(s => s.id !== session.id));
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const grouped = groupSessionsByMonth([
    ...sessions.map(s => ({ ...s, kind: 'session' })),
    ...activities.map(a => ({ ...a, kind: 'activity' })),
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>History</Text>

        {sessions.length === 0 && activities.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyBody}>
              Once you complete a session it'll show up here. Your full training history, all in one place.
            </Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthLabel}>{group.label}</Text>
                <Text style={styles.monthCount}>
                  {monthCountLabel(group.sessions)}
                </Text>
              </View>

              {group.sessions.map(item => {
                if (item.kind === 'activity') {
                  const intensityLabel = INTENSITY_OPTIONS.find(o => o.value === item.intensity)?.label;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.card}
                      activeOpacity={0.7}
                      onPress={() => setEditingActivity(item)}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateBadgeDay}>{weekdayShort(item.date)}</Text>
                          <Text style={styles.dateBadgeNum}>{dayOfMonth(item.date)}</Text>
                        </View>
                        <View style={styles.cardBody}>
                          <View style={styles.cardTitleRow}>
                            <View style={styles.activityTitleRow}>
                              <Ionicons
                                name={getActivityType(item.type)?.icon || 'pulse'}
                                size={15}
                                color={colors.primary}
                              />
                              <Text style={styles.cardTitle} numberOfLines={1}>{getActivityLabel(item)}</Text>
                            </View>
                            <Text style={styles.cardDuration}>{formatDuration(item.durationMinutes)}</Text>
                          </View>
                          <Text style={styles.exerciseLine}>
                            Outside activity{intensityLabel ? ` · ${intensityLabel}` : ''}
                          </Text>
                          {!!item.note && (
                            <Text style={styles.exerciseLine} numberOfLines={2}>{item.note}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }

                const session = item;
                const duration = getDurationMinutes(session.startTime, session.endTime);
                const dayName = session.splitDayDisplayName || session.splitDayLabel;
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('HistoryDetail', { sessionId: session.id })}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeDay}>{weekdayShort(session.date)}</Text>
                        <Text style={styles.dateBadgeNum}>{dayOfMonth(session.date)}</Text>
                      </View>

                      <View style={styles.cardBody}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{dayName}</Text>
                          <Text style={styles.cardDuration}>{formatDuration(duration)}</Text>
                        </View>

                        {session.exercises.map((ex, i) => (
                          <Text key={i} style={styles.exerciseLine} numberOfLines={1}>
                            <Text style={styles.exerciseSets}>{ex.sets.length}× </Text>
                            {exerciseMap[ex.exerciseId] || ex.exerciseId}
                          </Text>
                        ))}
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDelete(session)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <ActivityLogModal
        visible={!!editingActivity}
        editActivity={editingActivity}
        onClose={() => setEditingActivity(null)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

function monthCountLabel(items) {
  const workouts = items.filter(i => i.kind === 'session').length;
  const outside = items.length - workouts;
  const parts = [];
  if (workouts) parts.push(`${workouts} workout${workouts !== 1 ? 's' : ''}`);
  if (outside) parts.push(`${outside} activit${outside !== 1 ? 'ies' : 'y'}`);
  return parts.join(' · ');
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: fontSizes.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },

  monthSection: { marginBottom: spacing.lg },
  monthHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthLabel: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textSecondary },
  monthCount: { fontSize: fontSizes.sm, color: colors.textTertiary, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  deleteBtn: { paddingTop: 2 },
  dateBadge: {
    width: 52, height: 52, borderRadius: borderRadius.md,
    backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dateBadgeDay: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textSecondary },
  dateBadgeNum: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginTop: -2 },
  cardBody: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: { flex: 1, fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  activityTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDuration: { fontSize: fontSizes.sm, color: colors.textTertiary, fontWeight: '600', marginLeft: spacing.sm },
  exerciseLine: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 },
  exerciseSets: { color: colors.text, fontWeight: '600' },
});

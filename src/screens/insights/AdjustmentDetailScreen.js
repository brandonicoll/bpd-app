import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { REC_TYPES, SEVERITY } from '../../services/adjustmentEngine';

export default function AdjustmentDetailScreen({ navigation, route }) {
  const { recommendation: rec } = route.params;

  const severityConfig = {
    [SEVERITY.URGENT]: { color: colors.danger,  label: 'Urgent',         iconName: 'alert-circle' },
    [SEVERITY.NORMAL]: { color: colors.warning, label: 'Recommendation', iconName: 'bulb' },
    [SEVERITY.INFO]:   { color: colors.primary, label: 'Info',           iconName: 'information-circle' },
  }[rec.severity] || { color: colors.border, label: 'Note', iconName: 'ellipse' };

  const typeLabel = {
    [REC_TYPES.DISCOMFORT_SWAP]:            'Joint discomfort → swap movement',
    [REC_TYPES.PROGRESS_STALL]:             'Progress stall detected',
    [REC_TYPES.NUTRITION_FLAG]:             'Lifestyle factor — nutrition',
    [REC_TYPES.FATIGUE_FLAG]:               'Lifestyle factor — systemic fatigue',
    [REC_TYPES.REDUCE_RPE]:                 'RPE too high → reduce effort',
    [REC_TYPES.LOWER_REP_RANGE]:            'Lower rep range for complex lift',
    [REC_TYPES.REDUCE_VOLUME]:              'Volume reduction needed',
    [REC_TYPES.INCREASE_VOLUME]:            'Volume increase — add a set',
    [REC_TYPES.REDUCE_JOINT_ACTION_VOLUME]: 'Joint action overloaded → reduce sets',
    [REC_TYPES.REORDER_EXERCISE]:           'Session order → prioritize this movement',
  }[rec.type] || 'Recommendation';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '22' }]}>
          <Ionicons name={severityConfig.iconName} size={13} color={severityConfig.color} />
          <Text style={[styles.severityText, { color: severityConfig.color }]}>  {severityConfig.label}</Text>
        </View>

        <Text style={styles.typeLabel}>{typeLabel}</Text>
        <Text style={styles.title}>{rec.title}</Text>

        {rec.dataPoint && (
          <View style={styles.dataCard}>
            <Text style={styles.dataLabel}>What triggered this</Text>
            <Text style={styles.dataValue}>{rec.dataPoint}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explanation</Text>
          <Text style={styles.sectionBody}>{rec.description}</Text>
        </View>

        {rec.guideRule && (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteLabel}>From the BPF Programming Guide</Text>
            <Text style={styles.quoteText}>"{rec.guideRule}"</Text>
          </View>
        )}

        {rec.type === REC_TYPES.DISCOMFORT_SWAP && rec.exerciseId && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProgramTab', { screen: 'ProgramOverview' })}
          >
            <Text style={styles.actionBtnText}>Go to program to swap exercise</Text>
          </TouchableOpacity>
        )}

        {rec.type === REC_TYPES.PROGRESS_STALL && rec.exerciseId && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProgramTab', {
              screen: 'ExerciseDetail',
              params: { exerciseId: rec.exerciseId, dayLabel: rec.dayLabel },
            })}
          >
            <Text style={styles.actionBtnText}>View exercise progress</Text>
          </TouchableOpacity>
        )}

        {rec.type === REC_TYPES.REORDER_EXERCISE && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProgramTab', { screen: 'ProgramOverview' })}
          >
            <Text style={styles.actionBtnText}>Go to Program to reorder</Text>
          </TouchableOpacity>
        )}

        {rec.type === REC_TYPES.REORDER_EXERCISE && (
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>How to reorder</Text>
            <Text style={styles.contextBody}>
              In the Program tab, each exercise has ↑ and ↓ buttons. Tap ↑ to move it up the order until it's at the top of the session. The change saves instantly.
            </Text>
            {rec.currentPosition !== undefined && (
              <Text style={styles.contextDetail}>
                Currently at position {(rec.currentPosition || 0) + 1} of {rec.totalExercises} — move it to position 1.
              </Text>
            )}
          </View>
        )}

        {rec.type === REC_TYPES.REDUCE_JOINT_ACTION_VOLUME && rec.affectedExercises && (
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>Exercises affected</Text>
            <Text style={styles.contextBody}>
              These exercises all contribute to your {rec.jointActionLabel} volume:
              {'\n'}{rec.affectedExercises.join(', ').replace(/_/g, ' ')}
              {'\n\n'}Remove 1 set from the highest-volume exercise first, then re-assess over 2–3 sessions before removing more.
            </Text>
          </View>
        )}

        {rec.type === REC_TYPES.INCREASE_VOLUME && (
          <View style={styles.volumeCard}>
            <Text style={styles.volumeTitle}>What to actually do</Text>
            <View style={styles.volumeStep}>
              <Text style={styles.volumeStepNum}>1</Text>
              <Text style={styles.volumeStepText}>
                Add 1 set to {rec.exerciseId?.replace(/_/g, ' ')} on your next session. Keep weight, reps, and RPE the same as usual.
              </Text>
            </View>
            <View style={styles.volumeStep}>
              <Text style={styles.volumeStepNum}>2</Text>
              <Text style={styles.volumeStepText}>
                Run it for 2–3 sessions. If your e1RM starts moving again, the extra set is working — keep it.
              </Text>
            </View>
            <View style={styles.volumeStep}>
              <Text style={styles.volumeStepNum}>3</Text>
              <Text style={styles.volumeStepText}>
                If fatigue increases or performance drops on other lifts, remove the extra set. That's the upper threshold.
              </Text>
            </View>
            <Text style={styles.volumeNote}>
              Only add volume to this movement — don't change anything else in the session at the same time.
            </Text>
          </View>
        )}

        <View style={styles.reminderCard}>
          <View style={styles.reminderTitleRow}>
            <Ionicons name="lock-closed" size={14} color={colors.text} />
            <Text style={styles.reminderTitle}> Remember</Text>
          </View>
          <Text style={styles.reminderBody}>
            Only act on these recommendations during your optimization window (weeks 11–12). If you're in the data collection phase (weeks 5–10), note these but wait to make changes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  severityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: spacing.sm },
  severityText: { fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  typeLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg, lineHeight: 28 },
  dataCard: { backgroundColor: colors.gray100, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  dataLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  dataValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
  section: { marginBottom: spacing.md },
  sectionLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  sectionBody: { fontSize: fontSizes.md, color: colors.text, lineHeight: 24 },
  quoteCard: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: spacing.md, marginBottom: spacing.md },
  quoteLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  quoteText: { fontSize: fontSizes.sm, color: colors.primaryDark, lineHeight: 22, fontStyle: 'italic' },
  actionBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.md },
  contextCard: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  contextTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  contextBody: { fontSize: fontSizes.sm, color: colors.primaryDark, lineHeight: 20, opacity: 0.9 },
  contextDetail: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
  reminderCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  reminderTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reminderTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text },
  reminderBody: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
  volumeCard: { backgroundColor: colors.successLight, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.success },
  volumeTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.success, marginBottom: spacing.md },
  volumeStep: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  volumeStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, color: '#fff', fontSize: fontSizes.xs, fontWeight: '700', textAlign: 'center', lineHeight: 22, flexShrink: 0 },
  volumeStepText: { flex: 1, fontSize: fontSizes.sm, color: colors.text, lineHeight: 20 },
  volumeNote: { fontSize: fontSizes.xs, color: colors.success, fontWeight: '500', marginTop: spacing.xs, lineHeight: 17, opacity: 0.85 },
});

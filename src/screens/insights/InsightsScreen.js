import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { runAdjustmentEngine, SEVERITY, REC_TYPES } from '../../services/adjustmentEngine';
import { getCurrentBlockInfo } from '../../services/programEngine';

function TrendIcon({ trend }) {
  const map = {
    progressing: { name: 'trending-up',     color: colors.success },
    plateau:     { name: 'remove',          color: colors.warning },
    declining:   { name: 'trending-down',   color: colors.danger },
    no_data:     { name: 'ellipse-outline', color: colors.textTertiary },
  };
  const { name, color } = map[trend] || map.no_data;
  return <Ionicons name={name} size={16} color={color} />;
}

function RecommendationCard({ rec, onPress }) {
  const config = {
    [SEVERITY.URGENT]: { borderColor: colors.danger,  bg: colors.dangerLight,  iconName: 'alert-circle',        iconColor: colors.danger },
    [SEVERITY.NORMAL]: { borderColor: colors.warning, bg: colors.warningLight, iconName: 'bulb',                iconColor: colors.warning },
    [SEVERITY.INFO]:   { borderColor: colors.primary, bg: colors.primaryLight, iconName: 'information-circle',  iconColor: colors.primary },
  }[rec.severity] || { borderColor: colors.border, bg: colors.surface, iconName: 'ellipse', iconColor: colors.textTertiary };

  return (
    <TouchableOpacity
      onPress={() => onPress(rec)}
      activeOpacity={0.75}
      style={[styles.recCard, { borderLeftColor: config.borderColor, backgroundColor: config.bg }]}
    >
      <View style={styles.recHeader}>
        <Ionicons name={config.iconName} size={18} color={config.iconColor} style={{ marginTop: 1 }} />
        <Text style={styles.recTitle} numberOfLines={2}>{rec.title}</Text>
      </View>
      <Text style={styles.recDescription} numberOfLines={3}>{rec.description}</Text>
      {rec.dataPoint && (
        <View style={styles.dataPointRow}>
          <Text style={styles.dataPointText}>{rec.dataPoint}</Text>
        </View>
      )}
      {rec.actionLabel && (
        <Text style={styles.recActionLabel}>{rec.actionLabel}</Text>
      )}
    </TouchableOpacity>
  );
}

function ExerciseTrendRow({ trend, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.trendRow}>
      <TrendIcon trend={trend.trend} />
      <View style={styles.trendInfo}>
        <Text style={styles.trendName} numberOfLines={1}>{trend.exerciseName}</Text>
        <Text style={styles.trendMeta}>
          {trend.dayLabel} · {trend.sessionsLogged} session{trend.sessionsLogged !== 1 ? 's' : ''}
          {trend.sessionsLogged >= 2 && trend.lastE1RM > 0 ? ` · ${trend.lastE1RM}kg est. 1RM` : ''}
        </Text>
      </View>
      {trend.discomfortFlag && (
        <Ionicons name="warning" size={14} color={colors.danger} />
      )}
      {trend.sessionsLogged >= 2 && trend.deltaPercent !== 0 && (
        <Text style={[styles.deltaText, trend.deltaPercent > 0 ? styles.deltaPositive : styles.deltaNegative]}>
          {trend.deltaPercent > 0 ? '+' : ''}{trend.deltaPercent}%
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function InsightsScreen({ navigation }) {
  const [engineData, setEngineData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await runAdjustmentEngine();
      setEngineData(data);
    } catch (e) {
      console.error('InsightsScreen load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!engineData?.program) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Complete onboarding to see insights.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { recommendations, exerciseTrends, jointActionMetrics, program, summary } = engineData;
  const blockInfo = getCurrentBlockInfo(program.currentBlock);
  const isOptimizationBlock = program.currentBlock === 4;
  const urgentRecs = recommendations.filter(r => r.severity === SEVERITY.URGENT);
  const normalRecs  = recommendations.filter(r => r.severity !== SEVERITY.URGENT);
  const weeksUntilBlock4 = isOptimizationBlock ? 0 : Math.max(0, 11 - program.currentWeek);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.screenTitle}>Insights</Text>

        {/* Block status */}
        <View style={[styles.blockCard, { borderLeftColor: blockInfo.color }]}>
          <View style={styles.blockCardRow}>
            <View>
              <Text style={styles.blockMeta}>Block {blockInfo.blockNumber} · Week {program.currentWeek} of 12</Text>
              <Text style={styles.blockName}>{blockInfo.name}</Text>
            </View>
            <View style={[styles.blockBadge, { backgroundColor: blockInfo.color + '22' }]}>
              <Ionicons
                name={isOptimizationBlock ? 'search' : 'lock-closed'}
                size={11}
                color={blockInfo.color}
              />
              <Text style={[styles.blockBadgeText, { color: blockInfo.color }]}>
                {isOptimizationBlock
                  ? '  Open'
                  : `  Wk ${weeksUntilBlock4 > 0 ? weeksUntilBlock4 + ' left' : '11'}`}
              </Text>
            </View>
          </View>
          {!isOptimizationBlock && (
            <Text style={styles.blockHint}>
              Full recommendations unlock at week 11. The engine is tracking your data silently — don't change anything until then.
            </Text>
          )}
        </View>

        {/* Summary stats — only once sessions exist */}
        {summary && summary.totalSessions > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{summary.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions logged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.success }]}>{summary.progressingCount}</Text>
              <Text style={styles.statLabel}>Progressing</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{summary.plateauCount}</Text>
              <Text style={styles.statLabel}>Plateau</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.textTertiary }]}>{summary.noDataCount}</Text>
              <Text style={styles.statLabel}>No data yet</Text>
            </View>
          </View>
        )}

        {/* Urgent recs — always shown */}
        {urgentRecs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Needs attention</Text>
            {urgentRecs.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} onPress={r => navigation.navigate('AdjustmentDetail', { recommendation: r })} />
            ))}
          </>
        )}

        {/* Block 4: full recommendations */}
        {isOptimizationBlock && normalRecs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Optimization recommendations</Text>
            {normalRecs.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} onPress={r => navigation.navigate('AdjustmentDetail', { recommendation: r })} />
            ))}
          </>
        )}

        {/* Block 4: all clear */}
        {isOptimizationBlock && recommendations.length === 0 && (
          <View style={styles.allGoodCard}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.allGoodTitle}>Program is well optimized</Text>
              <Text style={styles.allGoodSubtitle}>No issues detected. Keep running the current cycle.</Text>
            </View>
          </View>
        )}

        {/* Pre-block 4: tracking state */}
        {!isOptimizationBlock && urgentRecs.length === 0 && (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>
              Tracking {exerciseTrends.filter(t => t.sessionsLogged > 0).length} of {exerciseTrends.length} exercises
            </Text>
            <Text style={styles.trackingBody}>
              {summary?.totalSessions === 0
                ? 'Log your first session to start building your data. The engine will silently track discomfort, RPE trends, and progression as you go.'
                : 'The engine is collecting data. At week 11, it will analyse your progression, discomfort patterns, and volume — then surface specific recommendations for your optimization window.'
              }
            </Text>
            {weeksUntilBlock4 > 0 && summary?.totalSessions > 0 && (
              <Text style={styles.trackingCountdown}>
                {weeksUntilBlock4} week{weeksUntilBlock4 !== 1 ? 's' : ''} until optimization window opens
              </Text>
            )}
          </View>
        )}

        {/* Exercise progress */}
        {exerciseTrends.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Exercise progress</Text>
            <View style={styles.trendsCard}>
              <View style={styles.legendRow}>
                {[
                  { name: 'trending-up',    color: colors.success,      label: 'Progressing' },
                  { name: 'remove',         color: colors.warning,      label: 'Plateau' },
                  { name: 'trending-down',  color: colors.danger,       label: 'Declining' },
                  { name: 'ellipse-outline', color: colors.textTertiary, label: 'No data' },
                ].map(l => (
                  <React.Fragment key={l.label}>
                    <Ionicons name={l.name} size={13} color={l.color} />
                    <Text style={styles.legendLabel}>{l.label}</Text>
                  </React.Fragment>
                ))}
              </View>

              {exerciseTrends.map((trend, i) => (
                <View
                  key={trend.exerciseId}
                  style={i < exerciseTrends.length - 1 ? styles.trendRowBorder : null}
                >
                  <ExerciseTrendRow
                    trend={trend}
                    onPress={() => navigation.navigate('ProgramTab', {
                      screen: 'ExerciseDetail',
                      params: { exerciseId: trend.exerciseId, dayLabel: trend.dayLabel },
                    })}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Joint action overview */}
        {jointActionMetrics && Object.keys(jointActionMetrics).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Joint action overview</Text>
            <View style={styles.trendsCard}>
              <Text style={styles.jaSubheading}>
                How each movement pattern is trending across your program
              </Text>
              {Object.values(jointActionMetrics)
                .filter(ja => ja.dataCount > 0)
                .sort((a, b) => a.stallingCount - b.stallingCount)
                .map((ja, i, arr) => {
                  const statusIcon  = ja.isFullyProgressing ? '✓' : ja.isFullyStalling ? '✗' : ja.stallingCount > 0 ? '~' : '·';
                  const statusColor = ja.isFullyProgressing ? colors.success : ja.isFullyStalling ? colors.danger : ja.stallingCount > 0 ? colors.warning : colors.textTertiary;
                  return (
                    <View key={ja.jointAction} style={[styles.jaRow, i < arr.length - 1 && styles.jaRowBorder]}>
                      <Text style={[styles.jaStatusIcon, { color: statusColor }]}>{statusIcon}</Text>
                      <View style={styles.jaInfo}>
                        <Text style={styles.jaLabel}>{ja.label}</Text>
                        <Text style={styles.jaMeta}>
                          {ja.exercises.length} exercise{ja.exercises.length !== 1 ? 's' : ''} · {ja.totalWeeklySets} sets/wk
                          {ja.avgDelta !== null ? ` · avg ${ja.avgDelta >= 0 ? '+' : ''}${ja.avgDelta.toFixed(1)}%` : ''}
                        </Text>
                      </View>
                      <View style={[styles.jaBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.jaBadgeText, { color: statusColor }]}>
                          {ja.isFullyProgressing ? 'Good' : ja.isFullyStalling ? 'Stalling' : ja.stallingCount > 0 ? 'Mixed' : 'No data'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              }
              {Object.values(jointActionMetrics).filter(ja => ja.dataCount > 0).length === 0 && (
                <Text style={styles.jaEmptyText}>Log sessions to see how each movement pattern is trending.</Text>
              )}
            </View>
          </>
        )}

        {/* About card */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>About this engine</Text>
          <Text style={styles.guideBody}>
            Recommendations are generated using the rules from the BPF Programming Guide. The engine checks discomfort patterns, progress relative to your training age, RPE trends, and weekly nutrition data before suggesting changes. It never recommends changing exercises during the data collection phase (weeks 5–10).
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  screenTitle: { fontSize: fontSizes.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  blockCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  blockMeta: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  blockName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  blockBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.full, paddingHorizontal: 12, paddingVertical: 5 },
  blockBadgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
  blockHint: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  statDivider: { width: 0.5, height: 30, backgroundColor: colors.border },

  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  recCard: {
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  recTitle: { flex: 1, fontSize: fontSizes.md, fontWeight: '700', color: colors.text, lineHeight: 22 },
  recDescription: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  dataPointRow: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  dataPointText: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: '500' },
  recActionLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary },

  allGoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  allGoodTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.success },
  allGoodSubtitle: { fontSize: fontSizes.sm, color: colors.success, marginTop: 2, opacity: 0.85 },

  trackingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: 6 },
  trackingBody: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  trackingCountdown: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.primary },

  trendsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  legendLabel: { fontSize: 10, color: colors.textTertiary, marginRight: 8 },

  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: spacing.sm,
  },
  trendRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  trendInfo: { flex: 1 },
  trendName: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
  trendMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  deltaText: { fontSize: fontSizes.xs, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  deltaPositive: { color: colors.success },
  deltaNegative: { color: colors.danger },

  jaSubheading: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 17 },
  jaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: spacing.sm },
  jaRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  jaStatusIcon: { fontSize: 16, fontWeight: '700', width: 20, textAlign: 'center' },
  jaInfo: { flex: 1 },
  jaLabel: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text },
  jaMeta: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 1 },
  jaBadge: { borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  jaBadgeText: { fontSize: 10, fontWeight: '700' },
  jaEmptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.sm },

  guideCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  guideTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text, marginBottom: 6 },
  guideBody: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
});

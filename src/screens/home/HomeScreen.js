import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../theme';
import { useHomeData, getNextSession } from '../../hooks/useHomeData';
import ProgressRing from '../../components/common/ProgressRing';
import WeeklyCheckIn from '../../components/home/WeeklyCheckIn';
import { getGreeting, formatDateFriendly } from '../../utils/dateHelpers';
import { getCurrentBlockInfo } from '../../services/programEngine';

export default function HomeScreen({ navigation }) {
  const {
    program,
    blockInfo,
    sessionsThisWeek,
    streak,
    hasCheckedInThisWeek,
    isLoading,
    refresh,
  } = useHomeData();

  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>No program found. Please restart the app.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nextSession = getNextSession(program, sessionsThisWeek);
  const allDoneThisWeek = !nextSession;
  const currentStreak = streak?.currentStreak || 0;

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
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.date}>{formatDateFriendly()}</Text>
          </View>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>Week {program.currentWeek} of 12</Text>
          </View>
        </View>

        {/* ── Block status card ── */}
        {blockInfo && (
          <View style={[styles.blockCard, { borderLeftColor: blockInfo.color }]}>
            <View style={styles.blockCardTop}>
              <View>
                <Text style={styles.blockLabel}>Block {blockInfo.blockNumber} of 4</Text>
                <Text style={styles.blockName}>{blockInfo.name}</Text>
              </View>
              <View style={[styles.rirBadge, { backgroundColor: blockInfo.color + '20' }]}>
                <Text style={[styles.rirText, { color: blockInfo.color }]}>
                  {blockInfo.targetRIR} RIR target
                </Text>
              </View>
            </View>
            <Text style={styles.blockDesc} numberOfLines={2}>{blockInfo.description}</Text>
          </View>
        )}

        {/* ── Stats row: completion ring + streak ── */}
        <View style={styles.statsRow}>
          {/* Weekly completion card */}
          <View style={[styles.statCard, styles.statCardLarge]}>
            <Text style={styles.statLabel}>This week</Text>
            <View style={styles.ringContainer}>
              <ProgressRing
                completed={sessionsThisWeek.length}
                total={program.daysPerWeek}
                size={100}
                strokeWidth={8}
              />
            </View>
            <Text style={styles.statSubtext}>
              {allDoneThisWeek
                ? 'All sessions done 🎉'
                : `${program.daysPerWeek - sessionsThisWeek.length} sessions left`}
            </Text>
          </View>

          {/* Streak + split type */}
          <View style={styles.statColumn}>
            <View style={[styles.statCard, styles.streakCard]}>
              <Text style={styles.statLabel}>Streak</Text>
              <View style={styles.streakRow}>
                <Text style={styles.streakNumber}>{currentStreak}</Text>
                <Ionicons name="flame" size={22} color={colors.warning} />
              </View>
              <Text style={styles.statSubtext}>
                {currentStreak === 1 ? 'week' : 'weeks'}
              </Text>
            </View>

            <View style={[styles.statCard, styles.splitCard]}>
              <Text style={styles.statLabel}>Split</Text>
              <Text style={styles.splitName}>
                {program.splitType.replace(/_/g, '/').toUpperCase()}
              </Text>
              <Text style={styles.statSubtext}>{program.daysPerWeek} days/wk</Text>
            </View>
          </View>
        </View>

        {/* ── Next session card ── */}
        {allDoneThisWeek ? (
          <View style={styles.allDoneCard}>
            <Text style={styles.allDoneEmoji}>🎉</Text>
            <View style={styles.allDoneText}>
              <Text style={styles.allDoneTitle}>Week complete!</Text>
              <Text style={styles.allDoneSubtitle}>Rest up. New sessions start next week.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.nextSessionCard}>
            <View style={styles.nextSessionInfo}>
              <Text style={styles.nextSessionLabel}>Up next</Text>
              <Text style={styles.nextSessionName}>{nextSession?.dayLabel}</Text>
              <Text style={styles.nextSessionCount}>
                {nextSession?.exercises?.length || 0} exercises
              </Text>
            </View>
            <TouchableOpacity
              style={styles.startBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('LogTab', {
                screen: 'StartWorkout',
                params: { splitDay: nextSession },
              })}
            >
              <Text style={styles.startBtnText}>Start</Text>
              <Text style={styles.startBtnArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Nutrition check-in (if not done this week) ── */}
        {!hasCheckedInThisWeek && (
          <WeeklyCheckIn onComplete={refresh} />
        )}

        {/* ── Block tip card ── */}
        {blockInfo && (
          <View style={styles.tipCard}>
            <View style={styles.tipTitleRow}>
              <Ionicons name="bookmark" size={14} color={colors.textTertiary} style={styles.tipIcon} />
              <Text style={styles.tipTitle}>
                {blockInfo.blockNumber === 1 && 'Focus for weeks 1–2'}
                {blockInfo.blockNumber === 2 && 'Focus for weeks 3–4'}
                {blockInfo.blockNumber === 3 && 'Focus for weeks 5–10'}
                {blockInfo.blockNumber === 4 && 'Focus for weeks 11–12'}
              </Text>
            </View>
            <Text style={styles.tipBody}>{blockInfo.description}</Text>
            {blockInfo.blockNumber === 3 && (
              <View style={styles.tipWarningRow}>
                <Ionicons name="warning" size={14} color={colors.danger} style={styles.tipIcon} />
                <Text style={styles.tipWarning}>
                  Do not change exercises or volume during this block — consistent data is everything.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weekBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
  },

  // Block card
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  blockCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  blockLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  blockName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  rirBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rirText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  blockDesc: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statCardLarge: {
    flex: 1.4,
  },
  statColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  streakCard: {
    flex: 1,
  },
  splitCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  ringContainer: {
    marginVertical: spacing.xs,
  },
  statSubtext: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  streakFire: {
    fontSize: 22,
  },
  splitName: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },

  // Next session card
  nextSessionCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  nextSessionInfo: {
    flex: 1,
  },
  nextSessionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  nextSessionName: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  nextSessionCount: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  startBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSizes.md,
  },
  startBtnArrow: {
    color: '#fff',
    fontSize: fontSizes.md,
  },

  // All done card
  allDoneCard: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  allDoneEmoji: {
    fontSize: 32,
  },
  allDoneText: {
    flex: 1,
  },
  allDoneTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.success,
  },
  allDoneSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.success,
    marginTop: 2,
  },

  // Tip card
  tipCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tipIcon: {
    marginRight: 5,
  },
  tipTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  tipBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tipWarningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  tipWarning: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.danger,
    lineHeight: 20,
    fontWeight: '500',
  },
});

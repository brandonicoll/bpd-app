import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes, borderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { useWeightUnit } from '../../context/WeightUnitContext';
import { getAllSessions, getStreak, getCurrentProgram } from '../../services/storage';
import { getCurrentBlockInfo } from '../../services/programEngine';
import { exercises as exerciseLibrary } from '../../data/exercises';
import { isThisWeek } from '../../utils/dateHelpers';

const CARD_WIDTH = 340;
const CARD_HEIGHT = 520;

function getTopLiftThisWeek(sessions) {
  let bestE1RM = 0;
  let bestName = null;
  for (const session of sessions) {
    for (const ex of session.exercises || []) {
      const exDef = exerciseLibrary.find(e => e.id === ex.exerciseId);
      for (const set of ex.sets || []) {
        const w = parseFloat(set.weight) || 0;
        const r = parseInt(set.reps) || 0;
        if (w && r) {
          const e1rm = Math.round(w * (1 + r / 30));
          if (e1rm > bestE1RM) {
            bestE1RM = e1rm;
            bestName = exDef?.name || null;
          }
        }
      }
    }
  }
  return { exerciseName: bestName, e1RM: bestE1RM };
}

function ProgressCard({ data }) {
  const { colors } = useTheme();
  const { weightUnit } = useWeightUnit();
  const card = makeCardStyles(colors);
  const { program, blockInfo, sessionsThisWeek, streak, topLift } = data;
  const completionRatio = program ? Math.min(sessionsThisWeek / program.daysPerWeek, 1) : 0;

  return (
    <View style={card.container}>
      <View style={card.header}>
        <View style={card.logoBadge}>
          <Text style={card.logoText}>BPF</Text>
        </View>
        <View>
          <Text style={card.appName}>Programming App</Text>
          <Text style={card.appTagline}>by BPF Coaching</Text>
        </View>
      </View>

      <View style={card.divider} />

      {blockInfo && program && (
        <View style={card.blockRow}>
          <Text style={card.blockWeek}>Week {program.currentWeek} of 12</Text>
          <View style={card.blockBadge}>
            <Text style={card.blockBadgeText}>Block {blockInfo.blockNumber}</Text>
          </View>
        </View>
      )}
      {blockInfo && (
        <Text style={card.blockName}>{blockInfo.name}</Text>
      )}

      <View style={card.sessionSection}>
        <View style={card.sessionNumbers}>
          <Text style={card.sessionCount}>{sessionsThisWeek}</Text>
          <Text style={card.sessionDivider}>/</Text>
          <Text style={card.sessionTotal}>{program?.daysPerWeek || '–'}</Text>
        </View>
        <Text style={card.sessionLabel}>sessions this week</Text>
        <View style={card.progressTrack}>
          <View style={[card.progressFill, { width: `${Math.min(completionRatio * 100, 100)}%` }]} />
        </View>
      </View>

      <View style={card.thinDivider} />

      <View style={card.statRow}>
        <Ionicons name="flame" size={20} color="#EF9F27" />
        <Text style={card.statText}>{streak?.currentStreak || 0}-week streak</Text>
      </View>

      {topLift.exerciseName && topLift.e1RM > 0 && (
        <>
          <View style={card.thinDivider} />
          <View style={card.liftSection}>
            <Text style={card.liftLabel}>Top lift this week</Text>
            <Text style={card.liftName}>{topLift.exerciseName}</Text>
            <Text style={card.liftE1RM}>{topLift.e1RM}{weightUnit} est. 1RM</Text>
          </View>
        </>
      )}

      <View style={card.footer}>
        <Text style={card.footerTagline}>Built with BPF</Text>
      </View>
    </View>
  );
}

const makeCardStyles = (colors) => StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 28,
    justifyContent: 'space-between',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  appName: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  appTagline: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.primary, opacity: 0.6 },
  blockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockWeek: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  blockBadge: {
    backgroundColor: colors.primary + '33',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '66',
  },
  blockBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  blockName: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  sessionSection: { alignItems: 'center' },
  sessionNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  sessionCount: { color: '#ffffff', fontSize: 72, fontWeight: '800', lineHeight: 80 },
  sessionDivider: { color: 'rgba(255,255,255,0.3)', fontSize: 40, fontWeight: '300' },
  sessionTotal: { color: 'rgba(255,255,255,0.5)', fontSize: 40, fontWeight: '700' },
  sessionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2, letterSpacing: 0.5 },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  thinDivider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  liftSection: {},
  liftLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  liftName: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  liftE1RM: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  footerTagline: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
});

export default function ShareableCardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const viewShotRef = useRef(null);
  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    async function load() {
      const [program, allSessions, streak] = await Promise.all([
        getCurrentProgram(),
        getAllSessions(),
        getStreak(),
      ]);

      const sessionsThisWeek = allSessions.filter(s => isThisWeek(s.date));

      setCardData({
        program,
        blockInfo: program ? getCurrentBlockInfo(program.currentBlock) : null,
        sessionsThisWeek: sessionsThisWeek.length,
        streak,
        topLift: getTopLiftThisWeek(sessionsThisWeek),
      });
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleShare() {
    if (!viewShotRef.current) return;
    setSharing(true);
    try {
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your BPF progress',
        });
      } else {
        Alert.alert('Sharing not available on this device');
      }
    } catch (e) {
      console.error('Share error:', e);
      Alert.alert('Could not share. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress card</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1.0 }}
              style={styles.cardWrapper}
            >
              {cardData && <ProgressCard data={cardData} />}
            </ViewShot>

            <Text style={styles.hint}>
              Tap share to save or post this to your story.
            </Text>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              disabled={sharing}
              activeOpacity={0.8}
            >
              {sharing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.shareBtnText}> Share card</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backArrow: { fontSize: 22, color: colors.text, width: 32 },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: spacing.xl,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  shareBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 52,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.md },
});

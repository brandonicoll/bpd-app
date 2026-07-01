import {
  getCurrentProgram,
  getAllSessions,
  getAllCheckIns,
  getCustomExercises,
} from './storage';
import { exercises as exerciseLibrary } from '../data/exercises';

let _customExercises = [];
function findExercise(id) {
  return exerciseLibrary.find(e => e.id === id) || _customExercises.find(e => e.id === id);
}
import { PLATEAU_THRESHOLDS, TRAINING_AGE } from '../data/splits';
import { JOINT_ACTION_LABELS, JOINT_ACTIONS_DATA } from '../data/jointActionLabels';
import { getWeekStart } from '../utils/dateHelpers';

// ─── Recommendation types ─────────────────────────────────────────────────────
export const REC_TYPES = {
  DISCOMFORT_SWAP:            'DISCOMFORT_SWAP',
  PROGRESS_STALL:             'PROGRESS_STALL',
  NUTRITION_FLAG:             'NUTRITION_FLAG',
  FATIGUE_FLAG:               'FATIGUE_FLAG',
  REDUCE_RPE:                 'REDUCE_RPE',
  LOWER_REP_RANGE:            'LOWER_REP_RANGE',
  REDUCE_VOLUME:              'REDUCE_VOLUME',
  INCREASE_VOLUME:            'INCREASE_VOLUME',
  REDUCE_JOINT_ACTION_VOLUME: 'REDUCE_JOINT_ACTION_VOLUME',
  REORDER_EXERCISE:           'REORDER_EXERCISE',
  DELOAD_SIGNAL:              'DELOAD_SIGNAL',
  PUSH_PULL_IMBALANCE:        'PUSH_PULL_IMBALANCE',
  SLEEP_FLAG:                 'SLEEP_FLAG',
};

export const SEVERITY = {
  URGENT: 'urgent',
  NORMAL: 'normal',
  INFO:   'info',
};

// Volume thresholds scale with training age (sets/week per joint action)
const JOINT_ACTION_VOLUME_THRESHOLDS = {
  [TRAINING_AGE.BEGINNER]:     6,
  [TRAINING_AGE.INTERMEDIATE]: 8,
  [TRAINING_AGE.ADVANCED]:     12,
};

// Baseline inter-session recovery threshold (second session vs first session e1RM ratio)
const BASE_RECOVERY_THRESHOLD = 0.97;

// Push and pull joint actions for balance check
const PUSH_JOINT_ACTIONS = ['horizontal_shoulder_adduction', 'shoulder_abduction', 'shoulder_flexion'];
const PULL_JOINT_ACTIONS = ['horizontal_humeral_abduction', 'shoulder_adduction'];

const MIN_INTER_SESSION_COMPARISONS = 3;

// ─── Age-adjusted helpers ─────────────────────────────────────────────────────
function getPlateauThreshold(trainingAge, age) {
  const base = PLATEAU_THRESHOLDS[trainingAge] || 4;
  // 50+ lifters adapt slower — extend the window before flagging a stall
  return (age != null && age >= 50) ? base + 2 : base;
}

function getRecoveryThreshold(age) {
  // 50+ lifters have longer inter-session recovery — only flag at 8% drop, not 3%
  return (age != null && age >= 50) ? 0.92 : BASE_RECOVERY_THRESHOLD;
}

// ─── Sleep quality helpers ────────────────────────────────────────────────────
// sleepQuality: 3 = Good, 2 = OK, 1 = Poor, null = not rated (treated as normal)
function getSleepWeight(session) {
  const sq = session.sleepQuality;
  if (sq == null) return 1.0;
  if (sq === 1)   return 0;    // poor sleep — excluded from stall counter
  if (sq === 2)   return 0.5;  // ok sleep — half weight
  return 1.0;                  // good sleep
}

function isPoorSleep(session) {
  return session.sleepQuality === 1;
}

// ─── Helper: group sessions by week ──────────────────────────────────────────
function groupSessionsByWeek(allSessions) {
  const weeks = {};
  for (const session of allSessions) {
    const weekStart = getWeekStart(new Date(session.date)).toISOString().split('T')[0];
    if (!weeks[weekStart]) weeks[weekStart] = [];
    weeks[weekStart].push(session);
  }
  return weeks;
}

// ─── Helper: avg RPE for an exercise across last N sessions ──────────────────
function getAvgRPEForExercise(exerciseId, allSessions, lastN = 4) {
  const exerciseSessions = allSessions
    .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, lastN);

  const allRPEs = exerciseSessions.flatMap(s => {
    const exData = s.exercises.find(e => e.exerciseId === exerciseId);
    return exData?.sets?.map(set => set.rpe).filter(rpe => rpe != null) || [];
  });

  if (!allRPEs.length) return null;
  return allRPEs.reduce((a, b) => a + b, 0) / allRPEs.length;
}

// ─── Helper: avg energy from session energy ratings ──────────────────────────
function getAvgEnergyFromSessions(allSessions, lastN = 8) {
  const recentRated = allSessions
    .filter(s => s.energyRating != null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, lastN);

  if (recentRated.length < 3) return null;
  return recentRated.reduce((sum, s) => sum + s.energyRating, 0) / recentRated.length;
}

// ─── Helper: volume load (sets × reps × weight) for one exercise in a session ─
function getSessionVolumeLoad(exerciseId, session) {
  const exData = session.exercises?.find(e => e.exerciseId === exerciseId);
  if (!exData?.sets?.length) return 0;
  return exData.sets.reduce((sum, s) => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps) || 0;
    return sum + w * r;
  }, 0);
}

// Returns { deltaPercent, firstVL, lastVL } or null if insufficient data
function getVolumeLoadTrend(exerciseId, allSessions, lastN) {
  const sessions = allSessions
    .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sessions.length < 2) return null;
  const window = sessions.slice(-lastN);
  const firstVL = getSessionVolumeLoad(exerciseId, window[0]);
  const lastVL  = getSessionVolumeLoad(exerciseId, window[window.length - 1]);
  if (!firstVL) return null;
  return {
    deltaPercent: ((lastVL - firstVL) / firstVL) * 100,
    firstVL: Math.round(firstVL),
    lastVL:  Math.round(lastVL),
  };
}

// ─── Joint action metrics ─────────────────────────────────────────────────────
export function calculateJointActionMetrics(program, exerciseTrends, allSessions = []) {
  const map = {};
  const seenInProgram = new Set();

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exDef = findExercise(exConfig.exerciseId);
      if (!exDef) continue;
      seenInProgram.add(exConfig.exerciseId);

      for (const jointAction of exDef.jointActions) {
        if (!map[jointAction]) {
          map[jointAction] = {
            jointAction,
            label: JOINT_ACTION_LABELS[jointAction] || jointAction,
            exercises: [],
            totalWeeklySets: 0,
            dayLabels: [],
          };
        }

        const entry = map[jointAction];
        // Accessory actions contribute half the fatigue load of primary joint actions
        const setWeight = JOINT_ACTIONS_DATA[jointAction]?.isAccessory ? 0.5 : 1;
        if (!entry.exercises.includes(exConfig.exerciseId)) {
          entry.exercises.push(exConfig.exerciseId);
          entry.totalWeeklySets += exConfig.sets * setWeight;
        }
        if (!entry.dayLabels.includes(splitDay.dayLabel)) {
          entry.dayLabels.push(splitDay.dayLabel);
        }
      }
    }
  }

  // Also account for exercises in sessions but not currently in the program
  for (const trend of exerciseTrends) {
    if (seenInProgram.has(trend.exerciseId) || trend.sessionsLogged === 0) continue;
    const exDef = findExercise(trend.exerciseId);
    if (!exDef?.jointActions?.length) continue;

    const recentSessions = allSessions
      .filter(s => s.exercises?.some(e => e.exerciseId === trend.exerciseId))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
    const avgSets = recentSessions.length
      ? recentSessions.reduce((sum, s) => {
          const ex = s.exercises.find(e => e.exerciseId === trend.exerciseId);
          return sum + (ex?.sets?.length || 0);
        }, 0) / recentSessions.length
      : 0;

    for (const jointAction of exDef.jointActions) {
      if (!map[jointAction]) {
        map[jointAction] = {
          jointAction,
          label: JOINT_ACTION_LABELS[jointAction] || jointAction,
          exercises: [],
          totalWeeklySets: 0,
          dayLabels: [],
        };
      }
      const setWeight = JOINT_ACTIONS_DATA[jointAction]?.isAccessory ? 0.5 : 1;
      const entry = map[jointAction];
      if (!entry.exercises.includes(trend.exerciseId)) {
        entry.exercises.push(trend.exerciseId);
        entry.totalWeeklySets += Math.round(avgSets * setWeight);
      }
      if (trend.dayLabel && !entry.dayLabels.includes(trend.dayLabel)) {
        entry.dayLabels.push(trend.dayLabel);
      }
    }
  }

  for (const data of Object.values(map)) {
    const relatedTrends = exerciseTrends.filter(t => data.exercises.includes(t.exerciseId));
    const withData      = relatedTrends.filter(t => t.trend !== 'no_data');

    data.progressingCount   = withData.filter(t => t.trend === 'progressing').length;
    data.stallingCount      = withData.filter(t => t.trend === 'plateau' || t.trend === 'declining').length;
    data.dataCount          = withData.length;
    data.avgDelta           = withData.length
      ? withData.reduce((sum, t) => sum + t.deltaPercent, 0) / withData.length
      : null;
    data.isFullyProgressing = data.stallingCount === 0 && data.dataCount > 0;
    data.isFullyStalling    = data.progressingCount === 0 && data.stallingCount > 0 && data.dataCount > 0;
  }

  return map;
}

// ─── Inter-session recovery detection ────────────────────────────────────────
export function detectInterSessionRecovery(jointAction, program, allSessions, recoveryThreshold = BASE_RECOVERY_THRESHOLD) {
  const daysWithAction = program.splitDays.filter(day =>
    day.exercises.some(exConfig => {
      const exDef = findExercise(exConfig.exerciseId);
      return exDef?.jointActions.includes(jointAction);
    })
  );

  if (daysWithAction.length < 2) return null;

  const sessionsByWeek = groupSessionsByWeek(allSessions);
  const comparisons    = [];

  for (const weekSessions of Object.values(sessionsByWeek)) {
    const relevantSessions = weekSessions
      .filter(s => daysWithAction.some(d => d.dayLabel === s.splitDayLabel))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (relevantSessions.length < 2) continue;

    const firstSession  = relevantSessions[0];
    const secondSession = relevantSessions[1];

    // Poor sleep in the second session explains the performance drop — not a real recovery issue.
    if (isPoorSleep(secondSession)) continue;

    for (const exData of (firstSession.exercises || [])) {
      const exDef = findExercise(exData.exerciseId);
      if (!exDef?.jointActions.includes(jointAction)) continue;

      const secondExData = (secondSession.exercises || [])
        .find(e => e.exerciseId === exData.exerciseId);
      if (!secondExData) continue;

      const getE1RM = (sets) => {
        if (!sets?.length) return 0;
        return Math.max(...sets.map(s => {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps)     || 0;
          return w && r ? Math.round(w * (1 + r / 30)) : 0;
        }));
      };

      const firstE1RM  = getE1RM(exData.sets);
      const secondE1RM = getE1RM(secondExData.sets);

      if (firstE1RM > 0 && secondE1RM > 0) {
        comparisons.push({ ratio: secondE1RM / firstE1RM, exerciseId: exData.exerciseId });
      }
    }
  }

  if (comparisons.length < MIN_INTER_SESSION_COMPARISONS) return null;

  const avgRatio = comparisons.reduce((sum, c) => sum + c.ratio, 0) / comparisons.length;

  return {
    hasRecoveryIssue: avgRatio < recoveryThreshold,
    avgRatio: Math.round(avgRatio * 1000) / 1000,
    sampleSize: comparisons.length,
  };
}

// ─── Rule 1: Discomfort ───────────────────────────────────────────────────────
function checkDiscomfortRules(program, allSessions) {
  const recommendations = [];

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exerciseId = exConfig.exerciseId;
      const exDef      = findExercise(exerciseId);
      if (!exDef) continue;

      const exerciseSessions = allSessions
        .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      if (exerciseSessions.length < 2) continue;

      const ratings = exerciseSessions
        .map(s => s.exercises.find(e => e.exerciseId === exerciseId)?.discomfortRating)
        .filter(r => r != null && r > 0);

      if (ratings.length < 2) continue;

      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      if (avg >= 7) {
        recommendations.push({
          id: `discomfort-${exerciseId}`,
          type: REC_TYPES.DISCOMFORT_SWAP,
          severity: SEVERITY.URGENT,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Swap ${exDef.name}`,
          description: `You've reported joint pain or significant discomfort on this movement in ${ratings.length} of your last ${exerciseSessions.length} sessions (avg discomfort: ${avg.toFixed(1)}/10). The guide recommends swapping to a more stable variation that trains the same joint action.`,
          guideRule: 'For any lifts that feel uncomfortable on the joints, or lack stability/coordination, consider swapping these movements for more stable variations.',
          actionLabel: 'View swap options',
          actionType: 'swap',
          dataPoint: `Avg discomfort: ${avg.toFixed(1)}/10 over ${ratings.length} sessions`,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return recommendations;
}

// ─── Rule: Nutrition flag ─────────────────────────────────────────────────────
function checkNutritionFlag(checkIns) {
  const recent = [...checkIns]
    .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
    .slice(0, 3);

  if (recent.length < 2) return null;

  const avg = recent.reduce((sum, c) => sum + (c.nutritionRating || 2), 0) / recent.length;

  if (avg < 1.8) {
    return {
      id: 'nutrition-flag',
      type: REC_TYPES.NUTRITION_FLAG,
      severity: SEVERITY.URGENT,
      exerciseId: null,
      dayLabel: null,
      title: 'Address nutrition before adjusting programming',
      description: `Your nutrition check-ins show you've been off track for ${recent.length} consecutive weeks. Before making any programming changes, get your nutrition dialled in. Poor nutrition is the most common non-programming cause of stalled progress.`,
      guideRule: 'First identify if the issues even stem from your programming. Make sure your nutrition, stress, and sleep are all good first. Then focus on the programming.',
      actionLabel: null,
      actionType: null,
      dataPoint: `Avg nutrition rating: ${avg.toFixed(1)}/3 over last ${recent.length} weeks`,
      generatedAt: new Date().toISOString(),
    };
  }

  return null;
}

// ─── Rule: Fatigue flag ───────────────────────────────────────────────────────
function checkFatigueFlag(allSessions) {
  const avgEnergy  = getAvgEnergyFromSessions(allSessions);
  if (avgEnergy === null) return null;

  const ratedCount = allSessions.filter(s => s.energyRating != null).length;

  if (avgEnergy <= 1.5) {
    return {
      id: 'fatigue-flag',
      type: REC_TYPES.FATIGUE_FLAG,
      severity: SEVERITY.URGENT,
      exerciseId: null,
      dayLabel: null,
      title: 'Systemic fatigue detected — fix recovery first',
      description: `Your post-session energy ratings have been consistently low. Before making any programming changes, address the underlying fatigue: prioritise sleep, reduce external stress, and consider whether your total training volume is sustainable. Programming changes made while systematically fatigued rarely fix the problem.`,
      guideRule: 'First identify if the issues even stem from your programming. Make sure your nutrition, stress, and sleep are all good first. Then focus on the programming.',
      actionLabel: null,
      actionType: null,
      dataPoint: `Avg energy: ${avgEnergy.toFixed(1)}/3 across last ${Math.min(ratedCount, 8)} rated sessions`,
      generatedAt: new Date().toISOString(),
    };
  }

  return null;
}

// ─── Rule: Mid-Block 3 deload signal ─────────────────────────────────────────
function checkMidBlockFatigue(program, allSessions) {
  // Only fires from week 8 onward in Block 3 (4+ weeks of accumulated loading)
  if (program.currentBlock !== 3 || program.currentWeek < 8) return null;

  const energyRatedSessions = allSessions
    .filter(s => s.energyRating != null)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Need at least 6 rated sessions to compare recent vs prior trend
  if (energyRatedSessions.length < 6) return null;

  const recent3 = energyRatedSessions.slice(0, 3);
  const prior3  = energyRatedSessions.slice(3, 6);

  const recentAvg = recent3.reduce((s, x) => s + x.energyRating, 0) / 3;
  const priorAvg  = prior3.reduce((s, x) => s + x.energyRating, 0) / 3;

  // Energy must be declining meaningfully (not just noise)
  if (priorAvg - recentAvg < 0.4) return null;

  // Second signal: check if average RPE is elevated (fatigue masking true strength)
  const recentRPEs = allSessions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .flatMap(s => s.exercises?.flatMap(e => e.sets?.map(st => st.rpe).filter(Boolean) || []) || []);

  const avgRPE = recentRPEs.length
    ? recentRPEs.reduce((a, b) => a + b, 0) / recentRPEs.length
    : null;

  // Both energy decline AND elevated RPE required to avoid false positives
  if (avgRPE === null || avgRPE < 8.0) return null;

  return {
    id: 'mid-block-deload',
    type: REC_TYPES.DELOAD_SIGNAL,
    severity: SEVERITY.URGENT,
    exerciseId: null,
    dayLabel: null,
    title: 'Deload week recommended',
    description: `You're in week ${program.currentWeek} of Block 3 and your post-session energy has been declining while RPE is trending high. After several weeks of structured loading, accumulated fatigue can mask your true fitness. Take a deload: same exercises, reduce sets by ~40%, drop RPE to 6–7 across all movements. Resume full training the following week — you'll likely feel stronger.`,
    guideRule: 'Fatigue accumulation during extended loading blocks is expected. A well-timed deload removes the fatigue mask and often reveals fitness gains underneath.',
    actionLabel: null,
    actionType: null,
    dataPoint: `Energy trend: ${priorAvg.toFixed(1)} → ${recentAvg.toFixed(1)} (last 6 rated sessions) · Avg RPE: ${avgRPE.toFixed(1)}`,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Rule: Joint action volume ────────────────────────────────────────────────
function checkJointActionVolume(program, allSessions, jointActionMetrics) {
  const recommendations = [];
  const seen = new Set();
  const volumeThreshold = JOINT_ACTION_VOLUME_THRESHOLDS[program.trainingAge] || 8;
  const recoveryThreshold = getRecoveryThreshold(program.age);

  for (const [jointAction, metrics] of Object.entries(jointActionMetrics)) {
    if (metrics.dataCount === 0) continue;
    if (metrics.totalWeeklySets <= volumeThreshold) continue;
    if (!metrics.isFullyStalling && metrics.stallingCount === 0) continue;

    const recovery = detectInterSessionRecovery(jointAction, program, allSessions, recoveryThreshold);
    if (!recovery?.hasRecoveryIssue) continue;

    const programExercises = program.splitDays.flatMap(d => d.exercises);
    const exercisesToConsider = metrics.exercises
      .map(id => {
        const exDef   = findExercise(id);
        const exConfig = programExercises.find(e => e.exerciseId === id);
        let sets = exConfig?.sets || 0;
        if (!sets) {
          const recent = allSessions
            .filter(s => s.exercises?.some(e => e.exerciseId === id))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4);
          if (recent.length) {
            sets = Math.round(
              recent.reduce((sum, s) => {
                const ex = s.exercises.find(e => e.exerciseId === id);
                return sum + (ex?.sets?.length || 0);
              }, 0) / recent.length
            );
          }
        }
        return { id, exDef, sets };
      })
      .filter(e => e.exDef && e.exDef.coordinationDemand !== 'high')
      .sort((a, b) => b.sets - a.sets);

    if (!exercisesToConsider.length) continue;

    const target    = exercisesToConsider[0];
    const dedupeKey = `joint-${jointAction}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const secondSessionPercent = Math.round((1 - recovery.avgRatio) * 100);

    recommendations.push({
      id: `joint-volume-${jointAction}`,
      type: REC_TYPES.REDUCE_JOINT_ACTION_VOLUME,
      severity: SEVERITY.NORMAL,
      exerciseId: target.id,
      jointAction,
      jointActionLabel: metrics.label,
      dayLabel: null,
      affectedExercises: metrics.exercises,
      title: `Reduce ${metrics.label} volume`,
      description: `Your ${metrics.label} pattern has ${metrics.totalWeeklySets} sets per week across ${metrics.exercises.length} exercises, and your second weekly session for this movement pattern performs approximately ${secondSessionPercent}% below your first session — a sign the joint action isn't recovering between sessions. Consider removing 1–2 sets from ${target.exDef.name} to reduce the total load.`,
      guideRule: 'If you find a muscle group is unable to recover session to session then first look at its frequency. If already at 2 times per week, reduce the number of sets per week down by 1 and re-assess.',
      actionLabel: null,
      actionType: null,
      dataPoint: `${metrics.totalWeeklySets} sets/week · Session 2 averages ${(recovery.avgRatio * 100).toFixed(1)}% of Session 1 (${recovery.sampleSize} comparisons)`,
      generatedAt: new Date().toISOString(),
    });
  }

  return recommendations;
}

// ─── Rule: Push / pull balance ────────────────────────────────────────────────
function checkPushPullBalance(jointActionMetrics) {
  const pushSets = PUSH_JOINT_ACTIONS.reduce(
    (sum, ja) => sum + (jointActionMetrics[ja]?.totalWeeklySets || 0), 0
  );
  const pullSets = PULL_JOINT_ACTIONS.reduce(
    (sum, ja) => sum + (jointActionMetrics[ja]?.totalWeeklySets || 0), 0
  );

  if (pushSets === 0 || pullSets === 0) return null;

  const ratio = pushSets / pullSets;
  if (ratio <= 1.3) return null;

  return {
    id: 'push-pull-imbalance',
    type: REC_TYPES.PUSH_PULL_IMBALANCE,
    severity: SEVERITY.INFO,
    exerciseId: null,
    dayLabel: null,
    title: 'Push volume exceeds pull volume',
    description: `Your program has ${pushSets} push sets vs ${pullSets} pull sets per week (${ratio.toFixed(1)}:1 ratio). A sustained push-dominant imbalance increases shoulder impingement risk over time. Consider adding 1–2 sets of a rowing movement, or trimming a chest or shoulder set, to bring the ratio below 1.3:1.`,
    guideRule: 'Maintain a balanced push-to-pull ratio to protect shoulder health and prevent postural imbalances.',
    actionLabel: null,
    actionType: null,
    dataPoint: `Push: ${pushSets} sets · Pull: ${pullSets} sets · Ratio: ${ratio.toFixed(1)}:1`,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Rule: Chronic poor sleep ─────────────────────────────────────────────────
function checkChronicPoorSleep(allSessions) {
  const ratedSessions = [...allSessions]
    .filter(s => s.sleepQuality != null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  if (ratedSessions.length < 3) return null;

  const poorCount = ratedSessions.filter(s => s.sleepQuality === 1).length;
  if (poorCount < 3) return null;

  return {
    id: 'chronic-poor-sleep',
    type: REC_TYPES.SLEEP_FLAG,
    severity: SEVERITY.INFO,
    exerciseId: null,
    dayLabel: null,
    title: 'Sleep quality may be limiting progress',
    description: `You've reported poor sleep in ${poorCount} of your last ${ratedSessions.length} rated sessions. Chronic sleep deprivation reduces strength output, elevates RPE for the same weights, and impairs muscle protein synthesis — so your recent session data may not reflect your true training capacity. The engine is discounting poor-sleep sessions when evaluating progress stalls and recovery.`,
    guideRule: 'Make sure your nutrition, stress, and sleep are all good before attributing stalls to your programming.',
    actionLabel: null,
    actionType: null,
    dataPoint: `Poor sleep: ${poorCount} of last ${ratedSessions.length} rated sessions`,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Rule 2: Progress stalls ─────────────────────────────────────────────────
const TRAINING_AGE_PROGRESS_CONTEXT = {
  [TRAINING_AGE.BEGINNER]:     'As a beginner, you should progress most sessions — a stall this early likely means a quick fix is needed.',
  [TRAINING_AGE.INTERMEDIATE]: 'At the intermediate level, weekly progress is less guaranteed. A stall over this window is a clear signal to adjust something.',
  [TRAINING_AGE.ADVANCED]:     'Advanced lifters progress slowly by nature. A stall over this window is meaningful and warrants a deliberate change.',
};

function checkProgressStalls(program, allSessions, checkIns, exerciseTrends, jointActionMetrics) {
  const recommendations = [];
  const threshold = getPlateauThreshold(program.trainingAge, program.age);
  const progressContext = TRAINING_AGE_PROGRESS_CONTEXT[program.trainingAge] || '';

  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
    .slice(0, 4);
  const avgNutrition = recentCheckIns.length
    ? recentCheckIns.reduce((sum, c) => sum + (c.nutritionRating || 2), 0) / recentCheckIns.length
    : null;
  const nutritionIsIssue = avgNutrition !== null && avgNutrition < 2;

  const avgEnergy      = getAvgEnergyFromSessions(allSessions);
  const fatigueIsIssue = avgEnergy !== null && avgEnergy <= 1.5;

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exerciseId = exConfig.exerciseId;
      const exDef      = findExercise(exerciseId);
      if (!exDef) continue;

      const exerciseSessions = allSessions
        .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (exerciseSessions.length < threshold) continue;

      const window = exerciseSessions.slice(-threshold);

      const getSessionE1RM = (session) => {
        const exData = session.exercises.find(e => e.exerciseId === exerciseId);
        if (!exData?.sets?.length) return 0;
        return Math.max(...exData.sets.map(s => {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps)     || 0;
          return w && r ? Math.round(w * (1 + r / 30)) : 0;
        }));
      };

      // Exclude poor-sleep sessions from the "last e1RM" comparison — a bad-sleep
      // session is not a reliable measure of actual progress.
      const reliableSessions = window.filter(s => getSleepWeight(s) > 0);
      // If fewer than half the window has reliable sleep data, defer the stall check.
      if (reliableSessions.length < Math.ceil(threshold / 2)) continue;

      const firstE1RM = getSessionE1RM(window[0]);
      const lastE1RM  = getSessionE1RM(reliableSessions[reliableSessions.length - 1]);
      if (firstE1RM === 0 || lastE1RM === 0) continue;

      const e1rmDelta = ((lastE1RM - firstE1RM) / firstE1RM) * 100;

      // Check volume load as a secondary progression signal
      const vlTrend = getVolumeLoadTrend(exerciseId, allSessions, threshold);

      // Skip if EITHER e1RM improved meaningfully OR volume load improved meaningfully
      if (e1rmDelta >= 2.5) continue;
      if (vlTrend && vlTrend.deltaPercent >= 5) continue;

      // 1. Fatigue — suppress individual recs, global flag handles it
      if (fatigueIsIssue) continue;

      // 2. Nutrition
      if (nutritionIsIssue) {
        recommendations.push({
          id: `stall-${exerciseId}`,
          type: REC_TYPES.PROGRESS_STALL,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Progress stall: ${exDef.name}`,
          description: `${exDef.name} has stalled over your last ${threshold} sessions (e1RM: ${firstE1RM}kg → ${lastE1RM}kg). Your nutrition check-ins suggest you've been off track — address that before changing programming. ${progressContext}`,
          guideRule: 'First identify if the issues even stem from your programming. Make sure your nutrition, stress, and sleep are all good first.',
          actionLabel: null, actionType: null,
          dataPoint: `e1RM ${firstE1RM}kg → ${lastE1RM}kg over ${threshold} sessions`,
          nutritionFlag: true,
          generatedAt: new Date().toISOString(),
        });
        continue;
      }

      // 3. High-coordination movement
      if (exDef.coordinationDemand === 'high') {
        recommendations.push({
          id: `stall-${exerciseId}`,
          type: REC_TYPES.PROGRESS_STALL,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Progress stall: ${exDef.name}`,
          description: `${exDef.name} is a high-coordination movement that has stalled over ${threshold} sessions. Try dropping to a lower rep range (4–6 reps) to reduce fatigue while still providing sufficient growth stimulus. ${progressContext}`,
          guideRule: 'For lifts that require a lot of coordination and technique that stall, attempt to lower the rep ranges. Lower rep ranges allow us to reach the same stimulus with less fatigue.',
          actionLabel: null, actionType: null,
          dataPoint: `e1RM ${firstE1RM}kg → ${lastE1RM}kg over ${threshold} sessions`,
          generatedAt: new Date().toISOString(),
        });
        recommendations.push({
          id: `rep-range-${exerciseId}`,
          type: REC_TYPES.LOWER_REP_RANGE,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Lower rep range: ${exDef.name}`,
          description: `Switch to 4–6 reps instead of ${exConfig.repRange[0]}–${exConfig.repRange[1]} for ${exDef.name}.`,
          guideRule: 'Lower rep ranges (4–6) allow us to reach the same stimulus needed for growth with less fatigue.',
          actionLabel: null, actionType: null,
          dataPoint: `Current range: ${exConfig.repRange[0]}–${exConfig.repRange[1]} reps`,
          generatedAt: new Date().toISOString(),
        });
        continue;
      }

      // 4. Skip if joint action volume rule is already covering this
      const jointActionAlreadyFlagged = exDef.jointActions.some(ja => {
        const jaMetrics = jointActionMetrics[ja];
        const volumeThreshold = JOINT_ACTION_VOLUME_THRESHOLDS[program.trainingAge] || 8;
        return jaMetrics?.totalWeeklySets > volumeThreshold;
      });
      if (jointActionAlreadyFlagged) continue;

      // 5. Route by RPE / discomfort
      const avgRPE        = getAvgRPEForExercise(exerciseId, allSessions, threshold);
      const trendData     = exerciseTrends?.find(t => t.exerciseId === exerciseId);
      const avgDiscomfort = trendData?.avgDiscomfort ?? 0;
      const recoveringFine = avgRPE !== null && avgRPE <= 8.0 && avgDiscomfort <= 3;

      const vlNote = vlTrend
        ? ` Volume load: ${vlTrend.firstVL}kg-vol → ${vlTrend.lastVL}kg-vol.`
        : '';

      if (recoveringFine) {
        recommendations.push({
          id: `volume-${exerciseId}`,
          type: REC_TYPES.INCREASE_VOLUME,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Add a set: ${exDef.name}`,
          description: `${exDef.name} has stalled over ${threshold} sessions (e1RM: ${firstE1RM}kg → ${lastE1RM}kg; volume load flat too).${vlNote} Your average RPE is ${avgRPE.toFixed(1)} and discomfort is low — your body is handling the current load comfortably without responding to it. Try adding 1 set for 2–3 weeks. ${progressContext}`,
          guideRule: 'If you find a muscle group is always recovered but is lagging, then try out 1–2 more sets per week directed towards that muscle group until you can find the upper threshold.',
          actionLabel: null, actionType: null,
          dataPoint: `Avg RPE: ${avgRPE.toFixed(1)} · Avg discomfort: ${avgDiscomfort.toFixed(1)}/10 · e1RM flat over ${threshold} sessions`,
          generatedAt: new Date().toISOString(),
        });
      } else {
        const rpeNote = avgRPE !== null ? ` (avg RPE: ${avgRPE.toFixed(1)})` : '';
        recommendations.push({
          id: `stall-${exerciseId}`,
          type: REC_TYPES.PROGRESS_STALL,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Reduce intensity: ${exDef.name}`,
          description: `${exDef.name} has stalled over ${threshold} sessions (e1RM: ${firstE1RM}kg → ${lastE1RM}kg)${rpeNote}.${vlNote} Fatigue may be limiting recovery. Try reducing your RPE target by 1 point for a few sessions to allow fuller recovery between workouts. ${progressContext}`,
          guideRule: 'For highly fatiguing lifts that stall in progression, adjust the RPEs lower. This will help us recover better and prevent fatigue bleeding into later lifts.',
          actionLabel: null, actionType: null,
          dataPoint: avgRPE !== null
            ? `Avg RPE: ${avgRPE.toFixed(1)} over last ${threshold} sessions`
            : `e1RM ${firstE1RM}kg → ${lastE1RM}kg over ${threshold} sessions`,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return recommendations;
}

// ─── Rule 3: RPE overload ─────────────────────────────────────────────────────
function checkRPEAdjustments(program, allSessions) {
  const recommendations = [];

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exerciseId = exConfig.exerciseId;
      const exDef      = findExercise(exerciseId);
      if (!exDef) continue;

      const exerciseSessions = allSessions
        .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);

      if (exerciseSessions.length < 3) continue;

      const rpeValues = exerciseSessions.flatMap(s => {
        const exData = s.exercises.find(e => e.exerciseId === exerciseId);
        return exData?.sets?.map(set => set.rpe).filter(Boolean) || [];
      });

      if (!rpeValues.length) continue;

      const avgRPE = rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;

      if (avgRPE >= 9.2 && exDef.coordinationDemand !== 'high') {
        recommendations.push({
          id: `rpe-${exerciseId}`,
          type: REC_TYPES.REDUCE_RPE,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Reduce RPE target: ${exDef.name}`,
          description: `Your average RPE on ${exDef.name} is ${avgRPE.toFixed(1)} — you're consistently training to near failure. This level of fatigue can bleed into other lifts and slow recovery. Try capping effort at RPE ${Math.round(avgRPE) - 1} for a few sessions.`,
          guideRule: 'For highly fatiguing lifts that stall in progression, adjust the RPEs lower. This will help us recover better and prevent any fatigue bleeding into later lifts in the same session.',
          actionLabel: null, actionType: null,
          dataPoint: `Avg RPE: ${avgRPE.toFixed(1)} over last ${rpeValues.length} sets`,
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return recommendations;
}

// ─── Rule 5: Exercise order ───────────────────────────────────────────────────
function checkExerciseOrderOptimization(program, exerciseTrends) {
  const recommendations = [];
  const threshold = getPlateauThreshold(program.trainingAge, program.age);

  for (const splitDay of program.splitDays) {
    const dayExercises = splitDay.exercises;
    if (!dayExercises || dayExercises.length < 3) continue;

    const dayItems = dayExercises
      .map((exConfig, position) => {
        const trend = exerciseTrends.find(t => t.exerciseId === exConfig.exerciseId);
        const exDef = findExercise(exConfig.exerciseId);
        if (!trend || !exDef) return null;
        return { exConfig, trend, position, exDef };
      })
      .filter(Boolean);

    const earlyProgressors = dayItems.filter(item =>
      item.position <= 1 &&
      item.trend.sessionsLogged >= 3 &&
      item.trend.deltaPercent >= 5
    );
    if (!earlyProgressors.length) continue;

    const lateStallers = dayItems.filter(item =>
      item.position >= 2 &&
      item.trend.sessionsLogged >= threshold &&
      item.trend.deltaPercent < 2.5 &&
      item.exDef.coordinationDemand !== 'high'
    );

    for (const staller of lateStallers) {
      const earlyProgressor = earlyProgressors[0];
      const hasSharedMuscles = earlyProgressors.some(early =>
        early.exDef.muscles.some(m => staller.exDef.muscles.includes(m))
      );

      let description = `${staller.exDef.name} is at position ${staller.position + 1} of ${dayExercises.length} in ${splitDay.dayLabel} and has stalled, while ${earlyProgressor.exDef.name} earlier in the same session is progressing well. `;
      if (hasSharedMuscles) {
        description += `Both movements share muscle groups, so ${staller.exDef.name} may be arriving partially fatigued. `;
      }
      description += `Moving it to the top of ${splitDay.dayLabel} gives it a fresh attempt at maximum effort.`;

      recommendations.push({
        id: `reorder-${staller.exConfig.exerciseId}`,
        type: REC_TYPES.REORDER_EXERCISE,
        severity: SEVERITY.NORMAL,
        exerciseId: staller.exConfig.exerciseId,
        dayLabel: splitDay.dayLabel,
        currentPosition: staller.position,
        totalExercises: dayExercises.length,
        title: `Move ${staller.exDef.name} earlier in ${splitDay.dayLabel}`,
        description,
        guideRule: 'If a muscle group is an extremely lacking part of your physique, it would make sense to prioritize it near the beginning of each session.',
        actionLabel: 'Reorder in Program tab',
        actionType: 'reorder',
        dataPoint: `Position ${staller.position + 1} of ${dayExercises.length} — ${staller.trend.deltaPercent >= 0 ? '+' : ''}${staller.trend.deltaPercent}% vs ${earlyProgressor.trend.deltaPercent >= 0 ? '+' : ''}${earlyProgressor.trend.deltaPercent}% for ${earlyProgressor.exDef.name}`,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return recommendations;
}

// ─── Exercise trends ──────────────────────────────────────────────────────────
function buildTrendEntry(exerciseId, exDef, dayLabel, displayName, allSessions) {
  const exerciseSessions = allSessions
    .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!exerciseSessions.length) {
    return {
      exerciseId, exerciseName: exDef.name, dayLabel, displayName,
      sessionsLogged: 0, firstE1RM: 0, lastE1RM: 0, deltaPercent: 0,
      volumeLoadDelta: 0,
      trend: 'no_data', avgDiscomfort: 0, discomfortFlag: false, lastDate: null,
    };
  }

  const getE1RM = (session) => {
    const exData = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exData?.sets?.length) return 0;
    return Math.max(...exData.sets.map(s => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps)     || 0;
      return w && r ? Math.round(w * (1 + r / 30)) : 0;
    }));
  };

  const firstE1RM    = getE1RM(exerciseSessions[0]);
  const lastE1RM     = getE1RM(exerciseSessions[exerciseSessions.length - 1]);
  const deltaPercent = firstE1RM > 0 ? ((lastE1RM - firstE1RM) / firstE1RM) * 100 : 0;

  // Volume load trend as secondary signal
  const vlTrend = getVolumeLoadTrend(exerciseId, allSessions, exerciseSessions.length);
  const volumeLoadDelta = vlTrend?.deltaPercent ?? 0;

  const discomfortRatings = exerciseSessions.slice(-3)
    .map(s => s.exercises.find(e => e.exerciseId === exerciseId)?.discomfortRating)
    .filter(Boolean);
  const avgDiscomfort = discomfortRatings.length
    ? discomfortRatings.reduce((a, b) => a + b, 0) / discomfortRatings.length
    : 0;

  let trend;
  if (exerciseSessions.length < 2)                         trend = 'no_data';
  else if (deltaPercent >= 5 || volumeLoadDelta >= 5)      trend = 'progressing';
  else if (deltaPercent >= -2 && volumeLoadDelta >= -5)    trend = 'plateau';
  else                                                      trend = 'declining';

  return {
    exerciseId,
    exerciseName: exDef.name,
    dayLabel,
    displayName,
    sessionsLogged: exerciseSessions.length,
    firstE1RM, lastE1RM,
    deltaPercent: Math.round(deltaPercent * 10) / 10,
    volumeLoadDelta: Math.round(volumeLoadDelta * 10) / 10,
    trend,
    avgDiscomfort: Math.round(avgDiscomfort * 10) / 10,
    discomfortFlag: avgDiscomfort >= 7,
    lastDate: exerciseSessions[exerciseSessions.length - 1]?.date || null,
  };
}

async function calculateExerciseTrends(program, allSessions) {
  const trends = [];
  const seen   = new Set();

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exDef = findExercise(exConfig.exerciseId);
      if (!exDef) continue;
      const exerciseId = exConfig.exerciseId;
      if (seen.has(exerciseId)) continue;
      seen.add(exerciseId);
      trends.push(buildTrendEntry(
        exerciseId, exDef, splitDay.dayLabel, splitDay.displayName || null, allSessions
      ));
    }
  }

  for (const session of allSessions) {
    for (const exData of (session.exercises || [])) {
      const exerciseId = exData.exerciseId;
      if (seen.has(exerciseId)) continue;
      const exDef = findExercise(exerciseId);
      if (!exDef) continue;
      seen.add(exerciseId);
      const recentSession = allSessions
        .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      trends.push(buildTrendEntry(
        exerciseId, exDef,
        recentSession?.splitDayLabel || null,
        recentSession?.splitDayDisplayName || null,
        allSessions
      ));
    }
  }

  return trends;
}

// ─── Main engine runner ───────────────────────────────────────────────────────
export async function runAdjustmentEngine() {
  const [program, allSessions, checkIns, customExercises] = await Promise.all([
    getCurrentProgram(),
    getAllSessions(),
    getAllCheckIns(),
    getCustomExercises(),
  ]);
  _customExercises = customExercises;

  if (!program) {
    return { recommendations: [], exerciseTrends: [], jointActionMetrics: {}, program: null, summary: null };
  }

  const recommendations     = [];
  const isOptimizationBlock = program.currentBlock === 4;

  // Rule 1: Discomfort — always run
  recommendations.push(...checkDiscomfortRules(program, allSessions));

  const exerciseTrends     = await calculateExerciseTrends(program, allSessions);
  const jointActionMetrics = calculateJointActionMetrics(program, exerciseTrends, allSessions);

  // Mid-Block 3 deload check — runs in block 3 from week 8+
  if (program.currentBlock === 3 && program.currentWeek >= 8) {
    const deloadRec = checkMidBlockFatigue(program, allSessions);
    if (deloadRec) recommendations.push(deloadRec);
  }

  if (isOptimizationBlock) {
    const fatigueRec = checkFatigueFlag(allSessions);
    if (fatigueRec) recommendations.push(fatigueRec);

    if (allSessions.length > 0) {
      const nutritionRec = checkNutritionFlag(checkIns);
      if (nutritionRec) recommendations.push(nutritionRec);
    }

    recommendations.push(...checkJointActionVolume(program, allSessions, jointActionMetrics));
    recommendations.push(...checkProgressStalls(program, allSessions, checkIns, exerciseTrends, jointActionMetrics));
    recommendations.push(...checkRPEAdjustments(program, allSessions));
    recommendations.push(...checkExerciseOrderOptimization(program, exerciseTrends));

    if (allSessions.length >= 3) {
      const pushPullRec = checkPushPullBalance(jointActionMetrics);
      if (pushPullRec) recommendations.push(pushPullRec);
    }

    const sleepRec = checkChronicPoorSleep(allSessions);
    if (sleepRec) recommendations.push(sleepRec);
  }

  // Deduplicate: one rec per type+exercise combination
  const seen = new Set();
  const uniqueRecs = recommendations.filter(r => {
    const key = r.exerciseId ? `${r.type}-${r.exerciseId}` : r.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const severityOrder = { urgent: 0, normal: 1, info: 2 };
  uniqueRecs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    recommendations: uniqueRecs,
    exerciseTrends,
    jointActionMetrics,
    program,
    summary: {
      totalSessions:    allSessions.length,
      progressingCount: exerciseTrends.filter(t => t.trend === 'progressing').length,
      plateauCount:     exerciseTrends.filter(t => t.trend === 'plateau').length,
      noDataCount:      exerciseTrends.filter(t => t.trend === 'no_data').length,
      urgentCount:      uniqueRecs.filter(r => r.severity === SEVERITY.URGENT).length,
      normalCount:      uniqueRecs.filter(r => r.severity === SEVERITY.NORMAL).length,
    },
  };
}

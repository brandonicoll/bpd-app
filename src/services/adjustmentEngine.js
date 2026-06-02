import {
  getCurrentProgram,
  getAllSessions,
  getAllCheckIns,
} from './storage';
import { exercises as exerciseLibrary } from '../data/exercises';
import { PLATEAU_THRESHOLDS } from '../data/splits';
import { JOINT_ACTION_LABELS } from '../data/jointActionLabels';
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
};

export const SEVERITY = {
  URGENT: 'urgent',
  NORMAL: 'normal',
  INFO:   'info',
};

const JOINT_ACTION_HIGH_VOLUME_THRESHOLD = 8;
const INTER_SESSION_RECOVERY_THRESHOLD   = 0.97;
const MIN_INTER_SESSION_COMPARISONS      = 3;

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

// ─── Helper: avg fatigue from recent check-ins ────────────────────────────────
function getAvgFatigueFromCheckIns(checkIns, lastN = 3) {
  const recent = checkIns
    .filter(c => c.fatigueRating != null)
    .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
    .slice(0, lastN);

  if (!recent.length) return null;
  return recent.reduce((sum, c) => sum + c.fatigueRating, 0) / recent.length;
}

// ─── Joint action metrics ─────────────────────────────────────────────────────
export function calculateJointActionMetrics(program, exerciseTrends) {
  const map = {};

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exDef = exerciseLibrary.find(e => e.id === exConfig.exerciseId);
      if (!exDef) continue;

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
        if (!entry.exercises.includes(exConfig.exerciseId)) {
          entry.exercises.push(exConfig.exerciseId);
          entry.totalWeeklySets += exConfig.sets;
        }
        if (!entry.dayLabels.includes(splitDay.dayLabel)) {
          entry.dayLabels.push(splitDay.dayLabel);
        }
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
export function detectInterSessionRecovery(jointAction, program, allSessions) {
  const daysWithAction = program.splitDays.filter(day =>
    day.exercises.some(exConfig => {
      const exDef = exerciseLibrary.find(e => e.id === exConfig.exerciseId);
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

    for (const exData of (firstSession.exercises || [])) {
      const exDef = exerciseLibrary.find(e => e.id === exData.exerciseId);
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
    hasRecoveryIssue: avgRatio < INTER_SESSION_RECOVERY_THRESHOLD,
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
      const exDef      = exerciseLibrary.find(e => e.id === exerciseId);
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
function checkFatigueFlag(checkIns) {
  const avgFatigue = getAvgFatigueFromCheckIns(checkIns, 3);
  if (avgFatigue === null) return null;

  const recent = checkIns
    .filter(c => c.fatigueRating != null)
    .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
    .slice(0, 3);

  if (avgFatigue <= 1.5 && recent.length >= 2) {
    return {
      id: 'fatigue-flag',
      type: REC_TYPES.FATIGUE_FLAG,
      severity: SEVERITY.URGENT,
      exerciseId: null,
      dayLabel: null,
      title: 'Systemic fatigue detected — fix recovery first',
      description: `Your energy level check-ins show consistently low energy over ${recent.length} weeks. Before any programming changes are made, address the underlying fatigue: prioritise sleep, reduce external stress, and consider whether your total training volume is sustainable. Programming changes made while systematically fatigued rarely fix the problem and often make it worse.`,
      guideRule: 'First identify if the issues even stem from your programming. Make sure your nutrition, stress, and sleep are all good first. Then focus on the programming.',
      actionLabel: null,
      actionType: null,
      dataPoint: `Avg energy rating: ${avgFatigue.toFixed(1)}/3 over last ${recent.length} weeks`,
      generatedAt: new Date().toISOString(),
    };
  }

  return null;
}

// ─── Rule: Joint action volume ────────────────────────────────────────────────
function checkJointActionVolume(program, allSessions, jointActionMetrics) {
  const recommendations = [];
  const seen = new Set();

  for (const [jointAction, metrics] of Object.entries(jointActionMetrics)) {
    if (metrics.dataCount === 0) continue;
    if (metrics.totalWeeklySets <= JOINT_ACTION_HIGH_VOLUME_THRESHOLD) continue;
    if (!metrics.isFullyStalling && metrics.stallingCount === 0) continue;

    const recovery = detectInterSessionRecovery(jointAction, program, allSessions);
    if (!recovery?.hasRecoveryIssue) continue;

    const exercisesToConsider = metrics.exercises
      .map(id => {
        const exDef   = exerciseLibrary.find(e => e.id === id);
        const exConfig = program.splitDays.flatMap(d => d.exercises).find(e => e.exerciseId === id);
        return { id, exDef, sets: exConfig?.sets || 0 };
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

// ─── Rule 2: Progress stalls ─────────────────────────────────────────────────
function checkProgressStalls(program, allSessions, checkIns, exerciseTrends, jointActionMetrics) {
  const recommendations = [];
  const threshold = PLATEAU_THRESHOLDS[program.trainingAge] || 4;

  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
    .slice(0, 4);
  const avgNutrition = recentCheckIns.length
    ? recentCheckIns.reduce((sum, c) => sum + (c.nutritionRating || 2), 0) / recentCheckIns.length
    : null;
  const nutritionIsIssue = avgNutrition !== null && avgNutrition < 2;

  const avgFatigue    = getAvgFatigueFromCheckIns(checkIns, 3);
  const fatigueIsIssue = avgFatigue !== null && avgFatigue <= 1.5;

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exerciseId = exConfig.exerciseId;
      const exDef      = exerciseLibrary.find(e => e.id === exerciseId);
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

      const firstE1RM = getSessionE1RM(window[0]);
      const lastE1RM  = getSessionE1RM(window[window.length - 1]);
      if (firstE1RM === 0 || lastE1RM === 0) continue;

      const improvementPercent = ((lastE1RM - firstE1RM) / firstE1RM) * 100;
      if (improvementPercent >= 2.5) continue;

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
          description: `${exDef.name} has stalled over your last ${threshold} sessions (e1RM: ${firstE1RM}kg → ${lastE1RM}kg). Your nutrition check-ins suggest you've been off track — address that before changing programming.`,
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
          description: `${exDef.name} is a high-coordination movement that has stalled over ${threshold} sessions. Try dropping to a lower rep range (4–6 reps) to reduce fatigue while still providing sufficient growth stimulus.`,
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
        return jaMetrics?.totalWeeklySets > JOINT_ACTION_HIGH_VOLUME_THRESHOLD;
      });
      if (jointActionAlreadyFlagged) continue;

      // 5. Route by RPE / discomfort
      const avgRPE        = getAvgRPEForExercise(exerciseId, allSessions, threshold);
      const trendData     = exerciseTrends?.find(t => t.exerciseId === exerciseId);
      const avgDiscomfort = trendData?.avgDiscomfort ?? 0;
      const recoveringFine = avgRPE !== null && avgRPE <= 8.0 && avgDiscomfort <= 3;

      if (recoveringFine) {
        recommendations.push({
          id: `volume-${exerciseId}`,
          type: REC_TYPES.INCREASE_VOLUME,
          severity: SEVERITY.NORMAL,
          exerciseId,
          dayLabel: splitDay.dayLabel,
          title: `Add a set: ${exDef.name}`,
          description: `${exDef.name} has stalled over ${threshold} sessions (e1RM: ${firstE1RM}kg → ${lastE1RM}kg), but your average RPE is ${avgRPE.toFixed(1)} and discomfort is low — your body is handling the current load comfortably without responding to it. The stimulus isn't enough. Try adding 1 set for 2–3 weeks. If progress resumes, keep it. If fatigue increases, remove the extra set.`,
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
          description: `${exDef.name} has stalled over ${threshold} sessions (e1RM: ${firstE1RM}kg → ${lastE1RM}kg)${rpeNote}. Fatigue may be limiting recovery. Try reducing your RPE target by 1 point for a few sessions to allow fuller recovery between workouts.`,
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
      const exDef      = exerciseLibrary.find(e => e.id === exerciseId);
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
  const threshold = PLATEAU_THRESHOLDS[program.trainingAge] || 4;

  for (const splitDay of program.splitDays) {
    const dayExercises = splitDay.exercises;
    if (!dayExercises || dayExercises.length < 3) continue;

    const dayItems = dayExercises
      .map((exConfig, position) => {
        const trend = exerciseTrends.find(t => t.exerciseId === exConfig.exerciseId);
        const exDef = exerciseLibrary.find(e => e.id === exConfig.exerciseId);
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
async function calculateExerciseTrends(program, allSessions) {
  const trends = [];

  for (const splitDay of program.splitDays) {
    for (const exConfig of splitDay.exercises) {
      const exDef = exerciseLibrary.find(e => e.id === exConfig.exerciseId);
      if (!exDef) continue;

      const exerciseId       = exConfig.exerciseId;
      const exerciseSessions = allSessions
        .filter(s => s.exercises?.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (!exerciseSessions.length) {
        trends.push({
          exerciseId, exerciseName: exDef.name, dayLabel: splitDay.dayLabel,
          sessionsLogged: 0, firstE1RM: 0, lastE1RM: 0, deltaPercent: 0,
          trend: 'no_data', avgDiscomfort: 0, discomfortFlag: false, lastDate: null,
        });
        continue;
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

      const discomfortRatings = exerciseSessions.slice(-3)
        .map(s => s.exercises.find(e => e.exerciseId === exerciseId)?.discomfortRating)
        .filter(Boolean);
      const avgDiscomfort = discomfortRatings.length
        ? discomfortRatings.reduce((a, b) => a + b, 0) / discomfortRatings.length
        : 0;

      let trend;
      if (exerciseSessions.length < 2) trend = 'no_data';
      else if (deltaPercent >= 5)      trend = 'progressing';
      else if (deltaPercent >= -2)     trend = 'plateau';
      else                             trend = 'declining';

      trends.push({
        exerciseId,
        exerciseName: exDef.name,
        dayLabel: splitDay.dayLabel,
        sessionsLogged: exerciseSessions.length,
        firstE1RM, lastE1RM,
        deltaPercent: Math.round(deltaPercent * 10) / 10,
        trend,
        avgDiscomfort: Math.round(avgDiscomfort * 10) / 10,
        discomfortFlag: avgDiscomfort >= 7,
        lastDate: exerciseSessions[exerciseSessions.length - 1]?.date || null,
      });
    }
  }

  return trends;
}

// ─── Main engine runner ───────────────────────────────────────────────────────
export async function runAdjustmentEngine() {
  const [program, allSessions, checkIns] = await Promise.all([
    getCurrentProgram(),
    getAllSessions(),
    getAllCheckIns(),
  ]);

  if (!program) {
    return { recommendations: [], exerciseTrends: [], jointActionMetrics: {}, program: null, summary: null };
  }

  const recommendations     = [];
  const isOptimizationBlock = program.currentBlock === 4;

  // Rule 1: Discomfort — always run
  recommendations.push(...checkDiscomfortRules(program, allSessions));

  const exerciseTrends     = await calculateExerciseTrends(program, allSessions);
  const jointActionMetrics = calculateJointActionMetrics(program, exerciseTrends);

  if (isOptimizationBlock) {
    const fatigueRec = checkFatigueFlag(checkIns);
    if (fatigueRec) recommendations.push(fatigueRec);

    if (allSessions.length > 0) {
      const nutritionRec = checkNutritionFlag(checkIns);
      if (nutritionRec) recommendations.push(nutritionRec);
    }

    recommendations.push(...checkJointActionVolume(program, allSessions, jointActionMetrics));
    recommendations.push(...checkProgressStalls(program, allSessions, checkIns, exerciseTrends, jointActionMetrics));
    recommendations.push(...checkRPEAdjustments(program, allSessions));
    recommendations.push(...checkExerciseOrderOptimization(program, exerciseTrends));
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

// DEV ONLY — scenario builders that write fake session data to trigger
// each adjustment engine recommendation. Mirrors the unit test factories.

import {
  saveCurrentProgram, getCurrentProgram, saveSession,
  saveWeeklyCheckIn, clearDraftSession,
} from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple dev-only ID (no crypto needed)
let _devIdCounter = 0;
function devId() {
  return `dev_${Date.now()}_${++_devIdCounter}`;
}

// ── Date helpers ──
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeSession(exerciseId, splitDayLabel, { weight, reps, rpe, discomfort = 1, energy = null }, dateIso, setCount = 2) {
  return {
    id: devId(),
    date: dateIso,
    splitDayLabel,
    startTime: dateIso,
    endTime: dateIso,
    weightUnit: 'lbs',
    energyRating: energy,
    exercises: [{
      exerciseId,
      discomfortRating: discomfort,
      notes: '',
      sets: Array.from({ length: setCount }, () => ({
        weight: String(weight),
        reps: String(reps),
        rpe,
        completedAt: dateIso,
      })),
    }],
  };
}

async function wipeSessions() {
  await AsyncStorage.setItem('sessions', JSON.stringify([]));
  await clearDraftSession();
}

async function wipeCheckIns() {
  // Key matches KEYS.WEEKLY_CHECKINS in storage.js
  await AsyncStorage.setItem('weeklyCheckins', JSON.stringify([]));
}

export async function jumpToWeek(week) {
  const program = await getCurrentProgram();
  if (!program) return;
  let block = 1;
  if (week >= 3 && week <= 4) block = 2;
  else if (week >= 5 && week <= 10) block = 3;
  else if (week >= 11) block = 4;
  await saveCurrentProgram({ ...program, currentWeek: week, currentBlock: block, updatedAt: new Date().toISOString() });
}

async function firstExerciseOf(dayIndex = 0) {
  const program = await getCurrentProgram();
  const day = program?.splitDays?.[dayIndex];
  return { program, day, exId: day?.exercises?.[0]?.exerciseId, dayLabel: day?.dayLabel };
}

// ── Scenarios ──

// 1. Discomfort swap: avg discomfort >= 7 over 3 sessions
export async function scenarioDiscomfort() {
  await wipeSessions(); await wipeCheckIns();
  const { exId, dayLabel } = await firstExerciseOf();
  for (let i = 0; i < 3; i++) {
    await saveSession(makeSession(exId, dayLabel, { weight: 100, reps: 8, rpe: 8, discomfort: 8 }, daysAgo(2 + i * 2)));
  }
  await jumpToWeek(1);
}

// 2. Stall + low RPE + low discomfort -> INCREASE_VOLUME (Block 4)
export async function scenarioIncreaseVolume() {
  await wipeSessions(); await wipeCheckIns();
  const { exId, dayLabel } = await firstExerciseOf();
  for (let i = 0; i < 4; i++) {
    await saveSession(makeSession(exId, dayLabel, { weight: 100, reps: 1, rpe: 7, discomfort: 1 }, daysAgo(28 - i * 7)));
  }
  await saveWeeklyCheckIn({ weekStartDate: '2099-01-01', nutritionRating: 3, completedAt: new Date().toISOString() });
  await jumpToWeek(11);
}

// 3. Stall + high RPE -> REDUCE_RPE (Block 4)
export async function scenarioReduceRPE() {
  await wipeSessions(); await wipeCheckIns();
  const { exId, dayLabel } = await firstExerciseOf();
  for (let i = 0; i < 4; i++) {
    await saveSession(makeSession(exId, dayLabel, { weight: 100, reps: 1, rpe: 9.5, discomfort: 1 }, daysAgo(28 - i * 7)));
  }
  await saveWeeklyCheckIn({ weekStartDate: '2099-01-01', nutritionRating: 3, completedAt: new Date().toISOString() });
  await jumpToWeek(11);
}

// 4. Stall on coordination lift -> LOWER_REP_RANGE (Block 4)
export async function scenarioLowerRepRange() {
  await wipeSessions(); await wipeCheckIns();
  const { program } = await firstExerciseOf();
  const coordIds = ['hack_squat', 'rdl', 'squat', 'back_extension_45'];
  let target = null, targetDay = null;
  for (const day of program.splitDays) {
    for (const ex of day.exercises) {
      if (coordIds.includes(ex.exerciseId)) { target = ex.exerciseId; targetDay = day.dayLabel; break; }
    }
    if (target) break;
  }
  if (!target) { target = program.splitDays[0].exercises[0].exerciseId; targetDay = program.splitDays[0].dayLabel; }
  for (let i = 0; i < 4; i++) {
    await saveSession(makeSession(target, targetDay, { weight: 100, reps: 1, rpe: 8, discomfort: 1 }, daysAgo(28 - i * 7)));
  }
  await saveWeeklyCheckIn({ weekStartDate: '2099-01-01', nutritionRating: 3, completedAt: new Date().toISOString() });
  await jumpToWeek(11);
}

// 5. Nutrition flag (Block 4)
export async function scenarioNutrition() {
  await wipeSessions(); await wipeCheckIns();
  const { exId, dayLabel } = await firstExerciseOf();
  for (let i = 0; i < 4; i++) {
    await saveSession(makeSession(exId, dayLabel, { weight: 100, reps: 1, rpe: 8, discomfort: 1 }, daysAgo(28 - i * 7)));
  }
  for (let w = 0; w < 3; w++) {
    await saveWeeklyCheckIn({ weekStartDate: `2099-0${w + 1}-01`, nutritionRating: 1, completedAt: new Date().toISOString() });
  }
  await jumpToWeek(11);
}

// 6. Fatigue flag (Block 4) — low energy ratings across sessions
export async function scenarioFatigue() {
  await wipeSessions(); await wipeCheckIns();
  const { exId, dayLabel } = await firstExerciseOf();
  for (let i = 0; i < 4; i++) {
    await saveSession(makeSession(exId, dayLabel, { weight: 100, reps: 1, rpe: 7, discomfort: 1, energy: 1 }, daysAgo(28 - i * 7)));
  }
  await saveWeeklyCheckIn({ weekStartDate: '2099-01-01', nutritionRating: 3, completedAt: new Date().toISOString() });
  await jumpToWeek(11);
}

// 7. Late exercise stalling while early one progresses -> REORDER_EXERCISE (Block 4)
export async function scenarioReorder() {
  await wipeSessions(); await wipeCheckIns();
  const { program } = await firstExerciseOf();
  const day = program.splitDays.find(d => d.exercises.length >= 3) || program.splitDays[0];
  const earlyId = day.exercises[0].exerciseId;
  const lateId  = day.exercises[day.exercises.length - 1].exerciseId;
  const dates        = [28, 21, 14, 7];
  const earlyWeights = [100, 104, 108, 112];
  const lateWeights  = [60, 60, 61, 60];
  for (let i = 0; i < 4; i++) {
    const dateIso = daysAgo(dates[i]);
    await saveSession({
      id: devId(), date: dateIso, splitDayLabel: day.dayLabel,
      startTime: dateIso, endTime: dateIso, weightUnit: 'lbs', energyRating: null,
      exercises: [
        { exerciseId: earlyId, discomfortRating: 1, notes: '', sets: [{ weight: String(earlyWeights[i]), reps: '1', rpe: 8, completedAt: dateIso }] },
        { exerciseId: lateId,  discomfortRating: 1, notes: '', sets: [{ weight: String(lateWeights[i]),  reps: '1', rpe: 7, completedAt: dateIso }] },
      ],
    });
  }
  await saveWeeklyCheckIn({ weekStartDate: '2099-01-01', nutritionRating: 3, completedAt: new Date().toISOString() });
  await jumpToWeek(11);
}

// 8. Everything progressing — no recommendations
export async function scenarioHealthy() {
  await wipeSessions(); await wipeCheckIns();
  const { exId, dayLabel } = await firstExerciseOf();
  const weights = [100, 105, 110, 116];
  for (let i = 0; i < 4; i++) {
    await saveSession(makeSession(exId, dayLabel, { weight: weights[i], reps: 1, rpe: 8, discomfort: 1, energy: 3 }, daysAgo(28 - i * 7)));
  }
  await saveWeeklyCheckIn({ weekStartDate: '2099-01-01', nutritionRating: 3, completedAt: new Date().toISOString() });
  await jumpToWeek(11);
}

export async function scenarioReset() {
  await wipeSessions();
  await wipeCheckIns();
  await jumpToWeek(1);
}

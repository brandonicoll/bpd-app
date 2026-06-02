import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage keys ──────────────────────────────────────────────
const KEYS = {
  USER_PROFILE: 'userProfile',
  CURRENT_PROGRAM: 'currentProgram',
  SESSIONS: 'sessions',
  WEEKLY_CHECKINS: 'weeklyCheckins',
  STREAK: 'streak',
  ADJUSTMENT_LOG: 'adjustmentLog',
  HAS_COMPLETED_ONBOARDING: 'hasCompletedOnboarding',
};

// ─── Generic helpers ───────────────────────────────────────────
async function getItem(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error(`Storage.getItem error for key ${key}:`, e);
    return null;
  }
}

async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Storage.setItem error for key ${key}:`, e);
    return false;
  }
}

// ─── User Profile ──────────────────────────────────────────────
// Shape: { id, name, trainingAge, daysPerWeek, splitType, goals, createdAt }
export async function getUserProfile() {
  return getItem(KEYS.USER_PROFILE);
}

export async function saveUserProfile(profile) {
  return setItem(KEYS.USER_PROFILE, { ...profile, updatedAt: new Date().toISOString() });
}

// ─── Current Program ───────────────────────────────────────────
// Shape: {
//   splitType, startDate, currentBlock (1-4), currentWeek (1-12),
//   splitDays: [{ dayLabel, exercises: [exerciseId] }]
// }
export async function getCurrentProgram() {
  return getItem(KEYS.CURRENT_PROGRAM);
}

export async function saveCurrentProgram(program) {
  return setItem(KEYS.CURRENT_PROGRAM, { ...program, updatedAt: new Date().toISOString() });
}

export async function updateCurrentBlock(blockNumber, weekNumber) {
  const program = await getCurrentProgram();
  if (!program) return false;
  return saveCurrentProgram({ ...program, currentBlock: blockNumber, currentWeek: weekNumber });
}

// ─── Workout Sessions ──────────────────────────────────────────
// Session shape: {
//   id, date (ISO string), splitDayLabel, durationMinutes, completedAt,
//   exercises: [{
//     exerciseId, discomfortRating (1-10),
//     sets: [{ weight, reps, rpe, completedAt }]
//   }]
// }
export async function getAllSessions() {
  const sessions = await getItem(KEYS.SESSIONS);
  return sessions || [];
}

export async function saveSession(session) {
  const sessions = await getAllSessions();
  const existing = sessions.findIndex(s => s.id === session.id);
  if (existing >= 0) {
    sessions[existing] = session;
  } else {
    sessions.push(session);
  }
  return setItem(KEYS.SESSIONS, sessions);
}

export async function getSessionsByDateRange(startDate, endDate) {
  const sessions = await getAllSessions();
  return sessions.filter(s => {
    const d = new Date(s.date);
    return d >= new Date(startDate) && d <= new Date(endDate);
  });
}

export async function getSessionsForExercise(exerciseId) {
  const sessions = await getAllSessions();
  return sessions.filter(s =>
    s.exercises.some(e => e.exerciseId === exerciseId)
  );
}

// ─── Weekly Check-ins ─────────────────────────────────────────
// Shape: {
//   weekStartDate, completedAt,
//   nutritionRating (1-3): 1=off track, 2=roughly, 3=on track
//   fatigueRating   (1-3): 1=low energy, 2=okay, 3=high energy
// }
export async function getAllCheckIns() {
  const checkIns = await getItem(KEYS.WEEKLY_CHECKINS);
  return checkIns || [];
}

export async function saveWeeklyCheckIn(checkIn) {
  const checkIns = await getAllCheckIns();
  const existing = checkIns.findIndex(c => c.weekStartDate === checkIn.weekStartDate);
  if (existing >= 0) {
    checkIns[existing] = checkIn;
  } else {
    checkIns.push(checkIn);
  }
  return setItem(KEYS.WEEKLY_CHECKINS, checkIns);
}

// ─── Streak ────────────────────────────────────────────────────
// Shape: { currentStreak, longestStreak, weeklyCompletionHistory: [{ weekStartDate, completed, planned }] }
export async function getStreak() {
  const streak = await getItem(KEYS.STREAK);
  return streak || { currentStreak: 0, longestStreak: 0, weeklyCompletionHistory: [] };
}

export async function updateStreak(weekData) {
  const streak = await getStreak();
  const { weekStartDate } = weekData;

  const weekIndex = streak.weeklyCompletionHistory.findIndex(
    w => w.weekStartDate === weekStartDate
  );

  if (weekIndex >= 0) {
    // Increment completed count for this week
    streak.weeklyCompletionHistory[weekIndex].completed += 1;
  } else {
    // New week entry
    streak.weeklyCompletionHistory.push({
      weekStartDate,
      completed: 1,
      planned: weekData.planned || 1,
    });
  }

  // Recalculate streak: a week counts if completed >= 1 session
  // Full ≥80% logic runs when we have planned count from program
  const sortedWeeks = [...streak.weeklyCompletionHistory].sort(
    (a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate)
  );

  let current = 0;
  for (const week of sortedWeeks) {
    if (week.completed >= 1) {
      current++;
    } else {
      break;
    }
  }

  streak.currentStreak = current;
  streak.longestStreak = Math.max(streak.longestStreak, current);

  return setItem(KEYS.STREAK, streak);
}

// ─── Adjustment Log ────────────────────────────────────────────
// Shape: [{ id, date, exerciseId, ruleTriggered, recommendation, status ('pending'|'accepted'|'dismissed') }]
export async function getAdjustmentLog() {
  const log = await getItem(KEYS.ADJUSTMENT_LOG);
  return log || [];
}

export async function addAdjustmentRecommendation(recommendation) {
  const log = await getAdjustmentLog();
  log.push({ ...recommendation, id: Date.now().toString(), date: new Date().toISOString(), status: 'pending' });
  return setItem(KEYS.ADJUSTMENT_LOG, log);
}

export async function updateAdjustmentStatus(id, status) {
  const log = await getAdjustmentLog();
  const index = log.findIndex(r => r.id === id);
  if (index >= 0) {
    log[index].status = status;
    return setItem(KEYS.ADJUSTMENT_LOG, log);
  }
  return false;
}

// ─── Progress helpers ─────────────────────────────────────────
// Calculate estimated 1 rep max using Epley formula
export function calculateE1RM(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Get progress trend for a specific exercise over the last N sessions
export async function getExerciseProgressTrend(exerciseId, lastNSessions = 10) {
  const sessions = await getSessionsForExercise(exerciseId);
  const sorted = sessions
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-lastNSessions);

  return sorted.map(session => {
    const exerciseData = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exerciseData) return null;
    const bestSet = exerciseData.sets.reduce((best, set) => {
      const e1rm = calculateE1RM(set.weight, set.reps);
      return e1rm > calculateE1RM(best.weight, best.reps) ? set : best;
    }, exerciseData.sets[0]);

    return {
      date: session.date,
      bestWeight: bestSet?.weight || 0,
      bestReps: bestSet?.reps || 0,
      e1RM: bestSet ? calculateE1RM(bestSet.weight, bestSet.reps) : 0,
      avgRPE: exerciseData.sets.reduce((sum, s) => sum + s.rpe, 0) / exerciseData.sets.length,
      discomfortRating: exerciseData.discomfortRating,
    };
  }).filter(Boolean);
}

// Get the most recent session that included a specific exercise
// Returns { sets, discomfortRating, date } or null
export async function getLastSessionForExercise(exerciseId) {
  const sessions = await getSessionsForExercise(exerciseId);
  if (!sessions.length) return null;
  const sorted = sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastSession = sorted[0];
  const exerciseData = lastSession.exercises.find(e => e.exerciseId === exerciseId);
  return exerciseData
    ? { sets: exerciseData.sets, discomfortRating: exerciseData.discomfortRating, date: lastSession.date }
    : null;
}

// Replace one exercise with another in a specific split day
export async function swapExerciseInProgram(dayLabel, oldExerciseId, newExerciseId) {
  const program = await getCurrentProgram();
  if (!program) return false;

  const updatedSplitDays = program.splitDays.map(day => {
    if (day.dayLabel !== dayLabel) return day;
    return {
      ...day,
      exercises: day.exercises.map(ex =>
        ex.exerciseId === oldExerciseId
          ? { ...ex, exerciseId: newExerciseId, addedAt: new Date().toISOString() }
          : ex
      ),
    };
  });

  return saveCurrentProgram({ ...program, splitDays: updatedSplitDays });
}

// ─── Custom exercises ─────────────────────────────────────────────────────────
const CUSTOM_EXERCISES_KEY = 'customExercises';

export async function getCustomExercises() {
  const data = await getItem(CUSTOM_EXERCISES_KEY);
  return data || [];
}

export async function saveCustomExercise(exercise) {
  const existing = await getCustomExercises();
  const idx = existing.findIndex(e => e.id === exercise.id);
  if (idx >= 0) {
    existing[idx] = exercise;
  } else {
    existing.push(exercise);
  }
  return setItem(CUSTOM_EXERCISES_KEY, existing);
}

export async function deleteCustomExercise(id) {
  const existing = await getCustomExercises();
  return setItem(CUSTOM_EXERCISES_KEY, existing.filter(e => e.id !== id));
}

// Move an exercise up or down within a split day
export async function reorderExerciseInProgram(dayLabel, exerciseId, direction) {
  const program = await getCurrentProgram();
  if (!program) return false;

  const updatedSplitDays = program.splitDays.map(day => {
    if (day.dayLabel !== dayLabel) return day;
    const exercises = [...day.exercises];
    const currentIndex = exercises.findIndex(ex => ex.exerciseId === exerciseId);
    if (currentIndex === -1) return day;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return day;
    [exercises[currentIndex], exercises[targetIndex]] = [exercises[targetIndex], exercises[currentIndex]];
    return { ...day, exercises };
  });

  return saveCurrentProgram({ ...program, splitDays: updatedSplitDays });
}

// ─── Clear all data (dev/testing only) ────────────────────────
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    return true;
  } catch (e) {
    console.error('Error clearing data:', e);
    return false;
  }
}

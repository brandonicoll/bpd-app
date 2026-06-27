import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentProgram,
  getAllSessions,
  getStreak,
  getAllCheckIns,
  checkFallbackWeekAdvance,
} from '../services/storage';
import { getCurrentBlockInfo } from '../services/programEngine';
import { isThisWeek, currentWeekKey } from '../utils/dateHelpers';

export function useHomeData() {
  const [data, setData] = useState({
    program: null,
    blockInfo: null,
    allSessions: [],
    sessionsThisWeek: [],
    streak: null,
    showNutritionCheckIn: false,
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      await checkFallbackWeekAdvance();
      const [program, allSessions, streak, checkIns] = await Promise.all([
        getCurrentProgram(),
        getAllSessions(),
        getStreak(),
        getAllCheckIns(),
      ]);

      const sessionsThisWeek = allSessions.filter(s => isThisWeek(s.date));
      const blockInfo = program ? getCurrentBlockInfo(program.currentBlock) : null;
      const weekKey = currentWeekKey();
      const hasCheckedInThisWeek = checkIns.some(c => c.weekStartDate === weekKey);
      const todayIsSunday = new Date().getDay() === 0;
      const showNutritionCheckIn = todayIsSunday && !hasCheckedInThisWeek;

      setData({
        program,
        blockInfo,
        allSessions,
        sessionsThisWeek,
        streak,
        showNutritionCheckIn,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      console.error('useHomeData error:', e);
      setData(prev => ({ ...prev, isLoading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refresh: load };
}

// Determine which split day is "up next" based on the last logged session.
// Uses rotation position rather than what's been done this week, so skipped
// workouts don't cause the app to replay them.
export function getNextSession(program, allSessions) {
  if (!program || !program.splitDays || program.splitDays.length === 0) return null;

  const splitDays = program.splitDays;

  if (!allSessions || allSessions.length === 0) return splitDays[0];

  // Find the most recently logged session
  const lastSession = [...allSessions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];

  // Find its position in the current split rotation
  const lastIndex = splitDays.findIndex(d => d.dayLabel === lastSession.splitDayLabel);

  if (lastIndex === -1) {
    // Last session's dayLabel doesn't match the current program (split changed, etc.)
    return splitDays[0];
  }

  // Advance one step in the rotation, wrapping back to the start
  return splitDays[(lastIndex + 1) % splitDays.length];
}

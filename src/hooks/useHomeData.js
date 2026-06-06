import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentProgram,
  getAllSessions,
  getStreak,
  getAllCheckIns,
} from '../services/storage';
import { getCurrentBlockInfo } from '../services/programEngine';
import { isThisWeek, currentWeekKey } from '../utils/dateHelpers';

export function useHomeData() {
  const [data, setData] = useState({
    program: null,
    blockInfo: null,
    sessionsThisWeek: [],
    streak: null,
    showNutritionCheckIn: false,
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
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

// Determine which split day is "up next" for the user this week
export function getNextSession(program, sessionsThisWeek) {
  if (!program || !program.splitDays) return null;

  // Get the dayLabels already completed this week
  const completedDayLabels = sessionsThisWeek.map(s => s.splitDayLabel);

  // Find the first split day not yet done this week
  const nextDay = program.splitDays.find(
    day => !completedDayLabels.includes(day.dayLabel)
  );

  return nextDay || null; // null means all sessions done this week
}

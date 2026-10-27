import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveSession,
  getAllSessions,
  getSessionsForExercise,
  getCustomExercises,
  saveCustomExercise,
  deleteCustomExercise,
  swapExerciseInProgram,
  reorderExerciseInProgram,
  saveCurrentProgram,
  getCurrentProgram,
  updateStreak,
  getStreak,
  calculateE1RM,
  restartProgram,
  getLastSessionsForExercises,
  getLastSessionNote,
  saveActivity,
  getActivityLog,
  KEYS,
} from '../../../src/services/storage';
import { makeProgram, makeSession, makeSets } from '../../helpers/factories';

beforeEach(() => {
  AsyncStorage._reset();
  jest.clearAllMocks();
});

describe('calculateE1RM', () => {
  it('returns weight for 1 rep', () => {
    expect(calculateE1RM(100, 1)).toBe(100);
  });

  it('calculates correctly for 80kg × 10 reps', () => {
    expect(calculateE1RM(80, 10)).toBe(107);
  });

  it('is always >= the weight used', () => {
    expect(calculateE1RM(60, 5)).toBeGreaterThanOrEqual(60);
  });
});

describe('session storage', () => {
  it('saves and retrieves a session', async () => {
    const session = makeSession('hack_squat', makeSets(100, 8), '2026-01-07T10:00:00.000Z');
    await saveSession(session);
    const sessions = await getAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(session.id);
  });

  it('updates an existing session when saved with same id', async () => {
    const session = makeSession('hack_squat', makeSets(100, 8), '2026-01-07T10:00:00.000Z');
    await saveSession(session);
    await saveSession({ ...session, splitDayLabel: 'Lower B' });
    const sessions = await getAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].splitDayLabel).toBe('Lower B');
  });

  it('returns empty array when no sessions exist', async () => {
    expect(await getAllSessions()).toEqual([]);
  });

  it('filters sessions by exercise id', async () => {
    const s1 = makeSession('hack_squat',    makeSets(100, 8),  '2026-01-07T10:00:00.000Z');
    const s2 = makeSession('leg_extension', makeSets(60, 12), '2026-01-08T10:00:00.000Z');
    await saveSession(s1);
    await saveSession(s2);
    const results = await getSessionsForExercise('hack_squat');
    expect(results).toHaveLength(1);
    expect(results[0].exercises[0].exerciseId).toBe('hack_squat');
  });
});

describe('program storage', () => {
  it('saves and retrieves current program', async () => {
    const program = makeProgram();
    await saveCurrentProgram(program);
    const retrieved = await getCurrentProgram();
    expect(retrieved.id).toBe(program.id);
    expect(retrieved.splitType).toBe(program.splitType);
  });

  it('returns null when no program exists', async () => {
    expect(await getCurrentProgram()).toBeNull();
  });
});

describe('swapExerciseInProgram', () => {
  it('replaces the correct exercise in the correct day', async () => {
    await saveCurrentProgram(makeProgram());
    await swapExerciseInProgram('Upper A', 'incline_smith_press', 'flat_machine_press');
    const updated = await getCurrentProgram();
    const ids = updated.splitDays.find(d => d.dayLabel === 'Upper A').exercises.map(e => e.exerciseId);
    expect(ids).not.toContain('incline_smith_press');
    expect(ids).toContain('flat_machine_press');
  });

  it('sets addedAt to current time on the swapped exercise', async () => {
    await saveCurrentProgram(makeProgram());
    const before = new Date();
    await swapExerciseInProgram('Upper A', 'incline_smith_press', 'flat_machine_press');
    const updated = await getCurrentProgram();
    const swapped = updated.splitDays
      .find(d => d.dayLabel === 'Upper A').exercises
      .find(e => e.exerciseId === 'flat_machine_press');
    expect(new Date(swapped.addedAt) >= before).toBe(true);
  });

  it('does not modify other days', async () => {
    const program = makeProgram();
    await saveCurrentProgram(program);
    const originalIds = program.splitDays.find(d => d.dayLabel === 'Lower A').exercises.map(e => e.exerciseId);
    await swapExerciseInProgram('Upper A', 'incline_smith_press', 'flat_machine_press');
    const updated = await getCurrentProgram();
    const updatedIds = updated.splitDays.find(d => d.dayLabel === 'Lower A').exercises.map(e => e.exerciseId);
    expect(updatedIds).toEqual(originalIds);
  });

  it('preserves sets, repRange, and rpe on the swapped exercise', async () => {
    const program = makeProgram();
    await saveCurrentProgram(program);
    const original = program.splitDays.find(d => d.dayLabel === 'Upper A').exercises
      .find(e => e.exerciseId === 'incline_smith_press');
    await swapExerciseInProgram('Upper A', 'incline_smith_press', 'flat_machine_press');
    const updated = await getCurrentProgram();
    const swapped = updated.splitDays.find(d => d.dayLabel === 'Upper A').exercises
      .find(e => e.exerciseId === 'flat_machine_press');
    expect(swapped.sets).toBe(original.sets);
    expect(swapped.repRange).toEqual(original.repRange);
    expect(swapped.rpe).toBe(original.rpe);
  });
});

describe('reorderExerciseInProgram', () => {
  it('moves an exercise up one position', async () => {
    await saveCurrentProgram(makeProgram());
    // cable_lateral_raise is at index 2 in Upper A
    await reorderExerciseInProgram('Upper A', 'cable_lateral_raise', 'up');
    const updated = await getCurrentProgram();
    const ids = updated.splitDays.find(d => d.dayLabel === 'Upper A').exercises.map(e => e.exerciseId);
    expect(ids.indexOf('cable_lateral_raise')).toBe(1);
  });

  it('moves an exercise down one position', async () => {
    await saveCurrentProgram(makeProgram());
    // incline_smith_press is at index 0
    await reorderExerciseInProgram('Upper A', 'incline_smith_press', 'down');
    const updated = await getCurrentProgram();
    const ids = updated.splitDays.find(d => d.dayLabel === 'Upper A').exercises.map(e => e.exerciseId);
    expect(ids.indexOf('incline_smith_press')).toBe(1);
  });

  it('does nothing when moving first exercise up', async () => {
    const program = makeProgram();
    await saveCurrentProgram(program);
    const before = program.splitDays.find(d => d.dayLabel === 'Upper A').exercises.map(e => e.exerciseId);
    await reorderExerciseInProgram('Upper A', 'incline_smith_press', 'up');
    const after = (await getCurrentProgram()).splitDays.find(d => d.dayLabel === 'Upper A').exercises.map(e => e.exerciseId);
    expect(after).toEqual(before);
  });

  it('does nothing when moving last exercise down', async () => {
    const program = makeProgram();
    await saveCurrentProgram(program);
    const exercises = program.splitDays.find(d => d.dayLabel === 'Upper A').exercises;
    const lastId = exercises[exercises.length - 1].exerciseId;
    const before = exercises.map(e => e.exerciseId);
    await reorderExerciseInProgram('Upper A', lastId, 'down');
    const after = (await getCurrentProgram()).splitDays.find(d => d.dayLabel === 'Upper A').exercises.map(e => e.exerciseId);
    expect(after).toEqual(before);
  });
});

describe('custom exercises', () => {
  const testExercise = {
    id: 'custom_test_1',
    name: 'Test Custom Exercise',
    jointActions: ['horizontal_shoulder_adduction'],
    muscles: [],
    defaultRepRange: [8, 12],
    defaultRPE: 8,
    notes: '',
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  it('saves and retrieves a custom exercise', async () => {
    await saveCustomExercise(testExercise);
    const list = await getCustomExercises();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(testExercise.id);
  });

  it('updates an existing custom exercise', async () => {
    await saveCustomExercise(testExercise);
    await saveCustomExercise({ ...testExercise, name: 'Updated Name' });
    const list = await getCustomExercises();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Updated Name');
  });

  it('deletes a custom exercise by id', async () => {
    await saveCustomExercise(testExercise);
    await deleteCustomExercise(testExercise.id);
    expect(await getCustomExercises()).toHaveLength(0);
  });

  it('returns empty array when no custom exercises exist', async () => {
    expect(await getCustomExercises()).toEqual([]);
  });
});

describe('streak calculation', () => {
  it('starts at 0 with no history', async () => {
    expect((await getStreak()).currentStreak).toBe(0);
  });

  it('increments to 1 after first session in a week', async () => {
    await updateStreak({ weekStartDate: '2026-01-05', planned: 4 });
    expect((await getStreak()).currentStreak).toBe(1);
  });

  it('increments completed count for same week without adding a new week entry', async () => {
    await updateStreak({ weekStartDate: '2026-01-05', planned: 4 });
    await updateStreak({ weekStartDate: '2026-01-05', planned: 4 });
    const streak = await getStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.weeklyCompletionHistory).toHaveLength(1);
    expect(streak.weeklyCompletionHistory[0].completed).toBe(2);
  });

  it('tracks longest streak correctly', async () => {
    await updateStreak({ weekStartDate: '2026-01-05', planned: 4 });
    await updateStreak({ weekStartDate: '2026-01-12', planned: 4 });
    expect((await getStreak()).longestStreak).toBe(2);
  });
});

describe('restartProgram', () => {
  async function seedTrainingRun() {
    await saveCurrentProgram(makeProgram({ currentBlock: 3, currentWeek: 7, mesocycle: 2 }));
    await swapExerciseInProgram('Upper A', 'incline_smith_press', 'flat_db_press');
    await AsyncStorage.setItem(KEYS.HAS_COMPLETED_ONBOARDING, 'true');
    await saveSession(makeSession('hack_squat', makeSets(100, 8), '2026-01-07T10:00:00.000Z'));
    await saveActivity({ id: 'a1', date: '2026-01-08T10:00:00.000Z', type: 'running', region: 'lower', durationMinutes: 30, intensity: 2 });
    await saveCustomExercise({ id: 'custom_1', name: 'My Press', jointActions: ['elbow_extension'], defaultRepRange: [8, 12] });
  }

  it('keeps the edited program but resets it to week 1 and wipes training data', async () => {
    await seedTrainingRun();
    await restartProgram({ keepProgram: true });

    const program = await getCurrentProgram();
    expect(program).toMatchObject({ currentBlock: 1, currentWeek: 1, mesocycle: 1 });
    expect(program.splitDays[0].exercises[0].exerciseId).toBe('flat_db_press');
    expect(await getAllSessions()).toEqual([]);
    expect(await getActivityLog()).toEqual([]);
    expect(await AsyncStorage.getItem(KEYS.HAS_COMPLETED_ONBOARDING)).toBe('true');
    expect(await getCustomExercises()).toHaveLength(1);
  });

  it('clears the program and onboarding flag when choosing a starter program', async () => {
    await seedTrainingRun();
    await restartProgram({ keepProgram: false });

    expect(await getCurrentProgram()).toBeNull();
    expect(await AsyncStorage.getItem(KEYS.HAS_COMPLETED_ONBOARDING)).toBeNull();
    expect(await getAllSessions()).toEqual([]);
    expect(await getCustomExercises()).toHaveLength(1);
  });
});

describe('previous notes', () => {
  it('returns the most recent non-empty exercise note, even if the last session had none', async () => {
    const older = makeSession('hack_squat', makeSets(100, 8), '2026-01-07T10:00:00.000Z');
    older.exercises[0].notes = 'Feet higher on the platform';
    const newer = makeSession('hack_squat', makeSets(102.5, 8), '2026-01-10T10:00:00.000Z');
    await saveSession(older);
    await saveSession(newer);

    const result = (await getLastSessionsForExercises(['hack_squat'])).hack_squat;
    expect(result.date).toBe('2026-01-10T10:00:00.000Z');
    expect(result.lastNote).toEqual({ text: 'Feet higher on the platform', date: '2026-01-07T10:00:00.000Z' });
  });

  it('returns the last session note for the same split day only', async () => {
    await saveSession({ ...makeSession('hack_squat', makeSets(100, 8), '2026-01-07T10:00:00.000Z'), splitDayLabel: 'Lower A', note: 'Knee felt good' });
    await saveSession({ ...makeSession('incline_smith_press', makeSets(60, 8), '2026-01-09T10:00:00.000Z'), splitDayLabel: 'Upper A', note: 'Short on time' });

    expect(await getLastSessionNote('Lower A')).toEqual({ text: 'Knee felt good', date: '2026-01-07T10:00:00.000Z' });
    expect(await getLastSessionNote('Lower B')).toBeNull();
  });
});

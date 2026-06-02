import { runAdjustmentEngine, REC_TYPES, SEVERITY } from '../../../src/services/adjustmentEngine';
import * as storage from '../../../src/services/storage';
import { makeProgram, makeSession, makeSets, makeCheckIn } from '../../helpers/factories';

jest.mock('../../../src/services/storage', () => ({
  getCurrentProgram: jest.fn(),
  getAllSessions: jest.fn(),
  getAllCheckIns: jest.fn(),
}));

function setStorageMocks({ program, sessions = [], checkIns = [] }) {
  storage.getCurrentProgram.mockResolvedValue(program);
  storage.getAllSessions.mockResolvedValue(sessions);
  storage.getAllCheckIns.mockResolvedValue(checkIns);
}

// ─── No program ───────────────────────────────────────────────────────────────
describe('runAdjustmentEngine — no program', () => {
  it('returns empty results when no program exists', async () => {
    setStorageMocks({ program: null });
    const result = await runAdjustmentEngine();
    expect(result.recommendations).toEqual([]);
    expect(result.exerciseTrends).toEqual([]);
    expect(result.program).toBeNull();
  });
});

// ─── No sessions ──────────────────────────────────────────────────────────────
describe('runAdjustmentEngine — no sessions', () => {
  it('returns no recommendations with no sessions logged', async () => {
    setStorageMocks({ program: makeProgram({ currentBlock: 4 }) });
    const result = await runAdjustmentEngine();
    expect(result.recommendations).toHaveLength(0);
  });

  it('marks all exercises as no_data in trends', async () => {
    setStorageMocks({ program: makeProgram() });
    const result = await runAdjustmentEngine();
    result.exerciseTrends.forEach(t => {
      expect(t.trend).toBe('no_data');
      expect(t.sessionsLogged).toBe(0);
    });
  });
});

// ─── Discomfort rule ──────────────────────────────────────────────────────────
describe('discomfort rule — always active', () => {
  function makeDiscomfortSessions(exerciseId, rating, count = 3) {
    return Array.from({ length: count }, (_, i) =>
      makeSession(exerciseId, makeSets(100, 8), `2026-01-0${i + 7}T10:00:00.000Z`, rating)
    );
  }

  it('flags exercise with avg discomfort ≥ 7 across last 3 sessions', async () => {
    const program = makeProgram({ currentBlock: 1 });
    setStorageMocks({ program, sessions: makeDiscomfortSessions('incline_smith_press', 8, 3) });
    const result = await runAdjustmentEngine();
    const rec = result.recommendations.find(r => r.type === REC_TYPES.DISCOMFORT_SWAP);
    expect(rec).toBeDefined();
    expect(rec.exerciseId).toBe('incline_smith_press');
    expect(rec.severity).toBe(SEVERITY.URGENT);
  });

  it('does not flag exercise with avg discomfort < 7', async () => {
    const program = makeProgram({ currentBlock: 1 });
    setStorageMocks({ program, sessions: makeDiscomfortSessions('incline_smith_press', 4, 3) });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.DISCOMFORT_SWAP)).toBeUndefined();
  });

  it('does not flag with only 1 high-discomfort session', async () => {
    const program = makeProgram({ currentBlock: 1 });
    setStorageMocks({ program, sessions: makeDiscomfortSessions('incline_smith_press', 9, 1) });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.DISCOMFORT_SWAP)).toBeUndefined();
  });

  it('fires during Block 1 — not gated behind Block 4', async () => {
    const program = makeProgram({ currentBlock: 1 });
    setStorageMocks({ program, sessions: makeDiscomfortSessions('incline_smith_press', 8, 3) });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.DISCOMFORT_SWAP)).toBeDefined();
  });
});

// ─── Progress stall rule ──────────────────────────────────────────────────────
describe('progress stall rule — Block 4 only', () => {
  // Using reps: '1' so e1RM == weight, making values predictable
  function makeProgressSessions(exerciseId, weights, dates) {
    return weights.map((w, i) =>
      makeSession(exerciseId, [{ weight: String(w), reps: '1', rpe: 8, completedAt: dates[i] }], dates[i])
    );
  }

  const dates = [
    '2026-01-01T10:00:00.000Z', '2026-01-08T10:00:00.000Z',
    '2026-01-15T10:00:00.000Z', '2026-01-22T10:00:00.000Z',
  ];

  it('does NOT flag stalls during Block 3', async () => {
    const program = makeProgram({ currentBlock: 3, trainingAge: 'intermediate' });
    setStorageMocks({ program, sessions: makeProgressSessions('incline_smith_press', [100, 100, 100, 100], dates) });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.PROGRESS_STALL)).toBeUndefined();
  });

  it('flags stall during Block 4 when e1RM is flat across threshold sessions', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: makeProgressSessions('incline_smith_press', [100, 100, 101, 100], dates),
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });
    const result = await runAdjustmentEngine();
    // RPE 8 + low discomfort → routes to INCREASE_VOLUME (stimulus limiter, not fatigue)
    const rec = result.recommendations.find(r => r.exerciseId === 'incline_smith_press');
    expect(rec).toBeDefined();
    expect([REC_TYPES.INCREASE_VOLUME, REC_TYPES.PROGRESS_STALL]).toContain(rec.type);
  });

  it('does NOT flag stall when progress is > 2.5%', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: makeProgressSessions('incline_smith_press', [100, 102, 104, 105], dates),
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.PROGRESS_STALL)).toBeUndefined();
  });

  it('surfaces nutrition flag when nutrition is consistently poor', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: makeProgressSessions('incline_smith_press', [100, 100, 100, 100], dates),
      checkIns: [
        makeCheckIn(1, '2026-01-05'),
        makeCheckIn(1, '2026-01-12'),
        makeCheckIn(1, '2026-01-19'),
        makeCheckIn(1, '2026-01-26'),
      ],
    });
    const result = await runAdjustmentEngine();
    const rec = result.recommendations.find(r => r.type === REC_TYPES.NUTRITION_FLAG);
    expect(rec).toBeDefined();
    expect(rec.severity).toBe(SEVERITY.URGENT);
  });

  it('beginner threshold is 2 sessions — flags faster than intermediate', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'beginner' });
    setStorageMocks({
      program,
      sessions: makeProgressSessions('incline_smith_press', [100, 100], dates.slice(0, 2)),
      checkIns: [makeCheckIn(3, '2026-01-05')],
    });
    const result = await runAdjustmentEngine();
    // RPE 8 + low discomfort → INCREASE_VOLUME; either way a stall rec fires at 2 sessions
    const rec = result.recommendations.find(r => r.exerciseId === 'incline_smith_press');
    expect(rec).toBeDefined();
  });

  it('advanced threshold is 8 sessions — does NOT flag after only 4', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'advanced' });
    setStorageMocks({
      program,
      sessions: makeProgressSessions('incline_smith_press', [100, 100, 100, 100], dates),
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.PROGRESS_STALL)).toBeUndefined();
    expect(result.recommendations.find(r => r.type === REC_TYPES.INCREASE_VOLUME)).toBeUndefined();
  });

  it('recommends INCREASE_VOLUME when stalling with low RPE and low discomfort', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });

    const sessions = dates.map((date, i) => ({
      id: `session-${i}`,
      date,
      splitDayLabel: 'Upper A',
      startTime: date,
      endTime: date,
      exercises: [{
        exerciseId: 'incline_smith_press',
        discomfortRating: 1,
        sets: [
          { weight: '100', reps: '1', rpe: 7, completedAt: date },
          { weight: '100', reps: '1', rpe: 7, completedAt: date },
        ],
      }],
    }));

    setStorageMocks({
      program,
      sessions,
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });

    const result = await runAdjustmentEngine();
    const volumeRec = result.recommendations.find(r => r.type === REC_TYPES.INCREASE_VOLUME);

    expect(volumeRec).toBeDefined();
    expect(volumeRec.exerciseId).toBe('incline_smith_press');
    expect(volumeRec.title).toContain('Add a set');
  });

  it('recommends PROGRESS_STALL (not INCREASE_VOLUME) when stalling with high RPE', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });

    const sessions = dates.map((date, i) => ({
      id: `session-${i}`,
      date,
      splitDayLabel: 'Upper A',
      startTime: date,
      endTime: date,
      exercises: [{
        exerciseId: 'incline_smith_press',
        discomfortRating: 1,
        sets: [
          { weight: '100', reps: '1', rpe: 9.5, completedAt: date },
          { weight: '100', reps: '1', rpe: 9.5, completedAt: date },
        ],
      }],
    }));

    setStorageMocks({
      program,
      sessions,
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });

    const result = await runAdjustmentEngine();

    const volumeRec = result.recommendations.find(r => r.type === REC_TYPES.INCREASE_VOLUME);
    const stallRec  = result.recommendations.find(r => r.type === REC_TYPES.PROGRESS_STALL);

    expect(volumeRec).toBeUndefined();
    expect(stallRec).toBeDefined();
  });

  it('INCREASE_VOLUME does not fire when discomfort is high even with low RPE', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });

    const sessions = dates.map((date, i) => ({
      id: `session-${i}`,
      date,
      splitDayLabel: 'Upper A',
      startTime: date,
      endTime: date,
      exercises: [{
        exerciseId: 'incline_smith_press',
        discomfortRating: 8,
        sets: [
          { weight: '100', reps: '1', rpe: 7, completedAt: date },
          { weight: '100', reps: '1', rpe: 7, completedAt: date },
        ],
      }],
    }));

    setStorageMocks({
      program,
      sessions,
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });

    const result = await runAdjustmentEngine();
    const volumeRec = result.recommendations.find(r => r.type === REC_TYPES.INCREASE_VOLUME);

    expect(volumeRec).toBeUndefined();
  });
});

// ─── Reorder rule ─────────────────────────────────────────────────────────────
describe('exercise order / reorder rule — Block 4 only', () => {
  const dates = [
    '2026-01-01T10:00:00.000Z', '2026-01-08T10:00:00.000Z',
    '2026-01-15T10:00:00.000Z', '2026-01-22T10:00:00.000Z',
  ];

  function makeReorderSessions(earlyId, lateId, earlyWeights, lateWeights) {
    return dates.map((date, i) => ({
      id: `session-${i}`,
      date,
      splitDayLabel: 'Upper A',
      startTime: date,
      endTime: date,
      exercises: [
        { exerciseId: earlyId, discomfortRating: 1, sets: [{ weight: String(earlyWeights[i]), reps: '1', rpe: 8, completedAt: date }] },
        { exerciseId: lateId,  discomfortRating: 1, sets: [{ weight: String(lateWeights[i]),  reps: '1', rpe: 8, completedAt: date }] },
      ],
    }));
  }

  it('recommends reorder when late exercise stalls and early one progresses', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: makeReorderSessions(
        'incline_smith_press', 'incline_bicep_curl',
        [100, 103, 106, 110], // early: +10%
        [60,  60,  61,  60],  // late: flat
      ),
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });
    const result = await runAdjustmentEngine();
    const rec = result.recommendations.find(r => r.type === REC_TYPES.REORDER_EXERCISE);
    expect(rec).toBeDefined();
    expect(rec.exerciseId).toBe('incline_bicep_curl');
  });

  it('does NOT recommend reorder during Block 3', async () => {
    const program = makeProgram({ currentBlock: 3, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: makeReorderSessions(
        'incline_smith_press', 'incline_bicep_curl',
        [100, 103, 106, 110],
        [60,  60,  61,  60],
      ),
    });
    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.REORDER_EXERCISE)).toBeUndefined();
  });

  it('reorder rec has correct position info', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: makeReorderSessions(
        'incline_smith_press', 'incline_bicep_curl',
        [100, 103, 106, 110],
        [60,  60,  61,  60],
      ),
      checkIns: [makeCheckIn(3, '2026-01-19')],
    });
    const result = await runAdjustmentEngine();
    const rec = result.recommendations.find(r => r.type === REC_TYPES.REORDER_EXERCISE);
    expect(rec?.currentPosition).toBeGreaterThanOrEqual(2);
    expect(rec?.totalExercises).toBeDefined();
  });
});

// ─── Sorting ──────────────────────────────────────────────────────────────────
describe('recommendation sorting', () => {
  it('urgent recommendations come before normal ones', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    const discomfortSessions = Array.from({ length: 3 }, (_, i) =>
      makeSession('incline_smith_press', makeSets(100, 8), `2026-01-0${i + 7}T10:00:00.000Z`, 8)
    );
    setStorageMocks({
      program,
      sessions: discomfortSessions,
      checkIns: [makeCheckIn(3, '2026-01-05')],
    });
    const { recommendations } = await runAdjustmentEngine();
    const urgentRecs = recommendations.filter(r => r.severity === SEVERITY.URGENT);
    const normalRecs = recommendations.filter(r => r.severity === SEVERITY.NORMAL);
    if (urgentRecs.length > 0 && normalRecs.length > 0) {
      const lastUrgentIdx  = recommendations.lastIndexOf(urgentRecs[urgentRecs.length - 1]);
      const firstNormalIdx = recommendations.indexOf(normalRecs[0]);
      expect(lastUrgentIdx).toBeLessThan(firstNormalIdx);
    }
  });
});

// ─── Fatigue flag ─────────────────────────────────────────────────────────────
describe('fatigue flag rule', () => {
  it('fires FATIGUE_FLAG when avg fatigue ≤ 1.5 across 3 check-ins', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    setStorageMocks({
      program,
      sessions: [],
      checkIns: [
        { weekStartDate: '2026-01-05', fatigueRating: 1, nutritionRating: 3, completedAt: new Date().toISOString() },
        { weekStartDate: '2026-01-12', fatigueRating: 1, nutritionRating: 3, completedAt: new Date().toISOString() },
        { weekStartDate: '2026-01-19', fatigueRating: 1, nutritionRating: 3, completedAt: new Date().toISOString() },
      ],
    });

    const result = await runAdjustmentEngine();
    const fatigueRec = result.recommendations.find(r => r.type === REC_TYPES.FATIGUE_FLAG);
    expect(fatigueRec).toBeDefined();
    expect(fatigueRec.severity).toBe(SEVERITY.URGENT);
  });

  it('does NOT fire when fatigue is adequate (avg > 1.5)', async () => {
    const program = makeProgram({ currentBlock: 4 });
    setStorageMocks({
      program,
      sessions: [],
      checkIns: [
        { weekStartDate: '2026-01-05', fatigueRating: 2, nutritionRating: 3, completedAt: new Date().toISOString() },
        { weekStartDate: '2026-01-12', fatigueRating: 3, nutritionRating: 3, completedAt: new Date().toISOString() },
      ],
    });

    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.FATIGUE_FLAG)).toBeUndefined();
  });

  it('suppresses individual exercise stall recs when fatigue is flagged', async () => {
    const program = makeProgram({ currentBlock: 4, trainingAge: 'intermediate' });
    const dates = [
      '2026-01-01T10:00:00.000Z', '2026-01-08T10:00:00.000Z',
      '2026-01-15T10:00:00.000Z', '2026-01-22T10:00:00.000Z',
    ];
    const sessions = dates.map((date, i) => ({
      id: `s${i}`, date, splitDayLabel: 'Upper A', startTime: date, endTime: date,
      exercises: [{ exerciseId: 'incline_smith_press', discomfortRating: 1,
        sets: [{ weight: '100', reps: '1', rpe: 7, completedAt: date }] }],
    }));
    setStorageMocks({
      program, sessions,
      checkIns: [
        { weekStartDate: '2026-01-05', fatigueRating: 1, nutritionRating: 3, completedAt: new Date().toISOString() },
        { weekStartDate: '2026-01-12', fatigueRating: 1, nutritionRating: 3, completedAt: new Date().toISOString() },
        { weekStartDate: '2026-01-19', fatigueRating: 1, nutritionRating: 3, completedAt: new Date().toISOString() },
      ],
    });

    const result = await runAdjustmentEngine();
    expect(result.recommendations.find(r => r.type === REC_TYPES.FATIGUE_FLAG)).toBeDefined();
    expect(result.recommendations.find(r => r.type === REC_TYPES.INCREASE_VOLUME)).toBeUndefined();
    expect(result.recommendations.find(r => r.type === REC_TYPES.PROGRESS_STALL)).toBeUndefined();
  });
});

// ─── calculateJointActionMetrics ─────────────────────────────────────────────
describe('calculateJointActionMetrics', () => {
  it('aggregates total weekly sets across exercises sharing a joint action', () => {
    const { calculateJointActionMetrics } = require('../../../src/services/adjustmentEngine');
    const { JOINT_ACTIONS } = require('../../../src/data/exercises');

    const program = makeProgram();
    const metrics = calculateJointActionMetrics(program, []);

    const pressMetrics = metrics[JOINT_ACTIONS.HORIZONTAL_SHOULDER_ADDUCTION];
    expect(pressMetrics).toBeDefined();
    expect(pressMetrics.totalWeeklySets).toBeGreaterThan(0);
    expect(pressMetrics.exercises).toContain('incline_smith_press');
  });

  it('marks joint action as fully progressing when all exercises trend upward', () => {
    const { calculateJointActionMetrics } = require('../../../src/services/adjustmentEngine');
    const { JOINT_ACTIONS } = require('../../../src/data/exercises');

    const program = makeProgram();
    const trends = program.splitDays.flatMap(day =>
      day.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseId,
        dayLabel: day.dayLabel,
        sessionsLogged: 5,
        deltaPercent: 8,
        trend: 'progressing',
        avgDiscomfort: 1,
        discomfortFlag: false,
        lastDate: new Date().toISOString(),
      }))
    );

    const metrics = calculateJointActionMetrics(program, trends);
    const pressMetrics = metrics[JOINT_ACTIONS.HORIZONTAL_SHOULDER_ADDUCTION];

    expect(pressMetrics?.isFullyProgressing).toBe(true);
    expect(pressMetrics?.isFullyStalling).toBe(false);
  });
});

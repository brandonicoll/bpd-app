import {
  DISCOUNT_WINDOW_HOURS,
  HEAVY_WEEK_LOAD,
  isQualifyingActivity,
  isExerciseExternallyFatigued,
  isRegionExternallyFatigued,
  getHeavyLoadRegions,
  getWorkoutHeadsUp,
} from '../../../src/services/activityLoad';
import { exercises } from '../../../src/data/exercises';

const def = id => exercises.find(e => e.id === id);
const HOUR = 60 * 60 * 1000;

function activity(overrides = {}) {
  return {
    id: `a-${Math.random()}`,
    date: '2026-03-07T12:00:00.000Z',
    type: 'soccer',
    region: 'lower',
    durationMinutes: 90,
    intensity: 3,
    ...overrides,
  };
}

describe('isQualifyingActivity', () => {
  it('counts any hard activity', () => {
    expect(isQualifyingActivity(activity({ intensity: 3, durationMinutes: 20 }))).toBe(true);
  });
  it('counts moderate activity only when longer than 60 minutes', () => {
    expect(isQualifyingActivity(activity({ intensity: 2, durationMinutes: 60 }))).toBe(false);
    expect(isQualifyingActivity(activity({ intensity: 2, durationMinutes: 61 }))).toBe(true);
  });
  it('never counts easy activity', () => {
    expect(isQualifyingActivity(activity({ intensity: 1, durationMinutes: 180 }))).toBe(false);
  });
});

describe('session discount window', () => {
  const soccer = activity();
  const soccerTime = new Date(soccer.date).getTime();

  it('discounts lower-body lifts inside the window', () => {
    const sessionDate = new Date(soccerTime + 30 * HOUR).toISOString();
    expect(isExerciseExternallyFatigued([soccer], sessionDate, def('hack_squat'))).toBe(true);
  });

  it('does not discount upper-body lifts after a lower-body activity', () => {
    const sessionDate = new Date(soccerTime + 30 * HOUR).toISOString();
    expect(isExerciseExternallyFatigued([soccer], sessionDate, def('incline_smith_press'))).toBe(false);
  });

  it('stops discounting once the window has passed', () => {
    const sessionDate = new Date(soccerTime + (DISCOUNT_WINDOW_HOURS + 1) * HOUR).toISOString();
    expect(isExerciseExternallyFatigued([soccer], sessionDate, def('hack_squat'))).toBe(false);
  });

  it('ignores activities logged after the session', () => {
    const sessionDate = new Date(soccerTime - 2 * HOUR).toISOString();
    expect(isExerciseExternallyFatigued([soccer], sessionDate, def('hack_squat'))).toBe(false);
  });

  it('full-body activity affects every region, including core', () => {
    const hiit = activity({ type: 'hiit', region: 'full' });
    const sessionDate = new Date(soccerTime + 10 * HOUR).toISOString();
    expect(isRegionExternallyFatigued([hiit], sessionDate, 'upper')).toBe(true);
    expect(isRegionExternallyFatigued([hiit], sessionDate, 'core')).toBe(true);
  });
});

describe('getHeavyLoadRegions', () => {
  // Wednesday 2026-03-11; current week starts Mon 2026-03-09, last week Mon 2026-03-02
  const now = new Date('2026-03-11T18:00:00');

  it('flags a region that was heavy both this week and last week', () => {
    const log = [
      activity({ date: new Date('2026-03-03T12:00:00').toISOString(), durationMinutes: 90, intensity: 3 }),
      activity({ date: new Date('2026-03-10T12:00:00').toISOString(), durationMinutes: 90, intensity: 3 }),
    ];
    expect(90 * 3).toBeGreaterThanOrEqual(HEAVY_WEEK_LOAD);
    const heavy = getHeavyLoadRegions(log, now);
    expect(heavy).toEqual([{ region: 'lower', thisWeek: 270, lastWeek: 270 }]);
  });

  it('does not flag when only one week was heavy', () => {
    const log = [activity({ date: new Date('2026-03-10T12:00:00').toISOString() })];
    expect(getHeavyLoadRegions(log, now)).toEqual([]);
  });
});

describe('getWorkoutHeadsUp', () => {
  const now = new Date('2026-03-08T10:00:00.000Z');
  const soccer = activity({ date: '2026-03-07T12:00:00.000Z' });

  it('returns the activity when today trains an affected region', () => {
    expect(getWorkoutHeadsUp([soccer], [def('hack_squat'), def('leg_extension')], now)).toBe(soccer);
  });

  it('returns null when today only trains unaffected regions', () => {
    expect(getWorkoutHeadsUp([soccer], [def('incline_smith_press')], now)).toBeNull();
  });
});

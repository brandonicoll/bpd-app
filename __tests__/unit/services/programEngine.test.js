import {
  buildDefaultProgram,
  getCurrentBlockInfo,
  advanceWeek,
} from '../../../src/services/programEngine';
import { SPLIT_TYPES } from '../../../src/data/splits';

jest.mock('react-native-get-random-values', () => {});
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

describe('buildDefaultProgram', () => {
  const baseProfile = {
    trainingAge: 'intermediate',
    daysPerWeek: 4,
    splitType: SPLIT_TYPES.UPPER_LOWER,
  };

  it('returns a program with correct shape', () => {
    const program = buildDefaultProgram(baseProfile);
    expect(program).toHaveProperty('id');
    expect(program).toHaveProperty('splitType', SPLIT_TYPES.UPPER_LOWER);
    expect(program).toHaveProperty('currentBlock', 1);
    expect(program).toHaveProperty('currentWeek', 1);
    expect(program).toHaveProperty('splitDays');
    expect(program.splitDays).toHaveLength(4);
  });

  it('adds addedAt to every exercise', () => {
    const program = buildDefaultProgram(baseProfile);
    for (const day of program.splitDays) {
      for (const ex of day.exercises) {
        expect(ex).toHaveProperty('addedAt');
        expect(typeof ex.addedAt).toBe('string');
      }
    }
  });

  it('each exercise has sets, repRange, and rpe', () => {
    const program = buildDefaultProgram(baseProfile);
    for (const day of program.splitDays) {
      for (const ex of day.exercises) {
        expect(ex).toHaveProperty('exerciseId');
        expect(ex).toHaveProperty('sets');
        expect(ex.repRange).toHaveLength(2);
        expect(ex.repRange[0]).toBeLessThan(ex.repRange[1]);
        expect(ex).toHaveProperty('rpe');
      }
    }
  });

  it('5 days → PPL/Upper Lower correct day order', () => {
    const program = buildDefaultProgram({
      ...baseProfile,
      daysPerWeek: 5,
      splitType: SPLIT_TYPES.PPL_UPPER_LOWER,
    });
    expect(program.splitDays.map(d => d.dayLabel)).toEqual([
      'Push A', 'Pull A', 'Legs A', 'Upper', 'Lower',
    ]);
  });

  it('6 days → full PPL (Push/Pull/Legs × 2)', () => {
    const program = buildDefaultProgram({
      ...baseProfile,
      daysPerWeek: 6,
      splitType: SPLIT_TYPES.PPL,
    });
    expect(program.splitDays.map(d => d.dayLabel)).toEqual([
      'Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B',
    ]);
  });

  it('Full Body with 2 days uses first 2 days only', () => {
    const program = buildDefaultProgram({
      ...baseProfile,
      daysPerWeek: 2,
      splitType: SPLIT_TYPES.FULL_BODY,
    });
    expect(program.splitDays).toHaveLength(2);
    expect(program.splitDays[0].dayLabel).toBe('Day One');
    expect(program.splitDays[1].dayLabel).toBe('Day Two');
  });

  it("Women's Lower/Upper split starts with Lower A", () => {
    const program = buildDefaultProgram({
      ...baseProfile,
      daysPerWeek: 4,
      splitType: SPLIT_TYPES.LOWER_UPPER_WOMEN,
    });
    expect(program.splitDays[0].dayLabel).toBe('Lower A');
    expect(program.splitDays[1].dayLabel).toBe('Upper A');
  });
});

describe('getCurrentBlockInfo', () => {
  it('returns Block 1 info for block 1', () => {
    const info = getCurrentBlockInfo(1);
    expect(info.blockNumber).toBe(1);
    expect(info.name).toBe('Technique & Control');
    expect(info.allowAdjustments).toBe(false);
  });

  it('returns Block 4 info with adjustments allowed', () => {
    const info = getCurrentBlockInfo(4);
    expect(info.blockNumber).toBe(4);
    expect(info.name).toBe('Optimize & Adjust');
    expect(info.allowAdjustments).toBe(true);
  });

  it('returns Block 1 as fallback for unknown block numbers', () => {
    expect(getCurrentBlockInfo(99).blockNumber).toBe(1);
  });

  it('each block has a hex color string', () => {
    [1, 2, 3, 4].forEach(block => {
      const info = getCurrentBlockInfo(block);
      expect(typeof info.color).toBe('string');
      expect(info.color.startsWith('#')).toBe(true);
    });
  });
});

describe('advanceWeek', () => {
  function p(currentWeek, currentBlock) {
    return { currentWeek, currentBlock, updatedAt: new Date().toISOString() };
  }

  it('increments week by 1', () => {
    expect(advanceWeek(p(1, 1)).currentWeek).toBe(2);
  });

  it('transitions from Block 1 to Block 2 at week 3', () => {
    const result = advanceWeek(p(2, 1));
    expect(result.currentWeek).toBe(3);
    expect(result.currentBlock).toBe(2);
  });

  it('transitions from Block 2 to Block 3 at week 5', () => {
    const result = advanceWeek(p(4, 2));
    expect(result.currentWeek).toBe(5);
    expect(result.currentBlock).toBe(3);
  });

  it('transitions from Block 3 to Block 4 at week 11', () => {
    const result = advanceWeek(p(10, 3));
    expect(result.currentWeek).toBe(11);
    expect(result.currentBlock).toBe(4);
  });

  it('resets to week 5 Block 3 after week 12', () => {
    const result = advanceWeek(p(12, 4));
    expect(result.currentWeek).toBe(5);
    expect(result.currentBlock).toBe(3);
  });

  it('does not mutate the original program object', () => {
    const original = p(1, 1);
    const result = advanceWeek(original);
    expect(original.currentWeek).toBe(1);
    expect(result.currentWeek).toBe(2);
  });

  it('updates the updatedAt timestamp', () => {
    const before = new Date().toISOString();
    const result = advanceWeek(p(1, 1));
    expect(result.updatedAt >= before).toBe(true);
  });
});

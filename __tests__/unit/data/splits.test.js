import {
  SPLIT_RECOMMENDATIONS,
  SPLIT_TYPES,
  SPLITS,
  PLATEAU_THRESHOLDS,
  TRAINING_AGE,
} from '../../../src/data/splits';

describe('SPLIT_RECOMMENDATIONS', () => {
  it('recommends Full Body for 2 days', () => {
    expect(SPLIT_RECOMMENDATIONS[2]).toContain(SPLIT_TYPES.FULL_BODY);
  });

  it('recommends Full Body for 3 days', () => {
    expect(SPLIT_RECOMMENDATIONS[3]).toContain(SPLIT_TYPES.FULL_BODY);
  });

  it('recommends Upper/Lower for 4 days', () => {
    expect(SPLIT_RECOMMENDATIONS[4]).toContain(SPLIT_TYPES.UPPER_LOWER);
  });

  it("recommends Women's split for 4 days", () => {
    expect(SPLIT_RECOMMENDATIONS[4]).toContain(SPLIT_TYPES.LOWER_UPPER_WOMEN);
  });

  it('recommends PPL_UPPER_LOWER (not PPL) for 5 days', () => {
    expect(SPLIT_RECOMMENDATIONS[5]).toContain(SPLIT_TYPES.PPL_UPPER_LOWER);
    expect(SPLIT_RECOMMENDATIONS[5]).not.toContain(SPLIT_TYPES.PPL);
  });

  it('recommends full PPL for 6 days', () => {
    expect(SPLIT_RECOMMENDATIONS[6]).toContain(SPLIT_TYPES.PPL);
  });
});

describe('SPLITS structure', () => {
  it('PPL has exactly 6 days', () => {
    expect(SPLITS[SPLIT_TYPES.PPL].days).toHaveLength(6);
  });

  it('PPL/UL has exactly 5 days', () => {
    expect(SPLITS[SPLIT_TYPES.PPL_UPPER_LOWER].days).toHaveLength(5);
  });

  it('Upper/Lower has exactly 4 days', () => {
    expect(SPLITS[SPLIT_TYPES.UPPER_LOWER].days).toHaveLength(4);
  });

  it("Women's split starts with Lower A", () => {
    expect(SPLITS[SPLIT_TYPES.LOWER_UPPER_WOMEN].days[0].dayLabel).toBe('Lower A');
  });

  it('Full Body has 3 days', () => {
    expect(SPLITS[SPLIT_TYPES.FULL_BODY].days).toHaveLength(3);
  });
});

describe('PLATEAU_THRESHOLDS', () => {
  it('beginner threshold is lowest (2 sessions)', () => {
    expect(PLATEAU_THRESHOLDS[TRAINING_AGE.BEGINNER]).toBe(2);
  });

  it('intermediate threshold is 4 sessions', () => {
    expect(PLATEAU_THRESHOLDS[TRAINING_AGE.INTERMEDIATE]).toBe(4);
  });

  it('advanced threshold is highest (8 sessions)', () => {
    expect(PLATEAU_THRESHOLDS[TRAINING_AGE.ADVANCED]).toBe(8);
    expect(PLATEAU_THRESHOLDS[TRAINING_AGE.ADVANCED]).toBeGreaterThan(
      PLATEAU_THRESHOLDS[TRAINING_AGE.INTERMEDIATE]
    );
  });
});

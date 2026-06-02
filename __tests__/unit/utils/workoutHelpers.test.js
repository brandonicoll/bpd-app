import {
  calculateTotalVolume,
  getBestE1RM,
  getDurationMinutes,
  formatDuration,
  getExerciseRPEGuidance,
} from '../../../src/utils/workoutHelpers';

describe('calculateTotalVolume', () => {
  it('returns 0 for empty sets array', () => {
    expect(calculateTotalVolume([])).toBe(0);
  });

  it('calculates volume correctly for one set', () => {
    expect(calculateTotalVolume([{ weight: '100', reps: '8' }])).toBe(800);
  });

  it('sums across multiple sets', () => {
    const sets = [
      { weight: '100', reps: '8' },
      { weight: '100', reps: '7' },
      { weight: '95',  reps: '6' },
    ];
    expect(calculateTotalVolume(sets)).toBe(100 * 8 + 100 * 7 + 95 * 6);
  });

  it('handles string weights and reps gracefully', () => {
    expect(calculateTotalVolume([{ weight: '80.5', reps: '10' }])).toBeCloseTo(805);
  });

  it('returns 0 for sets with missing weight or reps', () => {
    const sets = [{ weight: '', reps: '8' }, { weight: '80', reps: '' }];
    expect(calculateTotalVolume(sets)).toBe(0);
  });
});

describe('getBestE1RM', () => {
  it('returns 0 for empty sets', () => {
    expect(getBestE1RM([])).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(getBestE1RM(null)).toBe(0);
    expect(getBestE1RM(undefined)).toBe(0);
  });

  it('calculates e1RM correctly — 100kg × 1 = 100', () => {
    expect(getBestE1RM([{ weight: '100', reps: '1' }])).toBe(100);
  });

  it('calculates e1RM correctly — 80kg × 10 = 107', () => {
    // Epley: 80 * (1 + 10/30) = 106.67 → rounds to 107
    expect(getBestE1RM([{ weight: '80', reps: '10' }])).toBe(107);
  });

  it('returns the highest e1RM across multiple sets', () => {
    const sets = [
      { weight: '100', reps: '5' },  // e1RM ≈ 117
      { weight: '90',  reps: '10' }, // e1RM = 120
      { weight: '80',  reps: '8' },  // e1RM ≈ 101
    ];
    expect(getBestE1RM(sets)).toBe(120);
  });
});

describe('getDurationMinutes', () => {
  it('returns 0 for same start and end time', () => {
    const t = new Date().toISOString();
    expect(getDurationMinutes(t, t)).toBe(0);
  });

  it('calculates 60 minutes correctly', () => {
    const start = new Date('2026-01-01T10:00:00').toISOString();
    const end   = new Date('2026-01-01T11:00:00').toISOString();
    expect(getDurationMinutes(start, end)).toBe(60);
  });

  it('rounds to nearest minute', () => {
    const start = new Date('2026-01-01T10:00:00').toISOString();
    const end   = new Date('2026-01-01T10:45:30').toISOString();
    expect(getDurationMinutes(start, end)).toBe(46);
  });
});

describe('formatDuration', () => {
  it('formats minutes under 60 as "X min"', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(1)).toBe('1 min');
  });

  it('formats 60 minutes as "1h"', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats 90 minutes as "1h 30min"', () => {
    expect(formatDuration(90)).toBe('1h 30min');
  });

  it('formats 120 minutes as "2h"', () => {
    expect(formatDuration(120)).toBe('2h');
  });
});

describe('getExerciseRPEGuidance', () => {
  const oldDate    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentDate = new Date(Date.now() -  3 * 24 * 60 * 60 * 1000).toISOString();

  const exConfig    = { exerciseId: 'hack_squat', sets: 2, repRange: [5, 7], rpe: 8, addedAt: oldDate };
  const newExConfig = { ...exConfig, addedAt: recentDate };

  describe('Block 1 — technique phase', () => {
    it('returns block mode for all exercises regardless of addedAt', () => {
      const result = getExerciseRPEGuidance(exConfig, 1);
      expect(result.mode).toBe('block');
      expect(result.label).toBe('3–4 RIR');
    });

    it('includes the prescribed RPE for reference', () => {
      expect(getExerciseRPEGuidance(exConfig, 1).prescribedRPE).toBe(8);
    });

    it('uses green color for technique phase', () => {
      expect(getExerciseRPEGuidance(exConfig, 1).color).toBe('#1D9E75');
    });
  });

  describe('Block 2 — intensity awareness', () => {
    it('returns block mode with RPE 9-10 guidance', () => {
      const result = getExerciseRPEGuidance(exConfig, 2);
      expect(result.mode).toBe('block');
      expect(result.label).toBe('RPE 9–10');
    });

    it('uses blue color for intensity phase', () => {
      expect(getExerciseRPEGuidance(exConfig, 2).color).toBe('#185FA5');
    });
  });

  describe('Block 3 — structured progression', () => {
    it('returns prescribed mode for established exercises', () => {
      const result = getExerciseRPEGuidance(exConfig, 3);
      expect(result.mode).toBe('prescribed');
      expect(result.rpe).toBe(8);
    });

    it('returns block mode for newly swapped exercises (< 14 days)', () => {
      const result = getExerciseRPEGuidance(newExConfig, 3);
      expect(result.mode).toBe('block');
      expect(result.label).toBe('3–4 RIR');
    });

    it('uses amber color for newly swapped exercises', () => {
      expect(getExerciseRPEGuidance(newExConfig, 3).color).toBe('#EF9F27');
    });

    it('shows prescribed RPE for newly swapped exercises', () => {
      expect(getExerciseRPEGuidance(newExConfig, 3).prescribedRPE).toBe(8);
    });
  });

  describe('Block 4 — optimization', () => {
    it('returns prescribed mode for established exercises', () => {
      expect(getExerciseRPEGuidance(exConfig, 4).mode).toBe('prescribed');
    });

    it('returns adaptation block mode for recently swapped exercises', () => {
      expect(getExerciseRPEGuidance(newExConfig, 4).mode).toBe('block');
    });
  });

  describe('Edge cases', () => {
    it('defaults to prescribed mode when addedAt is missing', () => {
      const noDate = { exerciseId: 'test', sets: 2, repRange: [8, 12], rpe: 9 };
      expect(getExerciseRPEGuidance(noDate, 3).mode).toBe('prescribed');
    });

    it('handles null exConfig in Block 1 without throwing', () => {
      expect(() => getExerciseRPEGuidance(null, 1)).not.toThrow();
    });
  });
});

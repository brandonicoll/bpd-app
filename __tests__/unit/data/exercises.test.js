import { exercises, getSwapCandidates, getByJointAction, JOINT_ACTIONS } from '../../../src/data/exercises';

describe('exercises library', () => {
  it('contains at least 30 exercises', () => {
    expect(exercises.length).toBeGreaterThanOrEqual(30);
  });

  it('every exercise has required fields', () => {
    for (const ex of exercises) {
      expect(ex).toHaveProperty('id');
      expect(ex).toHaveProperty('name');
      expect(Array.isArray(ex.jointActions)).toBe(true);
      expect(ex.jointActions.length).toBeGreaterThan(0);
      expect(Array.isArray(ex.muscles)).toBe(true);
      expect(Array.isArray(ex.defaultRepRange)).toBe(true);
      expect(ex.defaultRepRange).toHaveLength(2);
      expect(ex.defaultRepRange[0]).toBeLessThan(ex.defaultRepRange[1]);
      expect(typeof ex.defaultRPE).toBe('number');
    }
  });

  it('has no duplicate exercise IDs', () => {
    const ids = exercises.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains all key BPF split exercises', () => {
    const ids = exercises.map(e => e.id);
    const required = [
      'incline_smith_press', 'hack_squat', 'lat_pulldown',
      'cable_lateral_raise', 'hip_thrust', 'seated_hamstring_curl',
      'leg_extension', 'cable_crunch', 'preacher_curl_machine',
      'straight_leg_calf_raise',
    ];
    for (const id of required) {
      expect(ids).toContain(id);
    }
  });
});

describe('getSwapCandidates', () => {
  it('returns exercises with matching joint actions', () => {
    const candidates = getSwapCandidates('incline_smith_press');
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach(c => {
      const hasSharedAction = c.jointActions.some(
        a => a === JOINT_ACTIONS.HORIZONTAL_SHOULDER_ADDUCTION
      );
      expect(hasSharedAction).toBe(true);
    });
  });

  it('does not include the source exercise itself', () => {
    const ids = getSwapCandidates('incline_smith_press').map(c => c.id);
    expect(ids).not.toContain('incline_smith_press');
  });

  it('returns empty array for unknown exercise ID', () => {
    expect(getSwapCandidates('nonexistent_exercise')).toEqual([]);
  });

  it('lat_pulldown and pull_up share candidates', () => {
    const ids = getSwapCandidates('lat_pulldown').map(c => c.id);
    expect(ids).toContain('pull_up');
  });

  it('hack_squat and squat share candidates', () => {
    const ids = getSwapCandidates('hack_squat').map(c => c.id);
    expect(ids).toContain('squat');
  });
});

describe('getByJointAction', () => {
  it('returns exercises for a valid joint action', () => {
    const results = getByJointAction(JOINT_ACTIONS.ELBOW_FLEXION_SUPINATION);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(ex => {
      expect(ex.jointActions).toContain(JOINT_ACTIONS.ELBOW_FLEXION_SUPINATION);
    });
  });

  it('returns empty array for unknown joint action', () => {
    expect(getByJointAction('unknown_action')).toEqual([]);
  });
});

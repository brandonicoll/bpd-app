export const SPLIT_TYPES = {
  FULL_BODY: 'full_body',
  UPPER_LOWER: 'upper_lower',
  LOWER_UPPER_WOMEN: 'lower_upper_women',
  PPL: 'ppl',
  PPL_UPPER_LOWER: 'ppl_upper_lower',
};

export const SPLIT_RECOMMENDATIONS = {
  2: [SPLIT_TYPES.FULL_BODY],
  3: [SPLIT_TYPES.FULL_BODY],
  4: [SPLIT_TYPES.UPPER_LOWER, SPLIT_TYPES.LOWER_UPPER_WOMEN],
  5: [SPLIT_TYPES.PPL_UPPER_LOWER],
  6: [SPLIT_TYPES.PPL],
};

export const SPLITS = {
  [SPLIT_TYPES.FULL_BODY]: {
    id: SPLIT_TYPES.FULL_BODY,
    name: 'Full Body',
    description: 'Train every muscle group each session. Best for 2–3 days per week.',
    days: [
      { dayLabel: 'Day One' },
      { dayLabel: 'Day Two' },
      { dayLabel: 'Day Three' },
    ],
  },
  [SPLIT_TYPES.UPPER_LOWER]: {
    id: SPLIT_TYPES.UPPER_LOWER,
    name: 'Upper / Lower',
    description: 'Alternate upper and lower body. Best for 4 days per week.',
    days: [
      { dayLabel: 'Upper A' },
      { dayLabel: 'Lower A' },
      { dayLabel: 'Upper B' },
      { dayLabel: 'Lower B' },
    ],
  },
  [SPLIT_TYPES.LOWER_UPPER_WOMEN]: {
    id: SPLIT_TYPES.LOWER_UPPER_WOMEN,
    name: 'Lower / Upper (Women)',
    description: 'Lower-body focused split with more glute and leg volume. Best for 4 days per week.',
    days: [
      { dayLabel: 'Lower A' },
      { dayLabel: 'Upper A' },
      { dayLabel: 'Lower B' },
      { dayLabel: 'Upper B' },
    ],
  },
  [SPLIT_TYPES.PPL]: {
    id: SPLIT_TYPES.PPL,
    name: 'Push / Pull / Legs',
    description: 'Dedicated push, pull, and leg days. Best for 6 days per week.',
    days: [
      { dayLabel: 'Push A' },
      { dayLabel: 'Pull A' },
      { dayLabel: 'Legs A' },
      { dayLabel: 'Push B' },
      { dayLabel: 'Pull B' },
      { dayLabel: 'Legs B' },
    ],
  },
  [SPLIT_TYPES.PPL_UPPER_LOWER]: {
    id: SPLIT_TYPES.PPL_UPPER_LOWER,
    name: 'PPL / Upper Lower',
    description: 'Hybrid of PPL and Upper/Lower. Best for 5 days per week.',
    days: [
      { dayLabel: 'Push A' },
      { dayLabel: 'Pull A' },
      { dayLabel: 'Legs A' },
      { dayLabel: 'Upper' },
      { dayLabel: 'Lower' },
    ],
  },
};

export const TRAINING_AGE = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

export const TRAINING_AGE_LABELS = {
  [TRAINING_AGE.BEGINNER]: 'Beginner (0–1 years)',
  [TRAINING_AGE.INTERMEDIATE]: 'Intermediate (1–3 years)',
  [TRAINING_AGE.ADVANCED]: 'Advanced (4+ years)',
};

export const PLATEAU_THRESHOLDS = {
  [TRAINING_AGE.BEGINNER]: 2,
  [TRAINING_AGE.INTERMEDIATE]: 4,
  [TRAINING_AGE.ADVANCED]: 8,
};

export const PROGRAM_BLOCKS = {
  1: { blockNumber: 1, name: 'Technique & Control', weeks: [1, 2], targetRIR: 4, tempo: '2-1-1', description: 'Focus on form perfection. Controlled tempo, full range of motion. No intensity yet.', allowAdjustments: false },
  2: { blockNumber: 2, name: 'Intensity Awareness', weeks: [3, 4], targetRIR: 1, tempo: '2-1-1', description: 'Find true effort. Push sets to technical failure. Identify overly fatiguing movements.', allowAdjustments: false },
  3: { blockNumber: 3, name: 'Structured Progression', weeks: [5, 10], targetRIR: 2, tempo: '2-1-1', description: 'Run the program as written. Track every session. Do not change exercises or volume.', allowAdjustments: false },
  4: { blockNumber: 4, name: 'Optimize & Adjust', weeks: [11, 12], targetRIR: 2, tempo: '2-1-1', description: "Small intentional tweaks based on your data. Keep your split — refine what isn't working.", allowAdjustments: true },
};

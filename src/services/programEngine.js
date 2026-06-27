import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { SPLIT_TYPES } from '../data/splits';

// Each exercise entry: { exerciseId, sets, repRange: [min, max], rpe }
const BPF_SPLITS = {

  // ── FULL BODY SPLIT ─────────────────────────────────────────────────────
  [SPLIT_TYPES.FULL_BODY]: {
    'Day One': [
      { exerciseId: 'rdl',                       sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'flat_machine_press',         sets: 2, repRange: [7, 10],  rpe: 9 },
      { exerciseId: 'chest_supported_row_wide',   sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'incline_bicep_curl',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'cable_tricep_extension',     sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'leg_extension',              sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Day Two': [
      { exerciseId: 'hack_squat',                 sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'cable_lateral_raise',        sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'incline_smith_press',        sets: 2, repRange: [7, 10],  rpe: 9 },
      { exerciseId: 'preacher_curl_machine',      sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Day Three': [
      { exerciseId: 'hip_thrust',                 sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'seated_close_grip_row',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'machine_shoulder_press',     sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'smith_jm_press',             sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'hammer_curl',                sets: 1, repRange: [7, 11],  rpe: 9 },
    ],
  },

  // ── UPPER / LOWER SPLIT ──────────────────────────────────────────────────
  [SPLIT_TYPES.UPPER_LOWER]: {
    'Upper A': [
      { exerciseId: 'incline_smith_press',        sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'chest_supported_row_wide',   sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'cable_lateral_raise',        sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'single_arm_low_row',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'cable_tricep_extension',     sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'preacher_curl_machine',      sets: 2, repRange: [8, 12],  rpe: 8 },
    ],
    'Lower A': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hack_squat',                 sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'back_extension_45',          sets: 2, repRange: [7, 10],  rpe: 9 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Upper B': [
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'wide_neutral_grip_row',      sets: 2, repRange: [7, 9],   rpe: 9 },
      { exerciseId: 'machine_shoulder_press',     sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'incline_bicep_curl',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'dip_machine',                sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'hammer_curl',                sets: 1, repRange: [7, 11],  rpe: 9 },
    ],
    'Lower B': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hip_thrust',                 sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 3, repRange: [6, 10],  rpe: 9 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'adduction_machine',          sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
  },

  // ── LOWER / UPPER (WOMEN) ────────────────────────────────────────────────
  [SPLIT_TYPES.LOWER_UPPER_WOMEN]: {
    'Lower A': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'rdl',                        sets: 2, repRange: [7, 10],  rpe: 9 },
      { exerciseId: 'hack_squat',                 sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'cable_kickback',             sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Upper A': [
      { exerciseId: 'chest_supported_row_wide',   sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'incline_smith_press',        sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'single_arm_low_row',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'cable_lateral_raise',        sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'cable_tricep_extension',     sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'preacher_curl_machine',      sets: 2, repRange: [8, 12],  rpe: 8 },
    ],
    'Lower B': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hip_thrust',                 sets: 3, repRange: [6, 9],   rpe: 10 },
      { exerciseId: 'leg_extension',              sets: 3, repRange: [6, 10],  rpe: 9 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'adduction_machine',          sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'abductor_machine',           sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Upper B': [
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'machine_shoulder_press',     sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'wide_neutral_grip_row',      sets: 2, repRange: [7, 9],   rpe: 9 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'incline_bicep_curl',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'dip_machine',                sets: 2, repRange: [7, 11],  rpe: 8 },
    ],
  },

  // ── PPL SPLIT ────────────────────────────────────────────────────────────
  [SPLIT_TYPES.PPL]: {
    'Push A': [
      { exerciseId: 'incline_smith_press',        sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'cable_lateral_raise',        sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'cable_tricep_extension',     sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'dip_machine',                sets: 2, repRange: [7, 11],  rpe: 8 },
    ],
    'Pull A': [
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'chest_supported_row_wide',   sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'single_arm_high_low_row',    sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'preacher_curl_machine',      sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Legs A': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hack_squat',                 sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'back_extension_45',          sets: 2, repRange: [7, 10],  rpe: 9 },
    ],
    'Push B': [
      { exerciseId: 'machine_shoulder_press',     sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'dips',                       sets: 2, repRange: [6, 10],  rpe: 9 },
      { exerciseId: 'cable_tricep_extension',     sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'skull_crusher',              sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Pull B': [
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'wide_neutral_grip_row',      sets: 2, repRange: [7, 9],   rpe: 9 },
      { exerciseId: 'single_arm_low_row',         sets: 3, repRange: [6, 10],  rpe: 9 },
      { exerciseId: 'incline_bicep_curl',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'hammer_curl',                sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Legs B': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hip_thrust',                 sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 3, repRange: [6, 10],  rpe: 9 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'adduction_machine',          sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
  },

  // ── PPL / UPPER LOWER SPLIT ──────────────────────────────────────────────
  [SPLIT_TYPES.PPL_UPPER_LOWER]: {
    'Push A': [
      { exerciseId: 'incline_smith_press',        sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'cable_lateral_raise',        sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'cable_tricep_extension',     sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'dip_machine',                sets: 2, repRange: [7, 11],  rpe: 8 },
    ],
    'Pull A': [
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'chest_supported_row_wide',   sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'single_arm_high_low_row',    sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'preacher_curl_machine',      sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Legs A': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hack_squat',                 sets: 2, repRange: [5, 7],   rpe: 8 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'back_extension_45',          sets: 2, repRange: [7, 10],  rpe: 9 },
    ],
    'Upper': [
      { exerciseId: 'lat_pulldown',               sets: 2, repRange: [7, 10],  rpe: 10 },
      { exerciseId: 'machine_fly',                sets: 2, repRange: [6, 10],  rpe: 10 },
      { exerciseId: 'wide_neutral_grip_row',      sets: 2, repRange: [7, 9],   rpe: 9 },
      { exerciseId: 'machine_shoulder_press',     sets: 2, repRange: [8, 12],  rpe: 8 },
      { exerciseId: 'incline_bicep_curl',         sets: 2, repRange: [8, 12],  rpe: 10 },
      { exerciseId: 'dip_machine',                sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'hammer_curl',                sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
    'Lower': [
      { exerciseId: 'straight_leg_calf_raise',    sets: 2, repRange: [8, 12],  rpe: 9 },
      { exerciseId: 'hip_thrust',                 sets: 2, repRange: [6, 9],   rpe: 9 },
      { exerciseId: 'leg_extension',              sets: 3, repRange: [6, 10],  rpe: 9 },
      { exerciseId: 'seated_hamstring_curl',      sets: 2, repRange: [7, 11],  rpe: 9 },
      { exerciseId: 'adduction_machine',          sets: 2, repRange: [7, 11],  rpe: 8 },
      { exerciseId: 'cable_crunch',               sets: 2, repRange: [7, 11],  rpe: 9 },
    ],
  },
};

const SPLIT_DAY_ORDER = {
  [SPLIT_TYPES.FULL_BODY]: ['Day One', 'Day Two', 'Day Three'],
  [SPLIT_TYPES.UPPER_LOWER]: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  [SPLIT_TYPES.LOWER_UPPER_WOMEN]: ['Lower A', 'Upper A', 'Lower B', 'Upper B'],
  [SPLIT_TYPES.PPL]: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'],
  [SPLIT_TYPES.PPL_UPPER_LOWER]: ['Push A', 'Pull A', 'Legs A', 'Upper', 'Lower'],
};

export function buildDefaultProgram(profile) {
  const { trainingAge, daysPerWeek, splitType } = profile;

  const dayOrder = SPLIT_DAY_ORDER[splitType];
  if (!dayOrder) throw new Error(`Unknown splitType: ${splitType}`);

  const activeDays = dayOrder.slice(0, daysPerWeek);

  const programStartDate = new Date().toISOString();

  const splitDays = activeDays.map(dayLabel => ({
    dayLabel,
    exercises: (BPF_SPLITS[splitType][dayLabel] || []).map(exConfig => ({
      ...exConfig,
      addedAt: programStartDate,
    })),
  }));

  return {
    id: uuidv4(),
    splitType,
    trainingAge,
    daysPerWeek,
    startDate: new Date().toISOString(),
    currentBlock: 1,
    currentWeek: 1,
    mesocycle: 1,
    splitDays,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getCurrentBlockInfo(currentBlock) {
  const blocks = {
    1: { blockNumber: 1, name: 'Technique & Control', weeks: '1–2', targetRIR: '3–4', tempo: '2-1-1', description: 'Focus on form perfection. Controlled tempo, full ROM. No intensity yet — build the habit.', allowAdjustments: false, color: '#1D9E75' },
    2: { blockNumber: 2, name: 'Intensity Awareness', weeks: '3–4', targetRIR: '1', tempo: '2-1-1', description: 'Find true effort. Push sets to technical failure. Note which movements feel overly fatiguing.', allowAdjustments: false, color: '#185FA5' },
    3: { blockNumber: 3, name: 'Structured Progression', weeks: '5–10', targetRIR: '2', tempo: '2-1-1', description: 'Run the program as written. Track every session. Do not change exercises or volume — data collection is the goal.', allowAdjustments: false, color: '#534AB7' },
    4: { blockNumber: 4, name: 'Optimize & Adjust', weeks: '11–12', targetRIR: '2', tempo: '2-1-1', description: "Small intentional tweaks based on your data. Keep your split — refine what isn't working.", allowAdjustments: true, color: '#D85A30' },
  };
  return blocks[currentBlock] || blocks[1];
}

export function advanceWeek(program) {
  let { currentWeek, currentBlock, mesocycle = 1 } = program;
  currentWeek += 1;
  if (currentWeek === 3 && currentBlock === 1) currentBlock = 2;
  if (currentWeek === 5 && currentBlock === 2) currentBlock = 3;
  if (currentWeek === 11 && currentBlock === 3) currentBlock = 4;
  if (currentWeek === 13) { currentWeek = 3; currentBlock = 2; mesocycle += 1; }
  return { ...program, currentWeek, currentBlock, mesocycle, updatedAt: new Date().toISOString() };
}

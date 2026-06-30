export const JOINT_ACTIONS_DATA = {
  horizontal_shoulder_adduction: {
    label: 'Horizontal Shoulder Adduction',
    example: 'Bench press, cable fly, pec deck',
  },
  horizontal_humeral_abduction: {
    label: 'Horizontal Humeral Abduction',
    example: 'Barbell row, cable row, chest-supported row',
  },
  shoulder_adduction: {
    label: 'Shoulder Adduction',
    example: 'Pull-up, lat pulldown, cable pullover',
  },
  scapular_retraction: {
    label: 'Scapular Retraction',
    example: 'Face pull, band pull-apart, seated cable row (pause)',
  },
  scapular_elevation: {
    label: 'Scapular Elevation',
    example: 'Barbell shrug, dumbbell shrug, trap bar shrug',
  },
  shoulder_abduction: {
    label: 'Shoulder Abduction',
    example: 'Overhead press, lateral raise, upright row',
  },
  shoulder_flexion: {
    label: 'Shoulder Flexion',
    example: 'Front raise, cable front raise, plate raise',
  },
  elbow_flexion_supination: {
    label: 'Elbow Flexion / Supination',
    example: 'Barbell curl, dumbbell curl, preacher curl',
  },
  elbow_extension: {
    label: 'Elbow Extension',
    example: 'Tricep pushdown, skull crusher, overhead extension',
  },
  knee_extension_nonfixed_hip: {
    label: 'Knee Extension (Non-Fixed Hip)',
    example: 'Squat, leg press, lunge, Bulgarian split squat',
  },
  knee_extension_fixed_hip: {
    label: 'Knee Extension (Fixed Hip)',
    example: 'Leg extension, sissy squat',
  },
  knee_flexion: {
    label: 'Knee Flexion',
    example: 'Leg curl, Nordic curl, glute-ham raise',
  },
  hip_extension_straight_knee: {
    label: 'Hip Extension (Straight Knee)',
    example: 'Romanian deadlift, good morning, hyperextension',
  },
  hip_extension_bent_knee: {
    label: 'Hip Extension (Bent Knee)',
    example: 'Hip thrust, glute bridge, cable kickback',
  },
  hip_adduction: {
    label: 'Hip Adduction',
    example: 'Adductor machine, Copenhagen press',
  },
  hip_abduction: {
    label: 'Hip Abduction',
    example: 'Abductor machine, lateral band walk',
  },
  trunk_flexion: {
    label: 'Trunk Flexion',
    example: 'Cable crunch, crunch machine, leg raise',
  },
  trunk_rotation: {
    label: 'Trunk Rotation',
    example: 'Cable woodchop, landmine twist, Russian twist',
  },
  plantar_flexion: {
    label: 'Plantar Flexion',
    example: 'Calf raise, seated calf raise, leg press calf raise',
  },
  accessory: {
    label: 'Accessory / Isolation',
    example: 'Forearm curl, wrist extension, neck work, grip training',
    isAccessory: true,
  },
};

// Backward-compatible flat map used by adjustmentEngine and other screens
export const JOINT_ACTION_LABELS = Object.fromEntries(
  Object.entries(JOINT_ACTIONS_DATA).map(([k, v]) => [k, v.label])
);

export const JOINT_ACTION_KEYS = Object.keys(JOINT_ACTIONS_DATA);

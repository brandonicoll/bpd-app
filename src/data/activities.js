// Body region an outside activity loads most. 'full' affects every region.
export const ACTIVITY_REGIONS = {
  LOWER: 'lower',
  UPPER: 'upper',
  FULL: 'full',
};

export const REGION_LABELS = {
  lower: 'Lower body',
  upper: 'Upper body',
  full: 'Full body',
};

// Plain-language name used in heads-up copy ("your legs may feel heavier").
export const REGION_BODY_WORDS = {
  lower: 'legs',
  upper: 'upper body',
  full: 'whole body',
};

export const ACTIVITY_TYPES = [
  { id: 'running',      label: 'Running',          icon: 'walk',                region: ACTIVITY_REGIONS.LOWER },
  { id: 'cycling',      label: 'Cycling',          icon: 'bicycle',             region: ACTIVITY_REGIONS.LOWER },
  { id: 'soccer',       label: 'Soccer',           icon: 'football',            region: ACTIVITY_REGIONS.LOWER },
  { id: 'basketball',   label: 'Basketball',       icon: 'basketball',          region: ACTIVITY_REGIONS.LOWER },
  { id: 'swimming',     label: 'Swimming',         icon: 'water',               region: ACTIVITY_REGIONS.UPPER },
  { id: 'climbing',     label: 'Climbing',         icon: 'trending-up',         region: ACTIVITY_REGIONS.UPPER },
  { id: 'martial_arts', label: 'Martial arts',     icon: 'hand-left',           region: ACTIVITY_REGIONS.FULL },
  { id: 'hiit',         label: 'HIIT / Conditioning', icon: 'flash',            region: ACTIVITY_REGIONS.FULL },
  { id: 'hiking',       label: 'Hiking',           icon: 'trail-sign',          region: ACTIVITY_REGIONS.LOWER },
  { id: 'other',        label: 'Other',            icon: 'ellipsis-horizontal', region: null },
];

export const INTENSITY = {
  EASY: 1,
  MODERATE: 2,
  HARD: 3,
};

export const INTENSITY_OPTIONS = [
  { value: INTENSITY.EASY,     label: 'Easy' },
  { value: INTENSITY.MODERATE, label: 'Moderate' },
  { value: INTENSITY.HARD,     label: 'Hard' },
];

export function getActivityType(id) {
  return ACTIVITY_TYPES.find(t => t.id === id) || null;
}

export function getActivityLabel(activity) {
  if (activity.type === 'other' && activity.customLabel) return activity.customLabel;
  return getActivityType(activity.type)?.label || 'Activity';
}

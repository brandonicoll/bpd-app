import { ACTIVITY_REGIONS, INTENSITY } from '../data/activities';
import { getWeekStart } from '../utils/dateHelpers';

// A lifting session within this many hours after a qualifying activity is
// treated as externally fatigued for the regions that activity loaded.
export const DISCOUNT_WINDOW_HOURS = 36;

// Weekly load (minutes × intensity) above which a region counts as heavily
// loaded from outside activity — e.g. two 45-min hard sessions, or three
// 45-min moderate ones.
export const HEAVY_WEEK_LOAD = 240;

const MS_PER_HOUR = 60 * 60 * 1000;

const JOINT_ACTION_REGION = {
  horizontal_shoulder_adduction: 'upper',
  scapular_retraction: 'upper',
  horizontal_humeral_abduction: 'upper',
  shoulder_adduction: 'upper',
  shoulder_abduction: 'upper',
  shoulder_flexion: 'upper',
  scapular_elevation: 'upper',
  elbow_flexion_supination: 'upper',
  elbow_extension: 'upper',
  accessory: 'upper',
  hip_extension_bent_knee: 'lower',
  hip_extension_straight_knee: 'lower',
  knee_extension_fixed_hip: 'lower',
  knee_extension_nonfixed_hip: 'lower',
  knee_flexion: 'lower',
  hip_adduction: 'lower',
  hip_abduction: 'lower',
  plantar_flexion: 'lower',
  trunk_flexion: 'core',
  trunk_rotation: 'core',
};

export function getJointActionRegion(jointAction) {
  return JOINT_ACTION_REGION[jointAction] || null;
}

export function getExerciseRegions(exDef) {
  const regions = new Set();
  for (const ja of exDef?.jointActions || []) {
    const region = getJointActionRegion(ja);
    if (region) regions.add(region);
  }
  return regions;
}

export function activityAffectsRegion(activity, region) {
  return activity.region === ACTIVITY_REGIONS.FULL || activity.region === region;
}

export function isQualifyingActivity(activity) {
  if (activity.intensity === INTENSITY.HARD) return true;
  return activity.intensity === INTENSITY.MODERATE && (activity.durationMinutes || 0) > 60;
}

export function getActivityLoad(activity) {
  return (activity.durationMinutes || 0) * (activity.intensity || 0);
}

// Qualifying activities that happened in the DISCOUNT_WINDOW_HOURS before `date`.
export function getFatiguingActivitiesBefore(activities, date) {
  const target = new Date(date).getTime();
  return activities.filter(a => {
    if (!isQualifyingActivity(a)) return false;
    const elapsed = target - new Date(a.date).getTime();
    return elapsed > 0 && elapsed <= DISCOUNT_WINDOW_HOURS * MS_PER_HOUR;
  });
}

export function isRegionExternallyFatigued(activities, date, region) {
  if (!region) return false;
  return getFatiguingActivitiesBefore(activities, date).some(a => activityAffectsRegion(a, region));
}

export function isExerciseExternallyFatigued(activities, date, exDef) {
  const fatiguing = getFatiguingActivitiesBefore(activities, date);
  if (!fatiguing.length) return false;
  const regions = getExerciseRegions(exDef);
  return [...regions].some(region => fatiguing.some(a => activityAffectsRegion(a, region)));
}

export function getWeeklyRegionLoad(activities, weekStart, region) {
  const start = new Date(weekStart).getTime();
  const end = start + 7 * 24 * MS_PER_HOUR;
  return activities
    .filter(a => {
      const t = new Date(a.date).getTime();
      return t >= start && t < end && activityAffectsRegion(a, region);
    })
    .reduce((sum, a) => sum + getActivityLoad(a), 0);
}

// Regions ('lower' / 'upper') whose outside load was heavy in both the current
// and the previous calendar week. Returns [{ region, thisWeek, lastWeek }].
export function getHeavyLoadRegions(activities, now = new Date()) {
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * MS_PER_HOUR);
  const results = [];
  for (const region of ['lower', 'upper']) {
    const thisWeek = getWeeklyRegionLoad(activities, thisWeekStart, region);
    const lastWeek = getWeeklyRegionLoad(activities, lastWeekStart, region);
    if (thisWeek >= HEAVY_WEEK_LOAD && lastWeek >= HEAVY_WEEK_LOAD) {
      results.push({ region, thisWeek, lastWeek });
    }
  }
  return results;
}

// For the pre-workout heads-up: the most recent qualifying activity in the
// discount window that loaded a region today's exercises train.
export function getWorkoutHeadsUp(activities, exerciseDefs, now = new Date()) {
  const trainedRegions = new Set();
  for (const exDef of exerciseDefs) {
    getExerciseRegions(exDef).forEach(r => trainedRegions.add(r));
  }
  const candidates = getFatiguingActivitiesBefore(activities, now)
    .filter(a => [...trainedRegions].some(r => activityAffectsRegion(a, r)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return candidates[0] || null;
}

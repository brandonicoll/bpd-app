import { calculateE1RM } from '../services/storage';

// Total volume = sum of (weight × reps) across all sets
export function calculateTotalVolume(sets) {
  return sets.reduce((total, set) => {
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps) || 0;
    return total + weight * reps;
  }, 0);
}

// Best e1RM from a set of logged sets
export function getBestE1RM(sets) {
  if (!sets || sets.length === 0) return 0;
  return Math.max(...sets.map(s => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps) || 0;
    return calculateE1RM(w, r);
  }));
}

// Duration in minutes between two Date objects or ISO strings
export function getDurationMinutes(startTime, endTime = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end - start) / 60000);
}

// Format duration as "42 min" or "1h 12min"
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// Format weight for display — strip trailing .0
export function formatWeight(weight) {
  const n = parseFloat(weight);
  if (isNaN(n)) return '';
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

// Discomfort value → display label and color
export function discomfortLabel(rating) {
  if (!rating) return null;
  if (rating <= 2) return { label: 'Felt great',      color: '#1D9E75' };
  if (rating <= 6) return { label: 'Some discomfort', color: '#EF9F27' };
  return             { label: 'Joint pain',       color: '#D85A30' };
}

export const DISCOMFORT_OPTIONS = [
  { value: 1, label: 'Felt great',      shortLabel: 'Great',      color: '#1D9E75', bg: '#E1F5EE' },
  { value: 5, label: 'Some discomfort', shortLabel: 'Discomfort', color: '#EF9F27', bg: '#FAEEDA' },
  { value: 8, label: 'Joint pain',      shortLabel: 'Pain',       color: '#D85A30', bg: '#FAECE7' },
];

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function getExerciseRPEGuidance(exConfig, currentBlock) {
  const addedAt = exConfig?.addedAt ? new Date(exConfig.addedAt) : null;
  const isNewlySwapped = addedAt ? (Date.now() - addedAt.getTime()) < FOURTEEN_DAYS_MS : false;

  if (currentBlock === 1) {
    return {
      mode: 'block',
      label: '3–4 RIR',
      sublabel: "Technique phase — stay controlled, don't push hard yet",
      color: '#1D9E75',
      prescribedRPE: exConfig?.rpe,
    };
  }

  if (currentBlock === 2) {
    return {
      mode: 'block',
      label: 'RPE 9–10',
      sublabel: 'Intensity awareness — push to technical failure this block',
      color: '#185FA5',
      prescribedRPE: exConfig?.rpe,
    };
  }

  if (isNewlySwapped) {
    return {
      mode: 'block',
      label: '3–4 RIR',
      sublabel: 'New movement — take 1–2 sessions to adapt before pushing hard',
      color: '#EF9F27',
      prescribedRPE: exConfig?.rpe,
    };
  }

  return {
    mode: 'prescribed',
    rpe: exConfig?.rpe || 8,
  };
}

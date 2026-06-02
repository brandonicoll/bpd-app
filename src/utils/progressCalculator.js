// Placeholder — progress calculation utilities go here
export function calculateProgress(current, target) {
  if (!target) return 0;
  return Math.min(current / target, 1);
}

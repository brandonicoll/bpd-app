import { startOfWeek, endOfWeek, isWithinInterval, format, isToday, isYesterday, parseISO } from 'date-fns';

// Get the Monday of the week containing the given date
export function getWeekStart(date = new Date()) {
  return startOfWeek(new Date(date), { weekStartsOn: 1 }); // 1 = Monday
}

// Get the Sunday of the week containing the given date
export function getWeekEnd(date = new Date()) {
  return endOfWeek(new Date(date), { weekStartsOn: 1 });
}

// Check if a date string (ISO) falls within the current week (Mon-Sun)
export function isThisWeek(isoString) {
  const date = parseISO(isoString);
  return isWithinInterval(date, {
    start: getWeekStart(),
    end: getWeekEnd(),
  });
}

// Format a date for friendly display: "Mon, May 18"
export function formatDateFriendly(date = new Date()) {
  return format(new Date(date), 'EEE, MMM d');
}

// Format time: "6:45 AM"
export function formatTime(isoString) {
  return format(parseISO(isoString), 'h:mm a');
}

// Friendly relative label: "Today", "Yesterday", or "Mon, May 12"
export function relativeDateLabel(isoString) {
  const date = parseISO(isoString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

// Get ISO date string for the start of the current week (used as a week key)
export function currentWeekKey() {
  return getWeekStart().toISOString().split('T')[0];
}

// Human-readable time ago: "just now", "5 min ago", "2 hours ago", "3 days ago"
export function formatDistanceToNow(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
}

// Get a greeting based on time of day
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// "May 2026"
export function monthYearLabel(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Short weekday, e.g. "Sat"
export function weekdayShort(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', { weekday: 'short' });
}

// Day of month number, e.g. 9
export function dayOfMonth(isoString) {
  return new Date(isoString).getDate();
}

// Groups sessions into [{ key, label, sessions }] sorted newest-month first,
// newest session first within each month.
export function groupSessionsByMonth(sessions) {
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const groups = {};
  for (const s of sorted) {
    const key = monthYearLabel(s.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.entries(groups).map(([label, sessions]) => ({ key: label, label, sessions }));
}

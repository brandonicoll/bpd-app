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

// Get a greeting based on time of day
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

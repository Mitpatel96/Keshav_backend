/**
 * Get the Monday of the week for a given date
 * Returns Monday at 00:00:00 UTC
 */
export const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  // Convert to UTC to avoid timezone issues
  const utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utcDate.getUTCDay();
  const diff = utcDate.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
};

/**
 * Get the Sunday of the week for a given date
 * Returns Sunday at 23:59:59.999 UTC
 */
export const getSundayOfWeek = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999); // End of Sunday
  return sunday;
};

/**
 * Get the Monday of next week
 */
export const getNextWeekMonday = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return nextMonday;
};

/**
 * Get the Monday of the week after next
 */
export const getWeekAfterNextMonday = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const weekAfterNext = new Date(monday);
  weekAfterNext.setDate(monday.getDate() + 14);
  return weekAfterNext;
};

/**
 * Get day name from date
 */
export const getDayName = (date: Date): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

/**
 * Check if a date is before Sunday (end of week)
 */
export const isBeforeSunday = (date: Date): boolean => {
  const today = new Date();
  const sunday = getSundayOfWeek(today);
  return date < sunday;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};


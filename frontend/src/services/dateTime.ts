/**
 * RoutePilot Centralized DateTime & Timezone Synchronization Service
 * 
 * Authoritative client-side date/time engine aligned with Asia/Kolkata (IST / UTC+05:30)
 * and synchronized with backend GET /api/system/time.
 */
import { APP_TIMEZONE, APP_TIMEZONE_LABEL } from '../config/locale';
import { systemService } from './api';

// Offset between client clock and server clock (ms)
let serverTimeOffsetMs = 0;
let hasSynced = false;

/**
 * Synchronize with backend authoritative clock.
 */
export async function syncWithServerTime(): Promise<void> {
  try {
    const start = Date.now();
    const res = await systemService.getTime();
    const roundTrip = Date.now() - start;
    if (res && res.datetime) {
      const serverDate = new Date(res.datetime).getTime();
      const clientEstimated = Date.now() - Math.round(roundTrip / 2);
      serverTimeOffsetMs = serverDate - clientEstimated;
      hasSynced = true;
    }
  } catch (e) {
    // Graceful fallback to client device clock converted to Asia/Kolkata
    // console.warn('Server time sync deferred, using Asia/Kolkata local resolution', e);
  }
}

/**
 * Returns current Date object adjusted by server offset if synced.
 */
export function getNow(): Date {
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Returns the current date in YYYY-MM-DD format (IST).
 * Automatically rolls over at midnight (00:00:00 IST).
 */
export function getCurrentDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(getNow());
}

/**
 * Alias for operational cycle date (YYYY-MM-DD).
 */
export function getOperationalDate(): string {
  return getCurrentDate();
}

/**
 * Returns tomorrow's date string in YYYY-MM-DD (IST).
 */
export function getTomorrowDate(): string {
  const d = getNow();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Returns yesterday's date string in YYYY-MM-DD (IST).
 */
export function getYesterdayDate(): string {
  const d = getNow();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Returns live current time in 12-hour AM/PM format (e.g. "11:54 PM").
 */
export function getCurrentTime(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(getNow()).toUpperCase();
}

/**
 * Returns live current time with seconds and timezone (e.g. "05:17 PM IST").
 */
export function getLiveClock(): string {
  const t = new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(getNow()).toUpperCase();
  return `${t} ${APP_TIMEZONE_LABEL}`;
}

/**
 * Returns today's formatted date: "DD MMM YYYY" (e.g. "07 Oct 2026").
 */
export function getTodayFormatted(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(getNow());
}

/**
 * Returns today's formatted date with weekday: "Wednesday, 07 Oct 2026".
 */
export function getTodayWithDay(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(getNow());
}

/**
 * Formats any input date to "DD MMM YYYY" in Asia/Kolkata.
 * If input is null/undefined/empty, dynamically defaults to today's date!
 */
export function formatDate(input?: string | number | Date | null): string {
  if (!input) {
    return getTodayFormatted();
  }

  let dateObj: Date;
  if (input instanceof Date) {
    dateObj = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    // Safe parse for YYYY-MM-DD without UTC timezone rollback
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    } else {
      dateObj = new Date(trimmed);
    }
  } else {
    dateObj = new Date(input);
  }

  if (isNaN(dateObj.getTime())) {
    return getTodayFormatted();
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Formats any input date with weekday: "Wednesday, 07 Oct 2026".
 */
export function formatDateWithDay(input?: string | number | Date | null): string {
  if (!input) {
    return getTodayWithDay();
  }

  let dateObj: Date;
  if (input instanceof Date) {
    dateObj = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    } else {
      dateObj = new Date(trimmed);
    }
  } else {
    dateObj = new Date(input);
  }

  if (isNaN(dateObj.getTime())) {
    return getTodayWithDay();
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Normalizes and formats time into 12-hour AM/PM format ("hh:mm AM/PM").
 */
export function formatTime(input?: string | number | Date | null): string {
  if (input === null || input === undefined || input === '') {
    return '';
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(input).toUpperCase();
  }

  if (typeof input === 'number') {
    const totalMinutes = Math.round(input);
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours12)}:${pad(minutes)} ${period}`;
  }

  const str = String(input).trim();

  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = match12[2];
    const p = match12[3].toUpperCase();
    const padH = h.toString().padStart(2, '0');
    return `${padH}:${m} ${p}`;
  }

  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    let hours24 = parseInt(match24[1], 10);
    const minutes = match24[2];
    if (hours24 < 0) hours24 = 0;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const padH = hours12.toString().padStart(2, '0');
    return `${padH}:${minutes} ${period}`;
  }

  if (str.includes('T') || str.includes('-')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: APP_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(parsed).toUpperCase();
    }
  }

  return str;
}

/**
 * Formats a shift or window time range into standard 12-hour format:
 * "08:30 AM – 05:30 PM".
 */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return '';

  if (!end && (start.includes(' - ') || start.includes(' – ') || start.includes('–') || start.includes(' to '))) {
    const parts = start.split(/\s*[-–—]\s*|\s+to\s+/);
    if (parts.length >= 2) {
      return `${formatTime(parts[0])} – ${formatTime(parts[1])}`;
    }
  }

  const s = formatTime(start);
  const e = end ? formatTime(end) : '';
  if (s && e) {
    return `${s} – ${e}`;
  }
  return s || e || '';
}

/**
 * Formats a Date or timestamp to standard:
 * "DD MMM YYYY, hh:mm A IST"
 */
export function formatDateTime(input?: string | number | Date | null): string {
  if (!input) {
    return `${getTodayFormatted()}, ${getCurrentTime()} ${APP_TIMEZONE_LABEL}`;
  }

  let dateObj: Date;
  if (input instanceof Date) {
    dateObj = input;
  } else {
    dateObj = new Date(input);
  }

  if (isNaN(dateObj.getTime())) {
    return `${getTodayFormatted()}, ${getCurrentTime()} ${APP_TIMEZONE_LABEL}`;
  }

  const d = formatDate(dateObj);
  const t = formatTime(dateObj);
  return `${d}, ${t} ${APP_TIMEZONE_LABEL}`;
}

/**
 * Returns human-friendly operational date label with safeguards:
 * - If today: "Today"
 * - If tomorrow: "Tomorrow"
 * - If yesterday: "Yesterday"
 * - If past: "Historical Plan"
 * - If future: "Scheduled Plan"
 */
export function getDateLabel(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Today';
  
  let targetStr: string;
  if (dateInput instanceof Date) {
    targetStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateInput);
  } else {
    targetStr = String(dateInput).split('T')[0].trim();
  }

  const today = getCurrentDate();
  const tomorrow = getTomorrowDate();
  const yesterday = getYesterdayDate();

  if (targetStr === today) return 'Today';
  if (targetStr === tomorrow) return 'Tomorrow';
  if (targetStr === yesterday) return 'Yesterday';
  if (targetStr < today) return 'Historical Plan';
  return 'Scheduled Plan';
}

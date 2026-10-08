import { APP_LOCATION } from '../config/locale';
export {
  getCurrentDate,
  getOperationalDate,
  getTomorrowDate,
  getYesterdayDate,
  getCurrentTime,
  getLiveClock,
  getTodayFormatted,
  getTodayWithDay,
  formatDate,
  formatDateWithDay,
  formatTime,
  formatTimeRange,
  formatDateTime,
  getDateLabel,
  syncWithServerTime
} from '../services/dateTime';

/**
 * Formats location text cleanly for operational cards and headers.
 */
export function formatLocation(area?: string | null): string {
  if (!area || area.trim() === '' || area.toLowerCase().includes('bangalore') || area.toLowerCase().includes('bengaluru')) {
    return APP_LOCATION.urbanArea;
  }
  return area.trim();
}

/**
 * Formats Indian Currency with INR Symbol:
 * e.g., ₹34,500
 */
export function formatCurrencyINR(amount?: number | string | null): string {
  if (amount === null || amount === undefined) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

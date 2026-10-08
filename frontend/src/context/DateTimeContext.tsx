import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
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
import { APP_TIMEZONE, APP_TIMEZONE_LABEL } from '../config/locale';

export interface OperationalDateContextType {
  // Global Operational Date values
  currentDate: string; // YYYY-MM-DD (live today)
  operationalDate: string; // YYYY-MM-DD (active selected operational date)
  selectedDate: string; // alias for operationalDate
  setOperationalDate: (date: string) => void;
  setSelectedDate: (date: string) => void; // alias
  isToday: boolean;
  isHistorical: boolean;
  isFuture: boolean;

  // Formatted date and time strings
  formattedDate: string; // e.g. "08 Oct 2026" for operationalDate
  formattedTime: string; // e.g. "08:30 AM" (12-hour format)
  formattedDateWithDay: string; // e.g. "Thursday, 08 Oct 2026"
  currentDateFormatted: string; // e.g. "08 Oct 2026" for today
  currentDateWithDay: string; // e.g. "Thursday, 08 Oct 2026" for today
  currentTimeFormatted: string; // e.g. "08:30 AM"
  liveClock: string; // e.g. "08:30:15 AM IST"

  // Timezone
  timezone: string; // "Asia/Kolkata"
  timezoneLabel: string; // "IST"

  // Navigation helpers
  previousDay: () => void;
  nextDay: () => void;
  resetToToday: () => void;
  checkIsToday: (d?: string | Date | null) => boolean;

  // Standard Titles according to Sections 4, 5, 6, 7, 8, 13
  dateHeaderLabel: string; // "08 Oct 2026 · Today" or "07 Oct 2026"
  dashboardTitle: string; // "Today's Operations" or "Operations · 07 Oct 2026" or "Planned Operations · 09 Oct 2026"
  dailyDataTitle: string; // "Daily Data" or "Daily Data · 07 Oct 2026"
  planTitle: string; // "Today's Plan" or "Plan · 07 Oct 2026" or "Planned Routes · 09 Oct 2026"
  routesTitle: string; // "Routes" or "Routes · 07 Oct 2026"
  exceptionsTitle: string; // "Exceptions" or "Exceptions · 07 Oct 2026"

  // Formatting utilities
  getDateLabel: typeof getDateLabel;
  formatDate: typeof formatDate;
  formatDateWithDay: typeof formatDateWithDay;
  formatTime: typeof formatTime;
  formatTimeRange: typeof formatTimeRange;
  formatDateTime: typeof formatDateTime;
  refreshTime: () => Promise<void>;
}

export type DateTimeContextType = OperationalDateContextType;

const DateTimeContext = createContext<OperationalDateContextType | undefined>(undefined);

// Helper to extract ?date= from URL if present and valid
function getInitialDateFromUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramDate = params.get('date');
      if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate.trim())) {
        return paramDate.trim();
      }
    } catch {
      // ignore
    }
  }
  return getCurrentDate();
}

export const DateTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState<string>(getCurrentDate());
  const [operationalDate, setOperationalDateState] = useState<string>(getInitialDateFromUrl());
  const [liveClock, setLiveClock] = useState<string>(getLiveClock());
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState<string>(getCurrentTime());

  // Keep live clocks ticking and update today's date if rolling over midnight
  const updateClocks = useCallback(() => {
    const today = getCurrentDate();
    setCurrentDate(today);
    setLiveClock(getLiveClock());
    setCurrentTimeFormatted(getCurrentTime());
  }, []);

  const refreshTime = useCallback(async () => {
    await syncWithServerTime();
    updateClocks();
  }, [updateClocks]);

  useEffect(() => {
    refreshTime();
    const interval = setInterval(updateClocks, 10000);
    return () => clearInterval(interval);
  }, [refreshTime, updateClocks]);

  // Synchronize URL search params with operationalDate
  const setOperationalDate = useCallback((newDate: string) => {
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    setOperationalDateState(newDate);

    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const today = getCurrentDate();
        if (newDate === today) {
          url.searchParams.delete('date');
        } else {
          url.searchParams.set('date', newDate);
        }
        window.history.replaceState({}, '', url.toString());
      } catch {
        // ignore
      }
    }
  }, []);

  // Listen to popstate for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlDate = getInitialDateFromUrl();
      setOperationalDateState(urlDate);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const resetToToday = useCallback(() => {
    const today = getCurrentDate();
    setOperationalDate(today);
  }, [setOperationalDate]);

  const previousDay = useCallback(() => {
    const d = new Date(operationalDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    const yr = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    setOperationalDate(`${yr}-${mo}-${da}`);
  }, [operationalDate, setOperationalDate]);

  const nextDay = useCallback(() => {
    const d = new Date(operationalDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    const yr = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    setOperationalDate(`${yr}-${mo}-${da}`);
  }, [operationalDate, setOperationalDate]);

  const isToday = operationalDate === currentDate;
  const isHistorical = operationalDate < currentDate;
  const isFuture = operationalDate > currentDate;

  const checkIsToday = useCallback((d?: string | Date | null) => {
    if (!d) return true;
    const str = typeof d === 'string' ? d.split('T')[0].trim() : formatDate(d);
    return str === currentDate || str === formatDate(currentDate);
  }, [currentDate]);

  const value = useMemo<OperationalDateContextType>(() => {
    const formattedDate = formatDate(operationalDate);
    const formattedDateWithDay = formatDateWithDay(operationalDate);
    const currentDateFormatted = formatDate(currentDate);
    const currentDateWithDay = formatDateWithDay(currentDate);

    // Standardized header labels and titles per requirements
    const dateHeaderLabel = isToday ? `${formattedDate} · Today` : formattedDate;
    
    const dashboardTitle = isToday 
      ? "Today's Operations" 
      : isFuture 
      ? `Planned Operations · ${formattedDate}` 
      : `Operations · ${formattedDate}`;

    const dailyDataTitle = isToday ? "Daily Data" : `Daily Data · ${formattedDate}`;
    
    const planTitle = isToday 
      ? "Today's Plan" 
      : isFuture 
      ? `Planned Routes · ${formattedDate}` 
      : `Plan · ${formattedDate}`;

    const routesTitle = isToday ? "Routes" : `Routes · ${formattedDate}`;
    const exceptionsTitle = isToday ? "Exceptions" : `Exceptions · ${formattedDate}`;

    return {
      currentDate,
      operationalDate,
      selectedDate: operationalDate,
      setOperationalDate,
      setSelectedDate: setOperationalDate,
      isToday,
      isHistorical,
      isFuture,
      formattedDate,
      formattedTime: currentTimeFormatted,
      formattedDateWithDay,
      currentDateFormatted,
      currentDateWithDay,
      currentTimeFormatted,
      liveClock,
      timezone: APP_TIMEZONE,
      timezoneLabel: APP_TIMEZONE_LABEL,
      previousDay,
      nextDay,
      resetToToday,
      checkIsToday,
      dateHeaderLabel,
      dashboardTitle,
      dailyDataTitle,
      planTitle,
      routesTitle,
      exceptionsTitle,
      getDateLabel,
      formatDate,
      formatDateWithDay,
      formatTime,
      formatTimeRange,
      formatDateTime,
      refreshTime
    };
  }, [
    currentDate,
    operationalDate,
    setOperationalDate,
    isToday,
    isHistorical,
    isFuture,
    currentTimeFormatted,
    liveClock,
    previousDay,
    nextDay,
    resetToToday,
    checkIsToday,
    refreshTime
  ]);

  return (
    <DateTimeContext.Provider value={value}>
      {children}
    </DateTimeContext.Provider>
  );
};

export const useDateTime = (): OperationalDateContextType => {
  const context = useContext(DateTimeContext);
  if (!context) {
    const today = getCurrentDate();
    const todayFmt = getTodayFormatted();
    return {
      currentDate: today,
      operationalDate: today,
      selectedDate: today,
      setOperationalDate: () => {},
      setSelectedDate: () => {},
      isToday: true,
      isHistorical: false,
      isFuture: false,
      formattedDate: todayFmt,
      formattedTime: getCurrentTime(),
      formattedDateWithDay: getTodayWithDay(),
      currentDateFormatted: todayFmt,
      currentDateWithDay: getTodayWithDay(),
      currentTimeFormatted: getCurrentTime(),
      liveClock: getLiveClock(),
      timezone: APP_TIMEZONE,
      timezoneLabel: APP_TIMEZONE_LABEL,
      previousDay: () => {},
      nextDay: () => {},
      resetToToday: () => {},
      checkIsToday: () => true,
      dateHeaderLabel: `${todayFmt} · Today`,
      dashboardTitle: "Today's Operations",
      dailyDataTitle: "Daily Data",
      planTitle: "Today's Plan",
      routesTitle: "Routes",
      exceptionsTitle: "Exceptions",
      getDateLabel,
      formatDate,
      formatDateWithDay,
      formatTime,
      formatTimeRange,
      formatDateTime,
      refreshTime: async () => {}
    };
  }
  return context;
};

// Aliases for clear semantic usage across pages
export const useOperationalDate = useDateTime;
export const OperationalDateContext = DateTimeContext;
export const OperationalDateProvider = DateTimeProvider;

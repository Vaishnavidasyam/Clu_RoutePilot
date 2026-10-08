import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, ChevronDown, ChevronLeft, ChevronRight, 
  RotateCcw, Check, Clock
} from 'lucide-react';
import { useOperationalDate } from '../context/DateTimeContext';

interface OperationalDateSelectorProps {
  className?: string;
  showSyncBadge?: boolean;
}

export const OperationalDateSelector: React.FC<OperationalDateSelectorProps> = ({ 
  className = '',
  showSyncBadge = true
}) => {
  const {
    currentDate,
    operationalDate,
    setOperationalDate,
    isToday,
    formattedDate,
    previousDay,
    nextDay,
    resetToToday,
    liveClock,
    timezoneLabel
  } = useOperationalDate();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month navigation state inside popover (initialized to operationalDate)
  const [viewDate, setViewDate] = useState(() => {
    const [y, m, d] = operationalDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d || 1));
  });

  // Staged selection before clicking "Apply"
  const [stagedDate, setStagedDate] = useState<string>(operationalDate);

  // Update viewDate and stagedDate when operationalDate changes or popover opens
  useEffect(() => {
    if (isOpen) {
      const [y, m, d] = operationalDate.split('-').map(Number);
      setViewDate(new Date(Date.UTC(y, m - 1, d || 1)));
      setStagedDate(operationalDate);
    }
  }, [isOpen, operationalDate]);

  // Click outside and Esc key listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth(); // 0-indexed

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC'
  }).format(viewDate);

  const prevMonth = () => {
    setViewDate(new Date(Date.UTC(year, month - 1, 1)));
  };

  const nextMonth = () => {
    setViewDate(new Date(Date.UTC(year, month + 1, 1)));
  };

  // Build calendar matrix
  const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sun
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const calendarDays: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];

  // Trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarDays.push({ day: dayNum, dateStr, isCurrentMonth: false });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ day: i, dateStr, isCurrentMonth: true });
  }

  // Leading days into next month to complete 35 or 42 cells
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ day: i, dateStr, isCurrentMonth: false });
  }

  const handleApply = () => {
    setOperationalDate(stagedDate);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    resetToToday();
    setStagedDate(currentDate);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      
      {/* 1. Header Trigger Pill (Section 4 Specification) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-2xs transition cursor-pointer select-none ${
          isToday
            ? 'bg-slate-50 hover:bg-slate-100/90 border-[#DDE7ED] text-[#12324A] font-semibold'
            : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold'
        }`}
        title={`Operational Date: ${formattedDate} (${isToday ? 'Today' : 'Historical/Planned'}) • Time: ${liveClock}`}
        aria-label="Select operational date"
        aria-expanded={isOpen}
      >
        <Calendar className={`w-3.5 h-3.5 shrink-0 ${isToday ? 'text-[#71869A]' : 'text-amber-700'}`} />
        
        {/* Date Display */}
        <span className="truncate">
          {isToday ? `${formattedDate} · Today` : formattedDate}
        </span>

        {/* Global Sync Status Dot if requested */}
        {showSyncBadge && isToday && (
          <>
            <span className="w-1 h-1 rounded-full bg-[#DDE7ED]" />
            <span className="inline-flex items-center gap-1.5 font-bold text-[#10A88A] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10A88A] animate-pulse" />
              <span className="hidden sm:inline">Data Ready</span>
            </span>
          </>
        )}

        {showSyncBadge && !isToday && (
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200/80 text-amber-900 font-bold uppercase">
            History
          </span>
        )}

        <ChevronDown className={`w-3 h-3 text-[#71869A] transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 2. Compact Popover (Exact Section 4 Layout) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-[#DDE7ED] shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 text-xs text-[#12324A]">
          
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="font-bold text-xs text-[#12324A]">Operational date</div>
              <div className="text-[10px] text-[#71869A] flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-[#FF7A18]" />
                <span>{liveClock} ({timezoneLabel})</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[#71869A]">
              Hyderabad
            </span>
          </div>

          {/* Month Header Navigation: ← October 2026 → */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg text-[#71869A] hover:text-[#12324A] hover:bg-slate-100 transition cursor-pointer"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-xs text-[#12324A]">
              {monthName} {year}
            </div>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg text-[#71869A] hover:text-[#12324A] hover:bg-slate-100 transition cursor-pointer"
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Weekday Names: S M T W T F S */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#71869A] pb-1">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((c, idx) => {
              const isSelected = c.dateStr === stagedDate;
              const isCellToday = c.dateStr === currentDate;

              return (
                <button
                  key={idx}
                  onClick={() => setStagedDate(c.dateStr)}
                  disabled={!c.isCurrentMonth}
                  className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-medium transition cursor-pointer ${
                    !c.isCurrentMonth
                      ? 'text-slate-300 cursor-not-allowed opacity-40'
                      : isSelected
                      ? 'bg-[#123A55] text-white font-bold shadow-2xs'
                      : isCellToday
                      ? 'border border-[#FF7A18] text-[#FF7A18] font-bold hover:bg-orange-50'
                      : 'text-[#12324A] hover:bg-slate-100'
                  }`}
                  title={c.dateStr}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          {/* Quick Day Stepping: Previous day / Next day */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2 text-[11px]">
            <button
              onClick={() => {
                previousDay();
                setIsOpen(false);
              }}
              className="flex-1 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#71869A] hover:text-[#12324A] border border-[#DDE7ED] transition text-center font-medium cursor-pointer"
            >
              ← Prev Day
            </button>
            <button
              onClick={() => {
                nextDay();
                setIsOpen(false);
              }}
              className="flex-1 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#71869A] hover:text-[#12324A] border border-[#DDE7ED] transition text-center font-medium cursor-pointer"
            >
              Next Day →
            </button>
          </div>

          {/* Bottom Actions: [ Today ] [ Apply ] */}
          <div className="flex items-center justify-between gap-2 pt-2 text-xs">
            <button
              onClick={handleSelectToday}
              className="flex-1 py-1.5 rounded-xl border border-[#DDE7ED] bg-white hover:bg-slate-50 text-[#12324A] font-bold transition cursor-pointer text-center"
            >
              Today
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-1.5 rounded-xl bg-[#FF7A18] hover:bg-[#e06509] text-white font-bold shadow-2xs transition cursor-pointer text-center"
            >
              Apply
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

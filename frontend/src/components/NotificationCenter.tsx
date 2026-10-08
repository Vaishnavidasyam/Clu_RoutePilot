import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { dataService, planningService } from '../services/api';
import { useOperationalDate } from '../context/DateTimeContext';

interface NotificationItem {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  link: string;
  time: string;
  read: boolean;
}

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { operationalDate, formattedDate } = useOperationalDate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [todayRes, plansRes] = await Promise.allSettled([
          dataService.getTodayData(operationalDate),
          planningService.listPlans(operationalDate)
        ]);

        const items: NotificationItem[] = [];

        if (todayRes.status === 'fulfilled' && todayRes.value?.success) {
          const td = todayRes.value.data;
          if (td.customer_count > 0 && td.executive_count > 0) {
            items.push({
              id: 'notif-data-ready',
              type: 'success',
              title: `Data verified for ${formattedDate}`,
              description: `${td.customer_count} customers and ${td.executive_count} executives ready for optimization.`,
              link: '/data',
              time: 'Just now',
              read: false,
            });
          } else {
            items.push({
              id: 'notif-no-data',
              type: 'warning',
              title: `No data for ${formattedDate}`,
              description: `Upload executives.csv and customers.csv to prepare routes.`,
              link: '/data/import',
              time: 'Active',
              read: false,
            });
          }
        }

        if (plansRes.status === 'fulfilled' && plansRes.value?.success) {
          const plans = plansRes.value.data || [];
          if (plans.length > 0) {
            const latest = plans[0];
            const lm = latest.latest_metrics;
            if (lm) {
              if (lm.violations_count > 0) {
                items.unshift({
                  id: 'notif-plan-violations',
                  type: 'warning',
                  title: `${lm.violations_count} constraint violations in Plan`,
                  description: `Review routes to adjust capacity or shift boundaries.`,
                  link: '/exceptions',
                  time: 'Live',
                  read: false,
                });
              } else {
                items.unshift({
                  id: 'notif-plan-success',
                  type: 'info',
                  title: `Plan generated (${lm.customers_visited} visits)`,
                  description: `${lm.ptp_scheduled}/${lm.ptp_total} priority visits protected. ${lm.total_distance_km} km total.`,
                  link: '/planning',
                  time: latest.created_at || 'Recently',
                  read: false,
                });
              }
            }
          }
        }

        if (items.length === 0) {
          items.push({
            id: 'notif-ready',
            type: 'info',
            title: 'System Operational',
            description: `RoutePilot active for operational date ${formattedDate}.`,
            link: '/app/overview',
            time: 'Now',
            read: true,
          });
        }

        setNotifications(items);
      } catch {
        // Fallback gracefully without crash
      }
    };

    loadAlerts();
  }, [operationalDate, formattedDate]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleItemClick = (n: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    );
    setIsOpen(false);
    navigate(n.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-navy hover:bg-slate-100 transition"
        title="Operational alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-navy">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange/15 text-orange">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-slate-400 hover:text-navy transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                  !n.read ? 'bg-orange/5' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  {n.type === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {n.type === 'info' && (
                    <Info className="w-4 h-4 text-sky-500" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-navy">{n.title}</h4>
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{n.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/exceptions');
              }}
              className="text-xs font-bold text-navy hover:text-orange transition inline-flex items-center gap-1"
            >
              <span>View operational exceptions</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

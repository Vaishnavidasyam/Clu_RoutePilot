import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, UserCheck, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { customerService, executiveService, planningService } from '../services/api';
import { Customer, Executive } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      loadInitialData();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [custRes, execRes, planRes] = await Promise.all([
        customerService.list(),
        executiveService.list(),
        planningService.listPlans(),
      ]);
      setCustomers(custRes.data || []);
      setExecutives(execRes.data || []);
      setPlans(planRes.data || []);
    } catch (err) {
      console.error('Error prefetching search data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredCustomers = q
    ? customers.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          (c.name && c.name.toLowerCase().includes(q)) ||
          c.area.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const filteredExecutives = q
    ? executives.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const filteredPlans = q
    ? plans.filter(
        (p) =>
          String(p.id).includes(q) ||
          (p.plan_date && p.plan_date.toLowerCase().includes(q)) ||
          (p.algorithm && p.algorithm.toLowerCase().includes(q))
      ).slice(0, 3)
    : [];

  const hasResults =
    filteredCustomers.length > 0 || filteredExecutives.length > 0 || filteredPlans.length > 0;

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-navy-darkest/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers (C001), executives (E01), routes, plans, or zones..."
            className="flex-1 text-sm text-navy placeholder:text-slate-400 bg-transparent focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q) {
                if (filteredCustomers.length > 0) {
                  handleSelect(`/customers/${filteredCustomers[0].id}`);
                } else if (filteredExecutives.length > 0) {
                  handleSelect(`/executives`);
                } else {
                  handleSelect(`/customers?search=${encodeURIComponent(query)}`);
                }
              }
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mr-2">
              ESC
            </kbd>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-navy px-2 py-1 rounded-lg hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-xs">
          {!q && (
            <div className="p-6 text-center text-slate-400 space-y-3">
              <div className="flex justify-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px]">
                  C001
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px]">
                  Vikram Singh
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px]">
                  Koramangala
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px]">
                  Plan #1
                </span>
              </div>
              <p className="text-xs">Quickly jump across customers, field executives, routes, and saved plans.</p>
            </div>
          )}

          {q && !hasResults && !loading && (
            <div className="p-8 text-center text-slate-400">
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <button
                onClick={() => handleSelect(`/customers?search=${encodeURIComponent(query)}`)}
                className="mt-2 text-xs font-bold text-orange hover:underline inline-block"
              >
                Search all accounts in Customer Directory →
              </button>
            </div>
          )}

          {/* Customers matches */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Customers ({filteredCustomers.length})
                </span>
                <button
                  onClick={() => handleSelect(`/customers?search=${encodeURIComponent(query)}`)}
                  className="text-orange hover:underline normal-case font-semibold"
                >
                  View all in Directory
                </button>
              </div>
              <div className="space-y-1">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(`/customers/${c.id}`)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-orange text-xs bg-orange/10 px-2 py-0.5 rounded">
                        {c.id}
                      </span>
                      <div>
                        <div className="font-semibold text-navy text-xs">{c.name || `Account ${c.id}`}</div>
                        <div className="text-[11px] text-slate-400">{c.area} · DPD: {c.dpd}d · ₹{c.overdue_amount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.ptp_today === 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange/15 text-orange">
                          PTP
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executives matches */}
          {filteredExecutives.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 pb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Field Executives ({filteredExecutives.length})
              </div>
              <div className="space-y-1">
                {filteredExecutives.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => handleSelect(`/executives`)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-navy text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {e.id}
                      </span>
                      <div>
                        <div className="font-semibold text-navy text-xs">{e.name}</div>
                        <div className="text-[11px] text-slate-400">Shift: {e.shift_start}–{e.shift_end} · Max: {e.max_km} km / {e.max_visits} visits</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plans matches */}
          {filteredPlans.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 pb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Optimization Plans ({filteredPlans.length})
              </div>
              <div className="space-y-1">
                {filteredPlans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelect('/today/plan')}
                    className="p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Plan #{p.id}
                      </span>
                      <div>
                        <div className="font-semibold text-navy text-xs">{p.algorithm}</div>
                        <div className="text-[11px] text-slate-400">{p.plan_date} · Status: {p.status}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="font-mono font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">↵</kbd> to open</span>
            <span>Press <kbd className="font-mono font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd> to close</span>
          </div>
          <span>RoutePilot Global Directory</span>
        </div>
      </div>
    </div>
  );
};

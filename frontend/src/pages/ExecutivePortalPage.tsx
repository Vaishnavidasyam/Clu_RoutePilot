import React, { useEffect, useState, useMemo } from 'react';
import { 
  Bike, MapPin, Navigation, Clock, CheckCircle2, AlertCircle, 
  Search, RefreshCw, Phone, ArrowRight, Check, DollarSign, 
  Calendar, LayoutDashboard, User, Shield, LogOut, ChevronRight, 
  AlertTriangle, Layers, Bell, ShieldCheck, MapPinned
} from 'lucide-react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { executivePortalService, executiveService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FieldHeader, CompactRouteStatus, RouteSummaryBar, NextStopCard, 
  UpcomingStopsPreview, ItineraryList, CustomerDetailModal, 
  VisitOutcomeModal, FieldBottomNav, FieldTabType, NextStopData, 
  VisitLifecycleState, FieldRouteMap, FieldDesktopSidebar, RouteStatusType
} from '../components/field';
import { APP_LOCATION } from '../config/locale';
import { formatTime, formatTimeRange, formatLocation, formatCurrencyINR } from '../utils/formatters';

interface ExecutivePortalPageProps {
  defaultTab?: FieldTabType;
}

interface ActivityEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'ROUTE' | 'NAVIGATION' | 'ARRIVAL' | 'VISIT' | 'COMPLETION';
}

export const ExecutivePortalPage: React.FC<ExecutivePortalPageProps> = ({ defaultTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customerId: paramCustomerId } = useParams<{ customerId?: string }>();

  // Determine active tab from route
  const getTabFromPath = (): FieldTabType => {
    if (defaultTab) return defaultTab;
    const p = location.pathname;
    if (p.includes('/route')) return 'route';
    if (p.includes('/customers')) return 'customers';
    if (p.includes('/activity')) return 'activity';
    if (p.includes('/profile')) return 'profile';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<FieldTabType>(getTabFromPath());

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname, defaultTab]);

  const handleSelectTab = (tab: FieldTabType) => {
    setActiveTab(tab);
    const search = location.search; // preserves ?preview=E02
    navigate(`/executive/${tab}${search}`);
  };

  // Role-Aware Executive Switching per Section 10:
  // Normal Field Executives: ALWAYS their own executive_id (e.g. E06), ZERO preview mode or switcher exposed.
  // Managers / Admins: Clearly labeled EXECUTIVE PREVIEW mode, can preview E01-E06, exit preview back to /manager/overview.
  const previewParam = searchParams.get('preview');
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'OPERATIONS_MANAGER';
  const isPreviewMode = isManagerOrAdmin;

  const resolvedExecutiveId = user?.role === 'EXECUTIVE'
    ? (user.executive_id || '')
    : (previewParam || user?.executive_id || '');

  const [executiveId, setExecutiveId] = useState<string>(resolvedExecutiveId);

  useEffect(() => {
    if (user?.role === 'EXECUTIVE' && user.executive_id) {
      setExecutiveId(user.executive_id);
    } else if (previewParam) {
      setExecutiveId(previewParam);
    }
  }, [previewParam, user]);

  const handleSwitchExecutive = (newId: string) => {
    setExecutiveId(newId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('preview', newId);
    setSearchParams(nextParams);
  };

  const handleExitPreview = () => {
    navigate('/manager/overview');
  };

  // Available executives list for Preview Mode ONLY (derived dynamically from uploaded dataset)
  const [availableExecutives, setAvailableExecutives] = useState<Array<{ id: string; name: string }>>([]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Duty Status (On Duty / On Break)
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Desktop Sidebar Collapse state (Consistent with Manager Workspace)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // State-driven Visit & Action Lifecycle
  const [routeStarted, setRouteStarted] = useState(false);
  const [lifecycleState, setLifecycleState] = useState<VisitLifecycleState>('NEXT');
  const [hasArrived, setHasArrived] = useState(false);

  // Customer inspection modal
  const [inspectedCustomer, setInspectedCustomer] = useState<NextStopData | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Outcome modal state
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeStop, setOutcomeStop] = useState<NextStopData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Outcome form values
  const [outcomeType, setOutcomeType] = useState<string>('payment_collected');
  const [amountCollected, setAmountCollected] = useState<string>('');
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [nextPtpDate, setNextPtpDate] = useState<string>('');

  // Search & Filters on Customers Tab
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'ALL' | 'PTP' | 'PENDING' | 'COMPLETED'>('ALL');

  // Selected stop on My Route Tab
  const [selectedRouteStopId, setSelectedRouteStopId] = useState<number | undefined>(undefined);

  // Chronological Activity Log (Starts with initial system events or session events)
  const [activityTimeline, setActivityTimeline] = useState<ActivityEvent[]>([]);

  // Helper to append events to the Activity Log
  const logActivityEvent = (
    title: string, 
    description: string, 
    type: 'ROUTE' | 'NAVIGATION' | 'ARRIVAL' | 'VISIT' | 'COMPLETION'
  ) => {
    const newEvt: ActivityEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: formatTime(new Date()),
      title,
      description,
      type
    };
    setActivityTimeline(prev => [newEvt, ...prev]);
  };

  // Load available executives (for demo preview only)
  useEffect(() => {
    const fetchExecList = async () => {
      try {
        const res = await executiveService.list();
        if (res.data && res.data.length > 0) {
          const list = res.data.map((e: any) => ({ id: e.id, name: e.name || e.id }));
          setAvailableExecutives(list);
          setExecutiveId(prev => {
            if (!prev && list.length > 0) {
              return list[0].id;
            }
            return prev;
          });
        }
      } catch (err) {
        // safe fallback
      }
    };
    fetchExecList();
  }, []);

  // Fetch today's dynamic route data for the authenticated executive
  const loadRouteData = async (showIndicator = false) => {
    if (!executiveId) {
      setLoading(false);
      return;
    }
    if (showIndicator) {
      setRefreshing(true);
      setSyncState('syncing');
    } else {
      setLoading(true);
    }

    try {
      const res = await executivePortalService.getToday(executiveId);
      setData(res.data);
      setSyncState('synced');

      const stops: NextStopData[] = res.data?.stops || [];
      const hasActiveOrDone = stops.some(s => s.status === 'in_progress' || s.status === 'completed');
      if (hasActiveOrDone) {
        setRouteStarted(true);
      }
    } catch (e) {
      console.error('Failed to load executive portal data', e);
      setSyncState('offline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (executiveId) {
      loadRouteData();
    }
  }, [executiveId]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice(null);
    }, 3500);
  };

  // Dynamic Executive & Route Data derived directly from authenticated executive
  const executive = data?.executive || {
    id: executiveId || 'E01',
    name: availableExecutives.find(e => e.id === executiveId)?.name || executiveId || 'Field Executive',
    shift_start: '08:30',
    shift_end: '17:30',
    max_visits: 15,
    max_km: 70,
    status: 'active'
  };

  const route = data?.route;
  const stops: NextStopData[] = useMemo(() => data?.stops || [], [data?.stops]);

  // Derived progress statistics
  const completedStops = useMemo(() => stops.filter(s => s.status === 'completed'), [stops]);
  const inProgressStop = useMemo(() => stops.find(s => s.status === 'in_progress'), [stops]);
  const pendingStops = useMemo(() => stops.filter(s => s.status === 'pending'), [stops]);
  const totalStopsCount = stops.length;

  // Active Next Stop to execute
  const nextStop = useMemo(() => {
    if (inProgressStop) return inProgressStop;
    return pendingStops[0] || null;
  }, [inProgressStop, pendingStops]);

  // Route status: NOT STARTED, ON SCHEDULE, RUNNING LATE, COMPLETED
  const routeStatus: RouteStatusType = useMemo(() => {
    if (totalStopsCount > 0 && completedStops.length >= totalStopsCount) return 'COMPLETED';
    if (!routeStarted) return 'NOT STARTED';
    return 'ON SCHEDULE';
  }, [completedStops.length, totalStopsCount, routeStarted]);

  // Calculate distance covered so far
  const coveredKm = useMemo(() => {
    if (!completedStops.length) return 0;
    const lastDone = completedStops[completedStops.length - 1];
    return lastDone.cumulative_km || 0;
  }, [completedStops]);

  // Synchronize lifecycle state
  useEffect(() => {
    if (!nextStop) {
      setLifecycleState('COMPLETED');
    } else if (nextStop.status === 'in_progress') {
      setLifecycleState('IN_VISIT');
    } else if (hasArrived) {
      setLifecycleState('ARRIVED');
    } else {
      setLifecycleState('NEXT');
    }
  }, [nextStop, hasArrived]);

  // Synchronize canonical customer ID from route param: /field/customers/:customerId
  useEffect(() => {
    if (paramCustomerId && stops.length > 0) {
      const target = stops.find(s => s.customer_id === paramCustomerId);
      if (target) {
        setInspectedCustomer(target);
        setIsCustomerModalOpen(true);
      }
    }
  }, [paramCustomerId, stops]);

  // =========================================================================
  // STATE-DRIVEN WORKFLOW ACTIONS
  // =========================================================================

  const handleStartRoute = () => {
    setRouteStarted(true);
    setLifecycleState('NEXT');
    logActivityEvent(
      'Route Started', 
      `Started scheduled route from ${APP_LOCATION.depotName} with ${totalStopsCount} stops.`,
      'ROUTE'
    );
    showNotification('Route started. Proceed to first customer stop.');
  };

  const handleStartNavigation = () => {
    setLifecycleState('NAVIGATING');
    if (nextStop) {
      logActivityEvent(
        'Navigation Started', 
        `Navigating to stop #${nextStop.seq}: ${nextStop.customer_name || nextStop.customer_id} (${formatLocation(nextStop.area)}).`,
        'NAVIGATION'
      );
    }
    showNotification('Navigation initiated via Google Maps.');
  };

  const handleMarkArrived = () => {
    setHasArrived(true);
    setLifecycleState('ARRIVED');
    if (nextStop) {
      logActivityEvent(
        'Arrived at Customer', 
        `Arrived at ${nextStop.customer_name || nextStop.customer_id} (${formatLocation(nextStop.area)}).`,
        'ARRIVAL'
      );
    }
    showNotification(`Arrived at ${nextStop?.customer_name || 'customer location'}.`);
  };

  const handleStartVisit = async (stopId: number) => {
    setIsSubmitting(true);
    try {
      await executivePortalService.startVisit(stopId);
      setLifecycleState('IN_VISIT');
      if (nextStop) {
        logActivityEvent(
          'Visit Started', 
          `Visit started for ${nextStop.customer_name || nextStop.customer_id}. Timer initiated.`,
          'VISIT'
        );
      }
      showNotification('Customer visit started. Timer active.');
      await loadRouteData(true);
    } catch (e) {
      console.error(e);
      setLifecycleState('IN_VISIT');
      showNotification('Visit started (offline mode).');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenOutcomeModal = (stop: NextStopData) => {
    setOutcomeStop(stop);
    setOutcomeType('payment_collected');
    setAmountCollected(stop.overdue_amount ? String(Math.round(stop.overdue_amount)) : '');
    setVisitNotes('');
    setNextPtpDate('');
    setIsOutcomeModalOpen(true);
  };

  const handleCompleteVisit = async () => {
    if (!outcomeStop) return;
    setIsSubmitting(true);

    const numericAmount = outcomeType === 'payment_collected' && amountCollected 
      ? Number(amountCollected) 
      : undefined;

    try {
      await executivePortalService.completeVisit(outcomeStop.stop_id, {
        outcome: outcomeType,
        amount_collected: numericAmount,
        notes: visitNotes || undefined,
        next_ptp_date: (outcomeType === 'ptp_confirmed' || outcomeType === 'ptp_obtained') && nextPtpDate 
          ? nextPtpDate 
          : undefined
      });

      // Log complete visit action
      const outcomeNote = outcomeType === 'payment_collected' 
        ? `Payment Collected: ₹${numericAmount?.toLocaleString() || '0'}`
        : outcomeType === 'ptp_confirmed' 
        ? `Promise to Pay Recorded: ${nextPtpDate}`
        : outcomeType === 'customer_unavailable'
        ? 'Customer Unavailable / Door Locked'
        : 'Dispute / Query Logged';

      logActivityEvent(
        'Visit Completed', 
        `Stop #${outcomeStop.seq} (${outcomeStop.customer_name || outcomeStop.customer_id}) completed. ${outcomeNote}.`,
        'COMPLETION'
      );

      setIsOutcomeModalOpen(false);
      setOutcomeStop(null);
      setHasArrived(false);
      setLifecycleState('COMPLETED');
      showNotification(`Stop #${outcomeStop.seq} successfully recorded!`);
      await loadRouteData(true);
    } catch (e) {
      console.error(e);
      showNotification('Failed to submit outcome. Please check connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToNext = () => {
    setHasArrived(false);
    setLifecycleState('NEXT');
    if (nextStop) {
      logActivityEvent(
        'Proceeding to Next Stop', 
        `Advancing route sequence to stop #${nextStop.seq}: ${nextStop.customer_name || nextStop.customer_id}.`,
        'NAVIGATION'
      );
    }
    showNotification('Moving to next stop sequence.');
  };

  // Customer Filtering logic for Customers tab
  const filteredCustomerStops = useMemo(() => {
    let list = stops;
    if (customerFilter === 'PTP') {
      list = list.filter(s => s.ptp_today === 1);
    } else if (customerFilter === 'PENDING') {
      list = list.filter(s => s.status !== 'completed');
    } else if (customerFilter === 'COMPLETED') {
      list = list.filter(s => s.status === 'completed');
    }

    if (!customerSearch.trim()) return list;
    const q = customerSearch.toLowerCase();
    return list.filter(s => 
      s.customer_name?.toLowerCase().includes(q) || 
      s.customer_id?.toLowerCase().includes(q) ||
      s.area?.toLowerCase().includes(q)
    );
  }, [stops, customerFilter, customerSearch]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F5F8FA] min-h-screen">
        <div className="w-14 h-14 rounded-2xl bg-[#FF7A18]/15 border border-[#FF7A18]/30 flex items-center justify-center text-[#FF7A18] animate-bounce mb-4">
          <Bike className="w-7 h-7" />
        </div>
        <div className="font-black text-lg text-[#123A55] tracking-tight">
          Loading RoutePilot Field Workspace
        </div>
        <p className="text-xs text-[#71869A] mt-1">
          Retrieving today&apos;s dynamic route and stops for {executive.id} · {executive.name}...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F8FA] text-[#12324A] flex selection:bg-orange/20 selection:text-orange">
      
      {/* 1. DESKTOP SIDEBAR (Visible at >=1024px) */}
      <FieldDesktopSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        executiveId={executive.id}
        executiveName={executive.name}
        isOnDuty={isOnDuty}
        shiftHours={formatTimeRange(executive.shift_start, executive.shift_end)}
        completedStopsCount={completedStops.length}
        totalStopsCount={totalStopsCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-24 lg:pb-8">
        
        {/* COMPACT TOP HEADER */}
        <FieldHeader
          executiveId={executive.id}
          executiveName={executive.name}
          pageTitle={
            activeTab === 'home' ? "Today's Field Operation" :
            activeTab === 'route' ? "My Route" :
            activeTab === 'customers' ? "Assigned Customers" :
            activeTab === 'activity' ? "Today's Activity" :
            "Field Profile"
          }
          areaText={APP_LOCATION.urbanArea}
          vehicleText="Two-Wheeler"
          isOnDuty={isOnDuty}
          syncState={syncState}
          onRefresh={() => loadRouteData(true)}
          isDemoUser={isPreviewMode}
          availableExecutives={availableExecutives}
          onSelectExecutive={handleSwitchExecutive}
          onExitPreview={handleExitPreview}
          onNavigateProfile={() => handleSelectTab('profile')}
        />

        {/* Action Toast Feedback */}
        {actionNotice && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 mt-3">
            <div className="p-3.5 bg-[#10A88A] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2.5 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
              <span className="flex-1">{actionNotice}</span>
            </div>
          </div>
        )}

        {/* 3. RESPONSIVE MAIN WORKSPACE */}
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1 space-y-6">
          
          {/* =========================================================
              TAB 1: HOME (What should I do right now?)
             ========================================================= */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* COMPACT ROUTE STATUS (Refined, not over-repeated KPI cards) */}
              <CompactRouteStatus
                completedStops={completedStops.length}
                totalStops={totalStopsCount}
                coveredKm={coveredKm}
                expectedReturnTime={formatTime(route?.return_time) || '01:54 PM'}
                routeStatus={routeStatus}
              />

              {/* TWO-COLUMN GRID ON DESKTOP & TABLET */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: NEXT STOP HERO CARD + ONE PRIMARY ACTION + UPCOMING PREVIEW */}
                <div className="lg:col-span-6 xl:col-span-7 space-y-6">
                  {nextStop ? (
                    <NextStopCard
                      stop={nextStop}
                      totalStops={totalStopsCount}
                      routeStarted={routeStarted}
                      lifecycleState={lifecycleState}
                      onStartRoute={handleStartRoute}
                      onStartNavigation={handleStartNavigation}
                      onMarkArrived={handleMarkArrived}
                      onStartVisit={handleStartVisit}
                      onRecordOutcome={handleOpenOutcomeModal}
                      onNavigateToNext={handleNavigateToNext}
                      isSubmitting={isSubmitting}
                    />
                  ) : totalStopsCount > 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-emerald-200 text-center space-y-3 shadow-2xs">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#10A88A] flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-[#123A55]">All Visits Completed!</h3>
                      <p className="text-xs text-[#71869A] max-w-sm mx-auto leading-relaxed">
                        You have executed all {totalStopsCount} planned customer visits for today. Return to {APP_LOCATION.depotName} before {formatTime(executive.shift_end) || '05:30 PM'}.
                      </p>
                    </div>
                  ) : null}

                  {/* UPCOMING STOPS PREVIEW (COMPACT PREVIEW ONLY) */}
                  {stops.length > 0 && (
                    <UpcomingStopsPreview
                      stops={stops}
                      currentStopId={nextStop?.stop_id}
                      onViewCompleteRoute={() => handleSelectTab('route')}
                      maxPreview={5}
                    />
                  )}
                </div>

                {/* RIGHT COLUMN: ROUTE PREVIEW MAP (Supporting tool, non-dominant) */}
                <div className="lg:col-span-6 xl:col-span-5 h-[340px] sm:h-[400px] lg:h-[580px] flex flex-col sticky top-20">
                  <div className="flex-1 rounded-2xl overflow-hidden border border-[#DDE7ED] shadow-2xs">
                    <FieldRouteMap
                      stops={stops}
                      currentStopId={nextStop?.stop_id}
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =========================================================
              TAB 2: MY ROUTE (Complete route and itinerary)
             ========================================================= */}
          {activeTab === 'route' && (
            <div className="space-y-6">
              
              {/* Detailed Itinerary Route Banner */}
              {route && (
                <RouteSummaryBar
                  completedStops={completedStops.length}
                  totalStops={totalStopsCount}
                  coveredKm={coveredKm}
                  totalKm={route.total_km || 11.4}
                  expectedReturnTime={formatTime(route.return_time) || '01:54 PM'}
                  routeStatus={routeStatus}
                />
              )}

              {/* Complete Itinerary List & Map Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Complete Itinerary List */}
                <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                  <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-[#123A55]">
                          Complete Route Itinerary
                        </h3>
                        <p className="text-xs text-[#71869A] mt-0.5">
                          Turn-by-turn stop sequence, arrival ETAs, and customer details.
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F5F8FA] border border-[#DDE7ED] text-[#123A55]">
                        {completedStops.length}/{totalStopsCount} Done
                      </span>
                    </div>

                    <ItineraryList
                      stops={stops}
                      currentStopId={nextStop?.stop_id}
                      selectedStopId={selectedRouteStopId}
                      onSelectStop={(stop) => {
                        setSelectedRouteStopId(stop.stop_id);
                        setInspectedCustomer(stop);
                        setIsCustomerModalOpen(true);
                      }}
                    />
                  </div>
                </div>

                {/* Full Interactive Route Map */}
                <div className="lg:col-span-5 xl:col-span-5 h-[450px] lg:h-[620px] sticky top-20">
                  <div className="h-full rounded-2xl overflow-hidden border border-[#DDE7ED] shadow-2xs">
                    <FieldRouteMap
                      stops={stops}
                      currentStopId={selectedRouteStopId || nextStop?.stop_id}
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =========================================================
              TAB 3: CUSTOMERS (Assigned customers only)
             ========================================================= */}
          {activeTab === 'customers' && (
            <div className="space-y-5">
              
              {/* Header, Search & Filter Bar */}
              <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#123A55]">
                      Assigned Customer Portfolio
                    </h3>
                    <p className="text-xs text-[#71869A] mt-0.5">
                      Showing customers assigned to executive {executive.name} ({executive.id}) today.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['ALL', 'PTP', 'PENDING', 'COMPLETED'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCustomerFilter(mode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          customerFilter === mode
                            ? 'bg-[#123A55] text-white shadow-xs'
                            : 'bg-[#F5F8FA] text-[#71869A] hover:bg-slate-200'
                        }`}
                      >
                        {mode === 'ALL' ? 'All' : mode === 'PTP' ? '★ PTP Today' : mode === 'PENDING' ? 'Pending' : 'Completed'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search assigned customer name, ID, or area..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F5F8FA] border border-[#DDE7ED] rounded-xl text-xs text-[#12324A] focus:outline-none focus:ring-2 focus:ring-[#FF7A18]/20 focus:border-[#FF7A18]"
                  />
                </div>
              </div>

              {/* Customer Cards Responsive Grid (3 col desktop, 2 col tablet, 1 col mobile) */}
              {filteredCustomerStops.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#DDE7ED] p-12 text-center text-xs text-[#71869A] space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-bold text-[#123A55]">No matching customers found</div>
                  <p>Try clearing your search or filter criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustomerStops.map((cust) => {
                    const isDone = cust.status === 'completed';
                    const isInProg = cust.status === 'in_progress';

                    return (
                      <div
                        key={cust.customer_id}
                        onClick={() => {
                          setInspectedCustomer(cust);
                          navigate(`/field/customers/${cust.customer_id}`);
                        }}
                        className="bg-white rounded-2xl border border-[#DDE7ED] hover:border-[#FF7A18] hover:shadow-xs p-4 transition duration-150 cursor-pointer space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-black text-sm text-[#123A55] leading-snug">
                                {cust.customer_name || cust.customer_id}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Stop #{cust.seq} · ID: {cust.customer_id}
                              </div>
                            </div>
                            {cust.ptp_today === 1 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FF7A18]/15 text-[#FF7A18] shrink-0">
                                ★ PTP
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#71869A] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{formatLocation(cust.area)}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#DDE7ED]/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Overdue</span>
                            <span className="font-mono font-black text-[#10A88A]">
                              {formatCurrencyINR(cust.overdue_amount)}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isDone 
                              ? 'bg-emerald-100 text-emerald-800'
                              : isInProg
                              ? 'bg-orange text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isDone ? 'DONE ✓' : isInProg ? 'IN VISIT' : `ETA ${formatTime(cust.arrival_time)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* =========================================================
              TAB 4: ACTIVITY (Chronological record of field actions)
             ========================================================= */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DDE7ED]">
                <div>
                  <h3 className="text-base font-black text-[#123A55]">
                    Today&apos;s Field Activity Log
                  </h3>
                  <p className="text-xs text-[#71869A] mt-0.5">
                    Chronological record of visits, arrivals, completions and field actions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#10A88A] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {completedStops.length} Completed Stops Today
                  </span>
                </div>
              </div>

              {activityTimeline.length === 0 && completedStops.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-[#123A55] text-sm">No Activity Recorded Yet</h4>
                  <p className="text-xs text-[#71869A] max-w-sm mx-auto">
                    Your completed visits, arrivals, and field actions will appear here in real-time as you execute your route.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-[#DDE7ED]/60">
                  {/* Dynamic Real-Time Events Logged */}
                  {activityTimeline.map((evt) => (
                    <div 
                      key={evt.id}
                      className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                          evt.type === 'COMPLETION' 
                            ? 'bg-[#10A88A] text-white' 
                            : evt.type === 'ARRIVAL' 
                            ? 'bg-blue-600 text-white'
                            : evt.type === 'VISIT'
                            ? 'bg-[#FF7A18] text-white'
                            : 'bg-[#123A55] text-white'
                        }`}>
                          {evt.type === 'COMPLETION' ? '✓' : evt.type === 'ARRIVAL' ? '📍' : evt.type === 'VISIT' ? '⏱' : '▶'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#123A55]">
                            {evt.title}
                          </div>
                          <div className="text-[#71869A] text-xs mt-0.5 leading-relaxed">
                            {evt.description}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs text-slate-400 font-bold">
                          {evt.time}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Completed Stops from Plan */}
                  {completedStops.map((stop) => (
                    <div 
                      key={stop.stop_id}
                      className="pt-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#10A88A] text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#123A55]">
                            Visit Completed · {stop.customer_name || stop.customer_id}
                          </div>
                          <div className="text-[#71869A] text-xs mt-0.5">
                            Stop #{stop.seq} · {formatLocation(stop.area)} · Arrival recorded at {formatTime(stop.arrival_time)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-[#10A88A]">
                          {formatCurrencyINR(stop.overdue_amount)}
                        </div>
                        <span className="text-[10px] text-slate-400">Recorded</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 5: PROFILE (Account & Work Profile)
             ========================================================= */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Executive Header Card */}
              <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#123A55] text-white flex items-center justify-center text-xl font-black shadow-2xs">
                    {executive.id}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-[#123A55]">{executive.name}</h3>
                    <div className="text-xs text-[#71869A]">
                      Field Collection Executive · Employee ID: <span className="font-mono font-bold text-[#123A55]">{executive.id}</span>
                    </div>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsOnDuty(prev => !prev)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          isOnDuty 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isOnDuty ? '● ON DUTY' : '○ ON BREAK'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WORK DETAILS */}
              <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs p-6 space-y-4">
                <h4 className="text-xs font-black text-[#71869A] uppercase tracking-wider">
                  Work Details
                </h4>

                <div className="divide-y divide-[#DDE7ED] text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#71869A]">Shift Hours</span>
                    <span className="font-bold text-[#123A55] font-mono">
                      {formatTimeRange(executive.shift_start, executive.shift_end)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#71869A]">Assigned Vehicle</span>
                    <span className="font-bold text-[#123A55]">
                      Two-Wheeler
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#71869A]">Home Depot</span>
                    <span className="font-bold text-[#123A55]">
                      {APP_LOCATION.depotName}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#71869A]">Daily Capacity</span>
                    <span className="font-bold text-[#123A55]">
                      {executive.max_visits} visits / {executive.max_km} km max
                    </span>
                  </div>
                </div>
              </div>

              {/* ACCOUNT & PREFERENCES */}
              <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs p-6 space-y-4">
                <h4 className="text-xs font-black text-[#71869A] uppercase tracking-wider">
                  Account & Connectivity
                </h4>

                <div className="divide-y divide-[#DDE7ED] text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#123A55]">Route Notifications</div>
                      <div className="text-[11px] text-[#71869A]">Dispatches and time window alerts</div>
                    </div>
                    <span className="font-bold text-[#10A88A] bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Active</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#123A55]">Offline Data Caching</div>
                      <div className="text-[11px] text-[#71869A]">Local storage backup for low-connectivity zones</div>
                    </div>
                    <span className="font-bold text-[#10A88A] bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Synced</span>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full py-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Log Out of RoutePilot</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* 4. MOBILE BOTTOM NAVIGATION (Fixed at bottom on <lg:) */}
      <div className="lg:hidden">
        <FieldBottomNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          completedStopsCount={completedStops.length}
        />
      </div>

      {/* 5. CUSTOMER DETAIL MODAL / DRAWER */}
      <CustomerDetailModal
        isOpen={isCustomerModalOpen}
        customer={inspectedCustomer}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setInspectedCustomer(null);
          if (paramCustomerId) {
            navigate('/field/customers');
          }
        }}
        onStartVisit={handleStartVisit}
        onRecordOutcome={handleOpenOutcomeModal}
      />

      {/* 6. VISIT OUTCOME LOGGING MODAL */}
      <VisitOutcomeModal
        isOpen={isOutcomeModalOpen}
        stop={outcomeStop}
        outcomeType={outcomeType}
        setOutcomeType={setOutcomeType}
        amountCollected={amountCollected}
        setAmountCollected={setAmountCollected}
        visitNotes={visitNotes}
        setVisitNotes={setVisitNotes}
        nextPtpDate={nextPtpDate}
        setNextPtpDate={setNextPtpDate}
        isSubmitting={isSubmitting}
        onClose={() => {
          setIsOutcomeModalOpen(false);
          setOutcomeStop(null);
        }}
        onSubmit={handleCompleteVisit}
      />

    </div>
  );
};

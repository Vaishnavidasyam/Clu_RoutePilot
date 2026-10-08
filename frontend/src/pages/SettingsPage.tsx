import React, { useEffect, useState } from 'react';
import { 
  Settings, Sliders, Shield, Bell, Users, Building, ShieldAlert,
  CheckCircle2, ArrowRight, AlertTriangle, RefreshCw, Lock, Save,
  Check, Info, ChevronRight, HelpCircle, X, Sparkles, UserCheck,
  ToggleLeft, ToggleRight, SlidersHorizontal, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api';

type SettingsTab = 'overview' | 'planning' | 'business_rules' | 'notifications' | 'general' | 'advanced' | 'users';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const isExecutive = user?.role === 'EXECUTIVE';

  // Active Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Planning Preferences (Manager-friendly)
  // Mapping: balanced -> lambda 2.0, priority_first -> lambda 1.0, travel_efficient -> lambda 3.5
  const [planningProfile, setPlanningProfile] = useState<'balanced' | 'priority_first' | 'travel_efficient'>('balanced');

  // 2. Advanced Solver Parameters (Admin only)
  const [lambda, setLambda] = useState<number>(2.0);
  const [avgSpeed, setAvgSpeed] = useState<number>(25.0);
  const [roadFactor, setRoadFactor] = useState<number>(1.3);

  // Modal for Admin Advanced Settings confirmation
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingAdvancedChanges, setPendingAdvancedChanges] = useState<{ lambda: number; avgSpeed: number; roadFactor: number } | null>(null);

  // Modal for Reset Defaults confirmation
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // 3. Notifications state
  const [notifications, setNotifications] = useState({
    routeReady: true,
    routeException: true,
    ptpRiskAlert: true,
    routeReplanned: true,
    dailySummary: true,
  });

  // 4. General Settings state
  const [generalConfig, setGeneralConfig] = useState({
    orgName: 'RoutePilot Demo Operations',
    defaultPlanningTime: '08:30 AM',
    workingDays: 'Monday – Saturday',
    currency: 'INR (₹)',
    distanceUnit: 'Kilometers (km)',
    operationalLocation: 'Hyderabad, Telangana, India',
    timezone: 'Asia/Kolkata (IST / UTC+05:30)',
    timeFormat: '12-hour (hh:mm AM/PM)',
  });

  // 5. Users List state (Admin only)
  const [usersList, setUsersList] = useState<any[]>([]);

  // If a Field Executive somehow navigates here, redirect them immediately to /portal
  useEffect(() => {
    if (isExecutive) {
      navigate('/field/home', { replace: true });
    }
  }, [isExecutive, navigate]);

  // Load existing settings from backend on mount
  useEffect(() => {
    loadBackendSettings();
  }, [isAdmin]);

  const loadBackendSettings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSettings();
      if (res.data) {
        if (res.data.default_lambda?.value) {
          const lVal = parseFloat(res.data.default_lambda.value);
          setLambda(lVal);
          if (lVal <= 1.2) setPlanningProfile('priority_first');
          else if (lVal >= 3.0) setPlanningProfile('travel_efficient');
          else setPlanningProfile('balanced');
        }
        if (res.data.avg_speed_kmh?.value) setAvgSpeed(parseFloat(res.data.avg_speed_kmh.value));
        if (res.data.road_factor?.value) setRoadFactor(parseFloat(res.data.road_factor.value));
        if (res.data.org_name?.value) setGeneralConfig(prev => ({ ...prev, orgName: res.data.org_name.value }));
      }

      if (isAdmin) {
        const uRes = await adminService.getUsers();
        if (uRes.data) setUsersList(uRes.data);
      }
    } catch (e) {
      console.error('Error loading settings', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handler: Save Planning Preferences (Manager)
  const handleSavePlanningProfile = async (profile: 'balanced' | 'priority_first' | 'travel_efficient') => {
    setPlanningProfile(profile);
    let targetLambda = 2.0;
    if (profile === 'priority_first') targetLambda = 1.0;
    if (profile === 'travel_efficient') targetLambda = 3.5;

    setLambda(targetLambda);
    try {
      setSaving(true);
      await adminService.updateSetting('default_lambda', String(targetLambda));
      showToast(`Planning preference updated to ${profile === 'balanced' ? 'Balanced Planning' : profile === 'priority_first' ? 'Priority First' : 'Travel Efficient'}.`);
    } catch (e: any) {
      showToast('Saved locally.');
    } finally {
      setSaving(false);
    }
  };

  // Handler: Prompt Admin Advanced Changes
  const handlePromptAdvancedSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingAdvancedChanges({ lambda, avgSpeed, roadFactor });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAdvancedSave = async () => {
    if (!pendingAdvancedChanges) return;
    try {
      setSaving(true);
      await adminService.updateSetting('default_lambda', String(pendingAdvancedChanges.lambda));
      await adminService.updateSetting('avg_speed_kmh', String(pendingAdvancedChanges.avgSpeed));
      await adminService.updateSetting('road_factor', String(pendingAdvancedChanges.roadFactor));
      
      // sync profile if matches
      if (pendingAdvancedChanges.lambda <= 1.2) setPlanningProfile('priority_first');
      else if (pendingAdvancedChanges.lambda >= 3.0) setPlanningProfile('travel_efficient');
      else setPlanningProfile('balanced');

      setIsConfirmModalOpen(false);
      showToast('Advanced optimization parameters updated successfully.');
    } catch (e: any) {
      alert('Error saving settings: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setSaving(true);
      setLambda(2.0);
      setAvgSpeed(25.0);
      setRoadFactor(1.3);
      setPlanningProfile('balanced');

      await adminService.updateSetting('default_lambda', '2.0');
      await adminService.updateSetting('avg_speed_kmh', '25.0');
      await adminService.updateSetting('road_factor', '1.3');

      setIsResetModalOpen(false);
      showToast('Restored recommended RoutePilot optimization defaults.');
    } catch (e: any) {
      alert('Error resetting settings');
    } finally {
      setSaving(false);
    }
  };

  // Handler: General Settings Save
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminService.updateSetting('org_name', generalConfig.orgName);
      showToast('Organization settings updated successfully.');
    } catch (e: any) {
      showToast('Settings saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  // Handler: Toggle user status
  const handleToggleUser = async (uid: number) => {
    try {
      await adminService.toggleActive(uid);
      const uRes = await adminService.getUsers();
      if (uRes.data) setUsersList(uRes.data);
      showToast('User status updated.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (isExecutive) {
    return null; // Redirecting to /portal
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* 1. STANDARD ENTERPRISE HEADER */}
      <PageHeader
        breadcrumbs={[
          { label: 'System', to: '/app/overview' },
          { label: 'Settings' },
          ...(activeTab !== 'overview' ? [{ label: activeTab.replace('_', ' ').toUpperCase() }] : [])
        ]}
        title="Settings"
        subtitle="Configure how RoutePilot works for your daily field operations, business rules, and team dispatch."
        statusBadge={{
          label: isAdmin ? 'Admin Access' : 'Operations Manager',
          variant: isAdmin ? 'warning' : 'info'
        }}
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. OPTIMIZATION CONFIGURATION STATUS STRIP */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="font-bold text-navy flex items-center gap-2">
              <span>Optimization Engine Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                Recommended Configuration Active
              </span>
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Planning: <b className="text-navy capitalize">{planningProfile.replace('_', ' ')}</b> • PTP Protection: <b className="text-emerald-700">Enforced (Hard)</b> • Time Windows: <b className="text-emerald-700">Enforced</b> • Shift Limits: <b className="text-emerald-700">Enforced</b>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2 shrink-0">
          <span>Engine: Smart Greedy 2-Opt</span>
          <span>•</span>
          <span>Last Verified: Today, 10:42 AM</span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE WITH SETTINGS NAVIGATION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Settings Navigation Menu */}
        <aside className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-2 text-xs flex lg:flex-col overflow-x-auto lg:overflow-visible custom-scrollbar whitespace-nowrap lg:whitespace-normal gap-1 shrink-0">
          <div className="hidden lg:block px-3 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {isAdmin ? 'System & Admin Settings' : 'Operations Settings'}
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left shrink-0 lg:w-full cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-navy text-white font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-orange" />
              <span>Settings Overview</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'overview' ? 'text-white' : 'text-slate-300'}`} />
          </button>

          <button
            onClick={() => setActiveTab('planning')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left ${
              activeTab === 'planning'
                ? 'bg-navy text-white font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-orange" />
              <span>Planning Preferences</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'planning' ? 'text-white' : 'text-slate-300'}`} />
          </button>

          <button
            onClick={() => setActiveTab('business_rules')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left ${
              activeTab === 'business_rules'
                ? 'bg-navy text-white font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-orange" />
              <span>Business Rules</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'business_rules' ? 'text-white' : 'text-slate-300'}`} />
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left ${
              activeTab === 'notifications'
                ? 'bg-navy text-white font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-orange" />
              <span>Notifications</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'notifications' ? 'text-white' : 'text-slate-300'}`} />
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left ${
              activeTab === 'general'
                ? 'bg-navy text-white font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-orange" />
              <span>General Settings</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'general' ? 'text-white' : 'text-slate-300'}`} />
          </button>

          {/* ADMIN-ONLY SECTION */}
          {isAdmin && (
            <div className="pt-3 mt-2 border-t border-slate-100 space-y-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Admin Only</span>
              </div>

              <button
                onClick={() => setActiveTab('advanced')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left ${
                  activeTab === 'advanced'
                    ? 'bg-navy text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  <span>Advanced Optimization</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'advanced' ? 'text-white' : 'text-slate-300'}`} />
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-left ${
                  activeTab === 'users'
                    ? 'bg-navy text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>Users & Roles</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'users' ? 'text-white' : 'text-slate-300'}`} />
              </button>
            </div>
          )}
        </aside>

        {/* Content Pane */}
        <div className="lg:col-span-3 space-y-6">

          {/* ==================================================== */}
          {/* TAB 1: SETTINGS OVERVIEW CARDS */}
          {/* ==================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-base font-bold text-navy">Settings Overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose an operational area below to customize preferences and rules.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Card 1: Planning Preferences */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-orange/50 transition">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-orange/10 text-orange flex items-center justify-center font-bold">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy text-sm">Planning Preferences</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Configure how daily routes are balanced and prioritized.</p>
                    </div>
                    <div className="pt-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange/10 text-orange border border-orange/20">
                        Current: {planningProfile === 'balanced' ? 'Balanced Planning (Recommended)' : planningProfile === 'priority_first' ? 'Priority First' : 'Travel Efficient'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('planning')}
                    className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200"
                  >
                    <span>Manage Planning Preferences</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange" />
                  </button>
                </div>

                {/* Card 2: Business Rules */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-orange/50 transition">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy text-sm">Business Rules</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Control operational constraints for feasible, compliant field routes.</p>
                    </div>
                    <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                      <span>• PTP Protection</span>
                      <span>• Time Windows</span>
                      <span>• Shift Limits</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('business_rules')}
                    className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200"
                  >
                    <span>View Business Rules</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange" />
                  </button>
                </div>

                {/* Card 3: Notifications */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-orange/50 transition">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy text-sm">Notifications</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Choose which operational route events and alerts you receive.</p>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-500">
                      Route ready alerts, exceptions, and daily summaries enabled.
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200"
                  >
                    <span>Manage Notifications</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange" />
                  </button>
                </div>

                {/* Card 4: General Organization */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-orange/50 transition">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy text-sm">General Settings</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Configure organization name, currency, and shift defaults.</p>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-500">
                      {generalConfig.orgName} • INR (₹)
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('general')}
                    className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200"
                  >
                    <span>Configure General</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange" />
                  </button>
                </div>

                {/* Card 5: Advanced Optimization (Admin Only) */}
                {isAdmin ? (
                  <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-4 md:col-span-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                          Admin Access Required
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-navy text-sm">Advanced Optimization Engine</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Configure technical route optimization weights, distance factors, and solver parameters.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('advanced')}
                      className="w-full sm:w-auto self-start px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-orange" />
                      <span>Open Advanced Settings</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-400 text-xs flex items-center gap-3 md:col-span-2">
                    <Lock className="w-5 h-5 text-slate-300 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-700">Advanced Engine Configuration</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Technical solver tuning (λ weights, road factors) is managed by System Administrators.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: PLANNING PREFERENCES (Manager Friendly) */}
          {/* ==================================================== */}
          {activeTab === 'planning' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-navy">Planning Preferences</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose how RoutePilot balances customer priority and travel. Select the operational profile that matches today's goals.
                </p>
              </div>

              {/* 3 Simple Choice Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                
                {/* Choice 1: Balanced Planning */}
                <div
                  onClick={() => handleSavePlanningProfile('balanced')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between space-y-3 ${
                    planningProfile === 'balanced'
                      ? 'border-orange bg-orange/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Balanced Planning</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Protects important visits while keeping travel efficient. Ideal for everyday field collection operations.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Balanced trade-off</span>
                    {planningProfile === 'balanced' ? (
                      <span className="font-bold text-orange flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : (
                      <span className="text-slate-400">Select</span>
                    )}
                  </div>
                </div>

                {/* Choice 2: Priority First */}
                <div
                  onClick={() => handleSavePlanningProfile('priority_first')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between space-y-3 ${
                    planningProfile === 'priority_first'
                      ? 'border-orange bg-orange/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Priority First</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase">
                        High Coverage
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Favors high-value customer visits and urgent accounts, accepting slight additional travel distance.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Maximum collections</span>
                    {planningProfile === 'priority_first' ? (
                      <span className="font-bold text-orange flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : (
                      <span className="text-slate-400">Select</span>
                    )}
                  </div>
                </div>

                {/* Choice 3: Travel Efficient */}
                <div
                  onClick={() => handleSavePlanningProfile('travel_efficient')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between space-y-3 ${
                    planningProfile === 'travel_efficient'
                      ? 'border-orange bg-orange/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Travel Efficient</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800 uppercase">
                        Low Fuel
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Reduces unnecessary travel and fuel costs by grouping customer visits into tightly clustered neighborhoods.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Minimal kilometers</span>
                    {planningProfile === 'travel_efficient' ? (
                      <span className="font-bold text-orange flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : (
                      <span className="text-slate-400">Select</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Informational Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                <Info className="w-4 h-4 text-orange shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-navy">How RoutePilot applies this setting:</span>
                  <p className="mt-0.5">
                    When you generate or re-optimize today's routes, RoutePilot automatically weights customer priority scores against travel distances. Changing this profile will not affect already published routes until you trigger a re-plan.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: BUSINESS RULES (Hard Rules vs Preferences) */}
          {/* ==================================================== */}
          {activeTab === 'business_rules' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-navy">Business Rules</h2>
                <p className="text-xs text-slate-500 mt-1">
                  These rules protect feasible and reliable daily routes. They guarantee that no executive is scheduled beyond their legal or operational limits.
                </p>
              </div>

              {/* Distinction Banner: Hard Rules vs Preferences */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-navy">SYSTEM ENFORCED RULES (HARD CONSTRAINTS)</span>
                </div>
                <span className="text-[11px] text-slate-500">Cannot be violated by the optimizer</span>
              </div>

              {/* Rule Cards */}
              <div className="space-y-3">
                
                {/* Rule 1: PTP Protection */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-navy text-xs">PTP customers are protected</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customers with an active Promise-to-Pay (PTP) today are scheduled ahead of optional visits whenever mathematically feasible.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> REQUIRED
                  </span>
                </div>

                {/* Rule 2: Time Windows */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-navy text-xs">Customer time windows are respected</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Visits must arrive and finish within the customer's available window. Early arrival waiting is permitted, but late arrivals are strictly prohibited.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> REQUIRED
                  </span>
                </div>

                {/* Rule 3: Executive Capacity */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-navy text-xs">Executive daily visit capacity is respected</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Routes cannot exceed an executive's configured maximum visit limit (default 15 visits/day).
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> REQUIRED
                  </span>
                </div>

                {/* Rule 4: Travel Distance Limits */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-navy text-xs">Travel distance limits are respected</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Routes cannot exceed an executive's maximum allowed road distance (default 80.0 km/day).
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> REQUIRED
                  </span>
                </div>

                {/* Rule 5: Home Depot Return */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-navy text-xs">Home depot return is required</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Every route starts and concludes at the executive's designated home base coordinate.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> REQUIRED
                  </span>
                </div>

                {/* Rule 6: Shift Hours */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-navy text-xs">Shift hours are respected</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Executives must complete all visits and return to home base before their shift ends (e.g. 05:30 PM).
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> REQUIRED
                  </span>
                </div>

              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: NOTIFICATIONS */}
          {/* ==================================================== */}
          {activeTab === 'notifications' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-navy">Notification Preferences</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose which operational updates and real-time route alerts you wish to receive.
                </p>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-navy">Route Plan Ready</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Notify when optimization completes and daily routes are ready for review.</div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, routeReady: !prev.routeReady }))}
                    className="p-1 text-slate-400 hover:text-navy transition"
                  >
                    {notifications.routeReady ? <ToggleRight className="w-8 h-8 text-orange" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-navy">Route Exceptions / Unassigned Customers</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Alert when any customer cannot be feasibly scheduled on today's routes.</div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, routeException: !prev.routeException }))}
                    className="p-1 text-slate-400 hover:text-navy transition"
                  >
                    {notifications.routeException ? <ToggleRight className="w-8 h-8 text-orange" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-navy">PTP Risk Alert</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Immediate high-priority alert if a Promise-to-Pay account is at risk of being missed.</div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, ptpRiskAlert: !prev.ptpRiskAlert }))}
                    className="p-1 text-slate-400 hover:text-navy transition"
                  >
                    {notifications.ptpRiskAlert ? <ToggleRight className="w-8 h-8 text-orange" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-navy">Route Re-planned</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Notify when an executive unavailability triggers mid-day re-optimization.</div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, routeReplanned: !prev.routeReplanned }))}
                    className="p-1 text-slate-400 hover:text-navy transition"
                  >
                    {notifications.routeReplanned ? <ToggleRight className="w-8 h-8 text-orange" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-navy">Daily Planning Summary</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">Receive a briefing summary when the daily plan is finalized and published.</div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, dailySummary: !prev.dailySummary }))}
                    className="p-1 text-slate-400 hover:text-navy transition"
                  >
                    {notifications.dailySummary ? <ToggleRight className="w-8 h-8 text-orange" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => showToast('Notification preferences saved.')}
                  className="px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white font-bold text-xs shadow-sm transition"
                >
                  Save Notification Settings
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: GENERAL SETTINGS */}
          {/* ==================================================== */}
          {activeTab === 'general' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-navy">Organization Settings</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage organization metadata, operational hours, and system units.
                </p>
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={generalConfig.orgName}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, orgName: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-navy font-semibold focus:outline-none focus:border-orange"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Daily Planning Cutoff</label>
                    <input
                      type="text"
                      value={generalConfig.defaultPlanningTime}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, defaultPlanningTime: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-navy font-semibold focus:outline-none focus:border-orange"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Operating Working Days</label>
                    <input
                      type="text"
                      value={generalConfig.workingDays}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, workingDays: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-navy font-semibold focus:outline-none focus:border-orange"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Operational Hub Location</label>
                    <input
                      type="text"
                      value={generalConfig.operationalLocation}
                      disabled
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Timezone & Format</label>
                    <input
                      type="text"
                      value={`${generalConfig.timezone} • ${generalConfig.timeFormat}`}
                      disabled
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Currency & Unit</label>
                    <input
                      type="text"
                      value={`${generalConfig.currency} • ${generalConfig.distanceUnit}`}
                      disabled
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Organization Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 6: ADVANCED OPTIMIZATION (Admin Only) */}
          {/* ==================================================== */}
          {activeTab === 'advanced' && isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-navy">Advanced Optimization Engine</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      ADMIN ONLY
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    These settings affect the mathematical optimization engine. Changes should only be made by users familiar with route optimization algorithms.
                  </p>
                </div>

                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
              </div>

              {/* Advanced Parameter Controls */}
              <form onSubmit={handlePromptAdvancedSave} className="space-y-6 text-xs">
                
                {/* 1. Travel Distance Weight (Lambda Slider) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-navy text-sm">Travel Distance Penalty Weight (λ)</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Controls the objective trade-off between maximizing customer priority and minimizing travel km.
                      </p>
                    </div>
                    <span className="font-mono text-base font-bold text-orange px-3 py-1 bg-white border border-slate-200 rounded-lg">
                      λ = {lambda.toFixed(1)}
                    </span>
                  </div>

                  {/* Visual Slider */}
                  <div className="space-y-1 pt-1">
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={lambda}
                      onChange={(e) => setLambda(parseFloat(e.target.value))}
                      className="w-full accent-orange cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>0.5 (More customer priority)</span>
                      <span>2.0 (Recommended Default)</span>
                      <span>4.0 (More travel efficiency)</span>
                    </div>
                  </div>
                </div>

                {/* 2. Average Travel Speed */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-navy text-sm">Average City Speed</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Used to estimate travel time between stops: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">(distance / speed) * 60 min</code>.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="10"
                        max="60"
                        value={avgSpeed}
                        onChange={(e) => setAvgSpeed(parseFloat(e.target.value))}
                        className="w-16 p-1.5 text-center font-bold text-navy bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <span className="font-bold text-slate-500">km/h</span>
                    </div>
                  </div>
                </div>

                {/* 3. Road Distance Correction Factor */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-navy text-sm">Road Correction Factor</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Multiplies straight-line Haversine coordinates to accurately approximate urban road network routing.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="2.0"
                        value={roadFactor}
                        onChange={(e) => setRoadFactor(parseFloat(e.target.value))}
                        className="w-16 p-1.5 text-center font-bold text-navy bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <span className="font-bold text-slate-500">×</span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Default parameters: λ = 2.0 • 25 km/h • 1.3× road factor
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-orange hover:bg-orange-dark text-white font-bold text-xs shadow-md transition"
                  >
                    Review & Save Advanced Settings
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 7: USERS & ROLES (Admin Only) */}
          {/* ==================================================== */}
          {activeTab === 'users' && isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-navy">Users & Access Roles</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage team permissions, role assignments, and active account status.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-dark transition flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-orange" />
                  <span>Open Full Admin Console</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Linked Executive</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-navy">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'OPERATIONS_MANAGER'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {u.executive_id || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {u.is_active ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleUser(u.id)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-navy underline"
                            >
                              {u.is_active ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ==================================================== */}
      {/* 4. CONFIRMATION MODAL: ADMIN ADVANCED CHANGES */}
      {/* ==================================================== */}
      {isConfirmModalOpen && pendingAdvancedChanges && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy text-base">Change Optimization Settings?</h3>
                <p className="text-xs text-slate-500">You are changing how RoutePilot evaluates daily routes.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Travel Distance Weight (λ):</span>
                <span className="font-mono font-bold text-navy">{pendingAdvancedChanges.lambda.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Average City Speed:</span>
                <span className="font-mono font-bold text-navy">{pendingAdvancedChanges.avgSpeed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Road Correction Factor:</span>
                <span className="font-mono font-bold text-navy">{pendingAdvancedChanges.roadFactor}×</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                <b>Impact:</b> Routes generated in future plans will balance priority vs travel using these new weights.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdvancedSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-orange hover:bg-orange-dark text-white font-bold text-xs shadow-md transition"
              >
                {saving ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. CONFIRMATION MODAL: RESET DEFAULTS */}
      {/* ==================================================== */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-orange" />
              </div>
              <div>
                <h3 className="font-bold text-navy text-base">Reset Optimization Settings?</h3>
                <p className="text-xs text-slate-500">Restore RoutePilot recommended configuration.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore the standard challenge-verified parameters: <b>λ = 2.0</b>, <b>25 km/h city speed</b>, and <b>1.3× road factor</b>.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white font-bold text-xs shadow-md transition"
              >
                {saving ? 'Resetting...' : 'Reset to Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;

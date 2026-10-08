import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft, ShieldAlert, CheckCircle2, UserX, UserMinus } from 'lucide-react';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';

export const ReoptimizePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailableExec, setUnavailableExec] = useState<string>('');
  const [reoptimizing, setReoptimizing] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [id]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      let targetId = id === 'latest' ? 1 : Number(id);
      if (id === 'latest') {
        const plans = await planningService.listPlans();
        if (plans.data && plans.data.length > 0) targetId = plans.data[0].id;
      }
      const data = await planningService.getPlan(targetId);
      setPlan(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReoptimize = async () => {
    if (!plan) return;
    setReoptimizing(true);
    try {
      const res = await planningService.reoptimize(plan.id, {
        unavailable_executive_ids: unavailableExec ? [unavailableExec] : [],
        lambda_param: plan.lambda_param
      });
      if (res.success) {
        navigate(`/planning/running/${res.data.run_id}`);
      }
    } catch (e: any) {
      alert('Re-optimization failed: ' + e.message);
    } finally {
      setReoptimizing(false);
    }
  };

  if (loading || !plan) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading plan...</div>;
  }

  const routes = Object.values(plan.routes);

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/today/plan" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dynamic Replanning</div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">Re-Optimize Route Plan</h1>
            <p className="text-xs text-slate-500 mt-1">
              Current Version: <b>v{plan.selected_version}</b> · Generates <b>v{plan.selected_version + 1}</b> without overwriting history
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Trigger Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-6">
        <h3 className="text-sm font-bold text-navy">Simulate Field Operational Disruption</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Simulate Field Executive Unavailable (e.g. breakdown, sick leave)
            </label>
            <select
              value={unavailableExec}
              onChange={(e) => setUnavailableExec(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-navy font-semibold focus:outline-none"
            >
              <option value="">None (Keep all active executives)</option>
              {routes.map(r => (
                <option key={r.executive_id} value={r.executive_id}>
                  {r.executive_id} — {r.executive_name} ({r.metrics.visit_count} stops)
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Immutable Version Protection</span>
            </div>
            <p className="text-[11px] text-amber-700">
              When re-optimizing, Plan v{plan.selected_version} remains preserved in history for audit compliance. 
              The optimizer will create version v{plan.selected_version + 1} with redistributed workloads.
            </p>
          </div>

          <button
            onClick={handleReoptimize}
            disabled={reoptimizing}
            className="w-full py-3 rounded-xl text-xs font-bold bg-orange text-white hover:bg-orange-dark shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${reoptimizing ? 'animate-spin' : ''}`} />
            <span>{reoptimizing ? 'Calculating New Version...' : `Compute Version v${plan.selected_version + 1}`}</span>
          </button>
        </div>
      </div>

    </div>
  );
};

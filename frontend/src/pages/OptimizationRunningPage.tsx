import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { planningService } from '../services/api';

export const OptimizationRunningPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Friendly Manager Stage Labels (No raw algorithm or internal developer terms)
  const STAGES = [
    { key: 'loading', label: 'Loading today\'s data' },
    { key: 'distance_matrix', label: 'Estimating road distances' },
    { key: 'baseline_computation', label: 'Identifying priority visits' },
    { key: 'routing', label: 'Building routes' },
    { key: 'two_opt_improvement', label: 'Improving route sequence' },
    { key: 'validation', label: 'Checking route feasibility' },
    { key: 'metrics', label: 'Final validation' }
  ];

  useEffect(() => {
    if (!runId) return;

    const interval = setInterval(async () => {
      try {
        const res = await planningService.getOptimizationStatus(runId);
        if (res.success && res.data) {
          setStatusInfo(res.data);
          if (res.data.status === 'completed') {
            clearInterval(interval);
            setTimeout(() => {
              const planId = res.data.plan_id;
              navigate('/today/plan');
            }, 800);
          } else if (res.data.status === 'failed') {
            clearInterval(interval);
            setError(res.data.error_message || 'Planning could not be completed.');
          }
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [runId, navigate]);

  const progress = statusInfo?.progress_pct || 20;
  const currentStage = statusInfo?.stage || 'loading';

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-12 px-2 sm:px-0 space-y-6 sm:space-y-8">
      
      {/* Central Progress Card */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs text-center space-y-6">
        
        <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/20 flex items-center justify-center mx-auto text-orange">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-navy">Building today&apos;s routes...</h2>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing customer time windows and executive capacities
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-navy">
            <span className="capitalize">
              {STAGES.find(s => s.key === currentStage)?.label || 'Optimizing schedules'}...
            </span>
            <span className="font-mono text-orange">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange to-gold rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Live Stage Stepper */}
        <div className="text-left space-y-2.5 pt-4 border-t border-slate-100">
          {STAGES.map((s, idx) => {
            const isDone = progress > (idx + 1) * 14;
            const isCurrent = currentStage === s.key;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-2.5 rounded-xl text-xs transition ${
                  isCurrent
                    ? 'bg-orange/5 text-orange font-bold border border-orange/20'
                    : isDone
                    ? 'text-slate-700 font-medium'
                    : 'text-slate-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-orange animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RouteData } from '../../types';

export interface RouteCardProps {
  route: RouteData;
  planId?: number;
  className?: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  planId,
  className = '',
}) => {
  const m = route.metrics;
  const ptpCount = (route.timeline || []).filter((s) => s.ptp_today === 1).length;
  const isReady = (route.violations?.length || 0) === 0;

  return (
    <Card className={`hover:border-slate-300 transition ${className}`}>
      <div className="space-y-4">
        {/* Header: Executive & Status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#17324D]">{route.executive_name || route.executive_id}</h4>
              <span className="text-[10px] font-mono text-[#66788A] bg-slate-100 px-1.5 py-0.5 rounded">
                {route.executive_id}
              </span>
            </div>
            <p className="text-xs text-[#66788A] mt-0.5">
              Shift Return: {m.return_time} • {m.total_km} km planned
            </p>
          </div>

          <Badge
            variant={isReady ? 'success' : 'danger'}
            size="sm"
            showDot
            label={isReady ? 'READY' : 'VIOLATION'}
          />
        </div>

        {/* Route Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#E4E9EE] text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#66788A]">Visits</div>
            <div className="text-sm font-bold text-[#17324D] mt-0.5">{m.visit_count}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#66788A]">Distance</div>
            <div className="text-sm font-bold text-[#17324D] mt-0.5">{m.total_km} km</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#66788A]">Return</div>
            <div className="text-sm font-bold text-[#17324D] mt-0.5 font-mono">{m.return_time}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#66788A]">Priority</div>
            <div className="text-sm font-bold text-[#F58220] mt-0.5 font-bold">{ptpCount} PTP</div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[#66788A]">
            {isReady ? 'All windows verified' : `${route.violations?.length} issue(s) detected`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            to={planId ? `/plans/${planId}/executives/${route.executive_id}` : `/routes/${route.executive_id}`}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPosition="right"
          >
            Inspect Route
          </Button>
        </div>
      </div>
    </Card>
  );
};

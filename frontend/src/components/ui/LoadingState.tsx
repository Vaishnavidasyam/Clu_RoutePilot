import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  checklist?: string[];
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading operational data...',
  checklist,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center bg-white rounded-2xl border border-[#E4E9EE] shadow-2xs space-y-4 max-w-md mx-auto ${className}`}>
      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-[#173B56] flex items-center justify-center mx-auto">
        <Loader2 className="w-5 h-5 animate-spin text-[#F58220]" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-[#17324D]">{message}</h4>
        <p className="text-xs text-[#66788A]">Communicating with RoutePilot optimization engine</p>
      </div>
      {checklist && checklist.length > 0 && (
        <div className="pt-2 text-left space-y-1.5 text-xs text-[#66788A] border-t border-slate-100">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0FA968]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

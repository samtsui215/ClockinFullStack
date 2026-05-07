import React from 'react';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeeklyProductivityChartProps {
  data: { day: string; hours: number }[];
  totalHours: number;
  weekLabel: string;
  loading?: boolean;
  onPrev: () => void;
  onNext?: () => void;
  onToday?: () => void;
}

export const WeeklyProductivityChart: React.FC<WeeklyProductivityChartProps> = ({
  data,
  totalHours,
  weekLabel,
  loading = false,
  onPrev,
  onNext,
  onToday,
}) => {
  const maxHours = Math.max(...data.map(d => d.hours), 1);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 font-lora">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#1c3260]" />
          <h3 className="text-xl font-semibold text-slate-800">Weekly Hours</h3>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-600 min-w-[90px] text-center">{weekLabel}</span>
          <button
            onClick={onNext}
            disabled={!onNext || loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onToday && (
            <button
              onClick={onToday}
              disabled={loading}
              className="ml-1 px-2.5 py-1 text-xs font-semibold text-[#1c3260] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 disabled:opacity-40 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      {/* Chart */}
      <div className={`flex items-end justify-between gap-3 transition-opacity duration-150 ${loading ? 'opacity-40' : 'opacity-100'}`}>
        {data.map((item) => {
          const barHeight = Math.round((item.hours / maxHours) * 80);
          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end" style={{ height: '80px' }}>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#1c3260] to-[#4062ad] relative group transition-all hover:scale-105"
                  style={{ height: `${Math.max(barHeight, item.hours > 0 ? 2 : 0)}px` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {item.hours}h
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-600">{item.day}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-[#1c3260] to-[#4062ad]" />
            <span>Hours logged</span>
          </div>
        </div>
      </div>
    </div>
  );
};

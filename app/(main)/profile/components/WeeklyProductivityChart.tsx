// app/profile/components/WeeklyProductivityChart.tsx
import React from 'react';
import { TrendingUp } from 'lucide-react';

interface WeeklyProductivityChartProps {
  data: {
    day: string;
    hours: number;
  }[];
}

export const WeeklyProductivityChart: React.FC<WeeklyProductivityChartProps> = ({ data }) => {
  const maxHours = Math.max(...data.map(d => d.hours), 8);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#1c3260]" />
          <h3 className="text-xl font-semibold text-slate-800">Weekly Hours</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">
            {data.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}h
          </p>
          <p className="text-xs text-slate-500">Total this week</p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between gap-3 h-20">
        {data.map((item, index) => {
          const heightPercentage = (item.hours / maxHours) * 100;
          
          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
              {/* Bar */}
              <div className="w-full flex flex-col justify-end h-full">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#1c3260] to-[#4062ad] relative group transition-all hover:scale-105"
                  style={{ height: `${heightPercentage}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {item.hours}h
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Label */}
              <span className="text-xs font-medium text-slate-600">
                {item.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-[#1c3260] to-[#4062ad]"></div>
            <span>Hours logged</span>
          </div>
        </div>
      </div>
    </div>
  );
};
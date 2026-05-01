import React from 'react';
import { Clock, FileText, FolderOpen, CheckCircle2 } from 'lucide-react';

interface Activity {
  id: string;
  type: 'note' | 'project' | 'task';
  title: string;
  description: string;
  timestamp: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
}

const activityIcons = {
  note: FileText,
  project: FolderOpen,
  task: CheckCircle2,
};

const activityColors = {
  note: '#10b981',
  project: '#3b82f6',
  task: '#f59e0b',
};

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ activities }) => {
  return (
    /* font-lora added to the main container */
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 font-lora">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-[#1c3260]" />
        <h3 className="text-xl font-semibold text-slate-800">Recent Activity</h3>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const color = activityColors[activity.type];
            
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
              >
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 text-sm mb-1">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-slate-600 mb-2 line-clamp-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(activity.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
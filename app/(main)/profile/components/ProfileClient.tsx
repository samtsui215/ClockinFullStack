'use client';
import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  FileText, 
  CheckCircle2, 
  FolderOpen 
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { ProfileInfoCard } from './ProfileInfoCard';
import { RecentActivityCard } from './RecentActivityCard';
import { WeeklyProductivityChart } from './WeeklyProductivityChart';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  weeklyCapacity?: number;
  isActive?: boolean;
  createdAt?: string;
}

interface ProfileStats {
  thisWeek: {
    hours: number;
    notes: number;
    completedNotes: number;
    activeProjects: number;
  };
  trends: {
    hours: {
      value: string;
      isPositive: boolean;
    };
    notes: {
      value: string;
      isPositive: boolean;
    };
  };
  dailyHours: Array<{
    day: string;
    hours: number;
  }>;
}

interface Activity {
  id: string;
  type: 'note' | 'project' | 'task';
  title: string;
  description: string;
  timestamp: string;
}

interface ProfileClientProps {
  user: User;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch(`/api/profile/stats?userId=${user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        const activityRes = await fetch(`/api/profile/activity?userId=${user.id}&limit=5`);
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivities(activityData);
        }
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  const userForDisplay = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,
    userType: user.userType,
  };

  return (
    /* font-lora added below to the main container */
    <div className="min-h-screen overflow-y-auto bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 font-lora">
      <div className="max-w-450 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">
            My Profile
          </h1>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1">
            <ProfileInfoCard user={userForDisplay} />
          </div>

          {/* Right Column - Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#1c3260] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading stats...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard
                    title="Hours This Week"
                    value={stats?.thisWeek.hours || 0}
                    subtitle="Total logged"
                    icon={Clock}
                    trend={stats?.trends.hours}
                    color="#1c3260"
                  />
                  <StatsCard
                    title="Actions Created"
                    value={stats?.thisWeek.notes || 0}
                    subtitle="This week"
                    icon={FileText}
                    trend={stats?.trends.notes}
                    color="#3b82f6"
                  />
                  <StatsCard
                    title="Actions Completed"
                    value={stats?.thisWeek.completedNotes || 0}
                    subtitle="This week"
                    icon={CheckCircle2}
                    color="#10b981"
                  />
                  <StatsCard
                    title="Active Projects"
                    value={stats?.thisWeek.activeProjects || 0}
                    subtitle="Currently working"
                    icon={FolderOpen}
                    color="#f59e0b"
                  />
                </div>

                {/* Weekly Chart */}
                {stats && (
                  <WeeklyProductivityChart data={stats.dailyHours} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom Section - Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center justify-center h-32">
                  <p className="text-slate-400">Loading activity...</p>
                </div>
              </div>
            ) : (
              <RecentActivityCard activities={activities} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
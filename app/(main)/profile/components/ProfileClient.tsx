'use client';
import React, { useEffect, useState, useCallback } from 'react';
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

function getWeekLabel(offset: number, weekStart: Date): string {
  if (offset === 0) return 'This Week';
  if (offset === -1) return 'Last Week';
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [chartWeekOffset, setChartWeekOffset] = useState(0);
  const [chartData, setChartData] = useState<{ day: string; hours: number }[]>([]);
  const [chartTotal, setChartTotal] = useState(0);
  const [chartWeekLabel, setChartWeekLabel] = useState('This Week');
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/profile/stats'),
          fetch('/api/profile/activity?limit=5'),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
          // seed chart with current week from main stats to avoid a double fetch
          setChartData(statsData.dailyHours);
          setChartTotal(statsData.thisWeek.hours);
        }
        if (activityRes.ok) setActivities(await activityRes.json());
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchChartWeek = useCallback(async (offset: number) => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/profile/weekly-hours?weekOffset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.dailyHours);
        setChartTotal(data.totalHours);
        setChartWeekLabel(getWeekLabel(offset, new Date(data.weekStart)));
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

  const handleChartPrev = useCallback(() => {
    const next = chartWeekOffset - 1;
    setChartWeekOffset(next);
    fetchChartWeek(next);
  }, [chartWeekOffset, fetchChartWeek]);

  const handleChartNext = useCallback(() => {
    if (chartWeekOffset >= 0) return;
    const next = chartWeekOffset + 1;
    setChartWeekOffset(next);
    fetchChartWeek(next);
  }, [chartWeekOffset, fetchChartWeek]);

  const handleChartToday = useCallback(() => {
    setChartWeekOffset(0);
    setChartWeekLabel('This Week');
    if (stats) {
      setChartData(stats.dailyHours);
      setChartTotal(stats.thisWeek.hours);
    }
  }, [stats]);

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
                  <WeeklyProductivityChart
                    data={chartData}
                    totalHours={chartTotal}
                    weekLabel={chartWeekLabel}
                    loading={chartLoading}
                    onPrev={handleChartPrev}
                    onNext={chartWeekOffset < 0 ? handleChartNext : undefined}
                    onToday={chartWeekOffset < 0 ? handleChartToday : undefined}
                  />
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
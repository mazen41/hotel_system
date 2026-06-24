'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/lib/api';
import type { KPI, ActivityItem, OccupancyDataPoint } from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import OccupancyChart from '@/components/dashboard/OccupancyChart';

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [trend, setTrend] = useState<OccupancyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [kpiRes, actRes, trendRes] = await Promise.all([
          dashboardApi.kpis(),
          dashboardApi.recentActivity(),
          dashboardApi.occupancyTrend(),
        ]);
        setKpis(kpiRes.data);
        setActivity(actRes.data);
        setTrend(trendRes.data);
      } catch {
        // silently fail — mock data available
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Fallback mock data when API is unreachable
  const kpiData: KPI[] = kpis.length > 0 ? kpis : [
    { key: 'total_reservations', label: 'Total Reservations', value: 1284, change: '+12.5%', trend: 'up', period: 'vs last month' },
    { key: 'occupancy_rate',     label: 'Occupancy Rate',     value: '78.4%', change: '+3.2%', trend: 'up', period: 'vs last month' },
    { key: 'todays_checkins',    label: "Today's Check-ins",  value: 24, change: '-2', trend: 'down', period: 'vs yesterday' },
    { key: 'todays_checkouts',   label: "Today's Check-outs", value: 18, change: '+4', trend: 'up', period: 'vs yesterday' },
    { key: 'total_revenue',      label: 'Total Revenue',      value: '$284,750', change: '+8.1%', trend: 'up', period: 'vs last month' },
  ];

  const activityData: ActivityItem[] = activity.length > 0 ? activity : [
    { id: 1, type: 'check_in',   guest: 'Amira Hassan',  room: '304', description: 'Checked in to Deluxe Suite',       time: '2 minutes ago' },
    { id: 2, type: 'reservation', guest: 'Karim Mansour', room: '512', description: 'New reservation for 3 nights',     time: '18 minutes ago' },
    { id: 3, type: 'check_out',  guest: 'Nadia Saleh',   room: '208', description: 'Checked out from Standard Room',   time: '1 hour ago' },
    { id: 4, type: 'reservation', guest: 'Omar Fathy',    room: '101', description: 'New reservation via Booking.com', time: '2 hours ago' },
    { id: 5, type: 'check_in',   guest: 'Layla Ibrahim',  room: '406', description: 'Checked in to Executive Room',    time: '3 hours ago' },
  ];

  const trendData: OccupancyDataPoint[] = trend.length > 0 ? trend : [
    { date: 'Mon', rate: 72 },
    { date: 'Tue', rate: 68 },
    { date: 'Wed', rate: 81 },
    { date: 'Thu', rate: 75 },
    { date: 'Fri', rate: 89 },
    { date: 'Sat', rate: 94 },
    { date: 'Sun', rate: 78 },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.5px',
              marginBottom: '4px',
            }}>
              Good {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Admin'} 👋
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Here&apos;s what&apos;s happening at your property today.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)
          : kpiData.map(kpi => <KPICard key={kpi.key} kpi={kpi} />)
        }
      </div>

      {/* Second row: Activity + Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '16px',
      }}>
        <OccupancyChart data={trendData} loading={loading} />
        <ActivityFeed items={activityData} loading={loading} />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function KPICardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: '12px', background: 'var(--color-border)', borderRadius: '4px', width: '60%', marginBottom: '16px' }} />
      <div style={{ height: '28px', background: 'var(--color-border)', borderRadius: '4px', width: '40%', marginBottom: '10px' }} />
      <div style={{ height: '11px', background: 'var(--color-border)', borderRadius: '4px', width: '50%' }} />
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

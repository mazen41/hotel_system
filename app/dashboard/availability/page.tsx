'use client';

import { useState, useEffect, useRef } from 'react';
import { roomTypesApi } from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import Link from 'next/link';

interface AvailabilityCalendarData {
  [date: string]: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string; dot: string }> = {
  available:     { label: 'Available',    color: 'rgba(16,185,129,0.15)',  glow: '#10b981', dot: '#10b981' },
  booked:        { label: 'Booked',       color: 'rgba(99,102,241,0.15)',  glow: '#6366f1', dot: '#6366f1' },
  blocked:       { label: 'Blocked',      color: 'rgba(239,68,68,0.15)',   glow: '#ef4444', dot: '#ef4444' },
  maintenance:   { label: 'Maintenance',  color: 'rgba(245,158,11,0.15)',  glow: '#f59e0b', dot: '#f59e0b' },
  out_of_order:  { label: 'Out of Order', color: 'rgba(107,114,128,0.15)', glow: '#6b7280', dot: '#6b7280' },
  cleaning:      { label: 'Cleaning',     color: 'rgba(251,191,36,0.15)',  glow: '#fbbf24', dot: '#fbbf24' },
  check_in_day:  { label: 'Check-in',     color: 'rgba(139,92,246,0.15)', glow: '#8b5cf6', dot: '#8b5cf6' },
  check_out_day: { label: 'Check-out',    color: 'rgba(236,72,153,0.15)',  glow: '#ec4899', dot: '#ec4899' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] || { label: status, color: 'rgba(99,99,99,0.15)', glow: '#666', dot: '#666' };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://hotleios.xo.je/api';

async function fetchAvailabilityCalendar(params: {
  start_date: string;
  end_date: string;
  room_type_id?: number;
}): Promise<{ calendar: AvailabilityCalendarData }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const queryString = new URLSearchParams();
  queryString.append('start_date', params.start_date);
  queryString.append('end_date', params.end_date);
  if (params.room_type_id) queryString.append('room_type_id', String(params.room_type_id));

  const response = await fetch(`${API_BASE}/availability/calendar?${queryString.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) throw new Error('Failed to fetch availability calendar');
  return response.json();
}

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<AvailabilityCalendarData>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoomType, setSelectedRoomType] = useState<number | null>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchRoomTypes();
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, selectedRoomType]);

  const fetchRoomTypes = async () => {
    try {
      const response = await roomTypesApi.list();
      setRoomTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch room types:', error);
    }
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      const params: { start_date: string; end_date: string; room_type_id?: number } = {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      };
      if (selectedRoomType) params.room_type_id = selectedRoomType;
      const data = await fetchAvailabilityCalendar(params);
      setCalendarData(data.calendar || {});
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  // padding for first day of week
  const firstDayOfWeek = startOfMonth(currentDate).getDay();

  // stats
  const totalEntries = Object.values(calendarData).flat().length;
  const totalAvailable = Object.values(calendarData).flat().filter((a: any) => a.status === 'available').length;
  const totalBooked = Object.values(calendarData).flat().filter((a: any) => a.status === 'booked').length;
  const occupancyRate = totalEntries > 0 ? Math.round((totalBooked / totalEntries) * 100) : 0;

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', color: 'var(--color-text-primary)' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(99,102,241,0.3); }
          50%       { box-shadow: 0 0 20px rgba(99,102,241,0.6); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        .avail-card {
          animation: fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both;
        }
        .avail-card:nth-child(1) { animation-delay: 0.05s; }
        .avail-card:nth-child(2) { animation-delay: 0.10s; }
        .avail-card:nth-child(3) { animation-delay: 0.15s; }
        .avail-card:nth-child(4) { animation-delay: 0.20s; }
        .day-cell {
          transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s;
        }
        .day-cell:hover {
          transform: translateY(-2px) scale(1.015);
          z-index: 10;
          position: relative;
        }
        .nav-btn {
          transition: all 0.2s;
        }
        .nav-btn:hover {
          transform: scale(1.06);
        }
        .filter-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 32px !important;
        }
        .shimmer-loading {
          background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px', animation: 'fadeInUp 0.4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                animation: 'float 3s ease-in-out infinite',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="1.8"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="8"  y1="2" x2="8"  y2="6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="2.5" fill="white"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
                  Availability Calendar
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
                  Real-time room availability across all dates
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/dashboard/availability/daily" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px', fontWeight: '500',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
              </svg>
              Daily View
            </Link>

            {/* Month nav */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '4px',
            }}>
              <button className="nav-btn" onClick={() => setCurrentDate(subMonths(currentDate, 1))} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: '6px 10px', borderRadius: '7px',
                display: 'flex', alignItems: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', padding: '0 12px', minWidth: '130px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button className="nav-btn" onClick={() => setCurrentDate(addMonths(currentDate, 1))} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: '6px 10px', borderRadius: '7px',
                display: 'flex', alignItems: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <button onClick={() => setCurrentDate(new Date())} style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(99,102,241,0.35)',
              transition: 'all 0.2s',
            }}>
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Rooms', value: roomTypes.length > 0 ? '12' : '—', icon: '🏨', accent: '#6366f1' },
          { label: 'Available',   value: loading ? '…' : String(totalAvailable), icon: '✅', accent: '#10b981' },
          { label: 'Booked',      value: loading ? '…' : String(totalBooked), icon: '📅', accent: '#8b5cf6' },
          { label: 'Occupancy',   value: loading ? '…' : `${occupancyRate}%`, icon: '📊', accent: '#f59e0b' },
        ].map((stat, i) => (
          <div key={stat.label} className="avail-card" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow orb */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px',
              borderRadius: '50%',
              background: stat.accent,
              opacity: 0.08,
              filter: 'blur(20px)',
            }} />
            <div style={{ fontSize: '22px', marginBottom: '10px' }}>{stat.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: stat.accent, letterSpacing: '-0.5px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: '500' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Legend Row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
      }}>
        {/* Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)' }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <select
            className="filter-select"
            value={selectedRoomType || ''}
            onChange={e => setSelectedRoomType(e.target.value ? Number(e.target.value) : null)}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              padding: '7px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              minWidth: '160px',
            }}
          >
            <option value="">All Room Types</option>
            {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {Object.entries(STATUS_CONFIG).slice(0, 6).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: cfg.dot,
                boxShadow: `0 0 6px ${cfg.dot}`,
              }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{
              padding: '14px 0',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface-2)',
            }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* Empty cells for padding */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} style={{
              minHeight: '120px',
              background: 'rgba(0,0,0,0.2)',
              borderRight: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
            }} />
          ))}

          {/* Day cells */}
          {loading ? (
            daysInMonth.map((date, i) => (
              <div key={i} style={{
                minHeight: '120px',
                padding: '10px',
                borderRight: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div className="shimmer-loading" style={{ height: '14px', borderRadius: '4px', width: '24px', marginBottom: '8px' }} />
                <div className="shimmer-loading" style={{ height: '22px', borderRadius: '6px', marginBottom: '4px' }} />
                <div className="shimmer-loading" style={{ height: '22px', borderRadius: '6px', width: '80%' }} />
              </div>
            ))
          ) : (
            daysInMonth.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const availabilities = calendarData[dateStr] || [];
              const isCurrentDay = isToday(date);
              const isHovered = hoveredDate === dateStr;

              // Summarize statuses
              const statusCounts: Record<string, number> = {};
              availabilities.forEach((a: any) => {
                statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
              });

              return (
                <div
                  key={dateStr}
                  className="day-cell"
                  onMouseEnter={() => setHoveredDate(dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  style={{
                    minHeight: '120px',
                    padding: '10px',
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    background: isCurrentDay
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)'
                      : isHovered
                      ? 'rgba(255,255,255,0.02)'
                      : 'transparent',
                    cursor: 'default',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Today glow border */}
                  {isCurrentDay && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      border: '1.5px solid rgba(99,102,241,0.5)',
                      borderRadius: '2px',
                      pointerEvents: 'none',
                      animation: 'pulse-glow 2s ease-in-out infinite',
                    }} />
                  )}

                  {/* Date number */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '600',
                      color: isCurrentDay ? '#818cf8' : 'var(--color-text-secondary)',
                      background: isCurrentDay ? 'rgba(99,102,241,0.15)' : 'transparent',
                      width: '26px', height: '26px',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {format(date, 'd')}
                    </span>
                    {isCurrentDay && (
                      <span style={{
                        fontSize: '9px', fontWeight: '700',
                        color: '#818cf8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}>NOW</span>
                    )}
                  </div>

                  {/* Status pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {Object.entries(statusCounts).slice(0, 4).map(([status, count]) => {
                      const cfg = getStatusCfg(status);
                      return (
                        <div key={status} style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '3px 7px',
                          borderRadius: '5px',
                          background: cfg.color,
                          border: `1px solid ${cfg.dot}22`,
                        }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, flexShrink: 0, boxShadow: `0 0 4px ${cfg.dot}` }} />
                          <span style={{ fontSize: '10px', fontWeight: '500', color: cfg.dot, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {count} {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                    {Object.keys(statusCounts).length > 4 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: '2px' }}>
                        +{Object.keys(statusCounts).length - 4} more
                      </div>
                    )}
                    {availabilities.length === 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>—</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3D-style bottom decoration */}
      <div style={{
        marginTop: '32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {[
          { title: 'Month Overview', value: format(currentDate, 'MMMM yyyy'), sub: `${daysInMonth.length} days total`, icon: '📆', accent: '#6366f1' },
          { title: 'Room Types',     value: String(roomTypes.length),          sub: 'configured types',              icon: '🏷️',  accent: '#8b5cf6' },
          { title: 'Data Entries',   value: loading ? '…' : String(totalEntries), sub: 'availability records',       icon: '🗂️',  accent: '#10b981' },
        ].map(card => (
          <div key={card.title} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', bottom: '-10px', right: '-10px',
              width: '70px', height: '70px',
              borderRadius: '50%',
              background: card.accent,
              opacity: 0.07,
              filter: 'blur(16px)',
            }} />
            <div style={{
              width: '44px', height: '44px',
              background: `linear-gradient(135deg, ${card.accent}22, ${card.accent}11)`,
              border: `1px solid ${card.accent}33`,
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.title}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-primary)', marginTop: '2px' }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

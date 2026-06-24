'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { format, addDays, subDays } from 'date-fns';
import Link from 'next/link';

interface DailySummary {
  room_type_name: string;
  total_rooms: number;
  available: number;
  booked: number;
  blocked: number;
  maintenance: number;
  cleaning: number;
}

export default function DailyAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [summary, setSummary] = useState<DailySummary[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetchDailySummary();
  }, [currentDate]);

  const fetchDailySummary = async () => {
    setLoading(true);
    try {
      const response = await api.get('/availability/daily', {
        params: { date: format(currentDate, 'yyyy-MM-dd') },
      });
      setSummary(response.data.summary || []);
    } catch (error) {
      console.error('Failed to fetch daily summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRooms      = summary.reduce((s, i) => s + i.total_rooms,  0);
  const totalAvailable  = summary.reduce((s, i) => s + i.available,    0);
  const totalBooked     = summary.reduce((s, i) => s + i.booked,       0);
  const totalMaint      = summary.reduce((s, i) => s + i.maintenance,  0);
  const totalBlocked    = summary.reduce((s, i) => s + i.blocked,      0);
  const occupancy       = totalRooms > 0 ? Math.round(((totalRooms - totalAvailable) / totalRooms) * 100) : 0;

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', color: 'var(--color-text-primary)' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .daily-card {
          animation: fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) both;
        }
        .daily-card:nth-child(1) { animation-delay: 0.05s; }
        .daily-card:nth-child(2) { animation-delay: 0.10s; }
        .daily-card:nth-child(3) { animation-delay: 0.15s; }
        .daily-card:nth-child(4) { animation-delay: 0.20s; }
        .daily-card:nth-child(5) { animation-delay: 0.25s; }
        .table-row {
          transition: background 0.15s;
        }
        .table-row:hover {
          background: rgba(99,102,241,0.05) !important;
        }
        .shimmer-loading {
          background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        .nav-day-btn {
          transition: all 0.2s;
        }
        .nav-day-btn:hover {
          background: var(--color-surface-2) !important;
          transform: scale(1.04);
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px', animation: 'fadeInUp 0.4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16,185,129,0.35)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="1.8"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="8" cy="16" r="1.5" fill="white"/>
                <circle cx="12" cy="16" r="1.5" fill="white"/>
                <circle cx="16" cy="16" r="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
                Daily Availability
              </h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
                Room availability snapshot by room type
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/dashboard/availability" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px', fontWeight: '500',
              textDecoration: 'none',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Calendar View
            </Link>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '4px',
            }}>
              <button className="nav-day-btn" onClick={() => setCurrentDate(subDays(currentDate, 1))} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: '6px 10px', borderRadius: '7px',
                display: 'flex', alignItems: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <span style={{ fontSize: '13px', fontWeight: '600', padding: '0 10px', minWidth: '180px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                {format(currentDate, 'EEEE, MMM d, yyyy')}
              </span>
              <button className="nav-day-btn" onClick={() => setCurrentDate(addDays(currentDate, 1))} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: '6px 10px', borderRadius: '7px',
                display: 'flex', alignItems: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <button onClick={() => setCurrentDate(new Date())} style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(16,185,129,0.3)',
            }}>
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Rooms',  value: loading ? '…' : String(totalRooms),     accent: '#6366f1', icon: '🏨' },
          { label: 'Available',    value: loading ? '…' : String(totalAvailable),  accent: '#10b981', icon: '✅' },
          { label: 'Booked',       value: loading ? '…' : String(totalBooked),     accent: '#8b5cf6', icon: '📅' },
          { label: 'Maintenance',  value: loading ? '…' : String(totalMaint),      accent: '#f59e0b', icon: '🔧' },
          { label: 'Blocked',      value: loading ? '…' : String(totalBlocked),    accent: '#ef4444', icon: '🚫' },
          { label: 'Occupancy',    value: loading ? '…' : `${occupancy}%`,         accent: '#ec4899', icon: '📊' },
        ].map((s, i) => (
          <div key={s.label} className="daily-card" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            padding: '18px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-15px', right: '-15px',
              width: '70px', height: '70px', borderRadius: '50%',
              background: s.accent, opacity: 0.08, filter: 'blur(16px)',
            }} />
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
      }}>
        {/* Table header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--color-surface-2)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-accent)' }}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Room Type Breakdown</span>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading…' : `${summary.length} types`}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.15)' }}>
                {['Room Type', 'Total', 'Available', 'Booked', 'Blocked', 'Maintenance', 'Cleaning', 'Occupancy'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: h === 'Room Type' ? 'left' : 'center',
                    fontSize: '10px', fontWeight: '700',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    borderBottom: '1px solid var(--color-border)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
                        <div className="shimmer-loading" style={{ height: '14px', borderRadius: '4px', width: j === 0 ? '100px' : '40px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No availability data for this date
                  </td>
                </tr>
              ) : (
                summary.map((item, idx) => {
                  const occ = item.total_rooms > 0
                    ? Math.round(((item.total_rooms - item.available) / item.total_rooms) * 100)
                    : 0;
                  return (
                    <tr key={item.room_type_name} className="table-row" style={{
                      borderBottom: idx < summary.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'var(--color-accent)',
                            boxShadow: '0 0 6px rgba(99,102,241,0.6)',
                          }} />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {item.room_type_name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{item.total_rooms}</span>
                      </td>
                      {[
                        { val: item.available,   color: '#10b981' },
                        { val: item.booked,      color: '#6366f1' },
                        { val: item.blocked,     color: '#ef4444' },
                        { val: item.maintenance, color: '#f59e0b' },
                        { val: item.cleaning,    color: '#fbbf24' },
                      ].map((cell, ci) => (
                        <td key={ci} style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {cell.val > 0 ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: '28px', height: '22px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              background: `${cell.color}18`,
                              border: `1px solid ${cell.color}30`,
                              fontSize: '12px', fontWeight: '600',
                              color: cell.color,
                            }}>{cell.val}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <div style={{
                            width: '60px', height: '6px',
                            background: 'var(--color-surface-2)',
                            borderRadius: '3px', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${occ}%`,
                              background: occ > 80 ? '#ef4444' : occ > 50 ? '#f59e0b' : '#10b981',
                              borderRadius: '3px',
                              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                              boxShadow: occ > 80 ? '0 0 6px rgba(239,68,68,0.5)' : occ > 50 ? '0 0 6px rgba(245,158,11,0.5)' : '0 0 6px rgba(16,185,129,0.5)',
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', minWidth: '32px' }}>{occ}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

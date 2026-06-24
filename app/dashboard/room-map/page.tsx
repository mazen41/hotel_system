'use client';

import { useState, useEffect, useCallback } from 'react';
import { roomsApi, reservationsApi, ApiError } from '@/lib/api';
import type { Room, Reservation } from '@/types';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; border: string; text: string; dot: string; icon: string }> = {
  available:      { label: 'Available',      bg: 'rgba(16,185,129,0.1)',  border: '#10b981', text: '#10b981', dot: '#10b981', icon: '✓' },
  occupied:       { label: 'Occupied',        bg: 'rgba(59,130,246,0.1)',  border: '#3b82f6', text: '#60a5fa', dot: '#3b82f6', icon: '●' },
  cleaning:       { label: 'Cleaning',        bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', text: '#fbbf24', dot: '#f59e0b', icon: '◎' },
  maintenance:    { label: 'Maintenance',     bg: 'rgba(249,115,22,0.1)', border: '#f97316', text: '#fb923c', dot: '#f97316', icon: '⚙' },
  out_of_order:   { label: 'Out of Order',    bg: 'rgba(239,68,68,0.1)',  border: '#ef4444', text: '#f87171', dot: '#ef4444', icon: '✕' },
  out_of_service: { label: 'Out of Service',  bg: 'rgba(168,85,247,0.1)', border: '#a855f7', text: '#c084fc', dot: '#a855f7', icon: '⊘' },
};

const ALL_STATUSES = Object.keys(STATUS) as (keyof typeof STATUS)[];

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomWithRes extends Room {
  activeReservation?: Reservation;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoomMapPage() {
  const [rooms, setRooms] = useState<RoomWithRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomWithRes | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [updatingRoom, setUpdatingRoom] = useState<number | null>(null);

  // ─── Data ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = toISO(currentDate);

      const [roomsRes, resRes] = await Promise.all([
        roomsApi.list({ active: true, sort: 'room_number', direction: 'asc' }),
        reservationsApi.list({
          status: 'checked_in',
          date_from: dateStr,
          date_to: dateStr,
          per_page: 500,
        }),
      ]);

      // Also grab confirmed reservations arriving today
      const confirmedRes = await reservationsApi.list({
        status: 'confirmed',
        date_from: dateStr,
        date_to: dateStr,
        per_page: 500,
      });

      const activeMap = new Map<number, Reservation>();
      for (const r of [...resRes.data, ...confirmedRes.data]) {
        // Only count if date overlaps today
        const ci = new Date(r.check_in_date);
        const co = new Date(r.check_out_date);
        const today = new Date(dateStr);
        if (ci <= today && co > today) {
          activeMap.set(r.room_id, r);
        }
      }

      const enriched: RoomWithRes[] = roomsRes.data.map(room => ({
        ...room,
        activeReservation: activeMap.get(room.id),
      }));

      setRooms(enriched);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load rooms', false);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function toISO(d: Date) { return d.toISOString().split('T')[0]; }

  function addDays(d: Date, n: number) {
    const c = new Date(d); c.setDate(c.getDate() + n); return c;
  }

  function fmtDate(d: Date) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isToday(d: Date) { return toISO(d) === toISO(new Date()); }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const floors = [...new Set(rooms.map(r => r.floor).filter(Boolean))].sort() as string[];
  const types  = [...new Set(rooms.map(r => r.room_type?.name).filter(Boolean))].sort() as string[];

  const filtered = rooms.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterFloor  && r.floor  !== filterFloor)  return false;
    if (filterType   && r.room_type?.name !== filterType) return false;
    return true;
  });

  // Group by floor
  const byFloor = filtered.reduce<Record<string, RoomWithRes[]>>((acc, r) => {
    const f = r.floor || 'Ground';
    if (!acc[f]) acc[f] = [];
    acc[f].push(r);
    return acc;
  }, {});

  const floorKeys = Object.keys(byFloor).sort();

  // Summary counts from ALL rooms (not filtered)
  const counts = rooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc._total = (acc._total || 0) + 1;
    return acc;
  }, {});

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function changeStatus(roomId: number, status: string) {
    setUpdatingRoom(roomId);
    try {
      await roomsApi.update(roomId, { status: status as any });
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: status as any } : r));
      if (selectedRoom?.id === roomId) setSelectedRoom(prev => prev ? { ...prev, status: status as any } : null);
      showToast(`Room updated to ${STATUS[status]?.label || status}`, true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Update failed', false);
    } finally {
      setUpdatingRoom(null);
    }
  }

  async function handleBulkUpdate() {
    if (!selectedIds.size || !bulkStatus) return;
    setBulkUpdating(true);
    try {
      await roomsApi.bulkStatusUpdate({ room_ids: Array.from(selectedIds), status: bulkStatus });
      setRooms(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status: bulkStatus as any } : r));
      showToast(`${selectedIds.size} rooms → ${STATUS[bulkStatus]?.label}`, true);
      setSelectedIds(new Set());
      setBulkStatus('');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Bulk update failed', false);
    } finally {
      setBulkUpdating(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function selectAll() {
    const allIds = filtered.map(r => r.id);
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '-0.4px' }}>Room Map</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Live status overview for {fmtDate(currentDate)}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Date nav */}
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} style={btnOutline}>‹ Prev</button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{ ...btnOutline, ...(isToday(currentDate) ? { background: 'var(--color-accent)', color: 'white', border: 'none' } : {}) }}
          >
            Today
          </button>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} style={btnOutline}>Next ›</button>

          <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }} />

          <button onClick={fetchData} disabled={loading} style={btnOutline}>
            <span style={{ display: 'inline-block', animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>↻</span> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
        <SummaryTile label="Total" value={counts._total || 0} color="#6366f1" bg="rgba(99,102,241,0.1)" border="#6366f1" />
        {ALL_STATUSES.map(s => (
          <SummaryTile
            key={s}
            label={STATUS[s].label}
            value={counts[s] || 0}
            color={STATUS[s].text}
            bg={STATUS[s].bg}
            border={STATUS[s].border}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            active={filterStatus === s}
          />
        ))}
      </div>

      {/* ── Filters + Bulk ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter</span>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>

        {floors.length > 0 && (
          <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={sel}>
            <option value="">All Floors</option>
            {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
        )}

        {types.length > 0 && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={sel}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {(filterStatus || filterFloor || filterType) && (
          <button onClick={() => { setFilterStatus(''); setFilterFloor(''); setFilterType(''); }} style={{ ...btnOutline, fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Clear ✕
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: '600' }}>{selectedIds.size} selected</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={sel}>
              <option value="">Set status…</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || bulkUpdating}
              style={{ ...btnPrimary, opacity: (!bulkStatus || bulkUpdating) ? 0.5 : 1 }}
            >
              {bulkUpdating ? 'Updating…' : 'Apply'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={btnOutline}>Deselect</button>
          </div>
        )}

        <button onClick={selectAll} style={btnOutline}>
          {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* ── Room Grid ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '14px', flexDirection: 'column' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading rooms…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          No rooms match the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {floorKeys.map(floor => (
            <div key={floor} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Floor header */}
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-primary)' }}>Floor {floor}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'var(--color-border)', padding: '2px 8px', borderRadius: '10px' }}>{byFloor[floor].length} rooms</span>
              </div>

              {/* Room cards */}
              <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {byFloor[floor].map(room => {
                  const st = STATUS[room.status] || STATUS.available;
                  const isSelected = selectedIds.has(room.id);
                  const isUpdating = updatingRoom === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      style={{
                        position: 'relative',
                        background: isSelected ? 'rgba(99,102,241,0.12)' : st.bg,
                        border: `2px solid ${isSelected ? '#6366f1' : st.border}`,
                        borderRadius: '10px',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        opacity: isUpdating ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={e => { e.stopPropagation(); toggleSelect(room.id); }}
                        style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '16px', height: '16px', borderRadius: '4px',
                          border: `2px solid ${isSelected ? '#6366f1' : 'var(--color-border)'}`,
                          background: isSelected ? '#6366f1' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {isSelected && <span style={{ color: 'white', fontSize: '10px', lineHeight: 1 }}>✓</span>}
                      </div>

                      {/* Room number */}
                      <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '4px' }}>
                        {room.room_number}
                      </div>

                      {/* Type */}
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                        {room.room_type?.name || ''}
                      </div>

                      {/* Status pill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: st.text }}>{st.label}</span>
                      </div>

                      {/* Guest info or price */}
                      {room.activeReservation ? (
                        <div style={{ borderTop: `1px solid ${st.border}`, paddingTop: '8px', marginTop: '4px', opacity: 0.9 }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {room.activeReservation.guest?.full_name || 'Guest'}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            ↳ {new Date(room.activeReservation.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ${parseFloat(room.room_type?.base_price as any || 0).toFixed(0)}/night
                        </div>
                      )}

                      {isUpdating && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '10px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '18px', height: '18px', border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Room Detail Modal ── */}
      {selectedRoom && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={() => setSelectedRoom(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '380px', maxWidth: '95vw',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '16px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            zIndex: 51, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 20px 14px',
              background: STATUS[selectedRoom.status]?.bg || 'transparent',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  Room {selectedRoom.room_number}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  {selectedRoom.room_type?.name || ''}{selectedRoom.floor ? ` · Floor ${selectedRoom.floor}` : ''}
                </div>
              </div>
              <button onClick={() => setSelectedRoom(null)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>

            {/* Info */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <InfoRow label="Status">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: STATUS[selectedRoom.status]?.text }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS[selectedRoom.status]?.dot, display: 'inline-block' }} />
                  {STATUS[selectedRoom.status]?.label}
                </span>
              </InfoRow>
              <InfoRow label="Rate"><span>${parseFloat(selectedRoom.room_type?.base_price as any || 0).toFixed(0)}/night</span></InfoRow>

              {selectedRoom.activeReservation && (
                <>
                  <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Current Guest</div>
                  <InfoRow label="Name"><span style={{ fontWeight: '600' }}>{selectedRoom.activeReservation.guest?.full_name}</span></InfoRow>
                  <InfoRow label="Phone"><span>{selectedRoom.activeReservation.guest?.phone || '—'}</span></InfoRow>
                  <InfoRow label="Check-in"><span>{new Date(selectedRoom.activeReservation.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></InfoRow>
                  <InfoRow label="Check-out"><span>{new Date(selectedRoom.activeReservation.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></InfoRow>
                  <InfoRow label="Nights"><span>{selectedRoom.activeReservation.nights}</span></InfoRow>
                  <InfoRow label="Total"><span style={{ fontWeight: '600', color: '#6366f1' }}>${parseFloat(selectedRoom.activeReservation.total_amount as any || 0).toFixed(2)}</span></InfoRow>
                </>
              )}
            </div>

            {/* Status changer */}
            <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Change Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px' }}>
                {ALL_STATUSES.map(s => {
                  const st = STATUS[s];
                  const isCurrent = selectedRoom.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => changeStatus(selectedRoom.id, s)}
                      disabled={isCurrent || updatingRoom === selectedRoom.id}
                      style={{
                        padding: '8px 4px',
                        border: `1.5px solid ${isCurrent ? st.border : 'var(--color-border)'}`,
                        borderRadius: '8px',
                        background: isCurrent ? st.bg : 'transparent',
                        color: isCurrent ? st.text : 'var(--color-text-secondary)',
                        fontSize: '11px', fontWeight: '600',
                        cursor: isCurrent ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{st.icon}</span>
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
          background: toast.ok ? '#064e3b' : '#7f1d1d',
          border: `1px solid ${toast.ok ? '#10b981' : '#ef4444'}`,
          color: toast.ok ? '#10b981' : '#f87171',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'fadeUp 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryTile({ label, value, color, bg, border, onClick, active }: {
  label: string; value: number; color: string; bg: string; border: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? bg : 'var(--color-surface)',
        border: `1px solid ${active ? border : 'var(--color-border)'}`,
        borderRadius: '10px', padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}
    >
      <span style={{ fontSize: '24px', fontWeight: '800', color: active ? color : 'var(--color-text-primary)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '11px', fontWeight: '600', color: active ? color : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', textAlign: 'right' }}>{children}</span>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btnOutline: React.CSSProperties = {
  padding: '7px 12px', border: '1px solid var(--color-border)', borderRadius: '8px',
  background: 'transparent', color: 'var(--color-text-secondary)',
  fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
};

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', border: 'none', borderRadius: '8px',
  background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: 'white',
  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
};

const sel: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: '8px',
  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
  fontSize: '13px', outline: 'none',
};

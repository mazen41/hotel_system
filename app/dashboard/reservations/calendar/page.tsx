'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { reservationsApi, roomsApi, ApiError } from '@/lib/api';
import type { Reservation, Room } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_WIDTH = 48;
const ROW_HEIGHT = 56;
const ROOM_LABEL_WIDTH = 180;
const HEADER_HEIGHT = 64;

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  confirmed:   { bg: '#eef2ff', border: '#818cf8', text: '#3730a3', dot: '#6366f1' },
  pending:     { bg: '#fefce8', border: '#fbbf24', text: '#92400e', dot: '#f59e0b' },
  checked_in:  { bg: '#eff6ff', border: '#60a5fa', text: '#1e40af', dot: '#3b82f6' },
  checked_out: { bg: '#f9fafb', border: '#d1d5db', text: '#374151', dot: '#9ca3af' },
  cancelled:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' },
  no_show:     { bg: '#fdf4ff', border: '#d8b4fe', text: '#6b21a8', dot: '#a855f7' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString('en-US', opts);
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragState {
  reservationId: number;
  originalRoomId: number;
  offsetDays: number; // days from drag-start-date to reservation check-in
}

interface DropPreview {
  roomId: number;
  checkIn: Date;
  checkOut: Date;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [today] = useState(() => startOfDay(new Date()));

  // View window: 60 days starting from viewStart
  const [viewStart, setViewStart] = useState(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - 7);
    return d;
  });
  const VIEW_DAYS = 60;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filters
  const [filterFloor, setFilterFloor] = useState('');
  const [filterType, setFilterType] = useState('');

  // Drag & drop
  const dragRef = useRef<DragState | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Detail popup
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, resRes] = await Promise.all([
        roomsApi.list({ active: true, sort: 'room_number', direction: 'asc' }),
        reservationsApi.list({
          date_from: toISO(viewStart),
          date_to: toISO(addDays(viewStart, VIEW_DAYS)),
          per_page: 500,
        }),
      ]);
      setRooms(roomsRes.data);
      setReservations(resRes.data);
    } catch {
      showToast('Failed to load calendar data', false);
    } finally {
      setLoading(false);
    }
  }, [viewStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Scroll to today on mount
  useEffect(() => {
    if (!scrollRef.current || loading) return;
    const todayOffset = diffDays(viewStart, today);
    if (todayOffset >= 0) {
      scrollRef.current.scrollLeft = todayOffset * DAY_WIDTH - 120;
    }
  }, [loading]);

  // ─── Toast ───────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Derived Data ────────────────────────────────────────────────────────────

  const floors = [...new Set(rooms.map(r => r.floor).filter(Boolean))].sort();
  const roomTypes = [...new Set(rooms.map(r => r.room_type?.name).filter(Boolean))].sort();

  const filteredRooms = rooms.filter(r => {
    if (filterFloor && r.floor !== filterFloor) return false;
    if (filterType && r.room_type?.name !== filterType) return false;
    return true;
  });

  const days = Array.from({ length: VIEW_DAYS }, (_, i) => addDays(viewStart, i));

  // Map reservations by room
  const resByRoom = new Map<number, Reservation[]>();
  for (const res of reservations) {
    if (!resByRoom.has(res.room_id)) resByRoom.set(res.room_id, []);
    resByRoom.get(res.room_id)!.push(res);
  }

  // ─── Geometry ────────────────────────────────────────────────────────────────

  function dayIndexFromX(clientX: number): number {
    if (!scrollRef.current) return 0;
    const rect = scrollRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current.scrollLeft;
    const x = clientX - rect.left + scrollLeft - ROOM_LABEL_WIDTH;
    return Math.floor(x / DAY_WIDTH);
  }

  function roomIndexFromY(clientY: number): number {
    if (!scrollRef.current) return 0;
    const rect = scrollRef.current.getBoundingClientRect();
    const scrollTop = scrollRef.current.scrollTop;
    const y = clientY - rect.top + scrollTop - HEADER_HEIGHT;
    return Math.floor(y / ROW_HEIGHT);
  }

  // ─── Drag Handlers ───────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, res: Reservation, dayIdx: number) {
    e.dataTransfer.effectAllowed = 'move';
    // Calculate how many days from the check-in to the day being dragged
    const checkIn = startOfDay(new Date(res.check_in_date));
    const dragDay = addDays(viewStart, dayIdx);
    const offsetDays = diffDays(checkIn, dragDay);

    dragRef.current = {
      reservationId: res.id,
      originalRoomId: res.room_id,
      offsetDays,
    };
    setIsDragging(true);
    // Ghost image
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position:fixed; top:-200px; left:0;
      padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600;
      background:#6366f1; color:white; white-space:nowrap; opacity:0.95;
      box-shadow:0 8px 24px rgba(99,102,241,0.4);
    `;
    ghost.textContent = `✦ ${res.guest?.full_name || 'Guest'} · ${res.nights}N`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  function onDragOver(e: React.DragEvent, roomIdx: number, dayIdx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const drag = dragRef.current;
    if (!drag) return;

    const res = reservations.find(r => r.id === drag.reservationId);
    if (!res) return;

    const nights = res.nights || diffDays(new Date(res.check_in_date), new Date(res.check_out_date));
    const newCheckIn = addDays(viewStart, dayIdx - drag.offsetDays);
    const newCheckOut = addDays(newCheckIn, nights);
    const room = filteredRooms[roomIdx];
    if (!room) return;

    setDropPreview({ roomId: room.id, checkIn: newCheckIn, checkOut: newCheckOut });
  }

  async function onDrop(e: React.DragEvent, roomIdx: number, dayIdx: number) {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag) return;

    const res = reservations.find(r => r.id === drag.reservationId);
    if (!res) return;

    const nights = res.nights || diffDays(new Date(res.check_in_date), new Date(res.check_out_date));
    const newCheckIn = addDays(viewStart, dayIdx - drag.offsetDays);
    const newCheckOut = addDays(newCheckIn, nights);
    const newRoom = filteredRooms[roomIdx];

    if (!newRoom) return;

    const sameRoom = newRoom.id === res.room_id;
    const sameDate = toISO(newCheckIn) === res.check_in_date;
    if (sameRoom && sameDate) {
      cleanup();
      return;
    }

    // Optimistic update
    setReservations(prev => prev.map(r =>
      r.id === res.id
        ? { ...r, room_id: newRoom.id, room: { ...r.room!, room_number: newRoom.room_number }, check_in_date: toISO(newCheckIn), check_out_date: toISO(newCheckOut) }
        : r
    ));
    cleanup();

    try {
      await reservationsApi.update(res.id, {
        room_id: newRoom.id,
        check_in_date: toISO(newCheckIn),
        check_out_date: toISO(newCheckOut),
      });
      showToast(`✓ Moved to Room ${newRoom.room_number}`, true);
    } catch (err) {
      // Revert
      setReservations(prev => prev.map(r =>
        r.id === res.id ? res : r
      ));
      const msg = err instanceof ApiError ? err.message : 'Move failed';
      showToast(msg, false);
    }
  }

  function cleanup() {
    dragRef.current = null;
    setDropPreview(null);
    setIsDragging(false);
  }

  // ─── Reservation Block Geometry ───────────────────────────────────────────

  function getBlock(res: Reservation) {
    const checkIn = startOfDay(new Date(res.check_in_date));
    const checkOut = startOfDay(new Date(res.check_out_date));
    const startIdx = diffDays(viewStart, checkIn);
    const endIdx = diffDays(viewStart, checkOut);
    const clampedStart = Math.max(0, startIdx);
    const clampedEnd = Math.min(VIEW_DAYS, endIdx);
    if (clampedEnd <= clampedStart) return null;
    return {
      left: clampedStart * DAY_WIDTH + 4,
      width: (clampedEnd - clampedStart) * DAY_WIDTH - 8,
      startIdx,
      endIdx,
      clippedLeft: startIdx < 0,
      clippedRight: endIdx > VIEW_DAYS,
    };
  }

  // ─── Status Bar ──────────────────────────────────────────────────────────────

  function getRoomDayStatus(room: Room, dayIdx: number): 'today' | 'weekend' | null {
    const day = addDays(viewStart, dayIdx);
    if (toISO(day) === toISO(today)) return 'today';
    if (day.getDay() === 0 || day.getDay() === 6) return 'weekend';
    return null;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: 'var(--color-background)', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => router.push('/dashboard/reservations')}
          style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          List
        </button>

        <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          Room Calendar
        </div>

        {/* Date nav */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
          <button onClick={() => setViewStart(d => addDays(d, -7))} style={navBtn}>‹ Week</button>
          <button onClick={() => { const d = startOfDay(new Date()); d.setDate(d.getDate() - 7); setViewStart(d); }} style={navBtn}>Today</button>
          <button onClick={() => setViewStart(d => addDays(d, 7))} style={navBtn}>Week ›</button>
          <button onClick={() => setViewStart(d => addDays(d, -30))} style={navBtn}>‹ Mo</button>
          <button onClick={() => setViewStart(d => addDays(d, 30))} style={navBtn}>Mo ›</button>
        </div>

        <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginLeft: '4px' }}>
          {fmt(viewStart, { month: 'short', day: 'numeric' })} – {fmt(addDays(viewStart, VIEW_DAYS - 1), { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Filters */}
        {floors.length > 0 && (
          <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={selectStyle}>
            <option value="">All Floors</option>
            {floors.map(f => <option key={f} value={f!}>Floor {f}</option>)}
          </select>
        )}
        {roomTypes.length > 0 && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            {roomTypes.map(t => <option key={t} value={t!}>{t}</option>)}
          </select>
        )}

        <button
          onClick={fetchData}
          style={{ padding: '7px 14px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '13px' }}
        >
          ↻ Refresh
        </button>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '4px', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_STYLES).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.dot }} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--color-border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading calendar…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div
          ref={scrollRef}
          style={{ flex: 1, overflow: 'auto', position: 'relative', cursor: isDragging ? 'grabbing' : 'default' }}
          onDragEnd={cleanup}
        >
          {/* Total width = label + days */}
          <div style={{ width: ROOM_LABEL_WIDTH + VIEW_DAYS * DAY_WIDTH, position: 'relative', minHeight: HEADER_HEIGHT + filteredRooms.length * ROW_HEIGHT }}>

            {/* ── Sticky Header ── */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 30,
              display: 'flex', background: 'var(--color-surface)',
              borderBottom: '2px solid var(--color-border)',
              height: HEADER_HEIGHT,
            }}>
              {/* Corner */}
              <div style={{
                width: ROOM_LABEL_WIDTH, flexShrink: 0,
                display: 'flex', alignItems: 'flex-end', paddingBottom: '10px', paddingLeft: '16px',
                background: 'var(--color-surface)',
                position: 'sticky', left: 0, zIndex: 31,
                borderRight: '2px solid var(--color-border)',
              }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {filteredRooms.length} Rooms
                </span>
              </div>

              {/* Day columns */}
              <div style={{ display: 'flex', position: 'relative' }}>
                {days.map((day, i) => {
                  const isToday = toISO(day) === toISO(today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isFirstOfMonth = day.getDate() === 1;
                  return (
                    <div key={i} style={{
                      width: DAY_WIDTH, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                      paddingBottom: '8px', gap: '2px',
                      background: isToday ? 'rgba(99,102,241,0.06)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent',
                      borderLeft: isFirstOfMonth ? '1px solid var(--color-border)' : 'none',
                      position: 'relative',
                    }}>
                      {isFirstOfMonth && (
                        <span style={{ position: 'absolute', top: '8px', left: '4px', fontSize: '10px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {fmt(day, { month: 'short' })}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: isToday ? '#6366f1' : isWeekend ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', fontWeight: isToday ? '700' : '500', textTransform: 'uppercase' }}>
                        {fmt(day, { weekday: 'narrow' })}
                      </span>
                      <div style={{
                        width: isToday ? '28px' : '24px',
                        height: isToday ? '28px' : '24px',
                        borderRadius: '50%',
                        background: isToday ? '#6366f1' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: isToday ? '700' : '500', color: isToday ? 'white' : isWeekend ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                          {day.getDate()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Room Rows ── */}
            {filteredRooms.map((room, rowIdx) => {
              const roomRes = resByRoom.get(room.id) || [];
              const isPreviewTarget = dropPreview?.roomId === room.id;

              return (
                <div key={room.id} style={{ display: 'flex', height: ROW_HEIGHT, position: 'relative' }}>

                  {/* Room label (sticky left) */}
                  <div style={{
                    width: ROOM_LABEL_WIDTH, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '0 12px',
                    background: 'var(--color-surface)',
                    position: 'sticky', left: 0, zIndex: 20,
                    borderRight: '2px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: room.status === 'available' ? '#22c55e'
                        : room.status === 'occupied' ? '#3b82f6'
                        : room.status === 'cleaning' ? '#f59e0b'
                        : '#ef4444',
                    }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                        {room.room_number}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>
                        {room.room_type?.name || ''}{room.floor ? ` · F${room.floor}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Drop zone (full row width) */}
                  <div
                    style={{
                      position: 'relative',
                      width: VIEW_DAYS * DAY_WIDTH,
                      height: '100%',
                      borderBottom: '1px solid var(--color-border)',
                      background: isPreviewTarget ? 'rgba(99,102,241,0.04)' : 'transparent',
                    }}
                    onDragOver={e => onDragOver(e, rowIdx, dayIndexFromX(e.clientX))}
                    onDrop={e => onDrop(e, rowIdx, dayIndexFromX(e.clientX))}
                  >
                    {/* Day cell backgrounds */}
                    {days.map((day, i) => {
                      const isToday = toISO(day) === toISO(today);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div key={i} style={{
                          position: 'absolute',
                          left: i * DAY_WIDTH, top: 0,
                          width: DAY_WIDTH, height: '100%',
                          background: isToday ? 'rgba(99,102,241,0.05)' : isWeekend ? 'rgba(0,0,0,0.018)' : 'transparent',
                          borderLeft: day.getDate() === 1 ? '1px solid var(--color-border)' : '1px solid transparent',
                          boxSizing: 'border-box',
                        }} />
                      );
                    })}

                    {/* Today vertical line */}
                    {(() => {
                      const idx = diffDays(viewStart, today);
                      if (idx < 0 || idx >= VIEW_DAYS) return null;
                      return (
                        <div style={{
                          position: 'absolute', left: idx * DAY_WIDTH + DAY_WIDTH / 2,
                          top: 0, bottom: 0, width: '2px',
                          background: 'rgba(99,102,241,0.3)', pointerEvents: 'none', zIndex: 1,
                        }} />
                      );
                    })()}

                    {/* Drop preview ghost */}
                    {isPreviewTarget && dropPreview && (() => {
                      const startIdx = diffDays(viewStart, dropPreview.checkIn);
                      const endIdx = diffDays(viewStart, dropPreview.checkOut);
                      const cs = Math.max(0, startIdx);
                      const ce = Math.min(VIEW_DAYS, endIdx);
                      if (ce <= cs) return null;
                      return (
                        <div style={{
                          position: 'absolute',
                          left: cs * DAY_WIDTH + 2, top: '8px',
                          width: (ce - cs) * DAY_WIDTH - 4, height: ROW_HEIGHT - 16,
                          borderRadius: '8px',
                          background: 'rgba(99,102,241,0.15)',
                          border: '2px dashed #6366f1',
                          zIndex: 5, pointerEvents: 'none',
                          display: 'flex', alignItems: 'center', paddingLeft: '10px',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6366f1' }}>Drop here</span>
                        </div>
                      );
                    })()}

                    {/* Reservation blocks */}
                    {roomRes.map(res => {
                      const block = getBlock(res);
                      if (!block) return null;
                      const st = STATUS_STYLES[res.status] || STATUS_STYLES.confirmed;
                      const isDraggedItem = dragRef.current?.reservationId === res.id;

                      return (
                        <div
                          key={res.id}
                          draggable
                          onDragStart={e => onDragStart(e, res, Math.round(block.left / DAY_WIDTH))}
                          onClick={e => {
                            if (isDragging) return;
                            setSelected(res);
                            setPopupPos({ x: e.clientX, y: e.clientY });
                          }}
                          title={`${res.guest?.full_name} · ${res.check_in_date} → ${res.check_out_date}`}
                          style={{
                            position: 'absolute',
                            left: block.left,
                            top: '7px',
                            width: block.width,
                            height: ROW_HEIGHT - 14,
                            borderRadius: block.clippedLeft && block.clippedRight ? '0' : block.clippedLeft ? '0 8px 8px 0' : block.clippedRight ? '8px 0 0 8px' : '8px',
                            background: st.bg,
                            border: `1.5px solid ${st.border}`,
                            display: 'flex', alignItems: 'center',
                            paddingLeft: block.clippedLeft ? '6px' : '10px',
                            paddingRight: '6px',
                            gap: '6px',
                            cursor: isDraggedItem ? 'grabbing' : 'grab',
                            zIndex: isDraggedItem ? 1 : 10,
                            opacity: isDraggedItem ? 0.4 : 1,
                            transition: 'opacity 0.15s, box-shadow 0.15s',
                            overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            userSelect: 'none',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; (e.currentTarget as HTMLDivElement).style.zIndex = '20'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.zIndex = '10'; }}
                        >
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                          {block.width > 60 && (
                            <div style={{ overflow: 'hidden', minWidth: 0 }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: st.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                {res.guest?.full_name || 'Guest'}
                              </div>
                              {block.width > 100 && (
                                <div style={{ fontSize: '10px', color: st.text, opacity: 0.75, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                                  {res.nights}N · {res.reservation_number}
                                </div>
                              )}
                            </div>
                          )}
                          {/* drag handle hint */}
                          {block.width > 80 && (
                            <div style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.35, fontSize: '12px', color: st.dot }}>⠿</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredRooms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                No rooms match the current filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
          background: toast.ok ? '#166534' : '#991b1b', color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'fadeUp 0.25s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Reservation Popup ── */}
      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setSelected(null)} />
          <div style={{
            position: 'fixed',
            left: Math.min(popupPos.x + 12, window.innerWidth - 320),
            top: Math.min(popupPos.y + 12, window.innerHeight - 320),
            width: '300px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            zIndex: 51,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px 12px',
              background: STATUS_STYLES[selected.status]?.bg || '#f9fafb',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: STATUS_STYLES[selected.status]?.text || '#374151' }}>
                  {selected.reservation_number}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {selected.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Row label="Guest" value={selected.guest?.full_name || '—'} bold />
              <Row label="Phone" value={selected.guest?.phone || '—'} />
              <Row label="Room" value={`${selected.room?.room_number || '—'} · ${selected.room_type?.name || ''}`} />
              <Row label="Check-in" value={new Date(selected.check_in_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
              <Row label="Check-out" value={new Date(selected.check_out_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
              <Row label="Duration" value={`${selected.nights} night${selected.nights !== 1 ? 's' : ''}`} />
              <Row label="Total" value={`$${parseFloat(selected.total_amount as any || 0).toFixed(2)}`} bold />
              {selected.special_requests && <Row label="Requests" value={selected.special_requests} />}
            </div>

            {/* Footer actions */}
            <div style={{ padding: '10px 16px 14px', display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => { setSelected(null); router.push(`/dashboard/reservations/${selected.id}`); }}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: 'white', cursor: 'pointer' }}
              >
                Open Details
              </button>
              {selected.status === 'confirmed' && (
                <button
                  onClick={async () => {
                    setSelected(null);
                    try { await reservationsApi.checkIn(selected.id); showToast('✓ Checked in!', true); fetchData(); }
                    catch { showToast('Check-in failed', false); }
                  }}
                  style={{ flex: 1, padding: '8px', border: '1px solid #22c55e', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: 'rgba(34,197,94,0.08)', color: '#15803d', cursor: 'pointer' }}
                >
                  Check-In
                </button>
              )}
              {selected.status === 'checked_in' && (
                <button
                  onClick={async () => {
                    setSelected(null);
                    try { await reservationsApi.checkOut(selected.id); showToast('✓ Checked out!', true); fetchData(); }
                    catch { showToast('Check-out failed', false); }
                  }}
                  style={{ flex: 1, padding: '8px', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: 'rgba(59,130,246,0.08)', color: '#1d4ed8', cursor: 'pointer' }}
                >
                  Check-Out
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: bold ? '600' : '400', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: '6px',
  background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
  fontSize: '12px', fontWeight: '500', cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: '8px',
  background: 'var(--color-background)', color: 'var(--color-text-primary)',
  fontSize: '13px', outline: 'none',
};

'use client';

import { useEffect, useState } from 'react';
import { reservationsApi, guestsApi, roomsApi, ApiError } from '@/lib/api';
import type { Reservation, Room, RoomType, Guest } from '@/types';
import ReservationModal from '@/components/reservations/ReservationModal';
import AvailabilityPanel from '@/components/reservations/AvailabilityPanel';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showAvailabilityPanel, setShowAvailabilityPanel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterRoomType, setFilterRoomType] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('check_in_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchReservations();
  }, [filterStatus, filterPaymentStatus, filterDateFrom, filterDateTo, filterRoomType, filterSource, filterGroup, sortBy, sortDirection]);

  async function fetchReservations() {
    try {
      const groupFilter = filterGroup === 'ungrouped' ? 0 : filterGroup === 'grouped' ? -1 : filterGroup ? parseInt(filterGroup) : undefined;
      const response = await reservationsApi.list({
        search: searchTerm || undefined,
        status: filterStatus || undefined,
        payment_status: filterPaymentStatus || undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        room_type_id: filterRoomType ? parseInt(filterRoomType) : undefined,
        source: filterSource || undefined,
        group_id: groupFilter,
        sort: sortBy,
        direction: sortDirection,
        per_page: 50
      });
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm !== undefined) {
        setLoading(true);
        fetchReservations();
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (actionMenu !== null) {
        setActionMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [actionMenu]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  }

  async function handleCheckIn(reservation: Reservation) {
    if (reservation.status !== 'confirmed') {
      setSuccessMessage('Only confirmed reservations can be checked in.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    try {
      await reservationsApi.checkIn(reservation.id);
      setSuccessMessage('Guest checked in successfully!');
      await fetchReservations();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to check in guest');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleCheckOut(reservation: Reservation) {
    if (reservation.status !== 'checked_in') {
      setSuccessMessage('Only checked-in reservations can be checked out.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    try {
      await reservationsApi.checkOut(reservation.id);
      setSuccessMessage('Guest checked out successfully!');
      await fetchReservations();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to check out guest');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleCancel(reservation: Reservation) {
    if (!confirm(`Cancel reservation ${reservation.reservation_number}?\n\nPlease provide a cancellation reason:`)) return;
    
    const reason = prompt('Cancellation reason:');
    if (!reason) return;

    try {
      await reservationsApi.cancel(reservation.id, reason);
      setSuccessMessage('Reservation cancelled successfully!');
      await fetchReservations();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to cancel reservation');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleNoShow(reservation: Reservation) {
    if (!confirm(`Mark reservation ${reservation.reservation_number} as no-show?`)) return;

    try {
      await reservationsApi.markNoShow(reservation.id);
      setSuccessMessage('Reservation marked as no-show successfully!');
      await fetchReservations();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to mark reservation as no-show');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleSplit(reservation: Reservation) {
    const roomId = prompt('Enter the room ID to split this reservation to:');
    if (!roomId) return;
    
    const adults = prompt('Number of adults (leave empty for same as original):');
    const children = prompt('Number of children (leave empty for same as original):');

    try {
      await reservationsApi.split(reservation.id, {
        room_id: parseInt(roomId),
        adults: adults ? parseInt(adults) : undefined,
        children: children ? parseInt(children) : undefined,
      });
      setSuccessMessage('Reservation split successfully!');
      await fetchReservations();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to split reservation');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  function getStatusColor(status: string): { bg: string; text: string } {
    const colors: Record<string, { bg: string; text: string }> = {
      confirmed: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
      pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
      checked_in: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
      checked_out: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' },
      cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
      no_show: { bg: 'rgba(127, 29, 29, 0.1)', text: '#7f1d1d' },
    };
    return colors[status] || { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' };
  }

  function getPaymentStatusColor(status: string): { bg: string; text: string } {
    const colors: Record<string, { bg: string; text: string }> = {
      paid: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
      partially_paid: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
      unpaid: { bg: 'rgba(234, 179, 8, 0.1)', text: '#f59e0b' },
      refunded: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
    };
    return colors[status] || { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' };
  }

  const sortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

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
              Reservations
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Manage hotel bookings and guest stays
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowAvailabilityPanel(true)}
              style={{
                padding: '10px 20px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              📅 Availability
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/reservations/calendar'}
              style={{
                padding: '10px 20px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              📆 Calendar View
            </button>
            <button
              onClick={() => setShowReservationModal(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 0 12px rgba(99,102,241,0.35)',
              }}
            >
              + New Reservation
            </button>
          </div>
        </div>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div style={{
          background: successMessage.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          border: successMessage.includes('Failed') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: successMessage.includes('Failed') ? '#ef4444' : '#22c55e',
        }}>
          {successMessage}
        </div>
      )}

      {/* Quick access buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => {
            setFilterDateFrom(new Date().toISOString().split('T')[0]);
            setFilterDateTo(new Date().toISOString().split('T')[0]);
          }}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: '13px',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          🏨 Today's Arrivals
        </button>
        <button
          onClick={() => {
            setFilterDateFrom(new Date().toISOString().split('T')[0]);
            setFilterDateTo(new Date().toISOString().split('T')[0]);
          }}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: '13px',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          🚪 Today's Departures
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ position: 'relative' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search reservations by number, guest name, phone, room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">All Payment Status</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Group Filter */}
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">All Reservations</option>
            <option value="ungrouped">Ungrouped Only</option>
            <option value="grouped">Grouped Only</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
            }}
          />

          {/* Date To */}
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
            }}
          />

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('');
              setFilterPaymentStatus('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setFilterRoomType('');
              setFilterSource('');
              setFilterGroup('');
            }}
            style={{
              padding: '10px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reservation Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          Loading reservations...
        </div>
      ) : reservations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            No reservations found
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            {searchTerm || filterStatus || filterPaymentStatus || filterDateFrom || filterDateTo
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first reservation'}
          </p>
          {!searchTerm && !filterStatus && !filterPaymentStatus && !filterDateFrom && !filterDateTo && (
            <button
              onClick={() => setShowReservationModal(true)}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Create Reservation
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
          overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('reservation_number')}>
                  Reservation # {sortIcon('reservation_number')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Guest
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Room
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('check_in_date')}>
                  Check-In {sortIcon('check_in_date')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('check_out_date')}>
                  Check-Out {sortIcon('check_out_date')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Nights
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Status
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Payment
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Total
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '14px' }}>
                        {reservation.reservation_number}
                      </div>
                      {reservation.group_id && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}>
                          Group
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {reservation.guest?.full_name || '-'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {reservation.guest?.phone || ''}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                      {reservation.room?.room_number || '-'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {reservation.room_type?.name || ''}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {new Date(reservation.check_in_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {new Date(reservation.check_out_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: '500' }}>
                    {reservation.nights}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      background: getStatusColor(reservation.status).bg,
                      color: getStatusColor(reservation.status).text,
                    }}>
                      {reservation.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      background: getPaymentStatusColor(reservation.payment_status).bg,
                      color: getPaymentStatusColor(reservation.payment_status).text,
                    }}>
                      {reservation.payment_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500', textAlign: 'right' }}>
                    ${parseFloat(reservation.total_amount as any || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenu(actionMenu === reservation.id ? null : reservation.id);
                      }}
                      style={{
                        padding: '6px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="19" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>

                    {actionMenu === reservation.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          right: '0',
                          top: '100%',
                          marginTop: '4px',
                          zIndex: 1000,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                          minWidth: '200px',
                          padding: '6px',
                        }}>
                        <button
                          onClick={() => {
                            window.location.href = `/dashboard/reservations/${reservation.id}`;
                            setActionMenu(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            background: 'transparent',
                            textAlign: 'left',
                            fontSize: '14px',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View Details
                        </button>
                        {reservation.status === 'confirmed' && (
                          <button
                            onClick={() => handleCheckIn(reservation)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: '#22c55e',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="17 11 19 13 23 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Check-In
                          </button>
                        )}
                        {reservation.status === 'checked_in' && (
                          <button
                            onClick={() => handleCheckOut(reservation)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 12-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Check-Out
                          </button>
                        )}
                        {!['checked_out', 'cancelled', 'no_show'].includes(reservation.status) && (
                          <button
                            onClick={() => handleSplit(reservation)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: '#8b5cf6',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Split Reservation
                          </button>
                        )}
                        {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                          <button
                            onClick={() => handleCancel(reservation)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: '#ef4444',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Cancel
                          </button>
                        )}
                        {reservation.status === 'confirmed' && (
                          <button
                            onClick={() => handleNoShow(reservation)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: '#7f1d1d',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            No Show
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reservation Modal */}
      {showReservationModal && (
        <ReservationModal
          onClose={() => setShowReservationModal(false)}
          onSuccess={() => {
            fetchReservations();
            setShowReservationModal(false);
            setSuccessMessage('Reservation created successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      )}

      {/* Availability Panel */}
      {showAvailabilityPanel && (
        <AvailabilityPanel
          onClose={() => setShowAvailabilityPanel(false)}
          onSelectRoom={(roomId) => {
            setShowAvailabilityPanel(false);
            setShowReservationModal(true);
          }}
        />
      )}
    </div>
  );
}
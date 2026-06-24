'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { guestsApi, ApiError } from '@/lib/api';
import type { Guest, GuestReservation } from '@/types';
import GuestModal from '@/components/guests/GuestModal';

export default function GuestProfilePage() {
  const params = useParams();
  const router = useRouter();
  const guestId = parseInt(params.id as string);
  
  const [guest, setGuest] = useState<Guest | null>(null);
  const [reservations, setReservations] = useState<GuestReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchGuestData();
  }, [guestId]);

  async function fetchGuestData() {
    try {
      const response = await guestsApi.get(guestId);
      setGuest(response.data);
      setNotes(response.data.notes || '');
      
      // Load reservations from the guest data
      if (response.data.reservations) {
        setReservations(response.data.reservations);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        router.push('/dashboard/guests');
      } else {
        console.error('Error fetching guest:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateNotes() {
    setSavingNotes(true);
    try {
      await guestsApi.update(guestId, { notes });
      setSuccessMessage('Notes updated successfully!');
      setEditingNotes(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to update notes');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (guest?.reservations_count && guest.reservations_count > 0) {
      setSuccessMessage('This guest has reservations and cannot be deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setDeleteConfirm(false);
      return;
    }

    setDeleting(true);
    try {
      await guestsApi.delete(guestId);
      setSuccessMessage('Guest deleted successfully!');
      setTimeout(() => {
        router.push('/dashboard/guests');
      }, 1500);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to delete guest');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading guest profile...</div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Guest not found</div>
      </div>
    );
  }

  return (
    <div>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            {successMessage.includes('Failed') ? (
              <>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </>
            )}
          </svg>
          {successMessage}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/dashboard/guests')}
              style={{
                padding: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <h1 style={{
                fontSize: '22px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.5px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                {guest.full_name}
                {guest.vip_status && (
                  <span style={{
                    fontSize: '12px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#92400e',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontWeight: '600',
                  }}>
                    VIP
                  </span>
                )}
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
                Guest Profile & Stay History
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowEditModal(true)}
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
              Edit Guest
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{
                padding: '10px 20px',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Delete Guest
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Guest Summary Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: '600',
            }}>
              {guest.first_name[0]}{guest.last_name[0]}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {guest.full_name}
              </h3>
              {guest.vip_status && (
                <span style={{
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  color: '#92400e',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '600',
                }}>
                  VIP Guest
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Phone</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {guest.phone || '-'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Email</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {guest.email || '-'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Nationality</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {guest.country || '-'}
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '16px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Total Stays</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  {guest.total_stays}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Total Revenue</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  ${guest.total_spent.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Guest Since</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {guest.created_at ? new Date(guest.created_at).toLocaleDateString() : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Stay History Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          gridColumn: 'span 2',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Stay History
            </h3>
            <button
              // TODO: Create reservation functionality
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
              + Create Reservation
            </button>
          </div>

          {reservations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'var(--color-background)',
              borderRadius: '8px',
              border: '1px dashed var(--color-border)',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                No stay history yet
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--color-background)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Reservation #
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Check-In
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Check-Out
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Room
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Amount
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                        {reservation.reservation_number}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {new Date(reservation.check_in_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {new Date(reservation.check_out_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {reservation.room_number || reservation.room_type || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: '500',
                          background: getStatusColor(reservation.status).bg,
                          color: getStatusColor(reservation.status).text,
                        }}>
                          {reservation.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500', textAlign: 'right' }}>
                        ${reservation.total_amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          // TODO: View reservation functionality
                          style={{
                            padding: '6px 12px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          gridColumn: 'span 3',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Notes
            </h3>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {notes ? 'Edit Note' : 'Add Note'}
              </button>
            )}
          </div>

          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this guest..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  marginBottom: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setNotes(guest.notes || '');
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
                  Cancel
                </button>
                <button
                  onClick={handleUpdateNotes}
                  disabled={savingNotes}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                    color: 'white',
                    cursor: savingNotes ? 'not-allowed' : 'pointer',
                    opacity: savingNotes ? 0.5 : 1,
                  }}
                >
                  {savingNotes ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '16px',
              background: notes ? 'var(--color-background)' : 'transparent',
              borderRadius: '8px',
              border: notes ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
              minHeight: '80px',
            }}>
              {notes ? (
                <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {notes}
                </p>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  No notes added for this guest.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            border: '1px solid var(--color-border)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
              Delete Guest
            </h3>
            {guest.reservations_count && guest.reservations_count > 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                This guest has {guest.reservations_count} reservation(s) and cannot be deleted. You may want to deactivate the guest instead.
              </p>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                Are you sure you want to delete {guest.full_name}? This action cannot be undone.
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              {guest.reservations_count === 0 && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#ef4444',
                    color: 'white',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {showEditModal && (
        <GuestModal
          guest={guest}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchGuestData();
            setShowEditModal(false);
            setSuccessMessage('Guest updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}

function getStatusColor(status: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
    confirmed: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
    checked_in: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
    checked_out: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' },
    cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
    no_show: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316' },
  };
  return colors[status] || { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' };
}
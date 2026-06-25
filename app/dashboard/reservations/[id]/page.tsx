'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { reservationsApi, guestsApi, billingApi, ApiError } from '@/lib/api';
import type { Reservation, Folio, Charge, Payment } from '@/types';

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = parseInt(params.id as string);
  
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'history'>('details');
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [internalNotesValue, setInternalNotesValue] = useState('');
  const [updatingNotes, setUpdatingNotes] = useState(false);
  
  // Billing state
  const [folios, setFolios] = useState<Folio[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  
  // Charge modal
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [creatingCharge, setCreatingCharge] = useState(false);
  const [chargeFormData, setChargeFormData] = useState({
    folio_id: '',
    charge_type: 'room' as const,
    description: '',
    amount: '',
    tax_amount: '',
    notes: ''
  });
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    folio_id: '',
    payment_method: 'cash' as const,
    card_last_four: '',
    card_type: '',
    transaction_id: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  useEffect(() => {
    if (reservation && activeTab === 'payments') {
      fetchBillingData();
    }
  }, [reservation, activeTab]);

  async function fetchReservation() {
    setLoading(true);
    try {
      const response = await reservationsApi.get(reservationId);
      setReservation(response.data);
    } catch (error) {
      console.error('Error fetching reservation:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!reservation) return;
    try {
      await reservationsApi.checkIn(reservation.id);
      setSuccessMessage('Guest checked in successfully!');
      await fetchReservation();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to check in guest');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleCheckOut() {
    if (!reservation) return;
    try {
      await reservationsApi.checkOut(reservation.id);
      setSuccessMessage('Guest checked out successfully!');
      await fetchReservation();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to check out guest');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleCancel() {
    if (!reservation) return;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;

    try {
      await reservationsApi.cancel(reservation.id, reason);
      setSuccessMessage('Reservation cancelled successfully!');
      await fetchReservation();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to cancel reservation');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleSaveInternalNotes() {
    if (!reservation) return;
    setUpdatingNotes(true);
    try {
      await reservationsApi.update(reservation.id, { internal_notes: internalNotesValue });
      setSuccessMessage('Internal notes updated successfully!');
      await fetchReservation();
      setEditingInternalNotes(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to update internal notes');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setUpdatingNotes(false);
    }
  }

  function handleEditInternalNotes() {
    setInternalNotesValue(reservation?.internal_notes || '');
    setEditingInternalNotes(true);
  }

  function handleCancelEditInternalNotes() {
    setEditingInternalNotes(false);
    setInternalNotesValue('');
  }

  async function fetchBillingData() {
    if (!reservation) return;
    setBillingLoading(true);
    try {
      // Fetch folios for this reservation
      const foliosResponse = await billingApi.folios.list({
        reservation_id: reservation.id,
        per_page: 50
      });
      setFolios(foliosResponse.data);

      // Fetch charges for this reservation
      const chargesResponse = await billingApi.charges.list({
        reservation_id: reservation.id,
        per_page: 50
      });
      setCharges(chargesResponse.data);

      // Fetch payments for this reservation
      const paymentsResponse = await billingApi.payments.list({
        reservation_id: reservation.id,
        per_page: 50
      });
      setPayments(paymentsResponse.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleCreateCharge() {
    if (!chargeFormData.folio_id || !chargeFormData.description || !chargeFormData.amount) {
      setSuccessMessage('Please fill in all required fields');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setCreatingCharge(true);
    try {
      await billingApi.charges.create({
        folio_id: parseInt(chargeFormData.folio_id),
        reservation_id: reservation?.id,
        charge_type: chargeFormData.charge_type,
        description: chargeFormData.description,
        amount: parseFloat(chargeFormData.amount),
        tax_amount: chargeFormData.tax_amount ? parseFloat(chargeFormData.tax_amount) : undefined,
        notes: chargeFormData.notes || undefined,
      });
      setSuccessMessage('Charge added successfully!');
      await fetchBillingData();
      setShowChargeModal(false);
      setChargeFormData({
        folio_id: '',
        charge_type: 'room',
        description: '',
        amount: '',
        tax_amount: '',
        notes: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to add charge');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setCreatingCharge(false);
    }
  }

  async function handleCreatePayment() {
    if (!paymentFormData.folio_id || !paymentFormData.amount) {
      setSuccessMessage('Please fill in all required fields');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setCreatingPayment(true);
    try {
      await billingApi.payments.create({
        folio_id: parseInt(paymentFormData.folio_id),
        reservation_id: reservation?.id,
        payment_method: paymentFormData.payment_method,
        card_last_four: paymentFormData.card_last_four || undefined,
        card_type: paymentFormData.card_type || undefined,
        transaction_id: paymentFormData.transaction_id || undefined,
        amount: parseFloat(paymentFormData.amount),
        notes: paymentFormData.notes || undefined,
      });
      setSuccessMessage('Payment recorded successfully!');
      await fetchBillingData();
      setShowPaymentModal(false);
      setPaymentFormData({
        folio_id: '',
        payment_method: 'cash',
        card_last_four: '',
        card_type: '',
        transaction_id: '',
        amount: '',
        notes: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to record payment');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setCreatingPayment(false);
    }
  }

  async function handleCreateFolio() {
    if (!reservation) return;
    try {
      await billingApi.folios.create({
        reservation_id: reservation.id,
        guest_id: reservation.guest_id,
      });
      setSuccessMessage('Folio created successfully!');
      await fetchBillingData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to create folio');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading reservation details...</div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Reservation not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '8px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.5px',
          }}>
            Reservation {reservation.reservation_number}
          </h1>
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

      {/* Status badges */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <span style={{
          fontSize: '13px',
          padding: '6px 12px',
          borderRadius: '16px',
          fontWeight: '600',
          background: getStatusColor(reservation.status).bg,
          color: getStatusColor(reservation.status).text,
        }}>
          {reservation.status.replace('_', ' ').toUpperCase()}
        </span>
        <span style={{
          fontSize: '13px',
          padding: '6px 12px',
          borderRadius: '16px',
          fontWeight: '600',
          background: getPaymentStatusColor(reservation.payment_status).bg,
          color: getPaymentStatusColor(reservation.payment_status).text,
        }}>
          {reservation.payment_status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {reservation.status === 'confirmed' && (
          <button
            onClick={handleCheckIn}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(34,197,94,0.35)',
            }}
          >
            ✅ Check-In
          </button>
        )}
        {reservation.status === 'checked_in' && (
          <button
            onClick={handleCheckOut}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(59,130,246,0.35)',
            }}
          >
            🚪 Check-Out
          </button>
        )}
        {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
          <button
            onClick={handleCancel}
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
            ❌ Cancel
          </button>
        )}
        <button
          onClick={() => router.push('/dashboard/reservations')}
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
          Back to List
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '24px',
      }}>
        <button
          onClick={() => setActiveTab('details')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'details' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'details' ? '600' : '400',
            background: activeTab === 'details' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'details' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'payments' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'payments' ? '600' : '400',
            background: activeTab === 'payments' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'payments' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'history' ? '600' : '400',
            background: activeTab === 'history' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'history' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Guest Information */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Guest Information
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Name</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {reservation.guest?.full_name || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.guest?.email || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Phone</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.guest?.phone || '-'}
              </div>
            </div>
            {reservation.guest_id && (
              <button
                onClick={() => router.push(`/dashboard/guests/${reservation.guest_id}`)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                View Guest Profile
              </button>
            )}
          </div>

          {/* Room Information */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Room Information
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Room Number</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {reservation.room?.room_number || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Room Type</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.room_type?.name || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Base Price</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                ${reservation.room_type?.base_price ? reservation.room_type.base_price.toFixed(2) : '0.00'}/night
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Stay Details
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Check-In Date</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {new Date(reservation.check_in_date).toLocaleDateString()} {new Date(reservation.check_in_date).toLocaleTimeString()}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Check-Out Date</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {new Date(reservation.check_out_date).toLocaleDateString()} {new Date(reservation.check_out_date).toLocaleTimeString()}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Duration</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.nights} night{reservation.nights !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Guests</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}, {reservation.children} child{reservation.children !== 1 ? 'ren' : ''}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Pricing
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Subtotal</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  ${parseFloat(reservation.subtotal as any || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Taxes</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  ${parseFloat(reservation.taxes as any || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Fees</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  ${parseFloat(reservation.fees as any || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ height: '1px', background: 'var(--color-border)', margin: '16px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Total Amount</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#6366f1' }}>
                  ${parseFloat(reservation.total_amount as any || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Paid Amount</span>
                <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: '500' }}>
                  ${parseFloat(reservation.paid_amount as any || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Balance Due</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: parseFloat(reservation.balance_due as any || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                  ${parseFloat(reservation.balance_due as any || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Additional Information
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Source</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.source || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Special Requests</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.special_requests || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Internal Notes</div>
              {editingInternalNotes ? (
                <div>
                  <textarea
                    value={internalNotesValue}
                    onChange={(e) => setInternalNotesValue(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '8px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                      background: 'var(--color-bg)',
                      resize: 'vertical',
                      marginBottom: '8px',
                    }}
                    placeholder="Add internal notes..."
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveInternalNotes}
                      disabled={updatingNotes}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        background: updatingNotes ? 'var(--color-border)' : '#6366f1',
                        color: 'white',
                        cursor: updatingNotes ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {updatingNotes ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEditInternalNotes}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        background: 'transparent',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', flex: 1 }}>
                    {reservation.internal_notes || '-'}
                  </div>
                  <button
                    onClick={handleEditInternalNotes}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: 'transparent',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Channel Manager Reference</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {reservation.channel_manager_reference || '-'}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Timestamps
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Created At</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(reservation.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Updated At</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(reservation.updated_at).toLocaleString()}
              </div>
            </div>
            {reservation.cancelled_at && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Cancelled At</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {new Date(reservation.cancelled_at).toLocaleString()}
                </div>
              </div>
            )}
            {reservation.synced_at && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Synced with Channel Manager</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {new Date(reservation.synced_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          {/* Payment Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Total Amount
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#6366f1' }}>
                ${parseFloat(reservation.total_amount as any || 0).toFixed(2)}
              </div>
            </div>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Paid Amount
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#22c55e' }}>
                ${parseFloat(reservation.paid_amount as any || 0).toFixed(2)}
              </div>
            </div>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Balance Due
              </div>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: parseFloat(reservation.balance_due as any || 0) > 0 ? '#ef4444' : '#22c55e' 
              }}>
                ${parseFloat(reservation.balance_due as any || 0).toFixed(2)}
              </div>
            </div>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Payment Status
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: getPaymentStatusColor(reservation.payment_status).text,
                background: getPaymentStatusColor(reservation.payment_status).bg,
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                {reservation.payment_status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Folios Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '16px' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                Folios
              </h2>
              <button
                onClick={handleCreateFolio}
                disabled={billingLoading}
                style={{
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: billingLoading ? 'not-allowed' : 'pointer',
                  opacity: billingLoading ? 0.6 : 1,
                }}
              >
                Create Folio
              </button>
            </div>

            {billingLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                Loading billing data...
              </div>
            ) : folios.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
              }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  No folios found for this reservation. Create a folio to start tracking charges and payments.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {folios.map((folio) => (
                  <div key={folio.id} style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    {/* Folio Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--color-border)'
                    }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          {folio.folio_number}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          {folio.guest?.full_name || 'Unknown Guest'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '12px', 
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: folio.status === 'open' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                          color: folio.status === 'open' ? '#22c55e' : '#6b7280',
                          fontWeight: '500',
                          marginBottom: '4px'
                        }}>
                          {folio.status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          Balance: ${folio.balance_due.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <button
                        onClick={() => {
                          setChargeFormData({ ...chargeFormData, folio_id: folio.id.toString() });
                          setShowChargeModal(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Add Charge
                      </button>
                      <button
                        onClick={() => {
                          setPaymentFormData({ ...paymentFormData, folio_id: folio.id.toString() });
                          setShowPaymentModal(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Record Payment
                      </button>
                    </div>

                    {/* Charges */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        Charges
                      </div>
                      {charges.filter(c => c.folio_id === folio.id).length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
                          No charges
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {charges.filter(c => c.folio_id === folio.id).map((charge) => (
                            <div key={charge.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              background: 'var(--color-background)',
                              borderRadius: '8px',
                            }}>
                              <div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                                  {charge.description}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                  {charge.charge_type} • {charge.charged_at ? new Date(charge.charged_at).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                                -${charge.total_amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payments */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        Payments
                      </div>
                      {payments.filter(p => p.folio_id === folio.id).length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
                          No payments
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {payments.filter(p => p.folio_id === folio.id).map((payment) => (
                            <div key={payment.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              background: 'var(--color-background)',
                              borderRadius: '8px',
                            }}>
                              <div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                                  {payment.payment_method.replace('_', ' ').toUpperCase()}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                  {payment.payment_number} • {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>
                                +${payment.amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charge Modal */}
          {showChargeModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                  Add Charge
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Charge Type *
                    </label>
                    <select
                      value={chargeFormData.charge_type}
                      onChange={(e) => setChargeFormData({ ...chargeFormData, charge_type: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="room">Room</option>
                      <option value="food_beverage">Food & Beverage</option>
                      <option value="service">Service</option>
                      <option value="amenity">Amenity</option>
                      <option value="phone">Phone</option>
                      <option value="laundry">Laundry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Description *
                    </label>
                    <input
                      type="text"
                      value={chargeFormData.description}
                      onChange={(e) => setChargeFormData({ ...chargeFormData, description: e.target.value })}
                      placeholder="Enter charge description"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={chargeFormData.amount}
                      onChange={(e) => setChargeFormData({ ...chargeFormData, amount: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Tax Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={chargeFormData.tax_amount}
                      onChange={(e) => setChargeFormData({ ...chargeFormData, tax_amount: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Notes
                    </label>
                    <textarea
                      value={chargeFormData.notes}
                      onChange={(e) => setChargeFormData({ ...chargeFormData, notes: e.target.value })}
                      placeholder="Optional notes"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={() => setShowChargeModal(false)}
                      disabled={creatingCharge}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: creatingCharge ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCharge}
                      disabled={creatingCharge}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: creatingCharge ? 'not-allowed' : 'pointer',
                        opacity: creatingCharge ? 0.6 : 1,
                      }}
                    >
                      {creatingCharge ? 'Adding...' : 'Add Charge'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Modal */}
          {showPaymentModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                  Record Payment
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Payment Method *
                    </label>
                    <select
                      value={paymentFormData.payment_method}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="online_payment">Online Payment</option>
                    </select>
                  </div>

                  {paymentFormData.payment_method.includes('card') && (
                    <>
                      <div>
                        <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                          Card Type
                        </label>
                        <input
                          type="text"
                          value={paymentFormData.card_type}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, card_type: e.target.value })}
                          placeholder="Visa, Mastercard, etc."
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                          Last Four Digits
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={paymentFormData.card_last_four}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, card_last_four: e.target.value })}
                          placeholder="1234"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={paymentFormData.transaction_id}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, transaction_id: e.target.value })}
                      placeholder="Optional transaction ID"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Notes
                    </label>
                    <textarea
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      placeholder="Optional notes"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      disabled={creatingPayment}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: creatingPayment ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePayment}
                      disabled={creatingPayment}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: creatingPayment ? 'not-allowed' : 'pointer',
                        opacity: creatingPayment ? 0.6 : 1,
                      }}
                    >
                      {creatingPayment ? 'Recording...' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            Activity History
          </h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Activity history and audit trail will be implemented in a future update.
          </p>
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { billingApi, ApiError } from '@/lib/api';
import type { Folio, FolioFormData } from '@/types';

export default function FoliosPage() {
  const [folios, setFolios] = useState<Folio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBalance, setFilterBalance] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<Folio | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    reservation_id: '',
    guest_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchFolios();
  }, [filterStatus, filterBalance, sortBy, sortDirection]);

  async function fetchFolios() {
    try {
      const response = await billingApi.folios.list({
        folio_number: searchTerm || undefined,
        status: filterStatus || undefined,
        with_balance: filterBalance || undefined,
        sort: sortBy,
        direction: sortDirection,
        per_page: 50
      });
      setFolios(response.data);
    } catch (error) {
      console.error('Error fetching folios:', error);
      setFolios([]);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm !== undefined) {
        setLoading(true);
        fetchFolios();
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  }

  async function handleCloseFolio(folio: Folio) {
    try {
      await billingApi.folios.close(folio.id);
      setSuccessMessage('Folio closed successfully!');
      await fetchFolios();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to close folio');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleReopenFolio(folio: Folio) {
    try {
      await billingApi.folios.reopen(folio.id);
      setSuccessMessage('Folio reopened successfully!');
      await fetchFolios();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to reopen folio');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleDelete(folio: Folio) {
    setDeleting(true);
    try {
      await billingApi.folios.delete(folio.id);
      setSuccessMessage('Folio deleted successfully!');
      await fetchFolios();
      setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to delete folio');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setDeleting(false);
      setActionMenu(null);
    }
  }

  async function handleCreateFolio() {
    if (!formData.reservation_id || !formData.guest_id) {
      setSuccessMessage('Please fill in all required fields');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setCreating(true);
    try {
      await billingApi.folios.create({
        reservation_id: parseInt(formData.reservation_id),
        guest_id: parseInt(formData.guest_id),
        notes: formData.notes || undefined,
      });
      setSuccessMessage('Folio created successfully!');
      await fetchFolios();
      setShowCreateModal(false);
      setFormData({ reservation_id: '', guest_id: '', notes: '' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to create folio');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setCreating(false);
    }
  }

  const sortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#22c55e';
      case 'closed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
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
              Folios
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Manage guest folios and billing accounts
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Create Folio
          </button>
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
                placeholder="Search folios by number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Balance Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="balance-filter"
              checked={filterBalance}
              onChange={(e) => setFilterBalance(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="balance-filter" style={{ fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              With Balance Due
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Loading folios...
        </div>
      ) : folios.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: '15px', marginBottom: '8px' }}>No folios found</p>
          <p style={{ fontSize: '13px' }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('folio_number')}>
                  Folio Number {sortIcon('folio_number')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Guest
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Reservation
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  Status {sortIcon('status')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('total_amount')}>
                  Total {sortIcon('total_amount')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('paid_amount')}>
                  Paid {sortIcon('paid_amount')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('balance_due')}>
                  Balance {sortIcon('balance_due')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {folios.map((folio) => (
                <tr key={folio.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    {folio.folio_number}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {folio.guest?.full_name || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {folio.reservation?.reservation_number || '-'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: `${getStatusColor(folio.status)}15`,
                      color: getStatusColor(folio.status),
                    }}>
                      {folio.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    ${folio.total_amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    ${folio.paid_amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: folio.balance_due > 0 ? '#ef4444' : 'var(--color-text-primary)', fontWeight: '500' }}>
                    ${folio.balance_due.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setActionMenu(actionMenu === folio.id ? null : folio.id)}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="1" fill="currentColor"/>
                          <circle cx="12" cy="5" r="1" fill="currentColor"/>
                          <circle cx="12" cy="19" r="1" fill="currentColor"/>
                        </svg>
                      </button>
                      {actionMenu === folio.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          zIndex: 10,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          minWidth: '160px',
                          padding: '6px',
                        }}>
                          {folio.status === 'open' && (
                            <button
                              onClick={() => handleCloseFolio(folio)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '13px',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Close Folio
                            </button>
                          )}
                          {folio.status === 'closed' && (
                            <button
                              onClick={() => handleReopenFolio(folio)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '13px',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Reopen Folio
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(folio)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '13px',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
              Delete Folio
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to delete folio {deleteConfirm.folio_number}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folio Modal */}
      {showCreateModal && (
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
            maxWidth: '500px',
            width: '90%',
            border: '1px solid var(--color-border)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
              Create New Folio
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Reservation ID *
              </label>
              <input
                type="number"
                value={formData.reservation_id}
                onChange={(e) => setFormData({ ...formData, reservation_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Guest ID *
              </label>
              <input
                type="number"
                value={formData.guest_id}
                onChange={(e) => setFormData({ ...formData, guest_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ reservation_id: '', guest_id: '', notes: '' });
                }}
                disabled={creating}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolio}
                disabled={creating}
                style={{
                  padding: '10px 20px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Creating...' : 'Create Folio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

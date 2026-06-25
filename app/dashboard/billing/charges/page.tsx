'use client';

import { useEffect, useState } from 'react';
import { billingApi, ApiError } from '@/lib/api';
import type { Charge, ChargeFormData } from '@/types';

export default function ChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('charged_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<Charge | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    folio_id: '',
    reservation_id: '',
    charge_type: 'room' as const,
    description: '',
    amount: '',
    tax_amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchCharges();
  }, [filterType, dateFrom, dateTo, sortBy, sortDirection]);

  async function fetchCharges() {
    try {
      const response = await billingApi.charges.list({
        charge_type: filterType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort: sortBy,
        direction: sortDirection,
        per_page: 50
      });
      setCharges(response.data);
    } catch (error) {
      console.error('Error fetching charges:', error);
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm !== undefined) {
        setLoading(true);
        fetchCharges();
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

  async function handleDelete(charge: Charge) {
    setDeleting(true);
    try {
      await billingApi.charges.delete(charge.id);
      setSuccessMessage('Charge deleted successfully!');
      await fetchCharges();
      setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to delete charge');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setDeleting(false);
      setActionMenu(null);
    }
  }

  async function handleCreateCharge() {
    if (!formData.folio_id || !formData.description || !formData.amount) {
      setSuccessMessage('Please fill in all required fields');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setCreating(true);
    try {
      await billingApi.charges.create({
        folio_id: parseInt(formData.folio_id),
        reservation_id: formData.reservation_id ? parseInt(formData.reservation_id) : undefined,
        charge_type: formData.charge_type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : undefined,
        notes: formData.notes || undefined,
      });
      setSuccessMessage('Charge created successfully!');
      await fetchCharges();
      setShowCreateModal(false);
      setFormData({
        folio_id: '',
        reservation_id: '',
        charge_type: 'room',
        description: '',
        amount: '',
        tax_amount: '',
        notes: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to create charge');
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

  const getChargeTypeColor = (type: string) => {
    switch (type) {
      case 'room': return '#6366f1';
      case 'food_beverage': return '#f59e0b';
      case 'service': return '#10b981';
      case 'amenity': return '#8b5cf6';
      case 'phone': return '#ec4899';
      case 'laundry': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getChargeTypeLabel = (type: string) => {
    switch (type) {
      case 'room': return 'Room';
      case 'food_beverage': return 'Food & Beverage';
      case 'service': return 'Service';
      case 'amenity': return 'Amenity';
      case 'phone': return 'Phone';
      case 'laundry': return 'Laundry';
      default: return 'Other';
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
              Charges
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Manage guest charges and fees
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
            Add Charge
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
                placeholder="Search charges by description..."
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

          {/* Charge Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
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
              <option value="">All Types</option>
              <option value="room">Room</option>
              <option value="food_beverage">Food & Beverage</option>
              <option value="service">Service</option>
              <option value="amenity">Amenity</option>
              <option value="phone">Phone</option>
              <option value="laundry">Laundry</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
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
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Loading charges...
        </div>
      ) : charges.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: '15px', marginBottom: '8px' }}>No charges found</p>
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
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Description
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Type
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Folio
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('charged_at')}>
                  Date {sortIcon('charged_at')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('amount')}>
                  Amount {sortIcon('amount')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleSort('total_amount')}>
                  Total {sortIcon('total_amount')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {charge.description}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: `${getChargeTypeColor(charge.charge_type)}15`,
                      color: getChargeTypeColor(charge.charge_type),
                    }}>
                      {getChargeTypeLabel(charge.charge_type)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {charge.folio?.folio_number || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {charge.charged_at ? new Date(charge.charged_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    ${charge.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    ${charge.total_amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setActionMenu(actionMenu === charge.id ? null : charge.id)}
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
                      {actionMenu === charge.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          zIndex: 10,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          minWidth: '140px',
                          padding: '6px',
                        }}>
                          <button
                            onClick={() => setDeleteConfirm(charge)}
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
              Delete Charge
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to delete this charge? This action cannot be undone.
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

      {/* Create Charge Modal */}
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
              Add New Charge
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Folio ID *
              </label>
              <input
                type="number"
                value={formData.folio_id}
                onChange={(e) => setFormData({ ...formData, folio_id: e.target.value })}
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
                Reservation ID
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
                Charge Type *
              </label>
              <select
                value={formData.charge_type}
                onChange={(e) => setFormData({ ...formData, charge_type: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                Tax Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
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
                  setFormData({
                    folio_id: '',
                    reservation_id: '',
                    charge_type: 'room',
                    description: '',
                    amount: '',
                    tax_amount: '',
                    notes: ''
                  });
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
                onClick={handleCreateCharge}
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
                {creating ? 'Creating...' : 'Add Charge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

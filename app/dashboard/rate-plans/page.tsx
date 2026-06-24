'use client';

import { useEffect, useState } from 'react';
import { ratePlansApi, ApiError } from '@/lib/api';
import type { RatePlan } from '@/types';
import RatePlanModal from '@/components/rate-plans/RatePlanModal';

export default function RatePlansPage() {
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRatePlanModal, setShowRatePlanModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  
  // Filters
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchRatePlans();
  }, [filterActive, filterType, sortBy, sortDirection]);

  async function fetchRatePlans() {
    try {
      const response = await ratePlansApi.list({
        search: searchTerm || undefined,
        active: filterActive !== null ? filterActive : undefined,
        sort: sortBy,
        direction: sortDirection,
        per_page: 50
      });
      setRatePlans(response.data);
    } catch (error) {
      console.error('Error fetching rate plans:', error);
      setRatePlans([]);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm !== undefined) {
        setLoading(true);
        fetchRatePlans();
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

  async function handleToggleActive(ratePlan: RatePlan) {
    try {
      if (ratePlan.active) {
        await ratePlansApi.deactivate(ratePlan.id);
        setSuccessMessage('Rate plan deactivated successfully!');
      } else {
        await ratePlansApi.activate(ratePlan.id);
        setSuccessMessage('Rate plan activated successfully!');
      }
      await fetchRatePlans();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to toggle rate plan status');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleDuplicate(ratePlan: RatePlan) {
    const newName = prompt(`Duplicate "${ratePlan.name}"\nEnter new name for the copy:`);
    if (!newName) return;

    try {
      await ratePlansApi.duplicate(ratePlan.id, { name: newName });
      setSuccessMessage('Rate plan duplicated successfully!');
      await fetchRatePlans();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to duplicate rate plan');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  async function handleDelete(ratePlan: RatePlan) {
    if (!confirm(`Delete rate plan "${ratePlan.name}"?\n\nThis action cannot be undone.`)) return;

    try {
      await ratePlansApi.delete(ratePlan.id);
      setSuccessMessage('Rate plan deleted successfully!');
      await fetchRatePlans();
      setActionMenu(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to delete rate plan');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  }

  function getTypeColor(type: string): { bg: string; text: string } {
    const colors: Record<string, { bg: string; text: string }> = {
      standard: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
      corporate: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1' },
      seasonal: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
      package: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
      promotional: { bg: 'rgba(244, 63, 94, 0.1)', text: '#f43f5e' },
    };
    return colors[type] || { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' };
  }

  function getPricingTypeColor(type: string): { bg: string; text: string } {
    const colors: Record<string, { bg: string; text: string }> = {
      fixed: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
      percentage: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
      per_person: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
      per_night: { bg: 'rgba(244, 63, 94, 0.1)', text: '#f43f5e' },
    };
    return colors[type] || { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' };
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
              Rate Plans
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Manage pricing strategies and rate structures
            </p>
          </div>

          <button
            onClick={() => setShowRatePlanModal(true)}
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
            + New Rate Plan
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
                placeholder="Search rate plans by name, description..."
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
            value={filterActive === null ? '' : filterActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const value = e.target.value;
              setFilterActive(value === '' ? null : value === 'active');
            }}
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
            <option value="">All Types</option>
            <option value="standard">Standard</option>
            <option value="corporate">Corporate</option>
            <option value="seasonal">Seasonal</option>
            <option value="package">Package</option>
            <option value="promotional">Promotional</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterActive(null);
              setFilterType('');
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

      {/* Rate Plans Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          Loading rate plans...
        </div>
      ) : ratePlans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="17" y1="5" x2="7" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="17" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="17" y1="19" x2="7" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            No rate plans found
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            {searchTerm || filterActive !== null || filterType
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first rate plan'}
          </p>
          {!searchTerm && filterActive === null && !filterType && (
            <button
              onClick={() => setShowRatePlanModal(true)}
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
              Create Rate Plan
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
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('name')}>
                  Name {sortIcon('name')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Type
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Pricing
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('base_rate')}>
                  Base Rate {sortIcon('base_rate')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Meal Plan
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Room Types
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Seasonal Rates
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Status
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('priority')}>
                  Priority {sortIcon('priority')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {ratePlans.map((ratePlan) => (
                <tr key={ratePlan.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>
                      {ratePlan.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {ratePlan.description || 'No description'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      background: getTypeColor(ratePlan.type).bg,
                      color: getTypeColor(ratePlan.type).text,
                    }}>
                      {ratePlan.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      background: getPricingTypeColor(ratePlan.pricing_type).bg,
                      color: getPricingTypeColor(ratePlan.pricing_type).text,
                    }}>
                      {ratePlan.pricing_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    ${ratePlan.base_rate.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {ratePlan.meal_plan_included && ratePlan.meal_plan_type ? (
                      <span style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '500',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                      }}>
                        {ratePlan.meal_plan_type}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: '500' }}>
                    {ratePlan.room_types.length}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: '500' }}>
                    {ratePlan.seasonal_rates.length}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      background: ratePlan.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: ratePlan.active ? '#22c55e' : '#ef4444',
                    }}>
                      {ratePlan.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: '500' }}>
                    {ratePlan.priority}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', position: 'relative' }}>
                    <button
                      onClick={() => setActionMenu(actionMenu === ratePlan.id ? null : ratePlan.id)}
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

                    {actionMenu === ratePlan.id && (
                      <div style={{
                        position: 'absolute',
                        right: '0',
                        top: '100%',
                        zIndex: 100,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        minWidth: '180px',
                        padding: '6px',
                      }}>
                        <button
                          onClick={() => {
                            window.location.href = `/dashboard/rate-plans/${ratePlan.id}`;
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
                        <button
                          onClick={() => handleToggleActive(ratePlan)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            background: 'transparent',
                            textAlign: 'left',
                            fontSize: '14px',
                            color: ratePlan.active ? '#ef4444' : '#22c55e',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {ratePlan.active ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Deactivate
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDuplicate(ratePlan)}
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
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDelete(ratePlan)}
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
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rate Plan Modal */}
      {showRatePlanModal && (
        <RatePlanModal
          onClose={() => setShowRatePlanModal(false)}
          onSuccess={() => {
            fetchRatePlans();
            setShowRatePlanModal(false);
            setSuccessMessage('Rate plan created successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}
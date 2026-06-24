'use client';

import { useEffect, useState } from 'react';
import { guestsApi, ApiError } from '@/lib/api';
import type { Guest } from '@/types';
import GuestModal from '@/components/guests/GuestModal';

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filters
  const [filterVIP, setFilterVIP] = useState<boolean | null>(null);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterConsent, setFilterConsent] = useState<boolean | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('last_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<Guest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  useEffect(() => {
    fetchGuests();
  }, [filterVIP, filterCountry, filterCity, filterConsent, dateFrom, dateTo, sortBy, sortDirection]);

  async function fetchGuests() {
    try {
      const response = await guestsApi.list({
        search: searchTerm || undefined,
        vip_status: filterVIP ?? undefined,
        country: filterCountry || undefined,
        city: filterCity || undefined,
        marketing_consent: filterConsent ?? undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort: sortBy,
        direction: sortDirection,
        per_page: 50
      });
      setGuests(response.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm !== undefined) {
        setLoading(true);
        fetchGuests();
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

  function openModal(guest?: Guest) {
    setEditingGuest(guest || null);
    setShowModal(true);
    setActionMenu(null);
  }

  function closeModal() {
    setShowModal(false);
    setEditingGuest(null);
  }

  async function handleDelete(guest: Guest) {
    setDeleting(true);
    try {
      await guestsApi.delete(guest.id);
      setSuccessMessage('Guest deleted successfully!');
      await fetchGuests();
      setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to delete guest');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setDeleting(false);
      setActionMenu(null);
    }
  }

  const filteredGuests = guests;

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
              Guests
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Manage guest profiles and stay history
            </p>
          </div>

          <button
            onClick={() => openModal()}
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
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(99,102,241,0.35)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Guest
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
                placeholder="Search guests by name, phone, email, passport..."
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

          {/* VIP Filter */}
          <select
            value={filterVIP === null ? '' : filterVIP ? 'true' : 'false'}
            onChange={(e) => setFilterVIP(e.target.value === '' ? null : e.target.value === 'true')}
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
            <option value="">All Guests</option>
            <option value="true">VIP Guests</option>
            <option value="false">Regular Guests</option>
          </select>

          {/* Country Filter */}
          <input
            type="text"
            placeholder="Country"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
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

          {/* City Filter */}
          <input
            type="text"
            placeholder="City"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
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

          {/* Marketing Consent Filter */}
          <select
            value={filterConsent === null ? '' : filterConsent ? 'true' : 'false'}
            onChange={(e) => setFilterConsent(e.target.value === '' ? null : e.target.value === 'true')}
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
            <option value="">All Consent</option>
            <option value="true">Consented</option>
            <option value="false">Not Consented</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
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
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
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
              setFilterVIP(null);
              setFilterCountry('');
              setFilterCity('');
              setFilterConsent(null);
              setDateFrom('');
              setDateTo('');
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

      {/* Guest Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          Loading guests...
        </div>
      ) : filteredGuests.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            No guests found
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            {searchTerm || filterVIP !== null || filterCountry || filterCity || filterConsent !== null || dateFrom || dateTo
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first guest'}
          </p>
          {!searchTerm && !filterVIP && !filterCountry && !filterCity && !filterConsent && !dateFrom && !dateTo && (
            <button
              onClick={() => openModal()}
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
              Add First Guest
            </button>
          )}
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
              <tr style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('last_name')}>
              Guest Name {sortIcon('last_name')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Phone
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Country
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              VIP
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('total_stays')}>
              Stays {sortIcon('total_stays')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('total_spent')}>
              Spent {sortIcon('total_spent')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('created_at')}>
              Created {sortIcon('created_at')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} style={{ borderBottom: '1px solid var(--color-border)', '&:hover': { background: 'var(--color-background)' } }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}>
                        {guest.first_name[0]}{guest.last_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', fontSize: '14px' }}>
                          {guest.full_name}
                        </div>
                        {guest.vip_status && (
                          <span style={{
                            fontSize: '11px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                            color: '#92400e',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                            marginTop: '2px',
                          }}>
                            VIP
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {guest.phone || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {guest.email || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {guest.country || '-'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {guest.vip_status ? (
                      <span style={{
                        fontSize: '12px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                        color: '#92400e',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: '600',
                      }}>
                        Yes
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '12px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-secondary)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}>
                        No
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    {guest.total_stays}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    ${(guest.total_spent ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    {guest.created_at ? new Date(guest.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', position: 'relative' }}>
                    <button
                      onClick={() => setActionMenu(actionMenu === guest.id ? null : guest.id)}
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

                    {actionMenu === guest.id && (
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
                            window.location.href = `/dashboard/guests/${guest.id}`;
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
                          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-background)'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            openModal(guest);
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
                          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-background)'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Edit Guest
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Create reservation functionality
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
                          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-background)'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Create Reservation
                        </button>
                        <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                        <button
                          onClick={() => {
                            setDeleteConfirm(guest);
                            setActionMenu(null);
                          }}
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
                          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Delete Guest
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
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to delete {deleteConfirm.full_name}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
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
              <button
                onClick={() => handleDelete(deleteConfirm)}
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
            </div>
          </div>
        </div>
      )}

      {/* Guest Modal */}
      {showModal && (
        <GuestModal
          guest={editingGuest}
          onClose={closeModal}
          onSuccess={() => {
            fetchGuests();
            closeModal();
            setSuccessMessage(editingGuest ? 'Guest updated successfully!' : 'Guest created successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}
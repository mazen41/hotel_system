'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { useLocale, useTranslations } from 'next-intl';
import type { Service, Guest, Reservation } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://hotel-sys.loop-pr.com/api';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null; }
async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? 'Request failed', res.status, data.errors);
  return data;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const locale = useLocale();
  const t = useTranslations('services');
  const tCommon = useTranslations('common');
  const isRtl = locale === 'ar';

  const [formData, setFormData] = useState({
    type: 'service' as 'trip' | 'service',
    guest_id: '',
    reservation_id: '',
    name: '',
    description: '',
    fees: '',
    invoice_image: null as File | null,
  });

  useEffect(() => {
    fetchServices();
    fetchGuests();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api('GET', '/services');
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await api('GET', '/guests');
      setGuests(response.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const fetchReservations = async (guest_id: string) => {
    try {
      const response = await api('GET', `/reservations?guest_id=${guest_id}`);
      setReservations(response.data.filter((r: Reservation) => ['confirmed', 'checked_in'].includes(r.status)));
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('guest_id', formData.guest_id);
      formDataToSend.append('reservation_id', formData.reservation_id);
      if (formData.name) formDataToSend.append('name', formData.name);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.fees) formDataToSend.append('fees', formData.fees);
      if (formData.invoice_image) formDataToSend.append('invoice_image', formData.invoice_image);

      const res = await fetch(`${API}/services`, {
        method: 'POST',
        headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: formDataToSend,
      });

      if (!res.ok) throw new ApiError('Failed to create service', res.status);

      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error creating service:', error);
      alert(locale === 'ar' ? 'خطأ أثناء إنشاء الخدمة' : 'Error creating service');
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;

    try {
      await api('DELETE', `/services/${serviceId}`);
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert(locale === 'ar' ? 'خطأ أثناء حذف الخدمة' : 'Error deleting service');
    }
  };

  const handleGuestChange = (guest_id: string) => {
    setFormData(prev => ({ ...prev, guest_id: guest_id, reservation_id: '' }));
    if (guest_id) {
      fetchReservations(guest_id);
    } else {
      setReservations([]);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'service',
      guest_id: '',
      reservation_id: '',
      name: '',
      description: '',
      fees: '',
      invoice_image: null,
    });
    setReservations([]);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    resetForm();
  };

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left' }}>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
          <div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.5px',
              marginBottom: '4px',
            }}>
              {t('title')}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              {t('description')}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>+</span>
            {t('create')}
          </button>
        </div>
      </div>

      {/* Services list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          {tCommon('loading')}
        </div>
      ) : services.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚌</div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            {t('noServices')}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            {t('noServicesDesc')}
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {t('createFirst')}
          </button>
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
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('type')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('name')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('guest')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('reservation')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('fees')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {tCommon('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: service.type === 'trip' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      color: service.type === 'trip' ? '#6366f1' : '#10b981',
                    }}>
                      {service.type === 'trip' ? (locale === 'ar' ? 'رحلة' : 'Trip') : (locale === 'ar' ? 'خدمة' : 'Service')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {service.name || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {service.guest.first_name} {service.guest.last_name}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {service.reservation.reservation_number}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    ${(Number(service.fees) || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {service.invoice_image_url ? (
                      <a
                        href={service.invoice_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#6366f1',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        📄 {locale === 'ar' ? 'عرض' : 'View'}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      {tCommon('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '20px' }}>
              {t('createTitle')}
            </h2>
            <form onSubmit={handleCreateService}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('type')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'trip' | 'service' }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                  }}
                  required
                >
                  <option value="service">{locale === 'ar' ? 'خدمة' : 'Service'}</option>
                  <option value="trip">{locale === 'ar' ? 'رحلة' : 'Trip'}</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('guest')}
                </label>
                <select
                  value={formData.guest_id}
                  onChange={(e) => handleGuestChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                  }}
                  required
                >
                  <option value="">{t('selectGuest')}</option>
                  {guests.map(guest => (
                    <option key={guest.id} value={guest.id}>
                      {guest.first_name} {guest.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('reservation')}
                </label>
                <select
                  value={formData.reservation_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, reservation_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                  }}
                  required
                  disabled={!formData.guest_id}
                >
                  <option value="">{t('selectReservation')}</option>
                  {reservations.map(res => (
                    <option key={res.id} value={res.id}>
                      {res.reservation_number}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('name')} ({t('optional')})
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('description')} ({t('optional')})
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('fees')} ({t('optional')})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fees}
                  onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {t('invoiceImage')} ({t('optional')})
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_image: e.target.files?.[0] || null }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

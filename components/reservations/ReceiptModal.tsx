'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { billingApi, settingsApi } from '@/lib/api';
import type { Reservation, Charge, Payment, Folio, HotelSettings } from '@/types';

interface Service {
  id: number;
  type: 'trip' | 'service';
  name: string | null;
  description: string | null;
  fees: number;
  created_at: string;
}

interface ReceiptModalProps {
  reservation: Reservation;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://hotel-sys.loop-pr.com/api';

function money(n: number | string | null | undefined, currency = '$'): string {
  const num = parseFloat(String(n ?? 0)) || 0;
  return `${currency}${num.toFixed(2)}`;
}

function fmtDate(d: string | null | undefined, locale = 'en-GB'): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function ReceiptModal({ reservation, onClose }: ReceiptModalProps) {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [folio, setFolio] = useState<Folio | null>(null);
  const [hotel, setHotel] = useState<HotelSettings | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [foliosRes, chargesRes, paymentsRes, settingsRes] = await Promise.all([
          billingApi.folios.list({ reservation_id: reservation.id, per_page: 10 }),
          billingApi.charges.list({ reservation_id: reservation.id, per_page: 100 }),
          billingApi.payments.list({ reservation_id: reservation.id, per_page: 100 }),
          settingsApi.getHotel(),
        ]);
        setFolio(foliosRes.data?.[0] ?? null);
        setCharges(chargesRes.data ?? []);
        setPayments(paymentsRes.data ?? []);
        setHotel(settingsRes?.data ?? null);

        // Fetch services
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const svcRes = await fetch(`${API_BASE}/services?reservation_id=${reservation.id}&per_page=100`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const svcData = await svcRes.json();
        setServices(svcData.data ?? []);
      } catch (err) {
        console.error('Receipt load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reservation.id]);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${locale}">
      <head>
        <meta charset="UTF-8" />
        <title>${isRtl ? 'إيصال' : 'Receipt'} – ${reservation.reservation_number}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 14mm 16mm; }
          body {
            font-family: ${isRtl ? "'Noto Sans Arabic', Tahoma, Arial" : "'Inter', 'Segoe UI', Arial"}, sans-serif;
            font-size: 11pt;
            color: #1a1a2e;
            direction: ${isRtl ? 'rtl' : 'ltr'};
            text-align: ${isRtl ? 'right' : 'left'};
          }
          .receipt { width: 100%; }
          
          /* ── Header ── */
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1a1a2e; padding-bottom: 14px; margin-bottom: 20px; }
          .hotel-info h1 { font-size: 20pt; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
          .hotel-info p  { font-size: 9pt; color: #555; margin-top: 3px; }
          .receipt-meta  { text-align: ${isRtl ? 'left' : 'right'}; }
          .receipt-meta h2 { font-size: 16pt; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1.5px; }
          .receipt-meta p  { font-size: 8.5pt; color: #666; margin-top: 4px; }

          /* ── Guest & Reservation Grid ── */
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
          .info-box   { padding: 14px 16px; }
          .info-box:first-child { border-${isRtl ? 'left' : 'right'}: 1px solid #e0e0e0; background: #f8f8fc; }
          .info-box h4 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #4f46e5; margin-bottom: 8px; }
          .info-row    { display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 5px; }
          .info-label  { color: #777; }
          .info-value  { font-weight: 600; color: #1a1a2e; }

          /* ── Section headings ── */
          .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #4f46e5; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; margin-bottom: 10px; margin-top: 18px; }

          /* ── Tables ── */
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          thead tr { background: #f3f4f9; }
          thead th { padding: 7px 10px; font-weight: 600; color: #4f46e5; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0; text-align: ${isRtl ? 'right' : 'left'}; }
          tbody tr { border-bottom: 1px solid #f0f0f0; }
          tbody tr:last-child { border-bottom: none; }
          tbody td { padding: 8px 10px; color: #333; vertical-align: top; }
          .text-right { text-align: right; }
          .text-left  { text-align: left; }
          .text-muted { color: #888; font-size: 8.5pt; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 8pt; font-weight: 600; }
          .badge-trip    { background: #dbeafe; color: #1d4ed8; }
          .badge-service { background: #fce7f3; color: #be185d; }
          .badge-room    { background: #dcfce7; color: #15803d; }
          .badge-other   { background: #f3f4f6; color: #6b7280; }

          /* ── Totals ── */
          .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
          .totals-box { width: 300px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
          .totals-row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 9.5pt; border-bottom: 1px solid #f0f0f0; }
          .totals-row:last-child { border-bottom: none; }
          .totals-row.grand { background: #1a1a2e; color: #fff; font-weight: 700; font-size: 11pt; }
          .totals-row.paid-row { background: #f0fdf4; color: #15803d; font-weight: 600; }
          .totals-row.balance-row.zero { background: #f0fdf4; color: #15803d; font-weight: 700; }
          .totals-row.balance-row.due  { background: #fef2f2; color: #dc2626; font-weight: 700; }

          /* ── Payments Table ── */
          .payment-method-badge { background: #f0fdf4; color: #15803d; font-size: 8pt; padding: 2px 6px; border-radius: 4px; font-weight: 600; }

          /* ── Footer ── */
          .footer { margin-top: 28px; border-top: 1px dashed #ccc; padding-top: 14px; display: flex; justify-content: space-between; font-size: 8pt; color: #888; }
          .thank-you { text-align: center; font-size: 13pt; font-weight: 700; color: #4f46e5; margin-top: 22px; letter-spacing: 0.5px; }
          
          /* Empty state */
          .empty { font-size: 9pt; color: #aaa; font-style: italic; padding: 6px 0; }
        </style>
      </head>
      <body>
        <div class="receipt">${content}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  // Derived data
  const guest = reservation.guest;
  const room  = reservation.room;
  const currency = hotel?.currency === 'SAR' ? 'SAR ' : hotel?.currency === 'AED' ? 'AED ' : '$';
  const nights   = reservation.nights ?? 0;

  const completedPayments = payments.filter(p => p.status === 'completed');
  const refundedPayments  = payments.filter(p => p.status === 'refunded');
  const totalPaid     = completedPayments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
  const totalRefunded = refundedPayments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
  const grandTotal    = parseFloat(String(reservation.total_amount || 0));
  const balanceDue    = parseFloat(String(reservation.balance_due || 0));

  const trips    = services.filter(s => s.type === 'trip');
  const svcItems = services.filter(s => s.type === 'service');

  const methodLabel: Record<string, { en: string; ar: string }> = {
    cash:           { en: 'Cash', ar: 'نقداً' },
    credit_card:    { en: 'Credit Card', ar: 'بطاقة ائتمان' },
    debit_card:     { en: 'Debit Card', ar: 'بطاقة خصم' },
    bank_transfer:  { en: 'Bank Transfer', ar: 'تحويل بنكي' },
    check:          { en: 'Cheque', ar: 'شيك' },
    online_payment: { en: 'Online', ar: 'دفع إلكتروني' },
  };

  const chargeTypeLabel: Record<string, { en: string; ar: string }> = {
    room:           { en: 'Room Charge', ar: 'رسوم الغرفة' },
    food_beverage:  { en: 'Food & Beverage', ar: 'أغذية ومشروبات' },
    service:        { en: 'Service', ar: 'خدمة' },
    amenity:        { en: 'Amenity', ar: 'مرفق' },
    phone:          { en: 'Phone', ar: 'اتصالات' },
    laundry:        { en: 'Laundry', ar: 'غسيل' },
    other:          { en: 'Other', ar: 'أخرى' },
  };

  const t = (en: string, ar: string) => isRtl ? ar : en;

  // Outer overlay
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    overflowY: 'auto', paddingTop: '20px', paddingBottom: '40px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    width: '794px',          // A4 width in px at 96dpi
    maxWidth: '95vw',
    boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
    direction: isRtl ? 'rtl' : 'ltr',
    overflow: 'hidden',
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>

        {/* ── Modal Top Bar ── */}
        <div style={{
          background: '#1a1a2e', color: '#fff',
          padding: '14px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: '600', fontSize: '15px', letterSpacing: '0.3px' }}>
            🧾 {t('Guest Receipt', 'إيصال النزيل')} — {reservation.reservation_number}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!loading && (
              <button
                onClick={handlePrint}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 18px', borderRadius: '8px', border: 'none',
                  background: '#4f46e5', color: '#fff', fontWeight: '600',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                🖨 {t('Print / Save PDF', 'طباعة / حفظ PDF')}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: '#fff', borderRadius: '6px', padding: '6px 12px',
                cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading ? (
          <div style={{ padding: '80px 40px', textAlign: 'center', color: '#888' }}>
            <div style={{
              width: '36px', height: '36px', border: '3px solid #e5e7eb',
              borderTopColor: '#4f46e5', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            {t('Loading receipt data…', 'جارٍ تحميل بيانات الإيصال…')}
          </div>
        ) : (
          /* ── Printable A4 Content ── */
          <div ref={printRef} style={{
            padding: '36px 40px',
            fontFamily: isRtl ? "'Noto Sans Arabic', Tahoma, Arial, sans-serif" : "'Inter','Segoe UI',Arial,sans-serif",
            fontSize: '11pt', color: '#1a1a2e', lineHeight: 1.5,
          }}>

            {/* ── Hotel Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #1a1a2e', paddingBottom: '16px', marginBottom: '22px' }}>
              <div>
                {hotel?.logo_url && (
                  <img src={hotel.logo_url} alt="Hotel Logo" style={{ height: '50px', marginBottom: '8px', objectFit: 'contain' }} />
                )}
                <div style={{ fontSize: '20pt', fontWeight: '800', color: '#1a1a2e', letterSpacing: '-0.5px' }}>
                  {hotel?.hotel_name || t('Hotel', 'الفندق')}
                </div>
                {hotel?.legal_business_name && (
                  <div style={{ fontSize: '9pt', color: '#555', marginTop: '2px' }}>{hotel.legal_business_name}</div>
                )}
                {hotel?.address && (
                  <div style={{ fontSize: '9pt', color: '#777', marginTop: '2px' }}>{hotel.address}{hotel.city ? `, ${hotel.city}` : ''}</div>
                )}
                {hotel?.contact_phone && (
                  <div style={{ fontSize: '9pt', color: '#777' }}>{t('Tel', 'هاتف')}: {hotel.contact_phone}</div>
                )}
                {hotel?.contact_email && (
                  <div style={{ fontSize: '9pt', color: '#777' }}>{hotel.contact_email}</div>
                )}
              </div>
              <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                <div style={{ fontSize: '16pt', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  {t('RECEIPT', 'إيصال')}
                </div>
                {folio && (
                  <div style={{ fontSize: '8.5pt', color: '#666', marginTop: '4px' }}>
                    {t('Folio', 'رقم الفاتورة')}: <strong>{folio.folio_number}</strong>
                  </div>
                )}
                <div style={{ fontSize: '8.5pt', color: '#666', marginTop: '3px' }}>
                  {t('Reservation', 'رقم الحجز')}: <strong>{reservation.reservation_number}</strong>
                </div>
                <div style={{ fontSize: '8.5pt', color: '#666', marginTop: '3px' }}>
                  {t('Date', 'التاريخ')}: <strong>{fmtDate(new Date().toISOString())}</strong>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px',
                    background: '#dcfce7', color: '#15803d',
                    borderRadius: '20px', fontSize: '8pt', fontWeight: '700',
                  }}>
                    ✓ {t('CHECKED OUT', 'تم المغادرة')}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Guest & Stay Info ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '22px', border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
              {/* Guest Info */}
              <div style={{ padding: '14px 16px', borderRight: isRtl ? 'none' : '1px solid #e0e0e0', borderLeft: isRtl ? '1px solid #e0e0e0' : 'none', background: '#f8f8fc' }}>
                <div style={{ fontSize: '8pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#4f46e5', marginBottom: '10px' }}>
                  {t('Guest Information', 'معلومات النزيل')}
                </div>
                {guest ? (
                  <>
                    <div style={{ fontWeight: '700', fontSize: '12pt', color: '#1a1a2e', marginBottom: '6px' }}>
                      {guest.first_name} {guest.last_name}
                    </div>
                    {guest.email && <div style={{ fontSize: '9pt', color: '#666' }}>{guest.email}</div>}
                    {guest.phone && <div style={{ fontSize: '9pt', color: '#666' }}>{guest.phone}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: '9pt', color: '#aaa' }}>{t('No guest info', 'لا توجد معلومات')}</div>
                )}
              </div>

              {/* Stay Info */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '8pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#4f46e5', marginBottom: '10px' }}>
                  {t('Stay Details', 'تفاصيل الإقامة')}
                </div>
                {[
                  [t('Room', 'الغرفة'),     room ? `${room.room_number}${room.room_type?.name ? ` — ${room.room_type.name}` : ''}` : '—'],
                  [t('Check-In', 'تسجيل الوصول'),    fmtDate(reservation.check_in_date)],
                  [t('Check-Out', 'تسجيل المغادرة'),   fmtDate(reservation.check_out_date)],
                  [t('Nights', 'عدد الليالي'),    String(nights)],
                  [t('Adults / Children', 'بالغون / أطفال'), `${reservation.adults} / ${reservation.children}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5pt', marginBottom: '5px' }}>
                    <span style={{ color: '#777' }}>{label}</span>
                    <span style={{ fontWeight: '600', color: '#1a1a2e' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Charges Table ── */}
            <div style={{ fontSize: '9pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#4f46e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '5px', marginBottom: '10px' }}>
              {t('Charges', 'الرسوم والتكاليف')}
            </div>
            {charges.length === 0 ? (
              <div style={{ fontSize: '9pt', color: '#aaa', fontStyle: 'italic', paddingBottom: '8px' }}>{t('No charges recorded.', 'لا توجد رسوم مسجلة.')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Description', 'الوصف')}</th>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Type', 'النوع')}</th>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Date', 'التاريخ')}</th>
                    <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{t('Amount', 'المبلغ')}</th>
                    <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{t('Tax', 'الضريبة')}</th>
                    <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{t('Total', 'الإجمالي')}</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map(c => {
                    const typeLbl = chargeTypeLabel[c.charge_type] ?? { en: c.charge_type, ar: c.charge_type };
                    const badgeCls = c.charge_type === 'room' ? '#dcfce7,#15803d' : c.charge_type === 'service' ? '#fce7f3,#be185d' : '#f3f4f6,#6b7280';
                    const [bg, clr] = badgeCls.split(',');
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '500' }}>{c.description || '—'}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '20px', fontSize: '8pt', fontWeight: '600', background: bg, color: clr }}>
                            {isRtl ? typeLbl.ar : typeLbl.en}
                          </span>
                        </td>
                        <td style={{ fontSize: '8.5pt', color: '#777' }}>{fmtDate(c.charged_at)}</td>
                        <td style={{ textAlign: isRtl ? 'left' : 'right' }}>{money(c.amount, currency)}</td>
                        <td style={{ textAlign: isRtl ? 'left' : 'right', color: '#888' }}>{money(c.tax_amount, currency)}</td>
                        <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: '600' }}>{money(c.total_amount, currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ── Trips Table ── */}
            {trips.length > 0 && (
              <>
                <div style={{ fontSize: '9pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#4f46e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '5px', marginBottom: '10px', marginTop: '18px' }}>
                  {t('Trips & Tours', 'الرحلات والجولات')}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Trip Name', 'اسم الرحلة')}</th>
                      <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Description', 'الوصف')}</th>
                      <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Date', 'التاريخ')}</th>
                      <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{t('Fees', 'الرسوم')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: '500' }}>
                          <span style={{ display: 'inline-block', padding: '2px 7px', marginBottom: '3px', borderRadius: '20px', fontSize: '8pt', fontWeight: '600', background: '#dbeafe', color: '#1d4ed8' }}>
                            {t('Trip', 'رحلة')}
                          </span>
                          <br />{s.name || '—'}
                        </td>
                        <td style={{ fontSize: '8.5pt', color: '#666' }}>{s.description || '—'}</td>
                        <td style={{ fontSize: '8.5pt', color: '#777' }}>{fmtDate(s.created_at)}</td>
                        <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: '600' }}>{money(s.fees, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* ── Extra Services Table ── */}
            {svcItems.length > 0 && (
              <>
                <div style={{ fontSize: '9pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#4f46e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '5px', marginBottom: '10px', marginTop: '18px' }}>
                  {t('Additional Services', 'الخدمات الإضافية')}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Service Name', 'اسم الخدمة')}</th>
                      <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Description', 'الوصف')}</th>
                      <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Date', 'التاريخ')}</th>
                      <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{t('Fees', 'الرسوم')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svcItems.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: '500' }}>
                          <span style={{ display: 'inline-block', padding: '2px 7px', marginBottom: '3px', borderRadius: '20px', fontSize: '8pt', fontWeight: '600', background: '#fce7f3', color: '#be185d' }}>
                            {t('Service', 'خدمة')}
                          </span>
                          <br />{s.name || '—'}
                        </td>
                        <td style={{ fontSize: '8.5pt', color: '#666' }}>{s.description || '—'}</td>
                        <td style={{ fontSize: '8.5pt', color: '#777' }}>{fmtDate(s.created_at)}</td>
                        <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: '600' }}>{money(s.fees, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* ── Payments Table ── */}
            <div style={{ fontSize: '9pt', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#4f46e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '5px', marginBottom: '10px', marginTop: '18px' }}>
              {t('Payments Received', 'المدفوعات المستلمة')}
            </div>
            {completedPayments.length === 0 ? (
              <div style={{ fontSize: '9pt', color: '#aaa', fontStyle: 'italic', paddingBottom: '8px' }}>{t('No payments recorded.', 'لا توجد مدفوعات مسجلة.')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Payment #', 'رقم الدفع')}</th>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Method', 'طريقة الدفع')}</th>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Date', 'التاريخ')}</th>
                    <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('Notes', 'ملاحظات')}</th>
                    <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{t('Amount', 'المبلغ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {completedPayments.map(p => {
                    const method = methodLabel[p.payment_method as string] ?? { en: p.payment_method, ar: p.payment_method };
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: '500', fontSize: '8.5pt' }}>{p.payment_number || `#${p.id}`}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '8pt', fontWeight: '600', background: '#f0fdf4', color: '#15803d' }}>
                            {isRtl ? method.ar : method.en}
                          </span>
                        </td>
                        <td style={{ fontSize: '8.5pt', color: '#777' }}>{fmtDate(p.payment_date)}</td>
                        <td style={{ fontSize: '8.5pt', color: '#888' }}>{p.notes || '—'}</td>
                        <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: '700', color: '#15803d' }}>{money(p.amount, currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ── Totals Block ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ width: '310px', border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
                {[
                  { label: t('Subtotal', 'المبلغ الأساسي'),        val: money(reservation.subtotal, currency),  color: '' },
                  { label: t('Taxes', 'الضرائب'),                  val: money(reservation.taxes, currency),    color: '' },
                  { label: t('Service Fees', 'رسوم الخدمات'),       val: money(reservation.fees, currency),     color: '' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: '9.5pt', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#666' }}>{row.label}</span>
                    <span style={{ fontWeight: '600', color: '#1a1a2e' }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '12pt', fontWeight: '800', background: '#1a1a2e', color: '#fff' }}>
                  <span>{t('Grand Total', 'الإجمالي الكلي')}</span>
                  <span>{money(grandTotal, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: '10pt', fontWeight: '700', background: '#f0fdf4', color: '#15803d', borderTop: '1px solid #bbf7d0' }}>
                  <span>{t('Total Paid', 'إجمالي المدفوع')}</span>
                  <span>{money(totalPaid, currency)}</span>
                </div>
                {totalRefunded > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: '9.5pt', fontWeight: '600', background: '#fffbeb', color: '#d97706', borderTop: '1px solid #fde68a' }}>
                    <span>{t('Refunded', 'المُستردة')}</span>
                    <span>- {money(totalRefunded, currency)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 14px',
                  fontSize: '10.5pt', fontWeight: '800',
                  background: balanceDue <= 0 ? '#f0fdf4' : '#fef2f2',
                  color: balanceDue <= 0 ? '#15803d' : '#dc2626',
                  borderTop: `1px solid ${balanceDue <= 0 ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <span>{t('Balance Due', 'الرصيد المستحق')}</span>
                  <span>{balanceDue <= 0 ? `${currency}0.00 ✓` : money(balanceDue, currency)}</span>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ marginTop: '30px', borderTop: '1px dashed #ccc', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#888' }}>
              <div>
                {hotel?.cancellation_policy && (
                  <div><strong>{t('Cancellation Policy', 'سياسة الإلغاء')}:</strong> {hotel.cancellation_policy}</div>
                )}
                <div style={{ marginTop: '4px' }}>
                  {t('Thank you for staying with us. We hope to see you again soon.', 'شكراً لإقامتكم معنا. نأمل أن نراكم مرة أخرى قريباً.')}
                </div>
              </div>
              <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                <div>{t('Generated on', 'صدر بتاريخ')}: {new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB')}</div>
                {folio && <div>{t('Folio', 'فاتورة')}: {folio.folio_number}</div>}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '13pt', fontWeight: '700', color: '#4f46e5', letterSpacing: '0.5px' }}>
              {t('Thank you for your stay!', 'شكراً لإقامتكم!')}
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

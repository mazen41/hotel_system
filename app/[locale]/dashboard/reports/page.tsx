'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useLocale } from 'next-intl';
import { ApiError, settingsApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportType =
  | 'revenue'
  | 'adr'
  | 'revpar'
  | 'arrivals'
  | 'departures'
  | 'guests'
  | 'housekeeping'
  | 'financial-summary'
  | 'trips'
  | 'services'
  | 'reservations'
  | 'payments'
  | 'maintenance';

interface ReportConfig {
  label: string;
  labelAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  color: string;
  chartType: 'area' | 'bar' | 'kpi' | 'table';
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://hotel-sys.loop-pr.com/api';

const CONFIGS: Record<ReportType, ReportConfig> = {
  revenue:             { label:'Revenue',           labelAr:'الإيرادات',            icon:'💰', description:'Daily revenue from completed payments',                   descriptionAr:'الإيرادات اليومية من المدفوعات المكتملة',          color:'#10b981', chartType:'area'  },
  adr:                 { label:'ADR',               labelAr:'متوسط السعر اليومي',   icon:'📊', description:'Average Daily Rate per room sold',                        descriptionAr:'متوسط السعر اليومي لكل غرفة مباعة',               color:'#f59e0b', chartType:'kpi'   },
  revpar:              { label:'RevPAR',            labelAr:'إيراد الغرفة المتاحة', icon:'📈', description:'Revenue Per Available Room — efficiency metric',           descriptionAr:'العائد لكل غرفة متاحة — مقياس الكفاءة',         color:'#8b5cf6', chartType:'kpi'   },
  arrivals:            { label:'Arrivals',          labelAr:'الوصول اليومي',         icon:'✈️', description:'Guest check-ins with room and payment details',           descriptionAr:'تسجيلات وصول النزلاء مع تفاصيل الغرف والدفع',    color:'#3b82f6', chartType:'table' },
  departures:          { label:'Departures',        labelAr:'المغادرة اليومية',       icon:'🚪', description:'Guest check-outs with stay duration and balance',         descriptionAr:'مغادرة النزلاء مع مدة الإقامة والرصيد',           color:'#ef4444', chartType:'table' },
  guests:              { label:'Guest Report',      labelAr:'تقرير النزلاء',        icon:'👥', description:'Guest activity, VIP status, and visit frequency',         descriptionAr:'نشاط النزلاء وحالة VIP وتكرار الزيارات',          color:'#06b6d4', chartType:'table' },
  housekeeping:        { label:'Housekeeping',      labelAr:'الخدمة الفندقية',      icon:'🧹', description:'Task completion rates, priorities, and staff assignments', descriptionAr:'معدلات الإنجاز والأولويات وتكليفات الموظفين',     color:'#84cc16', chartType:'bar'   },
  'financial-summary': { label:'Financial Summary', labelAr:'الملخص المالي',        icon:'🧾', description:'Revenue, charges, refunds, and net income',               descriptionAr:'الإيرادات والرسوم والمبالغ المستردة وصافي الدخل', color:'#f97316', chartType:'kpi'   },
  trips:               { label:'Trips Report',      labelAr:'تقرير الرحلات',        icon:'🚗', description:'Trips and tours booked by guests',                         descriptionAr:'الرحلات والجولات السياحية المحجوزة للنزلاء',     color:'#0ea5e9', chartType:'table' },
  services:            { label:'Services Report',   labelAr:'تقرير الخدمات الإضافية',icon:'🛎️', description:'Extra services and amenities purchased by guests',     descriptionAr:'الخدمات والمنتجات الإضافية المشتراة من النزلاء',   color:'#ec4899', chartType:'table' },
  reservations:        { label:'Reservations Report',labelAr:'تقرير الحجوزات',       icon:'📅', description:'All room reservations and their stay/payment status',     descriptionAr:'جميع حجوزات الغرف وحالة الإقامة والدفع الخاصة بها',  color:'#6366f1', chartType:'table' },
  payments:            { label:'Payments Log',      labelAr:'سجل المدفوعات',         icon:'💳', description:'Individual transaction log of all payments and refunds', descriptionAr:'سجل تفصيلي لجميع عمليات الدفع والاسترداد المالي',   color:'#10b981', chartType:'table' },
  maintenance:         { label:'Maintenance Report',labelAr:'تقرير الصيانة',         icon:'🛠️', description:'Room maintenance issues, status, and resolution summary',descriptionAr:'أعطال الغرف وطلبات الصيانة وحالة معالجتها',        color:'#f97316', chartType:'table' },
};

const QUICK_RANGES = [
  { label:'Today',          labelAr:'اليوم',         mode:'today', days:0  },
  { label:'Last 7 days',    labelAr:'آخر 7 أيام',    mode:'days',  days:7  },
  { label:'Last 30 days',   labelAr:'آخر 30 يوماً',  mode:'days',  days:30 },
  { label:'This month',     labelAr:'هذا الشهر',      mode:'month', days:0  },
  { label:'Last 3 months',  labelAr:'آخر 3 أشهر',    mode:'days',  days:90 },
  { label:'This year',      labelAr:'هذا العام',      mode:'year',  days:0  },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed:'#3b82f6', checked_in:'#10b981', checked_out:'#6b7280',
  pending:'#f59e0b',   cancelled:'#ef4444',  no_show:'#8b5cf6',
  completed:'#10b981', in_progress:'#3b82f6',skipped:'#6b7280',
  low:'#10b981', medium:'#3b82f6', high:'#f59e0b', urgent:'#ef4444',
  trip:'#0ea5e9', service:'#ec4899',
  paid:'#10b981', unpaid:'#ef4444', partially_paid:'#f59e0b', refunded:'#8b5cf6',
};

const COLUMN_TRANSLATIONS: Record<string, { en: string, ar: string }> = {
  id: { en: 'ID', ar: 'الرقم التعريفى' },
  date: { en: 'Date', ar: 'التاريخ' },
  occupied_rooms: { en: 'Occupied Rooms', ar: 'الغرف المشغولة' },
  total_rooms: { en: 'Total Rooms', ar: 'إجمالي الغرف' },
  occupancy_rate: { en: 'Occupancy Rate', ar: 'معدل الإشغال' },
  completed_payments: { en: 'Completed Payments', ar: 'المدفوعات المكتملة' },
  refunded_payments: { en: 'Refunded Payments', ar: 'المبالغ المستردة' },
  revenue: { en: 'Revenue', ar: 'الإيرادات' },
  start_date: { en: 'Start Date', ar: 'تاريخ البدء' },
  end_date: { en: 'End Date', ar: 'تاريخ الانتهاء' },
  rooms_sold: { en: 'Rooms Sold', ar: 'الغرف المباعة' },
  adr: { en: 'ADR', ar: 'متوسط السعر اليومي' },
  revpar: { en: 'RevPAR', ar: 'إيراد الغرفة المتاحة' },
  available_room_nights: { en: 'Available Room Nights', ar: 'ليالي الغرف المتاحة' },
  total_days: { en: 'Total Days', ar: 'إجمالي الأيام' },
  first_name: { en: 'First Name', ar: 'الاسم الأول' },
  last_name: { en: 'Last Name', ar: 'الاسم الأخير' },
  room_number: { en: 'Room Number', ar: 'رقم الغرفة' },
  check_in_date: { en: 'Check-In Date', ar: 'تاريخ الوصول' },
  check_out_date: { en: 'Check-Out Date', ar: 'تاريخ المغادرة' },
  status: { en: 'Status', ar: 'الحالة' },
  priority: { en: 'Priority', ar: 'الأولوية' },
  'guest.first_name': { en: 'Guest First Name', ar: 'الاسم الأول للنزيل' },
  'guest.last_name': { en: 'Guest Last Name', ar: 'الاسم الأخير للنزيل' },
  'guest.name': { en: 'Guest Name', ar: 'اسم النزيل' },
  'room.room_number': { en: 'Room', ar: 'الغرفة' },
  'room.display_name': { en: 'Room Name', ar: 'اسم الغرفة' },
  nights: { en: 'Nights', ar: 'الليالي' },
  payment_status: { en: 'Payment Status', ar: 'حالة الدفع' },
  total_amount: { en: 'Total Amount', ar: 'إجمالي المبلغ' },
  paid_amount: { en: 'Paid Amount', ar: 'المبلغ المدفوع' },
  balance_due: { en: 'Balance Due', ar: 'الرصيد المستحق' },
  vip_status: { en: 'VIP Status', ar: 'حالة VIP' },
  reservations_count: { en: 'Reservations Count', ar: 'عدد الحجوزات' },
  created_at: { en: 'Created At', ar: 'تاريخ الإنشاء' },
  assigned_to: { en: 'Assigned To', ar: 'المعين له' },
  'assignedTo.name': { en: 'Assigned To', ar: 'المعين له' },
  title: { en: 'Title', ar: 'العنوان' },
  description: { en: 'Description', ar: 'الوصف' },
  resolved_at: { en: 'Resolved At', ar: 'تاريخ الحل' },
  resolution_notes: { en: 'Resolution Notes', ar: 'ملاحظات الحل' },
  total_charges: { en: 'Total Charges', ar: 'إجمالي الرسوم' },
  total_payments: { en: 'Total Payments', ar: 'إجمالي المدفوعات' },
  pending_payments: { en: 'Pending Payments', ar: 'المدفوعات المعلقة' },
  net_income: { en: 'Net Income', ar: 'صافي الدخل' },
  type: { en: 'Type', ar: 'النوع' },
  name: { en: 'Name', ar: 'الاسم' },
  fees: { en: 'Fees', ar: 'الرسوم' },
  'reservation.reservation_number': { en: 'Reservation #', ar: 'رقم الحجز' },
  'createdBy.name': { en: 'Created By', ar: 'أنشئ بواسطة' },
  'room.roomType.name': { en: 'Room Type', ar: 'نوع الغرفة' },
  payment_number: { en: 'Payment #', ar: 'رقم عملية الدفع' },
  payment_method: { en: 'Method', ar: 'طريقة الدفع' },
  payment_date: { en: 'Payment Date', ar: 'تاريخ عملية الدفع' },
  'reservation.guest.first_name': { en: 'Guest First Name', ar: 'الاسم الأول للنزيل' },
  'reservation.guest.last_name': { en: 'Guest Last Name', ar: 'الاسم الأخير للنزيل' },
  'receivedBy.name': { en: 'Received By', ar: 'استلمت بواسطة' },
  average_fee: { en: 'Average Fee', ar: 'متوسط الرسوم' },
  total_fees: { en: 'Total Fees', ar: 'إجمالي الرسوم' },
  total_trips: { en: 'Total Trips', ar: 'إجمالي الرحلات' },
  total_services: { en: 'Total Services', ar: 'إجمالي الخدمات' },
  total_reservations: { en: 'Total Bookings', ar: 'إجمالي الحجوزات' },
  total_paid: { en: 'Total Paid', ar: 'إجمالي المدفوع' },
  total_balance: { en: 'Total Balance Due', ar: 'إجمالي الرصيد المستحق' },
  average_nights: { en: 'Avg Nights Per Stay', ar: 'متوسط الليالي للحجز' },
  total_transactions: { en: 'Total Transactions', ar: 'إجمالي العمليات' },
  total_requests: { en: 'Total Requests', ar: 'إجمالي الطلبات' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  average_occupancy: { en: 'Average Occupancy', ar: 'متوسط الإشغال' },
  total_completed: { en: 'Total Completed Payments', ar: 'إجمالي المدفوعات المكتملة' },
  total_refunded: { en: 'Total Refunded Payments', ar: 'إجمالي المبالغ المستردة' },
  average_daily_revenue: { en: 'Average Daily Revenue', ar: 'متوسط الإيراد اليومي' },
  rooms_sold_count: { en: 'Rooms Sold', ar: 'الغرف المباعة' },
  total_revenue: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  total_arrivals: { en: 'Total Arrivals', ar: 'إجمالي الوصول' },
  total_departures: { en: 'Total Departures', ar: 'إجمالي المغادرة' },
  total_guests: { en: 'Total Guests', ar: 'إجمالي النزلاء' },
  vip_guests: { en: 'VIP Guests', ar: 'نزلاء VIP' },
  new_guests: { en: 'New Guests', ar: 'النزلاء الجدد' },
  total_tasks: { en: 'Total Cleaning Tasks', ar: 'إجمالي مهام التنظيف' },
};

const VALUE_TRANSLATIONS: Record<string, { en: string, ar: string }> = {
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  checked_in: { en: 'Checked In', ar: 'مقيم' },
  checked_out: { en: 'Checked Out', ar: 'مغادر' },
  pending: { en: 'Pending', ar: 'معلق' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  refunded: { en: 'Refunded', ar: 'مسترد' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  no_show: { en: 'No Show', ar: 'عدم حضور' },
  low: { en: 'Low', ar: 'منخفض' },
  medium: { en: 'Medium', ar: 'متوسط' },
  high: { en: 'High', ar: 'مرتفع' },
  urgent: { en: 'Urgent', ar: 'عاجل' },
  in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
  skipped: { en: 'Skipped', ar: 'متخطى' },
  trip: { en: 'Trip', ar: 'رحلة' },
  service: { en: 'Service', ar: 'خدمة' },
  paid: { en: 'Paid', ar: 'مدفوع' },
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع' },
  partially_paid: { en: 'Partially Paid', ar: 'مدفوع جزئياً' },
  cash: { en: 'Cash', ar: 'نقداً' },
  card: { en: 'Card', ar: 'بطاقة ائتمانية' },
  bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, type: 'currency'|'percent'|'number' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  if (type === 'percent')  return `${(Number(n) || 0).toFixed(1)}%`;
  return n.toLocaleString('en-US', { maximumFractionDigits:2 });
}
const isCurrency = (k: string) => /revenue|amount|adr|revpar|price|total|payment|charge|net|income|fees/i.test(k);
const isPercent  = (k: string) => /rate|percent|pct/i.test(k);

function formatCellVal(col: string, val: string): string {
  if (!val || val === 'null' || val === 'undefined' || val === '—') return '—';
  if ((col.includes('date') || col.includes('_at') || col === 'payment_date') && !col.includes('updated')) {
    try { return format(new Date(val), 'MMM d, yyyy'); } catch { return val; }
  }
  if (isCurrency(col)) { const n = parseFloat(val); return isNaN(n) ? val : fmt(n, 'currency'); }
  return val;
}

function translateValue(col: string, val: string, isRtl: boolean): string {
  if (val === undefined || val === null || val === 'null' || val === '—') return '—';
  if (col === 'vip_status') {
    if (val === '1' || val === 'true') return isRtl ? 'نعم (VIP)' : 'Yes (VIP)';
    return isRtl ? 'لا' : 'No';
  }
  if (VALUE_TRANSLATIONS[val]) {
    return isRtl ? VALUE_TRANSLATIONS[val].ar : VALUE_TRANSLATIONS[val].en;
  }
  return formatCellVal(col, val);
}

async function apiFetch(type: ReportType, start: string, end: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const params = new URLSearchParams({ start_date: start, end_date: end });
  const res = await fetch(`${API_BASE}/reports/${type}?${params}`, {
    headers: { Accept:'application/json', 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.message ?? 'Failed to load report', res.status, body.errors);
  return body;
}

function exportCSV(
  name: string,
  rows: Record<string,unknown>[],
  summary: Record<string,unknown>,
  isRtl: boolean
) {
  const lines: string[] = [];
  
  if (Object.keys(summary).length) {
    lines.push(isRtl ? 'الملخص' : 'SUMMARY');
    Object.entries(summary).forEach(([k, v]) => {
      const translatedKey = COLUMN_TRANSLATIONS[k] ?? { en: k.replace(/_/g,' '), ar: k.replace(/_/g,' ') };
      const dispKey = isRtl ? translatedKey.ar : translatedKey.en;
      
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      const dispVal = !isNaN(n) ? (isCurrency(k) ? fmt(n,'currency') : isPercent(k) ? fmt(n,'percent') : fmt(n)) : String(v ?? '—');
      
      lines.push(`"${dispKey}","${dispVal}"`);
    });
    lines.push('');
  }
  
  if (rows.length) {
    // Flatten rows
    const flatRows = rows.map(row => {
      const flat: Record<string,string> = {};
      function add(obj: Record<string,unknown>, prefix = '') {
        Object.entries(obj).forEach(([k, v]) => {
          const key = prefix ? `${prefix}.${k}` : k;
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) add(v as Record<string,unknown>, key);
          else flat[key] = String(v ?? '—');
        });
      }
      add(row);
      return flat;
    });

    const allCols = Object.keys(flatRows[0]);
    const PRIORITY = [
      'date', 'reservation_number', 'payment_number', 'guest.first_name', 'guest.last_name',
      'reservation.guest.first_name', 'reservation.guest.last_name', 'room.room_number',
      'check_in_date', 'check_out_date', 'nights', 'status', 'payment_status',
      'total_amount', 'paid_amount', 'balance_due', 'fees', 'amount', 'payment_method'
    ];
    const cols = [
      ...PRIORITY.filter(c => allCols.includes(c)),
      ...allCols.filter(c => !PRIORITY.includes(c) && !c.includes('.id') && c !== 'id' && !c.endsWith('_id')),
    ].slice(0, 15);
    
    // Header
    const headers = cols.map(col => {
      const translatedCol = COLUMN_TRANSLATIONS[col] ?? { en: col.split('.').pop()?.replace(/_/g,' ') ?? col, ar: col.split('.').pop()?.replace(/_/g,' ') ?? col };
      return isRtl ? translatedCol.ar : translatedCol.en;
    });
    lines.push(headers.map(h => `"${h}"`).join(','));
    
    // Data
    flatRows.forEach(row => {
      const rowData = cols.map(col => {
        const raw = row[col] ?? '—';
        const displayVal = translateValue(col, raw, isRtl);
        return `"${displayVal.replace(/"/g, '""')}"`;
      });
      lines.push(rowData.join(','));
    });
  }
  
  // Use UTF-8 BOM \uFEFF to support Arabic in Excel
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCards({ summary, color, isRtl }: { summary: Record<string,unknown>; color: string; isRtl: boolean }) {
  const entries = Object.entries(summary);
  if (!entries.length) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'12px', marginBottom:'24px' }}>
      {entries.map(([k, v]) => {
        const translatedKey = COLUMN_TRANSLATIONS[k] ?? { en: k.replace(/_/g,' '), ar: k.replace(/_/g,' ') };
        const dispKey = isRtl ? translatedKey.ar : translatedKey.en;

        const n = typeof v === 'number' ? v : parseFloat(String(v));
        const disp = !isNaN(n) ? (isCurrency(k) ? fmt(n,'currency') : isPercent(k) ? fmt(n,'percent') : fmt(n)) : String(v ?? '—');
        return (
          <div key={k} style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'12px', padding:'16px 18px', borderTop:`3px solid ${color}` }}>
            <div style={{ fontSize:'11px', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'8px' }}>
              {dispKey}
            </div>
            <div style={{ fontSize:'24px', fontWeight:'700', color, letterSpacing:'-0.5px', lineHeight:1 }}>{disp}</div>
          </div>
        );
      })}
    </div>
  );
}

function KpiPanel({ data, isRtl }: { data: Record<string,unknown>; isRtl: boolean }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' }}>
      {Object.entries(data).filter(([k]) => !['start_date','end_date'].includes(k)).map(([k, v]) => {
        const translatedKey = COLUMN_TRANSLATIONS[k] ?? { en: k.replace(/_/g,' '), ar: k.replace(/_/g,' ') };
        const dispKey = isRtl ? translatedKey.ar : translatedKey.en;

        const n = typeof v === 'number' ? v : parseFloat(String(v));
        const disp = !isNaN(n) ? (isCurrency(k) ? fmt(n,'currency') : isPercent(k) ? fmt(n,'percent') : fmt(n)) : String(v ?? '—');
        return (
          <div key={k} style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'14px', padding:'20px 22px' }}>
            <div style={{ fontSize:'11px', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px' }}>
              {dispKey}
            </div>
            <div style={{ fontSize:'28px', fontWeight:'700', color:'var(--color-text-primary)', letterSpacing:'-0.5px' }}>{disp}</div>
          </div>
        );
      })}
    </div>
  );
}

function DataTable({ rows, isRtl }: { rows: Record<string,unknown>[]; isRtl: boolean }) {
  if (!rows.length) return null;

  // Flatten nested objects
  const flatRows = rows.map(row => {
    const flat: Record<string,string> = {};
    function add(obj: Record<string,unknown>, prefix = '') {
      Object.entries(obj).forEach(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) add(v as Record<string,unknown>, key);
        else flat[key] = String(v ?? '—');
      });
    }
    add(row);
    return flat;
  });

  const PRIORITY = [
    'date','reservation_number', 'payment_number', 'guest.first_name','guest.last_name',
    'reservation.guest.first_name','reservation.guest.last_name','room.room_number',
    'check_in_date','check_out_date','nights','status','payment_status','total_amount','paid_amount','balance_due',
    'fees', 'amount', 'payment_method'
  ];
  const allCols  = Object.keys(flatRows[0]);
  const cols     = [
    ...PRIORITY.filter(c => allCols.includes(c)),
    ...allCols.filter(c => !PRIORITY.includes(c) && !c.includes('.id') && c !== 'id' && !c.endsWith('_id')),
  ].slice(0, 12);

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', textAlign: isRtl ? 'right' : 'left' }}>
        <thead>
          <tr>
            {cols.map(col => {
              const translatedCol = COLUMN_TRANSLATIONS[col] ?? { en: col.split('.').pop()?.replace(/_/g,' ') ?? col, ar: col.split('.').pop()?.replace(/_/g,' ') ?? col };
              const headerText = isRtl ? translatedCol.ar : translatedCol.en;
              return (
                <th key={col} style={{ padding:'10px 14px', fontSize:'11px', fontWeight:'600', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--color-border)', whiteSpace:'nowrap', background:'var(--color-surface)' }}>
                  {headerText}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {flatRows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid var(--color-border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {cols.map(col => {
                const raw = row[col] ?? '—';
                const isStatus = col === 'status' || col === 'payment_status' || col === 'priority' || col === 'type' || col === 'payment_method';
                const displayVal = translateValue(col, raw, isRtl);

                return (
                  <td key={col} style={{ padding:'10px 14px', color:'var(--color-text-primary)', whiteSpace:'nowrap' }}>
                    {isStatus && raw !== '—' ? (
                      <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:`${STATUS_COLORS[raw]??'#6b7280'}22`, color:STATUS_COLORS[raw]??'#6b7280' }}>
                        {displayVal}
                      </span>
                    ) : displayVal}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevenueChart({ data, color, isRtl }: { data: Record<string,unknown>[]; color: string; isRtl: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top:4, right:8, left:0, bottom:0 }}>
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--color-text-muted)' }} />
        <YAxis tick={{ fontSize:11, fill:'var(--color-text-muted)' }} tickFormatter={v => `$${Number(v).toLocaleString()}`} />
        <Tooltip contentStyle={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'8px', fontSize:'12px' }} formatter={(v: unknown) => [fmt(Number(v),'currency'), isRtl ? 'الإيرادات' : 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} fill="url(#rev-grad)" name={isRtl ? 'الإيرادات' : 'Revenue'} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HousekeepingCharts({ data, color, isRtl }: { data: Record<string,unknown>[]; color: string; isRtl: boolean }) {
  const statusMap: Record<string,number> = {};
  const priorityMap: Record<string,number> = {};
  data.forEach(t => {
    const s = String(t.status ?? 'unknown');
    const p = String(t.priority ?? 'unknown');
    statusMap[s]   = (statusMap[s]   ?? 0) + 1;
    priorityMap[p] = (priorityMap[p] ?? 0) + 1;
  });
  const PIE_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
  const statusData = Object.entries(statusMap).map(([name, value]) => ({
    name: isRtl && VALUE_TRANSLATIONS[name] ? VALUE_TRANSLATIONS[name].ar : (VALUE_TRANSLATIONS[name]?.en ?? name),
    value
  }));
  const priorityData = Object.entries(priorityMap).map(([name, value]) => ({
    name: isRtl && VALUE_TRANSLATIONS[name] ? VALUE_TRANSLATIONS[name].ar : (VALUE_TRANSLATIONS[name]?.en ?? name),
    value
  }));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'24px' }}>
      <div>
        <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:'12px', color:'var(--color-text-primary)' }}>
          {isRtl ? 'حسب الحالة' : 'By status'}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
              {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:'12px', color:'var(--color-text-primary)' }}>
          {isRtl ? 'حسب الأولوية' : 'By priority'}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={priorityData} margin={{ top:4, right:8, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize:11, fill:'var(--color-text-muted)' }} />
            <Tooltip contentStyle={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'8px', fontSize:'12px' }} />
            <Bar dataKey="value" fill={color} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const locale = useLocale();
  const isRtl  = locale === 'ar';

  const [activeReport, setActiveReport] = useState<ReportType>('revenue');
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [endDate,   setEndDate]   = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [listData, setListData] = useState<Record<string,unknown>[]>([]);
  const [kpiData,  setKpiData]  = useState<Record<string,unknown> | null>(null);
  const [summary,  setSummary]  = useState<Record<string,unknown>>({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hotelName, setHotelName] = useState('');
  const [filterText, setFilterText] = useState('');

  const cfg = CONFIGS[activeReport];

  // Load hotel settings for PDF header printing
  useEffect(() => {
    async function loadHotel() {
      try {
        const res = await settingsApi.getHotel();
        if (res?.data?.hotel_name) setHotelName(res.data.hotel_name);
      } catch (e) {
        console.error('Failed to load hotel info for reports header', e);
      }
    }
    loadHotel();
  }, []);

  // ── Fetch ──
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setListData([]);
    setKpiData(null);
    setSummary({});
    try {
      const body    = await apiFetch(activeReport, startDate, endDate);
      const rawData = body.data ?? body.chart ?? body.rows ?? [];
      if (Array.isArray(rawData)) setListData(rawData as Record<string,unknown>[]);
      else if (rawData && typeof rawData === 'object') setKpiData(rawData as Record<string,unknown>);
      setSummary(body.summary ?? body.meta ?? {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeReport, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // ── Quick ranges ──
  function applyRange(mode: string, days: number) {
    const today = new Date();
    if (mode === 'today') {
      const d = format(today, 'yyyy-MM-dd');
      setStartDate(d); setEndDate(d);
    } else if (mode === 'month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today),   'yyyy-MM-dd'));
    } else if (mode === 'year') {
      setStartDate(format(startOfYear(today), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else {
      setStartDate(format(subDays(today, days - 1), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  }

  // ── Filter Data ──
  const getFilteredListData = () => {
    if (!filterText) return listData;
    const search = filterText.toLowerCase();

    return listData.filter(row => {
      const flat: Record<string,string> = {};
      function add(obj: Record<string,unknown>) {
        Object.entries(obj).forEach(([k, v]) => {
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) add(v as Record<string,unknown>);
          else flat[k] = String(v ?? '').toLowerCase();
        });
      }
      add(row);
      return Object.values(flat).some(v => v.includes(search));
    });
  };

  const filteredListData = getFilteredListData();

  // ── Export CSV ──
  function handleCSV() {
    const rows: Record<string,unknown>[] = filteredListData.length ? filteredListData : kpiData ? [kpiData] : [];
    exportCSV(`${activeReport}-${startDate}-to-${endDate}`, rows, summary, isRtl);
  }

  const label = isRtl ? cfg.labelAr : cfg.label;
  const desc  = isRtl ? cfg.descriptionAr : cfg.description;
  const hasData = listData.length > 0 || kpiData !== null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Printable Only Document Header ── */}
      <div className="print-only" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '12px', marginBottom: '24px', direction: isRtl ? 'rtl' : 'ltr' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
              {hotelName || (isRtl ? 'نظام إدارة الفنادق' : 'Hotel POS System')}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
              {isRtl ? `تقرير رسمي: ${label}` : `Official Report: ${label}`}
            </p>
          </div>
          <div style={{ textAlign: isRtl ? 'left' : 'right', fontSize: '12px', color: '#666' }}>
            <div>{isRtl ? 'تاريخ طباعة التقرير:' : 'Report Generated:'} {format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
            <div>{isRtl ? 'الفترة الزمنية للتقرير:' : 'Date Range:'} {startDate} → {endDate}</div>
          </div>
        </div>
      </div>

      {/* ── Header (Hidden on Print) ── */}
      <div className="no-print" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'700', color:'var(--color-text-primary)', letterSpacing:'-0.4px', marginBottom:'4px' }}>
            {isRtl ? 'التقارير والإحصاءات' : 'Reports & Analytics'}
          </h1>
          <p style={{ fontSize:'13px', color:'var(--color-text-secondary)' }}>
            {isRtl ? 'تحليلات وبيانات شاملة لعمليات الفندق والرحلات والخدمات' : 'Comprehensive analytics and data for hotel operations, trips, and services'}
          </p>
        </div>

        {/* Exports */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <button
            onClick={handleCSV}
            disabled={loading || !hasData}
            title="Download as CSV — open with Excel or Google Sheets"
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor: loading || !hasData ? 'not-allowed' : 'pointer', border:'1px solid var(--color-border)', background:'var(--color-surface)', color:'var(--color-text-primary)', opacity: loading || !hasData ? 0.45 : 1 }}
          >
            ⬇ {isRtl ? 'تصدير Excel / CSV' : 'Export Excel / CSV'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={loading}
            title="Print or save as PDF using your browser's print dialog"
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor: loading ? 'not-allowed' : 'pointer', border:`1px solid ${cfg.color}`, background:`${cfg.color}15`, color:cfg.color, opacity: loading ? 0.45 : 1 }}
          >
            🖨 {isRtl ? 'طباعة / PDF' : 'Print / PDF'}
          </button>
        </div>
      </div>

      {/* ── Date filter bar (Hidden on Print) ── */}
      <div className="no-print" style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'12px', padding:'12px 16px' }}>
        {QUICK_RANGES.map(r => (
          <button key={r.label} onClick={() => applyRange(r.mode, r.days)}
            style={{ padding:'5px 11px', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer', border:'1px solid var(--color-border)', background:'transparent', color:'var(--color-text-secondary)' }}
          >
            {isRtl ? r.labelAr : r.label}
          </button>
        ))}
        <div style={{ width:'1px', height:'20px', background:'var(--color-border)', margin:'0 4px' }} />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          style={{ padding:'5px 10px', borderRadius:'6px', border:'1px solid var(--color-border)', background:'var(--color-surface)', color:'var(--color-text-primary)', fontSize:'13px' }} />
        <span style={{ color:'var(--color-text-muted)', fontSize:'12px' }}>→</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          style={{ padding:'5px 10px', borderRadius:'6px', border:'1px solid var(--color-border)', background:'var(--color-surface)', color:'var(--color-text-primary)', fontSize:'13px' }} />
      </div>

      {/* ── Report type tabs (Hidden on Print) ── */}
      <div className="no-print" style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {(Object.keys(CONFIGS) as ReportType[]).map(type => {
          const c = CONFIGS[type];
          const active = type === activeReport;
          return (
            <button key={type} onClick={() => { setActiveReport(type); setFilterText(''); }}
              style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 13px', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer', border:`1px solid ${active ? c.color : 'var(--color-border)'}`, background: active ? `${c.color}18` : 'var(--color-surface)', color: active ? c.color : 'var(--color-text-secondary)', transition:'all 0.15s', marginBottom: '4px' }}
            >
              <span>{c.icon}</span>
              <span>{isRtl ? c.labelAr : c.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Report card ── */}
      <div style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'14px', overflow:'hidden' }}>

        {/* Card header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', borderLeft:`4px solid ${cfg.color}` }}>
          <div>
            <h2 style={{ fontSize:'16px', fontWeight:'600', color:'var(--color-text-primary)', marginBottom:'3px' }}>{cfg.icon} {label}</h2>
            <p style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>{desc}</p>
          </div>
          <div style={{ fontSize:'12px', color:'var(--color-text-muted)' }}>
            {format(new Date(startDate + 'T00:00:00'), 'MMM d, yyyy')} → {format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding:'22px' }}>

          {/* Loading spinner */}
          {loading && (
            <div style={{ height:'300px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'14px' }}>
              <div style={{ width:'36px', height:'36px', border:`3px solid var(--color-border)`, borderTopColor:cfg.color, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <span style={{ fontSize:'13px', color:'var(--color-text-muted)' }}>{isRtl ? 'جارٍ التحميل…' : 'Loading report…'}</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div style={{ height:'260px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'32px' }}>⚠️</div>
              <div style={{ fontSize:'14px', color:'#ef4444', fontWeight:'500' }}>{error}</div>
              <button onClick={load} style={{ marginTop:'8px', padding:'8px 18px', borderRadius:'8px', border:'1px solid var(--color-border)', background:'transparent', color:'var(--color-text-primary)', fontSize:'13px', cursor:'pointer' }}>
                {isRtl ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !hasData && (
            <div style={{ height:'260px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'40px' }}>📭</div>
              <div style={{ fontSize:'14px', color:'var(--color-text-muted)' }}>{isRtl ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}</div>
            </div>
          )}

          {/* Content — only rendered when not loading and no error */}
          {!loading && !error && hasData && (
            <>
              {/* Summary KPI cards */}
              <div className="summary-cards">
                <SummaryCards summary={summary} color={cfg.color} isRtl={isRtl} />
              </div>

              {/* KPI panel */}
              {kpiData && <KpiPanel data={kpiData} isRtl={isRtl} />}

              {/* Revenue area chart */}
              {activeReport === 'revenue' && listData.length > 0 && (
                <div className="chart-container">
                  <RevenueChart data={listData} color={cfg.color} isRtl={isRtl} />
                </div>
              )}

              {/* Housekeeping pie + bar charts */}
              {activeReport === 'housekeeping' && listData.length > 0 && (
                <div className="chart-container">
                  <HousekeepingCharts data={listData} color={cfg.color} isRtl={isRtl} />
                </div>
              )}

              {/* Detailed table for list-type reports */}
              {['arrivals','departures','guests','housekeeping','trips','services','reservations','payments','maintenance'].includes(activeReport) && listData.length > 0 && (
                <div style={{ marginTop:'24px', borderTop:'1px solid var(--color-border)', paddingTop:'20px' }}>
                  
                  {/* Real-time search filter bar (Hidden on Print) */}
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:'var(--color-text-primary)' }}>
                      {isRtl ? 'السجلات التفصيلية' : 'Detailed records'} ({filteredListData.length})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>🔍</span>
                      <input
                        type="text"
                        placeholder={isRtl ? 'البحث في الجدول...' : 'Search table...'}
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '13px', width: '220px' }}
                      />
                      {filterText && (
                        <button
                          onClick={() => setFilterText('')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '13px', padding: '0 4px' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Print-only Table Title */}
                  <div className="print-only" style={{ display: 'none', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                    {isRtl ? 'السجلات التفصيلية للتقرير' : 'Detailed Report Records'} ({filteredListData.length})
                  </div>

                  <DataTable rows={filteredListData} isRtl={isRtl} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          /* Hide sidebar, navigation, search boxes, filters */
          nav, aside, header, [data-sidebar], .no-print, .no-print * { display: none !important; }
          body { background: white !important; color: black !important; font-size: 10pt; }
          main { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
          
          /* Override general container margins and paddings for clean fit */
          body > div > div { margin-left: 0 !important; margin-right: 0 !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          
          /* Show print-only headers */
          .print-only { display: block !important; }
          
          /* Force charts/summaries to stay on page */
          .chart-container, .summary-cards { page-break-inside: avoid !important; margin-bottom: 20px !important; }
          
          /* Style printed tables */
          table { width: 100% !important; border: 1px solid #ddd !important; font-size: 10px !important; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          th, td { border: 1px solid #eee !important; padding: 6px 8px !important; }
          th { background: #f5f5f5 !important; color: #000 !important; font-weight: bold !important; }
        }
      `}</style>
    </div>
  );
}

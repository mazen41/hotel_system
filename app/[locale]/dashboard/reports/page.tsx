'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useLocale } from 'next-intl';
import { ApiError } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportType =
  | 'revenue'
  | 'adr'
  | 'revpar'
  | 'arrivals'
  | 'departures'
  | 'guests'
  | 'housekeeping'
  | 'financial-summary';

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
  revpar:              { label:'RevPAR',            labelAr:'إيراد الغرفة المتاحة', icon:'📈', description:'Revenue Per Available Room — efficiency metric',           descriptionAr:'الإيراد لكل غرفة متاحة — مقياس الكفاءة',         color:'#8b5cf6', chartType:'kpi'   },
  arrivals:            { label:'Arrivals',          labelAr:'الوصول',               icon:'✈️', description:'Guest check-ins with room and payment details',           descriptionAr:'تسجيلات وصول النزلاء مع تفاصيل الغرف والدفع',    color:'#3b82f6', chartType:'table' },
  departures:          { label:'Departures',        labelAr:'المغادرة',              icon:'🚪', description:'Guest check-outs with stay duration and balance',         descriptionAr:'مغادرة النزلاء مع مدة الإقامة والرصيد',           color:'#ef4444',chartType:'table' },
  guests:              { label:'Guest Report',      labelAr:'تقرير النزلاء',        icon:'👥', description:'Guest activity, VIP status, and visit frequency',         descriptionAr:'نشاط النزلاء وحالة VIP وتكرار الزيارات',          color:'#06b6d4', chartType:'table' },
  housekeeping:        { label:'Housekeeping',      labelAr:'الخدمة الفندقية',      icon:'🧹', description:'Task completion rates, priorities, and staff assignments', descriptionAr:'معدلات الإنجاز والأولويات وتكليفات الموظفين',     color:'#84cc16', chartType:'bar'   },
  'financial-summary': { label:'Financial Summary', labelAr:'الملخص المالي',        icon:'🧾', description:'Revenue, charges, refunds, and net income',               descriptionAr:'الإيرادات والرسوم والمبالغ المستردة وصافي الدخل', color:'#f97316', chartType:'kpi'   },
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, type: 'currency'|'percent'|'number' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  if (type === 'percent')  return `${(Number(n) || 0).toFixed(1)}%`;
  return n.toLocaleString('en-US', { maximumFractionDigits:2 });
}
const isCurrency = (k: string) => /revenue|amount|adr|revpar|price|total|payment|charge|net|income/i.test(k);
const isPercent  = (k: string) => /rate|percent|pct/i.test(k);

function formatCellVal(col: string, val: string): string {
  if (!val || val === 'null' || val === 'undefined') return '—';
  if ((col.includes('date') || col.includes('_at')) && !col.includes('updated')) {
    try { return format(new Date(val), 'MMM d, yyyy'); } catch { return val; }
  }
  if (isCurrency(col)) { const n = parseFloat(val); return isNaN(n) ? val : fmt(n, 'currency'); }
  return val;
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

function exportCSV(name: string, rows: Record<string,unknown>[], summary: Record<string,unknown>) {
  const lines: string[] = [];
  if (Object.keys(summary).length) {
    lines.push('SUMMARY');
    Object.entries(summary).forEach(([k, v]) => lines.push(`"${k.replace(/_/g,' ')}","${v}"`));
    lines.push('');
  }
  if (rows.length) {
    const cols = Object.keys(rows[0]);
    lines.push(cols.map(c => `"${c}"`).join(','));
    rows.forEach(r => lines.push(cols.map(c => `"${String(r[c] ?? '')}"`).join(',')));
  }
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCards({ summary, color }: { summary: Record<string,unknown>; color: string }) {
  const entries = Object.entries(summary);
  if (!entries.length) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'12px', marginBottom:'24px' }}>
      {entries.map(([k, v]) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        const disp = !isNaN(n) ? (isCurrency(k) ? fmt(n,'currency') : isPercent(k) ? fmt(n,'percent') : fmt(n)) : String(v ?? '—');
        return (
          <div key={k} style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'12px', padding:'16px 18px', borderTop:`3px solid ${color}` }}>
            <div style={{ fontSize:'11px', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'8px' }}>
              {k.replace(/_/g,' ')}
            </div>
            <div style={{ fontSize:'24px', fontWeight:'700', color, letterSpacing:'-0.5px', lineHeight:1 }}>{disp}</div>
          </div>
        );
      })}
    </div>
  );
}

function KpiPanel({ data }: { data: Record<string,unknown> }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' }}>
      {Object.entries(data).filter(([k]) => !['start_date','end_date'].includes(k)).map(([k, v]) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        const disp = !isNaN(n) ? (isCurrency(k) ? fmt(n,'currency') : isPercent(k) ? fmt(n,'percent') : fmt(n)) : String(v ?? '—');
        return (
          <div key={k} style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'14px', padding:'20px 22px' }}>
            <div style={{ fontSize:'11px', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px' }}>
              {k.replace(/_/g,' ')}
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

  const PRIORITY = ['date','reservation_number','guest.first_name','guest.last_name','room.room_number','check_in_date','check_out_date','nights','status','payment_status','total_amount','paid_amount','balance_due'];
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
            {cols.map(col => (
              <th key={col} style={{ padding:'10px 14px', fontSize:'11px', fontWeight:'600', color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--color-border)', whiteSpace:'nowrap', background:'var(--color-surface)' }}>
                {col.split('.').pop()?.replace(/_/g,' ')}
              </th>
            ))}
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
                const isStatus = col === 'status' || col === 'payment_status';
                return (
                  <td key={col} style={{ padding:'10px 14px', color:'var(--color-text-primary)', whiteSpace:'nowrap' }}>
                    {isStatus ? (
                      <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:`${STATUS_COLORS[raw]??'#6b7280'}22`, color:STATUS_COLORS[raw]??'#6b7280' }}>
                        {raw.replace(/_/g,' ')}
                      </span>
                    ) : formatCellVal(col, raw)}
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

function RevenueChart({ data, color }: { data: Record<string,unknown>[]; color: string }) {
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
        <Tooltip contentStyle={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'8px', fontSize:'12px' }} formatter={(v: unknown) => [fmt(Number(v),'currency'), 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} fill="url(#rev-grad)" name="Revenue" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HousekeepingCharts({ data, color }: { data: Record<string,unknown>[]; color: string }) {
  const statusMap: Record<string,number> = {};
  const priorityMap: Record<string,number> = {};
  data.forEach(t => {
    const s = String(t.status ?? 'unknown');
    const p = String(t.priority ?? 'unknown');
    statusMap[s]   = (statusMap[s]   ?? 0) + 1;
    priorityMap[p] = (priorityMap[p] ?? 0) + 1;
  });
  const PIE_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
  const statusData   = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(priorityMap).map(([name, value]) => ({ name, value }));
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'24px' }}>
      <div>
        <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:'12px', color:'var(--color-text-primary)' }}>By status</div>
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
        <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:'12px', color:'var(--color-text-primary)' }}>By priority</div>
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

  const cfg = CONFIGS[activeReport];

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

  // ── Export CSV ──
  function handleCSV() {
    const rows: Record<string,unknown>[] = listData.length ? listData : kpiData ? [kpiData] : [];
    exportCSV(`${activeReport}-${startDate}-to-${endDate}`, rows, summary);
  }

  const label = isRtl ? cfg.labelAr : cfg.label;
  const desc  = isRtl ? cfg.descriptionAr : cfg.description;
  const hasData = listData.length > 0 || kpiData !== null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'700', color:'var(--color-text-primary)', letterSpacing:'-0.4px', marginBottom:'4px' }}>
            {isRtl ? 'التقارير' : 'Reports'}
          </h1>
          <p style={{ fontSize:'13px', color:'var(--color-text-secondary)' }}>
            {isRtl ? 'تحليلات وبيانات شاملة لعمليات الفندق' : 'Comprehensive analytics and data for hotel operations'}
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

      {/* ── Date filter bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'12px', padding:'12px 16px' }}>
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

      {/* ── Report type tabs ── */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {(Object.keys(CONFIGS) as ReportType[]).map(type => {
          const c = CONFIGS[type];
          const active = type === activeReport;
          return (
            <button key={type} onClick={() => setActiveReport(type)}
              style={{ display:'flex', alignItems:'center', gap:'5px', padding:'7px 13px', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer', border:`1px solid ${active ? c.color : 'var(--color-border)'}`, background: active ? `${c.color}18` : 'var(--color-surface)', color: active ? c.color : 'var(--color-text-secondary)', transition:'all 0.15s' }}
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
              {/* Summary KPI cards (shown for all reports that return a summary object) */}
              <SummaryCards summary={summary} color={cfg.color} />

              {/* KPI panel — adr, revpar, financial-summary return a single data object */}
              {kpiData && <KpiPanel data={kpiData} />}

              {/* Revenue area chart */}
              {activeReport === 'revenue' && listData.length > 0 && (
                <RevenueChart data={listData} color={cfg.color} />
              )}

              {/* Housekeeping pie + bar charts */}
              {activeReport === 'housekeeping' && listData.length > 0 && (
                <HousekeepingCharts data={listData} color={cfg.color} />
              )}

              {/* Detailed table for list-type reports */}
              {['arrivals','departures','guests','housekeeping'].includes(activeReport) && listData.length > 0 && (
                <div style={{ marginTop:'24px', borderTop:'1px solid var(--color-border)', paddingTop:'20px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'var(--color-text-primary)', marginBottom:'12px' }}>
                    {isRtl ? 'البيانات التفصيلية' : 'Detailed records'} ({listData.length})
                  </div>
                  <DataTable rows={listData} isRtl={isRtl} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          nav, aside, header, [data-sidebar], .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

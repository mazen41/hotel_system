'use client';

import { useState, useEffect } from 'react';
import { auditLogsApi } from '@/lib/api';

interface ActivityLog {
  id: number;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  properties: any;
  old_values: any;
  new_values: any;
  created_at: string;
  causer?: {
    id: number;
    name: string;
    email: string;
  };
  subject?: any;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    subject_type: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      const response = await auditLogsApi.list({
        subject_type: filter.subject_type || undefined,
        date_from: filter.date_from || undefined,
        date_to: filter.date_to || undefined,
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectTypeLabel = (type: string | null) => {
    if (!type) return 'N/A';
    return type.split('\\').pop();
  };

  const getActionLabel = (description: string) => {
    if (description.includes('created')) return 'Created';
    if (description.includes('updated')) return 'Updated';
    if (description.includes('deleted')) return 'Deleted';
    return description;
  };

  const getActionColor = (description: string) => {
    if (description.includes('created')) return 'var(--color-success)';
    if (description.includes('updated')) return 'var(--color-primary)';
    if (description.includes('deleted')) return 'var(--color-danger)';
    return 'var(--color-text-muted)';
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          Audit Logs
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Track all changes made to Guests, Reservations, Rate Plans, and Users
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            Subject Type
          </label>
          <select
            value={filter.subject_type}
            onChange={(e) => setFilter({ ...filter, subject_type: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="">All Types</option>
            <option value="App\\Models\\Guest">Guest</option>
            <option value="App\\Models\\Reservation">Reservation</option>
            <option value="App\\Models\\RatePlan">Rate Plan</option>
            <option value="App\\Models\\User">User</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            From Date
          </label>
          <input
            type="date"
            value={filter.date_from}
            onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            To Date
          </label>
          <input
            type="date"
            value={filter.date_to}
            onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
            }}
          />
        </div>

        <button
          onClick={() => setFilter({ subject_type: '', date_from: '', date_to: '' })}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          No audit logs found
        </div>
      ) : (
        <div style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-sidebar)',
              }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  User
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  Action
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  Subject Type
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    {log.causer?.name || 'System'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: getActionColor(log.description),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: `${getActionColor(log.description)}15`,
                    }}>
                      {getActionLabel(log.description)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    {getSubjectTypeLabel(log.subject_type)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

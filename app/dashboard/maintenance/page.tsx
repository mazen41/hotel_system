'use client';

import { useState, useEffect } from 'react';
import { maintenanceApi } from '@/lib/api';

interface MaintenanceRequest {
  id: number;
  room_id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  room?: {
    id: number;
    room_number: string;
    room_type?: {
      name: string;
    };
  };
  assignedTo?: {
    id: number;
    name: string;
  };
  createdBy?: {
    id: number;
    name: string;
  };
}

interface MaintenanceBoard {
  pending: MaintenanceRequest[];
  in_progress: MaintenanceRequest[];
  completed: MaintenanceRequest[];
  cancelled: MaintenanceRequest[];
}

interface MaintenanceSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  urgent: number;
}

export default function MaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState<MaintenanceBoard | null>(null);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState({
    room_id: '',
    priority: '',
  });

  useEffect(() => {
    fetchBoardData();
  }, [filter]);

  const fetchBoardData = async () => {
    setLoading(true);
    try {
      const response = await maintenanceApi.board({
        room_id: filter.room_id ? parseInt(filter.room_id) : undefined,
        priority: filter.priority || undefined,
      });
      setBoardData(response.board);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to fetch maintenance board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId: number, action: string, data?: any) => {
    try {
      if (action === 'in_progress') {
        await maintenanceApi.markAsInProgress(requestId);
      } else if (action === 'completed') {
        await maintenanceApi.markAsCompleted(requestId, data?.resolution_notes);
      } else if (action === 'cancel') {
        await maintenanceApi.cancel(requestId);
      }
      fetchBoardData();
    } catch (error) {
      console.error('Failed to update request status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'var(--color-success-dim)',
      medium: 'var(--color-primary-dim)',
      high: 'var(--color-warning-dim)',
      urgent: 'var(--color-danger-dim)',
    };
    const textColors = {
      low: 'var(--color-success)',
      medium: 'var(--color-primary)',
      high: 'var(--color-warning)',
      urgent: 'var(--color-danger)',
    };
    return { bg: colors[priority as keyof typeof colors] || colors.medium, text: textColors[priority as keyof typeof textColors] || textColors.medium };
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: '⏳',
      in_progress: '🔧',
      completed: '✅',
      cancelled: '❌',
    };
    return icons[status as keyof typeof icons] || '📋';
  };

  const renderRequestCard = (request: MaintenanceRequest) => {
    const priorityColors = getPriorityColor(request.priority);

    return (
      <div
        key={request.id}
        onClick={() => setSelectedRequest(request)}
        style={{
          background: 'var(--color-bg)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          padding: '16px',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{getStatusIcon(request.status)}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {request.room?.room_number || `Room ${request.room_id}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {request.room?.room_type?.name || 'Unknown Type'}
              </div>
            </div>
          </div>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            background: priorityColors.bg,
            color: priorityColors.text,
            textTransform: 'capitalize',
          }}>
            {request.priority}
          </span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {request.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            {request.description}
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          Created: {new Date(request.created_at).toLocaleString()}
        </div>

        {request.assignedTo && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Assigned to: {request.assignedTo.name}
          </div>
        )}

        <div style={{ 
          paddingTop: '12px', 
          borderTop: '1px solid var(--color-border-light)', 
          display: 'flex', 
          gap: '8px' 
        }}>
          {request.status === 'pending' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(request.id, 'in_progress');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Start
            </button>
          )}
          {request.status === 'in_progress' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const notes = prompt('Add resolution notes (optional):');
                handleStatusChange(request.id, 'completed', { resolution_notes: notes });
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-success)',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Complete
            </button>
          )}
          {(request.status === 'pending' || request.status === 'in_progress') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to cancel this request?')) {
                  handleStatusChange(request.id, 'cancel');
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderColumn = (title: string, requests: MaintenanceRequest[], icon: string, color: string) => (
    <div style={{
      background: 'var(--color-sidebar)',
      borderRadius: '8px',
      padding: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{title}</h3>
        <span style={{
          marginLeft: 'auto',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          background: color,
          color: 'var(--color-text-primary)',
        }}>
          {requests.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
            No requests
          </div>
        ) : (
          requests.map(renderRequestCard)
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Maintenance Board
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Track and manage room maintenance requests
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={filter.room_id}
            onChange={(e) => setFilter({ ...filter, room_id: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="">All Rooms</option>
          </select>
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            onClick={fetchBoardData}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            + New Request
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Total Requests
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {summary.total}
            </div>
          </div>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-warning)', marginBottom: '4px' }}>
              Pending
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {summary.pending}
            </div>
          </div>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginBottom: '4px' }}>
              In Progress
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {summary.in_progress}
            </div>
          </div>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-success)', marginBottom: '4px' }}>
              Completed
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {summary.completed}
            </div>
          </div>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '4px' }}>
              Urgent
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {summary.urgent}
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      {boardData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {renderColumn('Pending', boardData.pending, '⏳', 'var(--color-warning-dim)')}
          {renderColumn('In Progress', boardData.in_progress, '🔧', 'var(--color-primary-dim)')}
          {renderColumn('Completed', boardData.completed, '✅', 'var(--color-success-dim)')}
          {renderColumn('Cancelled', boardData.cancelled, '❌', 'var(--color-border-light)')}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
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
        }} onClick={() => setSelectedRequest(null)}>
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {selectedRequest.title}
              </h2>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Room
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {selectedRequest.room?.room_number || `Room ${selectedRequest.room_id}`}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Description
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {selectedRequest.description}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Priority
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                {selectedRequest.priority}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Status
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                {selectedRequest.status.replace('_', ' ')}
              </div>
            </div>

            {selectedRequest.assignedTo && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Assigned To
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {selectedRequest.assignedTo.name}
                </div>
              </div>
            )}

            {selectedRequest.resolution_notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Resolution Notes
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                  {selectedRequest.resolution_notes}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Created
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(selectedRequest.created_at).toLocaleString()}
              </div>
            </div>

            {selectedRequest.resolved_at && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Resolved
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {new Date(selectedRequest.resolved_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
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
        }} onClick={() => setShowCreateModal(false)}>
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                New Maintenance Request
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              try {
                await maintenanceApi.create({
                  room_id: parseInt(formData.get('room_id') as string),
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  priority: (formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
                });
                setShowCreateModal(false);
                fetchBoardData();
              } catch (error) {
                console.error('Failed to create maintenance request:', error);
              }
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Room
                </label>
                <select
                  name="room_id"
                  required
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
                  <option value="">Select Room</option>
                  <option value="1">Room 101</option>
                  <option value="2">Room 102</option>
                  <option value="3">Room 103</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Title
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g., Air conditioning not working"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="Describe the issue in detail"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Priority
                </label>
                <select
                  name="priority"
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
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

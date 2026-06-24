'use client';

import { useEffect, useState } from 'react';
import { roomsApi, roomTypesApi, ApiError } from '@/lib/api';
import type { Room, RoomFormData, RoomType, RoomStatus } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod schema for validation
const roomSchema = z.object({
  room_type_id: z.number().int('Room type must be an integer').positive('Room type is required'),
  room_number: z.string().min(1, 'Room number is required').max(50, 'Room number must not exceed 50 characters'),
  floor: z.string().max(50, 'Floor must not exceed 50 characters').optional(),
  status: z.enum(['available', 'occupied', 'cleaning', 'maintenance', 'out_of_order', 'out_of_service'], {
    required_error: 'Status is required',
  }),
  notes: z.string().max(5000, 'Notes must not exceed 5000 characters').optional(),
  is_active: z.boolean().optional(),
  external_room_id: z.string().max(100, 'External room ID must not exceed 100 characters').optional(),
  inventory_code: z.string().max(100, 'Inventory code must not exceed 100 characters').optional(),
  sort_order: z.number().int('Sort order must be an integer').min(0, 'Sort order must be at least 0').optional(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

const STATUS_COLORS: Record<RoomStatus, { bg: string; text: string }> = {
  available: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  occupied: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  cleaning: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
  maintenance: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316' },
  out_of_order: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  out_of_service: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRoomType, setFilterRoomType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      room_type_id: 0,
      room_number: '',
      floor: '',
      status: 'available',
      notes: '',
      is_active: true,
      external_room_id: '',
      inventory_code: '',
      sort_order: 0,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [roomsResponse, roomTypesResponse] = await Promise.all([
        roomsApi.list(),
        roomTypesApi.list(),
      ]);
      setRooms(roomsResponse.data);
      setRoomTypes(roomTypesResponse.data);
    } catch {
      setRooms([]);
      setRoomTypes([]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: RoomFormValues) {
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      if (editingRoom) {
        await roomsApi.update(editingRoom.id, data);
        setSuccessMessage('Room updated successfully!');
      } else {
        await roomsApi.create(data);
        setSuccessMessage('Room created successfully!');
      }
      await fetchData();
      closeModal();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Error:', error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openModal(room?: Room) {
    if (room) {
      setEditingRoom(room);
      reset({
        room_type_id: room.room_type_id,
        room_number: room.room_number,
        floor: room.floor || '',
        status: room.status,
        notes: room.notes || '',
        is_active: room.is_active,
        external_room_id: room.external_room_id || '',
        inventory_code: room.inventory_code || '',
        sort_order: room.sort_order,
      });
    } else {
      setEditingRoom(null);
      reset({
        room_type_id: roomTypes.length > 0 ? roomTypes[0].id : 0,
        room_number: '',
        floor: '',
        status: 'available',
        notes: '',
        is_active: true,
        external_room_id: '',
        inventory_code: '',
        sort_order: 0,
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRoom(null);
    reset();
  }

  async function handleDelete(room: Room) {
    setDeleting(true);
    try {
      await roomsApi.delete(room.id);
      setSuccessMessage('Room deleted successfully!');
      await fetchData();
      setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Error:', error.message);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkStatusUpdate() {
    if (selectedRooms.size === 0 || !bulkStatus) {
      setSuccessMessage('Please select rooms and a status');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setBulkUpdating(true);
    try {
      const promises = Array.from(selectedRooms).map(roomId =>
        roomsApi.update(roomId, { status: bulkStatus as RoomStatus })
      );
      await Promise.all(promises);
      setSuccessMessage(`${selectedRooms.size} rooms updated successfully!`);
      await fetchData();
      setSelectedRooms(new Set());
      setBulkStatus('');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to update rooms');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setBulkUpdating(false);
    }
  }

  function toggleRoomSelection(roomId: number) {
    const newSelection = new Set(selectedRooms);
    if (newSelection.has(roomId)) {
      newSelection.delete(roomId);
    } else {
      newSelection.add(roomId);
    }
    setSelectedRooms(newSelection);
  }

  function toggleAllRooms() {
    if (selectedRooms.size === filteredRooms.length) {
      setSelectedRooms(new Set());
    } else {
      setSelectedRooms(new Set(filteredRooms.map(room => room.id)));
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || room.status === filterStatus;
    const matchesRoomType = !filterRoomType || room.room_type_id === parseInt(filterRoomType);
    return matchesSearch && matchesStatus && matchesRoomType;
  });

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
              Rooms
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13.5px' }}>
              Manage your hotel&apos;s physical room inventory.
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
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.45)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(99,102,241,0.35)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Create Room
          </button>
        </div>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: '#22c55e' }}>
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: '#22c55e', fontSize: '13.5px', fontWeight: '500' }}>{successMessage}</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by room number..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            outline: 'none',
            minWidth: '250px',
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="cleaning">Cleaning</option>
          <option value="maintenance">Maintenance</option>
          <option value="out_of_order">Out of Order</option>
          <option value="out_of_service">Out of Service</option>
        </select>
        <select
          value={filterRoomType}
          onChange={e => setFilterRoomType(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        >
          <option value="">All Room Types</option>
          {roomTypes.map(rt => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedRooms.size > 0 && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#6366f1', fontSize: '14px', fontWeight: '500' }}>
            {selectedRooms.size} room{selectedRooms.size !== 1 ? 's' : ''} selected
          </span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          >
            <option value="">Set Status...</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="cleaning">Cleaning</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_order">Out of Order</option>
            <option value="out_of_service">Out of Service</option>
          </select>
          <button
            onClick={handleBulkStatusUpdate}
            disabled={!bulkStatus || bulkUpdating}
            style={{
              padding: '8px 16px',
              background: bulkStatus ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' : 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: bulkStatus ? 'white' : 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: bulkStatus ? 'pointer' : 'not-allowed',
              opacity: bulkStatus ? 1 : 0.5,
            }}
          >
            {bulkUpdating ? 'Updating...' : 'Apply'}
          </button>
          <button
            onClick={() => setSelectedRooms(new Set())}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Loading rooms…
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {searchTerm || filterStatus || filterRoomType ? 'No rooms found matching your filters.' : 'No rooms yet. Create your first room to get started.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Room Number</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Room Type</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Floor</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(room => (
                <tr key={room.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', fontSize: '14px' }}>{room.room_number}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-primary)', fontSize: '14px' }}>{room.room_type?.name || '-'}</td>
                  <td style={{ padding: '16px', color: 'var(--color-text-primary)', fontSize: '14px' }}>{room.floor || '-'}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: STATUS_COLORS[room.status].bg,
                      color: STATUS_COLORS[room.status].text,
                    }}>
                      {room.status_label}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openModal(room)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-text-muted)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(room)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.08)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {editingRoom ? 'Edit Room' : 'Create Room'}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Room Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Room Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    {...register('room_type_id', { valueAsNumber: true })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value={0}>Select a room type</option>
                    {roomTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                  {errors.room_type_id && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.room_type_id.message}</p>}
                </div>

                {/* Room Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Room Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('room_number')}
                    placeholder="e.g., 101"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {errors.room_number && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.room_number.message}</p>}
                </div>

                {/* Floor */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Floor
                  </label>
                  <input
                    {...register('floor')}
                    placeholder="e.g., 1st Floor"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {errors.floor && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.floor.message}</p>}
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    {...register('status')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_order">Out of Order</option>
                  </select>
                  {errors.status && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.status.message}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    placeholder="Additional notes..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  {errors.notes && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.notes.message}</p>}
                </div>

                {/* Active */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      {...register('is_active')}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Active</span>
                  </label>
                </div>

                {/* Channel Manager Integration (Future) */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Channel Manager Integration (Future)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                        External Room ID
                      </label>
                      <input
                        {...register('external_room_id')}
                        placeholder="e.g., EXT-101"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {errors.external_room_id && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.external_room_id.message}</p>}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                        Inventory Code
                      </label>
                      <input
                        {...register('inventory_code')}
                        placeholder="e.g., INV-101"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {errors.inventory_code && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.inventory_code.message}</p>}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                        Sort Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('sort_order', { valueAsNumber: true })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {errors.sort_order && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.sort_order.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 12px rgba(99,102,241,0.35)',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Saving…' : (editingRoom ? 'Update Room' : 'Create Room')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Delete Room
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Are you sure you want to delete room &quot;{deleteConfirm.room_number}&quot;? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                  fontWeight: '500',
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
                  fontWeight: '500',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

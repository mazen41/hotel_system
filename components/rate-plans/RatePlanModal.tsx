'use client';

import { useState, useEffect } from 'react';
import { ratePlansApi, roomTypesApi, ApiError } from '@/lib/api';
import type { RatePlan, RatePlanFormData, RoomType } from '@/types';

interface RatePlanModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editRatePlan?: RatePlan;
}

export default function RatePlanModal({ onClose, onSuccess, editRatePlan }: RatePlanModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<RatePlanFormData>({
    name: '',
    description: '',
    type: 'standard',
    pricing_type: 'fixed',
    base_rate: 0,
    min_nights: null,
    max_nights: null,
    occupancy_based_pricing: false,
    allow_children: true,
    allow_extra_beds: false,
    extra_bed_price: null,
    meal_plan_included: false,
    meal_plan_type: '',
    cancellation_policy: '',
    payment_policy: '',
    active: true,
    priority: 1,
    available_channels: ['direct'],
    room_type_rates: [],
    channel_sync_enabled: false,
  });

  useEffect(() => {
    fetchRoomTypes();
    if (editRatePlan) {
      setFormData({
        name: editRatePlan.name,
        description: editRatePlan.description || '',
        type: editRatePlan.type,
        pricing_type: editRatePlan.pricing_type,
        base_rate: editRatePlan.base_rate,
        min_nights: editRatePlan.min_nights,
        max_nights: editRatePlan.max_nights,
        occupancy_based_pricing: editRatePlan.occupancy_based_pricing,
        allow_children: editRatePlan.allow_children,
        allow_extra_beds: editRatePlan.allow_extra_beds,
        extra_bed_price: editRatePlan.extra_bed_price,
        meal_plan_included: editRatePlan.meal_plan_included,
        meal_plan_type: editRatePlan.meal_plan_type || '',
        cancellation_policy: editRatePlan.cancellation_policy || '',
        payment_policy: editRatePlan.payment_policy || '',
        active: editRatePlan.active,
        priority: editRatePlan.priority,
        available_channels: editRatePlan.available_channels,
        room_type_rates: editRatePlan.room_types.map(rt => ({ room_type_id: rt.id, rate: rt.rate })),
        channel_sync_enabled: editRatePlan.channel_sync_enabled,
      });
    }
  }, [editRatePlan]);

  async function fetchRoomTypes() {
    setLoadingRoomTypes(true);
    try {
      const response = await roomTypesApi.list({ active: true });
      setRoomTypes(response.data);
      
      // Set default room type rates if creating new
      if (!editRatePlan) {
        setFormData(prev => ({
          ...prev,
          room_type_rates: response.data.map(rt => ({ room_type_id: rt.id, rate: rt.base_price })),
        }));
      }
    } catch (error) {
      console.error('Error fetching room types:', error);
    } finally {
      setLoadingRoomTypes(false);
    }
  }

  function handleRoomTypeRateChange(roomTypeId: number, rate: number) {
    setFormData(prev => ({
      ...prev,
      room_type_rates: prev.room_type_rates?.map(rtr =>
        rtr.room_type_id === roomTypeId ? { room_type_id, rate } : rtr
      ) || [],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editRatePlan) {
        await ratePlansApi.update(editRatePlan.id, formData);
      } else {
        await ratePlansApi.create(formData);
      }
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError) {
        alert(error.message || 'Failed to save rate plan');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid var(--color-border)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'var(--color-surface)',
          zIndex: 10,
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            {editRatePlan ? 'Edit Rate Plan' : 'New Rate Plan'}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Basic Information */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Basic Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Rate Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Rate, Corporate Package"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Rate Plan Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="standard">Standard</option>
                  <option value="corporate">Corporate</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="package">Package</option>
                  <option value="promotional">Promotional</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe this rate plan..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pricing Configuration */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Pricing Configuration
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Base Rate *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.base_rate}
                  onChange={(e) => setFormData({ ...formData, base_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Pricing Type
                </label>
                <select
                  value={formData.pricing_type}
                  onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="fixed">Fixed Rate</option>
                  <option value="percentage">Percentage</option>
                  <option value="per_person">Per Person</option>
                  <option value="per_night">Per Night</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Minimum Nights
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.min_nights || ''}
                  onChange={(e) => setFormData({ ...formData, min_nights: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Maximum Nights
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_nights || ''}
                  onChange={(e) => setFormData({ ...formData, max_nights: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="No limit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Priority
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '12px',
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

            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="meal_plan_included"
                checked={formData.meal_plan_included}
                onChange={(e) => setFormData({ ...formData, meal_plan_included: e.target.checked })}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                }}
              />
              <label htmlFor="meal_plan_included" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                Include Meal Plan
              </label>
            </div>

            {formData.meal_plan_included && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Meal Plan Type
                </label>
                <select
                  value={formData.meal_plan_type}
                  onChange={(e) => setFormData({ ...formData, meal_plan_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Select meal plan</option>
                  <option value="BB">Bed & Breakfast (BB)</option>
                  <option value="HB">Half Board (HB)</option>
                  <option value="FB">Full Board (FB)</option>
                  <option value="AI">All Inclusive (AI)</option>
                  <option value="RO">Room Only (RO)</option>
                </select>
              </div>
            )}
          </div>

          {/* Room Type Rates */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Room Type Rates
            </h3>
            
            {loadingRoomTypes ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                Loading room types...
              </div>
            ) : (
              <div style={{
                background: 'var(--color-background)',
                borderRadius: '8px',
                padding: '16px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                {roomTypes.map((roomType) => {
                  const roomTypeRate = formData.room_type_rates?.find(rtr => rtr.room_type_id === roomType.id);
                  return (
                    <div key={roomType.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: roomTypes.indexOf(roomType) < roomTypes.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                          {roomType.name}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            Base: ${roomType.base_price.toFixed(2)}
                          </span>
                          {roomType.meal_plan && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontWeight: '500',
                            }}>
                              {roomType.meal_plan}
                            </span>
                          )}
                          {roomType.rates && Object.keys(roomType.rates).length > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              ({Object.entries(roomType.rates).map(([k, v]) => `${k}:$${v}`).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={roomTypeRate?.rate || 0}
                          onChange={(e) => handleRoomTypeRateChange(roomType.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '120px',
                            padding: '8px 12px',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Policies */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Policies
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Cancellation Policy
                </label>
                <textarea
                  value={formData.cancellation_policy}
                  onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
                  rows={2}
                  placeholder="e.g., Free cancellation up to 24 hours before check-in"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Payment Policy
                </label>
                <textarea
                  value={formData.payment_policy}
                  onChange={(e) => setFormData({ ...formData, payment_policy: e.target.value })}
                  rows={2}
                  placeholder="e.g., Full payment required at check-in"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Additional Options
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.occupancy_based_pricing}
                    onChange={(e) => setFormData({ ...formData, occupancy_based_pricing: e.target.checked })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Occupancy-based pricing</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.allow_children}
                    onChange={(e) => setFormData({ ...formData, allow_children: e.target.checked })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Allow children</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.allow_extra_beds}
                    onChange={(e) => setFormData({ ...formData, allow_extra_beds: e.target.checked })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Allow extra beds</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.meal_plan_included}
                    onChange={(e) => setFormData({ ...formData, meal_plan_included: e.target.checked })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Meal plan included</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.channel_sync_enabled}
                    onChange={(e) => setFormData({ ...formData, channel_sync_enabled: e.target.checked })}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Channel sync enabled</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 0',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              {submitting ? 'Saving...' : editRatePlan ? 'Update Rate Plan' : 'Create Rate Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
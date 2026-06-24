'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ratePlansApi, ApiError } from '@/lib/api';
import type { RatePlan } from '@/types';
import RatePlanModal from '@/components/rate-plans/RatePlanModal';

export default function RatePlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ratePlanId = parseInt(params.id as string);
  
  const [ratePlan, setRatePlan] = useState<RatePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'seasonal' | 'dynamic' | 'restrictions' | 'history'>('details');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchRatePlan();
  }, [ratePlanId]);

  async function fetchRatePlan() {
    setLoading(true);
    try {
      const response = await ratePlansApi.get(ratePlanId);
      setRatePlan(response.data);
    } catch (error) {
      console.error('Error fetching rate plan:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    if (!ratePlan) return;
    try {
      if (ratePlan.active) {
        await ratePlansApi.deactivate(ratePlan.id);
        setSuccessMessage('Rate plan deactivated successfully!');
      } else {
        await ratePlansApi.activate(ratePlan.id);
        setSuccessMessage('Rate plan activated successfully!');
      }
      await fetchRatePlan();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      if (error instanceof ApiError) {
        setSuccessMessage(error.message || 'Failed to toggle rate plan status');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading rate plan details...</div>
      </div>
    );
  }

  if (!ratePlan) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Rate plan not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '8px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.5px',
          }}>
            {ratePlan.name}
          </h1>
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

      {/* Status badges */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <span style={{
          fontSize: '13px',
          padding: '6px 12px',
          borderRadius: '16px',
          fontWeight: '600',
          background: getTypeColor(ratePlan.type).bg,
          color: getTypeColor(ratePlan.type).text,
        }}>
          {ratePlan.type.replace('_', ' ').toUpperCase()}
        </span>
        <span style={{
          fontSize: '13px',
          padding: '6px 12px',
          borderRadius: '16px',
          fontWeight: '600',
          background: getPricingTypeColor(ratePlan.pricing_type).bg,
          color: getPricingTypeColor(ratePlan.pricing_type).text,
        }}>
          {ratePlan.pricing_type.replace('_', ' ').toUpperCase()}
        </span>
        <span style={{
          fontSize: '13px',
          padding: '6px 12px',
          borderRadius: '16px',
          fontWeight: '600',
          background: ratePlan.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: ratePlan.active ? '#22c55e' : '#ef4444',
        }}>
          {ratePlan.active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowEditModal(true)}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(99,102,241,0.35)',
          }}
        >
          ✏️ Edit Rate Plan
        </button>
        <button
          onClick={handleToggleActive}
          style={{
            padding: '10px 20px',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          {ratePlan.active ? '⏸️ Deactivate' : '▶️ Activate'}
        </button>
        <button
          onClick={() => router.push('/dashboard/rate-plans')}
          style={{
            padding: '10px 20px',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Back to List
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '24px',
      }}>
        <button
          onClick={() => setActiveTab('details')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'details' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'details' ? '600' : '400',
            background: activeTab === 'details' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'details' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('seasonal')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'seasonal' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'seasonal' ? '600' : '400',
            background: activeTab === 'seasonal' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'seasonal' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Seasonal Rates ({ratePlan.seasonal_rates.length})
        </button>
        <button
          onClick={() => setActiveTab('dynamic')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'dynamic' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'dynamic' ? '600' : '400',
            background: activeTab === 'dynamic' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'dynamic' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Dynamic Rules ({ratePlan.dynamic_pricing_rules.length})
        </button>
        <button
          onClick={() => setActiveTab('restrictions')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'restrictions' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'restrictions' ? '600' : '400',
            background: activeTab === 'restrictions' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'restrictions' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Restrictions ({ratePlan.restrictions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #6366f1' : 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'history' ? '600' : '400',
            background: activeTab === 'history' ? 'rgba(99,102,241,0.05)' : 'transparent',
            color: activeTab === 'history' ? '#6366f1' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Basic Information */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Basic Information
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Name</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                {ratePlan.name}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Description</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {ratePlan.description || '-'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Priority</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {ratePlan.priority}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Status</div>
              <div style={{ fontSize: '14px', color: ratePlan.active ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                {ratePlan.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Pricing Configuration */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Pricing Configuration
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Base Rate</div>
              <div style={{ fontSize: '18px', color: '#6366f1', fontWeight: '700' }}>
                ${ratePlan.base_rate.toFixed(2)}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Minimum Nights</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {ratePlan.min_nights || 'No minimum'}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Maximum Nights</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {ratePlan.max_nights || 'No maximum'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Extra Bed Price</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {ratePlan.extra_bed_price ? `$${ratePlan.extra_bed_price.toFixed(2)}` : 'Not allowed'}
              </div>
            </div>
          </div>

          {/* Room Type Rates */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Room Type Rates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ratePlan.room_types.map((roomTypeRate) => (
                <div key={roomTypeRate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                      {roomTypeRate.name}
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#6366f1' }}>
                    ${roomTypeRate.rate.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Additional Options
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: ratePlan.occupancy_based_pricing ? '#22c55e' : 'var(--color-text-secondary)' }}>
                  {ratePlan.occupancy_based_pricing ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Occupancy-based pricing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: ratePlan.allow_children ? '#22c55e' : 'var(--color-text-secondary)' }}>
                  {ratePlan.allow_children ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Allow children</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: ratePlan.allow_extra_beds ? '#22c55e' : 'var(--color-text-secondary)' }}>
                  {ratePlan.allow_extra_beds ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Allow extra beds</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: ratePlan.meal_plan_included ? '#22c55e' : 'var(--color-text-secondary)' }}>
                  {ratePlan.meal_plan_included ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Meal plan included ({ratePlan.meal_plan_type || 'None'})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: ratePlan.channel_sync_enabled ? '#22c55e' : 'var(--color-text-secondary)' }}>
                  {ratePlan.channel_sync_enabled ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Channel sync enabled</span>
              </div>
            </div>
          </div>

          {/* Policies */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            gridColumn: 'span 2',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Policies
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Cancellation Policy</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                {ratePlan.cancellation_policy || 'No cancellation policy specified'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Payment Policy</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                {ratePlan.payment_policy || 'No payment policy specified'}
              </div>
            </div>
          </div>

          {/* Available Channels */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Available Channels
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ratePlan.available_channels.map((channel) => (
                <span key={channel} style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontWeight: '600',
                  background: 'rgba(99,102,241,0.1)',
                  color: '#6366f1',
                }}>
                  {channel.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Timestamps
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Created At</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(ratePlan.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Updated At</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(ratePlan.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            Seasonal Rates
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Manage seasonal pricing adjustments for holidays, peak seasons, and special events.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Current seasonal rates: <strong>{ratePlan.seasonal_rates.length}</strong>
            </span>
          </div>
          <button
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
            + Add Seasonal Rate
          </button>
        </div>
      )}

      {activeTab === 'dynamic' && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2l4 4m-4-4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            Dynamic Pricing Rules
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Set up automated pricing rules based on occupancy, lead time, day of week, and events.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Current dynamic rules: <strong>{ratePlan.dynamic_pricing_rules.length}</strong>
            </span>
          </div>
          <button
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
            + Add Dynamic Rule
          </button>
        </div>
      )}

      {activeTab === 'restrictions' && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            Rate Restrictions
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Manage blackout dates, minimum/maximum stay requirements, and booking restrictions.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Current restrictions: <strong>{ratePlan.restrictions.length}</strong>
            </span>
          </div>
          <button
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
            + Add Restriction
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            Activity History
          </h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Activity history and audit trail will be implemented in a future update.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <RatePlanModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchRatePlan();
            setShowEditModal(false);
            setSuccessMessage('Rate plan updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          editRatePlan={ratePlan}
        />
      )}
    </div>
  );
}
// client/src/components/Admin/OperationalControlsHardened.jsx - GRANULAR OPERATIONAL OVERRIDES (GAP 6)
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import './Settings.css';

export const OperationalControlsHardened = () => {
  const { token, showAlert } = useContext(AppContext);
  const [controls, setControls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetField, setTargetField] = useState('');
  const [targetValue, setTargetValue] = useState(true);
  const [reason, setReason] = useState('');

  const fetchControls = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/controls', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setControls(data.data);
      } else {
        setControls(null);
      }
    } catch (err) {
      console.error('Failed to load operational controls:', err);
      setControls(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControls();
  }, [token]);

  const handleToggleClick = (field, currentValue) => {
    const nextValue = !currentValue;
    if (nextValue === false) {
      // Prompt modal for reason before locking down a system control
      setTargetField(field);
      setTargetValue(nextValue);
      setReason('');
      setModalOpen(true);
    } else {
      // Turning ON does not require an activationReason, apply directly
      applyUpdate(field, nextValue, 'System recovery activation');
    }
  };

  const applyUpdate = async (field, value, actReason) => {
    try {
      const payload = {
        [field]: value
      };
      if (actReason) payload.activationReason = actReason;

      const res = await fetch('/api/admin/controls', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showAlert('System controls updated successfully', 'success');
        setModalOpen(false);
        fetchControls();
      } else {
        showAlert(data.message, 'error');
      }
    } catch (err) {
      showAlert('Failed to update control states', 'error');
    }
  };

  const confirmShutdown = () => {
    if (reason.trim().length < 10) return;
    applyUpdate(targetField, targetValue, reason);
  };

  if (loading) return <div style={{ padding: '2rem', color: '#e4e4e7' }}>Querying active system gates...</div>;

  if (!controls) {
    return (
      <div className="operational-controls-page" style={{ padding: '2rem', color: '#e4e4e7', background: '#09090b', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#18181b', border: '1px solid #ef4444', padding: '2.5rem', borderRadius: '12px', textAlign: 'center', maxWidth: '450px' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}>⚠️ Access Denied</h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem', lineHeight: '1.5' }}>
            You do not have the required permissions to view or modify operational system overrides. This panel is restricted to Administrators with the <code>settings.manage</code> scope.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="operational-controls-page" style={{ padding: '2rem', color: '#e4e4e7', background: '#09090b', minHeight: '100vh' }}>
      <h2>Operational System Controls</h2>
      <p style={{ color: '#71717a', marginBottom: '2rem' }}>Modular gates replacing binary kill switch toggles.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* CONTROL 1: ORDER PLACEMENT */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Order Placement</h3>
            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Master checkout operations gate.</span>
          </div>
          <button
            onClick={() => handleToggleClick('ordersEnabled', controls.ordersEnabled)}
            style={{
              background: controls.ordersEnabled ? '#10b981' : '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {controls.ordersEnabled ? 'ACTIVE (ON)' : 'HALTED (OFF)'}
          </button>
        </div>

        {/* CONTROL 2: MPESA PAYMENTS */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>M-Pesa STK Push</h3>
            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Daraja STK push payments gate.</span>
          </div>
          <button
            onClick={() => handleToggleClick('mpesaEnabled', controls.mpesaEnabled)}
            style={{
              background: controls.mpesaEnabled ? '#10b981' : '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {controls.mpesaEnabled ? 'ACTIVE (ON)' : 'HALTED (OFF)'}
          </button>
        </div>

        {/* CONTROL 3: CASH ON DELIVERY */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Cash On Delivery (COD)</h3>
            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Standard manual shipping COD payments gate.</span>
          </div>
          <button
            onClick={() => handleToggleClick('cashOnDeliveryEnabled', controls.cashOnDeliveryEnabled)}
            style={{
              background: controls.cashOnDeliveryEnabled ? '#10b981' : '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {controls.cashOnDeliveryEnabled ? 'ACTIVE (ON)' : 'HALTED (OFF)'}
          </button>
        </div>

      </div>

      {/* SHUTDOWN ACTIVATION REASON MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '2rem', borderRadius: '8px', width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Confirm System Action Shutdown</h3>
            <p style={{ color: '#71717a', fontSize: '0.9rem' }}>Please input at least 10 characters justifying why this administrative override toggle is being disabled.</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              style={{ background: '#09090b', color: '#e4e4e7', border: '1px solid #27272a', padding: '0.75rem', borderRadius: '6px', outline: 'none' }}
              placeholder="Input activation reason here..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setModalOpen(false)} style={{ background: '#27272a', border: 'none', color: '#e4e4e7', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={confirmShutdown}
                disabled={reason.trim().length < 10}
                style={{ background: '#ef4444', border: 'none', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '6px', cursor: reason.trim().length < 10 ? 'not-allowed' : 'pointer', opacity: reason.trim().length < 10 ? 0.5 : 1 }}
              >
                Confirm Halted
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalControlsHardened;

// client/src/components/Admin/AnalyticsHardened.jsx - GRANULAR PREDICTIVE ANALYTICS PAGE (GAP 5)
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import './Analytics.css';

export const AnalyticsHardened = () => {
  const { token } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  
  // States for each independently fetched panel
  const [fulfilment, setFulfilment] = useState([]);
  const [retention, setRetention] = useState({ returningCustomers: 0, oneTimeCustomers: 0, retentionRate: 0 });
  const [mpesaFailures, setMpesaFailures] = useState([]);
  const [burnRate, setBurnRate] = useState([]);
  const [cartAbandonment, setCartAbandonment] = useState([]);
  const [revenue, setRevenue] = useState([]);

  const fetchPanel = async (endpoint, setter) => {
    try {
      const res = await fetch(`/api/admin/reports/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setter(data.data);
      }
    } catch (err) {
      console.error(`Failed to load ${endpoint} reports:`, err);
    }
  };

  const loadAllPanels = async () => {
    if (!token) return;
    setLoading(true);
    await Promise.all([
      fetchPanel('fulfilment-time', setFulfilment),
      fetchPanel('customer-retention', setRetention),
      fetchPanel('mpesa-failure-reasons', setMpesaFailures),
      fetchPanel('inventory-burn-rate', setBurnRate),
      fetchPanel('cart-abandonment', setCartAbandonment),
      fetchPanel('revenue-trend', setRevenue)
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllPanels();
  }, [token]);

  return (
    <div className="analytics-page-hardened" style={{ padding: '2rem', color: '#e4e4e7', background: '#09090b', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Predictive Analytics &amp; Reports</h2>
          <p style={{ color: '#71717a', margin: '0' }}>Strategic operations aggregations and forecasting summaries.</p>
        </div>
        <button onClick={loadAllPanels} style={{ background: '#d4af37', border: 'none', color: '#000000', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Manual Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', background: '#18181b', borderRadius: '8px' }}>
          Assembling business metrics pipelines...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* PANEL 1: FULFILLMENT TIME */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px' }}>
            <h3>Fulfilment Speed Trend</h3>
            <p style={{ color: '#71717a', fontSize: '0.8rem' }}>Average turnaround time (hours) from creation to Shipped.</p>
            <div style={{ marginTop: '1rem' }}>
              {fulfilment.length === 0 ? <p>No data recorded.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {fulfilment.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#09090b', borderRadius: '4px' }}>
                      <span>{item.week}</span>
                      <strong>{item.averageHours} hrs</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANEL 2: CUSTOMER RETENTION */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px' }}>
            <h3>Customer Retention Rate</h3>
            <p style={{ color: '#71717a', fontSize: '0.8rem' }}>Comparing one-time customer signups against repeat loyalists.</p>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{retention.returningCustomers}</div>
                <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Returning Customers</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{retention.oneTimeCustomers}</div>
                <div style={{ fontSize: '0.75rem', color: '#71717a' }}>One-time Buyers</div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', background: '#09090b', padding: '0.75rem', borderRadius: '6px' }}>
              <span>Deducted Retention Rate: <strong>{retention.retentionRate}%</strong></span>
            </div>
          </div>

          {/* PANEL 3: MPESA FAILURE BREAKDOWN */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px' }}>
            <h3>M-Pesa Failure Breakdown</h3>
            <p style={{ color: '#71717a', fontSize: '0.8rem' }}>Failures this week versus last week.</p>
            <div style={{ marginTop: '1rem' }}>
              {mpesaFailures.length === 0 ? <p>No failed STK push transactions recorded.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {mpesaFailures.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#09090b', borderRadius: '4px' }}>
                      <span>{item.reason}</span>
                      <div>
                        <span>This Wk: <strong>{item.thisWeek}</strong></span>
                        <span style={{ marginLeft: '0.5rem', color: item.delta > 0 ? '#ef4444' : '#10b981' }}>
                          (Δ: {item.delta > 0 ? `+${item.delta}` : item.delta})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANEL 4: INVENTORY BURN RATE */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px' }}>
            <h3>Inventory Runout Forecast</h3>
            <p style={{ color: '#71717a', fontSize: '0.8rem' }}>Burn rates averaged over 30 days and forecast runway in days.</p>
            <div style={{ marginTop: '1rem' }}>
              {burnRate.length === 0 ? <p>No sales activity logged.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {burnRate.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#09090b', borderRadius: '4px', borderLeft: item.daysUntilStockout <= 7 ? '3px solid #ef4444' : 'none' }}>
                      <span>{item.productName}</span>
                      <span>Runway: <strong style={{ color: item.daysUntilStockout <= 7 ? '#ef4444' : '#e4e4e7' }}>{item.daysUntilStockout} days</strong></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANEL 5: CART ABANDONMENT */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px' }}>
            <h3>Top 10 Cart Abandonment</h3>
            <p style={{ color: '#71717a', fontSize: '0.8rem' }}>Ranked listing of products left behind at checkout.</p>
            <div style={{ marginTop: '1rem' }}>
              {cartAbandonment.length === 0 ? <p>No checkouts abandoned.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cartAbandonment.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#09090b', borderRadius: '4px' }}>
                      <span>{item.productName}</span>
                      <strong>{item.abandonmentCount} times</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANEL 6: REVENUE TREND */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '1.5rem', borderRadius: '8px' }}>
            <h3>Revenue Timeline &amp; Rolling Average</h3>
            <p style={{ color: '#71717a', fontSize: '0.8rem' }}>Daily paid revenue alongside 7-day rolling trends.</p>
            <div style={{ marginTop: '1rem' }}>
              {revenue.length === 0 ? <p>No revenue logged.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {revenue.slice(-5).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#09090b', borderRadius: '4px' }}>
                      <span>{item.date}</span>
                      <div>
                        <span>Daily: <strong>KES {item.revenue}</strong></span>
                        <span style={{ marginLeft: '0.5rem', color: '#71717a' }}>
                          (7D Roll: KES {item.rollingAverage})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AnalyticsHardened;

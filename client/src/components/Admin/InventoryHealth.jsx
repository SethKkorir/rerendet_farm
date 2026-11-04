// client/src/components/Admin/InventoryHealth.jsx — Luxury Inventory Health & Forecasting Matrix
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { can } from '../../utils/permissions';
import { updateProductStock } from '../../api/api';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  Minus,
  Edit3,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import './InventoryHealth.css';

export const InventoryHealth = () => {
  const { user, token, showAlert } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'low' | 'out' | 'healthy'
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ physicalStock: 0, lowStockThreshold: 5 });
  const [updatingId, setUpdatingId] = useState(null);

  const fetchProducts = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/admin/products?limit=150', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Sort lowest available stock at top
        const sorted = (data.data.products || []).sort((a, b) => {
          const availA = (a.inventory?.physicalStock || 0) - (a.inventory?.reservedStock || 0);
          const availB = (b.inventory?.physicalStock || 0) - (b.inventory?.reservedStock || 0);
          return availA - availB;
        });
        setProducts(sorted);
      }
    } catch (err) {
      console.error('Failed to load inventory health matrix:', err);
      showAlert('Failed to load inventory health data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  // ─── METRICS CALCULATION ───
  const metrics = useMemo(() => {
    let totalPhysical = 0;
    let totalReserved = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyCount = 0;

    products.forEach((p) => {
      const phys = p.inventory?.physicalStock || 0;
      const res = p.inventory?.reservedStock || 0;
      const avail = phys - res;
      const thresh = p.inventory?.lowStockThreshold ?? 5;

      totalPhysical += phys;
      totalReserved += res;

      if (avail <= 0) {
        outOfStockCount++;
      } else if (avail <= thresh) {
        lowStockCount++;
      } else {
        healthyCount++;
      }
    });

    const totalSkus = products.length;
    const healthPercentage = totalSkus > 0 ? Math.round((healthyCount / totalSkus) * 100) : 100;

    return {
      totalSkus,
      totalPhysical,
      totalReserved,
      lowStockCount,
      outOfStockCount,
      healthyCount,
      healthPercentage
    };
  }, [products]);

  // ─── FILTERING ───
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const avail = (p.inventory?.physicalStock || 0) - (p.inventory?.reservedStock || 0);
      const thresh = p.inventory?.lowStockThreshold ?? 5;

      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
        (p.origin && p.origin.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (stockFilter === 'out') return avail <= 0;
      if (stockFilter === 'low') return avail > 0 && avail <= thresh;
      if (stockFilter === 'healthy') return avail > thresh;
      return true;
    });
  }, [products, search, stockFilter]);

  // ─── EDIT HANDLERS ───
  const handleEditClick = (prod) => {
    setEditingId(prod._id);
    setEditForm({
      physicalStock: prod.inventory?.physicalStock || 0,
      lowStockThreshold: prod.inventory?.lowStockThreshold ?? 5
    });
  };

  const handleSave = async (id) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/admin/products/${id}/stock`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          physicalStock: editForm.physicalStock,
          lowStockThreshold: editForm.lowStockThreshold
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Inventory updated successfully', 'success');
        setEditingId(null);
        setProducts((prev) =>
          prev.map((p) =>
            p._id === id
              ? {
                  ...p,
                  inventory: {
                    ...p.inventory,
                    physicalStock: editForm.physicalStock,
                    lowStockThreshold: editForm.lowStockThreshold
                  }
                }
              : p
          )
        );
      } else {
        showAlert(data.message || 'Update failed', 'error');
      }
    } catch (err) {
      showAlert('Failed to update inventory', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── QUICK RESTOCK STEPPER (+5, +10, +25, -1) ───
  const handleQuickAdjust = async (id, delta) => {
    try {
      setUpdatingId(id);
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p._id === id
            ? {
                ...p,
                inventory: {
                  ...p.inventory,
                  physicalStock: Math.max(0, (p.inventory?.physicalStock || 0) + delta)
                }
              }
            : p
        )
      );

      const res = await updateProductStock(id, { mode: 'adjust', adjustment: delta });
      if (!res.data?.success) {
        // Rollback on failure
        fetchProducts(true);
        showAlert('Failed to adjust stock', 'error');
      }
    } catch (err) {
      console.error('Quick adjust error:', err);
      fetchProducts(true);
      showAlert('Failed to adjust stock', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const role = user?.role || 'admin';
  const hasWritePerm = can(role, 'inventory.write') || can(role, 'products:manage') || role === 'admin' || role === 'superadmin';

  return (
    <div className="ih-container">
      {/* ─── HEADER ─── */}
      <div className="ih-header">
        <div className="ih-header-title">
          <h2>Inventory Health &amp; Stock Matrix</h2>
          <p>Real-time warehouse availability, reserved orders, and dynamic low-stock forecast alerts.</p>
        </div>

        <div className="ih-header-actions">
          <button
            className="ih-btn-refresh"
            onClick={() => fetchProducts(true)}
            disabled={refreshing}
            title="Refresh stock ledger"
          >
            <RefreshCw size={14} className={refreshing ? 'ih-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Stock'}</span>
          </button>
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="ih-kpi-grid">
        {/* Card 1: Total SKUs */}
        <div className="ih-kpi-card" onClick={() => setStockFilter('all')}>
          <div className="ih-kpi-top">
            <span className="ih-kpi-lbl">Active Products</span>
            <div className="ih-kpi-icon blue">
              <Package size={17} />
            </div>
          </div>
          <div className="ih-kpi-val">{metrics.totalSkus}</div>
          <span className="ih-kpi-sub">
            <strong>{metrics.totalPhysical.toLocaleString()}</strong> units in warehouse
          </span>
        </div>

        {/* Card 2: Healthy Stock */}
        <div className="ih-kpi-card" onClick={() => setStockFilter('healthy')}>
          <div className="ih-kpi-top">
            <span className="ih-kpi-lbl">Healthy Stock</span>
            <div className="ih-kpi-icon green">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div className="ih-kpi-val">{metrics.healthyCount}</div>
          <div className="ih-gauge-wrap">
            <div className="ih-gauge-bar">
              <div
                className="ih-gauge-fill green"
                style={{ width: `${metrics.healthPercentage}%` }}
              />
            </div>
            <span className="ih-gauge-text">{metrics.healthPercentage}% of catalogue</span>
          </div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div
          className={`ih-kpi-card ${metrics.lowStockCount > 0 ? 'alert-warning' : ''}`}
          onClick={() => setStockFilter('low')}
        >
          <div className="ih-kpi-top">
            <span className="ih-kpi-lbl">Low Stock Alerts</span>
            <div className="ih-kpi-icon amber">
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="ih-kpi-val text-amber">{metrics.lowStockCount}</div>
          <span className="ih-kpi-sub">
            {metrics.lowStockCount === 0 ? 'No low stock warnings' : 'SKUs at or below reorder threshold'}
          </span>
        </div>

        {/* Card 4: Depleted / Out of Stock */}
        <div
          className={`ih-kpi-card ${metrics.outOfStockCount > 0 ? 'alert-danger' : ''}`}
          onClick={() => setStockFilter('out')}
        >
          <div className="ih-kpi-top">
            <span className="ih-kpi-lbl">Depleted / Stockout</span>
            <div className="ih-kpi-icon red">
              <XCircle size={17} />
            </div>
          </div>
          <div className="ih-kpi-val text-red">{metrics.outOfStockCount}</div>
          <span className="ih-kpi-sub">
            {metrics.outOfStockCount === 0 ? 'All SKUs currently available' : 'Immediate replenishment needed'}
          </span>
        </div>
      </div>

      {/* ─── FILTER & SEARCH BAR ─── */}
      <div className="ih-filter-bar">
        <div className="ih-filter-tabs">
          <button
            className={`ih-ft-btn ${stockFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStockFilter('all')}
          >
            All Products ({products.length})
          </button>
          <button
            className={`ih-ft-btn ${stockFilter === 'low' ? 'active' : ''}`}
            onClick={() => setStockFilter('low')}
          >
            ⚠️ Low Stock ({metrics.lowStockCount})
          </button>
          <button
            className={`ih-ft-btn ${stockFilter === 'out' ? 'active' : ''}`}
            onClick={() => setStockFilter('out')}
          >
            🔴 Out of Stock ({metrics.outOfStockCount})
          </button>
          <button
            className={`ih-ft-btn ${stockFilter === 'healthy' ? 'active' : ''}`}
            onClick={() => setStockFilter('healthy')}
          >
            ✅ Healthy ({metrics.healthyCount})
          </button>
        </div>

        <div className="ih-search-wrap">
          <Search size={15} className="ih-search-icon" />
          <input
            type="text"
            className="ih-search-input"
            placeholder="Filter by product name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="ih-search-clear" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ─── INVENTORY TABLE ─── */}
      {loading ? (
        <div className="ih-loading-state">
          <div className="ih-spinner" />
          <p>Evaluating warehouse inventory health &amp; safety reserves...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="ih-empty-state">
          <Package size={36} />
          <h4>No Products Match Filter</h4>
          <p>Try clearing your search query or selecting a different stock status filter.</p>
          <button className="ih-btn-reset-filter" onClick={() => { setSearch(''); setStockFilter('all'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="ih-table-card">
          <div className="ih-table-wrap">
            <table className="ih-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Stock Breakdown</th>
                  <th>Available Stock</th>
                  <th>Alert Threshold</th>
                  <th>Quick Restock Stepper</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const phys = prod.inventory?.physicalStock || 0;
                  const res = prod.inventory?.reservedStock || 0;
                  const avail = phys - res;
                  const thresh = prod.inventory?.lowStockThreshold ?? 5;

                  const isStockout = avail <= 0;
                  const isAtRisk = avail > 0 && avail <= thresh;
                  const isWarning = avail > thresh && avail <= thresh + 3;

                  const rowClass = isStockout ? 'ih-row-stockout' : isAtRisk ? 'ih-row-at-risk' : isWarning ? 'ih-row-warning' : '';
                  const statusPillClass = isStockout ? 'stockout' : isAtRisk ? 'low' : isWarning ? 'warning' : 'healthy';

                  const isEditing = editingId === prod._id;
                  const isUpdating = updatingId === prod._id;

                  // Gauge bar percentage
                  const availPercent = phys > 0 ? Math.max(0, Math.min(100, Math.round((avail / phys) * 100))) : 0;

                  return (
                    <tr key={prod._id} className={rowClass}>
                      {/* 1. Product Details */}
                      <td>
                        <div className="ih-prod-cell">
                          {prod.images?.[0]?.url ? (
                            <img src={prod.images[0].url} alt={prod.name} className="ih-prod-thumb" />
                          ) : (
                            <div className="ih-prod-placeholder">
                              <Package size={18} />
                            </div>
                          )}
                          <div className="ih-prod-info">
                            <strong className="ih-prod-name">{prod.name}</strong>
                            <div className="ih-prod-sub">
                              {prod.category && <span className="ih-cat-badge">{prod.category}</span>}
                              {prod.origin && <span className="ih-origin-text">📍 {prod.origin}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Stock Breakdown (Physical vs Reserved) */}
                      <td>
                        <div className="ih-breakdown-cell">
                          <div className="ih-mini-bar-wrap">
                            <div className="ih-mini-bar">
                              <div
                                className={`ih-mini-fill ${statusPillClass}`}
                                style={{ width: `${availPercent}%` }}
                              />
                            </div>
                            <span className="ih-mini-pct">{availPercent}% available</span>
                          </div>

                          <div className="ih-stock-numbers">
                            <span>Physical: <strong>{phys}</strong></span>
                            <span className="ih-res-num">Reserved: <strong>{res}</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Available Stock */}
                      <td>
                        <span className={`ih-status-pill ${statusPillClass}`}>
                          {isStockout && <span className="ih-dot red" />}
                          {isAtRisk && <span className="ih-dot amber" />}
                          {isWarning && <span className="ih-dot yellow" />}
                          {!isStockout && !isAtRisk && !isWarning && <span className="ih-dot green" />}
                          <strong>{avail} units</strong>
                          <span className="ih-pill-sub">
                            {isStockout ? 'Depleted' : isAtRisk ? 'Low Stock' : isWarning ? 'Reorder Soon' : 'Healthy'}
                          </span>
                        </span>
                      </td>

                      {/* 4. Threshold */}
                      <td>
                        {isEditing ? (
                          <div className="ih-inline-input-wrap">
                            <label>Threshold:</label>
                            <input
                              type="number"
                              min="0"
                              className="ih-inline-input small"
                              value={editForm.lowStockThreshold}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  lowStockThreshold: parseInt(e.target.value) || 0
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="ih-thresh-cell" onClick={() => hasWritePerm && handleEditClick(prod)}>
                            <span className="ih-thresh-val">{thresh} units</span>
                            <span className="ih-thresh-lbl">warning level</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Quick Restock Stepper */}
                      <td>
                        {isEditing ? (
                          <div className="ih-inline-input-wrap">
                            <label>Set Physical:</label>
                            <input
                              type="number"
                              min="0"
                              className="ih-inline-input"
                              value={editForm.physicalStock}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  physicalStock: parseInt(e.target.value) || 0
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="ih-stepper-row">
                            <button
                              type="button"
                              className="ih-step-btn add"
                              onClick={() => handleQuickAdjust(prod._id, 5)}
                              disabled={isUpdating}
                              title="Add 5 units to physical stock"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              className="ih-step-btn add"
                              onClick={() => handleQuickAdjust(prod._id, 10)}
                              disabled={isUpdating}
                              title="Add 10 units to physical stock"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              className="ih-step-btn add"
                              onClick={() => handleQuickAdjust(prod._id, 25)}
                              disabled={isUpdating}
                              title="Add 25 units to physical stock"
                            >
                              +25
                            </button>
                            {phys > 0 && (
                              <button
                                type="button"
                                className="ih-step-btn sub"
                                onClick={() => handleQuickAdjust(prod._id, -1)}
                                disabled={isUpdating}
                                title="Reduce physical stock by 1"
                              >
                                -1
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td>
                        {isEditing ? (
                          <div className="ih-edit-actions">
                            <button
                              type="button"
                              className="ih-btn-save"
                              onClick={() => handleSave(prod._id)}
                              disabled={isUpdating}
                            >
                              <Check size={13} />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              className="ih-btn-cancel"
                              onClick={() => setEditingId(null)}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          hasWritePerm && (
                            <button
                              type="button"
                              className="ih-btn-edit"
                              onClick={() => handleEditClick(prod)}
                              title="Configure exact stock & threshold"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryHealth;

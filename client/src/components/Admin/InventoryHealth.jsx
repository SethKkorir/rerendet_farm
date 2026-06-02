// client/src/components/Admin/InventoryHealth.jsx - REAL-TIME FORECASTS (GAP 2)
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { can } from '../../utils/permissions';
import { FaHeartbeat, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import './InventoryHealth.css';

export const InventoryHealth = () => {
  const { user, token, showAlert } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ physicalStock: 0, lowStockThreshold: 5 });

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/products?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Sort lowest available stock at top
        const sorted = (data.data.products || []).sort((a, b) => {
          const availA = a.inventory.physicalStock - a.inventory.reservedStock;
          const availB = b.inventory.physicalStock - b.inventory.reservedStock;
          return availA - availB;
        });
        setProducts(sorted);
      }
    } catch (err) {
      console.error('Failed to load inventory health matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleEditClick = (prod) => {
    setEditingId(prod._id);
    setEditForm({
      physicalStock: prod.inventory.physicalStock,
      lowStockThreshold: prod.inventory.lowStockThreshold || 5
    });
  };

  const handleSave = async (id) => {
    try {
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
        fetchProducts();
      } else {
        showAlert(data.message, 'error');
      }
    } catch (err) {
      showAlert('Failed to update inventory', 'error');
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const role = user?.role || 'fulfillment_staff';
  const hasWritePerm = can(role, 'inventory.write');

  return (
    <div className="inventory-health-container">
      <div className="inventory-health-header">
        <h2>Inventory Health Matrix</h2>
        <p>Sorted by lowest available stock first. Protect reserves, config warning thresholds.</p>
      </div>

      <div className="ih-filter-bar">
        <input
          type="text"
          className="ih-search"
          placeholder="Filter by product name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div>Total products listed: {filtered.length}</div>
      </div>

      {loading ? (
        <div className="ih-table-wrapper" style={{ padding: '2rem', textAlign: 'center' }}>
          Loading products...
        </div>
      ) : filtered.length === 0 ? (
        <div className="ih-table-wrapper" style={{ padding: '2rem', textAlign: 'center' }}>
          No products match filter search.
        </div>
      ) : (
        <div className="ih-table-wrapper">
          <table className="ih-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Physical Stock</th>
                <th>Reserved Stock</th>
                <th>Available Stock</th>
                <th>Threshold</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(prod => {
                const avail = prod.inventory.physicalStock - prod.inventory.reservedStock;
                const thresh = prod.inventory.lowStockThreshold || 5;
                
                const isAtRisk = avail <= thresh;
                const isWarning = avail <= thresh + 3 && avail > thresh;

                const rowClass = isAtRisk ? 'ih-row-at-risk' : isWarning ? 'ih-row-warning' : '';
                const badgeClass = isAtRisk ? 'red' : isWarning ? 'amber' : 'green';

                const isEditing = editingId === prod._id;

                return (
                  <tr key={prod._id} className={rowClass}>
                    <td><strong>{prod.name}</strong></td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          className="ih-inline-input"
                          value={editForm.physicalStock}
                          onChange={e => setEditForm({ ...editForm, physicalStock: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        prod.inventory.physicalStock
                      )}
                    </td>
                    <td>{prod.inventory.reservedStock || 0}</td>
                    <td>
                      <span className={`stock-num-badge ${badgeClass}`}>
                        {avail}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          className="ih-inline-input"
                          value={editForm.lowStockThreshold}
                          onChange={e => setEditForm({ ...editForm, lowStockThreshold: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        thresh
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="ih-inline-edit">
                          <button className="ih-save-btn" onClick={() => handleSave(prod._id)}>
                            <FaCheck /> Save
                          </button>
                          <button className="ih-cancel-btn" onClick={() => setEditingId(null)}>
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        hasWritePerm && (
                          <button className="ih-edit-btn" onClick={() => handleEditClick(prod)}>
                            <FaEdit /> Edit Stock
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
      )}
    </div>
  );
};

export default InventoryHealth;

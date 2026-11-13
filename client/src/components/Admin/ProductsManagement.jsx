// components/Admin/ProductsManagement.jsx — Verified Multi-Step Coffee Management
import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaBox, FaUpload,
  FaTimes, FaTag, FaStar, FaCoffee, FaLeaf,
  FaGlobe, FaLayerGroup, FaBoxOpen, FaBell, FaCheckCircle,
  FaTools, FaShoppingBag, FaGift, FaCheck, FaCog, FaEye, FaEyeSlash,
  FaHeartbeat, FaThLarge, FaListUl, FaFire, FaArrowLeft, FaArrowRight
} from 'react-icons/fa';
import './ProductsManagement.css';
import API, { tokenStore, updateProductStock } from '../../api/api';
import InventoryHealth from './InventoryHealth';

/* ─── Strictly the 4 Store Roast Options ─────────────────────────── */
export const ROAST_LEVELS = [
  { value: 'light-roast', label: 'Light Roast', color: '#e8c99a', emoji: '☀️', desc: 'Bright, delicate & floral notes' },
  { value: 'medium-roast', label: 'Medium Roast', color: '#a0672e', emoji: '⛅', desc: 'Balanced, smooth with sweet caramel' },
  { value: 'medium-to-dark-roast', label: 'Medium to Dark Roast', color: '#7a421a', emoji: '🍂', desc: 'Rich body with hints of cocoa & spice' },
  { value: 'dark-roast', label: 'Dark Roast', color: '#4a2010', emoji: '☕', desc: 'Bold, deep & smoky chocolate notes' },
];

// Built-in primary store category
const DEFAULT_CATEGORIES = [
  { value: 'coffee-beans', slug: 'coffee-beans', label: 'Coffee Beans', icon: '☕', color: '#D4AF37' },
];

// Category-specific configurations
const CATEGORY_CONFIG = {
  'coffee-beans': {
    label: 'Coffee Beans',
    detailsTab: '☕ Variety & Details',
    hasRoast: true,
    hasOrigin: true,
    hasFlavors: true,
    sizeOptions: ['250g', '500g', '1kg', '2kg', '5kg Bag'],
    sizeDefault: '250g',
    sizePlaceholder: 'e.g., 250g, 500g, 1kg',
    detailsHint: 'Select variety/roast level, origin, and grind options for this coffee.',
  }
};

const DEFAULT_CATEGORY_CONFIG = {
  detailsTab: '📋 Product Details',
  hasRoast: true,
  hasOrigin: true,
  hasFlavors: true,
  sizeOptions: ['250g', '500g', '1kg', '2kg'],
  sizeDefault: '250g',
  sizePlaceholder: 'e.g., 250g, 500g, 1kg',
  detailsHint: 'Add variety, roast, origin, and pricing details.',
};

const getCategoryConfig = (cat) => CATEGORY_CONFIG[cat] || DEFAULT_CATEGORY_CONFIG;

/* ─── Main Component ─────────────────────────────────────────── */
const ProductsManagement = () => {
  const { showAlert, token } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [mainTab, setMainTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'inventory' || params.get('tab') === 'health' ? 'inventory' : 'catalogue';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'inventory' || tabParam === 'health') {
      setMainTab('inventory');
    } else if (!tabParam) {
      setMainTab('catalogue');
    }
  }, [location.search]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({ category: 'all', search: '', page: 1, limit: 12 });
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  // Database categories fetched from the backend
  const [categoriesList, setCategoriesList] = useState([]);
  // Hidden category values
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm_hidden_categories') || '[]'); }
    catch { return []; }
  });
  const [showCatManager, setShowCatManager] = useState(false);

  const getToken = useCallback(() => {
    if (token) return token;
    const fromStore = tokenStore.get();
    if (fromStore) return fromStore;
    try { return JSON.parse(localStorage.getItem('auth'))?.token; } catch { return null; }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await API.get('/admin/categories');
      if (res.data?.success) {
        setCategoriesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Store categories (Default Coffee Beans + DB custom)
  const allCategories = useMemo(() => {
    const defaults = [
      { value: 'coffee-beans', slug: 'coffee-beans', label: 'Coffee Beans', icon: '☕', color: '#D4AF37' }
    ];

    const custom = categoriesList.map(c => ({
      value: c._id,
      slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
      label: c.name,
      icon: c.icon || '☕',
      color: '#D4AF37',
      attributeSchema: c.attributeSchema,
      isCustom: true
    }));

    const combined = [...defaults];
    custom.forEach(c => {
      const idx = combined.findIndex(d => d.value === c.value || d.slug === c.slug);
      if (idx !== -1) combined[idx] = c;
      else combined.push(c);
    });
    return combined;
  }, [categoriesList]);

  const visibleCategories = useMemo(() => {
    return allCategories.filter(c => !hiddenCategories.includes(c.value));
  }, [allCategories, hiddenCategories]);

  const getCatLabel = (val) => {
    if (!val) return 'Coffee Beans';
    const catId = val?._id || val?.slug || val?.name || val;
    const found = allCategories.find(c =>
      c.value === catId ||
      c.slug === catId ||
      c.label?.toLowerCase() === String(catId).toLowerCase()
    );
    if (found) return found.label;
    return String(catId).replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCatIcon = (val) => {
    const catId = val?._id || val?.slug || val?.name || val;
    const found = allCategories.find(c =>
      c.value === catId ||
      c.slug === catId ||
      c.label?.toLowerCase() === String(catId).toLowerCase()
    );
    return found?.icon || '☕';
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/products', { params: filters });
      if (res.data?.success) {
        setProducts(res.data.data.products || []);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
      showAlert('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await API.delete(`/admin/products/${productId}`);
      showAlert('Product deleted', 'success');
      fetchProducts();
    } catch (err) {
      console.error('Delete product error:', err);
      showAlert('Failed to delete product', 'error');
    }
  };

  const handleQuickStockUpdate = async (productId, adjustment) => {
    try {
      const { data } = await updateProductStock(productId, { mode: 'adjust', adjustment });
      if (data.success) {
        setProducts(prev => prev.map(p => p._id === productId ? { ...p, inventory: { ...p.inventory, stock: data.data.stock } } : p));
      }
    } catch (err) {
      console.error('Quick stock update failed:', err);
      showAlert('Failed to update stock', 'error');
    }
  };

  const handleSelectProduct = (id) =>
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleBulkDelete = async () => {
    if (!selectedProducts.length || !window.confirm(`Delete ${selectedProducts.length} products?`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedProducts.map(id => API.delete(`/admin/products/${id}`)));
      showAlert(`${selectedProducts.length} products deleted`, 'success');
      setSelectedProducts([]);
      fetchProducts();
    } catch (err) {
      console.error('Bulk delete error:', err);
      showAlert('Failed to delete some products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    const name = window.prompt('Enter new category name:');
    if (!name?.trim()) return;
    const label = name.trim();
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (allCategories.find(c => c.value === value || c.label.toLowerCase() === label.toLowerCase())) {
      showAlert('This category already exists', 'error');
      return;
    }
    try {
      const res = await API.post('/admin/categories', {
        name: label,
        icon: '☕',
        description: label
      });
      if (res.data?.success) {
        showAlert(`Category "${label}" added`, 'success');
        fetchCategories();
      } else {
        showAlert(res.data?.message || 'Failed to add category', 'error');
      }
    } catch (err) {
      console.error('Add category error:', err);
      showAlert(err.response?.data?.message || 'Failed to add category', 'error');
    }
  };

  const handleToggleHide = (value) => {
    const next = hiddenCategories.includes(value)
      ? hiddenCategories.filter(v => v !== value)
      : [...hiddenCategories, value];
    setHiddenCategories(next);
    localStorage.setItem('pm_hidden_categories', JSON.stringify(next));
    if (next.includes(filters.category)) setFilters(p => ({ ...p, category: 'all' }));
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.label}"? Products in this category won't be deleted.`)) return;
    try {
      const res = await API.delete(`/admin/categories/${cat.value}`);
      if (res.data?.success) {
        showAlert(`Category "${cat.label}" deleted`, 'success');
        fetchCategories();
      } else {
        showAlert(res.data?.message || 'Failed to delete category', 'error');
      }
    } catch (err) {
      console.error('Delete category error:', err);
      showAlert(err.response?.data?.message || 'Failed to delete category', 'error');
    }
  };

  // Executive inventory stats for the Catalogue first-face dashboard
  const totalProducts = products.length;
  const inStockCount = products.filter(p => {
    const avail = (p.inventory?.physicalStock || 0) - (p.inventory?.reservedStock || 0);
    const threshold = p.inventory?.lowStockThreshold || 5;
    return avail > threshold;
  }).length;
  const lowStockCount = products.filter(p => {
    const avail = (p.inventory?.physicalStock || 0) - (p.inventory?.reservedStock || 0);
    const threshold = p.inventory?.lowStockThreshold || 5;
    return avail <= threshold;
  }).length;
  const featuredCount = products.filter(p => p.isFeatured).length;

  return (
    <div className="products-management">
      {/* ── Sub-Nav: Catalogue vs Inventory Health ── */}
      <div className="pm-subnav-bar">
        <button
          type="button"
          className={`pm-subnav-tab ${mainTab === 'catalogue' ? 'active' : ''}`}
          onClick={() => {
            setMainTab('catalogue');
            navigate('/admin/products', { replace: true });
          }}
        >
          <FaBox /> Product Catalogue
        </button>
        <button
          type="button"
          className={`pm-subnav-tab ${mainTab === 'inventory' ? 'active' : ''}`}
          onClick={() => {
            setMainTab('inventory');
            navigate('/admin/products?tab=inventory', { replace: true });
          }}
        >
          <FaHeartbeat /> Inventory Health &amp; Forecasting
        </button>
      </div>

      {mainTab === 'inventory' ? (
        <InventoryHealth />
      ) : (
        <>
          {/* ── Executive Inventory KPI Metric Cards ── */}
          <div className="pm-stats-row">
            <div className="pm-stat-card">
              <div className="pm-stat-icon" style={{ background: 'rgba(212, 175, 55, 0.12)', color: '#D4AF37' }}>
                <FaBox />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-value">{loading ? '—' : totalProducts}</span>
                <span className="pm-stat-label">Total Products</span>
              </div>
            </div>

            <div className="pm-stat-card">
              <div className="pm-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
                <FaCheckCircle />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-value">{loading ? '—' : inStockCount}</span>
                <span className="pm-stat-label">Healthy Stock</span>
              </div>
            </div>

            <div className="pm-stat-card">
              <div className="pm-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
                <FaBell />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-value">{loading ? '—' : lowStockCount}</span>
                <span className="pm-stat-label">Low / Out of Stock</span>
              </div>
            </div>

            <div className="pm-stat-card">
              <div className="pm-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
                <FaStar />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-value">{loading ? '—' : featuredCount}</span>
                <span className="pm-stat-label">Featured Roasts</span>
              </div>
            </div>
          </div>

          {/* ── Header ── */}
          <div className="pm-header">
            <div>
              <h1 className="pm-title">Product Catalogue</h1>
              <p className="pm-subtitle">{products.length} products active across {visibleCategories.length} categories</p>
            </div>
            <div className="pm-header-actions">
              <div className="view-toggle">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <FaThLarge /> Grid
                </button>
                <button
                  type="button"
                  className={viewMode === 'table' ? 'active' : ''}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <FaListUl /> Table
                </button>
              </div>
              <button
                type="button"
                className="btn-add-product"
                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
              >
                <FaPlus /> Add Product
              </button>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="pm-filters">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products by name, origin, or SKU..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
              />
              {filters.search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setFilters(p => ({ ...p, search: '', page: 1 }))}
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <div className="category-pills">
              {[{ value: 'all', label: 'All Products', icon: '🗂️' }, ...visibleCategories].map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`cat-pill ${filters.category === cat.value ? 'active' : ''}`}
                  onClick={() => setFilters(p => ({ ...p, category: cat.value, page: 1 }))}
                >
                  <span className="cat-pill-icon">{cat.icon}</span> {cat.label}
                </button>
              ))}
              <div className="cat-pills-divider" />
              <button
                type="button"
                className="cat-pill cat-pill-add"
                onClick={handleAddCategory}
                title="Add new category"
              >
                <FaPlus /> New Category
              </button>
              <button
                type="button"
                className="cat-pill cat-pill-manage"
                onClick={() => setShowCatManager(true)}
                title="Manage categories: hide or delete"
              >
                <FaCog /> Manage
                {hiddenCategories.length > 0 && <span className="cat-manage-badge">{hiddenCategories.length}</span>}
              </button>
            </div>
          </div>

      {/* ── Category Manager Modal ── */}
      <AnimatePresence>
        {showCatManager && (
          <CategoryManager
            allCategories={allCategories}
            hiddenCategories={hiddenCategories}
            onToggleHide={handleToggleHide}
            onDeleteCategory={handleDeleteCategory}
            onAddCategory={handleAddCategory}
            onClose={() => setShowCatManager(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div className="bulk-bar" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <span>{selectedProducts.length} selected</span>
            <button className="btn-bulk-delete" onClick={handleBulkDelete}><FaTrash /> Delete Selected</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Product Grid / Table ── */}
      {loading ? (
        <div className="pm-loading"><div className="pm-spinner" /><p>Loading products…</p></div>
      ) : products.length === 0 ? (
        <div className="pm-empty">
          <FaBox className="empty-icon" />
          <h3>No products yet</h3>
          <p>Start building your catalogue</p>
          <button className="btn-add-product" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
            <FaPlus /> Add First Product
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="product-grid">
          {products.map((product, i) => {
            const avail = (product.inventory?.physicalStock || 0) - (product.inventory?.reservedStock || 0);
            const threshold = product.inventory?.lowStockThreshold || 5;
            const isLow = avail <= threshold && avail > 0;
            const isOut = avail <= 0;

            return (
              <motion.div key={product._id}
                className={`product-card ${selectedProducts.includes(product._id) ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="card-select">
                  <input type="checkbox" checked={selectedProducts.includes(product._id)}
                    onChange={() => handleSelectProduct(product._id)} />
                </div>

                {/* ── Media Header with Discount Badge ── */}
                <div className="card-image">
                  {product.discountBadge && (
                    <div className="pm-card-badges-wrap">
                      <span className="pm-badge discount"><FaFire /> {product.discountBadge}</span>
                    </div>
                  )}

                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.name} className="pm-card-img" />
                  ) : (
                    <div className="pm-placeholder-inner">
                      <span className="pm-placeholder-icon">{getCatIcon(product.categoryId || product.category)}</span>
                    </div>
                  )}
                </div>

                {/* ── Card Body ── */}
                <div className="card-body">
                  <div className="pm-card-meta-line">
                    <span className="pm-card-cat-chip">
                      {getCatIcon(product.categoryId || product.category)} {getCatLabel(product.categoryId || product.category)}
                    </span>
                    {product.origin && (
                      <span className="pm-card-origin-chip">
                        <FaGlobe /> {product.origin}
                      </span>
                    )}
                  </div>

                  <h4 className="card-name" title={product.name}>{product.name}</h4>

                  {/* Sizes and prices */}
                  <div className="card-prices">
                    {product.sizes?.map((s, idx) => {
                      const hasDiscount = s.originalPrice && Number(s.originalPrice) > Number(s.price);
                      const discountPct = hasDiscount ? Math.round(((Number(s.originalPrice) - Number(s.price)) / Number(s.originalPrice)) * 100) : 0;
                      return (
                        <span key={idx} className="size-chip">
                          <span className="size-chip-name">{s.size}</span>
                          {hasDiscount && (
                            <s className="pm-orig-price-strike">KES {Number(s.originalPrice).toLocaleString()}</s>
                          )}
                          <strong className="pm-size-val">KES {Number(s.price).toLocaleString()}</strong>
                          {hasDiscount && (
                            <span className="pm-sale-tag">-{discountPct}%</span>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  {product.flavorNotes?.length > 0 && (
                    <div className="flavor-pills">
                      {product.flavorNotes.slice(0, 3).map((note, idx) => <span key={idx} className="flavor-pill">{note}</span>)}
                    </div>
                  )}

                  {/* Stock Status & Stepper Strip */}
                  <div className="card-footer" onClick={e => e.stopPropagation()}>
                    <div className="pm-stock-header-line">
                      <span className={`pm-stock-status-pill ${isOut ? 'out' : isLow ? 'low' : 'ok'}`}>
                        <span className="pm-stock-dot" />
                        {isOut ? 'Out of Stock' : isLow ? `Low Stock (${avail})` : `In Stock (${avail})`}
                      </span>
                      <span className="pm-stock-detail-counts">
                        Phys: <strong>{product.inventory?.physicalStock || 0}</strong> · Res: <strong>{product.inventory?.reservedStock || 0}</strong>
                      </span>
                    </div>

                    <div className="pm-card-controls-bar">
                      <div className="pm-restock-group">
                        <span className="pm-restock-label">Restock:</span>
                        <button
                          type="button"
                          className="btn-quick-adjust"
                          title="Restock +5 units"
                          onClick={() => handleQuickStockUpdate(product._id, 5)}
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          className="btn-quick-adjust"
                          title="Restock +10 units"
                          onClick={() => handleQuickStockUpdate(product._id, 10)}
                        >
                          +10
                        </button>
                      </div>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn-card-action edit"
                          title="Edit Product"
                          onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="btn-card-action delete"
                          title="Delete Product"
                          onClick={() => handleDeleteProduct(product._id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    onChange={e => setSelectedProducts(e.target.checked ? products.map(p => p._id) : [])}
                    checked={products.length > 0 && selectedProducts.length === products.length}
                  />
                </th>
                <th>Product</th>
                <th>Price Range</th>
                <th>Inventory Stock</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const avail = (product.inventory?.physicalStock || 0) - (product.inventory?.reservedStock || 0);
                const threshold = product.inventory?.lowStockThreshold || 5;
                const isLow = avail <= threshold && avail > 0;
                const isOut = avail <= 0;

                return (
                  <tr key={product._id} className={`product-row ${selectedProducts.includes(product._id) ? 'selected' : ''}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                      />
                    </td>
                    <td>
                      <div className="table-product-info">
                        {product.images?.[0] ? (
                          <img src={product.images[0].url} alt={product.name} className="table-thumb" />
                        ) : (
                          <div className="table-thumb placeholder">
                            {getCatIcon(product.categoryId || product.category)}
                          </div>
                        )}
                        <div className="table-name-wrap">
                          <strong className="table-product-title">{product.name}</strong>
                          <div className="table-badges-line">
                            {product.origin && <span className="table-sub-origin"><FaGlobe /> {product.origin}</span>}
                            {product.discountBadge && <span className="table-badge discount"><FaFire /> {product.discountBadge}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="price-col">
                      {product.sizes?.[0]?.originalPrice && Number(product.sizes[0].originalPrice) > Number(product.sizes[0].price) && (
                        <div className="table-orig-price">
                          <s>KES {Number(product.sizes[0].originalPrice).toLocaleString()}</s>
                        </div>
                      )}
                      <strong>KES {product.sizes?.[0]?.price?.toLocaleString() || '—'}</strong>
                      {product.sizes?.length > 1 && (
                        <span className="price-sizes-count">({product.sizes.length} sizes)</span>
                      )}
                    </td>
                    <td>
                      <div className="table-stock-cell">
                        <span className={`pm-stock-status-pill ${isOut ? 'out' : isLow ? 'low' : 'ok'}`}>
                          <span className="pm-stock-dot" />
                          {isOut ? 'Out of Stock' : isLow ? `Low (${avail})` : `${avail} Available`}
                        </span>
                        <span className="table-stock-detail">
                          Phys: {product.inventory?.physicalStock || 0} • Res: {product.inventory?.reservedStock || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="table-cat-pill">
                        {getCatLabel(product.categoryId || product.category)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-card-action edit"
                          title="Edit"
                          onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="btn-card-action delete"
                          title="Delete"
                          onClick={() => handleDeleteProduct(product._id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      <AnimatePresence>
        {showProductModal && (
          <ProductModal
            product={editingProduct}
            onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
            onSave={fetchProducts}
            getToken={getToken}
            allCategories={allCategories}
            onAddCategory={handleAddCategory}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Product Modal — Strict 4-Variety Step-by-Step Flow ────── */
const ProductModal = ({ product, onClose, onSave, allCategories, onAddCategory }) => {
  const { showAlert } = useContext(AppContext);
  const [activeSection, setActiveSection] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flavorInput, setFlavorInput] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sizes: (product?.sizes && product.sizes.length > 0)
      ? product.sizes.map(s => ({
          size: s.size || '250g',
          price: s.price ?? '',
          originalPrice: s.originalPrice ?? ''
        }))
      : [{ size: '250g', price: '', originalPrice: '' }],
    category: product?.categoryId?._id || product?.categoryId || product?.category || (allCategories[0]?.value || 'coffee-beans'),
    categoryAttributes: product?.categoryAttributes || {},
    roastLevel: product?.roastLevel || 'Medium Roast',
    origin: product?.origin || 'Bomet County, Kenya',
    flavorNotes: product?.flavorNotes || [],
    badge: product?.badge || '',
    discountBadge: product?.discountBadge || '',
    inventory: {
      physicalStock: product?.inventory?.physicalStock !== undefined ? product.inventory.physicalStock : 50,
      lowStockThreshold: product?.inventory?.lowStockThreshold !== undefined ? product.inventory.lowStockThreshold : 5,
    },
    grindOptions: (product?.grindOptions && product.grindOptions.length > 0)
      ? product.grindOptions
      : ['Beans', 'Ground'],
    defaultGrind: product?.defaultGrind || 'Beans',
    tags: product?.tags?.join(', ') || '',
    isFeatured: product?.isFeatured || false,
  });

  const [images, setImages] = useState(product?.images || []);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const STEPS = [
    { id: 'basic', num: 1, label: 'Basic Info', icon: '🏷️' },
    { id: 'pricing', num: 2, label: 'Sizes & Pricing', icon: '💰' },
    { id: 'details', num: 3, label: 'Variety & Roast', icon: '☕' },
    { id: 'media', num: 4, label: 'Images', icon: '🖼️' },
    { id: 'stock', num: 5, label: 'Inventory', icon: '📦' },
  ];

  const updateRoastLevel = (val) => {
    setFormData(prev => ({
      ...prev,
      roastLevel: val,
      categoryAttributes: {
        ...(prev.categoryAttributes || {}),
        roastLevel: (val || '').toLowerCase()
      }
    }));
  };

  const updateOrigin = (val) => {
    setFormData(prev => ({
      ...prev,
      origin: val,
      categoryAttributes: {
        ...(prev.categoryAttributes || {}),
        origin: val
      }
    }));
  };

  const toggleGrindOption = (grind) => {
    const current = Array.isArray(formData.grindOptions) ? formData.grindOptions : [];
    let updated;
    if (current.includes(grind)) {
      if (current.length === 1) {
        showAlert('At least one grind profile must remain selected.', 'warning');
        return;
      }
      updated = current.filter(g => g !== grind);
    } else {
      updated = [...current, grind];
    }
    set('grindOptions', updated);
    if (!updated.includes(formData.defaultGrind)) {
      set('defaultGrind', updated[0] || 'Beans');
    }
  };

  const selectAllGrinds = () => {
    set('grindOptions', ['Beans', 'Ground']);
  };

  const selectBeansOnly = () => {
    set('grindOptions', ['Beans']);
    set('defaultGrind', 'Beans');
  };

  // Quick 4-variety presets matching Rerendet coffee offerings
  const QUICK_TEMPLATES = [
    {
      label: 'Light Roast',
      variety: 'Light Roast',
      icon: '☀️',
      data: {
        name: 'Rerendet Light Roast',
        description: 'Bright and delicate roast with floral aromatics, crisp citrus sweetness, and a silky smooth finish.',
        sizes: [
          { size: '250g', price: 850, originalPrice: '' },
          { size: '500g', price: 1600, originalPrice: '' },
          { size: '1kg', price: 3000, originalPrice: '' }
        ],
        roastLevel: 'Light Roast',
        origin: 'Bomet County, Kenya',
        flavorNotes: ['Floral', 'Citrus', 'Honey Sweetness'],
        badge: 'Light Roast',
        tags: 'light-roast, arabica, single-origin, rerendet',
        inventory: { physicalStock: 50, lowStockThreshold: 10 },
        isFeatured: false
      }
    },
    {
      label: 'Medium Roast',
      variety: 'Medium Roast',
      icon: '⛅',
      data: {
        name: 'Rerendet Medium Roast',
        description: 'Single-origin specialty Arabica harvested in Bomet County, Kenya. Balanced notes of caramel, blackcurrant, and milk chocolate.',
        sizes: [
          { size: '250g', price: 750, originalPrice: '' },
          { size: '500g', price: 1450, originalPrice: '' },
          { size: '1kg', price: 2800, originalPrice: '' }
        ],
        roastLevel: 'Medium Roast',
        origin: 'Bomet County, Kenya',
        flavorNotes: ['Caramel', 'Blackcurrant', 'Chocolate'],
        badge: 'Classic Roast',
        tags: 'medium-roast, arabica, single-origin, rerendet',
        inventory: { physicalStock: 50, lowStockThreshold: 10 },
        isFeatured: true
      }
    },
    {
      label: 'Medium to Dark Roast',
      variety: 'Medium to Dark Roast',
      icon: '🍂',
      data: {
        name: 'Rerendet Medium to Dark Roast',
        description: 'Rich, full-bodied roast balancing smooth toffee sweetness with deep cocoa and roasted hazelnut.',
        sizes: [
          { size: '250g', price: 800, originalPrice: '' },
          { size: '500g', price: 1550, originalPrice: '' },
          { size: '1kg', price: 2950, originalPrice: '' }
        ],
        roastLevel: 'Medium to Dark Roast',
        origin: 'Bomet County, Kenya',
        flavorNotes: ['Toffee', 'Dark Chocolate', 'Hazelnut'],
        badge: 'Medium-Dark',
        tags: 'medium-dark-roast, arabica, single-origin, rerendet',
        inventory: { physicalStock: 50, lowStockThreshold: 10 },
        isFeatured: true
      }
    },
    {
      label: 'Dark Roast',
      variety: 'Dark Roast',
      icon: '☕',
      data: {
        name: 'Rerendet Dark Roast',
        description: 'Bold, intense dark roast with smoky dark chocolate depth, molasses richness, and a dense golden crema.',
        sizes: [
          { size: '250g', price: 900, originalPrice: '' },
          { size: '500g', price: 1700, originalPrice: '' },
          { size: '1kg', price: 3200, originalPrice: '' }
        ],
        roastLevel: 'Dark Roast',
        origin: 'Bomet County, Kenya',
        flavorNotes: ['Dark Chocolate', 'Molasses', 'Warm Spice'],
        badge: 'Bold Dark Roast',
        tags: 'dark-roast, espresso, bold, rerendet',
        inventory: { physicalStock: 45, lowStockThreshold: 10 },
        isFeatured: true
      }
    }
  ];

  const applyTemplate = (tpl) => {
    setFormData(prev => ({
      ...prev,
      ...tpl.data,
      category: prev.category || 'coffee-beans',
      categoryAttributes: {
        ...(prev.categoryAttributes || {}),
        roastLevel: (tpl.data.roastLevel || '').toLowerCase(),
        origin: tpl.data.origin || ''
      }
    }));
    showAlert(`Applied ${tpl.label} template!`, 'success');
  };

  const QUICK_SIZE_PILLS = ['250g', '500g', '1kg', '2kg', '5kg Bag'];

  const handleQuickAddSize = (sz) => {
    set('sizes', [...formData.sizes, { size: sz, price: '', originalPrice: '' }]);
  };

  /* ── Image handling ── */
  const processFiles = (files) => {
    const newImgs = Array.from(files).map(file => ({ url: URL.createObjectURL(file), file }));
    setImages(prev => [...prev, ...newImgs]);
  };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); };
  const removeImage = (index) => {
    const img = images[index];
    if (img.file) URL.revokeObjectURL(img.url);
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  /* ── Size handling ── */
  const addSize = () => set('sizes', [...formData.sizes, { size: '250g', price: '', originalPrice: '' }]);
  const removeSize = (i) => set('sizes', formData.sizes.filter((_, idx) => idx !== i));
  const updateSize = (i, field, value) => set('sizes', formData.sizes.map((s, idx) =>
    idx === i ? { ...s, [field]: value } : s
  ));

  /* ── Flavor tag handling ── */
  const addFlavor = (note) => {
    const t = note.trim();
    if (t && !formData.flavorNotes.includes(t)) set('flavorNotes', [...formData.flavorNotes, t]);
    setFlavorInput('');
  };
  const removeFlavor = (note) => set('flavorNotes', formData.flavorNotes.filter(n => n !== note));

  /* ── Step Validation (Strict Enforcers) ── */
  const validateStep = (stepId) => {
    if (stepId === 'basic') {
      if (!formData.name.trim()) {
        showAlert('Product name is required before proceeding.', 'error');
        document.getElementById('pm-name-input')?.focus();
        return false;
      }
      if (!formData.description.trim()) {
        showAlert('Product description is required before proceeding.', 'error');
        document.getElementById('pm-desc-input')?.focus();
        return false;
      }
      if (!formData.category) {
        showAlert('Please select a category before proceeding.', 'error');
        return false;
      }
      return true;
    }

    if (stepId === 'pricing') {
      if (!formData.sizes || formData.sizes.length === 0) {
        showAlert('At least one size/variant is required.', 'error');
        return false;
      }
      for (let i = 0; i < formData.sizes.length; i++) {
        const s = formData.sizes[i];
        if (!s.size || !String(s.size).trim()) {
          showAlert(`Variant #${i + 1} needs a size name (e.g. 250g, 500g, 1kg).`, 'error');
          return false;
        }
        const p = parseFloat(s.price);
        if (isNaN(p) || p <= 0) {
          showAlert(`Variant "${s.size}" needs a valid price greater than KES 0.`, 'error');
          return false;
        }
      }
      return true;
    }

    if (stepId === 'details') {
      if (!formData.roastLevel) {
        showAlert('Please select one of the 4 roast options: Light Roast, Medium Roast, Medium to Dark Roast, or Dark Roast.', 'error');
        return false;
      }
      return true;
    }

    if (stepId === 'stock') {
      const rawStock = formData.inventory.physicalStock;
      const stock = parseInt(rawStock, 10);
      if (rawStock === '' || rawStock === undefined || isNaN(stock) || stock < 0) {
        showAlert('Physical stock is required and must be a number ≥ 0.', 'error');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(activeSection)) return;
    const ids = STEPS.map(s => s.id);
    const idx = ids.indexOf(activeSection);
    if (idx < ids.length - 1) {
      setActiveSection(ids[idx + 1]);
    }
  };

  const handleBack = () => {
    const ids = STEPS.map(s => s.id);
    const idx = ids.indexOf(activeSection);
    if (idx > 0) {
      setActiveSection(ids[idx - 1]);
    }
  };

  const handleTabClick = (targetId) => {
    const ids = STEPS.map(s => s.id);
    const targetIdx = ids.indexOf(targetId);
    const currentIdx = ids.indexOf(activeSection);
    if (targetIdx > currentIdx) {
      for (let i = currentIdx; i < targetIdx; i++) {
        if (!validateStep(ids[i])) return;
      }
    }
    setActiveSection(targetId);
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    for (const step of STEPS) {
      if (!validateStep(step.id)) {
        setActiveSection(step.id);
        return;
      }
    }

    setSaving(true);
    try {
      const rawStock = formData.inventory.physicalStock;
      const stock = parseInt(rawStock, 10) || 0;

      const mergedCategoryAttributes = {
        ...(formData.categoryAttributes || {}),
        roastLevel: (formData.roastLevel || '').trim().toLowerCase(),
        origin: (formData.origin || '').trim(),
        packageWeight: formData.sizes?.[0]?.size || '250g'
      };

      const productPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sizes: formData.sizes.map(s => ({
          size: s.size.trim(),
          price: parseFloat(s.price),
          originalPrice: (s.originalPrice !== '' && parseFloat(s.originalPrice) > 0)
            ? parseFloat(s.originalPrice)
            : null
        })),
        categoryId: formData.category,
        categoryAttributes: mergedCategoryAttributes,
        badge: formData.badge ? formData.badge.trim() : '',
        discountBadge: formData.discountBadge ? formData.discountBadge.trim() : undefined,
        inventory: {
          physicalStock: stock,
          stock: stock,
          lowStockThreshold: parseInt(formData.inventory.lowStockThreshold, 10) || 5,
          lowStockAlert: parseInt(formData.inventory.lowStockThreshold, 10) || 5
        },
        stock: stock,
        roastLevel: formData.roastLevel ? formData.roastLevel.trim() : 'Medium Roast',
        origin: formData.origin ? formData.origin.trim() : 'Bomet County, Kenya',
        flavorNotes: Array.isArray(formData.flavorNotes) ? formData.flavorNotes : [],
        grindOptions: formData.grindOptions || ['Beans', 'Ground'],
        defaultGrind: formData.defaultGrind || 'Beans',
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isFeatured: formData.isFeatured
      };

      const filesToUpload = images.filter(img => img.file).map(img => img.file);
      const url = product ? `/admin/products/${product._id}` : '/admin/products';

      if (filesToUpload.length > 0) {
        const fd = new FormData();
        Object.entries(productPayload).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (typeof v === 'object' && !Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else fd.append(k, v);
        });
        filesToUpload.forEach(file => fd.append('images', file));
        if (product) {
          await API.put(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          await API.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else {
        if (product) {
          await API.put(url, productPayload);
        } else {
          await API.post(url, productPayload);
        }
      }

      showAlert(product ? 'Product updated successfully!' : 'Product created successfully!', 'success');
      onSave();
      onClose();
    } catch (err) {
      console.error('Save product error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save product';
      showAlert(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="pm-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="pm-modal pm-modal-clean"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pm-modal-header">
          <div className="pm-modal-title">
            <div className="pm-modal-icon" style={{ background: '#D4AF3722', color: '#D4AF37' }}>
              {product ? <FaEdit /> : <FaPlus />}
            </div>
            <div>
              <h2>{product ? 'Edit Coffee Product' : 'Add New Coffee Product'}</h2>
              <span className="pm-modal-subtitle">
                {product ? product.name : 'Create a new coffee offering for Rerendet Farm'}
              </span>
            </div>
          </div>
          <button className="pm-close-btn" onClick={onClose} title="Close"><FaTimes /></button>
        </div>

        {/* ── Modern Responsive Stepper (Mobile & Desktop) ── */}
        <div className="pm-stepper-wrap">
          {STEPS.map((s, idx) => {
            const isCurrent = activeSection === s.id;
            const isPassed = STEPS.findIndex(st => st.id === activeSection) > idx;
            return (
              <button
                key={s.id}
                type="button"
                className={`pm-stepper-step ${isCurrent ? 'active' : ''} ${isPassed ? 'completed' : ''}`}
                onClick={() => handleTabClick(s.id)}
              >
                <span className="pm-step-circle">{isPassed ? '✓' : s.num}</span>
                <span className="pm-step-label">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Presets for New Products */}
        {!product && (
          <div className="pm-tpl-strip">
            <span className="pm-tpl-label">⚡ 1-Click Variety Presets:</span>
            <div className="pm-tpl-chips">
              {QUICK_TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="pm-tpl-btn"
                  onClick={() => applyTemplate(tpl)}
                >
                  <span>{tpl.icon}</span>
                  <span>{tpl.label} ({tpl.variety})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="pm-modal-body-unified">
          <form className="pm-form-unified" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* ═══ STEP 1: BASIC INFO ═══ */}
              {activeSection === 'basic' && (
                <motion.div key="basic" className="pm-section" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <div className="pm-section-header">
                    <h3>🏷️ Step 1: Basic Information</h3>
                    <p className="pm-section-hint">Enter the coffee name, description, and storefront visibility.</p>
                  </div>

                  <div className="pm-field">
                    <label>Coffee Name <span className="req">*</span></label>
                    <input
                      id="pm-name-input"
                      type="text"
                      value={formData.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Rerendet AA Arabica Reserve"
                      required
                    />
                  </div>

                  <div className="pm-field">
                    <label>Description &amp; Origin Notes <span className="req">*</span></label>
                    <textarea
                      id="pm-desc-input"
                      value={formData.description}
                      onChange={e => set('description', e.target.value)}
                      rows={4}
                      placeholder="Describe the aroma, volcanic terroir, processing, and tasting profile..."
                      required
                    />
                  </div>

                  <div className="pm-row">
                    <div className="pm-field">
                      <label>Store Category <span className="req">*</span></label>
                      <select
                        value={formData.category}
                        onChange={e => set('category', e.target.value)}
                        className="pm-select-styled"
                      >
                        {allCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pm-field">
                      <label>Highlight Badge <span className="hint">(Optional)</span></label>
                      <input
                        type="text"
                        value={formData.badge}
                        onChange={e => set('badge', e.target.value)}
                        placeholder="e.g. Top Harvest, Best Seller, Limited Lot"
                      />
                    </div>
                  </div>

                  <div className="pm-featured-box">
                    <label className="pm-featured-toggle">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={e => set('isFeatured', e.target.checked)}
                      />
                      <FaStar className={formData.isFeatured ? 'gold-star' : ''} />
                      <span>Feature this coffee prominently on the homepage storefront</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 2: SIZES & PRICING ═══ */}
              {activeSection === 'pricing' && (
                <motion.div key="pricing" className="pm-section" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <div className="pm-section-header">
                    <h3>💰 Step 2: Sizes &amp; Pricing</h3>
                    <p className="pm-section-hint">Configure sizes (e.g. 250g, 500g, 1kg) and prices in KES.</p>
                  </div>

                  <div className="pm-quick-sizes-bar">
                    <span className="pm-qs-label">⚡ Add Common Size:</span>
                    <div className="pm-qs-chips">
                      {QUICK_SIZE_PILLS.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          className="pm-qs-chip"
                          onClick={() => handleQuickAddSize(sz)}
                        >
                          + {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sizes-builder">
                    {formData.sizes.map((size, i) => {
                      const hasDiscount = size.originalPrice && Number(size.originalPrice) > Number(size.price);
                      const discountPct = hasDiscount ? Math.round(((Number(size.originalPrice) - Number(size.price)) / Number(size.originalPrice)) * 100) : 0;

                      return (
                        <div key={i} className="size-row-premium">
                          <div className="size-num">{i + 1}</div>
                          <div className="pm-field flex-1">
                            <label>Size / Weight <span className="req">*</span></label>
                            <input
                              type="text"
                              value={size.size}
                              onChange={e => updateSize(i, 'size', e.target.value)}
                              placeholder="e.g. 250g, 500g, 1kg"
                              required
                            />
                          </div>

                          <div className="pm-field flex-1">
                            <label>Selling Price (KES) <span className="req">*</span></label>
                            <input
                              type="number"
                              value={size.price ?? ''}
                              onChange={e => updateSize(i, 'price', e.target.value)}
                              placeholder="e.g. 750"
                              min="1"
                              step="1"
                              required
                            />
                          </div>

                          <div className="pm-field flex-1">
                            <label>Original Price (KES) <span className="hint">(Crossed-out)</span></label>
                            <input
                              type="number"
                              value={size.originalPrice ?? ''}
                              onChange={e => updateSize(i, 'originalPrice', e.target.value)}
                              placeholder="Optional old price"
                              min="1"
                              step="1"
                            />
                          </div>

                          {hasDiscount && (
                            <div className="size-discount-chip">
                              <span>-{discountPct}%</span>
                            </div>
                          )}

                          {formData.sizes.length > 1 && (
                            <button
                              type="button"
                              className="size-remove-btn"
                              onClick={() => removeSize(i)}
                              title="Remove size"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" className="btn-add-size" onClick={addSize}>
                    <FaPlus /> Add Another Size Variant
                  </button>

                  <div className="pm-promo-campaign-box" style={{ marginTop: '1.25rem' }}>
                    <div className="pm-field">
                      <label>Promotional Badge / Banner <span className="hint">(Optional)</span></label>
                      <input
                        type="text"
                        value={formData.discountBadge || ''}
                        onChange={e => set('discountBadge', e.target.value)}
                        placeholder="e.g. 🔥 Black November: 20% OFF / Special Harvest Offer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 3: VARIETY & DETAILS (STRICTLY THE 4 VARIETIES) ═══ */}
              {activeSection === 'details' && (
                <motion.div key="details" className="pm-section" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <div className="pm-section-header">
                    <h3>☕ Step 3: Coffee Variety &amp; Roast</h3>
                    <p className="pm-section-hint">Select strictly one of the 4 farm varieties below.</p>
                  </div>

                  {/* 4 Varieties Strict Selector */}
                  <div className="pm-varieties-section">
                    <label className="pm-variety-heading">Variety / Roast Level <span className="req">*</span></label>
                    <div className="pm-varieties-grid">
                      {ROAST_LEVELS.map(r => {
                        const isSelected = formData.roastLevel?.toLowerCase() === r.label.toLowerCase() ||
                                          formData.roastLevel?.toLowerCase() === r.value.toLowerCase();
                        return (
                          <div
                            key={r.value}
                            className={`pm-variety-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => updateRoastLevel(r.label)}
                          >
                            <div className="pm-variety-icon">{r.emoji}</div>
                            <div className="pm-variety-info">
                              <span className="pm-variety-title">{r.label}</span>
                              <span className="pm-variety-desc">{r.desc}</span>
                            </div>
                            <div className={`pm-variety-radio ${isSelected ? 'checked' : ''}`}>
                              {isSelected ? <FaCheck /> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pm-field" style={{ marginTop: '1.25rem' }}>
                    <label>🌱 Origin / Terroir Region</label>
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={e => updateOrigin(e.target.value)}
                      placeholder="e.g. Bomet County, Kenya"
                    />
                  </div>

                  {/* Grind Profiles */}
                  <div className="pm-grind-section" style={{ marginTop: '1.25rem' }}>
                    <div className="pm-grind-header">
                      <label className="pm-variety-heading">Coffee Format (Grind Profiles Available to Customers)</label>
                      <div className="pm-qs-chips">
                        <button type="button" className="pm-qs-chip" onClick={selectAllGrinds}>Beans &amp; Ground</button>
                        <button type="button" className="pm-qs-chip" onClick={selectBeansOnly}>Beans Only</button>
                      </div>
                    </div>

                    <div className="pm-grind-options-grid">
                      {[
                        { name: 'Beans', icon: '🫘', desc: 'Fresh whole coffee beans' },
                        { name: 'Ground', icon: '☕', desc: 'Freshly ground coffee' }
                      ].map(g => {
                        const isSelected = formData.grindOptions?.includes(g.name);
                        const isDefault = formData.defaultGrind === g.name;

                        return (
                          <div
                            key={g.name}
                            className={`pm-grind-pill-card ${isSelected ? 'active' : ''}`}
                            onClick={() => toggleGrindOption(g.name)}
                          >
                            <div className="pm-grind-pill-header">
                              <span className="pm-grind-icon">{g.icon}</span>
                              <div className="pm-grind-meta">
                                <span className="pm-grind-name">{g.name}</span>
                                <span className="pm-grind-desc">{g.desc}</span>
                              </div>
                              <div className={`pm-grind-checkbox ${isSelected ? 'checked' : ''}`}>
                                {isSelected ? <FaCheck /> : null}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="pm-grind-pill-footer" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className={`pm-grind-default-badge ${isDefault ? 'is-default' : ''}`}
                                  onClick={() => set('defaultGrind', g.name)}
                                >
                                  {isDefault ? '★ Default Choice' : 'Set as Default'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Flavor Notes */}
                  <div className="pm-field" style={{ marginTop: '1.25rem' }}>
                    <label>Flavor Notes</label>
                    <div className="flavor-notes-input-wrap">
                      <input
                        type="text"
                        value={flavorInput}
                        onChange={e => setFlavorInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFlavor(flavorInput); } }}
                        placeholder="Type a flavor note and press Add (e.g. Citrus, Dark Chocolate, Caramel)"
                      />
                      <button type="button" className="btn-add-flavor" onClick={() => addFlavor(flavorInput)}>
                        + Add Note
                      </button>
                    </div>
                    {formData.flavorNotes?.length > 0 && (
                      <div className="flavor-chips-list">
                        {formData.flavorNotes.map((note, idx) => (
                          <span key={idx} className="flavor-chip-tag">
                            {note}
                            <button type="button" onClick={() => removeFlavor(note)}><FaTimes /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 4: MEDIA ═══ */}
              {activeSection === 'media' && (
                <motion.div key="media" className="pm-section" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <div className="pm-section-header">
                    <h3>🖼️ Step 4: Product Images</h3>
                    <p className="pm-section-hint">Upload high-resolution images of the roasted coffee or packaging.</p>
                  </div>

                  <div
                    className={`drop-zone ${dragOver ? 'drag-active' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload className="drop-icon" />
                    <p className="drop-title">Drop coffee images here or click to browse</p>
                    <p className="drop-hint">JPG, PNG, WebP — max 5MB each</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => processFiles(e.target.files)}
                    />
                  </div>

                  {images.length > 0 && (
                    <div className="image-grid" style={{ marginTop: '1rem' }}>
                      {images.map((img, i) => (
                        <motion.div key={i} className={`image-tile ${i === 0 ? 'primary' : ''}`}>
                          <img src={img.url} alt={`coffee-${i}`} />
                          {i === 0 && <span className="primary-badge">Cover</span>}
                          {img.file && <span className="new-badge">New</span>}
                          <button
                            type="button"
                            className="img-remove-btn"
                            onClick={() => removeImage(i)}
                            title="Remove image"
                          >
                            <FaTimes />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ STEP 5: STOCK & INVENTORY ═══ */}
              {activeSection === 'stock' && (
                <motion.div key="stock" className="pm-section" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <div className="pm-section-header">
                    <h3>📦 Step 5: Inventory Management</h3>
                    <p className="pm-section-hint">Set current units in warehouse and low-stock notification triggers.</p>
                  </div>

                  <div className="stock-cards">
                    <div className="stock-card">
                      <div className="stock-card-icon green"><FaCheckCircle /></div>
                      <div className="pm-field" style={{ flex: 1 }}>
                        <label>Physical Stock (Units Available) <span className="req">*</span></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="number"
                            value={formData.inventory.physicalStock ?? ''}
                            onChange={e => set('inventory', { ...formData.inventory, physicalStock: e.target.value })}
                            placeholder="e.g. 50"
                            min="0"
                            required
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn-quick-adjust"
                            onClick={() => set('inventory', { ...formData.inventory, physicalStock: Math.max(0, (parseInt(formData.inventory.physicalStock, 10) || 0) - 5) })}
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            className="btn-quick-adjust"
                            onClick={() => set('inventory', { ...formData.inventory, physicalStock: (parseInt(formData.inventory.physicalStock, 10) || 0) + 5 })}
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            className="btn-quick-adjust"
                            onClick={() => set('inventory', { ...formData.inventory, physicalStock: (parseInt(formData.inventory.physicalStock, 10) || 0) + 10 })}
                          >
                            +10
                          </button>
                        </div>
                        <span className="pm-field-hint">Actual physical stock available for immediate dispatch</span>
                      </div>
                    </div>

                    <div className="stock-card">
                      <div className="stock-card-icon amber"><FaBell /></div>
                      <div className="pm-field" style={{ flex: 1 }}>
                        <label>Low Stock Warning Threshold</label>
                        <input
                          type="number"
                          value={formData.inventory.lowStockThreshold ?? ''}
                          onChange={e => set('inventory', { ...formData.inventory, lowStockThreshold: e.target.value })}
                          placeholder="5"
                          min="0"
                        />
                        <span className="pm-field-hint">Alerts admin when available stock drops to or below this level</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </form>
        </div>

        {/* ── Sticky Mobile & Desktop Action Footer ── */}
        <div className="pm-form-footer">
          <div className="pm-form-footer-left">
            {activeSection !== 'basic' ? (
              <button
                type="button"
                className="btn-pm-prev"
                onClick={handleBack}
                disabled={saving}
              >
                <FaArrowLeft /> Back
              </button>
            ) : (
              <button
                type="button"
                className="btn-pm-cancel"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="pm-form-footer-right">
            {activeSection !== 'stock' ? (
              <button
                type="button"
                className="btn-pm-next"
                onClick={handleNext}
                disabled={saving}
              >
                Next Step <FaArrowRight />
              </button>
            ) : (
              <button
                type="button"
                className="btn-pm-save"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving
                  ? <span className="saving-dots"><span>Saving</span><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></span>
                  : product ? '💾 Update Product' : '✨ Create Product'}
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default ProductsManagement;

/* ─── Category Manager Modal ─────────────────────────────────── */
const CategoryManager = ({ allCategories, hiddenCategories, onToggleHide, onDeleteCategory, onAddCategory, onClose }) => (
  <motion.div
    className="pm-modal-overlay"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}>
    <motion.div
      className="catmgr-modal"
      initial={{ opacity: 0, scale: 0.96, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 24 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div className="catmgr-header">
        <div className="catmgr-title">
          <div className="catmgr-icon"><FaCog /></div>
          <div>
            <h3>Manage Categories</h3>
            <p>{allCategories.length} categories · {hiddenCategories.length} hidden</p>
          </div>
        </div>
        <button className="pm-close-btn" onClick={onClose}><FaTimes /></button>
      </div>

      {/* Body */}
      <div className="catmgr-body">
        <p className="catmgr-hint">
          <strong>Hide</strong> a category to remove it from the filter bar and product form without deleting it.{' '}
          <strong>Delete</strong> permanently removes custom categories (built-in categories can only be hidden).
        </p>

        <div className="catmgr-list">
          {allCategories.map(cat => {
            const isHidden = hiddenCategories.includes(cat.value);
            return (
              <div key={cat.value} className={`catmgr-row ${isHidden ? 'catmgr-row--hidden' : ''}`}>
                {/* Icon + label */}
                <div className="catmgr-row-left">
                  <span className="catmgr-row-icon" style={{ background: `${cat.color || '#6b7280'}22`, color: cat.color || '#6b7280' }}>
                    {cat.icon}
                  </span>
                  <div>
                    <strong>{cat.label}</strong>
                    {!cat.isCustom && <span className="catmgr-built-in">built-in</span>}
                    {cat.isCustom && <span className="catmgr-custom-tag">custom</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="catmgr-row-actions">
                  {/* Hide / Show toggle */}
                  <button
                    className={`catmgr-btn ${isHidden ? 'catmgr-btn--show' : 'catmgr-btn--hide'}`}
                    onClick={() => onToggleHide(cat.value)}
                    title={isHidden ? 'Show this category' : 'Hide this category'}>
                    {isHidden ? <><FaEye /> Show</> : <><FaEyeSlash /> Hide</>}
                  </button>

                  {/* Delete — only for custom */}
                  {cat.isCustom && (
                    <button
                      className="catmgr-btn catmgr-btn--delete"
                      onClick={() => onDeleteCategory(cat)}
                      title="Delete this category permanently">
                      <FaTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="catmgr-footer">
        <button className="cat-pill cat-pill-add" onClick={onAddCategory}>
          <FaPlus /> Add New Category
        </button>
        <button className="btn-pm-save" style={{ minWidth: 'auto', padding: '0.6rem 1.5rem' }} onClick={onClose}>
          Done
        </button>
      </div>
    </motion.div>
  </motion.div>
);

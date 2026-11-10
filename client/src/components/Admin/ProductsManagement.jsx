// components/Admin/ProductsManagement.jsx — Category-Aware Rewrite
import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaBox, FaUpload,
  FaTimes, FaTag, FaStar, FaCoffee, FaLeaf,
  FaGlobe, FaLayerGroup, FaBoxOpen, FaBell, FaCheckCircle,
  FaTools, FaShoppingBag, FaGift, FaCheck, FaCog, FaEye, FaEyeSlash,
  FaHeartbeat, FaThLarge, FaListUl, FaFire
} from 'react-icons/fa';
import './ProductsManagement.css';
import { updateProductStock } from '../../api/api';
import InventoryHealth from './InventoryHealth';

/* ─── Constants ──────────────────────────────────────────────── */
const ROAST_LEVELS = [
  { value: 'light', label: 'Light', color: '#e8c99a', emoji: '☀️' },
  { value: 'medium-light', label: 'Med. Light', color: '#c8955a', emoji: '🌤️' },
  { value: 'medium', label: 'Medium', color: '#a0672e', emoji: '⛅' },
  { value: 'medium-dark', label: 'Med. Dark', color: '#7a4520', emoji: '🌥️' },
  { value: 'dark', label: 'Dark', color: '#4a2010', emoji: '🌑' },
  { value: 'espresso', label: 'Espresso', color: '#1a0a04', emoji: '☕' },
];

// Default built-in categories
const DEFAULT_CATEGORIES = [
  { value: 'coffee-beans', label: 'Coffee Beans', icon: '☕', color: '#D4AF37' },
  { value: 'brewing-equipment', label: 'Brewing Equipment', icon: '⚙️', color: '#3b82f6' },
  { value: 'accessories', label: 'Accessories', icon: '🎒', color: '#8b5cf6' },
  { value: 'merchandise', label: 'Merchandise', icon: '🛍️', color: '#10b981' },
];

// Category-specific configurations
const CATEGORY_CONFIG = {
  'coffee-beans': {
    label: 'Coffee Beans',
    detailsTab: '☕ Coffee Details',
    hasRoast: true,
    hasOrigin: true,
    hasFlavors: true,
    sizeOptions: ['100g', '250g', '500g', '1000g', '2000g'],
    sizeDefault: '250g',
    sizePlaceholder: 'e.g., 250g, 500g, 1kg',
    detailsHint: 'Roast level, origin, and flavor notes help customers find the right coffee.',
  },
  'brewing-equipment': {
    label: 'Brewing Equipment',
    detailsTab: '⚙️ Product Details',
    hasRoast: false,
    hasOrigin: false,
    hasFlavors: false,
    hasMaterial: true,
    hasCapacity: true,
    hasBrand: true,
    sizeOptions: ['Small', 'Medium', 'Large', 'XL', 'Standard', '1L', '0.5L', '300ml', '600ml', '1L'],
    sizeDefault: 'Standard',
    sizePlaceholder: 'e.g., Small, Large, 1L',
    detailsHint: 'Provide material, capacity and brand details to help customers make informed choices.',
  },
  'accessories': {
    label: 'Accessories',
    detailsTab: '🎒 Product Details',
    hasRoast: false,
    hasOrigin: false,
    hasFlavors: false,
    hasMaterial: true,
    hasBrand: true,
    sizeOptions: ['One Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Standard'],
    sizeDefault: 'One Size',
    sizePlaceholder: 'e.g., One Size, S, M, L',
    detailsHint: 'Add material and brand info to help customers understand what they are getting.',
  },
  'merchandise': {
    label: 'Merchandise',
    detailsTab: '🛍️ Product Details',
    hasRoast: false,
    hasOrigin: false,
    hasFlavors: false,
    hasMaterial: true,
    hasBrand: false,
    sizeOptions: ['One Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Standard'],
    sizeDefault: 'One Size',
    sizePlaceholder: 'e.g., One Size, S, M, L',
    detailsHint: 'Add material details for clothing or product specifics for merchandise.',
  },
};

// Default config for custom categories
const DEFAULT_CATEGORY_CONFIG = {
  detailsTab: '📋 Product Details',
  hasRoast: false,
  hasOrigin: true,
  hasFlavors: false,
  hasMaterial: true,
  hasBrand: true,
  sizeOptions: ['Standard', 'Small', 'Medium', 'Large', 'XL', 'One Size'],
  sizeDefault: 'Standard',
  sizePlaceholder: 'e.g., Standard, Small, Large',
  detailsHint: 'Add any relevant product details.',
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
    try { return JSON.parse(localStorage.getItem('auth'))?.token; } catch { return null; }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      const authToken = getToken();
      const res = await fetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCategoriesList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, [getToken]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Combined default & database categories
  const allCategories = useMemo(() => {
    const defaults = [
      { value: 'coffee-beans', slug: 'coffee-beans', label: 'Coffee Beans', icon: '☕', color: '#D4AF37' },
      { value: 'brewing-equipment', slug: 'brewing-equipment', label: 'Brewing Equipment', icon: '⚙️', color: '#3B82F6' },
      { value: 'accessories', slug: 'accessories', label: 'Accessories', icon: '🎒', color: '#8B5CF6' },
      { value: 'merchandise', slug: 'merchandise', label: 'Merchandise', icon: '🛍️', color: '#10B981' },
    ];

    const custom = categoriesList.map(c => ({
      value: c._id,
      slug: c.slug,
      label: c.name,
      icon: c.icon || '📦',
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
    return found?.icon || '📦';
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = getToken();
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/admin/products?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      if (data.success) setProducts(data.data.products || []);
    } catch { showAlert('Failed to load products', 'error'); }
    finally { setLoading(false); }
  }, [filters, showAlert, getToken]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      const authToken = getToken();
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!response.ok) throw new Error('Failed to delete');
      showAlert('Product deleted', 'success');
      fetchProducts();
    } catch { showAlert('Failed to delete product', 'error'); }
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
      await Promise.all(selectedProducts.map(id =>
          fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
      ));
      showAlert(`${selectedProducts.length} products deleted`, 'success');
      setSelectedProducts([]);
      fetchProducts();
    } catch { showAlert('Failed to delete some products', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddCategory = async () => {
    const name = window.prompt('Enter new category name (e.g., "Gift Sets", "Tea", "Mugs"):');
    if (!name?.trim()) return;
    const label = name.trim();
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (allCategories.find(c => c.value === value || c.label.toLowerCase() === label.toLowerCase())) {
      showAlert('This category already exists', 'error');
      return;
    }
    try {
      const authToken = getToken();
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: label, icon: '📦', description: label })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(`Category "${label}" added`, 'success');
        fetchCategories();
      } else {
        showAlert(data.message || 'Failed to add category', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to add category', 'error');
    }
  };

  const handleToggleHide = (value) => {
    const next = hiddenCategories.includes(value)
      ? hiddenCategories.filter(v => v !== value)
      : [...hiddenCategories, value];
    setHiddenCategories(next);
    localStorage.setItem('pm_hidden_categories', JSON.stringify(next));
    // If current filter is now hidden, reset to all
    if (next.includes(filters.category)) setFilters(p => ({ ...p, category: 'all' }));
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.label}"? Products in this category won't be deleted.`)) return;
    try {
      const authToken = getToken();
      const res = await fetch(`/api/admin/categories/${cat.value}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showAlert(`Category "${cat.label}" deleted`, 'success');
        fetchCategories();
      } else {
        showAlert(data.message || 'Failed to delete category', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete category', 'error');
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

/* ─── Product Modal ──────────────────────────────────────────── */
const ProductModal = ({ product, onClose, onSave, getToken, allCategories, onAddCategory }) => {
  const { showAlert } = useContext(AppContext);
  const isEditing = !!product;
  const [editViewMode, setEditViewMode] = useState('quick'); // 'quick' | 'full'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeSection, setActiveSection] = useState(isEditing ? 'pricing' : 'basic');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flavorInput, setFlavorInput] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sizes: (product?.sizes && product.sizes.length > 0)
      ? product.sizes.map(s => ({
          size: s.size,
          price: s.price ?? '',
          originalPrice: s.originalPrice ?? ''
        }))
      : [{ size: '250g', price: '', originalPrice: '' }],
    category: product?.categoryId?._id || product?.categoryId || product?.category || (allCategories[0]?.value || ''),
    categoryAttributes: product?.categoryAttributes || {},
    roastLevel: product?.roastLevel || '',
    origin: product?.origin || '',
    flavorNotes: product?.flavorNotes || [],
    badge: product?.badge || '',
    discountBadge: product?.discountBadge || '',
    compareAtPrice: product?.compareAtPrice ?? '',
    material: product?.material || '',
    brand: product?.brand || '',
    capacity: product?.capacity || '',
    inventory: {
      physicalStock: product?.inventory?.physicalStock !== undefined ? product.inventory.physicalStock : '',
      lowStockThreshold: product?.inventory?.lowStockThreshold !== undefined ? product.inventory.lowStockThreshold : '',
    },
    grindOptions: (product?.grindOptions && product.grindOptions.length > 0)
      ? product.grindOptions
      : ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: product?.defaultGrind || 'Whole Beans',
    tags: product?.tags?.join(', ') || '',
    isFeatured: product?.isFeatured || false,
  });
  const [images, setImages] = useState(product?.images || []);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const catObj = allCategories.find(c => c.value === formData.category || c.slug === formData.category);
  const cfg = getCategoryConfig(catObj?.slug || formData.category);

  // Filter out attributes already handled by dedicated inputs (roast, origin, weight/size)
  const DEDICATED_ATTR_KEYS = ['roastlevel', 'roast_level', 'origin', 'packageweight', 'package_weight', 'size', 'sizes'];
  const customCategoryAttributes = (catObj?.attributeSchema || []).filter(
    attr => !DEDICATED_ATTR_KEYS.includes((attr.key || '').toLowerCase().replace(/[-_]/g, ''))
  );

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
      set('defaultGrind', updated[0] || 'Whole Beans');
    }
  };

  const selectAllGrinds = () => {
    set('grindOptions', ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso']);
  };

  const selectWholeBeansOnly = () => {
    set('grindOptions', ['Whole Beans']);
    set('defaultGrind', 'Whole Beans');
  };

  // Quick Start Templates
  const QUICK_TEMPLATES = [
    {
      label: 'Single-Origin Coffee',
      icon: '☕',
      data: {
        name: 'Rerendet AA Arabica Reserve',
        description: 'Single-origin specialty Arabica harvested at high altitude in Bomet, Kenya. Rich tasting notes of citrus, blackcurrant, and smooth dark chocolate with a creamy finish.',
        sizes: [
          { size: '250g', price: 750 },
          { size: '500g', price: 1400 },
          { size: '1000g', price: 2700 }
        ],
        roastLevel: 'medium-dark',
        origin: 'Bomet, Kenya (1,950m ASL)',
        flavorNotes: ['Blackcurrant', 'Citrus', 'Caramel'],
        badge: 'Top Harvest',
        tags: 'specialty, arabica, single-origin, rerendet',
        inventory: { physicalStock: 50, lowStockThreshold: 10 },
        isFeatured: true
      }
    },
    {
      label: 'Organic Hass Avocados',
      icon: '🥑',
      data: {
        name: 'Organic Fresh Hass Avocados',
        description: 'Naturally tree-ripened organic Hass avocados harvested directly from the fertile soils of Rerendet Farm. Exceptionally creamy, rich in natural oils, and chemical-free.',
        sizes: [
          { size: '1kg Bag (~4-5 pcs)', price: 250 },
          { size: '5kg Family Crate', price: 1100 }
        ],
        origin: 'Rerendet Farm, Kenya',
        badge: 'Farm Fresh',
        tags: 'organic, avocado, produce, fresh-harvest',
        inventory: { physicalStock: 40, lowStockThreshold: 8 },
        isFeatured: true
      }
    },
    {
      label: 'Pure Raw Honey',
      icon: '🍯',
      data: {
        name: 'Rerendet Pure Raw Honey',
        description: '100% pure unfiltered raw multi-floral forest honey. Harvested sustainably from our indigenous acacia apiaries on the farm with natural health enzymes preserved.',
        sizes: [
          { size: '500g Glass Jar', price: 650 },
          { size: '1kg Glass Jar', price: 1200 }
        ],
        origin: 'Rerendet Forest Apiary',
        badge: '100% Raw',
        tags: 'honey, raw, organic, pure, apiary',
        inventory: { physicalStock: 30, lowStockThreshold: 5 },
        isFeatured: false
      }
    },
    {
      label: 'Brewing Equipment',
      icon: '⚙️',
      data: {
        name: 'Artisan French Press / Glass Brewer',
        description: 'Heat-resistant borosilicate glass with stainless steel multi-layer micro-filtration. Delivers a clean, aromatic extraction for specialty coffees and teas.',
        sizes: [
          { size: 'Standard (600ml / 4 Cups)', price: 3200 },
          { size: 'Large (1000ml / 8 Cups)', price: 4200 }
        ],
        badge: 'Barista Grade',
        tags: 'equipment, brewer, barista, french-press',
        inventory: { physicalStock: 15, lowStockThreshold: 3 },
        isFeatured: false
      }
    }
  ];

  const applyTemplate = (tpl) => {
    let catMatch = formData.category;
    if (tpl.icon === '☕') {
      const found = allCategories.find(c => c.slug?.includes('coffee') || c.label?.toLowerCase().includes('coffee'));
      if (found) catMatch = found.value;
    } else if (tpl.icon === '⚙️') {
      const found = allCategories.find(c => c.slug?.includes('brew') || c.label?.toLowerCase().includes('equipment'));
      if (found) catMatch = found.value;
    }

    setFormData(prev => ({
      ...prev,
      ...tpl.data,
      category: catMatch || prev.category,
      categoryAttributes: {
        ...(prev.categoryAttributes || {}),
        ...(tpl.data.roastLevel ? { roastLevel: tpl.data.roastLevel.toLowerCase() } : {}),
        ...(tpl.data.origin ? { origin: tpl.data.origin } : {})
      }
    }));
    showAlert(`Applied ${tpl.label} template!`, 'success');
  };

  const QUICK_SIZE_PILLS = [
    '250g', '500g', '1000g', '2000g', '1kg Bag', '5kg Crate', '500g Jar', '1kg Jar', 'Standard', 'One Size'
  ];

  const handleQuickAddSize = (sz) => {
    set('sizes', [...formData.sizes, { size: sz, price: '', originalPrice: '' }]);
  };

  // Update size default when category changes
  const handleCategoryChange = (val) => {
    set('category', val);
    set('categoryAttributes', {});
  };

  // Build nav sections dynamically based on category
  const SECTIONS = [
    { id: 'basic', label: 'Basic Info', icon: '🏷️' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'details', label: '📋 Product Details', icon: '📋' },
    { id: 'media', label: 'Media', icon: '🖼️' },
    { id: 'stock', label: 'Inventory', icon: '📦' },
  ];

  /* ── Image handling ── */
  const processFiles = (files) => {
    const newImgs = Array.from(files).map(file => ({ url: URL.createObjectURL(file), file }));
    setImages(prev => [...prev, ...newImgs]);
  };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); };
  const removeImage = async (index) => {
    const img = images[index];
    if (img.file) { URL.revokeObjectURL(img.url); setImages(prev => prev.filter((_, i) => i !== index)); return; }
    if (!window.confirm('Delete this image permanently?')) return;
    try {
      const r = await fetch(`/api/admin/products/${product._id}/images`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.url }),
      });
      if (r.ok) setImages(prev => prev.filter((_, i) => i !== index));
      else showAlert('Failed to delete image', 'error');
    } catch { showAlert('Error deleting image', 'error'); }
  };

  /* ── Size handling ── */
  const addSize = () => set('sizes', [...formData.sizes, { size: 'Standard', price: '', originalPrice: '' }]);
  const removeSize = (i) => set('sizes', formData.sizes.filter((_, idx) => idx !== i));
  const updateSize = (i, field, value) => set('sizes', formData.sizes.map((s, idx) =>
    idx === i ? {
      ...s,
      [field]: value
    } : s
  ));

  /* ── Flavor tag handling ── */
  const addFlavor = (note) => {
    const t = note.trim();
    if (t && !formData.flavorNotes.includes(t)) set('flavorNotes', [...formData.flavorNotes, t]);
    setFlavorInput('');
  };
  const removeFlavor = (note) => set('flavorNotes', formData.flavorNotes.filter(n => n !== note));

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim() || !formData.sizes.length) {
      showAlert('Please fill in name, description, and at least one size.', 'error'); return;
    }
    const invalidSizes = formData.sizes.filter(s => !s.size || !s.price || parseFloat(s.price) <= 0);
    if (invalidSizes.length) { showAlert('All sizes need a valid price > 0.', 'error'); return; }
    const rawStock = formData.inventory.physicalStock !== undefined && formData.inventory.physicalStock !== '' 
      ? formData.inventory.physicalStock 
      : (formData.inventory.stock !== undefined && formData.inventory.stock !== '' ? formData.inventory.stock : 0);
    const stock = parseInt(rawStock, 10);
    if (isNaN(stock) || stock < 0) { showAlert('Stock must be a valid number ≥ 0.', 'error'); return; }

    setSaving(true);
    try {
      const authToken = getToken();
      if (!authToken) { showAlert('Session expired. Please log in again.', 'error'); return; }

      const url = product ? `/api/admin/products/${product._id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';

      const mergedCategoryAttributes = {
        ...(formData.categoryAttributes || {}),
        ...(formData.roastLevel ? { roastLevel: formData.roastLevel.trim().toLowerCase() } : {}),
        ...(formData.origin ? { origin: formData.origin.trim() } : {}),
        ...(formData.sizes?.[0]?.size ? { packageWeight: formData.sizes[0].size } : {})
      };

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sizes: formData.sizes.map(s => ({
          size: s.size,
          price: parseFloat(s.price),
          originalPrice: (s.originalPrice !== undefined && s.originalPrice !== null && s.originalPrice !== '' && parseFloat(s.originalPrice) > 0)
            ? parseFloat(s.originalPrice)
            : null
        })),
        categoryId: formData.category,
        categoryAttributes: mergedCategoryAttributes,
        badge: formData.badge ? formData.badge.trim() : '',
        discountBadge: formData.discountBadge ? formData.discountBadge.trim() : undefined,
        compareAtPrice: (formData.compareAtPrice && parseFloat(formData.compareAtPrice) > 0)
          ? parseFloat(formData.compareAtPrice)
          : undefined,
        inventory: { 
          physicalStock: stock, 
          lowStockThreshold: parseInt(formData.inventory.lowStockThreshold) || 5 
        },
        roastLevel: formData.roastLevel ? formData.roastLevel.trim() : undefined,
        origin: formData.origin ? formData.origin.trim() : undefined,
        flavorNotes: Array.isArray(formData.flavorNotes) ? formData.flavorNotes : [],
        grindOptions: formData.grindOptions || ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
        defaultGrind: formData.defaultGrind || 'Whole Beans',
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isFeatured: formData.isFeatured,
      };

      const filesToUpload = images.filter(img => img.file).map(img => img.file);
      let response;

      if (filesToUpload.length > 0) {
        const fd = new FormData();
        Object.entries(productData).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (typeof v === 'object' && !Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else fd.append(k, v);
        });
        filesToUpload.forEach(file => fd.append('images', file));
        response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${authToken}` }, body: fd });
      } else {
        response = await fetch(url, {
          method,
          headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) { showAlert('Session expired. Please log in again.', 'error'); return; }
        throw new Error(err.message || `Failed to ${product ? 'update' : 'create'} product`);
      }
      const data = await response.json();
      if (data.success) {
        showAlert(product ? 'Product updated!' : 'Product created!', 'success');
        onSave(); onClose();
      } else throw new Error(data.message);
    } catch (error) {
      showAlert(error.message || 'Something went wrong', 'error');
    } finally { setSaving(false); }
  };

  const primaryImage = images.find(i => !i.file) || images[0];

  return (
    <motion.div className="pm-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="pm-modal"
        initial={{ opacity: 0, scale: 0.96, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-modal-header">
          <div className="pm-modal-title">
            <div className="pm-modal-icon" style={{ background: `${catObj?.color || '#D4AF37'}22`, color: catObj?.color || '#D4AF37' }}>
              {product ? <FaEdit /> : <FaPlus />}
            </div>
            <div>
              <h2>{product ? (editViewMode === 'quick' ? 'Quick Update' : 'Edit Product') : (editViewMode === 'quick' ? 'New Product (Streamlined)' : 'New Product')}</h2>
              {product && <span className="pm-modal-subtitle">{product.name}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn-toggle-edit-mode"
              onClick={() => setEditViewMode(m => m === 'quick' ? 'full' : 'quick')}
            >
              {editViewMode === 'quick' ? 'Switch to Multi-Step Form' : '⚡ Streamlined Mode'}
            </button>
            <button className="pm-close-btn" onClick={onClose}><FaTimes /></button>
          </div>
        </div>

        {/* 1-Click Templates (available for new products in both modes) */}
        {!product && (
          <div className="pm-tpl-strip">
            <span className="pm-tpl-label">⚡ 1-Click Templates:</span>
            <div className="pm-tpl-chips">
              {QUICK_TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="pm-tpl-btn"
                  onClick={() => applyTemplate(tpl)}
                >
                  <span>{tpl.icon}</span>
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {editViewMode === 'quick' ? (
          <form className="pm-streamlined-form" onSubmit={handleSubmit}>
            <div className="pm-modal-body-streamlined">
              {/* ── Top Bar: Product Name, Category & Homepage Featured Toggle ── */}
              <div className="pm-streamlined-header-bar">
                <div className="pm-streamlined-name-field">
                  <label>Product Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="pm-streamlined-name-input"
                    value={formData.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Rerendet AA Arabica Reserve"
                    required
                  />
                </div>
                <div className="pm-streamlined-meta-group">
                  <div className="pm-streamlined-cat-select-wrap" title="Select Category">
                    <select
                      className="pm-streamlined-cat-select"
                      value={formData.category}
                      onChange={e => handleCategoryChange(e.target.value)}
                    >
                      {allCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className={`pm-featured-switch ${formData.isFeatured ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={e => set('isFeatured', e.target.checked)}
                    />
                    <FaStar className="star-icon" />
                    <span>{formData.isFeatured ? 'Featured on Storefront' : 'Feature on Storefront'}</span>
                  </label>
                </div>
              </div>

              {/* ── Product Description Card (Upfront, no hidden accordion) ── */}
              <div className="pm-streamlined-card">
                <div className="pm-card-section-title">
                  <span>📝 Product Description <span className="req">*</span></span>
                </div>
                <div className="pm-field" style={{ margin: 0 }}>
                  <textarea
                    value={formData.description}
                    onChange={e => set('description', e.target.value)}
                    rows={3}
                    placeholder="Describe product tasting notes, origin story, processing, or brewing tips..."
                    required
                  />
                </div>
              </div>

              {/* ── Card 1: Sizes & Pricing ── */}
              <div className="pm-streamlined-card">
                <div className="pm-card-section-title">
                  <span>💰 Sizes &amp; Pricing</span>
                  <div className="pm-qs-chips">
                    {QUICK_SIZE_PILLS.slice(0, 5).map(sz => (
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
                    const savingsAmt = hasDiscount ? (Number(size.originalPrice) - Number(size.price)) : 0;

                    return (
                      <div key={i} className="size-row-premium">
                        <div className="size-num">{i + 1}</div>
                        <div className="pm-field flex-1">
                          <label>Size / Variant</label>
                          <div className="size-input-combo">
                            <select
                              value={cfg.sizeOptions.includes(size.size) ? size.size : '__custom__'}
                              onChange={e => {
                                if (e.target.value !== '__custom__') updateSize(i, 'size', e.target.value);
                              }}
                            >
                              {cfg.sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__custom__">✏️ Custom…</option>
                            </select>
                            {(!cfg.sizeOptions.includes(size.size) || size.size === '') && (
                              <input
                                type="text"
                                value={size.size}
                                className="size-custom-input"
                                onChange={e => updateSize(i, 'size', e.target.value)}
                                placeholder={cfg.sizePlaceholder}
                              />
                            )}
                          </div>
                        </div>

                        <div className="pm-field flex-1">
                          <label>Selling Price (KES) <span className="req">*</span></label>
                          <input
                            type="number"
                            value={size.price ?? ''}
                            onChange={e => updateSize(i, 'price', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div className="pm-field flex-1">
                          <label>Original Price (KES) <span className="hint">(Crossed-out)</span></label>
                          <input
                            type="number"
                            value={size.originalPrice ?? ''}
                            onChange={e => updateSize(i, 'originalPrice', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="e.g. 2400 (Old price)"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {hasDiscount && (
                          <div className="size-discount-chip" title={`Save KES ${savingsAmt.toLocaleString()}`}>
                            <span>-{discountPct}%</span>
                          </div>
                        )}

                        {formData.sizes.length > 1 && (
                          <button type="button" className="size-remove-btn" onClick={() => removeSize(i)}>
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pm-sizes-action-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-add-size" onClick={addSize}>
                    <FaPlus /> Add Another Variant
                  </button>
                </div>

                {/* ── Black November & Campaign Preset Block ── */}
                <div className="pm-promo-campaign-box" style={{ marginTop: '1.25rem' }}>
                  <div className="pm-promo-header">
                    <span className="pm-promo-badge">🔥 Black November &amp; Sale Campaigns</span>
                    <p className="pm-promo-desc">
                      Set a discount badge and crossed-out original prices to show discount deals on storefront.
                    </p>
                  </div>

                  <div className="pm-field">
                    <label>Promotional Badge / Banner Text</label>
                    <input
                      type="text"
                      value={formData.discountBadge || ''}
                      onChange={e => set('discountBadge', e.target.value)}
                      placeholder="e.g. 🔥 Black November: 25% OFF / Limited Harvest Sale"
                    />
                  </div>

                  <div className="pm-quick-promo-presets">
                    <span className="pm-qs-label">⚡ 1-Click Discount Presets:</span>
                    <div className="pm-qs-chips">
                      <button
                        type="button"
                        className="pm-qs-chip promo"
                        onClick={() => {
                          set('discountBadge', '🔥 Black November: 20% OFF');
                          set('sizes', formData.sizes.map(s => {
                            const cur = parseFloat(s.price) || 0;
                            if (cur <= 0) return s;
                            const orig = s.originalPrice ? parseFloat(s.originalPrice) : Math.round(cur / 0.8);
                            return { ...s, price: Math.round(orig * 0.8), originalPrice: orig };
                          }));
                        }}
                      >
                        🔥 20% Off All Sizes
                      </button>
                      <button
                        type="button"
                        className="pm-qs-chip promo"
                        onClick={() => {
                          set('discountBadge', '⚡ Black November: 25% OFF');
                          set('sizes', formData.sizes.map(s => {
                            const cur = parseFloat(s.price) || 0;
                            if (cur <= 0) return s;
                            const orig = s.originalPrice ? parseFloat(s.originalPrice) : Math.round(cur / 0.75);
                            return { ...s, price: Math.round(orig * 0.75), originalPrice: orig };
                          }));
                        }}
                      >
                        ⚡ 25% Off All Sizes
                      </button>
                      <button
                        type="button"
                        className="pm-qs-chip promo"
                        onClick={() => {
                          set('discountBadge', '💥 Black November: 30% OFF');
                          set('sizes', formData.sizes.map(s => {
                            const cur = parseFloat(s.price) || 0;
                            if (cur <= 0) return s;
                            const orig = s.originalPrice ? parseFloat(s.originalPrice) : Math.round(cur / 0.7);
                            return { ...s, price: Math.round(orig * 0.7), originalPrice: orig };
                          }));
                        }}
                      >
                        💥 30% Off All Sizes
                      </button>
                      <button
                        type="button"
                        className="pm-qs-chip"
                        onClick={() => {
                          set('discountBadge', '');
                          set('sizes', formData.sizes.map(s => ({
                            ...s,
                            originalPrice: ''
                          })));
                        }}
                      >
                        ✕ Clear Promo / Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 1.4: Roast Level & Harvest Origin ── */}
              <div className="pm-streamlined-card">
                <div className="pm-card-section-title">
                  <span>🔥 Coffee Roast Level &amp; Origin</span>
                  <div className="pm-qs-chips">
                    {ROAST_LEVELS.map(r => {
                      const isSel = formData.roastLevel?.toLowerCase() === r.value.toLowerCase() || formData.roastLevel?.toLowerCase() === r.label.toLowerCase();
                      return (
                        <button
                          key={r.value}
                          type="button"
                          className={`pm-qs-chip ${isSel ? 'promo' : ''}`}
                          onClick={() => updateRoastLevel(r.label)}
                        >
                          {r.emoji} {r.label}
                        </button>
                      );
                    })}
                    {formData.roastLevel && (
                      <button
                        type="button"
                        className="pm-qs-chip"
                        onClick={() => updateRoastLevel('')}
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginTop: '0.85rem' }}>
                  <div className="pm-field">
                    <label>Roast Level / Profile Name</label>
                    <input
                      type="text"
                      value={formData.roastLevel}
                      onChange={e => updateRoastLevel(e.target.value)}
                      placeholder="e.g. Light, Medium, Dark, Espresso, or Custom..."
                    />
                    <span className="pm-field-hint">Select a preset above or type custom. Dynamically creates the shop's roast filter pill.</span>
                  </div>
                  <div className="pm-field">
                    <label>Harvest Origin / Terroir</label>
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={e => updateOrigin(e.target.value)}
                      placeholder="e.g. Nandi Hills, Bomet (2,000m ASL)"
                    />
                    <span className="pm-field-hint">Displayed on storefront coffee cards and modal</span>
                  </div>
                </div>
              </div>

              {/* ── Card 1.5: Select Grind Profile ── */}
              <div className="pm-streamlined-card pm-grind-profile-card">
                <div className="pm-card-section-title">
                  <span>☕ Select Grind Profile</span>
                  <div className="pm-qs-chips">
                    <button
                      type="button"
                      className="pm-qs-chip"
                      onClick={selectAllGrinds}
                    >
                      ✓ All 5 Profiles
                    </button>
                    <button
                      type="button"
                      className="pm-qs-chip"
                      onClick={selectWholeBeansOnly}
                    >
                      Whole Beans Only
                    </button>
                  </div>
                </div>
                <p className="pm-field-hint" style={{ marginBottom: '0.85rem' }}>
                  Choose which grind profiles customers can select for this coffee. Click cards to toggle.
                </p>

                <div className="pm-grind-options-grid">
                  {[
                    { name: 'Whole Beans', icon: '🫘', desc: 'Fresh roasted whole beans' },
                    { name: 'French Press', icon: '⚱️', desc: 'Coarse immersion grind' },
                    { name: 'Pour-Over', icon: '☕', desc: 'Medium-fine drip & V60 grind' },
                    { name: 'AeroPress', icon: '⏳', desc: 'Fine-medium pressure grind' },
                    { name: 'Espresso', icon: '⚡', desc: 'Fine 9-bar espresso grind' }
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

              {/* ── Card 2: Warehouse Stock & Inventory ── */}
              <div className="pm-streamlined-card">
                <div className="pm-card-section-title">
                  <span>📦 Warehouse Stock &amp; Availability</span>
                </div>
                <div className="stock-cards">
                  <div className="stock-card">
                    <div className="stock-card-icon green"><FaCheckCircle /></div>
                    <div className="pm-field" style={{ flex: 1 }}>
                      <label>Physical Stock <span className="req">*</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          value={formData.inventory.physicalStock ?? ''}
                          onChange={e => set('inventory', { ...formData.inventory, physicalStock: e.target.value })}
                          onFocus={e => e.target.select()}
                          placeholder="0"
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
                      <span className="pm-field-hint">Current actual units in inventory</span>
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
                        onFocus={e => e.target.select()}
                        placeholder="5"
                        min="0"
                      />
                      <span className="pm-field-hint">Triggers low stock telemetry on storefront</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 3: Compact Media (Images) ── */}
              <div className="pm-streamlined-card">
                <div className="pm-card-section-title">
                  <span>🖼️ Product Images ({images.length})</span>
                </div>
                <div className="pm-media-compact-strip">
                  {images.map((img, i) => (
                    <div key={i} className="pm-thumb-compact">
                      <img src={img.url} alt={`thumb-${i}`} />
                      <button
                        type="button"
                        className="pm-thumb-remove-btn"
                        title="Remove image"
                        onClick={() => removeImage(i)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="pm-media-add-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload />
                    <span>+ Add</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => processFiles(e.target.files)}
                  />
                </div>
              </div>

              {/* ── Card 4: Additional Details & Custom Attributes (Collapsible) ── */}
              <div className="pm-advanced-accordion">
                <button
                  type="button"
                  className="pm-advanced-accordion-btn"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span>⚙️ Additional Details, Tags &amp; Category Attributes</span>
                  <span>{showAdvanced ? '▲ Hide' : '▼ Show'}</span>
                </button>
                {showAdvanced && (
                  <div className="pm-advanced-content">
                    <div className="pm-row">
                      <div className="pm-field">
                        <label>Badge Label</label>
                        <input
                          type="text"
                          value={formData.badge || ''}
                          onChange={e => set('badge', e.target.value)}
                          placeholder="e.g. Best Seller, New Arrival, Limited Lot"
                        />
                      </div>
                      <div className="pm-field">
                        <label>Tags <span className="hint">(comma separated)</span></label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={e => set('tags', e.target.value)}
                          placeholder="specialty, arabica, beans"
                        />
                      </div>
                    </div>

                    {customCategoryAttributes.length > 0 && (
                      <div className="pm-custom-attributes-grid" style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                        {customCategoryAttributes.map(attr => (
                          <div key={attr.key} className="pm-field">
                            <label>
                              {attr.label} {attr.required && <span className="req">*</span>} {attr.unit && <span className="hint">({attr.unit})</span>}
                            </label>
                            {attr.type === 'select' ? (
                              <select
                                value={formData.categoryAttributes[attr.key] || attr.defaultValue || ''}
                                onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.value })}
                                required={attr.required}
                              >
                                <option value="">Select option...</option>
                                {attr.options && attr.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : attr.type === 'boolean' ? (
                              <input
                                type="checkbox"
                                checked={!!(formData.categoryAttributes[attr.key] ?? attr.defaultValue ?? false)}
                                onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.checked })}
                              />
                            ) : attr.type === 'number' ? (
                              <input
                                type="number"
                                value={formData.categoryAttributes[attr.key] ?? ''}
                                onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.value })}
                                onFocus={e => e.target.select()}
                                placeholder={`Enter ${attr.label.toLowerCase()}`}
                                required={attr.required}
                              />
                            ) : (
                              <input
                                type="text"
                                value={formData.categoryAttributes[attr.key] ?? attr.defaultValue ?? ''}
                                onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.value })}
                                placeholder={`Enter ${attr.label.toLowerCase()}`}
                                required={attr.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pm-form-footer">
              <button type="button" className="btn-pm-cancel" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-pm-save" disabled={saving}>
                {saving ? 'Saving...' : (product ? '💾 Save Updates' : '✨ Create Product')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="pm-modal-body">
              {/* LEFT nav */}
              <nav className="pm-form-nav">
                {SECTIONS.map(sec => (
                  <button key={sec.id} type="button"
                    className={`pm-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(sec.id)}>
                    <span className="pm-nav-icon">{sec.icon}</span>
                    {sec.label}
                  </button>
                ))}

                {/* Mini Preview */}
                <div className="pm-mini-preview">
                  {primaryImage
                    ? <img src={primaryImage.url} alt="preview" />
                    : <div className="pm-preview-placeholder" style={{ fontSize: '2.5rem' }}>{catObj?.icon || '📦'}</div>}
                  <p className="pm-preview-name">{formData.name || 'Product name'}</p>
                  <p className="pm-preview-price">
                    {formData.sizes?.[0]?.price ? `KES ${parseFloat(formData.sizes[0].price).toLocaleString()}` : 'No price set'}
                  </p>
                  <div className="pm-preview-cat" style={{ color: catObj?.color || '#9ca3af' }}>
                    {catObj?.icon} {catObj?.label || formData.category}
                  </div>
                  <div className="pm-preview-tags">
                    {formData.isFeatured && <span className="preview-tag gold"><FaStar /> Featured</span>}
                    {(formData.inventory?.stock || 0) <= 10 && <span className="preview-tag red"><FaBell /> Low stock</span>}
                  </div>
                </div>
              </nav>

              {/* RIGHT form */}
              <form className="pm-form" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* ═══ BASIC INFO ═══ */}
              {activeSection === 'basic' && (
                <motion.div key="basic" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title">🏷️ Basic Information</h3>

                  <div className="pm-field">
                    <label>Product Name <span className="req">*</span></label>
                    <input type="text" value={formData.name} onChange={e => set('name', e.target.value)}
                      placeholder="e.g., Rerendet AA Premium Blend" required />
                  </div>

                  <div className="pm-field">
                    <label>Description <span className="req">*</span></label>
                    <textarea value={formData.description} onChange={e => set('description', e.target.value)}
                      rows={5} placeholder="Describe the product..." required />
                  </div>

                  <div className="pm-row">
                    <div className="pm-field">
                      <label>Badge Label</label>
                      <input type="text" value={formData.badge} onChange={e => set('badge', e.target.value)}
                        placeholder="e.g., Best Seller, New Arrival" />
                    </div>
                    <div className="pm-field">
                      <label>Tags <span className="hint">(comma separated)</span></label>
                      <input type="text" value={formData.tags} onChange={e => set('tags', e.target.value)}
                        placeholder="premium, organic, handmade" />
                    </div>
                  </div>

                  {/* ── Category Selector ── */}
                  <div className="pm-field">
                    <div className="pm-field-label-row">
                      <label>Category <span className="req">*</span></label>
                      <button type="button" className="btn-inline-add" onClick={onAddCategory}>
                        <FaPlus /> Add Category
                      </button>
                    </div>
                    <div className="category-selector">
                      {allCategories.map(cat => (
                        <button key={cat.value} type="button"
                          className={`cat-option ${formData.category === cat.value ? 'active' : ''}`}
                          style={{ '--cat-color': cat.color || '#D4AF37' }}
                          onClick={() => handleCategoryChange(cat.value)}>
                          <span className="cat-icon">{cat.icon}</span>
                          <span>{cat.label}</span>
                          {formData.category === cat.value && <FaCheck className="cat-check" />}
                        </button>
                      ))}
                    </div>
                    {formData.category && (
                      <p className="pm-field-hint" style={{ marginTop: '0.5rem' }}>
                        {cfg.detailsHint}
                      </p>
                    )}
                  </div>

                  <div className="pm-field">
                    <label>
                      <input type="checkbox" checked={formData.isFeatured}
                        onChange={e => set('isFeatured', e.target.checked)}
                        style={{ marginRight: '0.5rem', accentColor: 'var(--color-primary)' }} />
                      Feature this product on homepage
                    </label>
                  </div>
                </motion.div>
              )}

              {/* ═══ PRICING ═══ */}
              {activeSection === 'pricing' && (
                <motion.div key="pricing" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title">💰 Sizes &amp; Pricing</h3>
                  <p className="pm-section-hint">Add one or more size/variant options with prices. Use names that make sense for <strong>{catObj?.label || formData.category}</strong>.</p>

                  <div className="pm-quick-sizes-bar">
                    <span className="pm-qs-label">⚡ Quick Add Variant:</span>
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
                      const savingsAmt = hasDiscount ? (Number(size.originalPrice) - Number(size.price)) : 0;

                      return (
                        <motion.div key={i} className="size-row-premium"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <div className="size-num">{i + 1}</div>
                          <div className="pm-field flex-1">
                            <label>Size / Variant</label>
                            <div className="size-input-combo">
                              <select value={cfg.sizeOptions.includes(size.size) ? size.size : '__custom__'}
                                onChange={e => {
                                  if (e.target.value !== '__custom__') updateSize(i, 'size', e.target.value);
                                }}>
                                {cfg.sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="__custom__">✏️ Custom…</option>
                              </select>
                              {(!cfg.sizeOptions.includes(size.size) || size.size === '') && (
                                <input type="text" value={size.size} className="size-custom-input"
                                  onChange={e => updateSize(i, 'size', e.target.value)}
                                  placeholder={cfg.sizePlaceholder} />
                              )}
                            </div>
                          </div>

                          <div className="pm-field flex-1">
                            <label>Selling Price (KES) <span className="req">*</span></label>
                            <input
                              type="number"
                              value={size.price ?? ''}
                              onChange={e => updateSize(i, 'price', e.target.value)}
                              onFocus={e => e.target.select()}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="pm-field flex-1">
                            <label>Original Price (KES) <span className="hint">(Crossed-out)</span></label>
                            <input
                              type="number"
                              value={size.originalPrice ?? ''}
                              onChange={e => updateSize(i, 'originalPrice', e.target.value)}
                              onFocus={e => e.target.select()}
                              placeholder="e.g. 2400 (Old price)"
                              min="0"
                              step="0.01"
                            />
                          </div>

                          {hasDiscount && (
                            <div className="size-discount-chip" title={`Save KES ${savingsAmt.toLocaleString()}`}>
                              <span>-{discountPct}%</span>
                            </div>
                          )}

                          {formData.sizes.length > 1 && (
                            <button type="button" className="size-remove-btn" onClick={() => removeSize(i)}><FaTimes /></button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="pm-sizes-action-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-add-size" onClick={addSize}>
                      <FaPlus /> Add Another Variant
                    </button>
                  </div>

                  {/* ── Black November & Promotional Campaign Block ── */}
                  <div className="pm-promo-campaign-box">
                    <div className="pm-promo-header">
                      <span className="pm-promo-badge">🔥 Black November & Seasonal Campaigns</span>
                      <p className="pm-promo-desc">
                        Set a promotional discount badge and crossed-out old prices to highlight Black November deals.
                      </p>
                    </div>

                    <div className="pm-field">
                      <label>Promotional Badge / Banner Text</label>
                      <input
                        type="text"
                        value={formData.discountBadge || ''}
                        onChange={e => set('discountBadge', e.target.value)}
                        placeholder="e.g. 🔥 Black November: 25% OFF / Limited Harvest Sale"
                      />
                    </div>

                    <div className="pm-quick-promo-presets">
                      <span className="pm-qs-label">⚡ Quick Black November Presets:</span>
                      <div className="pm-qs-chips">
                        <button
                          type="button"
                          className="pm-qs-chip promo"
                          onClick={() => {
                            set('discountBadge', '🔥 Black November: 20% OFF');
                            // Apply 20% off to all sizes (set originalPrice if not set)
                            set('sizes', formData.sizes.map(s => {
                              const cur = parseFloat(s.price) || 0;
                              if (cur <= 0) return s;
                              const orig = s.originalPrice ? parseFloat(s.originalPrice) : Math.round(cur / 0.8);
                              const sale = Math.round(orig * 0.8);
                              return { ...s, price: sale, originalPrice: orig };
                            }));
                          }}
                        >
                          🔥 20% Off All Sizes
                        </button>

                        <button
                          type="button"
                          className="pm-qs-chip promo"
                          onClick={() => {
                            set('discountBadge', '⚡ Black November: 25% OFF');
                            set('sizes', formData.sizes.map(s => {
                              const cur = parseFloat(s.price) || 0;
                              if (cur <= 0) return s;
                              const orig = s.originalPrice ? parseFloat(s.originalPrice) : Math.round(cur / 0.75);
                              const sale = Math.round(orig * 0.75);
                              return { ...s, price: sale, originalPrice: orig };
                            }));
                          }}
                        >
                          ⚡ 25% Off All Sizes
                        </button>

                        <button
                          type="button"
                          className="pm-qs-chip promo"
                          onClick={() => {
                            set('discountBadge', '💥 Black November: 30% OFF');
                            set('sizes', formData.sizes.map(s => {
                              const cur = parseFloat(s.price) || 0;
                              if (cur <= 0) return s;
                              const orig = s.originalPrice ? parseFloat(s.originalPrice) : Math.round(cur / 0.7);
                              const sale = Math.round(orig * 0.7);
                              return { ...s, price: sale, originalPrice: orig };
                            }));
                          }}
                        >
                          💥 30% Off All Sizes
                        </button>

                        <button
                          type="button"
                          className="pm-qs-chip"
                          onClick={() => {
                            set('discountBadge', '');
                            set('sizes', formData.sizes.map(s => ({
                              ...s,
                              originalPrice: ''
                            })));
                          }}
                        >
                          ✕ Clear Promo / Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {formData.sizes.some(s => s.price) && (
                    <div className="pricing-summary">
                      <h4>Price Range</h4>
                      <div className="price-range">
                        <span>From</span>
                        <strong>KES {Math.min(...formData.sizes.map(s => parseFloat(s.price) || 0)).toLocaleString()}</strong>
                        <span>to</span>
                        <strong>KES {Math.max(...formData.sizes.map(s => parseFloat(s.price) || 0)).toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ DETAILS (category-aware) ═══ */}
              {activeSection === 'details' && (
                <motion.div key="details" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title">📋 Product Details</h3>
                  <p className="pm-section-hint">Provide specific details for this category to help customers filter and browse.</p>

                  {customCategoryAttributes.length > 0 && (
                    customCategoryAttributes.map(attr => (
                      <div key={attr.key} className="pm-field">
                        <label>
                          {attr.label} {attr.required && <span className="req">*</span>} {attr.unit && <span className="hint">({attr.unit})</span>}
                        </label>
                        {attr.type === 'select' ? (
                          <select
                            value={formData.categoryAttributes[attr.key] || attr.defaultValue || ''}
                            onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.value })}
                            required={attr.required}
                          >
                            <option value="">Select option...</option>
                            {attr.options && attr.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : attr.type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={!!(formData.categoryAttributes[attr.key] ?? attr.defaultValue ?? false)}
                            onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.checked })}
                          />
                        ) : attr.type === 'number' ? (
                          <input
                            type="number"
                            value={formData.categoryAttributes[attr.key] ?? ''}
                            onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.value })}
                            onFocus={e => e.target.select()}
                            placeholder={`Enter ${attr.label.toLowerCase()}`}
                            required={attr.required}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData.categoryAttributes[attr.key] ?? attr.defaultValue ?? ''}
                            onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: e.target.value })}
                            placeholder={`Enter ${attr.label.toLowerCase()}`}
                            required={attr.required}
                          />
                        )}
                      </div>
                    ))
                  )}

                  {/* ── Coffee Specific Details (only for Coffee category or when generic) ── */}
                  {(catObj?.slug?.includes('coffee') || formData.category?.toLowerCase().includes('coffee') || !catObj) && (
                    <>
                      <div className="pm-field" style={{ marginTop: '1.25rem', borderTop: '1px solid var(--admin-border, #334155)', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <label style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                            🔥 Coffee Roast Level
                          </label>
                          <div className="pm-qs-chips">
                            {ROAST_LEVELS.map(r => {
                              const isSel = formData.roastLevel?.toLowerCase() === r.value.toLowerCase() || formData.roastLevel?.toLowerCase() === r.label.toLowerCase();
                              return (
                                <button
                                  key={r.value}
                                  type="button"
                                  className={`pm-qs-chip ${isSel ? 'promo' : ''}`}
                                  onClick={() => updateRoastLevel(r.label)}
                                >
                                  {r.emoji} {r.label}
                                </button>
                              );
                            })}
                            {formData.roastLevel && (
                              <button
                                type="button"
                                className="pm-qs-chip"
                                onClick={() => updateRoastLevel('')}
                              >
                                ✕ Clear
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={formData.roastLevel}
                          onChange={e => updateRoastLevel(e.target.value)}
                          placeholder="e.g. Light, Medium, Dark, Espresso, or Custom Roast Profile..."
                        />
                        <span className="pm-field-hint">
                          Selected roast level appears on the storefront card and dynamically creates the roast filter pill on the customer shop.
                        </span>
                      </div>

                      <div className="pm-field" style={{ marginTop: '1rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          🌱 Coffee Origin / Terroir
                        </label>
                        <input
                          type="text"
                          value={formData.origin}
                          onChange={e => updateOrigin(e.target.value)}
                          placeholder="e.g. Nandi Hills, Bomet (2,000m ASL)"
                        />
                        <span className="pm-field-hint">
                          Origin region shown on coffee card badges and modal.
                        </span>
                      </div>

                      {/* ── Coffee Grind Profile Configuration ── */}
                      <div className="pm-field" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--admin-border, #334155)', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <label style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                            ☕ Select Grind Profile
                          </label>
                          <div className="pm-qs-chips">
                            <button
                              type="button"
                              className="pm-qs-chip"
                              onClick={selectAllGrinds}
                            >
                              ✓ All 5 Profiles
                            </button>
                            <button
                              type="button"
                              className="pm-qs-chip"
                              onClick={selectWholeBeansOnly}
                            >
                              Whole Beans Only
                            </button>
                          </div>
                        </div>
                        <span className="pm-field-hint">
                          Choose which grind options customers can select when ordering this coffee. Click to toggle.
                        </span>

                        <div className="pm-grind-options-grid" style={{ marginTop: '0.75rem' }}>
                          {[
                            { name: 'Whole Beans', icon: '🫘', desc: 'Fresh roasted whole beans' },
                            { name: 'French Press', icon: '⚱️', desc: 'Coarse immersion grind' },
                            { name: 'Pour-Over', icon: '☕', desc: 'Medium-fine drip & V60 grind' },
                            { name: 'AeroPress', icon: '⏳', desc: 'Fine-medium pressure grind' },
                            { name: 'Espresso', icon: '⚡', desc: 'Fine 9-bar espresso grind' }
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
                    </>
                  )}

                  {customCategoryAttributes.length === 0 && !catObj?.slug?.includes('coffee') && !formData.category?.toLowerCase().includes('coffee') && (
                    <div className="pm-no-coffee">
                      <span style={{ fontSize: '2.5rem' }}>{catObj?.icon || '📦'}</span>
                      <p>No specific extra details for this category. You can add product specifics in the <strong>Tags</strong> field (Basic Info tab) or add info in the description.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ MEDIA ═══ */}
              {activeSection === 'media' && (
                <motion.div key="media" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title">🖼️ Product Images</h3>
                  <p className="pm-section-hint">Upload up to 6 images. First image will be the main display image.</p>
                  <div className={`drop-zone ${dragOver ? 'drag-active' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}>
                    <FaUpload className="drop-icon" />
                    <p className="drop-title">Drop images here or click to browse</p>
                    <p className="drop-hint">JPG, PNG, WebP — max 5MB each</p>
                    <input type="file" ref={fileInputRef} multiple accept="image/*"
                      style={{ display: 'none' }} onChange={e => processFiles(e.target.files)} />
                  </div>
                  {images.length > 0 && (
                    <div className="image-grid">
                      {images.map((img, i) => (
                        <motion.div key={i} className={`image-tile ${i === 0 ? 'primary' : ''}`}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                          <img src={img.url} alt={`img-${i}`} />
                          {i === 0 && <span className="primary-badge">Main</span>}
                          {img.file && <span className="new-badge">New</span>}
                          <button type="button" className="img-remove-btn" onClick={() => removeImage(i)}><FaTimes /></button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ INVENTORY ═══ */}
              {activeSection === 'stock' && (
                <motion.div key="stock" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title">📦 Inventory Management</h3>
                  <div className="stock-cards">
                    <div className="stock-card">
                      <div className="stock-card-icon green"><FaCheckCircle /></div>
                      <div className="pm-field">
                        <label>Physical Stock <span className="req">*</span></label>
                        <input
                          type="number"
                          value={formData.inventory.physicalStock ?? ''}
                          onChange={e => set('inventory', { ...formData.inventory, physicalStock: e.target.value })}
                          onFocus={e => e.target.select()}
                          placeholder="0"
                          min="0"
                          required
                        />
                        <span className="pm-field-hint">Actual physical stock in warehouse</span>
                      </div>
                    </div>
                    <div className="stock-card">
                      <div className="stock-card-icon amber"><FaBell /></div>
                      <div className="pm-field">
                        <label>Low Stock Alert Threshold</label>
                        <input
                          type="number"
                          value={formData.inventory.lowStockThreshold ?? ''}
                          onChange={e => set('inventory', { ...formData.inventory, lowStockThreshold: e.target.value })}
                          onFocus={e => e.target.select()}
                          placeholder="5"
                          min="0"
                        />
                        <span className="pm-field-hint">Alert threshold configured for warnings</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Footer */}
            <div className="pm-form-footer">
              <button type="button" className="btn-pm-cancel" onClick={onClose} disabled={saving}>Cancel</button>
              <div className="pm-form-footer-right">
                {activeSection !== 'stock' && (
                  <button type="button" className="btn-pm-next" onClick={() => {
                    const ids = ['basic', 'pricing', 'details', 'media', 'stock'];
                    const next = ids.indexOf(activeSection) + 1;
                    if (next < ids.length) setActiveSection(ids[next]);
                  }}>Next →</button>
                )}
                <button type="submit" className="btn-pm-save" disabled={saving}>
                  {saving
                    ? <span className="saving-dots"><span>Saving</span><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></span>
                    : product ? '💾 Update Product' : '✨ Create Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
        </>
      )}
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

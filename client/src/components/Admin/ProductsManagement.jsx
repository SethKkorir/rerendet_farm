// components/Admin/ProductsManagement.jsx — Category-Aware Rewrite
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaBox, FaUpload,
  FaTimes, FaTag, FaStar, FaCoffee, FaLeaf,
  FaGlobe, FaLayerGroup, FaBoxOpen, FaBell, FaCheckCircle,
  FaTools, FaShoppingBag, FaGift, FaCheck, FaCog, FaEye, FaEyeSlash
} from 'react-icons/fa';
import './ProductsManagement.css';
import { updateProductStock } from '../../api/api';

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

  // All categories mapped, visible filter excludes hidden
  const allCategories = categoriesList.map(c => ({
    value: c._id,
    slug: c.slug,
    label: c.name,
    icon: c.icon || '📦',
    color: '#D4AF37',
    attributeSchema: c.attributeSchema,
    isCustom: true
  }));
  const visibleCategories = allCategories.filter(c => !hiddenCategories.includes(c.value));

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

  const getCatLabel = (val) => {
    const catId = val?._id || val;
    return allCategories.find(c => c.value === catId || c.slug === catId)?.label || val;
  };

  return (
    <div className="products-management">
      {/* ── Header ── */}
      <div className="pm-header">
        <div>
          <h1 className="pm-title">Products</h1>
          <p className="pm-subtitle">{products.length} products in catalogue</p>
        </div>
        <div className="pm-header-actions">
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>⊞</button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>☰</button>
          </div>
          <button className="btn-add-product" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="pm-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Search products..." value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))} />
        </div>
        <div className="category-pills">
          {[{ value: 'all', label: 'All', icon: '🗂️' }, ...visibleCategories].map(cat => (
            <button key={cat.value}
              className={`cat-pill ${filters.category === cat.value ? 'active' : ''}`}
              onClick={() => setFilters(p => ({ ...p, category: cat.value, page: 1 }))}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
          <button className="cat-pill cat-pill-add" onClick={handleAddCategory} title="Add new category">
            <FaPlus /> New Category
          </button>
          <button
            className="cat-pill cat-pill-manage"
            onClick={() => setShowCatManager(true)}
            title="Manage categories: hide or delete">
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
          {products.map((product, i) => (
            <motion.div key={product._id}
              className={`product-card ${selectedProducts.includes(product._id) ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="card-select">
                <input type="checkbox" checked={selectedProducts.includes(product._id)}
                  onChange={() => handleSelectProduct(product._id)} />
              </div>
              {product.images?.[0] ? (
                <div className="card-image">
                  <img src={product.images[0].url} alt={product.name} />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  {product.isFeatured && <span className="featured-star"><FaStar /></span>}
                </div>
              ) : (
                <div className="card-image placeholder">
                  <span style={{ fontSize: '2rem' }}>{allCategories.find(c => c.value === (product.categoryId?._id || product.categoryId) || c.slug === product.category)?.icon || '📦'}</span>
                  {product.isFeatured && <span className="featured-star"><FaStar /></span>}
                </div>
              )}
              <div className="card-body">
                <div className="card-category" style={{ color: allCategories.find(c => c.value === (product.categoryId?._id || product.categoryId) || c.slug === product.category)?.color || '#9ca3af' }}>
                  {getCatLabel(product.categoryId || product.category)}
                </div>
                <h4 className="card-name">{product.name}</h4>
                {product.origin && <p className="card-origin"><FaGlobe /> {product.origin}</p>}
                <div className="card-prices">
                  {product.sizes?.map((s, idx) => (
                    <span key={idx} className="size-chip">{s.size} <strong>KES {s.price?.toLocaleString()}</strong></span>
                  ))}
                </div>
                {product.flavorNotes?.length > 0 && (
                  <div className="flavor-pills">
                    {product.flavorNotes.slice(0, 3).map((note, idx) => <span key={idx} className="flavor-pill">{note}</span>)}
                  </div>
                )}
                <div className="card-footer" onClick={e => e.stopPropagation()}>
                  <div className="quick-stock-adjust-hardened" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', fontSize: '0.8rem', color: '#a1a1aa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Physical: <strong>{product.inventory?.physicalStock || 0}</strong></span>
                      <span>Reserved: <strong>{product.inventory?.reservedStock || 0}</strong></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span>Available:</span>
                      <span className={`stock-chip ${
                        (product.inventory?.physicalStock - product.inventory?.reservedStock) <= (product.inventory?.lowStockThreshold || 5) ? 'low' : 'ok'
                      }`} style={{ fontWeight: 'bold' }}>
                        {product.inventory?.physicalStock - product.inventory?.reservedStock || 0}
                      </span>
                    </div>
                  </div>
                  <div className="card-actions" style={{ marginTop: '0.5rem' }}>
                    <button className="btn-card-action edit" title="Edit"
                      onClick={() => { setEditingProduct(product); setShowProductModal(true); }}><FaEdit /></button>
                    <button className="btn-card-action delete" title="Delete"
                      onClick={() => handleDeleteProduct(product._id)}><FaTrash /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th><input type="checkbox" onChange={e => setSelectedProducts(e.target.checked ? products.map(p => p._id) : [])}
                  checked={products.length > 0 && selectedProducts.length === products.length} /></th>
                <th>Product</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product._id} className={`product-row ${selectedProducts.includes(product._id) ? 'selected' : ''}`}>
                  <td><input type="checkbox" checked={selectedProducts.includes(product._id)} onChange={() => handleSelectProduct(product._id)} /></td>
                  <td>
                    <div className="table-product-info">
                      {product.images?.[0]
                        ? <img src={product.images[0].url} alt={product.name} className="table-thumb" />
                        : <div className="table-thumb placeholder">{allCategories.find(c => c.value === (product.categoryId?._id || product.categoryId) || c.slug === product.category)?.icon || '📦'}</div>}
                      <div><strong>{product.name}</strong>{product.badge && <span className="table-badge">{product.badge}</span>}</div>
                    </div>
                  </td>
                  <td className="price-col">KES {product.sizes?.[0]?.price?.toLocaleString() || '—'}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                      P: {product.inventory?.physicalStock || 0} | R: {product.inventory?.reservedStock || 0} | 
                      <strong style={{ marginLeft: '0.25rem' }}>
                        Avail: {product.inventory?.physicalStock - product.inventory?.reservedStock || 0}
                      </strong>
                    </div>
                  </td>
                  <td>{getCatLabel(product.categoryId || product.category)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-card-action edit" onClick={() => { setEditingProduct(product); setShowProductModal(true); }}><FaEdit /></button>
                      <button className="btn-card-action delete" onClick={() => handleDeleteProduct(product._id)}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const [activeSection, setActiveSection] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flavorInput, setFlavorInput] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sizes: product?.sizes || [{ size: '250g', price: '' }],
    category: product?.categoryId?._id || product?.categoryId || product?.category || '',
    categoryAttributes: product?.categoryAttributes || {},
    roastLevel: product?.roastLevel || '',
    origin: product?.origin || '',
    flavorNotes: product?.flavorNotes || [],
    badge: product?.badge || '',
    material: product?.material || '',
    brand: product?.brand || '',
    capacity: product?.capacity || '',
    inventory: {
      physicalStock: product?.inventory?.physicalStock ?? 0,
      lowStockThreshold: product?.inventory?.lowStockThreshold ?? 5,
    },
    tags: product?.tags?.join(', ') || '',
    isFeatured: product?.isFeatured || false,
  });
  const [images, setImages] = useState(product?.images || []);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const catObj = allCategories.find(c => c.value === formData.category || c.slug === formData.category);
  const cfg = getCategoryConfig(catObj?.slug || formData.category);

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
  const addSize = () => set('sizes', [...formData.sizes, { size: 'Standard', price: '' }]);
  const removeSize = (i) => set('sizes', formData.sizes.filter((_, idx) => idx !== i));
  const updateSize = (i, field, value) => set('sizes', formData.sizes.map((s, idx) =>
    idx === i ? { ...s, [field]: field === 'price' ? (value === '' ? '' : parseFloat(value) || 0) : value } : s
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
    const stock = parseInt(formData.inventory.stock || formData.inventory.physicalStock);
    if (isNaN(stock) || stock < 0) { showAlert('Stock must be a valid number ≥ 0.', 'error'); return; }

    setSaving(true);
    try {
      const authToken = getToken();
      if (!authToken) { showAlert('Session expired. Please log in again.', 'error'); return; }

      const url = product ? `/api/admin/products/${product._id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sizes: formData.sizes.map(s => ({ size: s.size, price: parseFloat(s.price) })),
        categoryId: formData.category,
        categoryAttributes: formData.categoryAttributes,
        badge: formData.badge.trim(),
        inventory: { 
          physicalStock: stock, 
          lowStockThreshold: parseInt(formData.inventory.lowStockThreshold) || 5 
        },
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
              <h2>{product ? 'Edit Product' : 'New Product'}</h2>
              {product && <span className="pm-modal-subtitle">{product.name}</span>}
            </div>
          </div>
          <button className="pm-close-btn" onClick={onClose}><FaTimes /></button>
        </div>

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

                  <div className="sizes-builder">
                    {formData.sizes.map((size, i) => (
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
                          <label>Price (KES)</label>
                          <input type="number" value={size.price}
                            onChange={e => updateSize(i, 'price', e.target.value)}
                            placeholder="0.00" min="0" step="0.01" required />
                        </div>
                        {formData.sizes.length > 1 && (
                          <button type="button" className="size-remove-btn" onClick={() => removeSize(i)}><FaTimes /></button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <button type="button" className="btn-add-size" onClick={addSize}>
                    <FaPlus /> Add Another Variant
                  </button>

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

                  {catObj && catObj.attributeSchema && catObj.attributeSchema.length > 0 ? (
                    catObj.attributeSchema.map(attr => (
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
                            value={formData.categoryAttributes[attr.key] ?? attr.defaultValue ?? ''}
                            onChange={e => set('categoryAttributes', { ...formData.categoryAttributes, [attr.key]: parseFloat(e.target.value) || '' })}
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
                  ) : (
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
                        <input type="number"
                          value={formData.inventory.physicalStock}
                          onChange={e => set('inventory', { ...formData.inventory, physicalStock: parseInt(e.target.value) || 0 })}
                          min="0" required />
                        <span className="pm-field-hint">Actual physical stock in warehouse</span>
                      </div>
                    </div>
                    <div className="stock-card">
                      <div className="stock-card-icon amber"><FaBell /></div>
                      <div className="pm-field">
                        <label>Low Stock Alert Threshold</label>
                        <input type="number"
                          value={formData.inventory.lowStockThreshold}
                          onChange={e => set('inventory', { ...formData.inventory, lowStockThreshold: parseInt(e.target.value) || 5 })}
                          min="0" />
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

import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaEye, FaTimes, FaPlus, FaLeaf, FaShoppingBag,
  FaTag, FaBoxOpen, FaGlobe, FaFire,
  FaStar, FaShieldAlt, FaArrowRight, FaCheck
} from 'react-icons/fa';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll, useMotionTemplate } from 'framer-motion';
import FloatingBeans from '../UI/FloatingBeans';
import AdPlacement from '../AdPlacement/AdPlacement';
import { isFreshlyRoasted } from '../../utils/productHelpers';
import './CoffeeShop.css';

/* ─── Helpers ──────────────────────────────────────────── */
const getProductImage = (product) => {
  if (product?.images?.length > 0 && product.images[0].url) return product.images[0].url;
  if (product?.image) return product.image;
  return `https://via.placeholder.com/600x600/1a1714/D4AF37?text=${encodeURIComponent(product?.name || 'Product')}`;
};

const isInStock = (product) => {
  if (product?.inventory?.stock !== undefined) return product.inventory.stock > 0;
  return product?.inStock !== false;
};

const CAT_META = {
  'coffee-beans': { icon: '◉', label: 'Coffee Beans', color: '#D4AF37', accent: '#b8932a', cardType: 'coffee' },
  'brewing-equipment': { icon: '◈', label: 'Brewing Equipment', color: '#60a5fa', accent: '#3b82f6', cardType: 'equipment' },
  'accessories': { icon: '◆', label: 'Accessories', color: '#a78bfa', accent: '#8b5cf6', cardType: 'generic' },
  'merchandise': { icon: '◇', label: 'Merchandise', color: '#34d399', accent: '#10b981', cardType: 'generic' },
};
const getCatMeta = (cat) => CAT_META[cat] || { icon: '◎', label: cat || 'Product', color: '#94a3b8', accent: '#64748b', cardType: 'generic' };

/* ─── Tilt Card Hook ────────────────────────────────────── */
const useTilt = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mx = useSpring(x, { stiffness: 150, damping: 20 });
  const my = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(my, [-0.5, 0.5], ['8deg', '-8deg']);
  const rotateY = useTransform(mx, [-0.5, 0.5], ['-8deg', '8deg']);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return { rotateX, rotateY, onMove, onLeave };
};

/* ─── Product Card ──────────────────────────────────────── */
const ProductCard = ({ product, index, handleAddToCart, addingToCart, setSelectedProduct }) => {
  const { rotateX, rotateY, onMove, onLeave } = useTilt();
  const [hovered, setHovered] = useState(false);
  const productInStock = isInStock(product);
  const fresh = product.category === 'coffee-beans' && isFreshlyRoasted(product.roastDate);
  const meta = getCatMeta(product.category);
  const adding = addingToCart === product.variationKey;

  return (
    <motion.div
      className="cs-card-outer"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className={`cs-card cs-card--${meta.cardType}${!productInStock ? ' cs-card--oos' : ''}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.015 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* ── Glow layer ── */}
        <div className="cs-card-glow" style={{ '--glow': meta.color }} />

        {/* ── Image zone ── */}
        <div className="cs-img-zone" style={{ transform: 'translateZ(30px)' }}>
          <Link to={`/product/${product.seo?.slug || product._id}`} className="cs-img-link">
            <motion.img
              src={getProductImage(product)}
              alt={product.name}
              className="cs-img"
              animate={{ scale: hovered ? 1.08 : 1, y: hovered ? -6 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/600x600/1a1714/D4AF37?text=${encodeURIComponent(product.name)}`;
              }}
            />
          </Link>

          {/* Category pill */}
          <div className="cs-cat-pill" style={{ '--c': meta.color }}>
            <span className="cs-cat-icon">{meta.icon}</span>
            {meta.label}
          </div>

          {/* Quick view trigger */}
          <AnimatePresence>
            {hovered && (
              <motion.button
                className="cs-quickview-btn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                whileTap={{ scale: 0.94 }}
              >
                <FaEye /> Quick View
              </motion.button>
            )}
          </AnimatePresence>

          {/* Badges */}
          {fresh && (
            <div className="cs-fresh-badge">
              <FaLeaf /> Fresh Roast
            </div>
          )}
          {product.badge && <div className="cs-badge" style={{ '--c': meta.accent }}>{product.badge}</div>}
          {!productInStock && <div className="cs-oos-overlay">Sold Out</div>}

          {/* Stock dot */}
          {product.inventory?.stock !== undefined && productInStock && (
            <div className={`cs-stock-dot ${product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? 'low' : 'ok'}`}>
              {product.inventory.stock <= (product.inventory.lowStockAlert || 5)
                ? `${product.inventory.stock} left`
                : 'In Stock'}
            </div>
          )}
        </div>

        {/* ── Info zone ── */}
        <div className="cs-info" style={{ transform: 'translateZ(20px)' }}>
          {/* Category line */}
          <p className="cs-meta-line" style={{ color: meta.color }}>
            {product.category === 'coffee-beans'
              ? [product.origin, product.roastLevel && `${product.roastLevel} Roast`].filter(Boolean).join(' · ')
              : [product.brand, product.material].filter(Boolean).join(' · ') || meta.label}
          </p>

          {/* Title + price row */}
          <div className="cs-title-row">
            <h3 className="cs-title">{product.name}</h3>
            <div className="cs-price">
              <span className="cs-price-currency">KES</span>
              <span className="cs-price-amount">
                {(product.price?.toLocaleString?.() ?? product.sizes?.[0]?.price?.toLocaleString?.() ?? '—')}
              </span>
            </div>
          </div>

          {/* Flavor / spec pills */}
          <div className="cs-pills">
            {product.category === 'coffee-beans'
              ? product.flavorNotes?.slice(0, 3).map((n, i) => <span key={i} className="cs-pill">{n}</span>)
              : [product.material, product.capacity, ...(product.tags?.slice(0, 2) || [])].filter(Boolean).slice(0, 3).map((t, i) => (
                <span key={i} className="cs-pill">{t}</span>
              ))}
          </div>

          {/* Size if applicable */}
          {product.size && (
            <div className="cs-size-tag">{product.size}</div>
          )}

          {/* CTA */}
          <motion.button
            className={`cs-cta${!productInStock || adding ? ' cs-cta--disabled' : ''}`}
            onClick={() => handleAddToCart(product)}
            disabled={!productInStock || adding}
            whileHover={productInStock && !adding ? { scale: 1.02 } : {}}
            whileTap={productInStock && !adding ? { scale: 0.97 } : {}}
          >
            {adding ? (
              <span className="cs-cta-spinner" />
            ) : !productInStock ? (
              'Sold Out'
            ) : (
              <>
                <FaPlus className="cs-cta-icon" />
                Add to Cart
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Quick View Modal ──────────────────────────────────── */
const QuickViewModal = ({ product, onClose, onAddToCart, addingToCart }) => {
  const meta = getCatMeta(product.category);
  const isCoffee = product.category === 'coffee-beans';
  const productInStock = isInStock(product);
  const adding = addingToCart === product.variationKey;
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    await onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      className="qv-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="qv-panel"
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="qv-accent-bar" style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.accent})` }} />

        <button className="qv-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="qv-grid">
          {/* Left — image */}
          <div className="qv-img-pane">
            <div className="qv-img-bg" style={{ '--glow': meta.color }} />
            <motion.img
              src={getProductImage(product)}
              alt={product.name}
              className="qv-img"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
            {product.badge && (
              <div className="qv-img-badge" style={{ '--c': meta.color }}>{product.badge}</div>
            )}
          </div>

          {/* Right — details */}
          <div className="qv-details">
            {/* Category tag */}
            <div className="qv-cat-tag" style={{ '--c': meta.color }}>
              {meta.icon} {meta.label}
              {isCoffee && product.roastLevel && <span className="qv-roast"> · {product.roastLevel} Roast</span>}
            </div>

            <h2 className="qv-title">{product.name}</h2>

            <p className="qv-origin">
              {isCoffee
                ? [product.origin, product.size].filter(Boolean).join(' · ')
                : [product.brand, product.material, product.capacity, product.size].filter(Boolean).join(' · ')}
            </p>

            {/* Price */}
            <div className="qv-price-row">
              <span className="qv-price-label">KES</span>
              <span className="qv-price-value">{product.price?.toLocaleString?.() ?? '—'}</span>
              {product.badge && <span className="qv-price-badge" style={{ '--c': meta.color }}>{product.badge}</span>}
            </div>

            {/* Description */}
            {product.description && (
              <p className="qv-desc">{product.description}</p>
            )}

            {/* Flavor notes (coffee) */}
            {isCoffee && product.flavorNotes?.length > 0 && (
              <div className="qv-section">
                <p className="qv-section-label">Flavor Notes</p>
                <div className="qv-pills">
                  {product.flavorNotes.map((n, i) => (
                    <span key={i} className="qv-pill" style={{ '--c': meta.color }}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Product details (non-coffee) */}
            {!isCoffee && (product.material || product.brand || product.capacity) && (
              <div className="qv-section">
                <p className="qv-section-label">Details</p>
                <div className="qv-pills">
                  {product.brand && <span className="qv-pill" style={{ '--c': meta.color }}>🏷 {product.brand}</span>}
                  {product.material && <span className="qv-pill" style={{ '--c': meta.color }}>🛡 {product.material}</span>}
                  {product.capacity && <span className="qv-pill" style={{ '--c': meta.color }}>📐 {product.capacity}</span>}
                </div>
              </div>
            )}

            {/* Stock */}
            {product.inventory?.stock !== undefined && (
              <div className={`qv-stock ${product.inventory.stock <= 0 ? 'out' : product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? 'low' : 'ok'}`}>
                <span className="qv-stock-dot" />
                {product.inventory.stock <= 0
                  ? 'Out of stock'
                  : product.inventory.stock <= (product.inventory.lowStockAlert || 5)
                    ? `Only ${product.inventory.stock} units left`
                    : `${product.inventory.stock} units available`}
              </div>
            )}

            {/* CTA */}
            <div className="qv-actions">
              <motion.button
                className={`qv-cta${!productInStock ? ' qv-cta--disabled' : added ? ' qv-cta--added' : ''}`}
                onClick={handleAdd}
                disabled={!productInStock || adding}
                whileHover={productInStock && !adding ? { scale: 1.02 } : {}}
                whileTap={productInStock && !adding ? { scale: 0.97 } : {}}
                style={productInStock ? { '--c': meta.color, '--ca': meta.accent } : {}}
              >
                {added ? (
                  <><FaCheck /> Added!</>
                ) : adding ? (
                  <><span className="cs-cta-spinner" /> Adding…</>
                ) : !productInStock ? (
                  'Out of Stock'
                ) : (
                  <><FaPlus /> Add to Cart</>
                )}
              </motion.button>

              <Link to={`/product/${product.seo?.slug || product._id}`} className="qv-view-link">
                View Full Details <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Category Tab ──────────────────────────────────────── */
const CategoryTab = ({ cat, allProducts, activeCategory, setActiveCategory }) => {
  const meta = cat === 'all'
    ? { icon: '⬡', label: 'All', color: '#D4AF37' }
    : getCatMeta(cat);
  const count = cat === 'all'
    ? allProducts.length
    : allProducts.filter(p => p.category === cat).length;
  const active = activeCategory === cat;

  return (
    <motion.button
      className={`cs-tab${active ? ' cs-tab--active' : ''}`}
      style={active ? { '--c': meta.color } : {}}
      onClick={() => setActiveCategory(cat)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
    >
      <span className="cs-tab-icon" style={active ? { color: meta.color } : {}}>{meta.icon}</span>
      <span className="cs-tab-label">{meta.label}</span>
      <span className="cs-tab-count" style={active ? { background: meta.color, color: '#000' } : {}}>
        {count}
      </span>
    </motion.button>
  );
};

/* ─── Main Shop Component ───────────────────────────────── */
const CoffeeShop = () => {
  const { addToCart, showAlert } = useContext(AppContext);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBeans, setShowBeans] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?isActive=true&limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();

      if (result.success && Array.isArray(result.data?.products)) {
        const expanded = [];
        result.data.products.forEach(product => {
          if (product.sizes?.length > 0) {
            product.sizes.forEach(sizeOpt => {
              expanded.push({
                ...product,
                size: sizeOpt.size,
                price: sizeOpt.price,
                displayName: `${product.name} - ${sizeOpt.size}`,
                selectedSize: sizeOpt.size,
                variationKey: `${product._id}-${sizeOpt.size}`,
              });
            });
          } else {
            expanded.push({
              ...product,
              size: '',
              price: product.price || 0,
              displayName: product.name,
              variationKey: product._id,
            });
          }
        });
        setAllProducts(expanded);
      } else {
        setAllProducts([]);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load products. Please try again.', 'error');
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categoriesInUse = ['all', ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))];
  const displayed = activeCategory === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === activeCategory);

  const handleAddToCart = async (product) => {
    if (!isInStock(product)) return;
    setAddingToCart(product.variationKey);
    if (product.category === 'coffee-beans') {
      setShowBeans(true);
      setTimeout(() => setShowBeans(false), 2000);
    }
    try {
      await addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        size: product.selectedSize || product.size,
        images: product.images || [],
        category: product.category,
        roastLevel: product.roastLevel,
        origin: product.origin,
        flavorNotes: product.flavorNotes,
        badge: product.badge,
        sizes: product.sizes || [],
      }, 1, product.selectedSize || product.size);
      if (selectedProduct) setSelectedProduct(null);
    } catch (err) {
      console.error(err);
      showAlert('Failed to add to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <section id="coffee-shop" className="cs-section">
        <div className="cs-loading">
          <motion.div
            className="cs-loading-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <p className="cs-loading-text">Curating our collection…</p>
        </div>
      </section>
    );
  }

  return (
    <section id="coffee-shop" className="cs-section">
      <FloatingBeans isVisible={showBeans} />

      {/* Background texture */}
      <div className="cs-bg-texture" aria-hidden="true">
        <div className="cs-bg-orb cs-bg-orb--1" />
        <div className="cs-bg-orb cs-bg-orb--2" />
        <div className="cs-bg-grid" />
      </div>

      <div className="cs-container">

        {/* Ad Zone */}
        <AdPlacement zone="homepage" />        {/* ── Premium Header ── */}
        <motion.div 
          className="cs-premium-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="cs-header-accent" />
          <h2 className="cs-premium-title">
            The <span className="gold">Coffee</span> Shop
          </h2>
          <p className="cs-premium-subtitle">Artisan roasts, delivered from our farm to your cup.</p>
        </motion.div>
        {/* ── Category Tabs ── */}
        {categoriesInUse.length > 2 && (
          <motion.div
            className="cs-tabs"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            {categoriesInUse.map(cat => (
              <CategoryTab
                key={cat}
                cat={cat}
                allProducts={allProducts}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
              />
            ))}
          </motion.div>
        )}

        {/* ── Product count / meta line ── */}
        <motion.div
          className="cs-meta-bar"
          key={activeCategory}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="cs-meta-count">
            <strong>{displayed.length}</strong> {displayed.length === 1 ? 'product' : 'products'}
          </span>
          <span className="cs-meta-divider" />
          <span className="cs-meta-label">
            {activeCategory === 'all' ? 'All categories' : getCatMeta(activeCategory).label}
          </span>
        </motion.div>

        {/* ── Grid ── */}
        {displayed.length === 0 ? (
          <div className="cs-empty">
            <span className="cs-empty-icon">◎</span>
            <p>Nothing here yet — check back soon.</p>
          </div>
        ) : (
          <motion.div className="cs-grid" layout>
            <AnimatePresence mode="popLayout">
              {displayed.map((product, index) => (
                <ProductCard
                  key={product.variationKey}
                  product={product}
                  index={index}
                  handleAddToCart={handleAddToCart}
                  addingToCart={addingToCart}
                  setSelectedProduct={setSelectedProduct}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Quick View Modal ── */}
      <AnimatePresence>
        {selectedProduct && (
          <QuickViewModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
            addingToCart={addingToCart}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default CoffeeShop;
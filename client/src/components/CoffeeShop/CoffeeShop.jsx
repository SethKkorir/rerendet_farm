import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaEye, FaTimes, FaPlus, FaMinus, FaLeaf, FaShoppingBag,
  FaTag, FaBoxOpen, FaGlobe, FaFire, FaSearch,
  FaStar, FaShieldAlt, FaArrowRight, FaCheck, FaWhatsapp,
  FaCoffee, FaFilter, FaChevronDown, FaChevronUp, FaInfoCircle
} from 'react-icons/fa';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import FloatingBeans from '../UI/FloatingBeans';
import AdPlacement from '../AdPlacement/AdPlacement';
import { isFreshlyRoasted } from '../../utils/productHelpers';
import './CoffeeShop.css';

/* ☕ Helpers & Icons ☕ */
const getSvgPlaceholder = (text) => {
  const cleanText = text || 'Rerendet Coffee';
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%231a1714"/><defs><radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23d4af37" stop-opacity="0.2"/><stop offset="100%" stop-color="%231a1714" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(%23glow)"/><g transform="translate(300, 260)"><path d="M-40,-30 L40,-30 Q60,-30 60,-10 L60,10 Q60,30 40,30 L-40,30 Q-60,30 -60,10 L-60,-10 Q-60,-30 -40,-30 Z" fill="none" stroke="%23d4af37" stroke-width="4"/><path d="M40,-15 Q55,-15 55,0 Q55,15 40,15" fill="none" stroke="%23d4af37" stroke-width="4"/><path d="M-60,30 Q0,45 60,30" fill="none" stroke="%23d4af37" stroke-width="4"/><path d="M-20,-45 Q-15,-60 -20,-75" fill="none" stroke="%23d4af37" stroke-width="3" stroke-linecap="round" opacity="0.7"/><path d="M0,-45 Q5,-65 0,-85" fill="none" stroke="%23d4af37" stroke-width="3" stroke-linecap="round" opacity="0.8"/><path d="M20,-45 Q25,-60 20,-75" fill="none" stroke="%23d4af37" stroke-width="3" stroke-linecap="round" opacity="0.7"/></g><text x="300" y="440" fill="%23d4af37" font-family="Playfair Display, serif" font-size="28" font-weight="600" text-anchor="middle" letter-spacing="1.5">${encodeURIComponent(cleanText)}</text><text x="300" y="480" fill="%23c5a038" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle" letter-spacing="4">RERENDET HIGHLANDS</text></svg>`;
};

const getProductImage = (product) => {
  if (product?.images?.length > 0 && product.images[0].url) return product.images[0].url;
  if (product?.image) return product.image;
  return getSvgPlaceholder(product?.name || 'Coffee');
};

const isInStock = (product) => {
  if (product?.inventory?.physicalStock !== undefined) {
    return product.inventory.physicalStock > 0;
  }
  if (product?.inventory?.stock !== undefined) {
    return product.inventory.stock > 0;
  }
  return product?.inStock !== false;
};

const CAT_META = {
  'coffee-beans': { icon: '☕', label: 'Coffee Beans', color: '#D4AF37', accent: '#b8932a', cardType: 'coffee' },
  'single-origin': { icon: '🌱', label: 'Single Origin', color: '#10b981', accent: '#059669', cardType: 'coffee' },
  'espresso-blends': { icon: '🔥', label: 'Espresso Blends', color: '#f59e0b', accent: '#d97706', cardType: 'coffee' },
  'brewing-equipment': { icon: '⚙️', label: 'Brewing Equipment', color: '#60a5fa', accent: '#3b82f6', cardType: 'equipment' },
  'accessories': { icon: '🔌', label: 'Accessories', color: '#a78bfa', accent: '#8b5cf6', cardType: 'generic' },
  'merchandise': { icon: '👕', label: 'Merchandise', color: '#34d399', accent: '#10b981', cardType: 'generic' },
};
const getCatMeta = (cat) => CAT_META[cat] || { icon: '☕', label: cat || 'Specialty Coffee', color: '#D4AF37', accent: '#b8932a', cardType: 'generic' };

const ROAST_SCALES = {
  'light': { label: 'Light Roast', dots: 1, desc: 'Bright, citrusy & vibrant' },
  'medium-light': { label: 'Medium-Light', dots: 2, desc: 'Floral with balanced fruit' },
  'medium': { label: 'Medium Roast', dots: 3, desc: 'Smooth, caramel sweetness' },
  'medium-dark': { label: 'Medium-Dark', dots: 4, desc: 'Rich chocolate & toasted nuts' },
  'dark': { label: 'Dark Roast', dots: 5, desc: 'Bold, smoky & intense cocoa' },
  'espresso': { label: 'Espresso Roast', dots: 5, desc: 'Dense crema, velvety body' }
};

/* ☕ 3D Tilt Card Hook ☕ */
const useTilt = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mx = useSpring(x, { stiffness: 180, damping: 22 });
  const my = useSpring(y, { stiffness: 180, damping: 22 });
  const rotateX = useTransform(my, [-0.5, 0.5], ['6deg', '-6deg']);
  const rotateY = useTransform(mx, [-0.5, 0.5], ['-6deg', '6deg']);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return { rotateX, rotateY, onMove, onLeave };
};

/* ══════════════════════════════════════════════════════════
   ☕ REDESIGNED PRODUCT CARD (Clear Description & Rich Meta) ☕
══════════════════════════════════════════════════════════ */
const ProductCard = React.forwardRef(({ product, index, handleAddToCart, addingToCart, setSelectedProduct }, ref) => {
  const { rotateX, rotateY, onMove, onLeave } = useTilt();
  const [hovered, setHovered] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { showAlert } = useContext(AppContext);

  // Size selection handling
  const availableSizes = product.sizes && product.sizes.length > 0
    ? product.sizes
    : [{ size: product.size || 'Standard', price: product.price || 0 }];
  
  const [selectedSizeObj, setSelectedSizeObj] = useState(availableSizes[0]);
  const [selectedGrind, setSelectedGrind] = useState('Whole Beans');

  const currentPrice = selectedSizeObj?.price ?? product.price ?? 0;
  const productInStock = isInStock(product);
  const fresh = (product.category === 'coffee-beans' || !product.category) && isFreshlyRoasted(product.roastDate);
  const meta = getCatMeta(product.category);
  const variationKey = `${product._id}-${selectedSizeObj.size}`;
  const adding = addingToCart === variationKey;
  const roastInfo = ROAST_SCALES[product.roastLevel?.toLowerCase()] || null;

  const onAddClick = (e) => {
    e.stopPropagation();
    if (!productInStock) return;
    const adminGrind = product.grind || product.categoryAttributes?.grind || 'Whole Beans';
    handleAddToCart(product, selectedSizeObj.size, currentPrice, quantity, adminGrind);
  };

  const onWhatsAppEnquire = (e) => {
    e.stopPropagation();
    const message = encodeURIComponent(`Hi Rerendet Coffee! I am interested in purchasing ${product.name} (${selectedSizeObj.size} - KES ${currentPrice.toLocaleString()}). Can I get more details?`);
    window.open(`https://wa.me/254700000000?text=${message}`, '_blank');
  };

  return (
    <motion.div
      ref={ref}
      className="cs-card-outer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.article
        className={`cs-card cs-card--${meta.cardType}${!productInStock ? ' cs-card--oos' : ''}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {/* Glowing aura layer */}
        <div className="cs-card-glow" style={{ '--glow': meta.color }} />

        {/* ── Image & Badges Zone ── */}
        <div className="cs-img-zone">
          <Link to={`/product/${product.seo?.slug || product._id}`} className="cs-img-link" title={`View ${product.name} Details`}>
            <motion.img
              src={getProductImage(product)}
              alt={product.name}
              className="cs-img"
              loading="lazy"
              animate={{ scale: hovered ? 1.06 : 1, y: hovered ? -4 : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onError={(e) => { e.target.src = getSvgPlaceholder(product.name); }}
            />
          </Link>

          {/* Category pill */}
          <div className="cs-cat-pill" style={{ '--c': meta.color }}>
            <span className="cs-cat-icon">{meta.icon}</span>
            <span>{meta.label}</span>
          </div>

          {/* Quick view button */}
          <button
            type="button"
            className="cs-quickview-btn"
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
            aria-label={`Quick view ${product.name}`}
          >
            <FaEye /> <span>Quick View</span>
          </button>

          {/* Badges */}
          {fresh && (
            <div className="cs-fresh-badge">
              <FaLeaf /> Freshly Roasted
            </div>
          )}
          {product.badge && (
            <div className="cs-badge" style={{ '--c': meta.accent }}>
              {product.badge}
            </div>
          )}
          {!productInStock && <div className="cs-oos-overlay">Sold Out</div>}

          {/* Stock Status Badge */}
          {productInStock && (
            <div className="cs-stock-tag in-stock">
              <span className="stock-pulse" /> Fresh in Stock
            </div>
          )}
        </div>

        {/* ── Rich Info & Detailed Description Zone ── */}
        <div className="cs-info">
          
          {/* Origin & Roast Tag */}
          <div className="cs-origin-row">
            <span className="cs-origin-text">
              <FaGlobe className="cs-micro-icon" />
              {product.origin || 'Rerendet Estate, Kenya (1,850m ASL)'}
            </span>
            {roastInfo && (
              <span className="cs-roast-badge" title={roastInfo.desc}>
                <FaFire className="cs-roast-icon" /> {roastInfo.label}
              </span>
            )}
          </div>

          {/* Product Title & Price Header */}
          <div className="cs-title-row">
            <h3 className="cs-title">
              <Link to={`/product/${product.seo?.slug || product._id}`}>
                {product.name}
              </Link>
            </h3>
            <div className="cs-price-box">
              <span className="cs-price-currency">KES</span>
              <span className="cs-price-amount">{currentPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* ⭐ Clean Description with Direct Full Notes in Quick View ⭐ */}
          <div className="cs-desc-container">
            <p className="cs-desc">
              {product.description || 'Specialty Arabica coffee grown in volcanic highland soils, hand-harvested and crafted to perfection with intense aromas and balanced acidity.'}
            </p>
            <button
              type="button"
              className="cs-desc-toggle"
              onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
            >
              Read Full Story & Notes in Quick View <FaEye style={{ marginLeft: '4px' }} />
            </button>
          </div>

          {/* Flavor Notes Tasting Tags */}
          {product.flavorNotes && product.flavorNotes.length > 0 && (
            <div className="cs-flavor-section">
              <span className="cs-flavor-label">Tasting Notes:</span>
              <div className="cs-flavor-pills">
                {product.flavorNotes.slice(0, 4).map((note, i) => (
                  <span key={i} className="cs-flavor-pill">
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Admin Grind Profile Tag (Informational Only - No Dropdown) */}
          {(product.category === 'coffee-beans' || !product.category) && (
            <div className="cs-spec-row">
              <span className="cs-spec-label">Roast Form:</span>
              <span className="cs-spec-val">
                <FaCoffee className="cs-micro-icon" /> {product.grind || product.categoryAttributes?.grind || 'Whole Beans (Aroma-Locked)'}
              </span>
            </div>
          )}

          {/* Dynamic Size / Weight Selector */}
          {availableSizes.length > 1 && (
            <div className="cs-size-selector-block">
              <span className="cs-size-label">Select Package Size:</span>
              <div className="cs-size-buttons">
                {availableSizes.map((s) => {
                  const isSelected = selectedSizeObj.size === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      className={`cs-size-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedSizeObj(s)}
                    >
                      <span className="size-name">{s.size}</span>
                      <span className="size-price">KES {s.price?.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Bottom Action Controls ── */}
          <div className="cs-card-footer">
            
            {/* Quantity Stepper */}
            {productInStock && (
              <div className="cs-qty-stepper">
                <button
                  type="button"
                  className="cs-qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <FaMinus />
                </button>
                <span className="cs-qty-val">{quantity}</span>
                <button
                  type="button"
                  className="cs-qty-btn"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <FaPlus />
                </button>
              </div>
            )}

            {/* Add to Cart CTA */}
            <motion.button
              className={`cs-cta-btn ${!productInStock ? 'cs-cta-btn--oos' : ''}`}
              onClick={onAddClick}
              disabled={!productInStock || adding}
              whileHover={productInStock && !adding ? { scale: 1.02 } : {}}
              whileTap={productInStock && !adding ? { scale: 0.98 } : {}}
            >
              {adding ? (
                <>
                  <span className="cs-spinner" />
                  <span>Adding...</span>
                </>
              ) : !productInStock ? (
                <span>Sold Out</span>
              ) : (
                <>
                  <FaShoppingBag className="cs-cta-icon" />
                  <span>Add to Cart</span>
                </>
              )}
            </motion.button>

            {/* Roaster WhatsApp Enquiry */}
            {productInStock && (
              <button
                type="button"
                className="cs-whatsapp-icon-btn"
                onClick={onWhatsAppEnquire}
                title="Chat with our Head Roaster on WhatsApp"
                aria-label="Enquire via WhatsApp"
              >
                <FaWhatsapp />
              </button>
            )}
          </div>

        </div>
      </motion.article>
    </motion.div>
  );
});

/* ══════════════════════════════════════════════════════════
   ☕ REDESIGNED QUICK VIEW MODAL (Rich Sensory Experience) ☕
══════════════════════════════════════════════════════════ */
const QuickViewModal = ({ product, onClose, onAddToCart, addingToCart }) => {
  const meta = getCatMeta(product.category);
  const isCoffee = product.category === 'coffee-beans' || !product.category;
  const productInStock = isInStock(product);
  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.length > 0 ? product.sizes[0] : { size: product.size || '250g', price: product.price || 0 }
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const currentPrice = selectedSize.price || product.price || 0;
  const variationKey = `${product._id}-${selectedSize.size}`;
  const adding = addingToCart === variationKey;
  const adminGrind = product.grind || product.categoryAttributes?.grind || 'Whole Beans';

  const handleAdd = async () => {
    await onAddToCart(product, selectedSize.size, currentPrice, quantity, adminGrind);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Hello Rerendet Coffee! I am looking at ${product.name} (${selectedSize.size}) on your store and have a question.`);
    window.open(`https://wa.me/254700000000?text=${msg}`, '_blank');
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
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qv-accent-bar" style={{ background: `linear-gradient(90deg, ${meta.color}, #e5c365)` }} />

        <button className="qv-close-btn" onClick={onClose} aria-label="Close modal">
          <FaTimes />
        </button>

        <div className="qv-grid">
          {/* Left Column: Image & Badges */}
          <div className="qv-img-pane">
            <div className="qv-img-container">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="qv-main-img"
                onError={(e) => { e.target.src = getSvgPlaceholder(product.name); }}
              />
              {product.badge && <span className="qv-badge">{product.badge}</span>}
              {productInStock && <span className="qv-stock-badge">🌿 In Stock & Freshly Roasted</span>}
            </div>

            {/* Coffee Origin Metadata Box */}
            <div className="qv-origin-box">
              <div className="qv-origin-item">
                <span className="label">Origin</span>
                <span className="val">{product.origin || 'Rerendet Highlands, Kenya'}</span>
              </div>
              <div className="qv-origin-item">
                <span className="label">Elevation</span>
                <span className="val">1,850 – 2,100m ASL</span>
              </div>
              <div className="qv-origin-item">
                <span className="label">Process</span>
                <span className="val">Washed & Sun-Dried</span>
              </div>
            </div>
          </div>

          {/* Right Column: In-depth Description & Ordering */}
          <div className="qv-details-pane">
            
            <div className="qv-header">
              <span className="qv-cat-label" style={{ color: meta.color }}>
                {meta.icon} {meta.label} {product.roastLevel && `• ${product.roastLevel} Roast`}
              </span>
              <h2 className="qv-title">{product.name}</h2>
              <div className="qv-price-display">
                <span className="qv-currency">KES</span>
                <span className="qv-amount">{currentPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Prominent Narrative Product Description */}
            <div className="qv-desc-section">
              <h4 className="qv-section-title">
                <FaInfoCircle /> Coffee Profile & Story
              </h4>
              <p className="qv-full-desc">
                {product.description || 'Grown on the mist-covered slopes of Rerendet Farm, our coffees are hand-sorted and roasted to unlock sublime sweetness, delicate floral aroma, and full-bodied chocolate notes.'}
              </p>
            </div>

            {/* Flavor Notes Pill Tags */}
            {product.flavorNotes && product.flavorNotes.length > 0 && (
              <div className="qv-sensory-section">
                <h4 className="qv-section-title">Sensory Flavor Notes</h4>
                <div className="qv-flavor-tags">
                  {product.flavorNotes.map((note, idx) => (
                    <span key={idx} className="qv-tag">
                      ✨ {note}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 1 && (
              <div className="qv-selector-section">
                <label className="qv-field-label">Package Size:</label>
                <div className="qv-size-grid">
                  {product.sizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`qv-size-btn ${selectedSize.size === s.size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      <span className="s-name">{s.size}</span>
                      <span className="s-price">KES {s.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Roast & Form Specification (Informational) */}
            {isCoffee && (
              <div className="qv-spec-box">
                <div className="qv-spec-item">
                  <span className="label">Roast Level:</span>
                  <span className="val">{product.roastLevel ? `${product.roastLevel} Roast` : 'Medium-Dark'}</span>
                </div>
                <div className="qv-spec-item">
                  <span className="label">Package Form:</span>
                  <span className="val">{adminGrind}</span>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="qv-actions-bar">
              {productInStock && (
                <div className="qv-qty-box">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                    <FaMinus />
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)}>
                    <FaPlus />
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`qv-submit-btn ${added ? 'added' : ''}`}
                onClick={handleAdd}
                disabled={!productInStock || adding}
              >
                {added ? (
                  <><FaCheck /> Added to Cart!</>
                ) : adding ? (
                  <><span className="cs-spinner" /> Adding...</>
                ) : !productInStock ? (
                  'Sold Out'
                ) : (
                  <><FaShoppingBag /> Add to Cart — KES {(currentPrice * quantity).toLocaleString()}</>
                )}
              </button>

              <button
                type="button"
                className="qv-whatsapp-action"
                onClick={handleWhatsApp}
                title="Chat on WhatsApp"
              >
                <FaWhatsapp /> Roaster Chat
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════
   ☕ MAIN COFFEE SHOP COMPONENT (Redesigned Search & Grid) ☕
══════════════════════════════════════════════════════════ */
const CoffeeShop = () => {
  const { addToCart, showAlert } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBeans, setShowBeans] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [roastFilter, setRoastFilter] = useState('all');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?isActive=true&limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();

      if (result.success && Array.isArray(result.data?.products)) {
        // Keep 1 distinct product record per coffee blend (no size duplication!)
        setProducts(result.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load specialty coffee collection.', 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Derived Category Lists
  const categoriesInUse = useMemo(() => {
    const raw = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...raw];
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category Filter
    if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory);
    }

    // Roast Filter
    if (roastFilter !== 'all') {
      list = list.filter(p => p.roastLevel?.toLowerCase() === roastFilter.toLowerCase());
    }

    // Search Query (Searches Name, Description, Origin, and Flavor Notes!)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p => (
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.origin?.toLowerCase().includes(q) ||
        p.flavorNotes?.some(note => note.toLowerCase().includes(q))
      ));
    }

    // Sorting
    if (sortBy === 'price-low') {
      list.sort((a, b) => (a.price || a.sizes?.[0]?.price || 0) - (b.price || b.sizes?.[0]?.price || 0));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => (b.price || b.sizes?.[0]?.price || 0) - (a.price || a.sizes?.[0]?.price || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [products, activeCategory, roastFilter, searchTerm, sortBy]);

  // Add to Cart handler
  const handleAddToCart = async (product, size, price, qty = 1, grind = 'Whole Beans') => {
    if (!isInStock(product)) return;
    const variationKey = `${product._id}-${size}`;
    setAddingToCart(variationKey);
    setShowBeans(true);
    setTimeout(() => setShowBeans(false), 2000);

    try {
      await addToCart({
        _id: product._id,
        name: product.name,
        price: price,
        size: size,
        grind: grind,
        images: product.images || [],
        category: product.category,
        roastLevel: product.roastLevel,
        origin: product.origin,
        flavorNotes: product.flavorNotes,
        badge: product.badge,
        sizes: product.sizes || []
      }, qty, size, grind);
    } catch (err) {
      console.error(err);
      showAlert('Failed to add item to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  /* ☕ Loading State ☕ */
  if (loading) {
    return (
      <section id="coffee-shop" className="cs-section">
        <div className="cs-loading-box">
          <div className="cs-loading-spinner" />
          <p className="cs-loading-title">Brewing Specialty Coffee Collection...</p>
          <span className="cs-loading-sub">Sourcing direct from Rerendet Farm Highlands</span>
        </div>
      </section>
    );
  }

  return (
    <section id="coffee-shop" className="cs-section">
      <FloatingBeans isVisible={showBeans} />

      {/* Atmospheric Background Lights */}
      <div className="cs-bg-texture" aria-hidden="true">
        <div className="cs-bg-orb cs-bg-orb--gold" />
        <div className="cs-bg-orb cs-bg-orb--warm" />
        <div className="cs-bg-grid-pattern" />
      </div>

      <div className="cs-container">
        
        {/* Ad Placement */}
        <AdPlacement zone="homepage" />

        {/* ── Section Header ── */}
        <div className="cs-header-wrapper">
          <div className="cs-header-badge">
            <FaCoffee /> 100% Kenyan Specialty Arabica
          </div>
          <h2 className="cs-main-title">
            Our Specialty <span className="gold-italic">Coffee Collection</span>
          </h2>
          <p className="cs-main-subtitle">
            Grown in high-altitude volcanic soils, hand-picked, and medium-roasted to order. Discover full descriptions, origin profiles, and bespoke flavor notes below.
          </p>
        </div>

        {/* ── Search & Filter Control Bar ── */}
        <div className="cs-controls-bar">
          
          {/* Live Search Input */}
          <div className="cs-search-box">
            <FaSearch className="cs-search-icon" />
            <input
              type="text"
              className="cs-search-input"
              placeholder="Search by coffee name, origin, or flavor note (e.g. Berry, Chocolate)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="cs-search-clear" onClick={() => setSearchTerm('')}>
                <FaTimes />
              </button>
            )}
          </div>

          {/* Roast & Sort Dropdowns */}
          <div className="cs-filter-group">
            <div className="cs-select-wrap">
              <label htmlFor="cs-roast-select" className="cs-select-label">Roast:</label>
              <select
                id="cs-roast-select"
                className="cs-dropdown"
                value={roastFilter}
                onChange={(e) => setRoastFilter(e.target.value)}
              >
                <option value="all">All Roasts</option>
                <option value="light">Light Roast</option>
                <option value="medium-light">Medium-Light</option>
                <option value="medium">Medium Roast</option>
                <option value="medium-dark">Medium-Dark</option>
                <option value="dark">Dark Roast</option>
                <option value="espresso">Espresso</option>
              </select>
            </div>

            <div className="cs-select-wrap">
              <label htmlFor="cs-sort-select" className="cs-select-label">Sort:</label>
              <select
                id="cs-sort-select"
                className="cs-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured Roasts</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>

        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="cs-tabs-row">
          {categoriesInUse.map((cat) => {
            const meta = cat === 'all' ? { icon: '☕', label: 'All Coffees & Gear', color: '#D4AF37' } : getCatMeta(cat);
            const count = cat === 'all' ? products.length : products.filter(p => p.category === cat).length;
            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                className={`cs-filter-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="tab-icon">{meta.icon}</span>
                <span className="tab-label">{meta.label}</span>
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Meta Results Bar ── */}
        <div className="cs-results-bar">
          <span className="cs-results-text">
            Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'specialty item' : 'specialty items'}
            {searchTerm && <span> matching <em>"{searchTerm}"</em></span>}
          </span>
          {(searchTerm || activeCategory !== 'all' || roastFilter !== 'all') && (
            <button
              type="button"
              className="cs-reset-btn"
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
                setRoastFilter('all');
                setSortBy('featured');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* ── Main Product Cards Grid ── */}
        {filteredProducts.length === 0 ? (
          <div className="cs-no-results">
            <div className="cs-no-results-icon">☕</div>
            <h3>No Coffees Match Your Criteria</h3>
            <p>Try searching for a different flavor profile, origin, or clear your search filters.</p>
            <button
              className="cs-clear-filters-btn"
              onClick={() => { setSearchTerm(''); setActiveCategory('all'); setRoastFilter('all'); }}
            >
              View All Specialty Coffees
            </button>
          </div>
        ) : (
          <div className="cs-products-grid">
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product._id}
                product={product}
                index={idx}
                handleAddToCart={handleAddToCart}
                addingToCart={addingToCart}
                setSelectedProduct={setSelectedProduct}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Quick View Interactive Modal ── */}
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

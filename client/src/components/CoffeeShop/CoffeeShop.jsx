import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaTimes, FaMinus, FaPlus, FaSearch, FaCheck, FaWhatsapp,
  FaArrowRight, FaEye, FaLeaf, FaFire, FaCoffee, FaShoppingBag,
  FaBan, FaPercent, FaSlidersH, FaLayerGroup, FaSeedling
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { isProductOutOfStock, getAvailableStockCount } from '../../utils/stockValidator';
import './CoffeeShop.css';

/* ══════════════════════════════════════════════════════════
   ☕ LUXURY COFFEE ROASTERY PALETTES
   Rich artisanal gradients for bags and showcase cards
══════════════════════════════════════════════════════════ */
const LUXURY_PALETTES = [
  // 1. Dark Espresso Onyx
  {
    body: '#1C1510',
    bodyShade: '#120D0A',
    highlight: '#2F231B',
    topFold: '#18120E',
    sideGusset: '#0C0806',
    accent: '#D4AF37',
    foil: '#E8CA65',
    text: '#FAF7F2',
    subText: '#D4AF37',
    tag: 'Espresso Roast'
  },
  // 2. High Altitude Cobalt
  {
    body: '#16284F',
    bodyShade: '#0F1A34',
    highlight: '#203970',
    topFold: '#122040',
    sideGusset: '#0A1224',
    accent: '#D4AF37',
    foil: '#E8CA65',
    text: '#F8FAFC',
    subText: '#F4CA64',
    tag: 'Single Origin Filter'
  },
  // 3. Volcanic Forest Emerald
  {
    body: '#143621',
    bodyShade: '#0D2315',
    highlight: '#1C4A2D',
    topFold: '#102A1A',
    sideGusset: '#08170D',
    accent: '#E5C058',
    foil: '#F5D77F',
    text: '#F0FDF4',
    subText: '#E5C058',
    tag: 'Highland Lot'
  },
  // 4. Ruby Crimson Microlot
  {
    body: '#66151B',
    bodyShade: '#440D11',
    highlight: '#871E25',
    topFold: '#521014',
    sideGusset: '#2E080B',
    accent: '#D4AF37',
    foil: '#F0CF70',
    text: '#FFF5F5',
    subText: '#F0CF70',
    tag: 'Reserve Microlot'
  },
  // 5. Artisan Warm Linen Kraft
  {
    body: '#D8CEBE',
    bodyShade: '#C2B6A2',
    highlight: '#E8DFC0',
    topFold: '#B5A893',
    sideGusset: '#9E927F',
    accent: '#261C14',
    foil: '#875C36',
    text: '#1F1711',
    subText: '#5A4333',
    tag: 'Light Filter Roast'
  }
];

export const getBagPalette = (product, index = 0) => {
  const roast = (product?.roastLevel || '').toLowerCase();
  const name = (product?.name || '').toLowerCase();

  if (roast.includes('espresso') || name.includes('espresso') || roast.includes('dark')) {
    return LUXURY_PALETTES[0];
  }
  if (roast.includes('filter') || name.includes('filter') || name.includes('colombia')) {
    return LUXURY_PALETTES[1];
  }
  if (name.includes('bomet') || name.includes('green') || name.includes('organic')) {
    return LUXURY_PALETTES[2];
  }
  if (name.includes('reserve') || name.includes('ruby') || name.includes('aa')) {
    return LUXURY_PALETTES[3];
  }
  if (roast.includes('light') || name.includes('light') || name.includes('honey')) {
    return LUXURY_PALETTES[4];
  }

  return LUXURY_PALETTES[index % LUXURY_PALETTES.length];
};

export const getProductSizes = (product) => {
  if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
    const valid = product.sizes.filter((s) => s && s.size && Number(s.price) >= 0);
    if (valid.length > 0) {
      return valid.map((s) => ({
        size: s.size,
        price: Number(s.price),
        originalPrice: (s.originalPrice && Number(s.originalPrice) > 0) ? Number(s.originalPrice) : null
      }));
    }
  }

  const singlePrice = Number(product?.price) || 0;
  const singleOrig = Number(product?.compareAtPrice) || null;
  return [
    { size: product?.size || 'Standard', price: singlePrice, originalPrice: singleOrig }
  ];
};

export const GRIND_OPTIONS = [
  'Whole Beans',
  'French Press',
  'Pour-Over',
  'AeroPress',
  'Espresso'
];

/* ══════════════════════════════════════════════════════════
   ☕ ULTRA-LUXURY 3D COFFEE POUCH SVG GENERATOR
══════════════════════════════════════════════════════════ */
export const generateLuxuryBagSvg = (product, palette, weight = '250G') => {
  const brand = 'RERENDET';
  const cleanWeight = (weight || '250G').toUpperCase();
  const roastTitle = (product?.roastLevel || 'SPECIALTY').toUpperCase();

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="100%" height="100%">
    <defs>
      <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23000000" stop-opacity="0.32" />
        <stop offset="60%" stop-color="%23000000" stop-opacity="0.10" />
        <stop offset="100%" stop-color="%23000000" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="bagBody" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
        <stop offset="28%" stop-color="${encodeURIComponent(palette.body)}" />
        <stop offset="72%" stop-color="${encodeURIComponent(palette.highlight)}" />
        <stop offset="100%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
      </linearGradient>
      <linearGradient id="gusset" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${encodeURIComponent(palette.sideGusset)}" />
        <stop offset="100%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
      </linearGradient>
      <linearGradient id="topSeal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${encodeURIComponent(palette.topFold)}" />
        <stop offset="100%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
      </linearGradient>
      <linearGradient id="goldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%23F3D580" />
        <stop offset="50%" stop-color="%23D4AF37" />
        <stop offset="100%" stop-color="%23A88420" />
      </linearGradient>
    </defs>

    <!-- Natural Pedestal Shadow -->
    <ellipse cx="200" cy="470" rx="115" ry="17" fill="url(%23floorShadow)" />

    <!-- 3D Pouch Construction -->
    <g transform="translate(0, 10)">
      <!-- Left Gusset -->
      <polygon points="120,446 138,454 144,118 128,108" fill="url(%23gusset)" opacity="0.95" />

      <!-- Main Face -->
      <polygon points="138,454 262,454 272,118 144,118" fill="url(%23bagBody)" />

      <!-- Right Gusset -->
      <polygon points="262,454 280,446 286,110 272,118" fill="url(%23gusset)" opacity="0.88" />

      <!-- Top Crimp & Zipper -->
      <polygon points="144,118 272,118 258,66 156,66" fill="url(%23topSeal)" />
      <line x1="160" y1="72" x2="254" y2="72" stroke="${encodeURIComponent(palette.sideGusset)}" stroke-width="1.8" opacity="0.7" />
      <line x1="162" y1="78" x2="252" y2="78" stroke="${encodeURIComponent(palette.sideGusset)}" stroke-width="1.8" opacity="0.7" />
      <line x1="164" y1="84" x2="250" y2="84" stroke="${encodeURIComponent(palette.sideGusset)}" stroke-width="1.8" opacity="0.7" />

      <!-- Top Micro Header -->
      <text x="206" y="96" fill="${encodeURIComponent(palette.text)}" font-family="'Outfit', -apple-system, sans-serif" font-size="8" font-weight="800" letter-spacing="3" text-anchor="middle" opacity="0.85">ESTATE DIRECT ROASTERY</text>

      <!-- Gold Foil Stamp Emblem -->
      <circle cx="206" cy="180" r="20" fill="none" stroke="url(%23goldFoil)" stroke-width="3" />
      <circle cx="206" cy="180" r="14" fill="none" stroke="url(%23goldFoil)" stroke-width="1" stroke-dasharray="2,2" />
      <path d="M206,170 L209,177 L216,177 L211,182 L213,189 L206,184 L199,189 L201,182 L196,177 L203,177 Z" fill="url(%23goldFoil)" />

      <!-- Luxury Typography -->
      <text x="206" y="235" fill="${encodeURIComponent(palette.text)}" font-family="'Playfair Display', Georgia, serif" font-size="16" font-weight="900" letter-spacing="2" text-anchor="middle">${brand}</text>
      <text x="206" y="252" fill="url(%23goldFoil)" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="800" letter-spacing="2" text-anchor="middle">HIGHLAND ARABICA · 2,000M</text>

      <!-- Cupping Specification Badge -->
      <rect x="156" y="274" width="94" height="20" rx="4" fill="%23000000" fill-opacity="0.25" stroke="${encodeURIComponent(palette.text)}" stroke-opacity="0.2" />
      <text x="203" y="287" fill="${encodeURIComponent(palette.text)}" font-family="'Outfit', sans-serif" font-size="8" font-weight="700" letter-spacing="1" text-anchor="middle">${roastTitle} LOT</text>

      <!-- Technical Lines -->
      <g opacity="0.65" transform="translate(154, 315)">
        <line x1="0" y1="0" x2="98" y2="0" stroke="${encodeURIComponent(palette.text)}" stroke-width="0.8" opacity="0.4" />
        <rect x="0" y="8" width="55" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.45" />
        <rect x="0" y="14" width="85" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.35" />
        <rect x="0" y="20" width="70" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.35" />
      </g>

      <!-- Barcode & Net Weight -->
      <g transform="translate(154, 396)" opacity="0.85">
        <rect x="0" y="0" width="2" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <rect x="4" y="0" width="1" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <rect x="7" y="0" width="3" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <rect x="12" y="0" width="1.5" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <rect x="15" y="0" width="2.5" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <rect x="20" y="0" width="1" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <rect x="23" y="0" width="3" height="28" fill="${encodeURIComponent(palette.barcodeColor || '%23FFFFFF')}" />
        <text x="96" y="22" fill="${encodeURIComponent(palette.text)}" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="800" letter-spacing="1" text-anchor="end">${cleanWeight}</text>
      </g>
    </g>
  </svg>`;
};

// Aliases for CartSidebar and checkout backward compatibility
export const generateSpecialtyBagSvg = generateLuxuryBagSvg;
export const generateEquipmentSvg = (product) => generateLuxuryBagSvg(product, LUXURY_PALETTES[0], 'GEAR');

/* ══════════════════════════════════════════════════════════
   ☕ PRODUCT CARD COMPONENT (WORLD-CLASS LUXURY BOUTIQUE)
══════════════════════════════════════════════════════════ */
const CoffeeCard = ({ product, index, handleAddToCart, addingToCart, setSelectedProduct }) => {
  const { publicSettings } = useContext(AppContext);
  const [isAdded, setIsAdded] = useState(false);
  const palette = useMemo(() => getBagPalette(product, index), [product, index]);

  const availableSizes = useMemo(() => getProductSizes(product), [product]);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0]);

  // Sync selected size if availableSizes change
  useEffect(() => {
    if (availableSizes.length > 0 && (!selectedSize || !availableSizes.find(s => s.size === selectedSize.size))) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes]);

  // Strict In Stock Verification
  const isOutOfStock = useMemo(() => isProductOutOfStock(product), [product]);
  const availableStock = useMemo(() => getAvailableStockCount(product), [product]);
  const isLowStock = !isOutOfStock && availableStock <= (product?.inventory?.lowStockThreshold || 5);

  const currentPrice = selectedSize?.price ?? Number(product?.price) ?? 850;
  const originalPrice = selectedSize?.originalPrice ?? product?.compareAtPrice ?? null;
  const hasDiscount = originalPrice && Number(originalPrice) > Number(currentPrice);
  const discountPct = hasDiscount ? Math.round(((Number(originalPrice) - Number(currentPrice)) / Number(originalPrice)) * 100) : 0;
  const savingsAmount = hasDiscount ? Number(originalPrice) - Number(currentPrice) : 0;

  const variationKey = `${product._id}-${selectedSize?.size || 'standard'}`;
  const isAdding = addingToCart === variationKey;

  const isCoffee = useMemo(() => {
    if (!product) return false;
    if (product.roastLevel) return true;
    if (Array.isArray(product.flavorNotes) && product.flavorNotes.length > 0) return true;
    const cat = (product.categoryId?.name || product.categoryId?.slug || product.category || '').toLowerCase();
    if (cat.includes('coffee') || cat.includes('bean')) return true;
    const name = (product.name || '').toLowerCase();
    return name.includes('coffee') || name.includes('bean') || name.includes('roast') || name.includes('arabica');
  }, [product]);

  const roastBadge = useMemo(() => {
    if (product?.roastLevel) {
      const rl = product.roastLevel.toLowerCase();
      if (rl.includes('espresso')) return { label: 'Espresso Roast', emoji: '☕' };
      if (rl.includes('light')) return { label: 'Light Roast', emoji: '☀️' };
      if (rl.includes('dark')) return { label: 'Dark Roast', emoji: '🌑' };
      return { label: `${product.roastLevel} Roast`, emoji: '⛅' };
    }
    return null;
  }, [product]);

  const currencySymbol = publicSettings?.payment?.currencySymbol || 'KES';
  const hasRealPhoto = Boolean(
    (product.images && product.images.length > 0 && product.images[0]?.url) || product.image
  );

  const fallbackSvg = useMemo(() => {
    return generateLuxuryBagSvg(product, palette, selectedSize?.size || '250G');
  }, [product, palette, selectedSize?.size]);

  const productImage = (product.images && product.images[0]?.url) || product.image || fallbackSvg;

  const onAddClick = async (e) => {
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;

    await handleAddToCart(
      product,
      selectedSize?.size || 'Standard',
      currentPrice,
      1,
      isCoffee ? 'Whole Beans' : undefined
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2200);
  };

  const onWhatsAppClick = (e) => {
    e.stopPropagation();
    const phone = (publicSettings?.support?.whatsapp || '+254700000000').replace(/[^0-9]/g, '');
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const itemUrl = `${originUrl}/product/${product.slug || product._id}`;
    const sizeText = selectedSize?.size && selectedSize.size !== 'Standard' ? ` (${selectedSize.size})` : '';
    const stockNote = isOutOfStock ? ' [Batch Depleted - Inquiring for Restock]' : '';
    const msg = `Hello Rerendet Coffee Estate! ☕\nI would like to order *${product.name}*${sizeText} for *${currencySymbol} ${currentPrice.toLocaleString()}*${stockNote}.\n${itemUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className={`cs-card ${isOutOfStock ? 'cs-card--soldout' : ''}`}>
      {/* ── Top Media Pedestal ── */}
      <div
        className="cs-media-wrap"
        onClick={() => setSelectedProduct({ ...product, initialSize: selectedSize?.size })}
        title={`View details for ${product.name}`}
      >
        {/* Clean Minimal Badges Overlay */}
        {(product.discountBadge || isOutOfStock) && (
          <>
            <div className="cs-badges-top-left">
              {product.discountBadge && (
                <span className="cs-badge cs-badge--discount">
                  <FaFire /> {product.discountBadge}
                </span>
              )}
            </div>

            <div className="cs-badges-top-right">
              {isOutOfStock && (
                <span className="cs-badge cs-badge--soldout">
                  <FaBan /> Sold Out
                </span>
              )}
            </div>
          </>
        )}

        {/* Product Image Stage */}
        <div className={`cs-img-stage ${hasRealPhoto ? 'cs-img-stage--photo' : ''}`}>
          <img
            src={productImage}
            alt={product.name}
            className="cs-bag-img"
            loading="lazy"
            onError={(e) => {
              if (e.target.src !== fallbackSvg) e.target.src = fallbackSvg;
            }}
          />
        </div>

        {/* Quick View Floating Pill */}
        <button
          type="button"
          className="cs-quickview-pill"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct({ ...product, initialSize: selectedSize?.size });
          }}
          aria-label={`Quick view ${product.name}`}
        >
          <FaEye />
          <span>Quick Cupping</span>
        </button>
      </div>

      {/* ── Card Body & Details ── */}
      <div className="cs-card-body">
        {/* Origin Tag */}
        {product.origin && (
          <div className="cs-meta-row">
            <span className="cs-origin-pill">
              {product.origin}
            </span>
          </div>
        )}

        {/* Product Name */}
        <h3
          className="cs-product-title"
          onClick={() => setSelectedProduct({ ...product, initialSize: selectedSize?.size })}
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Sensory Cupping Notes */}
        {Array.isArray(product.flavorNotes) && product.flavorNotes.filter(Boolean).length > 0 && (
          <div className="cs-flavor-chips">
            {product.flavorNotes.filter(Boolean).slice(0, 3).map((note, idx) => (
              <span key={idx} className="cs-flavor-chip">{note}</span>
            ))}
          </div>
        )}

        {/* Size Selection Chips (Directly on Card) */}
        {availableSizes.length > 1 && (
          <div className="cs-size-selector-strip" onClick={(e) => e.stopPropagation()}>
            <span className="cs-size-label">Weight:</span>
            <div className="cs-size-buttons">
              {availableSizes.map((s) => {
                const isSelected = (selectedSize?.size === s.size);
                return (
                  <button
                    key={s.size}
                    type="button"
                    className={`cs-size-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock Status Indicator: cleanly shown when sold out or low stock */}
        {(isOutOfStock || isLowStock) && (
          <div className="cs-stock-telemetry">
            {isOutOfStock ? (
              <span className="cs-stock-status depleted">
                <span className="cs-stock-dot depleted" />
                Sold Out
              </span>
            ) : (
              <span className="cs-stock-status low">
                <span className="cs-stock-dot low" />
                Only {availableStock} left
              </span>
            )}
          </div>
        )}

        {/* ── Footer: Pricing & Action Controls ── */}
        <div className="cs-card-footer">
          <div className="cs-pricing-wrap">
            {hasDiscount && (
              <div className="cs-crossed-price-row">
                <span className="cs-old-price">{currencySymbol} {Number(originalPrice).toLocaleString()}</span>
                <span className="cs-save-tag">Save {currencySymbol} {savingsAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="cs-main-price-row">
              <span className="cs-current-price">
                {currencySymbol} {Number(currentPrice).toLocaleString()}
              </span>
              {selectedSize?.size && selectedSize.size !== 'Standard' && (
                <span className="cs-size-unit">/ {selectedSize.size}</span>
              )}
            </div>
          </div>

          <div className="cs-actions-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cs-wa-concierge-btn"
              onClick={onWhatsAppClick}
              title="Order directly with Roastmaster Concierge on WhatsApp"
              aria-label="Order on WhatsApp"
            >
              <FaWhatsapp />
            </button>

            {/* STRICT ADD TO CART GUARD */}
            <button
              type="button"
              className={`cs-add-cart-btn ${isAdded ? 'added' : ''} ${isOutOfStock ? 'disabled-soldout' : ''}`}
              onClick={onAddClick}
              disabled={isOutOfStock || isAdding}
              title={isOutOfStock ? 'Out of stock - Cannot add to cart' : 'Add freshly roasted coffee to cart'}
              aria-label={isOutOfStock ? 'Sold Out' : 'Add to Cart'}
            >
              {isAdded ? (
                <>
                  <FaCheck />
                  <span>Added</span>
                </>
              ) : isAdding ? (
                <span>Adding...</span>
              ) : isOutOfStock ? (
                <>
                  <FaBan />
                  <span>Sold Out</span>
                </>
              ) : (
                <>
                  <FaShoppingBag />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ══════════════════════════════════════════════════════════
   ☕ LUXURY QUICK CUPPING MODAL
══════════════════════════════════════════════════════════ */
const QuickViewModal = ({ product, onClose, onAddToCart, addingToCart }) => {
  const { publicSettings } = useContext(AppContext);
  const availableSizes = useMemo(() => getProductSizes(product), [product]);
  const [selectedSize, setSelectedSize] = useState(() => {
    if (product.initialSize) {
      const match = availableSizes.find(s => s.size === product.initialSize);
      if (match) return match;
    }
    return availableSizes[0];
  });
  const [selectedGrind, setSelectedGrind] = useState(() => {
    return product.defaultGrind || product.grindOptions?.[0] || 'Whole Beans';
  });
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Stock checks
  const isOutOfStock = useMemo(() => isProductOutOfStock(product), [product]);
  const availableStock = useMemo(() => getAvailableStockCount(product), [product]);

  const currentPrice = selectedSize?.price ?? Number(product?.price) ?? 850;
  const originalPrice = selectedSize?.originalPrice ?? product?.compareAtPrice ?? null;
  const hasDiscount = originalPrice && Number(originalPrice) > Number(currentPrice);
  const discountPct = hasDiscount ? Math.round(((Number(originalPrice) - Number(currentPrice)) / Number(originalPrice)) * 100) : 0;
  const totalAmount = currentPrice * quantity;
  const totalOldAmount = originalPrice ? originalPrice * quantity : null;

  const currencySymbol = publicSettings?.payment?.currencySymbol || 'KES';
  const palette = useMemo(() => getBagPalette(product), [product]);

  const fallbackSvg = useMemo(() => {
    return generateLuxuryBagSvg(product, palette, selectedSize?.size || '250G');
  }, [product, palette, selectedSize?.size]);

  const productImage = (product.images && product.images[0]?.url) || product.image || fallbackSvg;
  const isCoffee = Boolean(product.roastLevel || (product.flavorNotes && product.flavorNotes.length > 0));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAdd = async () => {
    if (isOutOfStock) return;
    await onAddToCart(
      product,
      selectedSize?.size || 'Standard',
      currentPrice,
      quantity,
      isCoffee ? selectedGrind : undefined
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2200);
  };

  const handleWhatsApp = () => {
    const phone = (publicSettings?.support?.whatsapp || '+254700000000').replace(/[^0-9]/g, '');
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const itemUrl = `${originUrl}/product/${product.slug || product._id}`;
    const grindText = isCoffee ? ` | Grind: ${selectedGrind}` : '';
    const sizeText = selectedSize?.size ? ` (${selectedSize.size})` : '';
    const msg = `Hello Rerendet Roastmaster! ☕\nI want to order: *${product.name}*${sizeText} x ${quantity}${grindText}\nTotal: *${currencySymbol} ${totalAmount.toLocaleString()}*\n${itemUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className="cs-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cs-modal-card"
        initial={{ opacity: 0, y: 35, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="cs-modal-close" onClick={onClose} aria-label="Close modal">
          <FaTimes />
        </button>

        <div className="cs-modal-grid">
          {/* ── Left Column: Pedestal ── */}
          <div className="cs-modal-media-col">
            <div className="cs-modal-showcase">
              {product.discountBadge && (
                <span className="cs-modal-badge discount">
                  <FaFire /> {product.discountBadge}
                </span>
              )}
              <div className="cs-modal-img-wrap">
                <img
                  src={productImage}
                  alt={product.name}
                  className="cs-modal-img"
                  onError={(e) => {
                    if (e.target.src !== fallbackSvg) e.target.src = fallbackSvg;
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Right Column: Roastery Curations ── */}
          <div className="cs-modal-info-col">
            {(product.origin || product.process) && (
              <div className="cs-modal-tags-row">
                {product.origin && (
                  <span className="cs-pill gold">
                    <FaLeaf /> {product.origin}
                  </span>
                )}
                {product.process && (
                  <span className="cs-pill">{product.process}</span>
                )}
              </div>
            )}

            <h2 className="cs-modal-title">{product.name}</h2>

            {/* Tasting Notes */}
            {Array.isArray(product.flavorNotes) && product.flavorNotes.filter(Boolean).length > 0 && (
              <div className="cs-modal-tasting-row">
                <span className="cs-tasting-lead">Tasting Notes:</span>
                <div className="cs-tasting-chips">
                  {product.flavorNotes.filter(Boolean).map((n, i) => (
                    <span key={i} className="cs-tasting-badge">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {product.description && (
              <p className="cs-modal-description">{product.description}</p>
            )}

            {/* Size Selector */}
            {availableSizes.length > 1 && (
              <div className="cs-modal-section">
                <span className="cs-section-label">Select Package Size</span>
                <div className="cs-modal-options-grid">
                  {availableSizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`cs-opt-btn ${selectedSize.size === s.size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      <span>{s.size}</span>
                      <strong className="cs-opt-price">{currencySymbol} {s.price.toLocaleString()}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grind Selector (Coffee Only) */}
            {isCoffee && (
              <div className="cs-modal-section">
                <span className="cs-section-label">Select Grind Profile</span>
                <div className="cs-modal-options-grid grinds">
                  {(product.grindOptions && product.grindOptions.length > 0 ? product.grindOptions : GRIND_OPTIONS).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`cs-opt-btn ${selectedGrind === g ? 'active' : ''}`}
                      onClick={() => setSelectedGrind(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Notification in Modal */}
            {(isOutOfStock || availableStock <= 5) && (
              <div className="cs-modal-stock-row">
                {isOutOfStock ? (
                  <span className="cs-modal-stock depleted">
                    <FaBan /> Sold out
                  </span>
                ) : (
                  <span className="cs-modal-stock low">
                    ⚡ Only {availableStock} remaining in stock
                  </span>
                )}
              </div>
            )}

            {/* Bottom Stepper & Action Controls */}
            <div className="cs-modal-footer">
              <div className="cs-modal-total-box">
                {hasDiscount && totalOldAmount && (
                  <s className="cs-modal-old-total">{currencySymbol} {totalOldAmount.toLocaleString()}</s>
                )}
                <span className="cs-modal-total-val">{currencySymbol} {totalAmount.toLocaleString()}</span>
              </div>

              <div className="cs-modal-stepper">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  aria-label="Decrease quantity"
                >
                  <FaMinus size={11} />
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableStock || 99, quantity + 1))}
                  disabled={quantity >= availableStock || isOutOfStock}
                  aria-label="Increase quantity"
                >
                  <FaPlus size={11} />
                </button>
              </div>

              <button
                type="button"
                className={`cs-modal-add-btn ${isAdded ? 'added' : ''} ${isOutOfStock ? 'disabled-soldout' : ''}`}
                onClick={handleAdd}
                disabled={isOutOfStock}
              >
                {isAdded ? (
                  <><FaCheck /> Added to Cart</>
                ) : isOutOfStock ? (
                  <><FaBan /> Sold Out</>
                ) : (
                  <><FaShoppingBag /> Add to Cart</>
                )}
              </button>

              <button
                type="button"
                className="cs-modal-wa-btn"
                onClick={handleWhatsApp}
                title="Order on WhatsApp"
                aria-label="Order on WhatsApp"
              >
                <FaWhatsapp />
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════
   ☕ SKELETON LOADER
══════════════════════════════════════════════════════════ */
const CardSkeleton = () => (
  <div className="cs-card cs-card--skeleton" aria-hidden="true">
    <div className="cs-skeleton-img" />
    <div className="cs-skeleton-body">
      <div className="cs-sk-line short" />
      <div className="cs-sk-line long" />
      <div className="cs-sk-line medium" />
      <div className="cs-sk-line footer" />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   ☕ MAIN COFFEE SHOP REDESIGN
══════════════════════════════════════════════════════════ */
const CoffeeShop = () => {
  const { addToCart, showAlert } = useContext(AppContext);
  const [products, setProducts] = useState(() => {
    try {
      const cached = sessionStorage.getItem('rerendet_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) { }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem('rerendet_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (_) { }
    return true;
  });

  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [roastFilter, setRoastFilter] = useState('all');

  const fetchProducts = useCallback(async () => {
    try {
      setProducts(current => {
        if (!current || current.length === 0) setLoading(true);
        return current;
      });

      const response = await fetch('/api/products?isActive=true&limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();

      if (result.success && Array.isArray(result.data?.products)) {
        setProducts(result.data.products);
        try {
          sessionStorage.setItem('rerendet_cached_products', JSON.stringify(result.data.products));
        } catch (_) { }
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load specialty coffee collection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Clean Categories
  const categoriesList = useMemo(() => {
    const raw = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...raw];
  }, [products]);

  // Dynamic Roast Levels added by the admin on products
  const roastLevelsList = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      const r = p.roastLevel?.trim();
      if (r) set.add(r);
    });
    const unique = Array.from(set);
    if (unique.length === 0) return [];
    return ['all', ...unique];
  }, [products]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory);
    }

    if (roastFilter !== 'all') {
      list = list.filter(p => p.roastLevel?.trim().toLowerCase() === roastFilter.trim().toLowerCase());
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p => (
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.origin?.toLowerCase().includes(q) ||
        p.flavorNotes?.some(note => note.toLowerCase().includes(q))
      ));
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => (a.price || a.sizes?.[0]?.price || 0) - (b.price || b.sizes?.[0]?.price || 0));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => (b.price || b.sizes?.[0]?.price || 0) - (a.price || a.sizes?.[0]?.price || 0));
    } else if (sortBy === 'discount') {
      list.sort((a, b) => {
        const hasA = (a.sizes?.[0]?.originalPrice && a.sizes[0].originalPrice > a.sizes[0].price) ? 1 : 0;
        const hasB = (b.sizes?.[0]?.originalPrice && b.sizes[0].originalPrice > b.sizes[0].price) ? 1 : 0;
        return hasB - hasA;
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [products, activeCategory, roastFilter, searchTerm, sortBy]);

  // Strict Add To Cart Method
  const handleAddToCart = async (product, size, price, qty = 1, grind = 'Whole Beans') => {
    // HARD ENFORCEMENT: If product is out of stock, completely block!
    if (isProductOutOfStock(product) || getAvailableStockCount(product) <= 0) {
      showAlert(`"${product.name}" is out of stock and cannot be added to cart.`, 'error');
      return;
    }

    const variationKey = `${product._id}-${size}`;
    setAddingToCart(variationKey);

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
        discountBadge: product.discountBadge,
        sizes: getProductSizes(product),
        inStock: product.inStock,
        availableStock: product.availableStock,
        inventory: product.inventory
      }, qty, size, grind);
    } catch (err) {
      console.error(err);
      showAlert('Failed to add item to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <section id="coffee-shop" className="cs-section">
      <div className="cs-container">

        {/* ── Luxury Header Banner ── */}
        <div className="cs-hero-header">
          <h1 className="cs-hero-title">
            The Coffee Shop
          </h1>
        </div>

        {/* ── Refined Toolbar (Categories, Search, Roast, Sort) ── */}
        <div className="cs-toolbar">
          {/* Categories Row */}
          <div className="cs-categories-strip">
            {categoriesList.map((cat) => {
              const label = cat === 'all'
                ? 'All Coffees'
                : cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  className={`cs-cat-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat === 'all' && <FaCoffee className="cs-cat-icon" />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Secondary Controls Bar */}
          <div className="cs-secondary-controls">
            {/* Live Search */}
            <div className="cs-search-box">
              <FaSearch className="cs-search-icon" />
              <input
                type="text"
                placeholder="Search roasts, notes (e.g. Jasmine, Citrus, Bomet)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cs-search-input"
              />
              {searchTerm && (
                <button className="cs-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Roast Profile Quick Pills (dynamically derived from admin added products) */}
            {roastLevelsList.length > 1 && (
              <div className="cs-roast-pills">
                {roastLevelsList.map(r => {
                  const label = r === 'all'
                    ? 'All Roasts'
                    : r.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const isActive = roastFilter.toLowerCase() === r.toLowerCase();

                  return (
                    <button
                      key={r}
                      type="button"
                      className={`cs-roast-pill ${isActive ? 'active' : ''}`}
                      onClick={() => setRoastFilter(r)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sort Selector */}
            <div className="cs-sort-box">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cs-select"
                aria-label="Sort coffee roasts"
              >
                <option value="featured">✨ Featured Harvest</option>
                <option value="discount">🔥 Special Offers</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Active Filters Summary Count ── */}
        <div className="cs-results-bar">
          <span className="cs-results-count">
            Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'specialty coffee' : 'specialty coffees'}
          </span>
          {(searchTerm || activeCategory !== 'all' || roastFilter !== 'all') && (
            <button
              type="button"
              className="cs-reset-btn"
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
                setRoastFilter('all');
              }}
            >
              Reset Filters ✕
            </button>
          )}
        </div>

        {/* ── Products Grid ── */}
        {loading ? (
          <div className="cs-products-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="cs-empty-state">
            <div className="cs-empty-icon"><FaCoffee /></div>
            <h3>No Specialty Coffees Found</h3>
            <p>We couldn't find any roast matching your current filter criteria.</p>
            <button
              type="button"
              className="cs-empty-action-btn"
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
                setRoastFilter('all');
              }}
            >
              View All Coffees
            </button>
          </div>
        ) : (
          <div className="cs-products-grid">
            {filteredProducts.map((product, idx) => (
              <CoffeeCard
                key={product._id || idx}
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

      {/* ── Quick Cupping Modal ── */}
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

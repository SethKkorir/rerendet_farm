import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaTimes, FaMinus, FaPlus, FaSearch, FaCheck, FaWhatsapp,
  FaArrowRight, FaEye, FaLeaf, FaFire, FaCoffee
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import { isProductOutOfStock } from '../../utils/stockValidator';
import './CoffeeShop.css';

/* ══════════════════════════════════════════════════════════
   ☕ SPECIALTY COFFEE BAG PALETTES
   Rich, luxury Scandinavian coffee packaging tones
══════════════════════════════════════════════════════════ */
const BAG_PALETTES = [
  // 1. Warm Crimson / Ruby Espresso
  {
    body: '#8F1E24',
    bodyShade: '#6E1419',
    highlight: '#A8272F',
    topFold: '#7A181D',
    sideGusset: '#540D12',
    accent: '#D4AF37',
    text: '#F5E6CC',
    subText: '#D4AF37',
    barcodeColor: '#FFFFFF',
    tag: 'Espresso Roast'
  },
  // 2. Kraft Warm Almond / Linen
  {
    body: '#ECE5D8',
    bodyShade: '#DDD4C3',
    highlight: '#F5EFE4',
    topFold: '#D5CBB8',
    sideGusset: '#BFB4A0',
    accent: '#1C1917',
    text: '#1C1917',
    subText: '#574235',
    barcodeColor: '#1C1917',
    tag: 'Filter Roast'
  },
  // 3. Cobalt Highland Blue
  {
    body: '#1B357A',
    bodyShade: '#122353',
    highlight: '#24459C',
    topFold: '#172B66',
    sideGusset: '#0C1838',
    accent: '#D4AF37',
    text: '#F8FAFC',
    subText: '#F5BE48',
    barcodeColor: '#FFFFFF',
    tag: 'Single Origin Filter'
  },
  // 4. Forest Emerald Green
  {
    body: '#124827',
    bodyShade: '#0B3019',
    highlight: '#195E33',
    topFold: '#0E3B1F',
    sideGusset: '#061D0F',
    accent: '#D4AF37',
    text: '#F0FDF4',
    subText: '#D4AF37',
    barcodeColor: '#FFFFFF',
    tag: 'Highland Roast'
  },
  // 5. Deep Roasted Charcoal
  {
    body: '#221D1A',
    bodyShade: '#15110E',
    highlight: '#352D28',
    topFold: '#1C1714',
    sideGusset: '#0D0A08',
    accent: '#D4AF37',
    text: '#FAFAFA',
    subText: '#E5A93C',
    barcodeColor: '#FFFFFF',
    tag: 'Dark Roast'
  }
];

export const getBagPalette = (product, index = 0) => {
  const roast = (product?.roastLevel || '').toLowerCase();
  const name = (product?.name || '').toLowerCase();

  if (roast.includes('filter') || name.includes('filter') || name.includes('colombia')) {
    return BAG_PALETTES[2]; // Cobalt Blue
  }
  if (name.includes('bomet') || name.includes('caramel') || name.includes('cream') || name.includes('light')) {
    return BAG_PALETTES[1]; // Warm Kraft Cream
  }
  if (name.includes('espresso') || roast.includes('espresso') || name.includes('dark')) {
    return BAG_PALETTES[0]; // Crimson Red
  }

  return BAG_PALETTES[index % BAG_PALETTES.length];
};

/* ══════════════════════════════════════════════════════════
   ☕ PRODUCT SIZES & PRICING
   Uses strictly the sizes configured by the admin.
   If only a single size or price is set, no fake tiers are added.
══════════════════════════════════════════════════════════ */
export const getProductSizes = (product) => {
  if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
    const valid = product.sizes.filter((s) => s && s.size && Number(s.price) >= 0);
    if (valid.length > 0) {
      return valid.map((s) => ({
        size: s.size,
        price: Number(s.price)
      }));
    }
  }

  const singlePrice = Number(product?.price) || 0;
  return [
    { size: product?.size || 'Standard', price: singlePrice }
  ];
};

export const GRIND_OPTIONS = [
  'Whole Beans',
  'French Press',
  'Pour-Over',
  'AeroPress',
  'Espresso'
];

export const generateSpecialtyBagSvg = (product, palette, weight = '250G') => {
  const brand = 'RERENDET';
  const cleanWeight = (weight || '250G').toUpperCase();

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="100%" height="100%">
    <defs>
      <!-- Ground Drop Shadow -->
      <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23000000" stop-opacity="0.22" />
        <stop offset="60%" stop-color="%23000000" stop-opacity="0.08" />
        <stop offset="100%" stop-color="%23000000" stop-opacity="0" />
      </radialGradient>
      <!-- Bag Body Gradients -->
      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
        <stop offset="25%" stop-color="${encodeURIComponent(palette.body)}" />
        <stop offset="70%" stop-color="${encodeURIComponent(palette.highlight)}" />
        <stop offset="100%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
      </linearGradient>
      <linearGradient id="gussetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${encodeURIComponent(palette.sideGusset)}" />
        <stop offset="100%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
      </linearGradient>
      <linearGradient id="topSealGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${encodeURIComponent(palette.topFold)}" />
        <stop offset="100%" stop-color="${encodeURIComponent(palette.bodyShade)}" />
      </linearGradient>
    </defs>

    <!-- Natural Ground Floor Shadow -->
    <ellipse cx="200" cy="465" rx="110" ry="16" fill="url(%23floorShadow)" />

    <!-- Group: 3D Coffee Pouch Standing Upright -->
    <g transform="translate(0, 10)">
      <!-- Left Gusset (Depth Shadow) -->
      <polygon points="120,445 138,452 144,120 128,110" fill="url(%23gussetGrad)" opacity="0.95" />

      <!-- Main Front Face of Bag -->
      <polygon points="138,452 262,452 272,120 144,120" fill="url(%23bodyGrad)" />

      <!-- Right Gusset Fold -->
      <polygon points="262,452 278,445 284,112 272,120" fill="url(%23gussetGrad)" opacity="0.85" />

      <!-- Top Fold & Crimp Seal -->
      <polygon points="144,120 272,120 258,68 156,68" fill="url(%23topSealGrad)" />
      <!-- Crimp Lines -->
      <line x1="160" y1="74" x2="254" y2="74" stroke="${encodeURIComponent(palette.sideGusset)}" stroke-width="1.5" opacity="0.6" />
      <line x1="162" y1="80" x2="252" y2="80" stroke="${encodeURIComponent(palette.sideGusset)}" stroke-width="1.5" opacity="0.6" />

      <!-- Brand Micro Header -->
      <text x="206" y="98" fill="${encodeURIComponent(palette.text)}" font-family="'Outfit', -apple-system, sans-serif" font-size="8" font-weight="700" letter-spacing="3" text-anchor="middle" opacity="0.85">RERENDET HIGHLANDS</text>

      <!-- Iconic Circle Emblem Logo with Gold Foil Ring -->
      <circle cx="206" cy="182" r="16" fill="none" stroke="${encodeURIComponent(palette.accent)}" stroke-width="6" />
      <circle cx="206" cy="182" r="6" fill="${encodeURIComponent(palette.accent)}" opacity="0.9" />

      <!-- Main Bag Typography -->
      <text x="206" y="235" fill="${encodeURIComponent(palette.text)}" font-family="'Outfit', -apple-system, sans-serif" font-size="14" font-weight="900" letter-spacing="2" text-anchor="middle">${brand}</text>
      <text x="206" y="254" fill="${encodeURIComponent(palette.subText)}" font-family="'Outfit', -apple-system, sans-serif" font-size="8.5" font-weight="800" letter-spacing="1.5" text-anchor="middle">SINGLE ORIGIN · 1,800 MASL</text>

      <!-- Clean Specification Lines on Left Flank -->
      <g opacity="0.75" transform="translate(154, 275)">
        <line x1="0" y1="0" x2="95" y2="0" stroke="${encodeURIComponent(palette.text)}" stroke-width="0.8" opacity="0.4" />
        <rect x="0" y="8" width="60" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.5" />
        <rect x="0" y="14" width="85" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.4" />
        <rect x="0" y="20" width="75" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.4" />
        <rect x="0" y="26" width="50" height="2" fill="${encodeURIComponent(palette.text)}" opacity="0.4" />
      </g>

      <!-- Bottom Flank: Barcode & Net Weight -->
      <g transform="translate(154, 395)" opacity="0.85">
        <rect x="0" y="0" width="2" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />
        <rect x="4" y="0" width="1" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />
        <rect x="7" y="0" width="3" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />
        <rect x="12" y="0" width="1.5" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />
        <rect x="15" y="0" width="2.5" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />
        <rect x="20" y="0" width="1" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />
        <rect x="23" y="0" width="3" height="28" fill="${encodeURIComponent(palette.barcodeColor)}" />

        <!-- Net Weight Label -->
        <text x="96" y="22" fill="${encodeURIComponent(palette.text)}" font-family="'Outfit', sans-serif" font-size="7.5" font-weight="700" letter-spacing="0.5" text-anchor="end" opacity="0.8">NET WT ${cleanWeight}</text>
      </g>
    </g>
  </svg>`;
};

export const generateEquipmentSvg = (product) => {
  const brand = 'RERENDET';
  const name = (product?.name || 'Brew Gear').toUpperCase().slice(0, 22);

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="100%" height="100%">
    <defs>
      <radialGradient id="eqShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23000000" stop-opacity="0.18" />
        <stop offset="60%" stop-color="%23000000" stop-opacity="0.06" />
        <stop offset="100%" stop-color="%23000000" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="eqBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%232D241E" />
        <stop offset="50%" stop-color="%231E1712" />
        <stop offset="100%" stop-color="%23140F0B" />
      </linearGradient>
      <linearGradient id="eqGoldAcc" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="%23E5BE48" />
        <stop offset="100%" stop-color="%23B28325" />
      </linearGradient>
    </defs>

    <ellipse cx="200" cy="430" rx="120" ry="16" fill="url(%23eqShadow)" />

    <g transform="translate(0, 10)">
      <rect x="110" y="110" width="180" height="280" rx="20" fill="url(%23eqBodyGrad)" stroke="%233A2E26" stroke-width="2" />
      <path d="M140 110 L155 70 L245 70 L260 110 Z" fill="%23231A14" stroke="%233A2E26" stroke-width="1.5" />
      <rect x="170" y="52" width="60" height="18" rx="5" fill="url(%23eqGoldAcc)" />

      <circle cx="200" cy="180" r="32" fill="%23140F0B" stroke="url(%23eqGoldAcc)" stroke-width="2.5" />
      <circle cx="200" cy="180" r="26" fill="%231E1712" />
      <line x1="200" y1="180" x2="214" y2="168" stroke="%23E5BE48" stroke-width="2" stroke-linecap="round" />
      <circle cx="200" cy="180" r="3.5" fill="%23E5BE48" />

      <line x1="140" y1="245" x2="260" y2="245" stroke="%233A2E26" stroke-width="1.5" />
      <circle cx="160" cy="275" r="6" fill="url(%23eqGoldAcc)" />
      <circle cx="200" cy="275" r="6" fill="url(%23eqGoldAcc)" />
      <circle cx="240" cy="275" r="6" fill="url(%23eqGoldAcc)" />

      <rect x="130" y="340" width="140" height="35" rx="6" fill="%2317110D" stroke="%233A2E26" stroke-width="1" />
      <line x1="145" y1="352" x2="255" y2="352" stroke="%234A3C32" stroke-width="1.5" stroke-dasharray="4,4" />
      <line x1="145" y1="362" x2="255" y2="362" stroke="%234A3C32" stroke-width="1.5" stroke-dasharray="4,4" />

      <text x="200" y="320" font-family="'Cinzel', Georgia, serif" font-size="11" font-weight="700" letter-spacing="3" fill="%23D4AF37" text-anchor="middle">${brand}</text>
      <text x="200" y="333" font-family="sans-serif" font-size="6.5" font-weight="600" letter-spacing="1" fill="%23A1A1AA" text-anchor="middle">${encodeURIComponent(name)}</text>
    </g>
  </svg>`;
};

/* ══════════════════════════════════════════════════════════
   ☕ PRODUCT CARD COMPONENT
══════════════════════════════════════════════════════════ */
const ProductCard = ({ product, index, handleAddToCart, addingToCart, setSelectedProduct }) => {
  const { publicSettings } = useContext(AppContext);
  const [isAdded, setIsAdded] = useState(false);
  const palette = useMemo(() => getBagPalette(product, index), [product, index]);

  // Calibrated size tiers
  const availableSizes = useMemo(() => getProductSizes(product), [product]);
  const [selectedSizeObj, setSelectedSizeObj] = useState(availableSizes[0]);
  const currentPrice = selectedSizeObj?.price ?? 850;

  // Strict In Stock check
  const inStock = useMemo(() => {
    return !isProductOutOfStock(product);
  }, [product]);

  const variationKey = `${product._id}-${selectedSizeObj.size}`;
  const isAdding = addingToCart === variationKey;

  const isCoffee = useMemo(() => {
    if (!product) return false;
    if (product.roastLevel) return true;
    if (Array.isArray(product.flavorNotes) && product.flavorNotes.length > 0) return true;
    const cat = (product.categoryId?.name || product.categoryId?.slug || product.category || '').toLowerCase();
    if (cat.includes('coffee') || cat.includes('bean')) return true;
    const name = (product.name || '').toLowerCase();
    if (name.includes('coffee') || name.includes('bean') || name.includes('roast') || name.includes('arabica')) return true;
    return false;
  }, [product]);

  const roastTag = useMemo(() => {
    if (product?.roastLevel) {
      const rl = product.roastLevel.toLowerCase();
      if (rl.includes('espresso')) return 'Espresso Roast';
      if (rl.includes('light')) return 'Light Roast';
      if (rl.includes('medium')) return 'Medium Roast';
      if (rl.includes('dark')) return 'Dark Roast';
      return `${product.roastLevel} Roast`;
    }
    return null;
  }, [product]);

  const badgeText = useMemo(() => {
    if (product?.badge) return product.badge;
    if (product?.isFeatured) return 'Featured';
    return null;
  }, [product]);

  const displayTitle = useMemo(() => {
    return product?.name || 'Specialty Coffee';
  }, [product]);

  const flavorPills = useMemo(() => {
    if (Array.isArray(product?.flavorNotes) && product.flavorNotes.length > 0) {
      return product.flavorNotes.filter(Boolean).slice(0, 3);
    }
    return [];
  }, [product]);

  const originLine = useMemo(() => {
    return product?.origin?.trim() || null;
  }, [product]);

  const currencySymbol = publicSettings?.payment?.currencySymbol || 'KSh';
  const formattedPrice = `${currencySymbol} ${Number(currentPrice).toLocaleString()}`;

  const hasRealPhoto = Boolean(
    (product.images && product.images.length > 0 && product.images[0]?.url) || product.image
  );

  const fallbackSvg = useMemo(() => {
    if (isCoffee) {
      return generateSpecialtyBagSvg(product, palette, selectedSizeObj.size);
    }
    return generateEquipmentSvg(product);
  }, [product, palette, selectedSizeObj.size, isCoffee]);

  const productImage = (product.images && product.images[0]?.url) || product.image || fallbackSvg;

  const onAddClick = async (e) => {
    e.stopPropagation();
    if (!inStock) {
      import('../../api/api').then(m => m.reportOutOfStock(product._id)).catch(() => {});
      return;
    }
    if (isAdding) return;

    await handleAddToCart(product, selectedSizeObj.size, currentPrice, 1, isCoffee ? 'Whole Beans' : undefined);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2200);
  };

  const onWhatsAppClick = (e) => {
    e.stopPropagation();
    const phone = (publicSettings?.support?.whatsapp || '+254700000000').replace(/[^0-9]/g, '');
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const itemUrl = `${originUrl}/product/${product.slug || product._id}`;
    const sizeText = selectedSizeObj?.size && selectedSizeObj.size !== 'Standard' ? ` (${selectedSizeObj.size})` : '';
    const stockNote = !inStock ? ' (currently marked sold out — inquiring for restocking)' : '';
    const msg = `Hi Rerendet Farm! I would like to order *${product.name}*${sizeText} for *${formattedPrice}*${stockNote}.\n${itemUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="scand-card">
      {/* ── Top Media Area ── */}
      <div
        className="scand-media"
        onClick={() => setSelectedProduct({ ...product, initialSize: selectedSizeObj.size })}
        title={`View details for ${product.name}`}
      >
        {roastTag && <span className="scand-badge-roast">{roastTag}</span>}
        {badgeText && <span className="scand-badge-new">{badgeText}</span>}
        {!inStock && <span className="scand-badge-soldout">Sold Out</span>}

        <div className={`scand-img-wrapper ${hasRealPhoto ? 'scand-img-wrapper--photo' : ''}`}>
          <img
            src={productImage}
            alt={product.name}
            className={`scand-bag-img ${hasRealPhoto ? 'scand-bag-img--photo' : ''}`}
            loading="lazy"
            onError={(e) => {
              if (e.target.src !== fallbackSvg) {
                e.target.src = fallbackSvg;
              }
            }}
          />
        </div>

        <button
          type="button"
          className="scand-quickview-btn"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProduct({ ...product, initialSize: selectedSizeObj.size });
          }}
          aria-label={`Quick view ${product.name}`}
        >
          <FaEye size={12} />
          <span>Quick View</span>
        </button>
      </div>

      {/* ── Bottom Content Area ── */}
      <div className="scand-body">
        {(originLine || product.process) && (
          <div className="scand-origin-meta">
            {originLine && <span className="scand-origin-text">{originLine}</span>}
            {product.process && (
              <span className="scand-process-tag">{product.process}</span>
            )}
          </div>
        )}

        <h3
          className="scand-title"
          onClick={() => setSelectedProduct({ ...product, initialSize: selectedSizeObj.size })}
          title={product.name}
        >
          {displayTitle}
        </h3>

        {/* Sensory Flavor Tags */}
        {flavorPills.length > 0 && (
          <div className="scand-flavor-tags">
            {flavorPills.map((note, i) => (
              <span key={i} className="scand-flavor-tag">{note}</span>
            ))}
          </div>
        )}

        {/* Live Weight Selector — only if multiple sizes set by admin */}
        {availableSizes.length > 1 && (
          <div className="scand-card-sizes" onClick={(e) => e.stopPropagation()}>
            {availableSizes.map((s) => (
              <button
                key={s.size}
                type="button"
                className={`scand-size-chip ${selectedSizeObj.size === s.size ? 'active' : ''}`}
                onClick={() => setSelectedSizeObj(s)}
              >
                <span>{s.size}</span>
              </button>
            ))}
          </div>
        )}

        {/* Footer: Price & Premium Action Group */}
        <div className="scand-footer">
          <div className="scand-price-group">
            <span className="scand-price">{formattedPrice}</span>
            {selectedSizeObj?.size && selectedSizeObj.size !== 'Standard' && (
              <span className="scand-unit-label">/ {selectedSizeObj.size}</span>
            )}
          </div>

          <div className="scand-actions-group" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="scand-wa-btn"
              onClick={onWhatsAppClick}
              title="Order or inquire on WhatsApp"
              aria-label={`Order ${product.name} on WhatsApp`}
            >
              <FaWhatsapp size={15} />
            </button>

            <button
              type="button"
              className={`scand-btn ${isAdded ? 'scand-btn--added' : ''} ${!inStock ? 'scand-btn--soldout' : ''}`}
              onClick={onAddClick}
              disabled={!inStock || isAdding}
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <>
                  <FaCheck size={11} />
                  <span>Added</span>
                </>
              ) : isAdding ? (
                <span>Adding...</span>
              ) : !inStock ? (
                <span>Sold Out</span>
              ) : (
                <>
                  <FaPlus size={11} />
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
   ☕ ULTRA-PREMIUM QUICK VIEW ROASTERY MODAL
   Designed to captivate customers and turn visitors into collectors
══════════════════════════════════════════════════════════ */
const QuickViewModal = ({ product, onClose, onAddToCart, addingToCart }) => {
  const { publicSettings } = useContext(AppContext);
  const palette = useMemo(() => getBagPalette(product, 0), [product]);
  const availableSizes = useMemo(() => getProductSizes(product), [product]);

  // Initial size check
  const initialSizeObj = useMemo(() => {
    if (product.initialSize) {
      const match = availableSizes.find(s => s.size === product.initialSize);
      if (match) return match;
    }
    return availableSizes[0] || { size: 'Standard', price: 0 };
  }, [product, availableSizes]);

  const [selectedSize, setSelectedSize] = useState(initialSizeObj);
  const [selectedGrind, setSelectedGrind] = useState('Whole Beans');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const currentPrice = selectedSize.price || 0;

  const inStock = useMemo(() => {
    return !isProductOutOfStock(product);
  }, [product]);

  const isCoffee = useMemo(() => {
    if (!product) return false;
    if (product.roastLevel) return true;
    if (Array.isArray(product.flavorNotes) && product.flavorNotes.length > 0) return true;
    const cat = (product.categoryId?.name || product.categoryId?.slug || product.category || '').toLowerCase();
    if (cat.includes('coffee') || cat.includes('bean')) return true;
    const name = (product.name || '').toLowerCase();
    if (name.includes('coffee') || name.includes('roast') || name.includes('bean') || name.includes('arabica')) return true;
    return false;
  }, [product]);

  const variationKey = `${product._id}-${selectedSize.size}`;
  const isAdding = addingToCart === variationKey;

  const hasRealPhoto = Boolean(
    (product.images && product.images.length > 0 && product.images[0]?.url) || product.image
  );

  const fallbackSvg = useMemo(() => {
    if (isCoffee) {
      return generateSpecialtyBagSvg(product, palette, selectedSize.size);
    }
    return generateEquipmentSvg(product);
  }, [product, palette, selectedSize.size, isCoffee]);

  const productImage = (product.images && product.images[0]?.url) || product.image || fallbackSvg;

  const currencySymbol = publicSettings?.payment?.currencySymbol || 'KSh';
  const totalAmount = currentPrice * quantity;
  const formattedTotal = `${currencySymbol} ${Number(totalAmount).toLocaleString()}`;
  const formattedUnitPrice = `${currencySymbol} ${Number(currentPrice).toLocaleString()}`;

  const handleAdd = async () => {
    if (!inStock) {
      import('../../api/api').then(m => m.reportOutOfStock(product._id)).catch(() => {});
      return;
    }
    await onAddToCart(product, selectedSize.size, currentPrice, quantity, isCoffee ? selectedGrind : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const handleWhatsApp = () => {
    let msg = `Hi Rerendet Farm! I would like to order *${product.name}*\n• Price: ${formattedUnitPrice}\n• Quantity: ${quantity}\n• Total: ${formattedTotal}`;
    if (availableSizes.length > 1) {
      msg += `\n• Size: ${selectedSize.size}`;
    }
    if (isCoffee) {
      msg += `\n• Grind: ${selectedGrind}`;
    }
    msg += `\n\nPlease advise on dispatch!`;
    const url = getWhatsAppLink(publicSettings, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Close on Escape
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

  const hasTopBadges = Boolean(product.roastLevel || product.badge);

  return (
    <motion.div
      className="scand-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="scand-modal-box luxury-roastery-modal"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="scand-modal-close" onClick={onClose} aria-label="Close modal">
          <FaTimes />
        </button>

        <div className="scand-modal-content">
          {/* ── Left Column: Showcase ── */}
          <div className="scand-modal-media">
            <div className="scand-modal-showcase">
              {hasTopBadges && (
                <div className="scand-modal-badges-top">
                  {product.roastLevel && (
                    <span className="roastery-chip roast">
                      <FaFire className="roastery-chip-icon" />
                      {product.roastLevel} Roast
                    </span>
                  )}
                  {product.badge && (
                    <span className="roastery-chip badge">
                      {product.badge}
                    </span>
                  )}
                </div>
              )}

              <div className="scand-modal-bag-pedestal">
                <img
                  src={productImage}
                  alt={product.name}
                  className="scand-modal-bag"
                  onError={(e) => {
                    if (e.target.src !== fallbackSvg) e.target.src = fallbackSvg;
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Right Column: Roastery Info & Selection ── */}
          <div className="scand-modal-details">
            <div className="roastery-meta-header">
              {selectedSize?.size && (
                <span className="roastery-weight-pill">
                  {selectedSize.size}
                </span>
              )}
              {product.origin && (
                <span className="roastery-origin-pill">
                  <FaLeaf style={{ color: '#D4AF37' }} />
                  {product.origin}
                </span>
              )}
              {product.process && (
                <span className="roastery-process-pill">
                  {product.process}
                </span>
              )}
            </div>

            <h2 className="scand-modal-title">{product.name}</h2>

            {/* Flavor Notes — only if set by admin */}
            {Array.isArray(product.flavorNotes) && product.flavorNotes.filter(Boolean).length > 0 && (
              <div className="roastery-flavors-row">
                <span className="roastery-flavor-lead">Tasting Notes:</span>
                {product.flavorNotes.filter(Boolean).map((note, i) => (
                  <span key={i} className="roastery-flavor-badge">{note}</span>
                ))}
              </div>
            )}

            {product.description && (
              <p className="scand-modal-desc">{product.description}</p>
            )}

            {/* Size Selector — only if multiple sizes configured by admin */}
            {availableSizes.length > 1 && (
              <div className="roastery-selector-section">
                <div className="selector-head">
                  <span className="selector-title">Size</span>
                </div>
                <div className="roastery-sizes-grid">
                  {availableSizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`roastery-size-btn ${selectedSize.size === s.size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(s)}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grind Type Selector — only if coffee product */}
            {isCoffee && (
              <div className="roastery-selector-section">
                <div className="selector-head">
                  <span className="selector-title">Grind</span>
                </div>
                <div className="roastery-grind-grid">
                  {GRIND_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`roastery-grind-btn ${selectedGrind === g ? 'active' : ''}`}
                      onClick={() => setSelectedGrind(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Final Action & Quantity Strip */}
            <div className="roastery-checkout-bar">
              <div className="roastery-checkout-top">
                <div className="roastery-stepper-wrap">
                  <button
                    type="button"
                    className="roastery-step-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <FaMinus size={11} />
                  </button>
                  <span className="roastery-step-val">{quantity}</span>
                  <button
                    type="button"
                    className="roastery-step-btn"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <FaPlus size={11} />
                  </button>
                </div>

                <div className="roastery-price-block">
                  <span className="roastery-price-total">{formattedTotal}</span>
                </div>
              </div>

              {/* Action Buttons Down Below */}
              <div className="roastery-checkout-actions">
                <button
                  type="button"
                  className={`roastery-add-btn ${added ? 'added' : ''}`}
                  onClick={handleAdd}
                  disabled={!inStock || isAdding}
                >
                  {added ? (
                    <>
                      <FaCheck /> Added to Cart
                    </>
                  ) : isAdding ? (
                    'Adding...'
                  ) : !inStock ? (
                    'Sold Out'
                  ) : (
                    <>
                      <span>Add to Cart</span>
                      <FaArrowRight size={13} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="roastery-wa-btn"
                  onClick={handleWhatsApp}
                  title="Order directly via WhatsApp Concierge"
                  aria-label="Order on WhatsApp"
                >
                  <FaWhatsapp size={18} />
                  <span className="roastery-wa-text">WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════
   ☕ PRODUCT CARD SKELETON PLACEHOLDER
══════════════════════════════════════════════════════════ */
const ProductCardSkeleton = () => (
  <div className="scand-card scand-card--skeleton" aria-hidden="true">
    <div className="scand-img-wrapper">
      <div className="scand-skeleton-badge" />
      <div className="scand-skeleton-pouch" />
      <div className="scand-floor-shadow" style={{ opacity: 0.18 }} />
    </div>
    <div className="scand-info">
      <div className="scand-skeleton-name" />
      <div className="scand-skeleton-name scand-skeleton-name--short" />
      <div className="scand-skeleton-flavor" />
      <div className="scand-bottom-row" style={{ marginTop: '1.25rem' }}>
        <div className="scand-skeleton-price" />
        <div className="scand-skeleton-btn" />
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   ☕ MAIN COFFEE SHOP COMPONENT
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
    } catch (_) {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem('rerendet_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (_) {}
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
      // Keep existing products visible without flashing if revalidating
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
        } catch (_) {}
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error(err);
      setProducts(current => {
        if (!current || current.length === 0) {
          showAlert('Failed to load specialty coffee collection.', 'error');
          return [];
        }
        return current;
      });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Clean categories list
  const categoriesList = useMemo(() => {
    const raw = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...raw];
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory);
    }

    if (roastFilter !== 'all') {
      list = list.filter(p => p.roastLevel?.toLowerCase() === roastFilter.toLowerCase());
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
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [products, activeCategory, roastFilter, searchTerm, sortBy]);

  // Add to cart handler with full size & grind fidelity
  const handleAddToCart = async (product, size, price, qty = 1, grind = 'Whole Beans') => {
    const variationKey = `${product._id}-${size}`;
    setAddingToCart(variationKey);

    const availableSizes = getProductSizes(product);

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
        sizes: availableSizes,
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
    <section id="coffee-shop" className="scand-shop-section">
      <div className="scand-container">
        
        {/* ── Minimalist Section Header ── */}
        <div className="scand-header">
          <span className="scand-header-tag">HIGHLAND SPECIALTY HARVEST</span>
          <h2 className="scand-header-title">Our Coffee Shop</h2>
          <p className="scand-header-sub">
            Single-origin Arabica cultivated at 1,800m elevation on the volcanic slopes of Kenya. Freshly roasted in micro-batches.
          </p>
        </div>

        {/* ── Clean Filter Navigation ── */}
        <div className="scand-filters-bar">
          <div className="scand-pills-row">
            {categoriesList.map((cat) => {
              const label = cat === 'all'
                ? 'All Coffees'
                : cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  className={`scand-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {label}
                </button>
              );
            })}
            <span className="scand-count-badge">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'roast' : 'roasts'}
            </span>
          </div>

          {/* Minimal Live Search & Roast Selector */}
          <div className="scand-search-group">
            <div className="scand-search-input-wrap">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search coffee or flavor notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="scand-search-input"
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => setSearchTerm('')}>
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <select
              value={roastFilter}
              onChange={(e) => setRoastFilter(e.target.value)}
              className="scand-select"
              aria-label="Filter by roast profile"
            >
              <option value="all">All Roasts</option>
              <option value="espresso">Espresso Roast</option>
              <option value="filter">Filter Roast</option>
              <option value="medium">Medium Roast</option>
              <option value="dark">Dark Roast</option>
            </select>
          </div>
        </div>

        {/* ── Main Products Grid ── */}
        {loading ? (
          <div className="scand-grid">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={`skeleton-${idx}`} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="scand-empty-state">
            <h3>No coffees found</h3>
            <p>Try resetting your search or filter options.</p>
            <button
              className="scand-btn"
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
                setRoastFilter('all');
              }}
            >
              Show all coffees
            </button>
          </div>
        ) : (
          <div className="scand-grid">
            {filteredProducts.map((product, idx) => (
              <ProductCard
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

      {/* ── Luxury Quick View Modal ── */}
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

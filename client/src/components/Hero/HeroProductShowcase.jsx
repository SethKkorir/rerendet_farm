import React, { useState, useEffect, useRef, useCallback } from 'react';
import './HeroProductShowcase.css';

/**
 * Authentic Rerendet Coffee Products for the Hero Showcase.
 * Featuring the official Rerendet Coffee Espresso packages (1 kg and 250 g).
 */
export const SHOWCASE_PRODUCTS = [
  {
    id: 'rerendet-espresso-1kg',
    name: 'Rerendet Espresso 1kg',
    image: '/images/coffee/rerendet-espresso-1kg.png',
    fallbackImage: '/images/coffee/rerendet-espresso-1kg.jpg',
    origin: 'Rerendet Highlands · 2,150m',
    subOrigin: 'Single Origin Highland Arabica',
    roastText: 'Espresso Roast · Dark Berries & Cocoa',
    roastDots: 5,
    badgeText: '1 kg Barista Value Pack',
    badgeIcon: '☕',
    accentColor: '#2E7D32',
  },
  {
    id: 'rerendet-espresso-250g',
    name: 'Rerendet Espresso 250g',
    image: '/images/coffee/rerendet-espresso-250g.png',
    fallbackImage: '/images/coffee/rerendet-espresso-250g.jpg',
    origin: 'Rerendet Highlands · 2,150m',
    subOrigin: 'Handcrafted Micro-Batch',
    roastText: 'Espresso Roast · Dark Berries & Cocoa',
    roastDots: 5,
    badgeText: '250 g Artisan Reserve',
    badgeIcon: '🌿',
    accentColor: '#D4AF37',
  },
];

// Display duration per product in ms (exactly 5 seconds as specified)
const DISPLAY_DURATION = 5000;
// Slide transition duration (~1.1s for ultra-smooth conveyor motion)
const SLIDE_DURATION = 1100;

const HeroProductShowcase = ({
  isPromoActive = false,
  discountPercent = 30,
  promoBadgeRef,
  cornerBadgeEnabled = true,
  roastTagEnabled = true,
  onProductChange,
  heroData,
}) => {
  // Construct dynamic products based on admin hero images or default showcase products
  const products = React.useMemo(() => {
    const list = [
      {
        id: 'rerendet-espresso-1kg',
        name: 'Rerendet Espresso 1kg',
        image: heroData?.imageUrl || '/images/coffee/rerendet-espresso-1kg.png',
        fallbackImage: '/images/coffee/rerendet-espresso-1kg.jpg',
        origin: 'Rerendet Highlands · 2,150m',
        subOrigin: 'Single Origin Highland Arabica',
        roastText: 'Espresso Roast · Dark Berries & Cocoa',
        roastDots: 5,
        badgeText: '1 kg Barista Value Pack',
        badgeIcon: '☕',
        accentColor: '#2E7D32',
      },
      {
        id: 'rerendet-espresso-250g',
        name: 'Rerendet Espresso 250g',
        image: heroData?.imageUrl2 || '/images/coffee/rerendet-espresso-250g.png',
        fallbackImage: '/images/coffee/rerendet-espresso-250g.jpg',
        origin: 'Rerendet Highlands · 2,150m',
        subOrigin: 'Handcrafted Micro-Batch',
        roastText: 'Espresso Roast · Dark Berries & Cocoa',
        roastDots: 5,
        badgeText: '250 g Artisan Reserve',
        badgeIcon: '🌿',
        accentColor: '#D4AF37',
      },
    ];

    if (heroData?.imageUrl3) {
      list.push({
        id: 'rerendet-artisan-reserve',
        name: 'Rerendet Reserve Micro-lot',
        image: heroData.imageUrl3,
        fallbackImage: '/images/coffee/rerendet-espresso-1kg.png',
        origin: 'Nandi Hills & Bomet · 2,000m',
        subOrigin: 'Artisan Micro-Lot Selection',
        roastText: 'Medium-Dark · Floral & Caramel',
        roastDots: 4,
        badgeText: 'Limited Estate Reserve',
        badgeIcon: '✨',
        accentColor: '#B45309',
      });
    }

    return list;
  }, [heroData?.imageUrl, heroData?.imageUrl2, heroData?.imageUrl3]);

  const [currentIndex, setCurrentIndex] = useState(0);
  // 'idle' = product is visible & floating, 'sliding' = conveyor transition in progress
  const [phase, setPhase] = useState('idle');
  const [prevIndex, setPrevIndex] = useState(null); // track outgoing product during slide
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const timerRef = useRef(null);
  const slideTimerRef = useRef(null);
  const frameRef = useRef(null);

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const listener = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', listener);
    return () => mediaQuery.removeEventListener?.('change', listener);
  }, []);

  // 2. Preload product images on mount to avoid layout shift or network lag
  useEffect(() => {
    products.forEach((prod) => {
      const img = new Image();
      img.src = prod.image;
    });
  }, [products]);

  // Clear all timers safely
  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
  }, []);

  // Reset index if product list shrinks
  useEffect(() => {
    if (currentIndex >= products.length) {
      setCurrentIndex(0);
    }
  }, [products.length, currentIndex]);

  // 3. Infinite Conveyor Belt Loop (5 seconds idle per product)
  useEffect(() => {
    if (reducedMotion) {
      setPhase('idle');
      setPrevIndex(null);
      return;
    }

    clearTimers();

    // Product is visible & floating for DISPLAY_DURATION, then trigger slide
    timerRef.current = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % products.length;
      // Start the conveyor slide: current becomes "prev" (slides out left),
      // next becomes "current" (slides in from right)
      setPrevIndex(currentIndex);
      setCurrentIndex(nextIndex);
      setPhase('sliding');

      // After the slide animation completes, clean up
      slideTimerRef.current = setTimeout(() => {
        setPrevIndex(null);
        setPhase('idle');
      }, SLIDE_DURATION);
    }, DISPLAY_DURATION);

    return () => {
      clearTimers();
    };
  }, [currentIndex, phase, reducedMotion, clearTimers, products.length]);

  // Notify parent on product change if needed
  useEffect(() => {
    if (onProductChange && products[currentIndex]) {
      onProductChange(products[currentIndex]);
    }
  }, [currentIndex, onProductChange, products]);

  // Manual dot switch — triggers conveyor slide to selected product
  const handleSelectProduct = (index) => {
    if (index === currentIndex || phase === 'sliding') return;
    clearTimers();
    setPrevIndex(currentIndex);
    setCurrentIndex(index);
    setPhase('sliding');

    slideTimerRef.current = setTimeout(() => {
      setPrevIndex(null);
      setPhase('idle');
    }, SLIDE_DURATION);
  };

  const currentProduct = products[currentIndex] || products[0];
  const prevProduct = prevIndex !== null ? products[prevIndex] : null;

  // Badge data: during slide show incoming product info, otherwise current
  const badgeProduct = currentProduct;

  return (
    <div
      className={`hero-product-stage ${reducedMotion ? 'reduced-motion' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Rerendet Coffee Product Showcase"
    >
      {/* ── Background Ambient Radial Stage Spotlight ── */}
      <div className="hero-stage-glow" aria-hidden="true" />



      {/* ── Main Showcase — Conveyor Belt Container ── */}
      <div className="hero-showcase-frame" ref={frameRef}>

        {/* Outgoing product (slides out to left during transition) */}
        {phase === 'sliding' && prevProduct && (
          <div
            key={`out-${prevProduct.id}`}
            className="hero-product-package-wrap conveyor-exit"
            aria-hidden="true"
          >
            <img
              src={prevProduct.image}
              alt={prevProduct.name}
              className="hero-product-img"
              loading="eager"
              decoding="async"
              style={{ objectFit: 'contain' }}
              onError={(e) => {
                if (prevProduct.fallbackImage && e.currentTarget.src !== prevProduct.fallbackImage) {
                  e.currentTarget.src = prevProduct.fallbackImage;
                }
              }}
            />
            <div className="hero-package-glare" aria-hidden="true" />
          </div>
        )}

        {/* Current product (slides in from right during transition, then floats idle) */}
        <div
          key={`in-${currentProduct.id}-${currentIndex}`}
          className={`hero-product-package-wrap ${
            phase === 'sliding' ? 'conveyor-enter' : 'conveyor-idle'
          }`}
          role="group"
          aria-label={`Featured product: ${currentProduct.name}`}
        >
          <img
            src={currentProduct.image}
            alt={currentProduct.name}
            className="hero-product-img"
            loading="eager"
            decoding="async"
            style={{ objectFit: 'contain' }}
            onError={(e) => {
              if (currentProduct.fallbackImage && e.currentTarget.src !== currentProduct.fallbackImage) {
                e.currentTarget.src = currentProduct.fallbackImage;
              }
            }}
          />
          <div className="hero-package-glare" aria-hidden="true" />
        </div>

        {/* ── Floating Promo Discount Seal (Preserved) ── */}
        {isPromoActive && (
          <div ref={promoBadgeRef} className="hero-promo-seal" aria-hidden="true">
            <div className="seal-inner">
              <span className="seal-pct">{discountPercent}%</span>
              <span className="seal-lbl">OFF</span>
            </div>
          </div>
        )}

        {/* ── Synchronized Origin Heritage Card (Top Left) ── */}
        {cornerBadgeEnabled && (
          <div
            key={`origin-${badgeProduct.id}`}
            className={`hero-floating-origin ${phase === 'sliding' ? 'badge-slide' : 'badge-idle'}`}
            aria-hidden="true"
          >
            <span className="origin-icon">{badgeProduct.badgeIcon}</span>
            <div className="origin-text-wrap">
              <span className="origin-sub">{badgeProduct.subOrigin}</span>
              <span className="origin-main">{badgeProduct.origin}</span>
            </div>
          </div>
        )}

        {/* ── Synchronized Sensory Roast Profile Card (Bottom Right) ── */}
        {roastTagEnabled && (
          <div
            key={`sensory-${badgeProduct.id}`}
            className={`hero-floating-sensory ${phase === 'sliding' ? 'badge-slide' : 'badge-idle'}`}
            aria-hidden="true"
          >
            <div className="sensory-meter">
              <span className="sensory-tag">Roast Profile</span>
              <div className="sensory-dots">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`sensory-dot ${i <= badgeProduct.roastDots ? 'filled' : ''}`}
                    style={i <= badgeProduct.roastDots ? { backgroundColor: badgeProduct.accentColor, borderColor: badgeProduct.accentColor } : {}}
                  />
                ))}
              </div>
            </div>
            <div className="sensory-label">{badgeProduct.roastText}</div>
          </div>
        )}
      </div>

      {/* ── Circular Showcase Sequence Dots (Up to 3 Products) ── */}
      <div className="hero-showcase-pagination" aria-label="Showcase sequence navigation">
        {products.map((prod, idx) => {
          const isActive = idx === currentIndex;
          // SVG ring progress: circumference of circle r=7 ≈ 43.98
          const circumference = 2 * Math.PI * 7;
          return (
            <button
              key={prod.id}
              type="button"
              className={`hero-showcase-dot ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectProduct(idx)}
              aria-label={`View ${prod.name}`}
              aria-current={isActive ? 'true' : 'false'}
            >
              {/* Circular progress ring for active dot */}
              {isActive && !reducedMotion && phase === 'idle' && (
                <svg
                  className="dot-ring"
                  viewBox="0 0 18 18"
                  style={{
                    position: 'absolute',
                    top: '-1px',
                    left: '-1px',
                    width: 'calc(100% + 2px)',
                    height: 'calc(100% + 2px)',
                    transform: 'rotate(-90deg)',
                    pointerEvents: 'none',
                  }}
                >
                  <circle
                    cx="9"
                    cy="9"
                    r="7"
                    fill="none"
                    stroke="rgba(212, 163, 89, 0.9)"
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    strokeLinecap="round"
                    style={{
                      animation: `dotRingFill ${DISPLAY_DURATION}ms linear forwards`,
                    }}
                  />
                </svg>
              )}
              <span className="dot-label">{prod.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HeroProductShowcase;

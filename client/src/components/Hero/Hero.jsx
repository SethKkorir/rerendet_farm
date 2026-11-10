import React, { useRef, useContext, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import HeroProductShowcase, { SHOWCASE_PRODUCTS } from './HeroProductShowcase';
import './Hero.css';

const Hero = () => {
  const { publicSettings } = useContext(AppContext);
  const containerRef = useRef(null);
  const promoBadgeRef = useRef(null);
  const [activeProduct, setActiveProduct] = useState(SHOWCASE_PRODUCTS[0]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const yText = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const yImage = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // ── Dynamic Admin-Managed Hero Data ──
  const heroData = publicSettings?.hero || {};

  const headline = heroData.headline || 'Highland Mist, Poured for Perfection.';
  const subheadline = heroData.subheadline || 'Experience the rich, bold soul of hand-picked Kenyan coffee beans, roasting secrets passed through generations, delivered fresh to your door.';

  const cornerBadgeEnabled = heroData.cornerBadgeEnabled !== false;
  const roastTagEnabled = heroData.roastTagEnabled !== false;

  const primaryCtaText = heroData.primaryCtaText || 'Shop Collection';
  const primaryCtaLink = heroData.primaryCtaLink || '#coffee-shop';

  const secondaryCtaText = heroData.secondaryCtaText || 'Our Heritage';
  const secondaryCtaLink = heroData.secondaryCtaLink || '#about';

  // ── Promo / Discount Badge Logic ──
  const promo = heroData.promoBadge || {};
  let isPromoActive = !!promo.enabled;
  if (isPromoActive && promo.startDate) {
    if (new Date(promo.startDate) > new Date()) isPromoActive = false;
  }
  if (isPromoActive && promo.endDate) {
    if (new Date(promo.endDate) < new Date()) isPromoActive = false;
  }
  const discountPercent = Number(promo.percentage) || 30;

  const handleCtaClick = (link) => {
    if (link.startsWith('#')) {
      const sectionId = link.replace('#', '');
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = link;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  };

  // Format headline — Highland Mist alone on top, Poured for Perfection below
  const renderHeadline = () => {
    if (headline.includes(',')) {
      const parts = headline.split(',');
      const topPart = parts[0].trim();
      const bottomPart = parts.slice(1).join(',').trim();
      return (
        <>
          <span className="headline-first">{topPart}</span>
          <span className="headline-accent">{bottomPart}</span>
        </>
      );
    }
    return <span className="headline-first">{headline}</span>;
  };

  return (
    <section className="hero-modern" id="hero" ref={containerRef}>
      {/* ── Background Layers ── */}
      <div className="hero-bg-grain" aria-hidden="true" />
      <div className="hero-bg-gradient" aria-hidden="true" />
      <div className="hero-bg-vignette" aria-hidden="true" />

      {/* Ambient warm light pools */}
      <div className="hero-ambient-pool hero-ambient-pool--right" aria-hidden="true" />
      <div className="hero-ambient-pool hero-ambient-pool--left" aria-hidden="true" />

      <div className="container hero-grid">
        {/* ── Left Column: Premium Editorial Copy ── */}
        <motion.div
          className="hero-text-content"
          style={{ y: yText, opacity }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Main Headline */}
          <motion.h1 className="hero-main-title" variants={itemVariants}>
            {renderHeadline()}
          </motion.h1>

          {/* Subtext */}
          {subheadline && (
            <motion.p className="hero-subline" variants={itemVariants}>
              {subheadline}
            </motion.p>
          )}

          {/* CTA Buttons */}
          <motion.div className="hero-button-group" variants={itemVariants}>
            {primaryCtaText && (
              <button
                className="btn-hero-primary"
                onClick={() => handleCtaClick(primaryCtaLink)}
              >
                <span>{primaryCtaText}</span>
                <FaArrowRight className="hero-btn-arrow" />
              </button>
            )}
            {secondaryCtaText && (
              <button
                className="btn-hero-ghost"
                onClick={() => handleCtaClick(secondaryCtaLink)}
              >
                <span>{secondaryCtaText}</span>
              </button>
            )}
          </motion.div>
        </motion.div>

        {/* ── Right Column: Conveyor Belt Product Showcase ── */}
        <motion.div
          className="hero-image-container"
          style={{ y: yImage }}
        >
          <HeroProductShowcase
            isPromoActive={isPromoActive}
            discountPercent={discountPercent}
            promoBadgeRef={promoBadgeRef}
            cornerBadgeEnabled={cornerBadgeEnabled}
            roastTagEnabled={roastTagEnabled}
            onProductChange={setActiveProduct}
            heroData={heroData}
          />
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="hero-scroll-indicator"
        style={{ opacity }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        onClick={() => handleCtaClick('#coffee-shop')}
        role="button"
        tabIndex={0}
      >
        <span className="scroll-text">Explore</span>
        <div className="scroll-pill-track">
          <div className="scroll-pill" />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;

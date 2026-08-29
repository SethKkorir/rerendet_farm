import React, { useRef, useContext } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaArrowRight, FaStar, FaLeaf, FaCoffee, FaTruck, FaShieldAlt } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import './Hero.css';

const FloatingBeans = () => {
  const beans = [
    { id: 1, top: '15%', left: '10%', size: 60, blur: '4px', delay: 0, duration: 20 },
    { id: 2, top: '25%', left: '85%', size: 40, blur: '8px', delay: 2, duration: 25 },
    { id: 3, top: '70%', left: '15%', size: 50, blur: '2px', delay: 4, duration: 22 },
    { id: 4, top: '80%', left: '80%', size: 70, blur: '10px', delay: 1, duration: 28 },
    { id: 5, top: '10%', left: '50%', size: 30, blur: '12px', delay: 3, duration: 18 },
    { id: 6, top: '40%', left: '5%', size: 45, blur: '6px', delay: 5, duration: 24 },
    { id: 7, top: '60%', left: '90%', size: 35, blur: '5px', delay: 2, duration: 20 },
    { id: 8, top: '85%', left: '40%', size: 55, blur: '9px', delay: 6, duration: 30 },
  ];

  return (
    <div className="hero-floating-beans" aria-hidden="true">
      {beans.map((bean) => (
        <motion.img
          key={bean.id}
          src="/single_coffee_bean_1772078225421.png"
          className="floating-bean"
          style={{
            top: bean.top,
            left: bean.left,
            width: bean.size,
            filter: `blur(${bean.blur})`,
            opacity: 0.35,
            zIndex: 0,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            rotate: [0, 360],
            opacity: [0.2, 0.45, 0.2],
          }}
          transition={{
            duration: bean.duration,
            repeat: Infinity,
            delay: bean.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/* Animated ring that pulses behind the hero package */
const PulseRing = ({ delay = 0, scale = 1 }) => (
  <motion.div
    className="hero-pulse-ring"
    style={{ scale }}
    animate={{ scale: [scale, scale * 1.15, scale], opacity: [0.2, 0, 0.2] }}
    transition={{ duration: 4, repeat: Infinity, delay, ease: 'easeInOut' }}
  />
);

const Hero = () => {
  const { publicSettings } = useContext(AppContext);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const yText = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const yImage = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // ── Dynamic Admin-Managed Hero Data ──
  const heroData = publicSettings?.hero || {};

  const headline = heroData.headline || 'Highland Mist, Poured for Perfection.';
  const subheadline = heroData.subheadline || 'Experience the rich, bold soul of hand-picked Kenyan coffee beans, roasting secrets passed through generations, delivered fresh to your door.';
  const pillText = heroData.pillText || '100% Organic Arabica';
  
  // Real product packaging photo as hero image
  const heroImage = heroData.imageUrl || '/hero-product.png';

  const cornerBadgeEnabled = heroData.cornerBadgeEnabled !== false;
  const cornerBadgeText = heroData.cornerBadgeText || 'Farm to Cup Since 1986';

  const roastTagEnabled = heroData.roastTagEnabled !== false;
  const roastTagText = heroData.roastTagText || 'Dark Roast · Medium Body';

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

  // ── Feature Callouts Row (Matching Inspo) ──
  const defaultFeatures = [
    { icon: '🌱', title: '100% Organic', subtitle: "Nature's finest, ethically sourced" },
    { icon: '☕', title: 'Rich Flavour', subtitle: 'Crafted for an unique brew' },
    { icon: '🚚', title: 'Farm to Door', subtitle: 'Freshly roasted & dispatched' }
  ];
  const features = (heroData.features && heroData.features.length > 0) ? heroData.features : defaultFeatures;

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
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section className="hero-modern" id="hero" ref={containerRef}>
      {/* Texture & Glows */}
      <div
        className="hero-coffee-texture"
        style={{ backgroundImage: `url("/coffee_burlap_texture_1772078391678.png")` }}
      />
      <div className="hero-diagonal-accent" />
      <FloatingBeans />

      <div className="hero-orb hero-orb--tl" />
      <div className="hero-orb hero-orb--br" />

      <div className="container hero-grid">
        {/* ── Left Column: Admin Managed Copy & Features ── */}
        <motion.div
          className="hero-text-content"
          style={{ y: yText, opacity }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Pill Badge */}
          {pillText && (
            <motion.div className="hero-pre-title" variants={itemVariants}>
              <span className="hero-pre-pill">{pillText}</span>
            </motion.div>
          )}

          {/* Main Headline */}
          <motion.h1 className="hero-main-title" variants={itemVariants}>
            {headline.includes(',') ? (
              <>
                {headline.split(',')[0]}, <br />
                <span className="accent">{headline.split(',').slice(1).join(',')}</span>
              </>
            ) : (
              headline
            )}
          </motion.h1>

          {/* Subtext Paragraph */}
          {subheadline && (
            <motion.p className="hero-subline" variants={itemVariants}>
              {subheadline}
            </motion.p>
          )}

          {/* CTA Buttons */}
          <motion.div className="hero-button-group" variants={itemVariants}>
            {primaryCtaText && (
              <button
                className="btn-premium hero-btn"
                onClick={() => handleCtaClick(primaryCtaLink)}
              >
                {primaryCtaText} <FaArrowRight className="btn-icon" />
              </button>
            )}
            {secondaryCtaText && (
              <button
                className="btn-ghost-premium hero-btn"
                onClick={() => handleCtaClick(secondaryCtaLink)}
              >
                {secondaryCtaText}
              </button>
            )}
          </motion.div>

          {/* ── Feature-Icon Callout Row (Speri Inspiration Pattern) ── */}
          {features && features.length > 0 && (
            <motion.div className="hero-features-row" variants={itemVariants}>
              {features.map((feat, idx) => (
                <div key={idx} className="hero-feature-item">
                  <div className="hero-feature-icon-box">
                    <span className="feat-icon">{feat.icon}</span>
                  </div>
                  <div className="hero-feature-text">
                    <strong className="feat-title">{feat.title}</strong>
                    {feat.subtitle && <span className="feat-subtitle">{feat.subtitle}</span>}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ── Right Column: Real Product Packaging & Promo Tag Overlay ── */}
        <motion.div
          className="hero-image-container"
          style={{ y: yImage }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <div className="hero-animation-wrapper">
            <PulseRing delay={0} scale={1} />
            <PulseRing delay={1.2} scale={1.12} />

            {/* Rotating gold border halo */}
            <motion.div
              className="hero-rotating-border"
              animate={{ rotate: 360 }}
              transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            />

            {/* Main Product Showcase Frame */}
            <div className="hero-image-frame">
              <img
                src={heroImage}
                alt="Rerendet Specialty Coffee Package"
                className="hero-main-image"
                onError={(e) => {
                  e.target.src = '/hero-product.png';
                }}
              />
              <div className="hero-image-shimmer" />

              {/* ⭐ CIRCULAR PROMO / DISCOUNT BADGE OVERLAY ("30% OFF") ⭐ */}
              {isPromoActive && (
                <motion.div
                  className="hero-promo-badge"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.8 }}
                  whileHover={{ scale: 1.12, rotate: 5 }}
                >
                  <div className="promo-badge-inner">
                    <span className="promo-number">{discountPercent}%</span>
                    <span className="promo-text">OFF</span>
                  </div>
                  <div className="promo-badge-glow" />
                </motion.div>
              )}
            </div>

            {/* Floating Heritage Corner Badge */}
            {cornerBadgeEnabled && cornerBadgeText && (
              <motion.div
                className="hero-badge"
                initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                transition={{ duration: 0.8, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.06, rotate: -4 }}
              >
                <span className="hero-badge-top">{cornerBadgeText.split(' ')[0] || 'Farm'}</span>
                <span className="hero-badge-main">{cornerBadgeText.split(' ')[1] || 'to Cup'}</span>
                <span className="hero-badge-sub">{cornerBadgeText.split(' ').slice(2).join(' ') || 'Since 1986'}</span>
              </motion.div>
            )}

            {/* Floating Roast / Sensory Info Tag */}
            {roastTagEnabled && roastTagText && (
              <motion.div
                className="hero-roast-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
              >
                <div className="hero-roast-dots">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`hero-roast-dot ${i <= 4 ? 'filled' : ''}`} />
                  ))}
                </div>
                <span className="hero-roast-label">{roastTagText}</span>
              </motion.div>
            )}

            {/* Social Proof Review Pill (Inspiration element) */}
            <motion.div
              className="hero-social-proof-pill"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.6 }}
            >
              <span className="proof-heart">❤️</span>
              <span className="proof-text"><strong>15k+</strong> Coffee Lovers</span>
            </motion.div>

            <div className="hero-image-glow" />
          </div>
        </motion.div>
      </div>

      <motion.div
        className="hero-scroll-indicator"
        style={{ opacity }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="scroll-bar" />
      </motion.div>
    </section>
  );
};

export default Hero;
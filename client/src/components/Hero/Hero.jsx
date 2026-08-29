import React, { useRef, useContext, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaArrowRight, FaStar, FaLeaf, FaCoffee, FaTruck, FaShieldAlt } from 'react-icons/fa';
import gsap from 'gsap';
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
  const showcaseWrapRef = useRef(null);
  const imageFrameRef = useRef(null);
  const coffeeImageRef = useRef(null);
  const promoBadgeRef = useRef(null);
  const cornerBadgeRef = useRef(null);
  const roastCardRef = useRef(null);
  const socialProofRef = useRef(null);
  const shadowGlowRef = useRef(null);

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

  // ── GSAP High-Performance 3D Product Showcase Animations ──
  useEffect(() => {
    if (!showcaseWrapRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Initial 3D Entrance Sequence
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (imageFrameRef.current) {
        tl.fromTo(
          imageFrameRef.current,
          { scale: 0.82, y: 60, opacity: 0, rotationY: -16, rotationX: 10 },
          { scale: 1, y: 0, opacity: 1, rotationY: 0, rotationX: 0, duration: 1.4, ease: 'back.out(1.2)' }
        );
      }

      if (promoBadgeRef.current) {
        tl.fromTo(
          promoBadgeRef.current,
          { scale: 0, rotation: -45, opacity: 0 },
          { scale: 1, rotation: 0, opacity: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)' },
          '-=0.7'
        );
      }

      if (cornerBadgeRef.current) {
        tl.fromTo(
          cornerBadgeRef.current,
          { scale: 0, y: 30, rotation: -20, opacity: 0 },
          { scale: 1, y: 0, rotation: -8, opacity: 1, duration: 0.9, ease: 'back.out(1.7)' },
          '-=0.8'
        );
      }

      if (roastCardRef.current) {
        tl.fromTo(
          roastCardRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.7'
        );
      }

      if (socialProofRef.current) {
        tl.fromTo(
          socialProofRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.6'
        );
      }

      // 2. Continuous Organic 3D Floating Levitation (Sine Wave)
      if (coffeeImageRef.current) {
        gsap.to(coffeeImageRef.current, {
          y: -16,
          rotationZ: 1.5,
          rotationY: 3,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Dynamic floor glow & shadow breathing
      if (shadowGlowRef.current) {
        gsap.to(shadowGlowRef.current, {
          scaleX: 0.85,
          scaleY: 0.85,
          opacity: 0.4,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Floating secondary badges
      if (promoBadgeRef.current) {
        gsap.to(promoBadgeRef.current, {
          y: -8,
          rotation: 4,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.3,
        });
      }

      if (cornerBadgeRef.current) {
        gsap.to(cornerBadgeRef.current, {
          y: 8,
          rotation: -4,
          duration: 3.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.6,
        });
      }
    }, showcaseWrapRef);

    return () => ctx.revert();
  }, [heroImage, isPromoActive, discountPercent]);

  // 3. Interactive Mouse Parallax 3D Tilt
  const handleShowcaseMouseMove = (e) => {
    if (!imageFrameRef.current || !showcaseWrapRef.current) return;
    const rect = showcaseWrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(imageFrameRef.current, {
      rotationY: x * 18,
      rotationX: -y * 18,
      x: x * 14,
      y: y * 14,
      duration: 0.45,
      ease: 'power2.out',
      transformPerspective: 1000,
    });
  };

  const handleShowcaseMouseLeave = () => {
    if (!imageFrameRef.current) return;
    gsap.to(imageFrameRef.current, {
      rotationY: 0,
      rotationX: 0,
      x: 0,
      y: 0,
      duration: 0.85,
      ease: 'elastic.out(1, 0.5)',
    });
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

        {/* ── Right Column: Real Product Packaging & GSAP Animated Showcase ── */}
        <motion.div
          className="hero-image-container"
          style={{ y: yImage }}
          ref={showcaseWrapRef}
          onMouseMove={handleShowcaseMouseMove}
          onMouseLeave={handleShowcaseMouseLeave}
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

            {/* Main Product Showcase Frame (GSAP Animated) */}
            <div className="hero-image-frame" ref={imageFrameRef}>
              <img
                ref={coffeeImageRef}
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
                <div
                  ref={promoBadgeRef}
                  className="hero-promo-badge"
                >
                  <div className="promo-badge-inner">
                    <span className="promo-number">{discountPercent}%</span>
                    <span className="promo-text">OFF</span>
                  </div>
                  <div className="promo-badge-glow" />
                </div>
              )}
            </div>

            {/* Floating Heritage Corner Badge */}
            {cornerBadgeEnabled && cornerBadgeText && (
              <div
                ref={cornerBadgeRef}
                className="hero-badge"
              >
                <span className="hero-badge-top">{cornerBadgeText.split(' ')[0] || 'Farm'}</span>
                <span className="hero-badge-main">{cornerBadgeText.split(' ')[1] || 'to Cup'}</span>
                <span className="hero-badge-sub">{cornerBadgeText.split(' ').slice(2).join(' ') || 'Since 1986'}</span>
              </div>
            )}

            {/* Floating Roast / Sensory Info Tag */}
            {roastTagEnabled && roastTagText && (
              <div
                ref={roastCardRef}
                className="hero-roast-card"
              >
                <div className="hero-roast-dots">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`hero-roast-dot ${i <= 4 ? 'filled' : ''}`} />
                  ))}
                </div>
                <span className="hero-roast-label">{roastTagText}</span>
              </div>
            )}

            {/* Social Proof Review Pill */}
            <div
              ref={socialProofRef}
              className="hero-social-proof-pill"
            >
              <span className="proof-heart">❤️</span>
              <span className="proof-text"><strong>15k+</strong> Coffee Lovers</span>
            </div>

            {/* Dynamic GSAP Floor Glow */}
            <div className="hero-image-glow" ref={shadowGlowRef} />
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
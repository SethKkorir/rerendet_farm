import React, { useRef, useContext, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import gsap from 'gsap';
import { AppContext } from '../../context/AppContext';
import './Hero.css';

/* Ambient floating coffee beans placed tastefully in peripheral negative space */
const FloatingBeans = () => {
  const beans = [
    { id: 1, top: '12%', left: '4%', size: 46, blur: '3px', delay: 0, duration: 18 },
    { id: 2, top: '24%', right: '5%', size: 36, blur: '4px', delay: 1.5, duration: 22 },
    { id: 3, top: '76%', left: '6%', size: 50, blur: '3px', delay: 3, duration: 20 },
    { id: 4, top: '80%', right: '10%', size: 42, blur: '5px', delay: 2, duration: 24 },
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
            right: bean.right,
            width: bean.size,
            filter: `blur(${bean.blur})`,
            opacity: 0.25,
            zIndex: 0,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 12, 0],
            rotate: [0, 360],
            opacity: [0.15, 0.32, 0.15],
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

const Hero = () => {
  const { publicSettings } = useContext(AppContext);
  const containerRef = useRef(null);
  const showcaseWrapRef = useRef(null);
  const imageFrameRef = useRef(null);
  const coffeeImageRef = useRef(null);
  const promoBadgeRef = useRef(null);
  const cornerBadgeRef = useRef(null);
  const roastCardRef = useRef(null);
  const shadowGlowRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const yText = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yImage = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // ── Dynamic Admin-Managed Hero Data ──
  const heroData = publicSettings?.hero || {};

  const headline = heroData.headline || 'Highland Mist, Poured for Perfection.';
  const subheadline = heroData.subheadline || 'Hand-picked single origin Arabica harvested at 2,100m in Nandi County. Small-batch roasted and delivered fresh within days of roasting.';
  const pillText = heroData.pillText || 'Single Origin • Nandi Highlands 2,100m';

  // Real product packaging photo as hero image
  const heroImage = heroData.imageUrl || '/hero-product.png';

  const cornerBadgeEnabled = heroData.cornerBadgeEnabled !== false;
  const cornerBadgeText = heroData.cornerBadgeText || 'Farm to Cup Since 1986';

  const roastTagEnabled = heroData.roastTagEnabled !== false;
  const roastTagText = heroData.roastTagText || 'Dark Roast · Medium Body';

  const primaryCtaText = heroData.primaryCtaText || 'Shop Fresh Roasts';
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

  // ── GSAP High-Performance 3D Product Showcase Animations ──
  useEffect(() => {
    if (!showcaseWrapRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Initial 3D Entrance Sequence
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (imageFrameRef.current) {
        tl.fromTo(
          imageFrameRef.current,
          { scale: 0.88, y: 40, opacity: 0, rotationY: -12 },
          { scale: 1, y: 0, opacity: 1, rotationY: 0, duration: 1.2, ease: 'back.out(1.15)' }
        );
      }

      if (promoBadgeRef.current) {
        tl.fromTo(
          promoBadgeRef.current,
          { scale: 0, rotation: -30, opacity: 0 },
          { scale: 1, rotation: 0, opacity: 1, duration: 0.9, ease: 'back.out(1.5)' },
          '-=0.6'
        );
      }

      if (cornerBadgeRef.current) {
        tl.fromTo(
          cornerBadgeRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.7'
        );
      }

      if (roastCardRef.current) {
        tl.fromTo(
          roastCardRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.7'
        );
      }

      // 2. Continuous Organic 3D Floating Levitation (Sine Wave)
      if (coffeeImageRef.current) {
        gsap.to(coffeeImageRef.current, {
          y: -14,
          rotationZ: 1,
          duration: 3.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Dynamic floor shadow breathing
      if (shadowGlowRef.current) {
        gsap.to(shadowGlowRef.current, {
          scaleX: 0.88,
          scaleY: 0.88,
          opacity: 0.35,
          duration: 3.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Floating secondary badges
      if (cornerBadgeRef.current) {
        gsap.to(cornerBadgeRef.current, {
          y: -6,
          duration: 2.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.2,
        });
      }

      if (roastCardRef.current) {
        gsap.to(roastCardRef.current, {
          y: 6,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.5,
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
      rotationY: x * 15,
      rotationX: -y * 15,
      x: x * 12,
      y: y * 12,
      duration: 0.4,
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
      duration: 0.75,
      ease: 'elastic.out(1, 0.6)',
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  // Format headline for maximum 1-second impact
  const renderHeadline = () => {
    if (headline.includes(',')) {
      const parts = headline.split(',');
      return (
        <>
          <span className="headline-first">{parts[0]},</span>
          <span className="headline-accent">{parts.slice(1).join(',')}</span>
        </>
      );
    }
    return <span className="headline-first">{headline}</span>;
  };

  return (
    <section className="hero-modern" id="hero" ref={containerRef}>
      {/* Texture & Ambient Light Pools */}
      <div
        className="hero-coffee-texture"
        style={{ backgroundImage: `url("/coffee_burlap_texture_1772078391678.png")` }}
      />
      <div className="hero-ambient-spotlight" />
      <FloatingBeans />

      <div className="container hero-grid">
        {/* ── Left Column: Clean Magnetic Copy ── */}
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

        {/* ── Right Column: Tactile 3D Product Showcase ── */}
        <motion.div
          className="hero-image-container"
          style={{ y: yImage }}
          ref={showcaseWrapRef}
          onMouseMove={handleShowcaseMouseMove}
          onMouseLeave={handleShowcaseMouseLeave}
        >
          <div className="hero-product-stage">
            {/* Ambient Radial Spotlight behind Bag */}
            <div className="hero-stage-glow" />

            {/* Main Interactive Product Frame with GSAP Tilt */}
            <div className="hero-product-frame" ref={imageFrameRef}>
              <img
                ref={coffeeImageRef}
                src={heroImage}
                alt="Rerendet Specialty Coffee"
                className="hero-product-img"
                onError={(e) => {
                  e.target.src = '/hero-product.png';
                }}
              />
              <div className="hero-img-glare" />

              {/* Floating Promo Discount Seal */}
              {isPromoActive && (
                <div ref={promoBadgeRef} className="hero-promo-seal">
                  <div className="seal-inner">
                    <span className="seal-pct">{discountPercent}%</span>
                    <span className="seal-lbl">OFF</span>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Origin Heritage Pill (Top Left) */}
            {cornerBadgeEnabled && cornerBadgeText && (
              <div ref={cornerBadgeRef} className="hero-floating-origin">
                <span className="origin-icon">🏔️</span>
                <div className="origin-text-wrap">
                  <span className="origin-sub">Origin & Craft</span>
                  <span className="origin-main">{cornerBadgeText}</span>
                </div>
              </div>
            )}

            {/* Floating Sensory Roast Card (Bottom Right) */}
            {roastTagEnabled && roastTagText && (
              <div ref={roastCardRef} className="hero-floating-sensory">
                <div className="sensory-meter">
                  <span className="sensory-tag">Roast Profile</span>
                  <div className="sensory-dots">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={`sensory-dot ${i <= 4 ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
                <div className="sensory-label">{roastTagText}</div>
              </div>
            )}

            {/* Dynamic Floor Shadow */}
            <div className="hero-floor-shadow" ref={shadowGlowRef} />
          </div>
        </motion.div>
      </div>

      {/* Subtle Scroll Down Prompt */}
      <motion.div
        className="hero-scroll-indicator"
        style={{ opacity }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        onClick={() => handleCtaClick('#coffee-shop')}
        role="button"
        tabIndex={0}
      >
        <span className="scroll-text">Explore</span>
        <div className="scroll-pill-line" />
      </motion.div>
    </section>
  );
};

export default Hero;

import React, { useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import './About.css';

/* Decorative coffee ring mark */
const RingMark = ({ size = 120, opacity = 0.06, className = '' }) => (
  <div
    className={`about-ring-mark ${className}`}
    style={{ width: size, height: size, opacity }}
  />
);
const About = () => {
  const { publicSettings, showNotification } = useContext(AppContext);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const yImage = useTransform(scrollYProgress, [0, 1], [-100, 100]);
  const yText = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const yRingTL = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const yRingBR = useTransform(scrollYProgress, [0, 1], [20, -20]);

  const aboutData = publicSettings?.about || {};
  const years = aboutData.yearsInBusiness || 0;
  const organic = aboutData.organicPercentage || 0;
  const awards = aboutData.awardsWon || 0;
  const story = aboutData.story || 'Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations.';
  const subStory = aboutData.subStory || 'Our name comes from the local Kalenjin word for the evergreen tree that provides shade for our coffee plants. At elevations of 1,800 meters above sea level, our beans develop slowly, allowing complex flavors to mature fully before harvest. Each batch is hand-picked, carefully processed, and roasted to perfection.';
  const image = aboutData.imageUrl || 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1000';
  const image2 = aboutData.imageUrl2 || image;

  const hasStats = years > 0 || organic > 0 || awards > 0;

  const statItems = [
    years > 0 && { num: years, sup: '+', lab: ['Years', 'Tradition'] },
    organic > 0 && { num: organic, sup: '%', lab: ['Purely', 'Organic'] },
    awards > 0 && { num: awards, sup: '', lab: ['Awards', 'Won'] },
  ].filter(Boolean);

  return (
    <section id="about" className="about-editorial-section" ref={containerRef}>

      {/* ── Background ── */}
      <motion.div className="editorial-watermark" style={{ y: yText }}>
        HERITAGE
      </motion.div>

      {/* Floating decorative lines */}
      <div className="about-lines-tl" />
      <div className="about-lines-br" />

      {/* Parallax ring marks */}
      <motion.div className="about-ring-wrap about-ring-wrap--tl" style={{ y: yRingTL }}>
        <RingMark size={220} opacity={0.07} />
      </motion.div>
      <motion.div className="about-ring-wrap about-ring-wrap--br" style={{ y: yRingBR }}>
        <RingMark size={160} opacity={0.05} />
      </motion.div>

      <div className="container">
        <div className="editorial-grid">

          {/* ── Left: Images ── */}
          <div className="editorial-image-column">

            {/* Primary photo */}
            <motion.div
              className="primary-image-wrapper"
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.img
                src={image}
                alt="Rerendet Coffee Farm"
                style={{ y: yImage, scale: 1.15 }}
                className="primary-parallax-img"
              />
              {/* Inner vignette */}
              <div className="primary-vignette" />
              {/* Gold offset frame */}
              <div className="gold-accent-frame" />
              {/* Corner dot accents */}
              <div className="corner-dot corner-dot--tl" />
              <div className="corner-dot corner-dot--br" />
            </motion.div>

            {/* Secondary tilted polaroid */}
            <motion.div
              className="secondary-image-card"
              initial={{ opacity: 0, x: -50, rotate: -5 }}
              whileInView={{ opacity: 1, x: 0, rotate: -2 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.35 }}
              whileHover={{ rotate: 0, y: -6, transition: { duration: 0.35 } }}
            >
              <div className="secondary-image-inner">
                <img src={image2} alt="Farm Detail" />
                <div className="sec-img-overlay" />
              </div>
              {/* Polaroid caption strip */}
              <div className="polaroid-caption">Rerendet, Kenya</div>
            </motion.div>

            {/* Floating elevation chip */}
            <motion.div
              className="elevation-chip"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ y: -4 }}
            >
              <div className="elevation-chip-icon">▲</div>
              <div>
                <div className="elevation-chip-value">1,800m</div>
                <div className="elevation-chip-label">Above Sea Level</div>
              </div>
            </motion.div>

          </div>

          {/* ── Right: Text ── */}
          <motion.div
            className="editorial-text-column"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="editorial-pre-title">
              <span className="gold-line-indicator" />
              Our Heritage
            </div>

            <h2 className="editorial-title">
              The Soul of<br />
              <span>Rerendet</span>
            </h2>

            {/* Decorative quote mark */}
            <div className="about-quote-mark">"</div>

            <div className="editorial-story">
              <p className="story-lead">{story}</p>
              <p className="story-body">{subStory}</p>
            </div>

            <button
              className="btn-ghost-premium btn-editorial"
              onClick={() => navigate('/blog')}
            >
              Discover Our Process
            </button>

            {/* Stats */}
            {hasStats && (
              <div className="editorial-stats">
                {statItems.map((s, i) => (
                  <motion.div
                    key={i}
                    className="ed-stat-box"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <span className="ed-stat-num">
                      {s.num}
                      {s.sup && <span>{s.sup}</span>}
                    </span>
                    <span className="ed-stat-lab">
                      {s.lab[0]}<br />{s.lab[1]}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default About;
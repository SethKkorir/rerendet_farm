import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import {
  FaMountain,
  FaLeaf,
  FaAward,
  FaHistory,
  FaArrowRight,
  FaTree,
  FaFire,
  FaMugHot
} from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import BrewGuideModal from '../BrewGuide/BrewGuideModal';
import './About.css';

const About = () => {
  const { publicSettings } = useContext(AppContext);
  const [isBrewGuideOpen, setIsBrewGuideOpen] = useState(false);

  const aboutData = publicSettings?.about || {};
  const years = aboutData.yearsInBusiness || 0;
  const organic = aboutData.organicPercentage || 0;
  const awards = aboutData.awardsWon || 0;
  const story =
    aboutData.story ||
    'Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations.';
  const subStory =
    aboutData.subStory ||
    'Our name comes from the local Kalenjin word for the evergreen tree that provides shade for our coffee plants. At elevations of 1,800 meters above sea level, our beans develop slowly, allowing complex flavors to mature fully before harvest. Each batch is hand-picked, carefully processed, and roasted to perfection.';
  const image =
    aboutData.imageUrl ||
    '/images/coffee/Rerendet_CoffeeFarm.png';
  const image2 =
    aboutData.imageUrl2 ||
    '/images/coffee/bomet-sunrise.png';

  const hasStats = years > 0 || organic > 0 || awards > 0;

  const dynamicStats = [
    years > 0 && { num: `${years}+`, lab: 'Years Tradition', icon: <FaHistory /> },
    organic > 0 && { num: `${organic}%`, lab: 'Purely Organic', icon: <FaLeaf /> },
    awards > 0 && { num: `${awards}`, lab: 'Awards Won', icon: <FaAward /> },
  ].filter(Boolean);

  const fallbackHallmarks = [
    { num: '1,800m', lab: 'Highland Elevation', icon: <FaMountain /> },
    { num: '100%', lab: 'Single Origin Arabica', icon: <FaLeaf /> },
    { num: 'Grade 1', lab: 'Specialty Micro-Lot', icon: <FaAward /> },
  ];

  const displayedStats = hasStats ? dynamicStats : fallbackHallmarks;

  return (
    <>
      <section id="about" className="about-scand-section">
        <div className="about-scand-container">
          <div className="about-scand-grid">

            {/* ── Left Column: Clean Architectural Showcase ── */}
            <motion.div
              className="about-scand-visual"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="about-main-image-wrap">
                <img
                  src={image}
                  alt="Rerendet Coffee Farm"
                  className="about-main-image"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = '/images/coffee/Rerendet_CoffeeFarm.png';
                  }}
                />
                <div className="about-image-overlay-subtle" />

                {/* Modern Glass Elevation Badge */}
                <div className="about-elevation-badge">
                  <div className="about-badge-icon">
                    <FaMountain />
                  </div>
                  <div className="about-badge-text">
                    <span className="about-badge-val">1,800m ASL</span>
                    <span className="about-badge-sub">Kenyan Highlands</span>
                  </div>
                </div>
              </div>

              {/* Clean Modern Inset Card (Secondary Image) */}
              {image2 && image2 !== image && (
                <motion.div
                  className="about-secondary-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <img
                    src={image2}
                    alt="Farm Heritage"
                    className="about-secondary-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/images/coffee/bomet-sunrise.png';
                    }}
                  />
                  <div className="about-secondary-caption">
                    <FaTree className="about-caption-icon" />
                    <span>Indigenous Shade Canopy</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* ── Right Column: Story & Heritage Content ── */}
            <motion.div
              className="about-scand-content"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header Tag */}
              <div className="about-scand-tag-wrap">
                <span className="about-scand-tag">OUR HERITAGE</span>
              </div>

              {/* Bold Modern Title */}
              <h2 className="about-scand-title">
                The Soul of <span className="about-title-gold">Rerendet</span>
              </h2>

              {/* Farm Pill Highlights */}
              <div className="about-pills-row">
                <span className="about-pill">
                  <FaTree className="about-pill-icon" /> Rerendet Evergreen Shade
                </span>
                <span className="about-pill">
                  <FaLeaf className="about-pill-icon" /> Hand-Picked Harvest
                </span>
                <span className="about-pill">
                  <FaFire className="about-pill-icon" /> Artisan Roasted
                </span>
              </div>

              {/* Narrative Story */}
              <div className="about-narrative">
                <p className="about-story-lead">{story}</p>
                <p className="about-story-sub">{subStory}</p>
              </div>

              {/* Metric Credentials Cards */}
              <div className="about-stats-grid">
                {displayedStats.map((item, idx) => (
                  <div key={idx} className="about-stat-card">
                    <div className="about-stat-top">
                      <span className="about-stat-number">{item.num}</span>
                      <span className="about-stat-icon">{item.icon}</span>
                    </div>
                    <span className="about-stat-label">{item.lab}</span>
                  </div>
                ))}
              </div>

              {/* Actions Row */}
              <div className="about-actions-row">
                <button
                  className="about-cta-btn"
                  onClick={() => setIsBrewGuideOpen(true)}
                  aria-label="Open Highland Brewing Guide"
                >
                  <FaMugHot className="about-btn-icon-leading" />
                  <span>How to Brew & Our Process</span>
                  <FaArrowRight className="about-btn-arrow" />
                </button>
              </div>

            </motion.div>

          </div>
        </div>
      </section>

      {/* Interactive Brewing Guide Modal */}
      <BrewGuideModal
        isOpen={isBrewGuideOpen}
        onClose={() => setIsBrewGuideOpen(false)}
      />
    </>
  );
};

export default About;

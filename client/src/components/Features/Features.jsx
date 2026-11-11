import React from 'react';
import { motion } from 'framer-motion';
import {
  FaMugHot,
  FaMountain,
  FaHandshake,
  FaStar,
  FaLeaf,
  FaAward
} from 'react-icons/fa';
import './Features.css';

const Features = () => {
  const features = [
    {
      num: '01',
      icon: <FaMugHot />,
      title: "Freshness & Quality",
      description: "Our coffee is roasted fresh in small batches to preserve its natural aromas and rich character."
    },
    {
      num: '02',
      icon: <FaMountain />,
      title: "Highland Grown",
      description: "Cultivated in fertile highland soil, allowing our coffee to develop balanced, rich flavors naturally."
    },
    {
      num: '03',
      icon: <FaHandshake />,
      title: "Direct from the Farm",
      description: "Sourced directly from our family farm in Kenya, ensuring pure origin and sustainable farming."
    },
    {
      num: '04',
      icon: <FaStar />,
      title: "Rich Flavor Profile",
      description: "Smooth, balanced brew with warm cocoa undertones and a clean, satisfying finish."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <section id="features" className="features-section">
      <div className="features-container">
        {/* Header */}
        <motion.div
          className="features-header"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="features-tag">THE HIGHLAND STANDARD</span>
          <h2 className="features-title">
            Why Choose Our <span className="features-title-gold">Coffee</span>
          </h2>
          <p className="features-subtitle">
            Exceptional quality from high-altitude volcanic seed to your morning cup.
          </p>
        </motion.div>

        {/* 4 Pillars Grid */}
        <motion.div
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              variants={itemVariants}
            >
              <div className="feature-card-top">
                <div className="feature-icon-wrapper">
                  <div className="feature-icon">{feature.icon}</div>
                </div>
                <span className="feature-num">{feature.num}</span>
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;

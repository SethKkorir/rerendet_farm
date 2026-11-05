import React from 'react';
import './BrandLoader.css';

const BrandLoader = ({ 
  subtitle = 'HIGHLAND SINGLE ORIGIN', 
  fullScreen = false, 
  minHeight = '60vh' 
}) => {
  return (
    <div 
      className={`brand-loader-container ${fullScreen ? 'brand-loader--fullscreen' : ''}`}
      style={!fullScreen ? { minHeight } : {}}
      role="status"
      aria-label="Loading Rerendet Coffee"
    >
      <div className="brand-loader-card">
        <div className="brand-loader-emblem" aria-hidden="true">☕</div>
        <h2 className="brand-loader-title">RERENDET COFFEE</h2>
        <p className="brand-loader-sub">{subtitle}</p>
        <div className="brand-loader-track">
          <div className="brand-loader-bar" />
        </div>
      </div>
    </div>
  );
};

export default BrandLoader;

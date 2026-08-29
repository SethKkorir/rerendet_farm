import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaTimes } from 'react-icons/fa';
import './SeasonalEffects.css';

const SeasonalEffects = () => {
    const location = useLocation();
    const { publicSettings } = useContext(AppContext);
    const [activeTheme, setActiveTheme] = useState(null); // 'christmas' | 'newyear' | 'fireworks' | null
    const [snowflakes, setSnowflakes] = useState([]);
    const [confetti, setConfetti] = useState([]);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    const seasonalConfig = publicSettings?.features?.seasonalEffects || {};

    useEffect(() => {
        const checkTheme = () => {
            // URL query overrides for testing/demo
            const params = new URLSearchParams(location.search);
            const forceTheme = params.get('theme') || localStorage.getItem('theme_override');

            if (forceTheme) {
                if (forceTheme === 'christmas' || forceTheme === 'xmas') return 'christmas';
                if (forceTheme === 'newyear' || forceTheme === 'new-year') return 'newyear';
                if (forceTheme === 'fireworks') return 'fireworks';
                if (forceTheme === 'off' || forceTheme === 'none') return null;
            }

            // Check Admin Setting
            if (seasonalConfig.enabled === false) {
                return null;
            }

            if (seasonalConfig.enabled && seasonalConfig.theme && seasonalConfig.theme !== 'auto') {
                return seasonalConfig.theme;
            }

            // Automatic date detection if theme is 'auto' or enabled
            if (seasonalConfig.enabled || seasonalConfig.theme === 'auto') {
                const today = new Date();
                const month = today.getMonth() + 1; // 1-12
                const date = today.getDate();

                // Christmas: Dec 15 - Dec 26
                if (month === 12 && date >= 15 && date <= 26) {
                    return 'christmas';
                }
                // New Year: Dec 27 - Jan 3
                if ((month === 12 && date >= 27) || (month === 1 && date <= 3)) {
                    return 'newyear';
                }
            }

            return null;
        };

        const theme = checkTheme();
        setActiveTheme(theme);

        // Generate effects based on active theme
        if (theme === 'christmas') {
            const flakes = Array.from({ length: 45 }).map((_, i) => ({
                id: i,
                left: `${Math.random() * 100}vw`,
                delay: `${Math.random() * 8}s`,
                duration: `${5 + Math.random() * 10}s`,
                size: `${4 + Math.random() * 10}px`,
                opacity: 0.2 + Math.random() * 0.8,
            }));
            setSnowflakes(flakes);
            setConfetti([]);
        } else if (theme === 'newyear' || theme === 'fireworks') {
            const particles = Array.from({ length: 65 }).map((_, i) => ({
                id: i,
                left: `${Math.random() * 100}vw`,
                delay: `${Math.random() * 4}s`,
                duration: `${3 + Math.random() * 6}s`,
                size: `${5 + Math.random() * 9}px`,
                color: ['#D4AF37', '#F3E5AB', '#AA771C', '#FFDF00', '#C5B358', '#FF6B6B', '#4ECDC4'][Math.floor(Math.random() * 7)],
                rotation: `${Math.random() * 360}deg`,
                shape: Math.random() > 0.5 ? 'circle' : 'square'
            }));
            setConfetti(particles);
            setSnowflakes([]);
        } else {
            setSnowflakes([]);
            setConfetti([]);
        }
    }, [location.search, seasonalConfig.enabled, seasonalConfig.theme]);

    if (!activeTheme) return null;

    return (
        <div className={`seasonal-effects-wrapper ${activeTheme}-active`}>
            {/* Christmas Theme falling snow */}
            {activeTheme === 'christmas' && (
                <div className="snow-canopy">
                    {snowflakes.map(flake => (
                        <div
                            key={flake.id}
                            className="snowflake"
                            style={{
                                left: flake.left,
                                animationDelay: flake.delay,
                                animationDuration: flake.duration,
                                width: flake.size,
                                height: flake.size,
                                opacity: flake.opacity
                            }}
                        />
                    ))}
                    
                    {!bannerDismissed && seasonalConfig.promoBanner !== false && (
                        <div className="holiday-banner christmas-banner fade-in-down">
                            <button className="banner-close-btn" onClick={() => setBannerDismissed(true)} aria-label="Dismiss banner">
                                <FaTimes />
                            </button>
                            <div className="banner-accent-gold">🎄 HOLIDAY SPECIAL 🎄</div>
                            <div className="banner-message">
                                {seasonalConfig.bannerText || 'Wishing you a warm, premium holiday season! Roast your winter worries away with our highland specialty coffee. ☕️ Enjoy 15% OFF on all orders!'}
                            </div>
                            <div className="banner-actions">
                                <span className="promo-code">Code: <strong>{seasonalConfig.promoCode || 'XMAS25'}</strong></span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* New Year / Fireworks Celebration Theme */}
            {(activeTheme === 'newyear' || activeTheme === 'fireworks') && (
                <div className="confetti-canopy">
                    {confetti.map(p => (
                        <div
                            key={p.id}
                            className={`confetti-particle ${p.shape}`}
                            style={{
                                left: p.left,
                                animationDelay: p.delay,
                                animationDuration: p.duration,
                                width: p.size,
                                height: p.size,
                                backgroundColor: p.color,
                                transform: `rotate(${p.rotation})`,
                                opacity: 0.85
                            }}
                        />
                    ))}

                    {!bannerDismissed && seasonalConfig.promoBanner !== false && (
                        <div className="holiday-banner newyear-banner fade-in-down">
                            <button className="banner-close-btn" onClick={() => setBannerDismissed(true)} aria-label="Dismiss banner">
                                <FaTimes />
                            </button>
                            <div className="banner-accent-gold">✨ {activeTheme === 'fireworks' ? 'CELEBRATION SPECIAL' : 'HAPPY NEW YEAR'} ✨</div>
                            <div className="banner-message">
                                {seasonalConfig.bannerText || 'Toast to new mornings and bold brews! Ring in celebration with Rerendet Coffee. Get complimentary standard delivery on orders above 2,500 KSh. 🥂'}
                            </div>
                            <div className="banner-actions">
                                <span className="promo-code">Code: <strong>{seasonalConfig.promoCode || 'NEWYEAR26'}</strong></span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SeasonalEffects;

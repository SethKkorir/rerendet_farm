import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './SeasonalEffects.css';

const SeasonalEffects = () => {
    const location = useLocation();
    const [activeTheme, setActiveTheme] = useState(null); // 'christmas' | 'newyear' | null
    const [snowflakes, setSnowflakes] = useState([]);
    const [confetti, setConfetti] = useState([]);

    useEffect(() => {
        // Determine active theme based on date or URL override
        const checkTheme = () => {
            const today = new Date();
            const month = today.getMonth() + 1; // 1-12
            const date = today.getDate();

            // URL query overrides for easy testing/demo
            const params = new URLSearchParams(location.search);
            const forceTheme = params.get('theme') || localStorage.getItem('theme_override');

            if (forceTheme === 'christmas' || forceTheme === 'xmas') {
                return 'christmas';
            }
            if (forceTheme === 'newyear' || forceTheme === 'new-year') {
                return 'newyear';
            }

            // Automatic date detection
            // Christmas: Dec 15 - Dec 26
            if (month === 12 && date >= 15 && date <= 26) {
                return 'christmas';
            }
            // New Year: Dec 27 - Jan 3
            if ((month === 12 && date >= 27) || (month === 1 && date <= 3)) {
                return 'newyear';
            }

            return null;
        };

        const theme = checkTheme();
        setActiveTheme(theme);

        // Generate effects based on active theme
        if (theme === 'christmas') {
            // Generate snowflakes
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
        } else if (theme === 'newyear') {
            // Generate festive gold/bronze confetti
            const particles = Array.from({ length: 60 }).map((_, i) => ({
                id: i,
                left: `${Math.random() * 100}vw`,
                delay: `${Math.random() * 4}s`,
                duration: `${3 + Math.random() * 6}s`,
                size: `${5 + Math.random() * 8}px`,
                color: ['#D4AF37', '#F3E5AB', '#AA771C', '#FFDF00', '#C5B358'][Math.floor(Math.random() * 5)],
                rotation: `${Math.random() * 360}deg`,
                shape: Math.random() > 0.5 ? 'circle' : 'square'
            }));
            setConfetti(particles);
            setSnowflakes([]);
        } else {
            setSnowflakes([]);
            setConfetti([]);
        }
    }, [location.search]);

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
                    
                    <div className="holiday-banner christmas-banner fade-in-down">
                        <div className="banner-accent-gold">🎄 HOLIDAY SPECIAL 🎄</div>
                        <div className="banner-message">
                            Wishing you a warm, premium holiday season! Roast your winter worries away with our highland specialty coffee. ☕️ Enjoy <strong>15% OFF</strong> on all orders!
                        </div>
                        <div className="banner-actions">
                            <span className="promo-code">Code: <strong>XMAS25</strong></span>
                        </div>
                    </div>
                </div>
            )}

            {/* New Year Theme sparkling confetti */}
            {activeTheme === 'newyear' && (
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
                                opacity: 0.8
                            }}
                        />
                    ))}

                    <div className="holiday-banner newyear-banner fade-in-down">
                        <div className="banner-accent-gold">✨ HAPPY NEW YEAR ✨</div>
                        <div className="banner-message">
                            Toast to new mornings and bold brews! Ring in the new year with Rerendet Coffee. Get a complimentary standard delivery on orders above 2,500 KSh. 🥂
                        </div>
                        <div className="banner-actions">
                            <span className="promo-code">Code: <strong>NEWYEAR26</strong></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonalEffects;

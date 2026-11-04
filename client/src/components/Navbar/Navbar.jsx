import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShoppingBag,
  FaBars,
  FaTimes,
  FaUser,
  FaSun,
  FaMoon
} from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import './Navbar.css';

function Navbar() {
  const {
    user,
    userType,
    cartCount,
    setIsCartOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    logout,
    publicSettings,
    showNotification,
    setAuthView
  } = useContext(AppContext);

  const isAdminUser = userType === 'admin' || user?.role === 'admin' || user?.role === 'super-admin';

  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Smooth scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Theme initialization
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = savedMode !== null ? savedMode : systemPrefersDark;

    setDarkMode(initialMode);
    document.documentElement.setAttribute('data-theme', initialMode ? 'dark' : 'light');
  }, []);

  const toggleMobileMenu = () => {
    const nextState = !mobileMenuOpen;
    setMobileMenuOpen(nextState);
    document.body.classList.toggle('menu-open', nextState);
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
  };

  const openAuth = (view = 'login') => {
    setAuthView(view);
    setMobileMenuOpen(false);
    navigate(view === 'signup' ? '/signup' : '/login');
  };

  const scrollToSection = (sectionId) => {
    const section = document.querySelector(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: sectionId.replace('#', '') } });
    }
    setMobileMenuOpen(false);
  };

  const academyEnabled = publicSettings?.features?.coffeeAcademy ?? true;
  const navLinks = [
    { name: 'Shop', href: '#coffee-shop' },
    ...(academyEnabled ? [{ name: 'Academy', href: '/blog' }] : []),
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (link) => {
    if (link.isComingSoon) {
      showNotification('The Rerendet Coffee Editorial is coming soon.', 'info');
      setMobileMenuOpen(false);
      return;
    }

    if (link.href.startsWith('/')) {
      navigate(link.href);
      setMobileMenuOpen(false);
    } else {
      scrollToSection(link.href);
    }
  };

  return (
    <>
      <header
        className={`header ${(isScrolled || location.pathname !== '/') ? 'header--scrolled' : ''}`}
      >
        <div className="header__container">
          {/* Logo Signature */}
          <div className="header__logo" onClick={() => navigate('/')} title="Rerendet Coffee">
            <img
              src={publicSettings?.store?.logo || "/rerendet-logo.png"}
              alt={publicSettings?.store?.name || "Rerendet Coffee"}
              className="header__logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/rerendet-logo.png';
              }}
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="header__nav">
            {navLinks.map((link) => {
              const isActive = link.href.startsWith('/')
                ? location.pathname === link.href
                : location.pathname === '/' && location.hash === link.href;

              return (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link)}
                  className={`header__nav-link ${isActive ? 'active' : ''}`}
                >
                  <span>{link.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="header__actions">
            {/* Theme Toggle */}
            <button
              type="button"
              className="header__action-btn theme-toggle"
              onClick={toggleTheme}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              <span className={`theme-toggle-icon ${darkMode ? 'is-dark' : 'is-light'}`}>
                {darkMode ? <FaSun size={14} /> : <FaMoon size={14} />}
              </span>
            </button>

            {/* Account */}
            <button
              type="button"
              className={`header__action-btn header__account ${user ? 'is-logged' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (user) {
                  navigate(isAdminUser ? '/admin' : '/profile');
                } else {
                  openAuth('login');
                }
              }}
              title={user ? (isAdminUser ? 'Admin Dashboard' : `Account: ${user.name || user.email}`) : 'Sign In'}
              aria-label={user ? 'User Account' : 'Sign In'}
            >
              <FaUser size={13} />
              {user && <span className="header__user-dot" />}
            </button>

            {/* Cart Button with Animated Bounce Badge */}
            <div className="header__cart-wrap">
              <button
                type="button"
                className="header__action-btn header__cart"
                onClick={() => setIsCartOpen(true)}
                title="View Bag"
                aria-label={`Shopping bag with ${cartCount} items`}
              >
                <FaShoppingBag size={14} />
                {cartCount > 0 && (
                  <span key={cartCount} className="header__cart-badge">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              className="header__action-btn header__mobile-trigger"
              onClick={toggleMobileMenu}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <FaTimes size={15} /> : <FaBars size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                className="header__mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMobileMenu}
              />
              <motion.div
                className="header__mobile-menu"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <nav className="header__mobile-nav">
                  {navLinks.map((link) => (
                    <button
                      key={link.name}
                      onClick={() => handleNavClick(link)}
                      className="header__mobile-nav-link"
                    >
                      <span>{link.name}</span>
                    </button>
                  ))}
                  <div className="header__mobile-divider" />
                  {user ? (
                    <>
                      <button
                        className="header__mobile-nav-link header__mobile-nav-link--accent"
                        onClick={() => {
                          navigate(isAdminUser ? '/admin' : '/profile');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span>{isAdminUser ? 'Admin Panel' : 'My Account'}</span>
                      </button>
                      <button
                        className="header__mobile-nav-link header__mobile-nav-link--muted"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <button
                      className="header__mobile-nav-link header__mobile-nav-link--accent"
                      onClick={() => openAuth('login')}
                    >
                      <span>Sign In</span>
                    </button>
                  )}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

export default Navbar;

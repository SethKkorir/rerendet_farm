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
    isAdmin,
    isCustomer,
    cartCount,
    setIsCartOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    logout,
    publicSettings,
    showNotification,
    setAuthView
  } = useContext(AppContext);

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

  const handleAccountClick = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMobileMenuOpen(false);

    try {
      // Server is the root of trust: dynamic zero-trust verification via /api/auth/me
      const { default: API } = await import('../../api/api');
      const res = await API.get('/auth/me');
      if (res.data?.success && res.data?.data) {
        const verifiedUser = res.data.data.user || res.data.data;
        const role = (verifiedUser.role || '').toLowerCase();
        const isAdminUser = ['admin', 'super-admin', 'super_admin', 'owner'].includes(role) || verifiedUser.userType === 'admin';

        if (isAdminUser) {
          navigate('/admin');
        } else {
          navigate('/account');
        }
        return;
      }
    } catch (err) {
      // Unauthenticated or invalid token
    }

    openAuth('login');
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
    ...(isAdmin ? [{ name: 'Admin', href: '/admin' }] : []),
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

  const isPortalRoute = location.pathname.startsWith('/account') || location.pathname.startsWith('/profile');

  return (
    <>
      <header
        className={`header ${(isScrolled || location.pathname !== '/') ? 'header--scrolled' : ''} ${isPortalRoute ? 'header--portal-route' : ''}`}
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

            {/* Customer Account */}
            <button
              type="button"
              className={`header__action-btn header__account ${isCustomer ? 'is-logged' : ''}`}
              onClick={handleAccountClick}
              title={isCustomer ? `Account: ${user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || user?.email || 'My Account')}` : 'Sign In'}
              aria-label={isCustomer ? 'User Account' : 'Sign In'}
            >
              <FaUser size={13} />
              {isCustomer && <span className="header__user-dot" />}
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
                  {isCustomer ? (
                    <>
                      <button
                        className="header__mobile-nav-link header__mobile-nav-link--accent"
                        onClick={handleAccountClick}
                      >
                        <span>My Account</span>
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

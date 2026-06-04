import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaLock, FaCreditCard, FaMoneyBillWave, FaPhone,
  FaTruck, FaUser, FaInfoCircle, FaShieldAlt,
  FaArrowRight, FaMapMarkerAlt, FaEnvelope, FaExclamationCircle, FaPercent, FaSync, FaGlobe, FaCheckCircle
} from 'react-icons/fa';
import PaymentProcessingModal from '../PaymentProcessingModal/PaymentProcessingModal';
import './Checkout.css';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';

const KENYAN_COUNTIES = Object.keys(KENYA_LOCATIONS).sort();

function Checkout() {
  const {
    user,
    cart = [],
    showNotification,
    clearCart,
    token,
    isAuthenticated,
    publicSettings,
    setMobileMenuOpen,
    logAbandonedCheckout
  } = useContext(AppContext);

  const navigate = useNavigate();

  const [shippingInfo, setShippingInfo] = useState({
    firstName: user?.shippingInfo?.firstName || user?.firstName || '',
    lastName: user?.shippingInfo?.lastName || user?.lastName || '',
    email: user?.email || '',
    phone: user?.shippingInfo?.phone || user?.phone || '+254 ',
    address: user?.shippingInfo?.address || '',
    landmark: user?.shippingInfo?.landmark || '',
    county: user?.shippingInfo?.county || '',
    town: user?.shippingInfo?.town || '',
    city: user?.shippingInfo?.city || '',
    country: user?.shippingInfo?.country || 'Kenya',
    postalCode: user?.shippingInfo?.zip || ''
  });

  const [applyStoreCredit, setApplyStoreCredit] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('');

  // Auto-select first available payment method
  useEffect(() => {
    if (publicSettings?.payment?.paymentMethods) {
      const methods = publicSettings.payment.paymentMethods;
      if (methods.mpesa) setPaymentMethod('mpesa');
      else if (methods.card) setPaymentMethod('card');
      else if (methods.cashOnDelivery) setPaymentMethod('cod');
    }
  }, [publicSettings]);
  const [loading, setLoading] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [errors, setErrors] = useState({});
  const [mpesaPhone, setMpesaPhone] = useState(user?.wallet?.mpesaPhone || user?.phone || '');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');
  const [allCountries, setAllCountries] = useState(['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'United Arab Emirates', 'United Kingdom']);
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name')
      .then(res => res.json())
      .then(data => {
        const countryList = data.map(c => c.name.common).sort();
        if (countryList.length > 0) {
          setAllCountries(countryList);
        }
      })
      .catch(err => console.error('Failed to fetch countries', err));
  }, []);

  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState('monthly');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const discount = useMemo(() => {
    let totalDiscount = 0;
    if (couponData) {
      if (couponData.discountType === 'percentage') {
        totalDiscount += subtotal * (couponData.discountAmount / 100);
      } else {
        totalDiscount += couponData.discountAmount;
      }
    }
    if (isSubscription) {
      totalDiscount += subtotal * 0.05;
    }
    return Math.round(totalDiscount);
  }, [subtotal, couponData, isSubscription]);

  const [shippingCost, setShippingCost] = useState(0);
  const storeCreditAvailable = user?.storeCreditBalance || 0;
  const appliedStoreCredit = applyStoreCredit ? Math.min(storeCreditAvailable, subtotal - discount + shippingCost) : 0;
  const total = Math.max(0, subtotal - discount + shippingCost - appliedStoreCredit);

  useEffect(() => {
    if (!isAuthenticated) {
      showNotification('Please log in to checkout', 'info');
      navigate('/login');
    }
  }, [isAuthenticated, navigate, showNotification]);

  useEffect(() => {
    if (user) {
      setShippingInfo(prev => ({
        ...prev,
        firstName: prev.firstName || user.shippingInfo?.firstName || user.firstName || '',
        lastName: prev.lastName || user.shippingInfo?.lastName || user.lastName || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.shippingInfo?.phone || user.phone || '+254 ',
        address: prev.address || user.shippingInfo?.address || '',
        landmark: prev.landmark || user.shippingInfo?.landmark || '',
        city: prev.city || user.shippingInfo?.city || '',
        county: prev.county || user.shippingInfo?.county || '',
        town: prev.town || user.shippingInfo?.town || '',
        postalCode: prev.postalCode || user.shippingInfo?.zip || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (shippingInfo.county) {
      calculateShipping();
    }
  }, [shippingInfo.county]);

  const calculateShipping = async () => {
    if (!shippingInfo.county) {
      setShippingCost(0);
      return;
    }
    setCalculatingShipping(true);
    try {
      const response = await fetch('/api/orders/shipping-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          country: shippingInfo.country,
          county: shippingInfo.county
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShippingCost(result.data.shippingCost);
          setDeliveryEstimate(result.data.estimatedDays || result.data.estimate || '');
        }
      }
    } catch (error) {
      console.error('Shipping calculation error:', error);
      setShippingCost(shippingInfo.county === 'Nairobi' ? 200 : 350);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleInputChange = (field, value) => {
    setShippingInfo(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'county') newData.town = ''; // Reset town when county changes
      return newData;
    });
  };

  const handleCardInputChange = (field, value) => {
    // Basic formatting for card number
    if (field === 'number') {
      value = value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    // Basic formatting for expiry
    if (field === 'expiry') {
      value = value.replace(/\//g, '');
      if (value.length > 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
    }
    setCardInfo(prev => ({ ...prev, [field]: value }));
  };

  const logFailure = async (reason) => {
    logAbandonedCheckout({
      items: cart.map(item => ({
        product: item.productId || item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size
      })),
      totalAmount: total,
      paymentMethod,
      failureReason: reason,
      shippingAddress: shippingInfo
    });
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const response = await fetch('/api/orders/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: couponCode, subtotal })
      });
      const result = await response.json();
      if (result.success) {
        setCouponData(result.data);
        showNotification('Coupon applied!', 'success');
      } else {
        setCouponData(null);
        showNotification(result.message || 'Invalid coupon', 'error');
      }
    } catch (err) {
      showNotification('Failed to validate coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!shippingInfo.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!shippingInfo.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!shippingInfo.email?.trim()) newErrors.email = 'Email is required';
    
    // Courier phone is now optional. If provided, validate that it is a valid format.
    if (shippingInfo.phone?.trim() && 
        shippingInfo.phone.trim() !== '+254' && 
        shippingInfo.phone.trim() !== '+254 ' && 
        shippingInfo.phone.replace(/[\s\-\+]/g, '').length < 9) {
      newErrors.phone = 'Please enter a valid phone number or leave blank';
    }

    if (!shippingInfo.address?.trim()) newErrors.address = 'Street/Building is required';
    if (shippingInfo.country === 'Kenya' && !shippingInfo.landmark?.trim()) {
      newErrors.landmark = 'Nearest landmark/street is required';
    }

    if (shippingInfo.country === 'Kenya') {
      if (!shippingInfo.county) newErrors.county = 'Please select your county';
      if (!shippingInfo.town) newErrors.town = 'Please select your area/town';
    } else {
      if (!shippingInfo.city) newErrors.city = 'Please specify your city/region';
    }

    if (paymentMethod === 'cod' && !codConfirmed) {
      newErrors.cod = 'Please confirm pay on delivery';
    }

    if (paymentMethod === 'card') {
      if (!cardInfo.number.trim() || cardInfo.number.length < 15) newErrors.cardNo = 'Valid card number is required';
      if (!cardInfo.expiry.trim() || !cardInfo.expiry.includes('/')) newErrors.cardExp = 'Valid expiry (MM/YY) is required';
      if (!cardInfo.cvv.trim() || cardInfo.cvv.length < 3) newErrors.cardCvv = 'Security code (CVV) is required';
      if (!cardInfo.name.trim()) newErrors.cardName = 'Name on card is required';
    }

    return newErrors;
  };

  const savePendingOrder = async () => {
    try {
      const orderData = {
        shippingAddress: {
          ...shippingInfo,
          phone: shippingInfo.phone?.trim() && shippingInfo.phone.trim() !== '+254' && shippingInfo.phone.trim() !== '+254 '
            ? shippingInfo.phone
            : (user?.phone || mpesaPhone || '+254 700 000 000'),
          city: shippingInfo.country === 'Kenya' ? shippingInfo.county : shippingInfo.city
        },
        paymentMethod,
        items: cart.map(item => ({
          product: item.productId || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.images?.[0]?.url || item.image || '/default-product.jpg'
        })),
        subtotal,
        shippingCost,
        totalAmount: total,
        appliedStoreCredit,
        couponCode: couponData?.code,
        isSubscription,
        subscriptionFrequency: isSubscription ? subscriptionFrequency : undefined
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Order failed');
      }
    } catch (error) {
      showNotification(error.message, 'error');
      return null;
    }
  };

  const handlePlaceOrder = async () => {
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showNotification('Please fill in your delivery details correctly', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    if (paymentMethod === 'cod' && total > 20000) {
      showNotification('COD limited to KSh 20,000. Please use M-Pesa.', 'error');
      return false;
    }

    if (paymentMethod === 'mpesa' || paymentMethod === 'card') {
      setLoading(true);
      const pendingOrder = await savePendingOrder();
      setLoading(false);
      if (!pendingOrder) return false;

      setCreatedOrderId(pendingOrder._id || pendingOrder.id);
      setCreatedOrderNumber(pendingOrder.orderNumber);
      setShowPaymentModal(true);
    } else {
      await processOrder();
    }
    return true;
  };



  const processOrder = async (paymentData = null) => {
    setLoading(true);
    try {
      const orderData = {
        shippingAddress: {
          ...shippingInfo,
          phone: shippingInfo.phone?.trim() && shippingInfo.phone.trim() !== '+254' && shippingInfo.phone.trim() !== '+254 '
            ? shippingInfo.phone
            : (user?.phone || mpesaPhone || '+254 700 000 000'),
          city: shippingInfo.country === 'Kenya' ? shippingInfo.county : shippingInfo.city
        },
        paymentMethod,
        items: cart.map(item => ({
          product: item.productId || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.images?.[0]?.url || item.image || '/default-product.jpg'
        })),
        subtotal,
        shippingCost,
        totalAmount: total,
        appliedStoreCredit,
        couponCode: couponData?.code,
        isSubscription,
        subscriptionFrequency: isSubscription ? subscriptionFrequency : undefined,
        paymentData: paymentData || (paymentMethod === 'card' ? { ...cardInfo } : null)
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      if (result.success) {
        clearCart();
        showNotification('Order success! Asante.', 'success');
        navigate(`/order-confirmation/${result.data._id || result.data.id}`);
      } else {
        throw new Error(result.message || 'Order failed');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentAvailableTowns = useMemo(() => {
    if (shippingInfo.country === 'Kenya' && shippingInfo.county) {
      return KENYA_LOCATIONS[shippingInfo.county] || [];
    }
    return [];
  }, [shippingInfo.county, shippingInfo.country]);

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-forms-column">
          <header className="checkout-header">
            <div className="pre-title">Checkout</div>
            <h1>Delivery Details</h1>
            <p>Fast and reliable shipping for your coffee.</p>
          </header>

          <PaymentProcessingModal
            isOpen={showPaymentModal}
            paymentMethod={paymentMethod}
            amount={total}
            phone={mpesaPhone}
            orderId={createdOrderId}
            orderNumber={createdOrderNumber}
            onSuccess={(data) => {
              setShowPaymentModal(false);
              clearCart();
              showNotification('Order placed and paid successfully! Asante.', 'success');
              navigate(`/order-confirmation/${createdOrderId}`);
            }}
            onFailure={(msg) => {
              setShowPaymentModal(false);
              showNotification(msg, 'error');
              logFailure(msg);
            }}
            onCancel={() => {
              setShowPaymentModal(false);
              logFailure('User cancelled checkout');
            }}
          />

          <section className="checkout-form-section">
            <div className="section-head">
              <FaTruck />
              <h2>1. Delivery Protocol</h2>
            </div>

            <div className="form-grid">
              <div className={`input-group ${errors.firstName ? 'has-error' : ''}`}>
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kipchumba"
                  value={shippingInfo.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="premium-input-modern"
                />
                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
              </div>

              <div className={`input-group ${errors.lastName ? 'has-error' : ''}`}>
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Langat"
                  value={shippingInfo.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="premium-input-modern"
                />
                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
              </div>

              <div className={`input-group full-width ${errors.email ? 'has-error' : ''}`}>
                <label className="input-label">Notification Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={shippingInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="premium-input-modern"
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="input-group full-width">
                <label className="input-label">Country / Territory</label>
                <div className="select-wrapper-modern">
                  <FaGlobe className="select-icon" />
                  <select
                    value={shippingInfo.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="premium-select-modern"
                  >
                    {allCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {shippingInfo.country === 'Kenya' ? (
                <>
                  <div className={`input-group ${errors.county ? 'has-error' : ''}`}>
                    <label className="input-label">County</label>
                    <div className="select-wrapper-modern">
                      <select
                        value={shippingInfo.county}
                        onChange={(e) => handleInputChange('county', e.target.value)}
                        className="premium-select-modern"
                      >
                        <option value="">Select County</option>
                        {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {errors.county && <span className="error-text">{errors.county}</span>}
                  </div>

                  <div className={`input-group ${errors.town ? 'has-error' : ''}`}>
                    <label className="input-label">Area / Town</label>
                    <div className="select-wrapper-modern">
                      <select
                        value={shippingInfo.town}
                        onChange={(e) => handleInputChange('town', e.target.value)}
                        className="premium-select-modern"
                        disabled={!shippingInfo.county}
                      >
                        <option value="">Select Nearest Center</option>
                        {currentAvailableTowns.sort().map(city => <option key={city} value={city}>{city}</option>)}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {errors.town && <span className="error-text">{errors.town}</span>}
                  </div>
                </>
              ) : (
                <div className={`input-group full-width ${errors.city ? 'has-error' : ''}`}>
                  <label className="input-label">City / State</label>
                  <input
                    type="text"
                    placeholder="e.g. Kampala, London"
                    value={shippingInfo.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="premium-input-modern"
                  />
                  {errors.city && <span className="error-text">{errors.city}</span>}
                </div>
              )}

              {shippingInfo.country === 'Kenya' && (
                <div className={`input-group full-width ${errors.landmark ? 'has-error' : ''}`}>
                  <label className="input-label">Nearest Landmark / Street *</label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite Total Petrol Station, Kimathi Street"
                    value={shippingInfo.landmark}
                    onChange={(e) => handleInputChange('landmark', e.target.value)}
                    className="premium-input-modern"
                  />
                  {errors.landmark && <span className="error-text">{errors.landmark}</span>}
                </div>
              )}

              <div className={`input-group full-width ${errors.address ? 'has-error' : ''}`}>
                <label className="input-label">Specific Location (Building, Landmark, Flat No)</label>
                <textarea
                  placeholder="e.g. Near Huduma Center, Kimathi House, Floor 4"
                  value={shippingInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="premium-textarea-modern"
                  rows="2"
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="input-group full-width">
                <div className="label-flex">
                  <label className="input-label">Posta / Zip Code</label>
                  <span className="label-hint">Optional in Kenya</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 00100"
                  value={shippingInfo.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className="premium-input-modern"
                />
                <div className="zip-helper">
                  <FaInfoCircle /> <span>Commonly <strong>00100</strong> or leave blank if unknown.</span>
                </div>
              </div>

              <div className={`input-group full-width ${errors.phone ? 'has-error' : ''}`}>
                <div className="label-flex">
                  <label className="input-label">Courier Contact Phone</label>
                  <span className="label-hint">Optional</span>
                </div>
                <div className="input-with-icon-modern" style={{ position: 'relative' }}>
                  <FaPhone className="inner-icon" />
                  <input
                    type="tel"
                    placeholder="+254 7XX XXX XXX"
                    value={shippingInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    className="premium-input-modern with-icon"
                  />
                  {shippingInfo.phone && !isPhoneFocused && (
                    <div className="input-mask-overlay-checkout" style={{
                      position: 'absolute',
                      top: 0,
                      left: '3rem',
                      right: 0,
                      height: '100%',
                      background: 'var(--bg-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 1rem',
                      pointerEvents: 'none',
                      borderRadius: '0 12px 12px 0',
                      color: 'var(--text-main)',
                      fontWeight: '600',
                      letterSpacing: '1px'
                    }}>
                      {shippingInfo.phone.length > 7
                        ? `${shippingInfo.phone.slice(0, 4)} ••• ${shippingInfo.phone.slice(-3)}`
                        : shippingInfo.phone}
                    </div>
                  )}
                </div>
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            </div>
          </section>

          <section className="checkout-form-section">
            <div className="section-head">
              <FaShieldAlt />
              <h2>2. Security & Payment</h2>
            </div>
            <div className="payment-grid-modern">
              {publicSettings?.payment?.paymentMethods?.mpesa && (
                <div
                  className={`payment-method-card ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('mpesa')}
                >
                  <div className="payment-icon"><FaPhone /></div>
                  <div className="payment-label">M-Pesa Express</div>
                </div>
              )}
              {publicSettings?.payment?.paymentMethods?.card && (
                <div
                  className={`payment-method-card ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="payment-icon"><FaCreditCard /></div>
                  <div className="payment-label">Debit / Credit</div>
                </div>
              )}
              {publicSettings?.payment?.paymentMethods?.cashOnDelivery && (
                <div
                  className={`payment-method-card ${paymentMethod === 'cod' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className="payment-icon"><FaMoneyBillWave /></div>
                  <div className="payment-label">Pay on Delivery</div>
                </div>
              )}

              {/* Graceful fallback if NO payment methods are enabled (safety check) */}
              {(!publicSettings?.payment?.paymentMethods?.mpesa &&
                !publicSettings?.payment?.paymentMethods?.card &&
                !publicSettings?.payment?.paymentMethods?.cashOnDelivery) && (
                  <div className="payment-method-card disabled full-width">
                    <div className="payment-icon"><FaExclamationCircle /></div>
                    <div className="payment-label">No payment methods currently available. Please contact support.</div>
                  </div>
                )}
            </div>

            {paymentMethod === 'mpesa' && (
              <div className="payment-config-box">
                <p>Funds will be requested via STK Push to the number below:</p>
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="premium-input-modern"
                  placeholder="M-Pesa Number"
                />
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="payment-config-box card-input-box animated-fade-in">
                <div className="card-input-grid">
                  <div className={`input-group full-width ${errors.cardNo ? 'has-error' : ''}`}>
                    <label className="input-label">Card Number</label>
                    <div className="input-with-icon-modern">
                      <FaCreditCard className="inner-icon" />
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        value={cardInfo.number}
                        onChange={(e) => handleCardInputChange('number', e.target.value)}
                        className="premium-input-modern with-icon"
                        maxLength="19"
                      />
                    </div>
                    {errors.cardNo && <span className="error-text">{errors.cardNo}</span>}
                  </div>

                  <div className={`input-group ${errors.cardExp ? 'has-error' : ''}`}>
                    <label className="input-label">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM / YY"
                      value={cardInfo.expiry}
                      onChange={(e) => handleCardInputChange('expiry', e.target.value)}
                      className="premium-input-modern"
                      maxLength="5"
                    />
                    {errors.cardExp && <span className="error-text">{errors.cardExp}</span>}
                  </div>

                  <div className={`input-group ${errors.cardCvv ? 'has-error' : ''}`}>
                    <label className="input-label">CVV / CVC</label>
                    <div className="input-with-icon-modern">
                      <FaLock className="inner-icon" />
                      <input
                        type="password"
                        placeholder="123"
                        value={cardInfo.cvv}
                        onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                        className="premium-input-modern with-icon"
                        maxLength="4"
                      />
                    </div>
                    {errors.cardCvv && <span className="error-text">{errors.cardCvv}</span>}
                  </div>

                  <div className={`input-group full-width ${errors.cardName ? 'has-error' : ''}`}>
                    <label className="input-label">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Kipchumba Langat"
                      value={cardInfo.name}
                      onChange={(e) => handleCardInputChange('name', e.target.value)}
                      className="premium-input-modern"
                    />
                    {errors.cardName && <span className="error-text">{errors.cardName}</span>}
                  </div>
                </div>

                <div className="card-security-note">
                  <FaShieldAlt />
                  <span>Secure bank-level 256-bit encryption active.</span>
                </div>
              </div>
            )}

            {paymentMethod === 'cod' && (
              <div className={`payment-config-box ${errors.cod ? 'has-error' : ''}`}>
                <label className="modern-checkbox-label">
                  <input
                    type="checkbox"
                    checked={codConfirmed}
                    onChange={(e) => setCodConfirmed(e.target.checked)}
                  />
                  <span>I authorize Rerendet to deliver my order for cash/mobile payment on arrival.</span>
                </label>
                {errors.cod && <span className="error-text-block">{errors.cod}</span>}
              </div>
            )}
          </section>
        </div>

        <aside className="checkout-sidebar-column">
          <div className="order-manifest-card">
            <div className="manifest-header">
              <h3>Order Summary</h3>
              <span className="item-count">{cart.length} Bags</span>
            </div>

            <div className="manifest-items">
              {cart.map((item, i) => (
                <div className="manifest-item" key={i}>
                  <div className="item-img-wrap">
                    <img src={item.images?.[0]?.url || item.image || '/default-product.jpg'} alt={item.name} />
                  </div>
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p>{item.size} • Qty {item.quantity}</p>
                    <span className="item-price">KES {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="discount-area">
              <div className="promo-input-row">
                <input
                  type="text"
                  placeholder="Voucher / Promo Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!couponData}
                />
                <button
                  className={couponData ? 'btn-remove' : 'btn-apply'}
                  onClick={couponData ? () => { setCouponData(null); setCouponCode(''); } : handleValidateCoupon}
                >
                  {couponData ? 'Reset' : 'Apply'}
                </button>
              </div>
              {couponData && <div className="promo-success-badge"><FaPercent /> Discount Active</div>}
              {storeCreditAvailable > 0 && (
                <div className="store-credit-area" style={{ marginTop: '15px', padding: '12px', background: 'rgba(212, 175, 55, 0.05)', border: '1px dashed #d4af37', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={applyStoreCredit}
                      onChange={(e) => setApplyStoreCredit(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f5efe6' }}>Apply Store Credit</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#a08a75' }}>Available: KES {storeCreditAvailable.toLocaleString()}</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="manifest-totals">
              <div className="total-row"><span>Cart Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              {discount > 0 && (
                <div className="total-row discount">
                  <span>
                    {couponData ? `Promo (${couponData.code})` : isSubscription ? 'Subscription Discount' : 'Total Discount'}
                  </span>
                  <span>- KES {discount.toLocaleString()}</span>
                </div>
              )}
              {appliedStoreCredit > 0 && (
                <div className="total-row discount" style={{ color: '#d4af37' }}>
                  <span>Store Credit Applied</span>
                  <span>- KES {appliedStoreCredit.toLocaleString()}</span>
                </div>
              )}
              <div className="total-row">
                <span>
                  Logistics Fee
                  {deliveryEstimate && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#a08a75', fontWeight: 'normal' }}>
                      Est. Delivery: {deliveryEstimate}
                    </span>
                  )}
                </span>
                <span>KES {shippingCost.toLocaleString()}</span>
              </div>
              <div className="grand-total-highlight">
                <div className="total-label">Total</div>
                <div className="total-value">KES {total.toLocaleString()}</div>
              </div>
            </div>

            <div className="checkout-submit-container" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className={`checkout-submit-btn-premium ${loading ? 'loading' : ''}`}
                onClick={handlePlaceOrder}
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8932A 100%)',
                  color: '#000',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
                  fontFamily: 'inherit'
                }}
              >
                {loading ? (
                  <><FaSync className="spin" /> Processing Order...</>
                ) : (
                  <><FaLock /> Confirm & Place Order (KES {total.toLocaleString()})</>
                )}
              </button>
            </div>

            <div className="manifest-security-footer">
              <FaShieldAlt /> <span>Guaranteed Secure via SSL Encryption</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Checkout;
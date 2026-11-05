import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaLock, FaCreditCard, FaMoneyBillWave, FaPhone,
  FaTruck, FaUser, FaInfoCircle, FaShieldAlt,
  FaArrowRight, FaArrowLeft, FaMapMarkerAlt, FaEnvelope, FaExclamationCircle, FaPercent, FaSync, FaGlobe, FaCheckCircle
} from 'react-icons/fa';
import PaymentProcessingModal from '../PaymentProcessingModal/PaymentProcessingModal';
import BrandLoader from '../UI/BrandLoader';
import './Checkout.css';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';
import { COUNTRY_LIST, COUNTRY_OBJECTS, fetchGlobalCountries, getCountryDetails, getDialCode, getFlag } from '../../utils/countryList';
import { isProductOutOfStock } from '../../utils/stockValidator';

const KENYAN_COUNTIES = Object.keys(KENYA_LOCATIONS).sort();

function Checkout() {
  const {
    user,
    cart = [],
    showNotification,
    clearCart,
    token,
    authLoading,
    isAuthenticated,
    publicSettings,
    logAbandonedCheckout
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Step 1: SHIPPING | Step 2: PAYMENT | Step 3: REVIEW & CONFIRMATION
  const [currentStep, setCurrentStep] = useState(1);
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [selectedCardType, setSelectedCardType] = useState('new'); // 'saved' or 'new'

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
  const [paymentMethod, setPaymentMethod] = useState('card'); // default to card as in target mockup
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const def = user.addresses.find(a => a.isDefault);
      return def ? def._id : user.addresses[0]._id;
    }
    return null;
  });

  const handleSelectSavedAddress = (addr) => {
    if (!addr) return;
    setSelectedAddressId(addr._id);
    const names = (addr.recipientName || `${user?.firstName || ''} ${user?.lastName || ''}`).trim().split(' ');
    const fName = names[0] || user?.firstName || '';
    const lName = names.slice(1).join(' ') || user?.lastName || '';
    setShippingInfo(prev => ({
      ...prev,
      firstName: fName,
      lastName: lName,
      phone: addr.phone || user?.phone || '+254 ',
      country: addr.country || 'Kenya',
      county: addr.county || '',
      town: addr.town || '',
      city: addr.city || '',
      address: addr.address || '',
      landmark: addr.landmark || '',
      postalCode: addr.zip || ''
    }));
  };

  // Auto-select first available payment method from settings
  useEffect(() => {
    if (publicSettings?.payment?.paymentMethods) {
      const methods = publicSettings.payment.paymentMethods;
      if (methods.card) setPaymentMethod('card');
      else if (methods.mpesa) setPaymentMethod('mpesa');
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
  const [allCountries, setAllCountries] = useState(COUNTRY_OBJECTS);
  const [subdivisions, setSubdivisions] = useState(KENYAN_COUNTIES);
  const [subdivisionType, setSubdivisionType] = useState('County');

  // Fetch updated countries from backend location API (with REST Countries v5)
  useEffect(() => {
    let isMounted = true;
    fetchGlobalCountries().then(list => {
      if (isMounted && Array.isArray(list) && list.length > 0) {
        setAllCountries(list);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Sync subdivisions (counties/states/provinces) when country changes
  useEffect(() => {
    const countryName = shippingInfo.country || 'Kenya';
    if (countryName.toLowerCase() === 'kenya') {
      setSubdivisions(KENYAN_COUNTIES);
      setSubdivisionType('County');
    } else {
      const match = allCountries.find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name.toLowerCase() === countryName.toLowerCase();
      });
      const countryCode = typeof match === 'object' ? match?.code : null;

      if (countryCode) {
        fetch(`/api/locations/subdivisions/${countryCode}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.hasSubdivisions) {
              setSubdivisions(data.divisions || []);
              setSubdivisionType(data.type || 'State / Province / County');
            } else {
              setSubdivisions([]);
              setSubdivisionType('State / Province / County');
            }
          })
          .catch(() => {
            setSubdivisions([]);
            setSubdivisionType('State / Province / County');
          });
      } else {
        setSubdivisions([]);
        setSubdivisionType('State / Province / County');
      }
    }
  }, [shippingInfo.country, allCountries]);

  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : ''
  });

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

  // Per-checkout idempotency key to prevent duplicate charges
  const idempotencyKeyRef = useRef(null);
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = `IDEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Redirect to login if not authenticated (after persistent auth initialization finishes)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      showNotification('Please log in to proceed with checkout', 'info');
      sessionStorage.setItem('authRedirect', '/checkout');
      navigate('/login?redirect=checkout');
    }
  }, [authLoading, isAuthenticated, navigate, showNotification]);

  // Sync user profile shipping details
  useEffect(() => {
    if (user) {
      if (user.addresses && user.addresses.length > 0) {
        const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
        if (def && !selectedAddressId) {
          handleSelectSavedAddress(def);
        }
      } else {
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
      if (user.wallet?.mpesaPhone) {
        setMpesaPhone(user.wallet.mpesaPhone);
      }
    }
  }, [user]);

  // Calculate shipping when country or county changes
  useEffect(() => {
    if (shippingInfo.country) {
      if (shippingInfo.country.toLowerCase() === 'kenya') {
        if (shippingInfo.county) {
          calculateShipping();
        } else {
          setShippingCost(0);
          setDeliveryEstimate('');
        }
      } else {
        calculateShipping();
      }
    }
  }, [shippingInfo.country, shippingInfo.county]);

  const calculateShipping = async () => {
    const isKenya = (shippingInfo.country || 'Kenya').toLowerCase() === 'kenya';
    if (isKenya && !shippingInfo.county) {
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
          country: shippingInfo.country || 'Kenya',
          county: shippingInfo.county || ''
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
      if (isKenya) {
        setShippingCost(shippingInfo.county === 'Nairobi' ? 200 : 350);
      } else {
        setShippingCost(2500);
        setDeliveryEstimate('5–7 business days (DHL Express)');
      }
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleInputChange = (field, value) => {
    setShippingInfo(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'country') {
        newData.county = '';
        newData.town = '';
        newData.city = '';
        // Automatically set phone dialing prefix when country changes
        const dial = getDialCode(value);
        if (!prev.phone || /^\+\d{1,4}\s*$/.test(prev.phone.trim()) || prev.phone.trim() === '+254' || prev.phone.trim() === '+254 ') {
          newData.phone = `${dial} `;
        }
      } else if (field === 'county') {
        newData.town = '';
      }
      return newData;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCardInputChange = (field, value) => {
    if (field === 'number') {
      value = value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    } else if (field === 'expiry') {
      value = value.replace(/\//g, '');
      if (value.length > 2) {
        value = value.slice(0, 2) + ' / ' + value.slice(2, 4);
      }
    } else if (field === 'cvv') {
      value = value.replace(/[^0-9]/g, '').slice(0, 4);
    }
    setCardInfo(prev => ({ ...prev, [field]: value }));
    const errorKey = field === 'number' ? 'cardNo' : field === 'expiry' ? 'cardExp' : field === 'cvv' ? 'cardCvv' : 'cardName';
    if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: '' }));
  };

  const getCardBrandBadge = (num) => {
    const clean = (num || '').replace(/\s+/g, '');
    if (/^4/.test(clean)) return <span className="badge-brand visa">VISA</span>;
    if (/^5[1-5]/.test(clean)) return <span className="badge-brand mc">Mastercard</span>;
    if (/^3[47]/.test(clean)) return <span className="badge-brand amex">AMEX</span>;
    return <span className="badge-brand visa">VISA</span>;
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
        showNotification('Coupon applied successfully!', 'success');
      } else {
        setCouponData(null);
        showNotification(result.message || 'Invalid coupon code', 'error');
      }
    } catch (err) {
      showNotification('Failed to validate coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Validate step 1 (Shipping Protocol)
  const validateShipping = () => {
    const newErrors = {};
    if (!shippingInfo.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!shippingInfo.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!shippingInfo.email?.trim()) newErrors.email = 'Email address is required';
    if (!shippingInfo.address?.trim()) newErrors.address = 'Street/Building address is required';
    if (!shippingInfo.phone?.trim() || shippingInfo.phone.replace(/[\s\+\-]/g, '').length < 6) {
      newErrors.phone = 'Valid phone number is required for courier dispatch';
    }

    const isKenya = (shippingInfo.country || 'Kenya').toLowerCase() === 'kenya';
    if (isKenya) {
      if (!shippingInfo.county) newErrors.county = 'Please select a county';
      if (!shippingInfo.town) newErrors.town = 'Please select an area/town';
      if (!shippingInfo.landmark?.trim()) newErrors.landmark = 'Nearest landmark is required';
    } else {
      if (!shippingInfo.city?.trim()) newErrors.city = 'Please specify your city/town';
      if (subdivisions.length > 0 && !shippingInfo.county?.trim()) {
        newErrors.county = `Please select your ${subdivisionType.toLowerCase()}`;
      }
    }
    return newErrors;
  };

  const handleContinueToPayment = (e) => {
    if (e) e.preventDefault();
    const shipErrors = validateShipping();
    if (Object.keys(shipErrors).length > 0) {
      setErrors(shipErrors);
      showNotification('Please fill in your delivery details correctly', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors({});
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validatePayment = () => {
    const newErrors = {};
    if (paymentMethod === 'card' && selectedCardType === 'new') {
      if (!cardInfo.number.trim() || cardInfo.number.replace(/\s+/g, '').length < 15) {
        newErrors.cardNo = 'Valid card number is required';
      }
      if (!cardInfo.expiry.trim() || !cardInfo.expiry.includes('/')) {
        newErrors.cardExp = 'Valid expiry (MM / YY) is required';
      }
      if (!cardInfo.cvv.trim() || cardInfo.cvv.length < 3) {
        newErrors.cardCvv = 'Security code (CVC) is required';
      }
      if (!cardInfo.name.trim()) {
        newErrors.cardName = 'Cardholder name is required';
      }
    }

    if (paymentMethod === 'mpesa') {
      const cleanPhone = mpesaPhone.replace(/[\s\-\+]/g, '');
      if (!cleanPhone || cleanPhone.length < 9) {
        newErrors.mpesa = 'Please enter a valid M-Pesa phone number';
      }
    }

    if (paymentMethod === 'cod' && !codConfirmed) {
      newErrors.cod = 'Please confirm authorization for Cash on Delivery';
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
        subscriptionFrequency: isSubscription ? subscriptionFrequency : undefined,
        idempotencyKey: idempotencyKeyRef.current
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
    // Zero-tolerance out-of-stock check
    if (cart.some(item => isProductOutOfStock(item))) {
      showNotification('Some items in your cart are out of stock. Please remove them to proceed.', 'error');
      navigate('/#coffee-shop');
      return false;
    }

    const shipErrors = validateShipping();
    const payErrors = validatePayment();
    const combinedErrors = { ...shipErrors, ...payErrors };

    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);
      if (Object.keys(shipErrors).length > 0 && currentStep === 2) {
        setCurrentStep(1);
      }
      showNotification('Please fill in required fields correctly', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    if (paymentMethod === 'cod' && total > 20000) {
      showNotification('Cash on delivery is limited to KSh 20,000. Please select M-Pesa or Card.', 'error');
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
        idempotencyKey: idempotencyKeyRef.current,
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
        showNotification('Order success! Asante sana.', 'success');
        navigate(`/order-confirmation/${result.data._id || result.data.id}`);
      } else {
        throw new Error(result.message || 'Order placement failed');
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

  if (authLoading) {
    return (
      <div className="checkout-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BrandLoader minHeight="70vh" subtitle="PREPARING CHECKOUT DISPATCH" />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">

        {/* ── Top Stepper Progress Bar (Pixel-Perfect from Mockup) ── */}
        <div className="checkout-stepper-wrap">
          <div className="checkout-stepper">
            {/* Step 1: SHIPPING */}
            <div
              className={`stepper-step ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : ''}`}
              onClick={() => currentStep > 1 && setCurrentStep(1)}
              title="Edit Delivery Protocol"
            >
              <div className="stepper-circle">
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="stepper-label">SHIPPING</span>
            </div>

            <div className={`stepper-line ${currentStep >= 2 ? 'active' : ''}`} />

            {/* Step 2: PAYMENT */}
            <div
              className={`stepper-step ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : ''}`}
              onClick={() => {
                if (currentStep === 1) handleContinueToPayment();
              }}
            >
              <div className="stepper-circle">
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="stepper-label">PAYMENT</span>
            </div>

            <div className={`stepper-line ${currentStep >= 3 ? 'active' : ''}`} />

            {/* Step 3: REVIEW & CONFIRMATION */}
            <div className={`stepper-step disabled ${currentStep === 3 ? 'active' : ''}`}>
              <div className="stepper-circle">3</div>
              <span className="stepper-label">REVIEW & CONFIRMATION</span>
            </div>
          </div>
        </div>

        {/* ── Payment Processing Modal (M-Pesa STK & Card Processing) ── */}
        <PaymentProcessingModal
          isOpen={showPaymentModal}
          paymentMethod={paymentMethod}
          amount={total}
          phone={mpesaPhone}
          orderId={createdOrderId}
          orderNumber={createdOrderNumber}
          onSuccess={() => {
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
            logFailure('User cancelled payment modal');
          }}
        />

        {/* ── Main Two-Column Layout ── */}
        <div className="checkout-main-grid">

          {/* ══════ LEFT COLUMN ══════ */}
          <div className="checkout-left-column">

            {/* STEP 1: SHIPPING PROTOCOL */}
            {currentStep === 1 && (
              <div className="checkout-step-content animated-fade-in">
                <h2 className="checkout-section-title">Delivery Details</h2>

                {user?.addresses && user.addresses.length > 0 && (
                  <div className="chk-saved-addresses-wrapper">
                    <div className="chk-saved-header">
                      <span className="chk-saved-title">Saved Delivery Addresses</span>
                      <span className="chk-saved-hint">Click an address to auto-fill</span>
                    </div>

                    <div className="chk-saved-addresses-grid">
                      {user.addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr._id;
                        return (
                          <div
                            key={addr._id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`chk-saved-address-card ${isSelected ? 'selected' : ''}`}
                          >
                            <div>
                              <div className="chk-saved-card-top">
                                <span className="chk-saved-card-label">
                                  {addr.label || 'Home'}
                                </span>
                                {addr.isDefault && (
                                  <span className="chk-saved-badge-default">Default</span>
                                )}
                              </div>
                              <p className="chk-saved-card-body">
                                <strong className="chk-saved-card-recipient">
                                  {addr.recipientName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                                </strong><br />
                                {addr.address}<br />
                                <span className="chk-saved-card-loc">
                                  {getFlag(addr.country)} {addr.country === 'Kenya'
                                    ? `${addr.town ? addr.town + ', ' : ''}${addr.county || ''}`
                                    : `${addr.city ? addr.city + ', ' : ''}${addr.county ? addr.county + ' ' : ''}${addr.country || ''}`}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="chk-form-grid">
                  <div className="chk-form-row">
                    <div className="chk-input-group">
                      <label className="chk-label">First Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Kipchumba"
                        value={shippingInfo.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`chk-input ${errors.firstName ? 'has-error' : ''}`}
                      />
                      {errors.firstName && <span className="chk-error-text">{errors.firstName}</span>}
                    </div>

                    <div className="chk-input-group">
                      <label className="chk-label">Last Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Langat"
                        value={shippingInfo.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`chk-input ${errors.lastName ? 'has-error' : ''}`}
                      />
                      {errors.lastName && <span className="chk-error-text">{errors.lastName}</span>}
                    </div>
                  </div>

                  <div className="chk-input-group">
                    <label className="chk-label">Notification Email *</label>
                    <input
                      type="email"
                      placeholder="hello@example.com"
                      value={shippingInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`chk-input ${errors.email ? 'has-error' : ''}`}
                    />
                    {errors.email && <span className="chk-error-text">{errors.email}</span>}
                  </div>

                  <div className="chk-input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="chk-label" style={{ margin: 0 }}>Country / Territory *</label>
                      <span style={{ fontSize: '0.74rem', color: 'var(--chk-text-muted)' }}>
                        {shippingInfo.country !== 'Kenya' ? '✈️ International Express Delivery' : '🇰🇪 Kenyan Domestic Courier'}
                      </span>
                    </div>
                    <select
                      value={shippingInfo.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="chk-input"
                    >
                      {allCountries.map(c => {
                        const cName = typeof c === 'string' ? c : c.name;
                        const cFlag = typeof c === 'object' && c.flag ? `${c.flag} ` : '';
                        const cDial = typeof c === 'object' && c.dialCode ? ` (${c.dialCode})` : '';
                        return (
                          <option key={cName} value={cName}>
                            {cFlag}{cName}{cDial}
                          </option>
                        );
                      })}
                    </select>

                    <div className="chk-country-meta-card">
                      <div className="chk-country-meta-left">
                        <span className="chk-country-flag-large">{getFlag(shippingInfo.country)}</span>
                        <div>
                          <strong className="chk-country-name">{shippingInfo.country}</strong>
                          <span className="chk-country-sub">
                            {getDialCode(shippingInfo.country)} • {shippingInfo.country?.toLowerCase() === 'kenya' ? 'Domestic Delivery (All 47 Counties)' : 'Worldwide Express Air Cargo'}
                          </span>
                        </div>
                      </div>
                      <span className={`chk-zone-pill ${shippingInfo.country?.toLowerCase() === 'kenya' ? 'domestic' : 'international'}`}>
                        {shippingInfo.country?.toLowerCase() === 'kenya' ? '🇰🇪 Standard Ground' : '✈️ Express Air'}
                      </span>
                    </div>
                  </div>

                  {shippingInfo.country?.toLowerCase() === 'kenya' ? (
                    <>
                      <div className="chk-form-row">
                        <div className="chk-input-group">
                          <label className="chk-label">County *</label>
                          <select
                            value={shippingInfo.county}
                            onChange={(e) => handleInputChange('county', e.target.value)}
                            className={`chk-input ${errors.county ? 'has-error' : ''}`}
                          >
                            <option value="">Select County (All 47 Counties)</option>
                            {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {errors.county && <span className="chk-error-text">{errors.county}</span>}
                        </div>

                        <div className="chk-input-group">
                          <label className="chk-label">Area / Town *</label>
                          <select
                            value={shippingInfo.town}
                            onChange={(e) => handleInputChange('town', e.target.value)}
                            className={`chk-input ${errors.town ? 'has-error' : ''}`}
                            disabled={!shippingInfo.county}
                          >
                            <option value="">Select Nearest Center</option>
                            {currentAvailableTowns.sort().map(city => <option key={city} value={city}>{city}</option>)}
                            <option value="Other">Other</option>
                          </select>
                          {errors.town && <span className="chk-error-text">{errors.town}</span>}
                        </div>
                      </div>

                      <div className="chk-input-group">
                        <label className="chk-label">Nearest Landmark / Street *</label>
                        <input
                          type="text"
                          placeholder="e.g. Opposite Total Petrol Station, Kimathi Street"
                          value={shippingInfo.landmark}
                          onChange={(e) => handleInputChange('landmark', e.target.value)}
                          className={`chk-input ${errors.landmark ? 'has-error' : ''}`}
                        />
                        {errors.landmark && <span className="chk-error-text">{errors.landmark}</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="chk-form-row">
                        <div className="chk-input-group">
                          <label className="chk-label">{subdivisionType} {subdivisions.length > 0 ? '*' : '(Optional)'}</label>
                          {subdivisions.length > 0 ? (
                            <select
                              value={shippingInfo.county}
                              onChange={(e) => handleInputChange('county', e.target.value)}
                              className={`chk-input ${errors.county ? 'has-error' : ''}`}
                            >
                              <option value="">Select {subdivisionType}</option>
                              {subdivisions.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                              <option value="Other">Other / Not Listed</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. State, Province, or County"
                              value={shippingInfo.county}
                              onChange={(e) => handleInputChange('county', e.target.value)}
                              className={`chk-input ${errors.county ? 'has-error' : ''}`}
                            />
                          )}
                          {errors.county && <span className="chk-error-text">{errors.county}</span>}
                        </div>

                        <div className="chk-input-group">
                          <label className="chk-label">City / Town *</label>
                          <input
                            type="text"
                            placeholder="e.g. London, Toronto, Dubai, New York"
                            value={shippingInfo.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className={`chk-input ${errors.city ? 'has-error' : ''}`}
                          />
                          {errors.city && <span className="chk-error-text">{errors.city}</span>}
                        </div>
                      </div>

                      <div className="chk-input-group">
                        <label className="chk-label">Nearest Landmark / Neighborhood (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Near Central Park / Near Main Metro Station"
                          value={shippingInfo.landmark}
                          onChange={(e) => handleInputChange('landmark', e.target.value)}
                          className="chk-input"
                        />
                      </div>
                    </>
                  )}

                  <div className="chk-input-group">
                    <label className="chk-label">Specific Location (Building, Door/Flat No) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Kimathi House, 4th Floor, Suite 402"
                      value={shippingInfo.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`chk-input ${errors.address ? 'has-error' : ''}`}
                    />
                    {errors.address && <span className="chk-error-text">{errors.address}</span>}
                  </div>

                  <div className="chk-form-row">
                    <div className="chk-input-group">
                      <label className="chk-label">Posta / Zip Code (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 00100"
                        value={shippingInfo.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className="chk-input"
                      />
                    </div>

                    <div className="chk-input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="chk-label" style={{ margin: 0 }}>Courier Contact Phone *</label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--chk-text-muted)' }}>
                          {getDialCode(shippingInfo.country)}
                        </span>
                      </div>
                      <input
                        type="tel"
                        placeholder={`e.g. ${getDialCode(shippingInfo.country)} 712 345 678`}
                        value={shippingInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`chk-input ${errors.phone ? 'has-error' : ''}`}
                      />
                      {errors.phone && <span className="chk-error-text">{errors.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="checkout-step-actions">
                  <button
                    type="button"
                    className="btn-step-next"
                    onClick={handleContinueToPayment}
                  >
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PAYMENT OPTIONS (Matching Uploaded Mockup Exactly) */}
            {currentStep === 2 && (
              <div className="checkout-step-content animated-fade-in">
                <h2 className="checkout-section-title">Payment options</h2>

                {/* Horizontal 3-Card Grid */}
                <div className="payment-options-cards-grid">
                  {/* Option 1: Credit Card */}
                  {publicSettings?.payment?.paymentMethods?.card !== false && (
                    <div
                      className={`payment-method-box ${paymentMethod === 'card' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      {paymentMethod === 'card' && <div className="method-check-badge">✓</div>}
                      <FaCreditCard className="method-icon" />
                      <span className="method-name">CREDIT CARD</span>
                    </div>
                  )}

                  {/* Option 2: Buy with M-Pesa (Matches Apple Pay card style) */}
                  {publicSettings?.payment?.paymentMethods?.mpesa !== false && (
                    <div
                      className={`payment-method-box ${paymentMethod === 'mpesa' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('mpesa')}
                    >
                      {paymentMethod === 'mpesa' && <div className="method-check-badge">✓</div>}
                      <FaPhone className="method-icon" />
                      <span className="method-name">BUY WITH M-PESA</span>
                    </div>
                  )}

                  {/* Option 3: Pay on Delivery (Matches PayPal card style) */}
                  {publicSettings?.payment?.paymentMethods?.cashOnDelivery !== false && (
                    <div
                      className={`payment-method-box ${paymentMethod === 'cod' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('cod')}
                    >
                      {paymentMethod === 'cod' && <div className="method-check-badge">✓</div>}
                      <FaMoneyBillWave className="method-icon" />
                      <span className="method-name">CASH ON DELIVERY</span>
                    </div>
                  )}
                </div>

                {/* ── Details for CREDIT CARD ── */}
                {paymentMethod === 'card' && (
                  <div className="card-payment-form-wrap">
                    {/* Saved Cards List (Matches Mockup) */}
                    <div className="saved-cards-section">
                      <div className="saved-card-row">
                        <label className="saved-card-radio-label">
                          <input
                            type="radio"
                            name="card_choice"
                            checked={selectedCardType === 'saved'}
                            onChange={() => setSelectedCardType('saved')}
                          />
                          <span>Visa/Delta/electron ending in <strong>{user?.card?.last4 || '4054'}</strong></span>
                        </label>
                        <button type="button" className="btn-card-edit" onClick={() => setSelectedCardType('new')}>Edit</button>
                      </div>

                      <div className="saved-card-row">
                        <label className="saved-card-radio-label">
                          <input
                            type="radio"
                            name="card_choice"
                            checked={selectedCardType === 'new'}
                            onChange={() => setSelectedCardType('new')}
                          />
                          <span>Add new card</span>
                        </label>
                      </div>
                    </div>

                    {/* Add New Card Form Fields (Matches Mockup) */}
                    {selectedCardType === 'new' && (
                      <div className="chk-form-grid">
                        <div className="chk-input-group">
                          <label className="chk-label">CARD NUMBER</label>
                          <div className="chk-input-wrap">
                            <input
                              type="text"
                              placeholder="2314 2334 5636 4522"
                              value={cardInfo.number}
                              onChange={(e) => handleCardInputChange('number', e.target.value)}
                              className={`chk-input ${errors.cardNo ? 'has-error' : ''}`}
                              maxLength="19"
                            />
                            <div className="chk-input-card-badge">
                              {getCardBrandBadge(cardInfo.number)}
                            </div>
                          </div>
                          {errors.cardNo && <span className="chk-error-text">{errors.cardNo}</span>}
                        </div>

                        <div className="chk-form-row">
                          <div className="chk-input-group">
                            <label className="chk-label">EXPIRATION DATE</label>
                            <input
                              type="text"
                              placeholder="Month  /  Year"
                              value={cardInfo.expiry}
                              onChange={(e) => handleCardInputChange('expiry', e.target.value)}
                              className={`chk-input ${errors.cardExp ? 'has-error' : ''}`}
                              maxLength="7"
                            />
                            {errors.cardExp && <span className="chk-error-text">{errors.cardExp}</span>}
                          </div>

                          <div className="chk-input-group">
                            <label className="chk-label">SECURITY CODE</label>
                            <input
                              type="password"
                              placeholder="CVC"
                              value={cardInfo.cvv}
                              onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                              className={`chk-input ${errors.cardCvv ? 'has-error' : ''}`}
                              maxLength="4"
                            />
                            <span className="chk-helper-note">The last three digits found on the back of your card.</span>
                            {errors.cardCvv && <span className="chk-error-text">{errors.cardCvv}</span>}
                          </div>
                        </div>

                        <div className="chk-input-group">
                          <label className="chk-label">NAME ON CARD</label>
                          <input
                            type="text"
                            placeholder="Card Holder Name"
                            value={cardInfo.name}
                            onChange={(e) => handleCardInputChange('name', e.target.value)}
                            className={`chk-input ${errors.cardName ? 'has-error' : ''}`}
                          />
                          {errors.cardName && <span className="chk-error-text">{errors.cardName}</span>}
                        </div>

                        <label className="chk-checkbox-label">
                          <input
                            type="checkbox"
                            checked={useSameAddress}
                            onChange={(e) => setUseSameAddress(e.target.checked)}
                          />
                          <span>Use same address as shipping</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Details for BUY WITH M-PESA ── */}
                {paymentMethod === 'mpesa' && (
                  <div className="payment-instruction-box animated-fade-in">
                    <p>Funds will be requested via STK Push directly to your Safaricom M-Pesa line on confirmation:</p>
                    <div className="chk-input-group">
                      <label className="chk-label">M-Pesa Number</label>
                      <input
                        type="tel"
                        placeholder="07XX XXX XXX or 2547XX XXX XXX"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        className={`chk-input ${errors.mpesa ? 'has-error' : ''}`}
                      />
                      {errors.mpesa && <span className="chk-error-text">{errors.mpesa}</span>}
                    </div>
                  </div>
                )}

                {/* ── Details for CASH ON DELIVERY ── */}
                {paymentMethod === 'cod' && (
                  <div className="payment-instruction-box animated-fade-in">
                    <p>Pay upon safe arrival of your highland coffee bags (Cash, M-Pesa or local debit):</p>
                    <label className="chk-checkbox-label">
                      <input
                        type="checkbox"
                        checked={codConfirmed}
                        onChange={(e) => setCodConfirmed(e.target.checked)}
                      />
                      <span>I authorize Rerendet to deliver my coffee order for payment on arrival.</span>
                    </label>
                    {errors.cod && <span className="chk-error-text">{errors.cod}</span>}
                  </div>
                )}

                <div className="checkout-step-actions">
                  <button
                    type="button"
                    className="btn-step-back"
                    onClick={() => setCurrentStep(1)}
                  >
                    ← Back to Shipping
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ══════ RIGHT COLUMN: ORDER SUMMARY (Pixel-Perfect from Mockup) ══════ */}
          <aside className="checkout-summary-column">
            <div className="order-summary-box">
              <h3 className="summary-title">Order Summary</h3>

              {/* Mini Cart Items Preview */}
              {cart.length > 0 && (
                <div className="summary-mini-items">
                  {cart.map((item, idx) => (
                    <div className="summary-mini-item" key={idx}>
                      <img
                        src={item.images?.[0]?.url || item.image || '/default-product.jpg'}
                        alt={item.name}
                        className="mini-item-img"
                      />
                      <div className="mini-item-info">
                        <p className="mini-item-name">{item.name}</p>
                        <p className="mini-item-meta">{item.size} • Qty {item.quantity}</p>
                      </div>
                      <span className="mini-item-price">KES {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Line Items matching mockup */}
              <div className="summary-line-items">
                <div className="summary-row">
                  <span>Items Total</span>
                  <span>KES {subtotal.toLocaleString()}</span>
                </div>

                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{calculatingShipping ? 'Calculating...' : `KES ${shippingCost.toLocaleString()}`}</span>
                </div>
                {deliveryEstimate && (
                  <div style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '-4px', marginBottom: '8px' }}>
                    <FaTruck /> {deliveryEstimate}
                  </div>
                )}

                {discount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount ({couponData?.code || 'Promo'})</span>
                    <span>-KES {discount.toLocaleString()}</span>
                  </div>
                )}

                {appliedStoreCredit > 0 && (
                  <div className="summary-row discount">
                    <span>Store Credit</span>
                    <span>-KES {appliedStoreCredit.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Order Total matching mockup */}
              <div className="summary-total-row">
                <span>Order Total</span>
                <span className="summary-total-amount">KES {total.toLocaleString()}</span>
              </div>

              {/* Primary CTA Button: PAYMENT DETAILS (or CONFIRM & PLACE ORDER) */}
              <button
                type="button"
                className="btn-checkout-primary"
                onClick={currentStep === 1 ? handleContinueToPayment : handlePlaceOrder}
                disabled={loading}
              >
                {loading ? (
                  <><FaSync className="logo-spin" /> Processing...</>
                ) : currentStep === 1 ? (
                  'PAYMENT DETAILS'
                ) : (
                  `CONFIRM & PLACE ORDER (KES ${total.toLocaleString()})`
                )}
              </button>

              {/* Accept cards list matching mockup */}
              <div className="accepted-cards-wrap">
                <div className="accepted-cards-label">Accept cards:</div>
                <div className="accepted-cards-icons">
                  <span className="card-pill-logo visa">VISA</span>
                  <span className="card-pill-logo mc">Mastercard</span>
                  <span className="card-pill-logo amex">AMEX</span>
                  <span className="card-pill-logo mpesa">M-PESA</span>
                </div>
              </div>

              {/* TLS Security Guarantee matching mockup */}
              <div className="tls-security-box">
                <FaLock className="tls-icon" />
                <p className="tls-text">
                  Our checkout is secure and uses TLS throughout the checkout to protect your details.
                </p>
              </div>

              {/* Store credit toggle if available */}
              {storeCreditAvailable > 0 && (
                <div className="store-credit-box" style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--chk-card-selected-bg)', border: '1px dashed var(--chk-border-focus)', borderRadius: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={applyStoreCredit}
                      onChange={(e) => setApplyStoreCredit(e.target.checked)}
                      style={{ accentColor: 'var(--chk-btn-bg)', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontWeight: '700', color: 'var(--chk-text-main)' }}>Apply Store Credit</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--chk-text-muted)' }}>Balance: KES {storeCreditAvailable.toLocaleString()}</span>
                    </div>
                  </label>
                </div>
              )}

              {/* Discount Codes matching mockup */}
              <div className="discount-codes-section">
                <div className="discount-codes-title">DISCOUNT CODES:</div>
                <div className="discount-input-row">
                  <input
                    type="text"
                    placeholder="Promo code here..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="discount-input"
                    disabled={!!couponData || validatingCoupon}
                  />
                  <button
                    type="button"
                    className="btn-discount-apply"
                    onClick={couponData ? () => { setCouponData(null); setCouponCode(''); } : handleValidateCoupon}
                    disabled={validatingCoupon}
                  >
                    {validatingCoupon ? '...' : couponData ? 'RESET' : 'APPLY'}
                  </button>
                </div>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default Checkout;

import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaLock, FaCreditCard, FaMoneyBillWave, FaPhone,
  FaTruck, FaUser, FaInfoCircle, FaShieldAlt,
  FaArrowRight, FaArrowLeft, FaMapMarkerAlt, FaEnvelope, FaExclamationCircle, FaPercent, FaSync, FaGlobe, FaCheckCircle,
  FaSearch, FaChevronDown, FaCheck, FaTimes, FaWhatsapp, FaCopy, FaClock
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
    isCustomer,
    isAdmin,
    publicSettings,
    logAbandonedCheckout,
    logout
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Step 1: SHIPPING | Step 2: PAYMENT | Step 3: REVIEW & CONFIRMATION
  const [currentStep, setCurrentStep] = useState(1);
  const [useSameAddress, setUseSameAddress] = useState(true);

  // Saved card detection (only if customer actually has card on file)
  const savedCard = useMemo(() => {
    const cardData = user?.wallet?.card || user?.card;
    if (!cardData) return null;
    const last4 = cardData.last4 || (cardData.numberMasked ? cardData.numberMasked.replace(/\s+/g, '').slice(-4) : null);
    if (!last4) return null;
    return {
      brand: cardData.brand || 'Visa',
      last4,
      holderName: cardData.holderName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''),
      expiryDate: cardData.expiryDate || ''
    };
  }, [user]);

  const hasSavedCard = Boolean(savedCard);
  const [selectedCardType, setSelectedCardType] = useState(() => (hasSavedCard ? 'saved' : 'new'));

  useEffect(() => {
    if (hasSavedCard) {
      setSelectedCardType('saved');
    } else {
      setSelectedCardType('new');
    }
  }, [hasSavedCard]);

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
  const [paymentMethod, setPaymentMethod] = useState('paybill'); // Pay via Paybill (guided on WhatsApp) is default
  const [createdPaybillOrder, setCreatedPaybillOrder] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportMpesaCode, setReportMpesaCode] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleReportPayment = async (e) => {
    e?.preventDefault();
    if (!createdPaybillOrder) return;
    setSubmittingReport(true);
    try {
      const orderId = createdPaybillOrder._id || createdPaybillOrder.orderNumber;
      const res = await fetch(`/api/orders/${orderId}/report-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          mpesaCode: reportMpesaCode,
          customerPhone: shippingInfo.phone,
          notes: reportNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setReportSubmitted(true);
        showNotification?.(data.message || 'Payment reported successfully! Awaiting verification.', 'success');
      } else {
        showNotification?.(data.message || 'Failed to submit payment report', 'error');
      }
    } catch {
      showNotification?.('Network error submitting payment report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const copyText = (text, field) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const selectedAddressIdState = useState(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const def = user.addresses.find(a => a.isDefault);
      return def ? def._id : user.addresses[0]._id;
    }
    return null;
  });
  const [selectedAddressId, setSelectedAddressId] = selectedAddressIdState;

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

  // Keep payment method within allowed options
  useEffect(() => {
    const isCodActive = publicSettings?.payment?.paymentMethods?.cashOnDelivery === true;
    if (paymentMethod === 'cod' && !isCodActive) {
      setPaymentMethod('paybill');
    }
  }, [publicSettings?.payment?.paymentMethods?.cashOnDelivery, paymentMethod]);

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

  const paybillNumber = publicSettings?.payment?.paybillNumber || import.meta.env.VITE_PAYBILL_NUMBER || '516600';
  const paybillAccount = publicSettings?.payment?.paybillAccount || import.meta.env.VITE_PAYBILL_ACCOUNT || '934558';
  const whatsappNumber = publicSettings?.payment?.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '254705684984';
  const expiryHours = publicSettings?.payment?.paybillExpiryHours || 24;

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

  // Canonical country name matched against allCountries (case-insensitive & code-aware)
  const selectedCountryName = useMemo(() => {
    const raw = (shippingInfo.country || 'Kenya').trim();
    const found = allCountries.find(c => {
      const name = typeof c === 'string' ? c : c.name;
      const code = typeof c === 'object' ? c.code : null;
      return name.toLowerCase() === raw.toLowerCase() || (code && code.toLowerCase() === raw.toLowerCase());
    });
    if (found) {
      return typeof found === 'string' ? found : found.name;
    }
    return raw || 'Kenya';
  }, [shippingInfo.country, allCountries]);

  // Keep shippingInfo.country strictly synchronized with canonical country name
  useEffect(() => {
    if (selectedCountryName && shippingInfo.country !== selectedCountryName) {
      setShippingInfo(prev => ({ ...prev, country: selectedCountryName }));
    }
  }, [selectedCountryName, shippingInfo.country]);

  // Searchable Country Combobox (Dropdown shows ALL countries with live inline search)
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchText, setCountrySearchText] = useState('');
  const [isSearchingCountry, setIsSearchingCountry] = useState(false);
  const countryDropdownRef = useRef(null);
  const countryInputRef = useRef(null);

  const selectedCountryObj = useMemo(() => {
    return allCountries.find(c => {
      const name = typeof c === 'string' ? c : c.name;
      return name.toLowerCase() === selectedCountryName.toLowerCase();
    }) || { name: selectedCountryName, flag: getFlag(selectedCountryName), dialCode: getDialCode(selectedCountryName) };
  }, [allCountries, selectedCountryName]);

  const handleOpenCountryDropdown = () => {
    setIsCountryDropdownOpen(true);
    setIsSearchingCountry(true);
    setCountrySearchText('');
  };

  const handleCloseCountryDropdown = () => {
    setIsCountryDropdownOpen(false);
    setIsSearchingCountry(false);
    setCountrySearchText('');
  };

  // Close dropdown on click outside & reset unselected input text
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        handleCloseCountryDropdown();
      }
    };
    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  // Filter countries: when countrySearchText is empty, show ALL countries!
  const filteredCountries = useMemo(() => {
    if (!countrySearchText.trim()) return allCountries;
    const q = countrySearchText.toLowerCase().trim();
    return allCountries.filter(c => {
      const name = (typeof c === 'string' ? c : c.name || '').toLowerCase();
      const code = (typeof c === 'object' ? c.code || '' : '').toLowerCase();
      const dial = (typeof c === 'object' ? c.dialCode || '' : '').toLowerCase();
      return name.includes(q) || code.includes(q) || dial.includes(q);
    });
  }, [allCountries, countrySearchText]);

  const handleSelectCountry = (countryName) => {
    handleInputChange('country', countryName);
    handleCloseCountryDropdown();
  };

  // Searchable County Combobox state (Dropdown shows ALL 47 counties with live search)
  const [isCountyDropdownOpen, setIsCountyDropdownOpen] = useState(false);
  const [countySearchText, setCountySearchText] = useState('');
  const [isSearchingCounty, setIsSearchingCounty] = useState(false);
  const countyDropdownRef = useRef(null);
  const countyInputRef = useRef(null);

  const handleOpenCountyDropdown = () => {
    setIsCountyDropdownOpen(true);
    setIsSearchingCounty(true);
    setCountySearchText('');
  };

  const handleCloseCountyDropdown = () => {
    setIsCountyDropdownOpen(false);
    setIsSearchingCounty(false);
    setCountySearchText('');
  };

  // Close county dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countyDropdownRef.current && !countyDropdownRef.current.contains(e.target)) {
        handleCloseCountyDropdown();
      }
    };
    if (isCountyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCountyDropdownOpen]);

  // List of available counties/subdivisions for current country
  const currentCountyList = useMemo(() => {
    const isKenya = (shippingInfo.country || 'Kenya').toLowerCase() === 'kenya';
    return isKenya ? KENYAN_COUNTIES : subdivisions;
  }, [shippingInfo.country, subdivisions]);

  // Filtered counties based on user search
  const filteredCounties = useMemo(() => {
    if (!countySearchText.trim()) return currentCountyList;
    const q = countySearchText.toLowerCase().trim();
    return currentCountyList.filter(c => c.toLowerCase().includes(q));
  }, [currentCountyList, countySearchText]);

  const handleSelectCounty = (countyName) => {
    handleInputChange('county', countyName);
    handleCloseCountyDropdown();
  };

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

  // Derived values for order summary display (handles both active cart and post-checkout createdPaybillOrder)
  const summaryItems = createdPaybillOrder?.items && createdPaybillOrder.items.length > 0
    ? createdPaybillOrder.items
    : cart;

  const displaySubtotal = createdPaybillOrder
    ? (createdPaybillOrder.subtotal ?? (createdPaybillOrder.items?.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)), 0) || 0))
    : subtotal;

  const displayShipping = createdPaybillOrder
    ? (createdPaybillOrder.shippingCost ?? 0)
    : shippingCost;

  const displayDiscount = createdPaybillOrder
    ? (createdPaybillOrder.discount ?? 0)
    : discount;

  const displayStoreCredit = createdPaybillOrder
    ? (createdPaybillOrder.storeCreditApplied ?? createdPaybillOrder.appliedStoreCredit ?? 0)
    : appliedStoreCredit;

  const displayTotal = createdPaybillOrder
    ? (createdPaybillOrder.totalAmount ?? createdPaybillOrder.total ?? total)
    : total;

  // Per-checkout idempotency key to prevent duplicate charges
  const idempotencyKeyRef = useRef(null);
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = `IDEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Allow authenticated users to proceed with checkout
  useEffect(() => {
    if (!authLoading && !user) {
      showNotification('Please log in to proceed with checkout', 'info');
      sessionStorage.setItem('authRedirect', '/checkout');
      navigate('/login?redirect=checkout');
    }
  }, [authLoading, user, navigate, showNotification]);

  // Sync user profile shipping details ONLY for customers
  useEffect(() => {
    if (isCustomer && user) {
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
    if (!clean) return <FaCreditCard className="badge-brand-icon" />;
    if (/^4/.test(clean)) return <span className="badge-brand visa">VISA</span>;
    if (/^5[1-5]/.test(clean)) return <span className="badge-brand mc">Mastercard</span>;
    if (/^3[47]/.test(clean)) return <span className="badge-brand amex">AMEX</span>;
    return <span className="badge-brand generic">CARD</span>;
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
      newErrors.phone = 'Valid phone number is required';
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
    if (paymentMethod === 'cod' && !codConfirmed) {
      newErrors.cod = 'Please confirm authorization for Cash on Delivery';
    }
    return newErrors;
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
      showNotification('Cash on delivery is limited to KSh 20,000. Please select Paybill.', 'error');
      return false;
    }

    await processOrder();
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
            : (user?.phone || '+254 700 000 000'),
          city: shippingInfo.country === 'Kenya' ? shippingInfo.county : shippingInfo.city
        },
        paymentMethod,
        items: cart.map(item => ({
          product: item.productId || item._id || item.id,
          name: item.name,
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price || 0),
          quantity: Math.max(1, parseInt(item.quantity) || 1),
          size: item.size || 'Standard',
          image: item.images?.[0]?.url || item.image || '/default-product.jpg'
        })),
        subtotal,
        shippingCost,
        totalAmount: total,
        useStoreCredit: !!appliedStoreCredit || applyStoreCredit,
        appliedStoreCredit,
        couponCode: couponData?.code,
        isSubscription,
        subscriptionFrequency: isSubscription ? subscriptionFrequency : undefined,
        idempotencyKey: idempotencyKeyRef.current,
        paymentData: paymentData || null
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
        if (paymentMethod === 'paybill') {
          setCreatedPaybillOrder(result.data);
          setCurrentStep(3);
          showNotification('Order placed! Complete payment via M-Pesa Paybill below.', 'success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showNotification('Order success! Asante sana.', 'success');
          navigate(`/order-confirmation/${result.data._id || result.data.id}`);
        }
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
              className={`stepper-step ${createdPaybillOrder || currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : ''}`}
              onClick={() => !createdPaybillOrder && currentStep > 1 && setCurrentStep(1)}
              title={createdPaybillOrder ? undefined : "Edit Delivery Protocol"}
              style={createdPaybillOrder ? { cursor: 'default' } : undefined}
            >
              <div className="stepper-circle">
                {createdPaybillOrder || currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="stepper-label">SHIPPING</span>
            </div>

            <div className={`stepper-line ${createdPaybillOrder || currentStep >= 2 ? 'active' : ''}`} />

            {/* Step 2: PAYMENT */}
            <div
              className={`stepper-step ${createdPaybillOrder || currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : ''}`}
              onClick={() => {
                if (!createdPaybillOrder && currentStep === 1) handleContinueToPayment();
              }}
              style={createdPaybillOrder ? { cursor: 'default' } : undefined}
            >
              <div className="stepper-circle">
                {createdPaybillOrder || currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="stepper-label">PAYMENT</span>
            </div>

            <div className={`stepper-line ${createdPaybillOrder || currentStep >= 3 ? 'active' : ''}`} />

            {/* Step 3: REVIEW & CONFIRMATION */}
            <div className={`stepper-step ${createdPaybillOrder ? 'completed active' : currentStep === 3 ? 'active' : 'disabled'}`}>
              <div className="stepper-circle">{createdPaybillOrder ? '✓' : '3'}</div>
              <span className="stepper-label">{createdPaybillOrder ? 'AWAITING PAYMENT' : 'CONFIRMATION'}</span>
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
            {!createdPaybillOrder && currentStep === 1 && (
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

                  <div className="chk-input-group" ref={countryDropdownRef} style={{ position: 'relative' }}>
                    <label className="chk-label" htmlFor="checkout-country-search-input">Country / Territory *</label>

                    {/* Integrated Country Search & Select Combobox */}
                    <div className={`chk-country-input-wrap ${isCountryDropdownOpen ? 'focused' : ''}`}>
                      <span className="chk-country-input-flag" aria-hidden="true">
                        {selectedCountryObj?.flag || getFlag(selectedCountryName)}
                      </span>
                      <input
                        id="checkout-country-search-input"
                        ref={countryInputRef}
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isCountryDropdownOpen}
                        autoComplete="off"
                        value={isSearchingCountry ? countrySearchText : `${selectedCountryName}${selectedCountryObj?.dialCode ? ` (${selectedCountryObj.dialCode})` : ''}`}
                        placeholder={isSearchingCountry ? "Search country, code, or dial code..." : "Select Country / Territory..."}
                        onFocus={handleOpenCountryDropdown}
                        onClick={() => {
                          if (!isCountryDropdownOpen) handleOpenCountryDropdown();
                        }}
                        onChange={(e) => {
                          if (!isSearchingCountry) setIsSearchingCountry(true);
                          setCountrySearchText(e.target.value);
                          if (!isCountryDropdownOpen) setIsCountryDropdownOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            handleCloseCountryDropdown();
                            countryInputRef.current?.blur();
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredCountries.length > 0) {
                              const first = filteredCountries[0];
                              handleSelectCountry(typeof first === 'string' ? first : first.name);
                              countryInputRef.current?.blur();
                            }
                          } else if (e.key === 'ArrowDown') {
                            if (!isCountryDropdownOpen) handleOpenCountryDropdown();
                          }
                        }}
                        className="chk-input chk-country-combobox-input"
                      />
                      <div className="chk-country-input-actions">
                        {isSearchingCountry && countrySearchText && (
                          <button
                            type="button"
                            className="chk-country-clear-btn"
                            onClick={() => {
                              setCountrySearchText('');
                              countryInputRef.current?.focus();
                            }}
                            aria-label="Clear country search"
                          >
                            <FaTimes />
                          </button>
                        )}
                        <button
                          type="button"
                          className="chk-country-toggle-btn"
                          onClick={() => {
                            if (isCountryDropdownOpen) {
                              handleCloseCountryDropdown();
                            } else {
                              handleOpenCountryDropdown();
                              countryInputRef.current?.focus();
                            }
                          }}
                          tabIndex={-1}
                          aria-label="Toggle country list"
                        >
                          <FaChevronDown className={`chk-country-trigger-arrow ${isCountryDropdownOpen ? 'rotated' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Popover List Showing All Countries (Filtered live as user types) */}
                    {isCountryDropdownOpen && (
                      <div className="chk-country-dropdown-popover">
                        <div className="chk-country-popover-header">
                          <span>{countrySearchText ? `${filteredCountries.length} matching countries` : `All Supported Countries & Territories (${allCountries.length})`}</span>
                        </div>
                        <div className="chk-country-options-list" role="listbox">
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((c, idx) => {
                              const cName = typeof c === 'string' ? c : c.name;
                              const cCode = typeof c === 'object' ? (c.code || c.name) : c;
                              const cFlag = typeof c === 'object' && c.flag ? c.flag : getFlag(cName);
                              const cDial = typeof c === 'object' && c.dialCode ? c.dialCode : '';
                              const isSelected = cName.toLowerCase() === selectedCountryName.toLowerCase();

                              return (
                                <div
                                  key={`${cCode}-${idx}`}
                                  role="option"
                                  aria-selected={isSelected}
                                  className={`chk-country-option-item ${isSelected ? 'selected' : ''}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectCountry(cName);
                                  }}
                                >
                                  <div className="chk-country-option-info">
                                    <span className="chk-country-option-flag">{cFlag}</span>
                                    <span className="chk-country-option-name">{cName}</span>
                                    {cDial && <span className="chk-country-option-dial">({cDial})</span>}
                                  </div>
                                  {isSelected && <FaCheck className="chk-country-option-check" />}
                                </div>
                              );
                            })
                          ) : (
                            <div className="chk-country-options-empty">
                              No countries found matching "{countrySearchText}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {shippingInfo.country?.toLowerCase() === 'kenya' ? (
                    <>
                      <div className="chk-form-row">
                        <div className="chk-input-group" ref={countyDropdownRef} style={{ position: 'relative' }}>
                          <label className="chk-label" htmlFor="checkout-county-search-input">County *</label>

                          {/* Integrated County Search & Select Combobox */}
                          <div className={`chk-country-input-wrap ${isCountyDropdownOpen ? 'focused' : ''} ${errors.county ? 'has-error' : ''}`}>
                            <span className="chk-country-input-flag" aria-hidden="true">
                              <FaMapMarkerAlt style={{ color: 'var(--chk-gold)', fontSize: '0.95rem' }} />
                            </span>
                            <input
                              id="checkout-county-search-input"
                              ref={countyInputRef}
                              type="text"
                              role="combobox"
                              aria-autocomplete="list"
                              aria-expanded={isCountyDropdownOpen}
                              autoComplete="off"
                              value={isSearchingCounty ? countySearchText : (shippingInfo.county || '')}
                              placeholder={isSearchingCounty ? "Type to search county (e.g. Nairobi, Nakuru, Bomet)..." : "Select County (All 47 Counties)..."}
                              onFocus={handleOpenCountyDropdown}
                              onClick={() => {
                                if (!isCountyDropdownOpen) handleOpenCountyDropdown();
                              }}
                              onChange={(e) => {
                                if (!isSearchingCounty) setIsSearchingCounty(true);
                                setCountySearchText(e.target.value);
                                if (!isCountyDropdownOpen) setIsCountyDropdownOpen(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  handleCloseCountyDropdown();
                                  countyInputRef.current?.blur();
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (filteredCounties.length > 0) {
                                    handleSelectCounty(filteredCounties[0]);
                                    countyInputRef.current?.blur();
                                  }
                                } else if (e.key === 'ArrowDown') {
                                  if (!isCountyDropdownOpen) handleOpenCountyDropdown();
                                }
                              }}
                              className={`chk-input chk-country-combobox-input ${errors.county ? 'has-error' : ''}`}
                            />
                            <div className="chk-country-input-actions">
                              {isSearchingCounty && countySearchText && (
                                <button
                                  type="button"
                                  className="chk-country-clear-btn"
                                  onClick={() => {
                                    setCountySearchText('');
                                    countyInputRef.current?.focus();
                                  }}
                                  aria-label="Clear county search"
                                >
                                  <FaTimes />
                                </button>
                              )}
                              <button
                                type="button"
                                className="chk-country-toggle-btn"
                                onClick={() => {
                                  if (isCountyDropdownOpen) {
                                    handleCloseCountyDropdown();
                                  } else {
                                    handleOpenCountyDropdown();
                                    countyInputRef.current?.focus();
                                  }
                                }}
                                tabIndex={-1}
                                aria-label="Toggle county list"
                              >
                                <FaChevronDown className={`chk-country-trigger-arrow ${isCountyDropdownOpen ? 'rotated' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {errors.county && <span className="chk-error-text">{errors.county}</span>}

                          {/* Popover List Showing All Counties */}
                          {isCountyDropdownOpen && (
                            <div className="chk-country-dropdown-popover">
                              <div className="chk-country-popover-header">
                                <span>{countySearchText ? `${filteredCounties.length} matching counties` : `All 47 Kenyan Counties (${currentCountyList.length})`}</span>
                              </div>
                              <div className="chk-country-options-list" role="listbox">
                                {filteredCounties.length > 0 ? (
                                  filteredCounties.map((cName, idx) => {
                                    const isSelected = cName.toLowerCase() === (shippingInfo.county || '').toLowerCase();
                                    return (
                                      <div
                                        key={`county-${cName}-${idx}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`chk-country-option-item ${isSelected ? 'selected' : ''}`}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleSelectCounty(cName);
                                        }}
                                      >
                                        <div className="chk-country-option-info">
                                          <FaMapMarkerAlt style={{ color: isSelected ? 'var(--chk-gold)' : 'var(--chk-text-muted)', fontSize: '0.85rem' }} />
                                          <span className="chk-country-option-name">{cName}</span>
                                        </div>
                                        {isSelected && <FaCheck className="chk-country-option-check" />}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="chk-country-options-empty">
                                    No counties found matching "{countySearchText}"
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
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
                        <label className="chk-label" style={{ margin: 0 }}>Phone Number *</label>
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

            {/* POST-ORDER: PAYBILL INSTRUCTIONS SCREEN */}
            {createdPaybillOrder && (
              <div className="paybill-instructions-screen animated-fade-in">
                <div className="paybill-success-badge-icon">
                  <FaCheck />
                </div>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FEF3C7', color: '#92400E', padding: '6px 14px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, marginBottom: '14px' }}>
                  <FaClock /> {reportSubmitted ? 'Payment Reported — Awaiting Verification' : 'Awaiting Payment'}
                </div>

                <h2 className="paybill-screen-title">Your order is reserved. One step left.</h2>
                <p className="paybill-screen-subtitle">
                  Complete your M-Pesa payment using the details below. Once our team verifies your payment, we'll confirm your order and begin preparing your coffee.
                </p>

                {/* Prominent Reference Pill */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 18px', borderRadius: '12px', textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Order Number</span>
                    <strong style={{ fontSize: '16px', color: '#0F172A', fontFamily: 'monospace' }}>#{createdPaybillOrder.orderNumber}</strong>
                  </div>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 18px', borderRadius: '12px', textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Due</span>
                    <strong style={{ fontSize: '16px', color: '#EA580C', fontWeight: 800 }}>KES {displayTotal.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="paybill-steps-card">
                  <div className="paybill-steps-heading">
                    <FaCheckCircle style={{ color: '#10B981', fontSize: '16px' }} />
                    <span>Simple Lipa na M-Pesa Steps</span>
                  </div>
                  <div className="paybill-steps-list">
                    <div className="paybill-step-item">
                      <span className="paybill-step-num">1</span>
                      <div>Open <strong>M-Pesa</strong> on your phone &rarr; Select <strong>Lipa na M-Pesa</strong> &rarr; <strong>Paybill</strong></div>
                    </div>
                    <div className="paybill-step-item">
                      <span className="paybill-step-num">2</span>
                      <div>
                        Business Number (Paybill):
                        <span className="paybill-step-val-badge">
                          {paybillNumber}
                          <button
                            type="button"
                            className="paybill-copy-btn"
                            onClick={() => copyText(paybillNumber, 'paybill')}
                            title="Copy Paybill Number"
                          >
                            {copiedField === 'paybill' ? <FaCheck style={{ color: '#10B981' }} /> : <FaCopy />}
                          </button>
                        </span>
                      </div>
                    </div>
                    <div className="paybill-step-item">
                      <span className="paybill-step-num">3</span>
                      <div>
                        Account Number:
                        <span className="paybill-step-val-badge">
                          {paybillAccount}
                          <button
                            type="button"
                            className="paybill-copy-btn"
                            onClick={() => copyText(paybillAccount, 'paybillAcc')}
                            title="Copy Account Number"
                          >
                            {copiedField === 'paybillAcc' ? <FaCheck style={{ color: '#10B981' }} /> : <FaCopy />}
                          </button>
                        </span>
                        <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '6px' }}>
                          Reference / Order ID: <strong style={{ fontFamily: 'monospace', color: '#1E293B' }}>{createdPaybillOrder.orderNumber}</strong>
                          <button
                            type="button"
                            className="paybill-copy-btn"
                            style={{ marginLeft: '6px', padding: '2px 6px', fontSize: '0.75rem' }}
                            onClick={() => copyText(createdPaybillOrder.orderNumber, 'orderNum')}
                            title="Copy Order Number"
                          >
                            {copiedField === 'orderNum' ? <FaCheck style={{ color: '#10B981', fontSize: '10px' }} /> : <FaCopy style={{ fontSize: '10px' }} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="paybill-step-item">
                      <span className="paybill-step-num">4</span>
                      <div>
                        Exact Amount:
                        <span className="paybill-amount-badge">
                          KES {displayTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="paybill-step-item">
                      <span className="paybill-step-num">5</span>
                      <div>Enter your <strong>M-Pesa PIN</strong> and press Send to complete payment</div>
                    </div>
                  </div>
                </div>

                {/* Payment Reporting Section */}
                {!reportSubmitted ? (
                  <div style={{ margin: '20px 0', padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0F172A', fontWeight: 700 }}>Already made the payment?</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Submit your M-Pesa reference code to notify our finance team for fast verification.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReportForm(prev => !prev)}
                        style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                      >
                        {showReportForm ? 'Hide Form' : "I've made the payment"}
                      </button>
                    </div>

                    {showReportForm && (
                      <form onSubmit={handleReportPayment} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            M-Pesa Confirmation Code (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. QKH7123456"
                            value={reportMpesaCode}
                            onChange={e => setReportMpesaCode(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontFamily: 'monospace' }}
                          />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Notes / Sender Details (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sent from Safaricom number 07..."
                            value={reportNotes}
                            onChange={e => setReportNotes(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button
                            type="submit"
                            disabled={submittingReport}
                            style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}
                          >
                            {submittingReport ? 'Submitting Report...' : 'Submit Payment Report'}
                          </button>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            🔒 Payments are verified against bank records before orders are fulfilled.
                          </span>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div style={{ margin: '20px 0', padding: '16px 20px', background: '#F0FDF4', borderRadius: '14px', border: '1px solid #BBF7D0', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaCheckCircle style={{ color: '#16A34A', fontSize: '20px' }} />
                      <div>
                        <strong style={{ color: '#166534', fontSize: '14px', display: 'block' }}>Payment Reported — Awaiting Verification</strong>
                        <span style={{ color: '#334155', fontSize: '12.5px' }}>
                          Our team has received your notification ({reportMpesaCode || 'M-Pesa transfer'}). We are checking this against our bank statement and will issue your official receipt promptly.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp Support Button (Optional) */}
                <div style={{ margin: '14px 0' }}>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                      `Hello Rerendet Coffee, I have placed Order #${createdPaybillOrder.orderNumber} for KES ${displayTotal.toLocaleString()}. Customer: ${createdPaybillOrder.shippingAddress?.firstName || user?.firstName || 'Customer'}. Please guide me on payment verification.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paybill-whatsapp-btn"
                  >
                    <FaWhatsapp style={{ fontSize: '18px' }} /> WhatsApp Support Concierge (Optional)
                  </a>
                </div>

                <div className="paybill-notice-box">
                  ⏳ <strong>Reservation Notice:</strong> Your fresh highland beans are reserved for <strong>{expiryHours} hours</strong>. Unpaid orders are cancelled automatically and stock is returned to our inventory if payment is not received.
                </div>

                <div className="paybill-actions-row">
                  <Link to={`/track-order/${createdPaybillOrder._id || createdPaybillOrder.orderNumber}`} className="paybill-track-btn">
                    Track Order &amp; View Receipt &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* STEP 2: PAYMENT OPTIONS */}
            {!createdPaybillOrder && currentStep === 2 && (
              <div className="checkout-step-content animated-fade-in">
                <h2 className="checkout-section-title">Payment options</h2>

                {/* 2-Option Card Grid */}
                <div className="payment-options-cards-grid">
                  {/* Option 1: Pay via Paybill (guided on WhatsApp) */}
                  <div
                    className={`payment-method-box ${paymentMethod === 'paybill' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('paybill')}
                  >
                    {paymentMethod === 'paybill' && <div className="method-check-badge">✓</div>}
                    <FaWhatsapp className="method-icon" style={{ color: '#25D366' }} />
                    <span className="method-name">PAY VIA PAYBILL (GUIDED ON WHATSAPP)</span>
                  </div>

                  {/* Option 2: Cash on Delivery */}
                  {publicSettings?.payment?.paymentMethods?.cashOnDelivery === true && (
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

                {/* ── Details for PAY VIA PAYBILL ── */}
                {paymentMethod === 'paybill' && (
                  <div className="payment-instruction-box animated-fade-in" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', marginTop: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#0f172a', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ☕ Easy M-Pesa Paybill Payment
                    </p>
                    <p style={{ margin: '0 0 12px', color: '#475569', fontSize: '13.5px', lineHeight: 1.6 }}>
                      Your fresh coffee is safely reserved for you for <strong>24 hours</strong>. On the next screen, you’ll get our Paybill details and your Order Number to pay directly from your M-Pesa menu or app. We’ll confirm your payment and issue an official receipt right away!
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '9999px', fontSize: '12.5px', color: '#065f46', fontWeight: 600 }}>
                      <span>🔒 Safe &amp; verified · Instant digital receipt &amp; fast dispatch</span>
                    </div>
                  </div>
                )}

                {/* ── Details for CASH ON DELIVERY ── */}
                {paymentMethod === 'cod' && (
                  <div className="payment-instruction-box animated-fade-in" style={{ marginTop: '16px' }}>
                    <p>Pay upon safe arrival of your highland coffee bags (Cash, M-Pesa or local debit):</p>
                    <label className="chk-checkbox-label">
                      <input
                        type="checkbox"
                        checked={codConfirmed}
                        onChange={(e) => setCodConfirmed(e.target.checked)}
                      />
                      <span>I authorize Rerendet to deliver my coffee order for payment on arrival (orders under KES 20,000).</span>
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
              <h3 className="summary-title">{createdPaybillOrder ? 'Order Summary' : 'Order Summary'}</h3>

              {/* Mini Cart Items Preview */}
              {summaryItems.length > 0 && (
                <div className="summary-mini-items">
                  {summaryItems.map((item, idx) => (
                    <div className="summary-mini-item" key={idx}>
                      <img
                        src={item.image || item.images?.[0]?.url || item.product?.images?.[0]?.url || '/default-product.jpg'}
                        alt={item.name || item.product?.name || 'Coffee item'}
                        className="mini-item-img"
                      />
                      <div className="mini-item-info">
                        <p className="mini-item-name">{item.name || item.product?.name || 'Coffee'}</p>
                        <p className="mini-item-meta">{item.size || 'Standard'} • Qty {item.quantity || 1}</p>
                      </div>
                      <span className="mini-item-price">KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Line Items matching mockup */}
              <div className="summary-line-items">
                <div className="summary-row">
                  <span>Items Total</span>
                  <span>KES {displaySubtotal.toLocaleString()}</span>
                </div>

                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{calculatingShipping && !createdPaybillOrder ? 'Calculating...' : `KES ${displayShipping.toLocaleString()}`}</span>
                </div>
                {!createdPaybillOrder && deliveryEstimate && (
                  <div style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '-4px', marginBottom: '8px' }}>
                    <FaTruck /> {deliveryEstimate}
                  </div>
                )}

                {displayDiscount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount {createdPaybillOrder?.couponCode || couponData?.code ? `(${createdPaybillOrder?.couponCode || couponData?.code})` : ''}</span>
                    <span>-KES {displayDiscount.toLocaleString()}</span>
                  </div>
                )}

                {displayStoreCredit > 0 && (
                  <div className="summary-row discount">
                    <span>Store Credit</span>
                    <span>-KES {displayStoreCredit.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Order Total matching mockup */}
              <div className="summary-total-row">
                <span>{createdPaybillOrder ? 'Total Due' : 'Order Total'}</span>
                <span className="summary-total-amount">KES {displayTotal.toLocaleString()}</span>
              </div>

              {!createdPaybillOrder ? (
                <>
                  {/* Primary CTA Button: PAYMENT DETAILS (or PLACE ORDER) */}
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
                      `PLACE ORDER (KES ${total.toLocaleString()})`
                    )}
                  </button>

                  {/* Accepted payment methods */}
                  <div className="accepted-cards-wrap">
                    <div className="accepted-cards-label">Accepted payment:</div>
                    <div className="accepted-cards-icons">
                      {publicSettings?.payment?.paymentMethods?.mpesa !== false && (
                        <span className="card-pill-logo mpesa">M-PESA PAYBILL</span>
                      )}
                      {publicSettings?.payment?.paymentMethods?.cashOnDelivery === true && (
                        <span className="card-pill-logo generic">CASH ON DELIVERY</span>
                      )}
                      {publicSettings?.payment?.paymentMethods?.card === true && (
                        <span className="card-pill-logo card">CARD (ONLINE)</span>
                      )}
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
                </>
              ) : (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'left' }}>
                  {createdPaybillOrder.shippingAddress && (
                    <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '14px' }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                        📦 Delivery Address:
                      </strong>
                      <div>
                        {createdPaybillOrder.shippingAddress.firstName} {createdPaybillOrder.shippingAddress.lastName}
                      </div>
                      <div>{createdPaybillOrder.shippingAddress.address}</div>
                      <div>
                        {createdPaybillOrder.shippingAddress.town ? `${createdPaybillOrder.shippingAddress.town}, ` : ''}
                        {createdPaybillOrder.shippingAddress.county || createdPaybillOrder.shippingAddress.city || ''}
                      </div>
                      {createdPaybillOrder.shippingAddress.phone && (
                        <div style={{ color: '#0f172a', fontWeight: 600, marginTop: '2px' }}>
                          📞 {createdPaybillOrder.shippingAddress.phone}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', fontSize: '0.78rem', color: '#475569' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                      ⚡ Instant Verification
                    </span>
                    Once you pay via Paybill, submit your M-Pesa reference code on the left for priority verification.
                  </div>
                </div>
              )}

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default Checkout;

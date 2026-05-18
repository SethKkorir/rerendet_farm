import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaCreditCard, FaMobileAlt, FaPlus, FaEye, FaEyeSlash,
    FaLock, FaTimes, FaShieldAlt, FaCheckCircle, FaTrash, FaChevronRight
} from 'react-icons/fa';

const PasswordPromptModal = ({ isOpen, onClose, onVerified }) => {
    const [password, setPassword] = useState('');
    const { confirmPassword } = useContext(AppContext);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsVerifying(true);
        const success = await confirmPassword(password);
        setIsVerifying(false);
        if (success) {
            onVerified();
            setPassword('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="security-prompt-overlay" onClick={onClose}>
            <motion.div
                className="security-prompt-card"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="prompt-header">
                    <div className="icon-badge">
                        <FaLock />
                    </div>
                    <h3>Verify Identity</h3>
                    <p>Enter your password to access sensitive payment details.</p>
                </div>
                <form onSubmit={handleVerify}>
                    <div className="form-group-modern">
                        <input
                            type="password"
                            placeholder="Account Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="prompt-actions">
                        <button type="button" className="prompt-btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="prompt-btn-verify" disabled={isVerifying}>
                            {isVerifying ? 'Verifying...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const WalletTab = () => {
    const { user, updateUserProfile, loading, showNotification } = useContext(AppContext);

    const [isEditingMpesa, setIsEditingMpesa] = useState(false);
    const [isEditingCard, setIsEditingCard] = useState(false);

    const [unmaskedFields, setUnmaskedFields] = useState({
        mpesa: false,
        card: false
    });

    const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { type: 'unmask'|'edit', field: 'mpesa'|'card' }

    // Form States
    const [mpesaPhone, setMpesaPhone] = useState(user?.wallet?.mpesaPhone || '');
    const [cardData, setCardData] = useState({
        holderName: user?.wallet?.card?.holderName || '',
        cardNumber: '', // Not stored in raw form
        expiryDate: user?.wallet?.card?.expiryDate || '',
        brand: user?.wallet?.card?.brand || 'visa'
    });

    // Sync state with user data
    useEffect(() => {
        if (user?.wallet) {
            setMpesaPhone(user.wallet.mpesaPhone || '');
            setCardData(prev => ({
                ...prev,
                holderName: user.wallet.card?.holderName || '',
                expiryDate: user.wallet.card?.expiryDate || '',
                brand: user.wallet.card?.brand || 'visa'
            }));
        }
    }, [user]);

    const maskPhone = (phone) => {
        if (!phone) return 'Not linked';
        if (unmaskedFields.mpesa) return phone;
        // e.g. 0712 345 678 -> 0712 ••• 678
        return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3');
    };

    const maskCard = (numberMasked) => {
        if (!numberMasked) return 'No card saved';
        if (unmaskedFields.card) return '•••• •••• •••• ' + numberMasked.slice(-4); // In a real app we'd have full num if unmasked
        return numberMasked;
    };

    const triggerSecurity = (type, field) => {
        if (unmaskedFields[field] && type === 'unmask') {
            setUnmaskedFields(prev => ({ ...prev, [field]: false }));
            return;
        }
        setPendingAction({ type, field });
        setShowSecurityPrompt(true);
    };

    const handleVerified = () => {
        setShowSecurityPrompt(false);
        if (pendingAction.type === 'unmask') {
            setUnmaskedFields(prev => ({ ...prev, [pendingAction.field]: true }));
        } else if (pendingAction.type === 'edit') {
            if (pendingAction.field === 'mpesa') setIsEditingMpesa(true);
            if (pendingAction.field === 'card') setIsEditingCard(true);
        }
        setPendingAction(null);
    };

    const handleMpesaSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUserProfile({
                wallet: { ...user.wallet, mpesaPhone }
            });
            showNotification('M-Pesa number updated', 'success');
            setIsEditingMpesa(false);
            setUnmaskedFields(p => ({ ...p, mpesa: false }));
        } catch (error) {
            showNotification('Update failed', 'error');
        }
    };

    const handleCardSubmit = async (e) => {
        e.preventDefault();

        const digitsOnly = cardData.cardNumber.replace(/\s/g, '');
        if (digitsOnly.length !== 16) {
            showNotification('Please enter a valid 16-digit card number', 'error');
            return;
        }

        try {
            // Mask the number before saving
            const masked = '•••• •••• •••• ' + digitsOnly.slice(-4);
            await updateUserProfile({
                wallet: {
                    ...user.wallet,
                    card: {
                        holderName: cardData.holderName,
                        numberMasked: masked,
                        expiryDate: cardData.expiryDate,
                        brand: cardData.brand
                    }
                }
            });
            showNotification('Card details saved', 'success');
            setIsEditingCard(false);
            setUnmaskedFields(p => ({ ...p, card: false }));
        } catch (error) {
            showNotification('Failed to save card', 'error');
        }
    };

    return (
        <div className="wallet-tab-modern">
            <PasswordPromptModal
                isOpen={showSecurityPrompt}
                onClose={() => setShowSecurityPrompt(false)}
                onVerified={handleVerified}
            />

            <div className="wallet-header">
                <div className="wallet-intro">
                    <p>Secure Payments</p>
                    <h1>Your Wallet</h1>
                </div>
                <div className="security-status-badge">
                    <FaShieldAlt />
                    <span>Bank-Grade Encryption Active</span>
                </div>
            </div>

            {/* Store Credit & Loyalty Section */}
            <div className="store-credit-loyalty-section">
                <div className="credit-card-glow-bg">
                    <div className="credit-box-header">
                        <span className="credit-label">Available Store Credit</span>
                        <span className="premium-glow-tag">Store Credit</span>
                    </div>
                    <div className="credit-amount-large">
                        KES {user?.storeCredit?.toLocaleString() || '0'}
                    </div>
                    <p className="credit-usage-note">This balance will be automatically applied as a discount on your next coffee purchase.</p>
                </div>

                <div className="points-box-glow-bg">
                    <div className="points-box-header">
                        <span className="points-label">Loyalty Rewards</span>
                        <span className="points-rate-tag">Points Balance</span>
                    </div>
                    <div className="points-value-large">
                        {user?.loyaltyPoints?.toLocaleString() || '0'} <span className="points-suffix">PTS</span>
                    </div>
                    <p className="points-usage-note">Earn points on every acquisition. Redeemable for premium single-origin bags.</p>
                </div>
            </div>

            <div className="payment-cards-grid">
                {/* M-PESA CARD */}
                <div className={`method-tile ${user?.wallet?.mpesaPhone ? 'active' : ''}`}>
                    <div className="tile-top">
                        <div className="brand-icon mpesa">
                            <img src="/M-PESA_LOGO-01.svg.png" alt="M-Pesa" />
                        </div>
                        <button className="tile-eye" onClick={() => triggerSecurity('unmask', 'mpesa')}>
                            {unmaskedFields.mpesa ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                    <div className="tile-body">
                        <label>M-Pesa Mobile Number</label>
                        <div className="masked-value">
                            {maskPhone(user?.wallet?.mpesaPhone || user?.phone)}
                        </div>
                        <span className="method-tag">Default Method</span>
                    </div>
                    <div className="tile-footer">
                        <button className="tile-btn" onClick={() => triggerSecurity('edit', 'mpesa')}>
                            {user?.wallet?.mpesaPhone ? 'Edit Number' : 'Set Number'}
                        </button>
                    </div>
                </div>

                {/* CARD CARD */}
                <div className={`method-tile card-tile ${user?.wallet?.card?.numberMasked ? 'active' : ''}`}>
                    <div className="tile-top">
                        <div className="brand-icon card">
                            <FaCreditCard />
                        </div>
                        {user?.wallet?.card?.numberMasked && (
                            <button className="tile-eye" onClick={() => triggerSecurity('unmask', 'card')}>
                                {unmaskedFields.card ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        )}
                    </div>
                    <div className="tile-body">
                        <label>Credit / Debit Card</label>
                        <div className="masked-value">
                            {user?.wallet?.card?.numberMasked ? maskCard(user.wallet.card.numberMasked) : 'No card saved'}
                        </div>
                        {user?.wallet?.card?.holderName && (
                            <div className="card-holder-name">{user.wallet.card.holderName}</div>
                        )}
                    </div>
                    <div className="tile-footer">
                        <button className="tile-btn primary" onClick={() => triggerSecurity('edit', 'card')}>
                            {user?.wallet?.card?.numberMasked ? 'Update Card' : 'Add New Card'}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isEditingMpesa && (
                    <motion.div
                        className="wallet-edit-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="edit-modal-card">
                            <div className="edit-header">
                                <h3>Update M-Pesa Number</h3>
                                <button onClick={() => setIsEditingMpesa(false)}><FaTimes /></button>
                            </div>
                            <form onSubmit={handleMpesaSubmit}>
                                <div className="form-group-modern">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={mpesaPhone}
                                        onChange={(e) => setMpesaPhone(e.target.value)}
                                        placeholder="+254 XXX XXX XXX"
                                        required
                                    />
                                    <small>This number will be used for STK Push during checkout.</small>
                                </div>
                                <div className="edit-actions">
                                    <button type="submit" className="btn-save" disabled={loading}>
                                        {loading ? 'Saving...' : 'Confirm Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}

                {isEditingCard && (
                    <motion.div
                        className="wallet-edit-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="edit-modal-card">
                            <div className="edit-header">
                                <h3>Saved Card Details</h3>
                                <button onClick={() => setIsEditingCard(false)}><FaTimes /></button>
                            </div>
                            <form onSubmit={handleCardSubmit}>
                                <div className="form-group-modern">
                                    <label>Cardholder Name</label>
                                    <input
                                        type="text"
                                        value={cardData.holderName}
                                        onChange={(e) => setCardData(p => ({ ...p, holderName: e.target.value }))}
                                        placeholder="Full Name as on card"
                                        required
                                    />
                                </div>
                                <div className="form-group-modern">
                                    <label>Card Number</label>
                                    <div className="input-with-pill">
                                        <input
                                            type="text"
                                            value={cardData.cardNumber}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                                                const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
                                                setCardData(p => ({ ...p, cardNumber: formatted }));
                                            }}
                                            placeholder="XXXX XXXX XXXX XXXX"
                                            maxLength="19"
                                            required
                                        />
                                        <div className="brand-pill">{cardData.brand}</div>
                                    </div>
                                </div>
                                <div className="form-row-modern">
                                    <div className="form-group-modern">
                                        <label>Expiry Date</label>
                                        <input
                                            type="text"
                                            value={cardData.expiryDate}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                if (val.length >= 3) {
                                                    val = val.slice(0, 2) + '/' + val.slice(2);
                                                }
                                                setCardData(p => ({ ...p, expiryDate: val }));
                                            }}
                                            placeholder="MM/YY"
                                            maxLength="5"
                                            required
                                        />
                                    </div>
                                    <div className="form-group-modern">
                                        <label>Card Brand</label>
                                        <select
                                            value={cardData.brand}
                                            onChange={(e) => setCardData(p => ({ ...p, brand: e.target.value }))}
                                        >
                                            <option value="visa">Visa</option>
                                            <option value="mastercard">Mastercard</option>
                                            <option value="amex">American Express</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="edit-actions">
                                    <button type="submit" className="btn-save" disabled={loading}>
                                        {loading ? 'Processing...' : 'Securely Save Card'}
                                    </button>
                                </div>
                                <div className="security-disclaimer">
                                    <FaLock />
                                    <span>Rerendet does not store full CVV codes. Your data is encrypted for your protection.</span>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WalletTab;

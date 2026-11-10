import React, { useContext } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { useLocation } from 'react-router-dom';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import './WhatsAppSupport.css';

const WhatsAppSupport = () => {
    const { publicSettings } = useContext(AppContext);
    const location = useLocation();

    // Do not render on admin dashboard pages
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    // Check if WhatsApp support widget is disabled by admin
    if (publicSettings?.whatsappSupport?.enabled === false) {
        return null;
    }

    const handleClick = () => {
        let message = publicSettings?.whatsappSupport?.message || 'Hi Rerendet Coffee! I am browsing your online store and have a question.';
        if (location.pathname.includes('/product/')) {
          message = 'Hi Rerendet Coffee! I am interested in your specialty coffee and would like to ask a quick question.';
        } else if (location.pathname.includes('/cart') || location.pathname.includes('/checkout')) {
          message = 'Hi Rerendet Coffee! I need assistance with my coffee order checkout.';
        }

        const whatsappUrl = getWhatsAppLink(publicSettings, message);
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const isAccountPage = location.pathname.startsWith('/account');

    return (
        <motion.div
            className={`whatsapp-support-floating ${isAccountPage ? 'in-account-portal' : ''}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
        >
            <button
                type="button"
                className="whatsapp-btn"
                onClick={handleClick}
                title="Chat with us on WhatsApp"
                aria-label="Chat with us on WhatsApp"
            >
                <FaWhatsapp className="whatsapp-fa-icon" />
                <span className="whatsapp-pulse" aria-hidden="true" />
            </button>
        </motion.div>
    );
};

export default WhatsAppSupport;

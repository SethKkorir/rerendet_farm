import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { playNotificationSound } from '../../utils/sound';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X
} from 'lucide-react';
import './Notification.css';

const ToastContent = ({ notification, onDismiss, isPaused, setIsPaused }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon-svg success" />;
      case 'error':
        return <XCircle size={18} className="toast-icon-svg error" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon-svg warning" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon-svg info" />;
    }
  };

  const getDefaultTitle = (type) => {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Action Required';
      case 'warning':
        return 'Notice';
      case 'info':
      default:
        return 'Information';
    }
  };

  return (
    <>
      <div className="toast-main">
        <div className={`toast-icon-badge ${notification.type}`}>
          {getIcon(notification.type)}
        </div>

        <div className="toast-body">
          <div className="toast-title-row">
            <span className="toast-title">
              {notification.title || getDefaultTitle(notification.type)}
            </span>
          </div>
          <p className="toast-message">{notification.message}</p>
        </div>

        <button
          className="toast-close"
          onClick={() => onDismiss(notification.id)}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>

      {notification.duration > 0 && (
        <div className="toast-progress-track">
          <motion.div
            className={`toast-progress-bar ${notification.type}`}
            initial={{ width: '100%' }}
            animate={{ width: isPaused ? undefined : '0%' }}
            transition={{
              duration: notification.duration / 1000,
              ease: 'linear'
            }}
          />
        </div>
      )}
    </>
  );
};

const NotificationItem = ({ notification, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 360 }}
      className={`toast-card toast-${notification.type}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="polite"
    >
      <ToastContent
        notification={notification}
        onDismiss={onDismiss}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
      />
    </motion.div>
  );
};

// Wrap with forwardRef for Framer Motion popLayout compatibility
const ForwardedNotificationItem = React.forwardRef((props, ref) => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 360 }}
      className={`toast-card toast-${props.notification.type}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="polite"
    >
      <ToastContent
        notification={props.notification}
        onDismiss={props.onDismiss}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
      />
    </motion.div>
  );
});

ForwardedNotificationItem.displayName = 'ForwardedNotificationItem';

const Notification = () => {
  const { notifications, removeNotification } = useContext(AppContext);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Only play audio chime when notification count increases
    if (notifications.length > prevCountRef.current) {
      const latest = notifications[notifications.length - 1];
      playNotificationSound(latest?.type);
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);

  return (
    <div className="toast-container" aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <ForwardedNotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Notification;

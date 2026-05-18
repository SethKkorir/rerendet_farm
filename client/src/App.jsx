// App.js
import React, { useEffect, useContext, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppContext } from './context/AppContext';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';

// Lazy Load Components
const Hero = lazy(() => import('./components/Hero/Hero'));
const Features = lazy(() => import('./components/Features/Features'));
const About = lazy(() => import('./components/About/About'));
const CoffeeShop = lazy(() => import('./components/CoffeeShop/CoffeeShop'));
const Testimonials = lazy(() => import('./components/Testimonials/Testimonials'));
const Contact = lazy(() => import('./components/Contact/Contact'));
const Newsletter = lazy(() => import('./components/Newsletter/Newsletter'));
const CartSidebar = lazy(() => import('./components/Cart/CartSidebar'));
const PaymentModals = lazy(() => import('./components/Modals/PaymentModal').then(module => ({ default: (props) => <><module.MpesaModal {...props} /><module.CardModal {...props} /></> })));
const BackToTop = lazy(() => import('./components/BackToTop/BackToTop'));
const Notification = lazy(() => import('./components/Notification/Notification'));
const AuthModal = lazy(() => import('./components/Auth/AuthModal'));
const SessionLock = lazy(() => import('./components/Auth/SessionLock'));
const WhatsAppSupport = lazy(() => import('./components/UI/WhatsAppSupport'));
const ProductDetail = lazy(() => import('./components/Product/ProductDetail'));
const AdminLayout = lazy(() => import('./components/Admin/AdminLayout'));
const AdminRoute = lazy(() => import('./components/Admin/AdminRoute'));
const Checkout = lazy(() => import('./components/Checkout/Checkout'));
const OrderConfirmation = lazy(() => import('./components/OrderConfirmation/OrderConfirmation'));
const OrderTracking = lazy(() => import('./components/OrderTracking/OrderTracking'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderReceipt = lazy(() => import('./components/Checkout/OrderReceipt'));
const Profile = lazy(() => import('./components/Profile/Profile'));
const AccountDashboard = lazy(() => import('./components/Account/AccountDashboard'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));

// Admin Sub-routes
const Dashboard = lazy(() => import('./components/Admin/Dashboard'));
const OrdersManagement = lazy(() => import('./components/Admin/OrdersManagement'));
const ProductsManagement = lazy(() => import('./components/Admin/ProductsManagement'));
const UsersManagement = lazy(() => import('./components/Admin/UsersManagement'));
const Analytics = lazy(() => import('./components/Admin/Analytics'));
const Settings = lazy(() => import('./components/Admin/Settings'));
const AdminLogin = lazy(() => import('./components/Admin/AdminLogin'));
const ActivityLogs = lazy(() => import('./components/Admin/ActivityLogs'));
const PaymentsManagement = lazy(() => import('./components/Admin/PaymentsManagement'));
const ContactsManagement = lazy(() => import('./components/Admin/ContactsManagement'));
const Marketing = lazy(() => import('./components/Admin/Marketing'));
const AdsManagement = lazy(() => import('./components/Admin/AdsManagement'));
const CouponManagement = lazy(() => import('./components/Admin/CouponManagement'));
const BlogManagement = lazy(() => import('./components/Admin/BlogManagement'));

const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-spinner"></div>
    <style>{`
      .page-loader { position: fixed; inset: 0; background: #0B0F1A; display: flex; align-items: center; justify-content: center; z-index: 9999; }
      .loader-spinner { width: 40px; height: 40px; border: 3px solid rgba(212, 175, 55, 0.1); border-top: 3px solid #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

function App() {
  const location = useLocation();
  const { settingsLoading, isAdmin, showAuthModal, setShowAuthModal, authView } = useContext(AppContext);

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: 'ease-in-out' });

    // Performance: Use IntersectionObserver instead of scroll listener for animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin');

  if (settingsLoading) return <PageLoader />;

  return (
    <div className="App">
      <Suspense fallback={<PageLoader />}>
        <Notification />
        <SessionLock />
        
        {!isAdminRoute && <Navbar />}

        <Routes>
          <Route path="/" element={
            <>
              <main>
                <Hero />
                <CoffeeShop />
                <Features />
                <About />
                <Testimonials />
                <Contact />
                <Newsletter />
              </main>
              <Footer />
            </>
          } />

          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<AccountDashboard />} />
          <Route path="/account" element={<AccountDashboard />} />
          <Route path="/account/*" element={<AccountDashboard />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/order-tracking/:id" element={<OrderTracking />} />
          <Route path="/privacy-policy" element={<PolicyPage type="privacyPolicy" title="Privacy Policy" />} />
          <Route path="/terms-conditions" element={<PolicyPage type="termsConditions" title="Terms & Conditions" />} />
          <Route path="/refund-policy" element={<PolicyPage type="refundPolicy" title="Refund Policy" />} />
          <Route path="/shipping-policy" element={<PolicyPage type="shippingPolicy" title="Shipping & Delivery" />} />

          {/* Admin Routes (Code Splitted Bundle) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={
            <AdminRoute>
              <AdminLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/orders" element={<OrdersManagement />} />
                    <Route path="/products" element={<ProductsManagement />} />
                    <Route path="/users" element={<UsersManagement />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/payments" element={<PaymentsManagement />} />
                    <Route path="/logs" element={<ActivityLogs />} />
                    <Route path="/contacts" element={<ContactsManagement />} />
                    <Route path="/marketing" element={<Marketing />} />
                    <Route path="/ads" element={<AdsManagement />} />
                    <Route path="/coupons" element={<CouponManagement />} />
                    <Route path="/blogs" element={<BlogManagement />} />
                  </Routes>
                </Suspense>
              </AdminLayout>
            </AdminRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {!isAdminRoute && (
          <>
            <CartSidebar />
            <PaymentModals />
            <BackToTop />
            <WhatsAppSupport />
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialView={authView} />
          </>
        )}
      </Suspense>
    </div>
  );
}

export default App;
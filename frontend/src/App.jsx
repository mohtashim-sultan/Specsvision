import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './components/Home';
import Shop from './components/Shop';
import Login from './components/Login';
import Signup from './components/Signup';
import Cart from './components/Cart';
import About from './components/About';
import Contact from './components/Contact';

// Preserved features
import VirtualTryOnPage from './pages/VirtualTryOnPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminProductEditPage from './pages/admin/AdminProductEditPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';

// New features
import UserProfilePage from './pages/UserProfilePage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import WishlistPage from './pages/WishlistPage';
import ComparePage from './pages/ComparePage';


function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  // The try-on studio is a full-viewport experience: it sizes itself to fill the space
  // below the header, so a footer underneath pushes the document past the viewport and
  // makes the page scroll — which on mobile hid the capture bar and the frame carousel.
  const isImmersive = location.pathname.startsWith('/try-on');

  return (
    <div
      className={isImmersive ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}
      style={{ background: 'linear-gradient(to bottom right, var(--bg-page-start), var(--bg-page-end))' }}
    >
      <ScrollToTop />
      {!isAdmin && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:productId" element={<ProductDetailPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/try-on" element={<VirtualTryOnPage />} />
        <Route path="/try-on/:productId" element={<VirtualTryOnPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/:productId" element={<AdminProductEditPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>
      </Routes>
      {!isAdmin && !isImmersive && <Footer />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--toast-bg, rgba(255, 255, 255, 0.96))',
            color: 'var(--toast-color, #0f172a)',
            border: '1px solid var(--toast-border, rgba(147, 51, 234, 0.22))',
            boxShadow: 'var(--toast-shadow, 0 16px 36px -6px rgba(147, 51, 234, 0.15))',
            borderRadius: '20px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
          success: {
            iconTheme: {
              primary: '#9333ea',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 flex items-center justify-center">
                  {icon}
                </div>
                <div className="flex-1 text-[12.5px] sm:text-[13px] font-semibold leading-tight pr-1">
                  {message}
                </div>
                {t.type !== 'loading' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    className="shrink-0 ml-1.5 p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-100/50 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                    aria-label="Dismiss notification"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <WishlistProvider>
      <CompareProvider>
        <AppContent />
      </CompareProvider>
      </WishlistProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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

// New features
import UserProfilePage from './pages/UserProfilePage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, var(--bg-page-start), var(--bg-page-end))' }}>
        <Header />
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
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
          <Route
            path="/demo"
            element={
              <main className="py-20 min-h-[60vh] flex items-center justify-center">
                Demo (placeholder)
              </main>
            }
          />
          {/* Admin Portal */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/:productId" element={<AdminProductEditPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
          </Route>
        </Routes>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
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
          containerStyle={{ color: 'var(--text-primary)' }}
        />
      </div>
    </AuthProvider>
    </ThemeProvider>
  );
}
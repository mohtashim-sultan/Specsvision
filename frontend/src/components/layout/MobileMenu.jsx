import React from 'react';
import { Link } from 'react-router-dom';
import { X, Home, ShoppingBag, Eye, Info, Mail, User, LogOut, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function MobileMenu({ isOpen, onClose }) {
  const { isAuthenticated, user, logout } = useAuth();

  const menuItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/shop', label: 'Shop', icon: ShoppingBag },
    { path: '/try-on', label: 'Virtual Try-On', icon: Eye },
    { path: '/about', label: 'About', icon: Info },
    { path: '/contact', label: 'Contact', icon: Mail },
  ];

  const handleLinkClick = () => {
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Menu */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md rounded-t-3xl shadow-2xl z-[60] max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900 active:text-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Logo */}
            <div className="px-6 pt-4 pb-6 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  SpecsVision
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="px-6 py-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-purple-50 active:bg-purple-100 transition-colors mb-2 min-h-[48px] touch-manipulation"
                  >
                    <Icon className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-gray-900 font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="px-6 py-4 border-t border-purple-100">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{user?.username || 'User'}</p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/cart"
                    onClick={handleLinkClick}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors mb-2"
                  >
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-900 font-medium">Cart</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={handleLinkClick}
                    className="block w-full px-4 py-3 bg-white border-2 border-purple-200 text-purple-600 rounded-xl font-semibold text-center hover:bg-purple-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={handleLinkClick}
                    className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
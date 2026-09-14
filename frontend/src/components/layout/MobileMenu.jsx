import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Home, ShoppingBag, Eye, Info, Mail, User, LogOut, ShoppingCart, GitCompare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';

export default function MobileMenu({ isOpen, onClose }) {
  const { isAuthenticated, user, admin, logout } = useAuth();
  const { count: compareCount } = useCompare();
  const location = useLocation();

  const profilePath = admin ? '/admin' : '/profile';

  const menuItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/shop', label: 'Shop', icon: ShoppingBag },
    { path: '/try-on', label: 'Virtual Try-On', icon: Eye },
    { path: '/compare', label: 'Compare Frames', icon: GitCompare, badge: compareCount },
    { path: '/about', label: 'About', icon: Info },
    { path: '/contact', label: 'Contact', icon: Mail },
  ];

  const handleLinkClick = () => onClose();

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
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />

          {/* Menu */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl z-[60] max-h-[90vh] overflow-y-auto overscroll-contain"
            style={{ backgroundColor: 'var(--surface-bg)' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full" style={{ backgroundColor: 'var(--border-color-gray)' }} />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Logo */}
            <div className="px-6 pt-4 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-xl shadow-md shadow-purple-500/20">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  SpecsVision
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="px-4 py-4">
              {menuItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all mb-1 min-h-[48px] touch-manipulation"
                      style={{
                        backgroundColor: isActive ? 'rgba(147,51,234,0.08)' : 'transparent',
                        color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
                      }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                      <span className="font-medium">{item.label}</span>
                      {Boolean(item.badge) && item.badge > 0 && (
                        <span className="ml-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {item.badge}
                        </span>
                      )}
                      {isActive && !item.badge && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {isAuthenticated ? (
                <>
                  <Link
                    to={profilePath}
                    onClick={handleLinkClick}
                    className="flex items-center justify-between gap-3 p-3.5 mb-3 rounded-2xl border transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: 'rgba(147, 51, 234, 0.05)',
                      borderColor: 'rgba(147, 51, 234, 0.2)',
                    }}
                    aria-label="Open profile settings"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20 text-white font-bold shrink-0">
                        {(admin ? (admin.full_name || admin.email || 'A') : (user?.full_name || user?.email || 'U')).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {admin ? (admin.full_name || admin.email) : (user?.full_name || user?.username || 'User')}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {admin ? 'Administrator' : user?.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-sm">
                      {admin ? 'Admin' : 'Edit Profile'}
                    </span>
                  </Link>

                  <Link
                    to={profilePath}
                    onClick={handleLinkClick}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all mb-1 min-h-[48px] touch-manipulation"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <User className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                    <span className="font-medium">{admin ? 'Admin Dashboard' : 'Profile & Orders'}</span>
                  </Link>

                  <Link
                    to="/cart"
                    onClick={handleLinkClick}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all mb-1 min-h-[48px] touch-manipulation"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <ShoppingCart className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                    <span className="font-medium">Cart</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-red-500 min-h-[48px] touch-manipulation"
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={handleLinkClick}
                    className="block w-full px-4 py-3 rounded-xl font-semibold text-center border-2 transition-all"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-accent)' }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={handleLinkClick}
                    className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-center shadow-lg shadow-purple-500/25 transition-all"
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
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Eye, Menu } from 'lucide-react';
import MobileMenu from './MobileMenu';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/shop', label: 'Shop' },
  { path: '/try-on', label: 'Virtual Try-On' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount, isAuthenticated, admin, logout, user } = useAuth();
  const location = useLocation();

  return (
    <>
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 1px 20px rgba(0,0,0,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1.5 sm:p-2 rounded-xl shadow-md shadow-purple-500/20">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <Link
                to="/"
                className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent whitespace-nowrap"
              >
                SpecsVision
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map(({ path, label }) => {
                const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className="relative px-3 lg:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                    style={{
                      color: isActive ? 'var(--text-accent)' : 'var(--text-nav)',
                      backgroundColor: isActive ? 'rgba(147,51,234,0.08)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--text-accent)';
                        e.currentTarget.style.backgroundColor = 'rgba(147,51,234,0.05)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--text-nav)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />
                    )}
                  </Link>
                );
              })}
              {admin && (
                <Link
                  to="/admin"
                  className="px-3 lg:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{ color: location.pathname.startsWith('/admin') ? 'var(--text-accent)' : 'var(--text-nav)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                  onMouseLeave={e => { if (!location.pathname.startsWith('/admin')) e.currentTarget.style.color = 'var(--text-nav)'; }}
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Action Icons */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2">
                  {admin ? (
                    <Link
                      to="/admin"
                      className="text-xs font-semibold max-w-[120px] truncate px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ color: 'var(--text-nav)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-nav)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {admin.email}
                    </Link>
                  ) : (
                    <Link
                      to="/profile"
                      className="flex items-center gap-1.5 text-xs font-semibold max-w-[120px] truncate px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ color: 'var(--text-nav)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-nav)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                      {user?.full_name || user?.email || 'Profile'}
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ color: 'var(--text-accent)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent-hover)'; e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--text-nav)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-nav)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <User className="w-4 h-4" />
                  Sign in
                </Link>
              )}

              <ThemeToggle />

              <Link
                to="/cart"
                className={`p-2 transition-all relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${admin ? 'pointer-events-none opacity-40' : ''}`}
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-nav)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                aria-label="Shopping cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-semibold shadow-md">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                aria-label="Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
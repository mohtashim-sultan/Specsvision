import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Eye, Menu } from 'lucide-react';
import MobileMenu from './MobileMenu';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount, isAuthenticated, admin, logout, user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1.5 sm:p-2 rounded-lg">
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
            <nav className="hidden md:flex space-x-6 lg:space-x-8">
              <Link
                to="/"
                className="font-medium transition-colors"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
              >
                Home
              </Link>
              <Link
                to="/shop"
                className="font-medium transition-colors"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
              >
                Shop
              </Link>
              <Link
                to="/try-on"
                className="font-medium transition-colors"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
              >
                Virtual Try-On
              </Link>
              <Link
                to="/about"
                className="font-medium transition-colors"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="font-medium transition-colors"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
              >
                Contact
              </Link>
              {admin && (
                <Link
                  to="/admin"
                  className="font-medium transition-colors"
                  style={{ color: 'var(--text-nav)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Action Icons */}
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
              <button 
                className="hidden sm:block p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-3">
                  {admin ? (
                    <Link
                      to="/admin"
                      className="text-xs font-semibold max-w-[120px] truncate transition-colors"
                      style={{ color: 'var(--text-nav)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                    >
                      {admin.email}
                    </Link>
                  ) : (
                    <Link
                      to="/profile"
                      className="text-xs font-semibold max-w-[120px] truncate flex items-center gap-1 transition-colors"
                      style={{ color: 'var(--text-nav)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: 'var(--text-accent)' }} />
                      {user?.full_name || user?.email || 'Profile'}
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
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
                  className="hidden sm:block p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-nav)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                  aria-label="User account"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              <ThemeToggle />

              <Link
                to="/cart"
                className={`p-2 transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center ${admin ? 'pointer-events-none opacity-40' : ''}`}
                style={{ color: 'var(--text-nav)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-nav)'}
                aria-label="Shopping cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-semibold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
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

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
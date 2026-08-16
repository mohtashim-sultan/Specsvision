import React from 'react';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--footer-bg)', color: 'var(--footer-text)' }}>
      {/* Gradient accent line */}
      <div className="h-1 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600" />

      <div className="py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8">
            {/* Brand */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-xl shadow-md shadow-purple-500/20">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold">SpecsVision</span>
              </div>
              <p className="mb-4 max-w-md text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Revolutionizing eyewear shopping with AI-powered virtual try-on technology. Find your perfect frames from anywhere.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold mb-4 text-base sm:text-lg">Quick Links</h3>
              <ul className="space-y-3 text-sm sm:text-base">
                {[
                  { to: '/try-on', label: 'Virtual Try-On' },
                  { to: '/shop', label: 'Shop All' },
                  { to: '/about', label: 'About Us' },
                  { to: '/contact', label: 'Contact' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="transition-colors block py-0.5"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-bold mb-4 text-base sm:text-lg">Support</h3>
              <ul className="space-y-3 text-sm sm:text-base">
                {[
                  { to: '/contact', label: 'Contact Us' },
                  { to: '/faq', label: 'FAQ' },
                  { to: '/returns', label: 'Returns' },
                  { to: '/shipping', label: 'Shipping' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="transition-colors block py-0.5"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="border-t mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
            style={{ borderColor: 'var(--footer-border)' }}
          >
            <p className="text-sm text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} SpecsVision. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {['Privacy Policy', 'Terms of Service'].map(label => (
                <a
                  key={label}
                  href="/#"
                  className="transition-colors text-sm"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
import React from 'react';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--footer-bg)', color: 'var(--footer-text)' }} className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold">SpecsVision</span>
            </div>
            <p className="mb-4 max-w-md text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              Revolutionizing eyewear shopping with AI-powered virtual try-on technology.
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-base sm:text-lg">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              <li>
                <Link to="/try-on" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Virtual Try-On
                </Link>
              </li>
              <li>
                <Link to="/shop" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/face-shape" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Face Shape Guide
                </Link>
              </li>
              <li>
                <Link to="/size" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-base sm:text-lg">Support</h3>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              <li>
                <Link to="/contact" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/returns" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Returns
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="transition-colors block py-1 min-h-[32px] flex items-center" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  Shipping
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: 'var(--footer-border)' }}>
          <p className="text-sm sm:text-base text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
            © 2025 SpecsVision. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <a href="#" className="transition-colors text-sm sm:text-base" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              Privacy Policy
            </a>
            <a href="#" className="transition-colors text-sm sm:text-base" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--footer-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
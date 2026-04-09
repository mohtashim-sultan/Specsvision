import React from 'react';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold">SpecsVision</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md text-sm sm:text-base">
              Revolutionizing eyewear shopping with AI-powered virtual try-on technology.
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-base sm:text-lg">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
              <li>
                <Link to="/try-on" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Virtual Try-On
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/face-shape" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Face Shape Guide
                </Link>
              </li>
              <li>
                <Link to="/size" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-base sm:text-lg">Support</h3>
            <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
              <li>
                <Link to="/contact" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Returns
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-white transition-colors block py-1 min-h-[32px] flex items-center">
                  Shipping
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm sm:text-base text-center sm:text-left">
            © 2025 SpecsVision. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
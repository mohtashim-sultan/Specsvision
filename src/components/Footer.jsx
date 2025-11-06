import React from 'react'
import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer(){
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg"><Eye className="w-6 h-6 text-white" /></div>
              <span className="text-2xl font-bold">SpecsVision</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">Revolutionizing eyewear shopping with AI-powered virtual try-on technology.</p>
          </div>
          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/try-on" className="hover:text-white">Virtual Try-On</Link></li>
              <li><Link to="/shop" className="hover:text-white">Shop All</Link></li>
              <li><Link to="/face-shape" className="hover:text-white">Face Shape Guide</Link></li>
              <li><Link to="/size" className="hover:text-white">Size Guide</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/returns" className="hover:text-white">Returns</Link></li>
              <li><Link to="/shipping" className="hover:text-white">Shipping</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400">© 2025 SpecsVision. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, User, Search, Eye } from 'lucide-react'

export default function Header({ cartCount = 0 }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">SpecsVision</Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-purple-600 font-medium">Home</Link>
            <Link to="/shop" className="text-gray-700 hover:text-purple-600 font-medium">Shop</Link>
            <Link to="/try-on" className="text-gray-700 hover:text-purple-600 font-medium">Virtual Try-On</Link>
            <Link to="/about" className="text-gray-700 hover:text-purple-600 font-medium">About</Link>
            <Link to="/contact" className="text-gray-700 hover:text-purple-600 font-medium">Contact</Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-purple-600"><Search className="w-5 h-5" /></button>
            <Link to="/login" className="p-2 text-gray-600 hover:text-purple-600"><User className="w-5 h-5" /></Link>
            <Link to="/cart" className="p-2 text-gray-600 hover:text-purple-600 relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

import React from 'react'
import { Star, Eye, ShoppingCart } from 'lucide-react'

export default function ProductCard({ product }) {
  return (
    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200">
      <div className="relative overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            product.badge === 'Best Seller' ? 'bg-orange-100 text-orange-800' :
            product.badge === 'New' ? 'bg-green-100 text-green-800' :
            product.badge === 'Trending' ? 'bg-purple-100 text-purple-800' :
            'bg-red-100 text-red-800'
          }`}>
            {product.badge}
          </span>
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white shadow-lg"><Eye className="w-4 h-4 text-purple-600" /></button>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            Virtual Try-On
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{product.name}</h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm text-gray-600 ml-1">{product.rating} ({product.reviews})</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {product.faceShapes.map(shape => (
            <span key={shape} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{shape}</span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-purple-600">${product.price}</span>
            <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
          </div>
          <button className="bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 p-2 rounded-lg transition-colors">
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

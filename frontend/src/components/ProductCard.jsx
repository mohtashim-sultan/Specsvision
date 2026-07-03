import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Eye, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { addCartItem } from '../api/cartApi';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { isAuthenticated, refreshCart } = useAuth();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to add items to cart");
      return;
    }
    try {
      await addCartItem(product.id, 1);
      await refreshCart();
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err.message || "Failed to add to cart");
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group rounded-2xl shadow-lg hover:shadow-2xl active:scale-[0.98] transition-all duration-300 overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="relative overflow-hidden">
        <Link to={`/shop/${product.id}`} className="block aspect-[4/3] overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
          <span
            className={`px-2 py-1 text-[10px] xs:text-xs font-semibold rounded-full whitespace-nowrap ${
              product.badge === 'Best Seller'
                ? 'bg-orange-100 text-orange-800'
                : product.badge === 'New'
                ? 'bg-green-100 text-green-800'
                : product.badge === 'Trending'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {product.badge}
          </span>
        </div>
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
          <Link
            to={`/try-on/${product.id}`}
            className="p-2 rounded-full shadow-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
            aria-label="Quick view"
          >
            <Eye className="w-4 h-4 text-purple-600" />
          </Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 sm:p-4 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-opacity duration-300">
          <Link
            to={`/try-on/${product.id}`}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-purple-700 active:bg-purple-800 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Virtual Try-On</span>
          </Link>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <Link to={`/shop/${product.id}`}>
          <h3 className="font-bold text-base sm:text-lg mb-2 line-clamp-1 transition-colors" style={{ color: 'var(--text-primary)' }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs sm:text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>
              {product.rating} ({product.reviews})
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {product.faceShapes?.map((shape) => (
            <span
              key={shape}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(147,51,234,0.08)',
                color: 'var(--text-accent)',
              }}
            >
              {shape}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-accent)' }}>${product.price}</span>
            {product.originalPrice && (
              <span className="text-xs sm:text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                ${product.originalPrice}
              </span>
            )}
          </div>
          <button 
            onClick={handleAddToCart}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white p-2 sm:p-2.5 rounded-xl transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
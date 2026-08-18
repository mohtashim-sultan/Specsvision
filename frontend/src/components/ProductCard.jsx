import React, { useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Eye, ShoppingCart, Heart, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { addCartItem } from '../api/cartApi';
import { API_BASE } from '../config/env';
import ModelViewer from './ModelViewer';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const { isAuthenticated, refreshCart } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { has: inCompare, toggle: toggleCompare } = useCompare();
  const wishlisted = isWishlisted(product.id);

  const modelSrc = useMemo(() => {
    const fv = product?.front_view?.trim();
    if (!fv || !/\.(glb|gltf)$/i.test(fv)) return null;
    return fv.startsWith('/') ? `${API_BASE}${fv}` : fv;
  }, [product]);

  const handlePointerDown = (e) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx < 6 && dy < 6) {
      navigate(`/shop/${product.id}`);
    }
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id, product.name);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product.id, product.name);
  };

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
        <div 
          className="aspect-[4/3] w-full overflow-hidden bg-surface-container-low/40 dark:bg-transparent relative cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {modelSrc ? (
            <div className="w-full h-full relative">
              <ModelViewer
                src={modelSrc}
                alt={product.name}
                minHeight="100%"
                showArButton={false}
                showHint={false}
                loading="lazy"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="w-full h-full overflow-hidden">
              <img
                src={product.image || "/specs.jpg"}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
        </div>
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
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-30 flex flex-col gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleWishlist}
            className="p-2 sm:p-2 rounded-full shadow-lg transition-colors min-w-[38px] min-h-[38px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center backdrop-blur-md touch-manipulation cursor-pointer active:scale-90"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)' }}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current text-pink-600' : 'text-gray-500'}`} />
          </button>
          <button
            type="button"
            onClick={handleCompare}
            className={`p-2 sm:p-2 rounded-full shadow-lg transition-all min-w-[38px] min-h-[38px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center backdrop-blur-md touch-manipulation cursor-pointer active:scale-90 ${
              inCompare ? 'opacity-100 scale-105' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            }`}
            style={{
              backgroundColor: inCompare ? 'rgba(147,51,234,0.95)' : 'rgba(255,255,255,0.92)',
              border: inCompare ? '1px solid rgba(147,51,234,1)' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: inCompare ? '0 0 12px rgba(147,51,234,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
            }}
            aria-label="Toggle compare"
            title={inCompare ? 'Remove from compare' : 'Add to compare'}
          >
            <GitCompare className={`w-4 h-4 ${inCompare ? 'text-white' : 'text-purple-600'}`} />
          </button>
          <Link
            to={`/try-on/${product.id}`}
            className="p-2 sm:p-2 rounded-full shadow-lg transition-colors min-w-[38px] min-h-[38px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 touch-manipulation cursor-pointer"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)' }}
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
          {product.reviews > 0 ? (
            <div className="flex items-center text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-xs sm:text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>
                {Number(product.rating).toFixed(1)} ({product.reviews})
              </span>
            </div>
          ) : (
            <span className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>No reviews yet</span>
          )}
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
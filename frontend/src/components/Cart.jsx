import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { fetchCart, removeCartLine, setCartLineQuantity } from '../api/cartApi';
import toast from 'react-hot-toast';
import { displayImageUrl } from '../utils/storefrontProduct';
import LoadingSpinner from './common/LoadingSpinner';

export default function Cart() {
  const { isAuthenticated, refreshCart } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCartData = async () => {
    try {
      const data = await fetchCart();
      const mapped = data.items.map(line => ({
        product: {
          ...line.product,
          price: Number(line.product.price),
          image: displayImageUrl(line.product)
        },
        quantity: line.quantity
      }));
      setItems(mapped);
    } catch (err) {
      toast.error(err.message || "Could not load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadCartData();
  }, [isAuthenticated]);

  const updateQuantity = async (productId, delta) => {
    const currentItem = items.find(item => item.product.id === productId);
    if (!currentItem) return;
    const nextQty = currentItem.quantity + delta;
    try {
      setLoading(true);
      await setCartLineQuantity(productId, nextQty);
      await loadCartData();
      await refreshCart();
    } catch (err) {
      toast.error(err.message || "Failed to update quantity");
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    try {
      setLoading(true);
      await removeCartLine(productId);
      await loadCartData();
      await refreshCart();
      toast.success("Item removed from cart");
    } catch (err) {
      toast.error(err.message || "Failed to remove item");
      setLoading(false);
    }
  };

  const handleCheckout = () => navigate('/checkout');

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!isAuthenticated) {
    return (
      <main className="py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'rgba(147,51,234,0.08)' }}>
            <ShoppingCart className="w-8 h-8" style={{ color: 'var(--text-accent)' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Your Cart</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Please log in to view and manage your cart.</p>
          <Link
            to="/login"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all"
          >
            Log In
          </Link>
        </div>
      </main>
    );
  }

  if (loading && items.length === 0) {
    return (
      <main className="py-20 min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="py-8 sm:py-12 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Your Cart</h1>
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            message="Add some frames from the shop to get started"
            action={
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] transition-all"
              >
                <ShoppingBag className="w-5 h-5" />
                Continue Shopping
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-8 md:py-12 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Your Cart
          </h1>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--surface-bg-secondary)', color: 'var(--text-muted)' }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart items list */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.article
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl shadow-sm overflow-hidden flex flex-col sm:flex-row"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Link
                    to={`/shop/${item.product.id}`}
                    className="block sm:w-28 md:w-36 flex-shrink-0 aspect-square sm:aspect-[1]"
                    style={{ backgroundColor: 'var(--surface-bg-secondary)' }}
                  >
                    <img
                      src={displayImageUrl(item.product)}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center p-4 sm:p-5 gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/shop/${item.product.id}`}
                        className="font-bold text-base sm:text-lg transition-colors line-clamp-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-accent)' }}>
                        ${item.product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div
                        className="flex items-center rounded-xl overflow-hidden"
                        style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg-secondary)' }}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-2.5 sm:p-3 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                          style={{ color: 'var(--text-secondary)' }}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 sm:w-12 text-center font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-2.5 sm:p-3 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                          style={{ color: 'var(--text-secondary)' }}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-base sm:text-lg font-bold w-20 text-right" style={{ color: 'var(--text-primary)' }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="p-2.5 rounded-lg text-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl shadow-sm p-5 sm:p-6 lg:sticky lg:top-24"
              style={{
                backgroundColor: 'var(--surface-bg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Order Summary</h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  Shipping & tax calculated at checkout
                </p>
              </div>
              <div className="pt-4 mb-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="flex justify-between items-center">
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--text-accent)' }}>
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
              <Link
                to="/shop"
                className="block w-full text-center py-3 px-4 rounded-xl font-semibold transition-all mb-3"
                style={{
                  border: '2px solid var(--border-color)',
                  color: 'var(--text-accent)',
                }}
              >
                Continue Shopping
              </Link>
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 sm:py-3.5 px-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}

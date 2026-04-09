import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './common/EmptyState';
import { featuredProducts } from '../data';

// Build initial cart with 2 sample items for demo (frontend only)
const initialCartItems = [
  { product: featuredProducts[0], quantity: 1 },
  { product: featuredProducts[2], quantity: 2 },
];

export default function Cart() {
  const [items, setItems] = useState(initialCartItems);

  const updateQuantity = (productId, delta) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(99, Math.max(1, item.quantity + delta)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <main className="py-6 sm:py-8 md:py-12 lg:py-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Your Cart</h1>
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            message="Add some frames from the shop to get started"
            action={
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-3 rounded-xl font-semibold hover:shadow-lg active:scale-95 transition-all"
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
    <main className="py-6 sm:py-8 md:py-12 lg:py-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            Your Cart
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            <span className="font-medium text-gray-800">{itemCount}</span>{' '}
            {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>

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
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col sm:flex-row"
                >
                  <Link
                    to={`/shop/${item.product.id}`}
                    className="block sm:w-28 md:w-36 flex-shrink-0 aspect-square sm:aspect-[1] bg-gray-100"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center p-4 sm:p-5 gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/shop/${item.product.id}`}
                        className="font-bold text-base sm:text-lg text-gray-900 hover:text-purple-600 transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-lg font-bold text-purple-600 mt-1">
                        ${item.product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-2.5 sm:p-3 text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 sm:w-12 text-center font-semibold text-gray-900 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-2.5 sm:p-3 text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-gray-900 w-20 text-right">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="p-2.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
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
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 lg:sticky lg:top-24"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Shipping & tax calculated at checkout
                </p>
              </div>
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-purple-600">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
              <Link
                to="/shop"
                className="block w-full text-center py-3 px-4 rounded-xl font-semibold border-2 border-purple-200 text-purple-700 hover:bg-purple-50 active:bg-purple-100 transition-colors mb-3"
              >
                Continue Shopping
              </Link>
              <button
                type="button"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 sm:py-3.5 px-4 rounded-xl font-semibold hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px]"
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

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCart, checkoutCart } from '../api/cartApi';
import { CreditCard, ShoppingBag, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function CheckoutPage() {
  const { isAuthenticated, refreshCart } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  
  // Card Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Simulation Toggle
  const [simulateSuccess, setSimulateSuccess] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadCart = async () => {
      try {
        const data = await fetchCart();
        if (!cancelled) {
          setCartItems(data.items);
          setSubtotal(Number(data.subtotal));
        }
      } catch (err) {
        toast.error("Failed to load checkout details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCart();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);

    if (!simulateSuccess) {
      setTimeout(() => {
        toast.error("Simulated Payment Error: Your transaction was declined by the bank. Please try again.");
        setPlacingOrder(false);
      }, 1500);
      return;
    }

    try {
      const res = await checkoutCart();
      toast.success("Payment verified! Order placed successfully.");
      await refreshCart();
      navigate(`/order-success/${res.order_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete checkout");
      setPlacingOrder(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="py-20 min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Checkout</h1>
        <p className="text-gray-600 mb-6">Please log in to proceed to checkout.</p>
        <Link
          to="/login"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl active:scale-95 transition-all"
        >
          Log In
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="py-20 min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="py-20 min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-4">
          <ShoppingBag className="w-16 h-16 text-purple-300 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="text-gray-500">Add glasses from the catalog before checking out.</p>
          <Link
            to="/shop"
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-8 md:py-12 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[85vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Checkout Form */}
          <form onSubmit={handlePlaceOrder} className="lg:col-span-7 bg-white rounded-3xl shadow-xl border border-purple-100/50 p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Checkout Details</h2>
            
            {/* Contact Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Section */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider">Shipping Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="Recipient's Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="123 Main St, Apt 4B"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  Simulated Payment Method
                </h3>
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200">Test Mode</span>
              </div>
              <div className="space-y-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/40">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="4000 1234 5678 9010"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Expiry Date</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1/'))}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">CVV</label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Gateway Simulator Options</span>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center gap-2 border p-3 rounded-2xl bg-green-50/20 border-green-200 cursor-pointer">
                  <input
                    type="radio"
                    name="simulate_result"
                    checked={simulateSuccess}
                    onChange={() => setSimulateSuccess(true)}
                    className="accent-purple-600"
                  />
                  <span className="text-xs font-semibold text-green-800">Simulate Payment Success</span>
                </label>
                <label className="flex-1 flex items-center gap-2 border p-3 rounded-2xl bg-rose-50/20 border-rose-200 cursor-pointer">
                  <input
                    type="radio"
                    name="simulate_result"
                    checked={!simulateSuccess}
                    onChange={() => setSimulateSuccess(false)}
                    className="accent-purple-600"
                  />
                  <span className="text-xs font-semibold text-rose-800">Simulate Payment Failure</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={placingOrder}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 px-6 rounded-2xl font-bold hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
            >
              {placingOrder ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Verifying Payment...
                </>
              ) : (
                'Place Order & Complete Payment'
              )}
            </button>
          </form>

          {/* Cart Summary */}
          <section className="lg:col-span-5 bg-white rounded-3xl shadow-xl border border-purple-100/50 p-6 space-y-4 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3 mb-4">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              Order Summary
            </h2>

            <ul className="divide-y divide-purple-50 max-h-[300px] overflow-y-auto pr-1">
              {cartItems.map((item: any) => (
                <li key={item.id} className="py-3 flex items-center justify-between text-sm gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-gray-800 block truncate">{item.product.name}</span>
                    <span className="text-xs text-gray-400">Qty: {item.quantity} · ${Number(item.product.price).toFixed(2)}</span>
                  </div>
                  <span className="font-bold text-gray-900">${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>
              <div className="border-t border-purple-50 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-purple-600">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 p-3.5 rounded-2xl flex gap-2.5 items-start text-xs text-slate-500 border border-slate-100">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span>
                Your payment data is fully encrypted. SpecsVision utilizes a sandbox environment for final checkout validation.
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

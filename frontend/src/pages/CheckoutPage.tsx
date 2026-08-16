import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCart, createPaymentIntentRequest, checkoutCart } from '../api/cartApi';
import { CreditCard, ShoppingBag, ShieldCheck, ArrowLeft, RefreshCw, User, AtSign, Phone, MapPin, Building2, Hash, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../config/stripe';

function CheckoutFormContent({
  cartItems,
  subtotal,
  refreshCart,
}: {
  cartItems: any[];
  subtotal: number;
  refreshCart: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [placingOrder, setPlacingOrder] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Mirrors backend pricing rules for live summary preview
  const TAX_RATE = 0.08;
  const FREE_SHIPPING_THRESHOLD = 100;
  const SHIPPING_FEE = 9.99;
  const KNOWN_COUPONS: Record<string, { kind: 'percent' | 'flat'; value: number }> = {
    SPECS10: { kind: 'percent', value: 0.1 },
    WELCOME5: { kind: 'flat', value: 5 },
  };
  const coupon = KNOWN_COUPONS[couponCode.trim().toUpperCase()];
  const discount = coupon
    ? Math.min(coupon.kind === 'percent' ? subtotal * coupon.value : coupon.value, subtotal)
    : 0;
  const taxable = subtotal - discount;
  const tax = taxable * TAX_RATE;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = taxable + tax + shipping;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error('Stripe is initializing. Please wait a moment.');
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card details incomplete.');
      return;
    }

    setPlacingOrder(true);
    try {
      // 1. Create PaymentIntent on backend
      const intentRes = await createPaymentIntentRequest(couponCode.trim() || null);

      // 2. Confirm card payment with Stripe
      const result = await stripe.confirmCardPayment(intentRes.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: fullName,
            email: email,
            phone: phone,
            address: {
              line1: address,
              city: city,
              state: state,
              postal_code: zip,
            },
          },
        },
      });

      if (result.error) {
        toast.error(result.error.message || 'Payment processing failed');
        setPlacingOrder(false);
        return;
      }

      if (result.paymentIntent?.status !== 'succeeded') {
        toast.error(`Payment not completed. Status: ${result.paymentIntent?.status}`);
        setPlacingOrder(false);
        return;
      }

      // 3. Complete checkout on backend with payment_intent_id
      const checkoutRes = await checkoutCart({
        shipping: {
          full_name: fullName,
          address,
          city,
          state,
          zip_code: zip,
          email,
          phone,
        },
        payment_intent_id: result.paymentIntent.id,
        coupon_code: couponCode.trim() ? couponCode.trim() : null,
      });

      toast.success('Payment approved! Order placed successfully.');
      await refreshCart();
      navigate(`/order-success/${checkoutRes.order_id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete checkout');
      setPlacingOrder(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--surface-bg)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-color)',
    borderWidth: '1px',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Checkout Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handlePlaceOrder}
        className="lg:col-span-7 rounded-2xl shadow-sm p-6 space-y-6"
        style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
      >
        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)' }}>
            Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Email Address
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)' }}>
            Shipping Address
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Recipient's Name"
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Street Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Apt 4B"
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  City
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  State
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NY"
                  className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  ZIP Code
                </label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="10001"
                  className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real Stripe Payment */}
        <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-accent)' }}>
              <CreditCard className="w-4 h-4" />
              Secure Payment (Stripe)
            </h3>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Lock className="w-3 h-3" /> Encrypted 256-bit
            </span>
          </div>
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{ backgroundColor: 'var(--surface-bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Card Details (Card Number, Expiry, CVC)
            </label>
            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-slate-900/60 focus-within:border-purple-500 transition-all">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '15px',
                      color: '#ffffff',
                      '::placeholder': { color: '#94a3b8' },
                      iconColor: '#a855f7',
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Use Stripe test card <code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">4242 4242 4242 4242</code> with any future date.
            </p>
          </div>
        </div>

        {/* Coupon */}
        <div className="pt-4 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
          <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)' }}>
            Coupon Code
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. SPECS10 or WELCOME5"
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
              style={inputStyle}
            />
          </div>
          {couponCode.trim() && (
            <p className="text-xs font-semibold" style={{ color: discount > 0 ? '#22c55e' : '#ef4444' }}>
              {discount > 0 ? `Coupon applied — you save $${discount.toFixed(2)}` : 'Unknown coupon code'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={placingOrder || !stripe}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3.5 px-6 rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base cursor-pointer"
        >
          {placingOrder ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            `Pay $${total.toFixed(2)} & Complete Order`
          )}
        </button>
      </motion.form>

      {/* Order Summary */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-5 rounded-2xl shadow-sm p-6 space-y-4 lg:sticky lg:top-24"
        style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
      >
        <h2 className="text-lg font-bold flex items-center gap-2 pb-3 mb-4" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
          <ShoppingBag className="w-5 h-5" style={{ color: 'var(--text-accent)' }} />
          Order Summary
        </h2>

        <ul className="max-h-[300px] overflow-y-auto pr-1 divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {cartItems.map((item: any) => (
            <li key={item.id} className="py-3 flex items-center justify-between text-sm gap-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="min-w-0 flex-1">
                <span className="font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{item.product.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Qty: {item.quantity} · ${Number(item.product.price).toFixed(2)}</span>
              </div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <div className="pt-4 space-y-3 text-sm" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
              <span className="font-semibold" style={{ color: '#22c55e' }}>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Tax (8%)</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
            <span className="font-semibold" style={{ color: shipping === 0 ? '#22c55e' : 'var(--text-primary)' }}>
              {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
            </span>
          </div>
          <div className="pt-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total</span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-accent)' }}>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl flex gap-2.5 items-start text-xs" style={{ backgroundColor: 'rgba(34,197,94,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
          <span>Your payment is processed securely via Stripe. Card credentials never pass through SpecsVision servers.</span>
        </div>
      </motion.section>
    </div>
  );
}

export default function CheckoutPage() {
  const { isAuthenticated, refreshCart } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
        toast.error('Failed to load checkout details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCart();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Sign In Required
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
          Please sign in to proceed with checkout.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25"
        >
          Sign In
        </Link>
      </main>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (cartItems.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Your Cart is Empty
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
          Add some frames to your cart before checking out.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25"
        >
          Explore Shop
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Checkout
        </h1>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutFormContent cartItems={cartItems} subtotal={subtotal} refreshCart={refreshCart} />
      </Elements>
    </main>
  );
}

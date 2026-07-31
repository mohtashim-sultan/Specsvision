import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCart, checkoutCart } from '../api/cartApi';
import { CreditCard, ShoppingBag, ShieldCheck, ArrowLeft, RefreshCw, User, AtSign, Phone, MapPin, Building2, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { motion } from 'framer-motion';

export default function CheckoutPage() {
  const { isAuthenticated, refreshCart } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [simulateSuccess, setSimulateSuccess] = useState(true);

  // Mirrors backend pricing rules (see _compute_pricing in routes.py) for the summary preview.
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

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
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
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);
    try {
      const res = await checkoutCart({
        shipping: {
          full_name: fullName,
          address,
          city,
          state,
          zip_code: zip,
          email,
          phone,
        },
        payment: {
          card_number: cardNumber.replace(/\s/g, ''),
          card_expiry: cardExpiry,
          card_cvv: cardCvv,
          simulate_success: simulateSuccess,
        },
        coupon_code: couponCode.trim() ? couponCode.trim() : null,
      });
      toast.success("Payment approved! Order placed successfully.");
      await refreshCart();
      navigate(`/order-success/${res.order_id}`);
    } catch (err) {
      // Backend returns 402 for a simulated decline / expired card, 400 for a bad coupon, etc.
      toast.error(err instanceof Error ? err.message : "Failed to complete checkout");
      setPlacingOrder(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--surface-bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  if (!isAuthenticated) {
    return (
      <main className="py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'rgba(147,51,234,0.08)' }}>
            <ShoppingBag className="w-8 h-8" style={{ color: 'var(--text-accent)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Checkout</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Please log in to proceed to checkout.</p>
          <Link to="/login" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all">
            Log In
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="py-20 min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2" style={{ background: 'rgba(147,51,234,0.08)' }}>
            <ShoppingBag className="w-8 h-8" style={{ color: 'var(--text-accent)' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-muted)' }}>Add glasses from the catalog before checking out.</p>
          <Link to="/shop" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-500/25">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-8 md:py-12 min-h-[85vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-1 text-sm font-semibold transition-colors" style={{ color: 'var(--text-accent)' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Checkout Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handlePlaceOrder}
            className="lg:col-span-7 rounded-2xl shadow-sm p-6 space-y-6"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
          >
            <h2 className="text-xl font-bold pb-3" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>Checkout Details</h2>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)' }}>Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000"
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)' }}>Shipping Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Recipient's Name"
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Street Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Apt 4B"
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>City</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City"
                        className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>State</label>
                    <input type="text" required value={state} onChange={(e) => setState(e.target.value)} placeholder="NY"
                      className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>ZIP Code</label>
                    <input type="text" required value={zip} onChange={(e) => setZip(e.target.value)} placeholder="10001"
                      className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-accent)' }}>
                  <CreditCard className="w-4 h-4" />
                  Simulated Payment
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Test Mode</span>
              </div>
              <div className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: 'rgba(147,51,234,0.03)', border: '1px solid var(--border-color)' }}>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" required maxLength={19} value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle}
                      placeholder="4000 1234 5678 9010" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Expiry Date</label>
                    <input type="text" required maxLength={5} value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1/'))}
                      className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle}
                      placeholder="MM/YY" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>CVV</label>
                    <input type="password" required maxLength={3} value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle}
                      placeholder="123" />
                  </div>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="pt-4 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)' }}>Coupon Code</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. SPECS10"
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
              </div>
              {couponCode.trim() && (
                <p className="text-xs font-semibold" style={{ color: discount > 0 ? '#22c55e' : '#ef4444' }}>
                  {discount > 0 ? `Coupon applied — you save $${discount.toFixed(2)}` : 'Unknown coupon code'}
                </p>
              )}
            </div>

            {/* Simulation Controls */}
            <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Gateway Simulator</span>
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all"
                  style={{ backgroundColor: simulateSuccess ? 'rgba(34,197,94,0.06)' : 'transparent', border: `1px solid ${simulateSuccess ? '#22c55e' : 'var(--border-color)'}` }}>
                  <input type="radio" name="simulate_result" checked={simulateSuccess} onChange={() => setSimulateSuccess(true)} className="accent-purple-600" />
                  <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Simulate Success</span>
                </label>
                <label className="flex-1 flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all"
                  style={{ backgroundColor: !simulateSuccess ? 'rgba(239,68,68,0.06)' : 'transparent', border: `1px solid ${!simulateSuccess ? '#ef4444' : 'var(--border-color)'}` }}>
                  <input type="radio" name="simulate_result" checked={!simulateSuccess} onChange={() => setSimulateSuccess(false)} className="accent-purple-600" />
                  <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Simulate Failure</span>
                </label>
              </div>
            </div>

            <button type="submit" disabled={placingOrder}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 px-6 rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base">
              {placingOrder ? (<><RefreshCw className="w-5 h-5 animate-spin" />Verifying Payment...</>) : 'Place Order & Complete Payment'}
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
              <span>Your payment data is fully encrypted. SpecsVision utilizes a sandbox environment for checkout validation.</span>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

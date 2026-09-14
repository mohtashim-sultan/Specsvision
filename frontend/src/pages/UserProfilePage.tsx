import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfileRequest } from '../api/authApi';
import { fetchUserOrders, cancelOrder } from '../api/cartApi';
import { submitReview } from '../api/reviewApi';
import { User, Mail, Calendar, Package, ChevronDown, ChevronUp, CheckCircle, Clock, Truck, XCircle, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { motion } from 'framer-motion';

export default function UserProfilePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>(tabParam === 'orders' ? 'orders' : 'profile');

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Review modal state
  const [reviewModalItem, setReviewModalItem] = useState<{ productId: number; productName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (tabParam === 'orders') {
      setActiveTab('orders');
    } else if (tabParam === 'profile' || tabParam === 'edit') {
      setActiveTab('profile');
    }
  }, [tabParam]);

  const handleCancelOrder = async (orderId: number) => {
    setCancellingId(orderId);
    try {
      const updated = await cancelOrder(orderId);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updated } : o)));
      toast.success(`Order #${orderId} cancelled and items restocked.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadOrders = async () => {
      try {
        const list = await fetchUserOrders();
        if (!cancelled) setOrders(list);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    };
    loadOrders();
    return () => { cancelled = true; };
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsUpdating(true);
    try {
      await updateProfileRequest(email, fullName, password || undefined);
      toast.success("Profile updated successfully!");
      setPassword('');
      setConfirmPassword('');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenReview = (item: any) => {
    if (!item.product_id) {
      toast.error("Product information unavailable for review");
      return;
    }
    setReviewModalItem({
      productId: item.product_id,
      productName: item.product_name,
    });
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
  };

  const handleCloseReview = () => {
    setReviewModalItem(null);
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
  };

  const handleSubmitItemReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    setSubmittingReview(true);
    try {
      await submitReview(reviewModalItem.productId, {
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        body: reviewBody.trim() || null,
      });
      toast.success(`Thanks! Review submitted for ${reviewModalItem.productName}.`);
      handleCloseReview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    delivered: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
    completed: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
    shipped: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
    cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
    pending: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b' },
    processing: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b' },
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    const color = statusColors[s] || statusColors.pending;
    const IconMap: Record<string, any> = { delivered: CheckCircle, completed: CheckCircle, shipped: Truck, cancelled: XCircle };
    const Icon = IconMap[s] || Clock;
    const label = s === 'completed' ? 'Delivered' : status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: color.bg, color: color.text }}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const inputStyle = {
    backgroundColor: 'var(--surface-bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <main className="py-6 sm:py-8 md:py-12 lg:py-16 min-h-[85vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Your Dashboard</h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your account profile and track purchases.</p>
        </motion.div>

        {/* Mobile Tab Selector */}
        <div className="flex lg:hidden mb-6 p-1 rounded-2xl border" style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setSearchParams({ tab: 'profile' });
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all touch-manipulation min-h-[44px]"
            style={{
              backgroundColor: activeTab === 'profile' ? 'var(--surface-bg-secondary)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--text-accent)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'profile' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              border: activeTab === 'profile' ? '1px solid var(--border-color)' : '1px solid transparent',
            }}
          >
            <User className="w-4 h-4" />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('orders');
              setSearchParams({ tab: 'orders' });
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all touch-manipulation min-h-[44px]"
            style={{
              backgroundColor: activeTab === 'orders' ? 'var(--surface-bg-secondary)' : 'transparent',
              color: activeTab === 'orders' ? 'var(--text-accent)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'orders' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              border: activeTab === 'orders' ? '1px solid var(--border-color)' : '1px solid transparent',
            }}
          >
            <Package className="w-4 h-4" />
            Orders {orders.length > 0 ? `(${orders.length})` : ''}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Profile Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`lg:col-span-4 ${activeTab === 'profile' ? 'block' : 'hidden lg:block'} rounded-2xl shadow-sm p-6 space-y-6`}
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col items-center text-center pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-purple-500/25 mb-3">
                {fullName ? fullName.split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : user?.email[0].toUpperCase()}
              </div>
              <h2 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{fullName || 'Account Member'}</h2>
              <span className="text-sm truncate max-w-full" style={{ color: 'var(--text-muted)' }}>{email}</span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter name"
                    className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email"
                    className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                    style={inputStyle} />
                </div>
              </div>
              <div className="pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                <span className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-accent)' }}>Change password (leave blank to keep current)</span>
                <div className="space-y-3">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 chars)" minLength={8}
                    className="w-full rounded-xl py-2 pl-4 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                    style={inputStyle} />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" minLength={8}
                    className="w-full rounded-xl py-2 pl-4 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                    style={inputStyle} />
                </div>
              </div>
              <button type="submit" disabled={isUpdating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] transition-all disabled:opacity-50 text-sm">
                {isUpdating ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          </motion.section>

          {/* Order History */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`lg:col-span-8 ${activeTab === 'orders' ? 'block' : 'hidden lg:block'} rounded-2xl shadow-sm p-6 min-h-[500px]`}
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
          >
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 pb-4" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
              <Package className="w-5 h-5" style={{ color: 'var(--text-accent)' }} />
              Order History
            </h2>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(147,51,234,0.06)' }}>
                  <Package className="w-10 h-10" style={{ color: 'var(--text-accent)' }} />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>No orders placed yet</h3>
                <p className="text-sm max-w-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>Looks like you haven't bought anything from SpecsVision yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => {
                  const isExpanded = expandedOrders[order.id];
                  return (
                    <article key={order.id} className="rounded-2xl overflow-hidden transition-shadow" style={{ border: '1px solid var(--border-color)' }}>
                      <header
                        onClick={() => toggleOrder(order.id)}
                        className="flex flex-wrap items-center justify-between gap-4 p-4 cursor-pointer transition-colors select-none"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-semibold tracking-wider" style={{ color: 'var(--text-accent)' }}>ORDER #{order.id}</span>
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Price</span>
                            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>PKR {Number(order.total).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(order.status)}
                            {isExpanded
                              ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                              : <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                            }
                          </div>
                        </div>
                      </header>

                      {isExpanded && (
                        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg-secondary)' }}>
                          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Items Ordered</h4>
                          <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                            {order.items?.map((item: any, idx: number) => (
                              <li key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="min-w-0 flex-1 pr-2">
                                  {item.product_id ? (
                                    <Link
                                      to={`/shop/${item.product_id}`}
                                      className="font-semibold block truncate hover:underline"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      {item.product_name}
                                    </Link>
                                  ) : (
                                    <span className="font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>
                                      {item.product_name}
                                    </span>
                                  )}
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Qty: {item.quantity} · Price: PKR {Number(item.unit_price).toLocaleString()}
                                    {item.color ? ` · Color: ${item.color}` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    PKR {Number(item.line_total).toLocaleString()}
                                  </span>
                                  {item.product_id && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReview(item)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-sm hover:shadow-md active:scale-95 transition-all touch-manipulation min-h-[36px]"
                                      aria-label={`Review ${item.product_name}`}
                                    >
                                      <Star className="w-3.5 h-3.5 fill-current" />
                                      Review Item
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                          {order.tracking_number && (
                            <div className="pt-2 flex items-center gap-2 text-xs" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                              <Truck className="w-3.5 h-3.5" />
                              <span>Tracking: <strong style={{ color: 'var(--text-primary)' }}>{order.tracking_number}</strong></span>
                            </div>
                          )}
                          {order.payment_reference && (
                            <div className="pt-2 flex flex-wrap justify-between items-center text-xs" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                              <span>Payment Reference: <strong style={{ color: 'var(--text-primary)' }}>{order.payment_reference}</strong></span>
                              <span className="px-2 py-0.5 rounded-md font-semibold text-[10px]" style={{ backgroundColor: 'rgba(147,51,234,0.1)', color: 'var(--text-accent)' }}>Simulated Payment</span>
                            </div>
                          )}
                          {['pending', 'processing'].includes(String(order.status).toLowerCase()) && (
                            <div className="pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={cancellingId === order.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </motion.section>
        </div>
      </div>

      {/* Review Item Modal for Mobile & Desktop */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Share Your Experience</span>
                <h3 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  Review {reviewModalItem.productName}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReview}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Close review dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitItemReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Your Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-2 rounded-xl transition-all active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-purple-500/10"
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className="w-7 h-7 fill-current"
                        style={{ color: star <= reviewRating ? '#facc15' : 'var(--border-color)' }}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {reviewRating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Review Title (Optional)
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={255}
                  placeholder="e.g. Great quality and comfortable fit"
                  className="w-full rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Your Review
                </label>
                <textarea
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  maxLength={4000}
                  rows={4}
                  placeholder="What did you like or dislike about these glasses?"
                  className="w-full rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/30 resize-y"
                  style={inputStyle}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all min-h-[44px] touch-manipulation flex items-center justify-center"
                >
                  {submittingReview ? 'Submitting Review...' : 'Submit Review'}
                </button>
                <Link
                  to={`/shop/${reviewModalItem.productId}#reviews`}
                  onClick={handleCloseReview}
                  className="inline-flex items-center justify-center py-3 px-4 rounded-xl font-semibold text-sm border min-h-[44px] touch-manipulation"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  View Product Page
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}

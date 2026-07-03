import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfileRequest } from '../api/authApi';
import { fetchUserOrders } from '../api/cartApi';
import { User, Mail, Calendar, Package, ChevronDown, ChevronUp, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { motion } from 'framer-motion';

export default function UserProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Profile Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 rounded-2xl shadow-sm p-6 space-y-6"
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
            className="lg:col-span-8 rounded-2xl shadow-sm p-6 min-h-[500px]"
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
                            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>${Number(order.total).toFixed(2)}</span>
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
                              <li key={idx} className="py-2.5 flex items-center justify-between text-sm" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="min-w-0 flex-1 pr-4">
                                  <span className="font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{item.product_name}</span>
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Qty: {item.quantity} · Price: ${Number(item.unit_price).toFixed(2)}
                                  </span>
                                </div>
                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>${Number(item.line_total).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          {order.payment_reference && (
                            <div className="pt-2 flex flex-wrap justify-between items-center text-xs" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                              <span>Payment Reference: <strong style={{ color: 'var(--text-primary)' }}>{order.payment_reference}</strong></span>
                              <span className="px-2 py-0.5 rounded-md font-semibold text-[10px]" style={{ backgroundColor: 'rgba(147,51,234,0.1)', color: 'var(--text-accent)' }}>Mock Card Payment</span>
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
    </main>
  );
}

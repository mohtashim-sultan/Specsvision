import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfileRequest } from '../api/authApi';
import { fetchUserOrders } from '../api/cartApi';
import { User, Mail, Calendar, Package, ChevronDown, ChevronUp, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
    return () => {
      cancelled = true;
    };
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
      // Force reload page to hydrate context
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-green-200">
          <CheckCircle className="w-3 h-3" />
          Delivered
        </span>
      );
    }
    if (s === 'shipped') {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-200">
          <Truck className="w-3 h-3" />
          Shipped
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-rose-200">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-200">
        <Clock className="w-3 h-3" />
        Processing
      </span>
    );
  };

  return (
    <main className="py-6 sm:py-8 md:py-12 lg:py-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[85vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center md:text-left mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">Manage your account profile and track purchases.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Profile Details & Form */}
          <section className="lg:col-span-4 bg-white rounded-3xl shadow-xl border border-purple-100/50 p-6 space-y-6">
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg mb-3">
                {fullName ? fullName.split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : user?.email[0].toUpperCase()}
              </div>
              <h2 className="font-bold text-xl text-gray-900">{fullName || 'Account Member'}</h2>
              <span className="text-sm text-gray-500 truncate max-w-full">{email}</span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                    placeholder="Enter name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <span className="text-xs text-purple-700 font-semibold mb-2 block">Change password (leave blank to keep current)</span>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-4 pr-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                    placeholder="New password (min 8 chars)"
                    minLength={8}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-4 pr-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                    placeholder="Confirm new password"
                    minLength={8}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:shadow-lg active:scale-98 transition-all disabled:opacity-50 text-sm"
              >
                {isUpdating ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          </section>

          {/* Order History */}
          <section className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-purple-100/50 p-6 min-h-[500px]">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6 border-b pb-4">
              <Package className="w-5 h-5 text-purple-600" />
              Order History
            </h2>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500">
                <div className="rounded-full bg-purple-50 p-4 mb-4">
                  <Package className="w-10 h-10 text-purple-300" />
                </div>
                <h3 className="font-semibold text-lg text-gray-800">No orders placed yet</h3>
                <p className="text-sm max-w-sm mt-1 mb-6">Looks like you haven't bought anything from SpecsVision yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => {
                  const isExpanded = expandedOrders[order.id];
                  return (
                    <article
                      key={order.id}
                      className="border border-purple-100/60 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white"
                    >
                      {/* Summary Row */}
                      <header
                        onClick={() => toggleOrder(order.id)}
                        className="flex flex-wrap items-center justify-between gap-4 p-4 cursor-pointer hover:bg-purple-50/20 transition-colors select-none"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-purple-600 tracking-wider">ORDER #{order.id}</span>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xs font-medium text-gray-400">Total Price</span>
                            <span className="text-base font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {getStatusBadge(order.status)}
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </div>
                        </div>
                      </header>

                      {/* Expandable Order Details */}
                      {isExpanded && (
                        <div className="border-t border-purple-50 bg-gray-50/50 p-4 space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Items Ordered</h4>
                          <ul className="divide-y divide-purple-100/50">
                            {order.items?.map((item: any, idx: number) => (
                              <li key={idx} className="py-2.5 flex items-center justify-between text-sm">
                                <div className="min-w-0 flex-1 pr-4">
                                  <span className="font-semibold text-gray-800 block truncate">{item.product_name}</span>
                                  <span className="text-xs text-gray-400">
                                    Qty: {item.quantity} · Price: ${Number(item.unit_price).toFixed(2)}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-950">${Number(item.line_total).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          {order.payment_reference && (
                            <div className="pt-2 border-t border-purple-100/50 flex flex-wrap justify-between items-center text-xs text-gray-500">
                              <span>Payment Reference: <strong className="text-gray-700">{order.payment_reference}</strong></span>
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">Mock Card Payment</span>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

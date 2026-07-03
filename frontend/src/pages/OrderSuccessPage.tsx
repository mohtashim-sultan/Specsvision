import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderDetails } from '../api/cartApi';
import { CheckCircle, ShoppingBag, User, ArrowRight, Printer, Receipt } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const id = orderId ? parseInt(orderId, 10) : NaN;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadOrderDetails = async () => {
      try {
        const data = await fetchOrderDetails(id);
        if (!cancelled) setOrder(data);
      } catch (err) {
        toast.error("Failed to load order receipt details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadOrderDetails();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <main className="py-20 min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <LoadingSpinner size="lg" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="py-20 min-h-[70vh] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
        <p className="text-gray-600 mb-6">Could not load the receipt details for this order.</p>
        <Link to="/shop" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">
          Back to Shop
        </Link>
      </main>
    );
  }

  return (
    <main className="py-8 sm:py-12 md:py-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[85vh]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Top success badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-4 text-green-600 shadow-md mb-4 animate-bounce">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">Thank You for Your Order!</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">We've verified your payment. Order processing is underway.</p>
        </div>

        {/* Receipt Card */}
        <section className="bg-white rounded-3xl shadow-xl border border-purple-100/50 overflow-hidden">
          <header className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 sm:p-8 flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest text-purple-200">Receipt / Confirmation</span>
              <h2 className="text-xl font-bold">Order ID: #{order.id}</h2>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </header>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b pb-6 border-purple-50">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Order Details</span>
                <p className="text-gray-900"><strong className="font-semibold text-gray-700">Date:</strong> {formatDate(order.created_at)}</p>
                <p className="text-gray-900 capitalize"><strong className="font-semibold text-gray-700">Status:</strong> {order.status}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Payment Verification</span>
                <p className="text-gray-900"><strong className="font-semibold text-gray-700">Reference:</strong> {order.payment_reference || 'N/A'}</p>
                <p className="text-gray-900"><strong className="font-semibold text-gray-700">Method:</strong> Credit Card (Simulated)</p>
              </div>
            </div>

            {/* Items Summary Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Receipt className="w-4 h-4 text-purple-600" />
                Purchased Items
              </h3>
              <ul className="divide-y divide-purple-50">
                {order.items?.map((item: any, idx: number) => (
                  <li key={idx} className="py-3 flex justify-between items-center text-sm gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-gray-800 block truncate">{item.product_name}</span>
                      <span className="text-xs text-gray-400">Qty: {item.quantity} · ${Number(item.unit_price).toFixed(2)}</span>
                    </div>
                    <span className="font-bold text-gray-900">${Number(item.line_total).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals Summary */}
            <div className="pt-4 border-t border-purple-50 space-y-2.5 text-sm max-w-sm ml-auto">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">${Number(order.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="border-t border-purple-50 pt-2 flex justify-between items-center">
                <span className="font-bold text-gray-900 text-base">Total Amount</span>
                <span className="text-lg font-bold text-purple-600">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 border-2 border-purple-200 bg-white hover:bg-purple-50 text-purple-700 font-semibold px-6 py-3 rounded-2xl transition-colors text-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Continue Shopping
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg text-white font-semibold px-6 py-3 rounded-2xl transition-all text-sm"
          >
            <User className="w-4 h-4" />
            Go to Your Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Filter, Package, ExternalLink, MapPin, Phone, Mail, User, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAdminOrders, fetchAdminOrderDetail, patchAdminOrderStatus } from "../../api/adminApi";
import type { AdminOrderSummary, AdminOrderDetail } from "../../types/api";
import { API_BASE } from "../../config/env";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
  processing: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6" },
  shipped: { bg: "rgba(147,51,234,0.12)", text: "#9333ea" },
  delivered: { bg: "rgba(34,197,94,0.12)", text: "#22c55e" },
  cancelled: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
};

function formatPrice(p: string | number | null | undefined) {
  if (p == null) return "PKR 0";
  const n = Number(p);
  if (Number.isNaN(n)) return String(p);
  return `PKR ${n.toLocaleString()}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getProductImageUrl(path: string | null | undefined) {
  if (!path) return "/specs.jpg";
  const trimmed = path.trim();
  if (/\.(glb|gltf)$/i.test(trimmed)) return "/specs.jpg";
  if (trimmed.startsWith("/")) return `${API_BASE}${trimmed}`;
  return trimmed;
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const [selectedSummary, setSelectedSummary] = useState<AdminOrderSummary | null>(null);
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [nextStatus, setNextStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminOrders({
        offset: 0,
        limit: 100,
        status: filter || null,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectOrder = async (order: AdminOrderSummary) => {
    setSelectedSummary(order);
    setNextStatus(order.status);
    setLoadingDetail(true);
    try {
      const detail = await fetchAdminOrderDetail(order.id);
      setOrderDetail(detail);
      setNextStatus(detail.status);
      setTrackingNumber(detail.tracking_number || "");
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setLoadingDetail(false);
    }
  };

  async function applyStatus() {
    if (!selectedSummary) return;
    setUpdating(true);
    try {
      const updated = await patchAdminOrderStatus(
        selectedSummary.id,
        nextStatus || selectedSummary.status,
        trackingNumber.trim() || null,
      );
      toast.success(`Order #${selectedSummary.id} updated to ${updated.status}`);
      setOrderDetail(updated);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Orders & Shipments
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Total: {total} orders — showing ordered products and live stock
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Orders Table */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div
            className="overflow-hidden rounded-2xl shadow-sm"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg-secondary)' }}>
                      {["ID", "Customer", "Ordered Products", "Date", "Status", "Total"].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider ${h === "Total" ? "text-right" : ""}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      items.map((o) => {
                        const sColor = statusColors[o.status] || { bg: 'var(--surface-bg-secondary)', text: 'var(--text-secondary)' };
                        const isSelected = selectedSummary?.id === o.id;

                        return (
                          <tr
                            key={o.id}
                            className="cursor-pointer transition-colors"
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'rgba(147,51,234,0.08)' : 'transparent',
                            }}
                            onClick={() => void handleSelectOrder(o)}
                          >
                            <td className="px-4 py-4 text-sm font-bold" style={{ color: 'var(--text-accent)' }}>
                              #{o.id}
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {o.user_full_name || "Guest Customer"}
                              </div>
                              <div className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                                {o.user_email}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {o.items && o.items.length > 0 ? (
                                <div className="space-y-1.5">
                                  {o.items.map((it, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                                        {it.quantity}×
                                      </span>
                                      <span className="text-xs font-medium truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                                        {it.product_name}
                                      </span>
                                      {it.color && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          {it.color}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(o.created_at)}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap"
                                style={{ backgroundColor: sColor.bg, color: sColor.text }}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                              {formatPrice(o.total)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Order Details & Status Sidebar */}
        <aside
          className="lg:col-span-5 xl:col-span-4 rounded-2xl p-5 shadow-sm h-fit lg:sticky lg:top-24 space-y-5"
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Order Details
            </h3>
            {selectedSummary && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                #{selectedSummary.id}
              </span>
            )}
          </div>

          {!selectedSummary ? (
            <div className="py-12 text-center text-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
              <Package className="w-10 h-10 mx-auto text-purple-400 opacity-60" />
              <p>Select any order from the table to view the ordered products, stock, and customer address.</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Ordered Products Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-accent)' }}>
                  Ordered Products ({orderDetail?.items.length || 0})
                </h4>
                <div className="space-y-2.5">
                  {orderDetail?.items.map((item, idx) => {
                    const imgUrl = getProductImageUrl(item.product_image);
                    const stock = item.current_stock;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                        style={{ backgroundColor: 'var(--surface-bg-secondary)', border: '1px solid var(--border-color)' }}
                      >
                        <img
                          src={imgUrl}
                          alt={item.product_name}
                          className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 border border-slate-200 dark:border-slate-800"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {item.product_name}
                            </span>
                            {item.product_id && (
                              <Link
                                to={`/shop/${item.product_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-purple-500 hover:text-purple-600 p-0.5"
                                title="View in store"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                          <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                            <span>Qty: <strong className="text-purple-600 font-bold">{item.quantity}</strong></span>
                            <span>·</span>
                            <span>{formatPrice(item.unit_price)}</span>
                            {item.color && (
                              <>
                                <span>·</span>
                                <span className="font-semibold">{item.color}</span>
                              </>
                            )}
                          </div>
                          {/* Stock Indicator */}
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                stock == null
                                  ? 'text-slate-400'
                                  : stock > 5
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                  : stock > 0
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              }`}
                            >
                              {stock == null ? "Stock: N/A" : `${stock} units remaining in stock`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping & Customer Details */}
              <div className="rounded-xl p-3.5 space-y-2 text-xs" style={{ backgroundColor: 'var(--surface-bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                  <User className="w-3.5 h-3.5 text-purple-500" />
                  <span>{orderDetail?.ship_full_name || orderDetail?.user_full_name || "Customer"}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Mail className="w-3.5 h-3.5" />
                  <span>{orderDetail?.contact_email || orderDetail?.user_email}</span>
                </div>
                {orderDetail?.contact_phone && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Phone className="w-3.5 h-3.5" />
                    <span>{orderDetail.contact_phone}</span>
                  </div>
                )}
                {orderDetail?.ship_address && (
                  <div className="flex items-start gap-2 pt-1" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {orderDetail.ship_address}, {orderDetail.ship_city}, {orderDetail.ship_state} {orderDetail.ship_zip}
                    </span>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="text-xs space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPrice(orderDetail?.subtotal)}</span>
                </div>
                {Number(orderDetail?.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatPrice(orderDetail?.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span>{Number(orderDetail?.shipping_fee || 0) === 0 ? "Free" : formatPrice(orderDetail?.shipping_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1" style={{ color: 'var(--text-accent)', borderTop: '1px solid var(--border-color)' }}>
                  <span>Total</span>
                  <span>{formatPrice(orderDetail?.total)}</span>
                </div>
              </div>

              {/* Status & Tracking update */}
              <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Update Order Status
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                    style={{
                      backgroundColor: 'var(--surface-bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Tracking Number (Optional)
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. TRK-98234123"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full rounded-xl pl-9 pr-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                      style={{
                        backgroundColor: 'var(--surface-bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void applyStatus()}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {updating ? "Saving Changes…" : "Update Order & Restock Status"}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

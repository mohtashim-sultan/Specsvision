import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Filter, Hash } from "lucide-react";
import { fetchAdminOrders, patchAdminOrderStatus } from "../../api/adminApi";
import type { AdminOrderSummary } from "../../types/api";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
  processing: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6" },
  shipped: { bg: "rgba(147,51,234,0.12)", text: "#9333ea" },
  delivered: { bg: "rgba(34,197,94,0.12)", text: "#22c55e" },
  cancelled: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
};

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<AdminOrderSummary | null>(null);
  const [nextStatus, setNextStatus] = useState<string>("");
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

  async function applyStatus() {
    if (!selected || !nextStatus) return;
    setUpdating(true);
    try {
      await patchAdminOrderStatus(selected.id, nextStatus);
      toast.success("Order updated");
      setSelected(null);
      setNextStatus("");
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
            Orders
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Total: {total} orders
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Orders Table */}
        <div className="lg:col-span-2">
          <div
            className="overflow-hidden rounded-2xl shadow-sm"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg-secondary)' }}>
                      {["ID", "Customer", "Date", "Status", "Total"].map((h) => (
                        <th
                          key={h}
                          className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${h === "Total" ? "text-right" : ""}`}
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
                        <td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      items.map((o) => {
                        const sColor = statusColors[o.status] || { bg: 'var(--surface-bg-secondary)', text: 'var(--text-secondary)' };
                        return (
                          <tr
                            key={o.id}
                            className="cursor-pointer transition-colors"
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: selected?.id === o.id ? 'var(--surface-bg-secondary)' : 'transparent',
                            }}
                            onClick={() => {
                              setSelected(o);
                              setNextStatus("");
                            }}
                            onMouseEnter={e => {
                              if (selected?.id !== o.id) e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)';
                            }}
                            onMouseLeave={e => {
                              if (selected?.id !== o.id) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-accent)' }}>
                              #{o.id}
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {o.user_full_name || "—"}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {o.user_email}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(o.created_at)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                                style={{ backgroundColor: sColor.bg, color: sColor.text }}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
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

        {/* Update Status Sidebar */}
        <aside
          className="rounded-2xl p-5 shadow-sm h-fit lg:sticky lg:top-24"
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Update Status
          </h3>
          {!selected ? (
            <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              Select an order from the table to update its status.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--surface-bg-secondary)' }}
              >
                <Hash className="h-4 w-4" style={{ color: 'var(--text-accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Order #{selected.id}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Current status
                </span>
                <div className="mt-1">
                  <span
                    className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                    style={{
                      backgroundColor: (statusColors[selected.status] || { bg: 'var(--surface-bg-secondary)' }).bg,
                      color: (statusColors[selected.status] || { text: 'var(--text-secondary)' }).text,
                    }}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  New status
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                  style={{
                    backgroundColor: 'var(--surface-bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Choose…</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!nextStatus || updating}
                onClick={() => void applyStatus()}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
              >
                {updating ? "Updating…" : "Apply"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

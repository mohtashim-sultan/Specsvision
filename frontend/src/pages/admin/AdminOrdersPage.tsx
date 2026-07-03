import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchAdminOrders, patchAdminOrderStatus } from "../../api/adminApi";
import type { AdminOrderSummary } from "../../types/api";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

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
    <div className="mx-auto max-w-7xl space-y-lg p-gutter lg:p-xl">
      <div>
        <h2 className="font-display text-headline-lg text-on-surface">Orders</h2>
        <p className="mt-xs font-body text-body-md text-on-surface-variant">Total: {total}</p>
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <label className="font-label text-label-sm text-on-surface-variant">Status filter</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-sm font-label text-label-sm"
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
            {loading ? (
              <p className="p-md text-on-surface-variant">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high">
                      <th className="px-md py-sm font-label text-label-md text-on-surface-variant">ID</th>
                      <th className="px-md py-sm font-label text-label-md text-on-surface-variant">Customer</th>
                      <th className="px-md py-sm font-label text-label-md text-on-surface-variant">Date</th>
                      <th className="px-md py-sm font-label text-label-md text-on-surface-variant">Status</th>
                      <th className="px-md py-sm text-right font-label text-label-md text-on-surface-variant">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {items.map((o) => (
                      <tr
                        key={o.id}
                        className={`cursor-pointer hover:bg-surface-container-low ${selected?.id === o.id ? "bg-surface-container-low" : ""}`}
                        onClick={() => {
                          setSelected(o);
                          setNextStatus("");
                        }}
                      >
                        <td className="px-md py-md font-label text-label-md text-primary">#{o.id}</td>
                        <td className="px-md py-md">
                          <div className="font-body text-body-md font-medium">{o.user_full_name || "—"}</div>
                          <div className="font-label text-label-sm text-outline">{o.user_email}</div>
                        </td>
                        <td className="px-md py-md font-body text-body-md text-on-surface-variant">{formatDate(o.created_at)}</td>
                        <td className="px-md py-md">
                          <span className="rounded-full bg-surface-container-high px-sm py-xs font-label text-label-sm capitalize text-on-surface">
                            {o.status}
                          </span>
                        </td>
                        <td className="px-md py-md text-right font-body text-body-md font-semibold">{formatPrice(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-md shadow-sm">
          <h3 className="font-headline text-headline-md text-on-surface">Update status</h3>
          {!selected ? (
            <p className="mt-md font-body text-body-md text-on-surface-variant">Select an order from the table.</p>
          ) : (
            <div className="mt-md space-y-md">
              <p className="font-label text-label-sm text-outline">Order #{selected.id}</p>
              <p className="font-body text-body-md">
                Current: <span className="font-semibold capitalize">{selected.status}</span>
              </p>
              <div>
                <label className="mb-xs block font-label text-label-sm text-on-surface-variant">New status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm"
                >
                  <option value="">Choose…</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!nextStatus || updating}
                onClick={() => void applyStatus()}
                className="w-full rounded-xl bg-primary py-sm font-label text-label-md text-on-primary disabled:opacity-50"
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

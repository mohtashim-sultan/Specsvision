import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchAdminStats } from "../../api/adminApi";
import type { AdminStats } from "../../types/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchAdminStats();
        if (!cancelled) setStats(s);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load stats");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-lg p-gutter lg:p-xl">
      <div className="flex flex-col justify-between gap-md sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Dashboard</h2>
          <p className="mt-xs font-body text-body-md text-on-surface-variant">Operational overview</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-xs rounded-full bg-gradient-to-r from-primary-container to-secondary-container px-md py-sm font-label text-label-md text-white shadow-md"
        >
          New product
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Products" value={stats?.product_count ?? "—"} />
        <MetricCard label="Orders" value={stats?.order_count ?? "—"} />
        <MetricCard label="Active Customers" value={stats?.total_users ?? "—"} accent="text-purple-600 font-bold" />
        <MetricCard label="Total Revenue" value={stats?.total_sales ? `$${Number(stats.total_sales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} accent="text-green-600 font-bold" />
        <MetricCard label="Low stock (under 10)" value={stats?.low_stock_count ?? "—"} accent="text-amber-600" />
        <MetricCard label="Out of stock" value={stats?.out_of_stock_count ?? "—"} accent="text-rose-600" />
      </section>

      <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-md shadow-sm">
        <h3 className="font-headline text-headline-md text-on-surface">Orders by status</h3>
        <p className="mt-xs font-body text-body-md text-on-surface-variant">Live counts from the database</p>
        <ul className="mt-md space-y-sm font-label text-label-sm">
          {stats && Object.keys(stats.orders_by_status).length > 0 ? (
            Object.entries(stats.orders_by_status).map(([k, v]) => (
              <li key={k} className="flex justify-between border-b border-outline-variant/30 py-xs last:border-0">
                <span className="text-on-surface-variant">{k}</span>
                <span className="font-semibold text-on-surface">{v}</span>
              </li>
            ))
          ) : (
            <li className="text-on-surface-variant">No orders yet</li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
        <h3 className="font-headline text-headline-md text-gray-900 font-bold">Revenue & User Analytics</h3>
        <p className="mt-1 font-body text-body-md text-gray-500">Real-time statistics fetched directly from SpecsVision transactions database.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Gross Sales Volume</span>
            <p className="text-2xl font-extrabold text-green-950 mt-1">
              {stats?.total_sales ? `$${Number(stats.total_sales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
            </p>
          </div>
          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Registered Accounts</span>
            <p className="text-2xl font-extrabold text-purple-950 mt-1">
              {stats?.total_users ?? 0} active users
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-md shadow-sm">
      <p className="font-label text-label-md text-on-surface-variant">{label}</p>
      <p className={`mt-sm font-display text-headline-lg ${accent ?? "text-on-surface"}`}>{value}</p>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, TrendingUp, Users, Package, Receipt, AlertTriangle, XCircle } from "lucide-react";
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

  const metrics = [
    {
      label: "Products",
      value: stats?.product_count ?? "—",
      icon: Package,
      iconBg: "from-violet-500 to-purple-600",
      iconColor: "text-white",
    },
    {
      label: "Orders",
      value: stats?.order_count ?? "—",
      icon: Receipt,
      iconBg: "from-blue-500 to-cyan-500",
      iconColor: "text-white",
    },
    {
      label: "Active Customers",
      value: stats?.total_users ?? "—",
      icon: Users,
      iconBg: "from-emerald-500 to-green-500",
      iconColor: "text-white",
    },
    {
      label: "Total Revenue",
      value: stats?.total_sales
        ? `PKR ${Number(stats.total_sales).toLocaleString()}`
        : "—",
      icon: TrendingUp,
      iconBg: "from-amber-500 to-orange-500",
      iconColor: "text-white",
    },
    {
      label: "Low Stock (under 10)",
      value: stats?.low_stock_count ?? "—",
      icon: AlertTriangle,
      iconBg: "from-yellow-500 to-amber-500",
      iconColor: "text-white",
    },
    {
      label: "Out of Stock",
      value: stats?.out_of_stock_count ?? "—",
      icon: XCircle,
      iconBg: "from-red-500 to-rose-500",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Dashboard
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Operational overview of your store
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New product
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, iconBg }) => (
          <div
            key={label}
            className="rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {value}
                </p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Orders by Status */}
      <section
        className="rounded-2xl p-5 sm:p-6 shadow-sm"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Orders by Status
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Live counts from the database
        </p>
        <ul className="mt-4 space-y-0 divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {stats && Object.keys(stats.orders_by_status).length > 0 ? (
            Object.entries(stats.orders_by_status).map(([k, v]) => (
              <li
                key={k}
                className="flex justify-between py-3 first:pt-0 last:pb-0"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{v}</span>
              </li>
            ))
          ) : (
            <li className="py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No orders yet</li>
          )}
        </ul>
      </section>

      {/* Revenue & User Analytics */}
      <section
        className="rounded-2xl p-5 sm:p-6 shadow-sm"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Revenue & User Analytics
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Real-time statistics from SpecsVision transactions database
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--surface-bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Gross Sales Volume
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.total_sales
                ? `PKR ${Number(stats.total_sales).toLocaleString()}`
                : "PKR 0"}
            </p>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--surface-bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Registered Accounts
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {stats?.total_users ?? 0}{" "}
              <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>active users</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

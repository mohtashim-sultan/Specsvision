import React, { useEffect, useState } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Star } from "lucide-react";
import toast from "react-hot-toast";
import { fetchAdminAnalytics } from "../../api/adminApi";
import type { AdminAnalytics } from "../../types/api";

const ACCENT = "#9333ea";
const SENTIMENT_COLORS: Record<string, string> = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444" };

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{title}</h3>
      {children}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  labelWidth?: string;
  accentColor?: string;
}

// Senior developer clean horizontal bar chart with separate value column (never wraps or clips)
function BarChart({
  data,
  format,
  labelWidth = "w-20",
  accentColor = ACCENT,
}: BarChartProps) {
  if (data.length === 0) return <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No data yet.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = max > 0 ? Math.min(100, Math.round((d.value / max) * 100)) : 0;
        const formattedValue = format ? format(d.value) : d.value.toLocaleString();

        return (
          <div key={i} className="flex items-center gap-3 text-xs group">
            <span
              className={`${labelWidth} shrink-0 truncate font-medium`}
              style={{ color: "var(--text-secondary)" }}
              title={d.label}
            >
              {d.label}
            </span>
            <div
              className="flex-1 h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--surface-bg-secondary)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: accentColor,
                  minWidth: d.value > 0 ? "6px" : "0px",
                }}
              />
            </div>
            <span
              className="shrink-0 text-right font-semibold text-xs tabular-nums whitespace-nowrap min-w-[5.5rem]"
              style={{ color: "var(--text-primary)" }}
            >
              {formattedValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminAnalytics()
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8" style={{ color: "var(--text-muted)" }}>Loading analytics…</div>;
  if (!data) return <div className="p-8" style={{ color: "var(--text-muted)" }}>No analytics available.</div>;

  const totalReviews = Object.values(data.rating_distribution).reduce((a, b) => a + b, 0);
  const totalSentiment = Object.values(data.sentiment_breakdown).reduce((a, b) => a + b, 0);

  const stats = [
    { label: "Total Revenue", value: `PKR ${Number(data.revenue_total).toLocaleString()}`, Icon: DollarSign },
    { label: "Total Orders", value: String(data.orders_total), Icon: ShoppingBag },
    { label: "Reviews", value: String(totalReviews), Icon: Star },
    { label: "Days with Sales", value: String(data.sales_by_day.length), Icon: TrendingUp },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Sales, popularity, and review sentiment.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
            <Icon className="w-5 h-5 mb-2" style={{ color: "var(--text-accent)" }} />
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue by day">
          <BarChart
            data={data.sales_by_day.map((s) => ({ label: s.date.slice(5), value: Number(s.revenue) }))}
            format={(n) => `PKR ${Math.round(n).toLocaleString()}`}
            labelWidth="w-16"
          />
        </Card>

        <Card title="Top products (units sold)">
          <BarChart
            data={data.top_products.map((p) => ({ label: p.name, value: p.units_sold }))}
            format={(n) => `${n.toLocaleString()} units`}
            labelWidth="w-28 sm:w-36"
          />
        </Card>

        <Card title="Rating distribution">
          <BarChart
            data={[5, 4, 3, 2, 1].map((star) => ({ label: `${star} ★`, value: data.rating_distribution[String(star)] ?? 0 }))}
            format={(n) => `${n}`}
            labelWidth="w-12"
          />
        </Card>

        <Card title="Review sentiment">
          {totalSentiment === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex h-4 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-bg-secondary)" }}>
                {(["positive", "neutral", "negative"] as const).map((k) => {
                  const pct = ((data.sentiment_breakdown[k] ?? 0) / totalSentiment) * 100;
                  return pct > 0 ? <div key={k} style={{ width: `${pct}%`, backgroundColor: SENTIMENT_COLORS[k] }} /> : null;
                })}
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                {(["positive", "neutral", "negative"] as const).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SENTIMENT_COLORS[k] }} />
                    {k[0].toUpperCase() + k.slice(1)} · {data.sentiment_breakdown[k] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

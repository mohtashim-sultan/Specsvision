import React, { useEffect, useState } from "react";
import { Search, Mail, ShoppingBag, Star, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { fetchAdminUsers } from "../../api/adminApi";
import type { AdminUser } from "../../types/api";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setOffset(0);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminUsers({ q: search || undefined, offset, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [search, offset]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Users</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{total} registered customer{total === 1 ? "" : "s"}.</p>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email"
          className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
          style={{ backgroundColor: "var(--surface-bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                <th className="text-left font-semibold px-4 py-3">Customer</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell"><Calendar className="inline w-3.5 h-3.5 mr-1" />Joined</th>
                <th className="text-right font-semibold px-4 py-3"><ShoppingBag className="inline w-3.5 h-3.5 mr-1" />Orders</th>
                <th className="text-right font-semibold px-4 py-3">Spent</th>
                <th className="text-right font-semibold px-4 py-3 hidden sm:table-cell"><Star className="inline w-3.5 h-3.5 mr-1" />Reviews</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: "var(--text-muted)" }}>No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(u.full_name || u.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{u.full_name || "—"}</p>
                          <p className="text-xs flex items-center gap-1 truncate" style={{ color: "var(--text-muted)" }}><Mail className="w-3 h-3" />{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{u.order_count}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-accent)" }}>${Number(u.total_spent).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{u.review_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="px-4 py-2 rounded-lg font-semibold disabled:opacity-40" style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Previous</button>
          <span style={{ color: "var(--text-muted)" }}>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
          <button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="px-4 py-2 rounded-lg font-semibold disabled:opacity-40" style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Next</button>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { deleteAdminProduct, fetchAdminProducts } from "../../api/adminApi";
import type { Product } from "../../types/api";

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return `Rs. ${n.toLocaleString()}`;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminProducts();
      setProducts(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = products.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      (p.category && p.category.toLowerCase().includes(s))
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Product Inventory
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage catalog and stock
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--surface-bg-secondary)', color: 'var(--text-muted)' }}>
              {filtered.length} / {products.length} product{products.length !== 1 ? "s" : ""}
            </span>
          )}
          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </div>
      </div>

      {/* Search */}
      <div
        className="rounded-2xl p-4 shadow-sm"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            placeholder="Search name, SKU, category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
            style={{
              backgroundColor: 'var(--surface-bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Table */}
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
            <table className="w-full border-collapse text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg-secondary)' }}>
                  {["Product", "SKU", "Category", "Price", "Stock", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${h === "Actions" ? "text-right" : ""}`}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      {products.length === 0
                        ? 'No products yet. Click "Add product" to create one.'
                        : "No products match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                      <td className="px-5 py-4 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.category || "—"}</td>
                      <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatPrice(p.price)}</td>
                      <td className="px-5 py-4 text-sm">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: p.stock_quantity <= 0 ? 'rgba(239,68,68,0.1)' : p.stock_quantity < 10 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                            color: p.stock_quantity <= 0 ? '#ef4444' : p.stock_quantity < 10 ? '#f59e0b' : '#22c55e',
                          }}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/products/${p.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ color: 'var(--text-accent)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 transition-colors"
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={async () => {
                              if (!window.confirm(`Delete ${p.name}?`)) return;
                              try {
                                await deleteAdminProduct(p.id);
                                toast.success("Deleted");
                                await load();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Delete failed");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

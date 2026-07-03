import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteAdminProduct, fetchAdminProducts } from "../../api/adminApi";
import type { Product } from "../../types/api";

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
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
      <div className="flex flex-col justify-between gap-md md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Product inventory</h2>
          <p className="mt-xs font-body text-body-md text-on-surface-variant">Manage catalog and stock</p>
        </div>
        <div className="flex items-center gap-md">
          {!loading && (
            <span className="font-label text-label-sm text-on-surface-variant">{filtered.length} / {products.length} product{products.length !== 1 ? "s" : ""}</span>
          )}
          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-sm rounded-xl bg-gradient-to-r from-primary-container to-secondary-container px-lg py-sm font-label text-label-md text-white shadow-md"
          >
            Add product
          </Link>
        </div>

      <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-md shadow-sm">
        <input
          type="search"
          placeholder="Search name, SKU, category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm font-body text-body-md outline-none focus:ring-2 focus:ring-primary-container"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
        {loading ? (
          <p className="p-md text-on-surface-variant">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high">
                  <th className="px-md py-md font-label text-label-md text-on-surface-variant">Product</th>
                  <th className="px-md py-md font-label text-label-md text-on-surface-variant">SKU</th>
                  <th className="px-md py-md font-label text-label-md text-on-surface-variant">Category</th>
                  <th className="px-md py-md font-label text-label-md text-on-surface-variant">Price</th>
                  <th className="px-md py-md font-label text-label-md text-on-surface-variant">Stock</th>
                  <th className="px-md py-md text-right font-label text-label-md text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-md py-xl text-center font-body text-body-md text-on-surface-variant">
                      {products.length === 0 ? "No products yet. Click “Add product” to create one." : "No products match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-low">
                      <td className="px-md py-md font-body text-body-md font-medium text-on-surface">{p.name}</td>
                      <td className="px-md py-md font-body text-body-md text-on-surface-variant">{p.sku}</td>
                      <td className="px-md py-md text-on-surface-variant">{p.category || "—"}</td>
                      <td className="px-md py-md text-on-surface">{formatPrice(p.price)}</td>
                      <td className="px-md py-md text-on-surface">{p.stock_quantity}</td>
                      <td className="px-md py-md text-right">
                        <Link to={`/admin/products/${p.id}`} className="mr-sm font-label text-label-sm text-primary hover:underline">
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="font-label text-label-sm text-error hover:underline"
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
                          Delete
                        </button>
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

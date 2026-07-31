import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, X, ShoppingBag } from "lucide-react";
import { useCompare } from "../context/CompareContext";
import { fetchProduct } from "../api/productsApi";
import { displayImageUrl } from "../utils/storefrontProduct";
import type { Product } from "../types/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

const money = (p: string) => `$${Number(p).toFixed(2)}`;

export default function ComparePage() {
  const { ids, remove, clear } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(ids.map((id) => fetchProduct(id).catch(() => null)))
      .then((res) => {
        if (!cancelled) setProducts(res.filter((p): p is Product => p !== null));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [ids]);

  const rows: { label: string; get: (p: Product) => React.ReactNode }[] = [
    { label: "Price", get: (p) => <span className="font-bold" style={{ color: "var(--text-accent)" }}>{money(p.price)}</span> },
    { label: "Category", get: (p) => p.category || "—" },
    { label: "Rating", get: (p) => (p.review_count ? `${(p.avg_rating ?? 0).toFixed(1)} ★ (${p.review_count})` : "No reviews") },
    { label: "Material", get: (p) => p.material || "—" },
    { label: "Lens Width", get: (p) => (p.lens_width_mm != null ? `${p.lens_width_mm} mm` : "—") },
    { label: "Bridge", get: (p) => (p.bridge_mm != null ? `${p.bridge_mm} mm` : "—") },
    { label: "Temple", get: (p) => (p.temple_mm != null ? `${p.temple_mm} mm` : "—") },
    { label: "Lens Features", get: (p) => p.lens_features || "—" },
    {
      label: "Colors",
      get: (p) =>
        p.colors && p.colors.length ? (
          <span className="inline-flex gap-1 items-center flex-wrap">
            {p.colors.map((c) => (
              <span key={c.name} title={c.name} className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex, borderColor: "var(--border-color)" }} />
            ))}
          </span>
        ) : ("—"),
    },
    { label: "In stock", get: (p) => (p.stock_quantity > 0 ? p.stock_quantity : "Out of stock") },
  ];

  return (
    <main className="py-6 sm:py-8 md:py-12 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <GitCompare className="w-7 h-7" style={{ color: "var(--text-accent)" }} /> Compare Frames
          </h1>
          {ids.length > 0 && (
            <button onClick={clear} className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(147,51,234,0.06)" }}>
              <ShoppingBag className="w-10 h-10" style={{ color: "var(--text-accent)" }} />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Nothing to compare</h3>
            <p className="text-sm max-w-sm mt-1 mb-6" style={{ color: "var(--text-muted)" }}>Add frames using the compare icon on product cards.</p>
            <Link to="/shop" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">Browse Shop</Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border-color)" }}>
            <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-bg)" }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 text-left p-4 align-bottom" style={{ backgroundColor: "var(--surface-bg)", minWidth: 120 }} />
                  {products.map((p) => (
                    <th key={p.id} className="p-4 text-center align-top" style={{ minWidth: 180, borderLeft: "1px solid var(--border-color)" }}>
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={() => remove(p.id)} className="self-end -mb-2" aria-label="Remove"><X className="w-4 h-4" style={{ color: "var(--text-muted)" }} /></button>
                        <Link to={`/shop/${p.id}`}>
                          <img src={displayImageUrl(p)} alt={p.name} className="w-24 h-24 object-cover rounded-xl" />
                        </Link>
                        <Link to={`/shop/${p.id}`} className="font-semibold text-center line-clamp-2" style={{ color: "var(--text-primary)" }}>{p.name}</Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.label} style={{ backgroundColor: ri % 2 ? "var(--surface-bg-secondary)" : "transparent" }}>
                    <td className="sticky left-0 z-10 p-4 font-semibold text-xs uppercase tracking-wide" style={{ backgroundColor: ri % 2 ? "var(--surface-bg-secondary)" : "var(--surface-bg)", color: "var(--text-muted)" }}>{row.label}</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-4 text-center" style={{ color: "var(--text-secondary)", borderLeft: "1px solid var(--border-color)" }}>{row.get(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

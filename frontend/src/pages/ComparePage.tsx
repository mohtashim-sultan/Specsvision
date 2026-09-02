import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, X, ShoppingBag, Eye } from "lucide-react";
import { useCompare } from "../context/CompareContext";
import { fetchProduct } from "../api/productsApi";
import { displayImageUrl } from "../utils/storefrontProduct";
import type { Product } from "../types/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

const money = (p: string) => {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return `Rs. ${n.toLocaleString()}`;
};

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
    { label: "Price", get: (p) => <span className="font-bold text-xs sm:text-sm" style={{ color: "var(--text-accent)" }}>{money(p.price)}</span> },
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
          <span className="inline-flex gap-1 items-center justify-center flex-wrap max-w-[120px] mx-auto">
            {p.colors.map((c) => (
              <span key={c.name} title={c.name} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border shrink-0" style={{ backgroundColor: c.hex, borderColor: "var(--border-color)" }} />
            ))}
          </span>
        ) : ("—"),
    },
    { label: "Stock", get: (p) => (p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : "Out of stock") },
  ];

  return (
    <main className="py-4 sm:py-8 md:py-12 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-8 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <GitCompare className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: "var(--text-accent)" }} /> Compare Frames
            </h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Side-by-side specifications, sizing, and details
            </p>
          </div>
          {ids.length > 0 && (
            <button
              onClick={clear}
              className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors hover:bg-purple-500/10"
              style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
            >
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(147,51,234,0.06)" }}>
              <ShoppingBag className="w-10 h-10" style={{ color: "var(--text-accent)" }} />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Nothing to compare</h3>
            <p className="text-xs sm:text-sm max-w-sm mt-1 mb-6" style={{ color: "var(--text-muted)" }}>Add frames using the compare icon on product cards.</p>
            <Link to="/shop" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md">Browse Shop</Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="sm:hidden text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <span>👉 Swipe sideways to view all frames</span>
            </p>

            <div
              className="overflow-x-auto rounded-2xl shadow-sm custom-scrollbar overscroll-contain border"
              style={{ borderColor: "var(--border-color)" }}
            >
              <table className="w-full text-xs sm:text-sm border-collapse" style={{ backgroundColor: "var(--surface-bg)" }}>
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-20 text-left p-2.5 sm:p-4 align-bottom shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]"
                      style={{
                        backgroundColor: "var(--surface-bg)",
                        minWidth: 100,
                        maxWidth: 130,
                        borderRight: "1px solid var(--border-color)",
                      }}
                    >
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Specification
                      </span>
                    </th>
                    {products.map((p) => (
                      <th
                        key={p.id}
                        className="p-2.5 sm:p-4 text-center align-top border-l"
                        style={{
                          minWidth: 135,
                          maxWidth: 200,
                          borderColor: "var(--border-color)",
                        }}
                      >
                        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => remove(p.id)}
                            className="self-end p-1 rounded-full hover:bg-red-500/10 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center -mr-1 -mt-1"
                            aria-label={`Remove ${p.name}`}
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                          <Link to={`/shop/${p.id}`} className="block relative group">
                            <img
                              src={displayImageUrl(p)}
                              alt={p.name}
                              className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-xl border shadow-sm group-hover:scale-105 transition-transform"
                              style={{ borderColor: "var(--border-color)" }}
                            />
                          </Link>
                          <Link
                            to={`/shop/${p.id}`}
                            className="font-bold text-xs sm:text-sm text-center line-clamp-2 hover:underline leading-snug"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {p.name}
                          </Link>
                          <Link
                            to={`/try-on/${p.id}`}
                            className="mt-1 flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold shadow-sm active:scale-95 transition-all"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Try-On</span>
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr
                      key={row.label}
                      className="border-t"
                      style={{
                        backgroundColor: ri % 2 ? "rgba(147,51,234,0.02)" : "transparent",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      <td
                        className="sticky left-0 z-20 p-2.5 sm:p-4 font-semibold text-[10px] sm:text-xs uppercase tracking-wider shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]"
                        style={{
                          backgroundColor: ri % 2 ? "var(--surface-bg-secondary)" : "var(--surface-bg)",
                          color: "var(--text-muted)",
                          borderRight: "1px solid var(--border-color)",
                        }}
                      >
                        {row.label}
                      </td>
                      {products.map((p) => (
                        <td
                          key={p.id}
                          className="p-2.5 sm:p-4 text-center border-l text-xs sm:text-sm font-medium"
                          style={{
                            color: "var(--text-secondary)",
                            borderColor: "var(--border-color)",
                          }}
                        >
                          {row.get(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


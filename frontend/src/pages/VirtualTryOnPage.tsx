import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchProducts } from "../api/productsApi";
import TryOnViewer, { type TryOnStatus, type TryOnViewerHandle } from "../components/ar/TryOnViewer";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import type { Product } from "../types/api";
import { displayImageUrl } from "../utils/storefrontProduct";
import { API_BASE } from "../config/env";

function statusLabel(s: TryOnStatus): string {
  switch (s) {
    case "loading":  return "Starting…";
    case "ready":    return "Ready";
    case "tracking": return "Tracking ✓";
    case "no-face":  return "No face";
    case "error":    return "Error";
    default:         return "";
  }
}

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export default function VirtualTryOnPage() {
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const navigate   = useNavigate();
  const viewerRef  = useRef<TryOnViewerHandle>(null);

  const [products,       setProducts]       = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [arStatus,       setArStatus]       = useState<TryOnStatus>("loading");
  const [hasConsent,     setHasConsent]     = useState(() =>
    localStorage.getItem("specsvision_cam_consent") === "true",
  );

  const [scaleOffset,    setScaleOffset]    = useState(1.0);
  const [showAdjust,     setShowAdjust]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCatalog(true);
      try {
        const list = await fetchProducts();
        if (!cancelled) setProducts(list);
      } catch {
        if (!cancelled) toast.error("Could not load frames");
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    const fromRoute = routeProductId ? parseInt(routeProductId, 10) : NaN;
    if (Number.isFinite(fromRoute) && products.some((p) => p.id === fromRoute)) {
      setSelectedId(fromRoute);
      return;
    }
    if (selectedId === null) setSelectedId(products[0].id);
  }, [products, routeProductId, selectedId]);

  const selected = useMemo(() => products.find((p) => p.id === selectedId) ?? null, [products, selectedId]);

  const frameSrc = useMemo(() => {
    if (selected?.front_view?.trim()) {
      const path = selected.front_view.trim();
      return path.startsWith("/") ? `${API_BASE}${path}` : path;
    }
    return null;
  }, [selected]);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    navigate(`/try-on/${id}`, { replace: true });
  }, [navigate]);

  const handleSnapshot = () => {
    const dataUrl = viewerRef.current?.captureSnapshot();
    if (!dataUrl) { toast.error("Snapshot unavailable — wait for camera"); return; }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `specsvision-tryon-${selected?.sku ?? "frame"}.png`;
    a.click();
    toast.success("📸 Snapshot saved!");
  };

  const handleStatusChange = useCallback((s: TryOnStatus) => setArStatus(s), []);

  const statusColor = arStatus === "tracking" ? "bg-green-400" : arStatus === "error" ? "bg-red-400" : "bg-amber-400";

  return (
    <main className="flex h-[calc(100vh-5rem)] overflow-hidden bg-slate-950 text-white md:flex-row flex-col tryon-studio">

      <section className="relative flex-1 min-h-0 bg-slate-950 overflow-hidden">

        {hasConsent ? (
          <div className="absolute inset-0">
            <TryOnViewer
              ref={viewerRef}
              frameSrc={frameSrc}
              onStatusChange={handleStatusChange}
              scaleOffset={scaleOffset}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-6">
            <div className="max-w-md w-full space-y-8 text-center">
              <div className="inline-flex rounded-3xl bg-purple-500/10 p-6 text-purple-400 ring-1 ring-purple-500/20">
                <MaterialIcon name="videocam" className="!text-5xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Camera Privacy Consent</h2>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                  To virtually try on glasses, we need camera access. All AI face tracking happens
                  locally in your browser — no video or biometric data is ever uploaded or stored.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-900 transition-colors"
                >
                  Back to Shop
                </button>
                <button
                  type="button"
                  onClick={() => { localStorage.setItem("specsvision_cam_consent", "true"); setHasConsent(true); }}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 transition-all"
                >
                  Agree & Enable Camera
                </button>
              </div>
            </div>
          </div>
        )}

        {hasConsent && (
          <>
            <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md shadow-xl max-w-[220px]">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-purple-400">Now Trying</span>
              <h2 className="mt-0.5 truncate text-sm font-bold text-white leading-tight">
                {selected?.name ?? "Select a frame"}
              </h2>
              {selected && (
                <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                  {selected.category} · {formatPrice(selected.price)}
                </p>
              )}
            </div>

            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md border border-white/10">
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor} ${arStatus === "tracking" ? "animate-pulse" : ""}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{statusLabel(arStatus)}</span>
            </div>

            {showAdjust && (
              <div className="absolute left-4 bottom-20 z-20 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                    <MaterialIcon name="tune" className="!text-sm" />
                    Fine-tune Fit
                  </span>
                  <button type="button" onClick={() => setShowAdjust(false)}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-slate-800">
                    <MaterialIcon name="close" className="!text-sm" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Frame Size</span>
                      <span className="text-purple-400 font-bold">{Math.round(scaleOffset * 100)}%</span>
                    </div>
                    <input type="range" min="0.70" max="1.30" step="0.01" value={scaleOffset}
                      onChange={(e) => setScaleOffset(parseFloat(e.target.value))}
                      className="w-full h-1 accent-purple-500 cursor-pointer" />
                  </div>
                  <button type="button" onClick={() => setScaleOffset(1.0)}
                    className="w-full mt-1 rounded-xl border border-slate-700 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
                    Reset to Default
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-5 py-2.5 shadow-2xl backdrop-blur-md">
              <button type="button" onClick={handleSnapshot}
                className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors group">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 group-hover:bg-slate-700 transition-colors">
                  <MaterialIcon name="photo_camera" className="!text-base" />
                </span>
                <span className="text-[9px] font-semibold">Snapshot</span>
              </button>

              <div className="h-8 w-px bg-white/10" />

              <button type="button" onClick={() => setShowAdjust((p) => !p)}
                className={`flex flex-col items-center gap-1 transition-colors ${showAdjust ? "text-purple-400" : "text-slate-300 hover:text-white"}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${showAdjust ? "bg-purple-500/25" : "bg-slate-800/80 hover:bg-slate-700"}`}>
                  <MaterialIcon name="tune" className="!text-base" />
                </span>
                <span className="text-[9px] font-semibold">Adjust</span>
              </button>

              <div className="h-8 w-px bg-white/10" />

              <Link
                to={selected ? `/shop/${selected.id}` : "/shop"}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-xs font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all whitespace-nowrap"
              >
                <MaterialIcon name="shopping_bag" className="!text-sm" />
                Buy Now
              </Link>
            </div>
          </>
        )}
      </section>

      <aside className="hidden md:flex flex-col w-[340px] xl:w-[380px] shrink-0 border-l border-slate-800/60 bg-slate-950/80 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 shrink-0">
          <div>
            <h1 className="text-base font-bold tracking-tight">Try-On Studio</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Select a frame to try it on live</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2">
          {loadingCatalog ? (
            <div className="flex flex-col gap-2 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-[72px] rounded-2xl bg-slate-900/60 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No frames available. <Link to="/shop" className="text-purple-400 hover:underline">Browse shop</Link>
            </div>
          ) : (
            products.map((p) => {
              const active = p.id === selectedId;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 ${
                    active
                      ? "border-purple-500/70 bg-purple-500/10 ring-1 ring-purple-500/20"
                      : "border-slate-800/60 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800">
                    <img src={displayImageUrl(p)} alt={p.name} className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold leading-tight ${active ? "text-white" : "text-slate-200"}`}>{p.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500 truncate">{p.category ?? "Frame"}</p>
                    <p className={`mt-0.5 text-xs font-semibold ${active ? "text-purple-300" : "text-slate-400"}`}>{formatPrice(p.price)}</p>
                  </div>

                  {active && (
                    <div className="shrink-0 h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <MaterialIcon name="check" className="!text-sm text-purple-300" />
                    </div>
                  )}

                  {!active && (
                    <MaterialIcon name="arrow_forward_ios" className="!text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {selected && (
          <div className="shrink-0 px-4 py-4 border-t border-slate-800/60">
            <Link
              to={`/shop/${selected.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all active:scale-95"
            >
              <MaterialIcon name="shopping_bag" className="!text-base" />
              Add to Cart — {formatPrice(selected.price)}
            </Link>
          </div>
        )}
      </aside>

      <section className="md:hidden shrink-0 flex flex-col bg-slate-950 border-t border-slate-800/60 max-h-[35vh]">
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Select Frame</h3>
        </div>

        <div className="flex gap-2.5 overflow-x-auto px-4 pb-3 pt-1 snap-x snap-mandatory">
          {loadingCatalog ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="w-[88px] h-[100px] shrink-0 rounded-xl bg-slate-900 animate-pulse" />
            ))
          ) : (
            products.map((p) => {
              const active = p.id === selectedId;

              return (
                <button key={p.id} type="button" onClick={() => handleSelect(p.id)}
                  className={`relative flex w-[88px] shrink-0 snap-start flex-col rounded-xl border p-1.5 text-left transition-all ${
                    active
                      ? "border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/20"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-800 border border-slate-700">
                    <img src={displayImageUrl(p)} alt={p.name} className="h-full w-full object-cover" />
                    {active && (
                      <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500">
                        <MaterialIcon name="check" className="!text-[9px] text-white" />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[9px] font-bold text-slate-200 px-0.5">{p.name}</p>
                  <p className="truncate text-[8px] text-slate-500 px-0.5">{formatPrice(p.price)}</p>
                </button>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchProducts } from "../api/productsApi";
import TryOnViewer, {
  type TryOnStatus,
  type TryOnViewerHandle,
  type ScanProgressEvent,
} from "../components/ar/TryOnViewer";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import type { Product } from "../types/api";
import { displayImageUrl } from "../utils/storefrontProduct";
import {
  isBestFit,
  SHAPE_GUIDE,
  type FaceShape,
  type FaceShapeResult,
} from "../components/ar/faceShape";
import { API_BASE } from "../config/env";
import LoadingSpinner from "../components/common/LoadingSpinner";

// ── Types & Defaults ──────────────────────────────────────────────────────────

interface Adjustments {
  scale: number;
  templeLength: number; // Z-scale multiplier
  faceStretch: number;  // Y-stretch multiplier (beauty/fit optimization)
  zoom: number;         // Camera crop (1 = fill the screen, >1 = tighter crop on the face)
  x: number;
  y: number;
  z: number;
  rx: number; // Pitch in degrees
  ry: number; // Yaw in degrees
  rz: number; // Roll in degrees
}

// Placement (seat height, forward offset, orientation, temple length) is now handled by the
// landmark head-pose engine + auto temple-fit in TryOnViewer (see the `AR` constants there).
// These sliders are therefore ZEROED nudges on top of that baseline — the frame already sits
// correctly by default. Only per-category scale carries a small default. faceStretch/zoom are
// independent camera-feed effects and are left as-is.
// zoom 1.0 = the camera feed exactly fills the studio (no letterboxing). It used to default
// to 0.82, which shrank the composited feed and left black bars on every screen — worst on
// phones, where it pushed the face into a small box. faceStretch 1.0 keeps the feed
// undistorted; both remain user-adjustable.
const BASELINE: Adjustments = { scale: 0.82, templeLength: 1.0, faceStretch: 1.0, zoom: 1.0, x: 0.0, y: 0.0, z: 0.0, rx: 0.0, ry: 0.0, rz: 0.0 };
const DEFAULT_ADJUSTMENTS: Record<string, Adjustments> = {
  default:  { ...BASELINE },
  wayfarer: { ...BASELINE },
  aviator:  { ...BASELINE, scale: 0.97 },
  cateye:   { ...BASELINE, scale: 0.93 },
  round:    { ...BASELINE },
  oval:     { ...BASELINE },
};

function statusLabel(s: TryOnStatus): string {
  switch (s) {
    case "loading":  return "Starting…";
    case "ready":    return "Ready";
    case "tracking": return "Tracking ✓";
    case "no-face":  return "No Face Detected";
    case "error":    return "Error";
    default:         return "";
  }
}

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return `PKR ${n.toLocaleString()}`;
}

export default function VirtualTryOnPage() {
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const navigate   = useNavigate();
  const viewerRef  = useRef<TryOnViewerHandle>(null);

  // Catalog & UI States
  const [products,           setProducts]           = useState<Product[]>([]);
  const [loadingCatalog,     setLoadingCatalog]     = useState(true);
  const [selectedId,         setSelectedId]         = useState<number | null>(null);
  const [selectedCategory,   setSelectedCategory]   = useState<string>("All");
  const [arStatus,           setArStatus]           = useState<TryOnStatus>("loading");
  const [detectedShape,      setDetectedShape]      = useState<FaceShape | null>(null);
  const [shapeResult,        setShapeResult]        = useState<FaceShapeResult | null>(null);
  const [scanState,          setScanState]          = useState<ScanProgressEvent["state"]>("idle");
  const [scanProgress,       setScanProgress]       = useState<number>(0);
  const [scanMessage,        setScanMessage]        = useState<string>("");
  const [showScanOverlay,    setShowScanOverlay]    = useState<boolean>(false);
  const [showResultModal,    setShowResultModal]    = useState<boolean>(false);
  const [showManualShapeModal, setShowManualShapeModal] = useState<boolean>(false);
  // On a phone the info cards blanketed roughly 40% of the camera view — including the
  // face they describe. They start collapsed to chips there and expand on tap; on
  // desktop there is room, so they are always open.
  const [infoOpen,           setInfoOpen]           = useState(false);
  const [hasConsent,         setHasConsent]         = useState(() =>
    localStorage.getItem("specsvision_cam_consent") === "true",
  );

  // Adjustments & Presets States
  const [showAdjust,         setShowAdjust]         = useState(false);
  const [adjustTab,          setAdjustTab]          = useState<"position" | "rotation" | "scale">("position");
  const [adjustments,        setAdjustments]        = useState<Adjustments>(DEFAULT_ADJUSTMENTS.default);
  const [activePreset,       setActivePreset]       = useState<string | null>(null);

  // Fetch Products
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

  // Sync selectedId with Route Params
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

  const activeBase = useMemo(() => {
    const cat = selected?.category?.toLowerCase().trim() || "default";
    return DEFAULT_ADJUSTMENTS[cat] || DEFAULT_ADJUSTMENTS.default;
  }, [selected]);

  // Load adjustments for the selected product (or fall back to category defaults)
  useEffect(() => {
    if (selectedId === null) return;
    const getInitialAdjustments = (): Adjustments => {
      const saved = localStorage.getItem(`specsvision_adj_v15_${selectedId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved adjustments", e);
        }
      }
      const cat = selected?.category?.toLowerCase().trim() || "default";
      return DEFAULT_ADJUSTMENTS[cat] || DEFAULT_ADJUSTMENTS.default;
    };
    setAdjustments(getInitialAdjustments());
  }, [selectedId, selected]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  // Filter products by selected category, then (once a face shape is detected) float the
  // recommended "best fit" frames to the top so the most flattering options come first.
  const filteredProducts = useMemo(() => {
    const base =
      selectedCategory === "All"
        ? products
        : products.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    if (!detectedShape) return base;
    return [...base].sort((a, b) => {
      const af = isBestFit(a.category, detectedShape) ? 0 : 1;
      const bf = isBestFit(b.category, detectedShape) ? 0 : 1;
      return af - bf;
    });
  }, [products, selectedCategory, detectedShape]);

  // Extract the top 3 best-fit frames to show directly under the Re-scan option
  const bestFitProducts = useMemo(() => {
    if (!detectedShape) return [];
    return products.filter((p) => isBestFit(p.category, detectedShape)).slice(0, 3);
  }, [products, detectedShape]);

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
    if (!dataUrl || dataUrl === "data:," || dataUrl.length < 500) {
      toast.error("Snapshot unavailable — wait for camera");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `specsvision-tryon-${selected?.sku ?? "frame"}.png`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("📸 Snapshot saved!");
    } catch (err) {
      console.error("Snapshot download error:", err);
      toast.error("Could not save snapshot");
    }
  };

  const handleStatusChange = useCallback((s: TryOnStatus) => setArStatus(s), []);

  const handleStartScan = useCallback(() => {
    setShowResultModal(false);
    setShowManualShapeModal(false);
    setShowScanOverlay(true);
    setScanProgress(0);
    setScanMessage("Align your face in the oval and look straight ahead");
    setScanState("aligning");
    viewerRef.current?.startFaceScan();
  }, []);

  const handleCancelScan = useCallback(() => {
    setShowScanOverlay(false);
    setScanState("idle");
    viewerRef.current?.cancelFaceScan();
  }, []);

  const handleScanProgress = useCallback((e: ScanProgressEvent) => {
    setScanState(e.state);
    setScanProgress(e.progress);
    setScanMessage(e.message);
    if (e.state === "completed" && e.result) {
      setShapeResult(e.result);
      setDetectedShape(e.result.shape);
      setTimeout(() => {
        setShowScanOverlay(false);
        setShowResultModal(true);
        toast.success(`Identified: ${e.result?.shape} Face Shape ✨`);
      }, 700);
    }
  }, []);

  const handleManualSelectShape = useCallback((shape: FaceShape) => {
    if (viewerRef.current) {
      const res = viewerRef.current.manualSetShape(shape);
      setShapeResult(res);
      setDetectedShape(shape);
    } else {
      setDetectedShape(shape);
    }
    setShowManualShapeModal(false);
    setShowResultModal(true);
    toast.success(`Face shape set to ${shape}!`);
  }, []);

  // Update a single adjustment value and save to LocalStorage
  // Also clears the active preset since the user is now manually tweaking.
  const updateAdjustment = (key: keyof Adjustments, value: number) => {
    setActivePreset(null);
    setAdjustments((prev) => {
      const next = { ...prev, [key]: value };
      if (selectedId !== null) {
        localStorage.setItem(`specsvision_adj_v15_${selectedId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Apply common calibration presets
  const applyPreset = (presetType: "standard" | "nose-lift" | "nose-lower" | "wide" | "narrow") => {
    const cat = selected?.category?.toLowerCase().trim() || "default";
    const base = DEFAULT_ADJUSTMENTS[cat] || DEFAULT_ADJUSTMENTS.default;

    let next = { ...base };
    switch (presetType) {
      case "nose-lift":
        // Lifts the frame up the nose bridge and pulls it snug/closer to the face.
        next.y += 0.015;
        next.z -= 0.005;  // negative Z = closer to the face (inward)
        next.rx -= 2.0;
        break;
      case "nose-lower":
        // Drops the frame down the nose and lets it sit outward/away from the face.
        next.y -= 0.015;
        next.z += 0.005;  // positive Z = further from the face (outward)
        next.rx += 2.0;
        break;
      case "wide":
        next.scale = Math.min(1.30, next.scale * 1.05);
        break;
      case "narrow":
        next.scale = Math.max(0.70, next.scale * 0.95);
        break;
      case "standard":
      default:
        break;
    }
    setAdjustments(next);
    setActivePreset(presetType);
    if (selectedId !== null) {
      localStorage.setItem(`specsvision_adj_v15_${selectedId}`, JSON.stringify(next));
    }
    toast.success(`Preset "${presetType}" applied!`);
  };

  // Reset current product's adjustments to category defaults
  const resetAllAdjustments = () => {
    const cat = selected?.category?.toLowerCase().trim() || "default";
    const next = DEFAULT_ADJUSTMENTS[cat] || DEFAULT_ADJUSTMENTS.default;
    setAdjustments(next);
    setActivePreset(null);
    if (selectedId !== null) {
      localStorage.removeItem(`specsvision_adj_v15_${selectedId}`);
    }
    toast.success("Adjustments reset to defaults!");
  };

  const statusColor = arStatus === "tracking" ? "bg-emerald-400" : arStatus === "error" ? "bg-red-400" : "bg-amber-400";

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] dark:from-[#020617] dark:to-[#020617] text-white md:flex-row flex-col tryon-studio">
      <style>{`
        /* The studio owns the space below the header. Everything here measures in dvh so
           the shell and its children agree as the mobile address bar shows/hides — mixing
           svh on the parent with dvh on children let the carousel claim more room than the
           parent had allocated, which shifted the layout on every scroll. */
        .tryon-studio { min-height: 0; }
        /* The category <select> is chrome, not a form field: exempt it from the global
           16px-minimum rule that exists to stop iOS zooming on input focus. */
        .tryon-studio select.tryon-chrome-select { font-size: 11px !important; }
        .safe-b { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
        .safe-b-sm { padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); }
        @keyframes scan {
          0% { transform: translateY(-10%); opacity: 0.2; }
          50% { transform: translateY(90%); opacity: 0.8; }
          100% { transform: translateY(-10%); opacity: 0.2; }
        }
        .animate-scan {
          animation: scan 4s ease-in-out infinite;
        }
        @keyframes scanBeam {
          0% { top: 12%; opacity: 0.2; }
          50% { opacity: 1; }
          100% { top: 84%; opacity: 0.2; }
        }
        .animate-scan-beam {
          animation: scanBeam 1.6s ease-in-out infinite alternate;
        }
        /* Frosted, gradient-edged surface for the premium control chrome. */
        .glass-chrome {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(147, 51, 234, 0.20);
          box-shadow: 0 10px 30px -4px rgba(147, 51, 234, 0.15), 0 4px 12px rgba(0,0,0,0.05);
          -webkit-backdrop-filter: blur(16px);
          backdrop-filter: blur(16px);
        }
        .dark .glass-chrome {
          background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(10,10,20,0.75));
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 8px 32px -6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .grab-handle {
          width: 40px; height: 4px; border-radius: 9999px;
          background: rgba(147, 51, 234, 0.3);
          margin: 0 auto 10px;
        }
        .dark .grab-handle {
          background: rgba(255,255,255,0.22);
        }
        @keyframes floatIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .float-in { animation: floatIn 0.35s ease-out both; }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(147, 51, 234, 0.05);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.35);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>

      {/* AR Camera Section */}
      <section className="relative flex-1 min-h-0 bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] dark:from-[#020617] dark:to-[#020617] overflow-hidden flex items-center justify-center">
        {hasConsent ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] dark:from-[#020617] dark:to-[#020617] p-2 sm:p-4">
            {/* Portrait camera mirror — centered horizontally, 3:4 aspect ratio */}
            <div className="relative h-[calc(100%-1.5rem)] md:h-[calc(100%-2.5rem)] aspect-[3/4] max-w-full overflow-hidden bg-slate-950 rounded-2xl md:rounded-3xl border border-purple-500/20 shadow-[0_0_50px_rgba(15,23,42,0.3)] dark:shadow-[0_0_60px_rgba(0,0,0,0.9)]">
              <TryOnViewer
                ref={viewerRef}
                frameSrc={frameSrc}
                onStatusChange={handleStatusChange}
                onFaceShapeDetect={(s) => setDetectedShape((s as FaceShape) ?? null)}
                onFaceShapeResult={(res) => setShapeResult(res)}
                onScanProgress={handleScanProgress}
                scaleOffset={adjustments.scale}
                templeLength={adjustments.templeLength}
                faceStretch={adjustments.faceStretch}
                cameraZoom={adjustments.zoom}
                positionX={adjustments.x}
                positionY={adjustments.y}
                positionZ={adjustments.z}
                rotationX={adjustments.rx}
                rotationY={adjustments.ry}
                rotationZ={adjustments.rz}
              />

              {/* Interactive Guided Face Scanner Overlay — Precision FaceID Stadium Style */}
              {showScanOverlay && (
                <div className="absolute inset-0 z-20 pointer-events-auto overflow-hidden animate-in fade-in duration-300">
                  {/* Scanner Top Bar */}
                  <div className="absolute top-3 inset-x-3 sm:top-5 sm:inset-x-5 flex items-center justify-between z-30 pointer-events-auto">
                    <div className="flex items-center gap-2 rounded-full bg-slate-950/90 border border-purple-500/30 px-3.5 py-1.5 backdrop-blur-md shadow-xl">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
                      </span>
                      <span className="text-[11px] font-bold tracking-wider text-white">
                        Face Shape Scanner
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelScan}
                      className="rounded-full bg-slate-950/90 border border-purple-500/30 p-2 text-white hover:bg-slate-900 transition-colors shadow-xl active:scale-95 cursor-pointer"
                    >
                      <MaterialIcon name="close" className="!text-lg text-white" />
                    </button>
                  </div>

                  {/* Precision Center Face Frame with Smooth White Progress Ring */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative w-[210px] sm:w-[240px] aspect-[3/4] max-w-[68vw] flex items-center justify-center">
                      {/* Smooth SVG Progress Capsule */}
                      <svg
                        className="absolute inset-0 w-full h-full overflow-visible"
                        viewBox="0 0 200 260"
                      >
                        {/* Subtle Guide Frame */}
                        <rect
                          x="10"
                          y="10"
                          width="180"
                          height="240"
                          rx="90"
                          ry="90"
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.25)"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />

                        {/* Smooth Pure White Animated Progress Stroke */}
                        <rect
                          x="10"
                          y="10"
                          width="180"
                          height="240"
                          rx="90"
                          ry="90"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray="720"
                          strokeDashoffset={720 - (720 * (scanProgress || 1)) / 100}
                          className="transition-all duration-150 ease-out"
                          style={{
                            filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))",
                          }}
                        />
                      </svg>

                      {/* 4 Clean Minimalist Corner Ticks */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/90 rounded-tl-xl" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/90 rounded-tr-xl" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/90 rounded-bl-xl" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/90 rounded-br-xl" />

                      {/* Subtle Laser Sweep Bar inside frame */}
                      {scanState === "scanning" && (
                        <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_#ffffff] animate-scan-beam" />
                      )}
                    </div>
                  </div>

                  {/* Bottom Guidance & Clean Progress Bar */}
                  <div className="absolute bottom-5 sm:bottom-7 inset-x-4 flex justify-center z-30 pointer-events-auto">
                    <div className="w-full max-w-xs bg-slate-950/95 border border-purple-500/30 rounded-2xl p-3.5 backdrop-blur-xl text-center shadow-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{scanMessage}</span>
                        <span className="font-mono font-bold text-purple-400 text-xs">
                          {scanState === "scanning" ? `${scanProgress}%` : ""}
                        </span>
                      </div>

                      {/* Clean Progress Track */}
                      <div className="w-full bg-slate-850 rounded-full h-2 overflow-hidden p-0.5 border border-purple-500/20">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-500 h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                          style={{ width: `${Math.max(2, scanProgress)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Holographic Target Scanning Guides when not tracking — directly inside the camera mirror */}
              {!showScanOverlay && (arStatus === "loading" || arStatus === "no-face") && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <div className="absolute inset-6 sm:inset-10 flex flex-col justify-between border border-white/10 rounded-2xl">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-t-2 border-l-2 border-white/40 rounded-tl-xl animate-pulse" />
                      <div className="w-8 h-8 border-t-2 border-r-2 border-white/40 rounded-tr-xl animate-pulse" />
                    </div>
                    
                    {/* Subtle Scan Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scan" />
                    
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-b-2 border-l-2 border-white/40 rounded-bl-xl animate-pulse" />
                      <div className="w-8 h-8 border-b-2 border-r-2 border-white/40 rounded-br-xl animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            {/* Info overlays.
                Phone: a row of compact chips, tappable to reveal the full cards. Desktop:
                the cards themselves, since there is width to spare. */}
            <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[70vw] flex-col gap-2 sm:left-4 sm:top-4 sm:max-w-[240px]">
              {/* Collapsed chips — small screens only, and only while collapsed. */}
              <button
                type="button"
                onClick={() => setInfoOpen((o) => !o)}
                aria-expanded={infoOpen}
                className={`flex items-center gap-1.5 self-start rounded-full border border-purple-200/80 dark:border-purple-500/20 bg-white/90 dark:bg-slate-950/80 px-3 py-1.5 backdrop-blur-md shadow-md active:scale-95 sm:hidden ${infoOpen ? "hidden" : ""}`}
              >
                <MaterialIcon name="visibility" className="!text-sm text-purple-600 dark:text-purple-400" />
                <span className="max-w-[38vw] truncate text-[10px] font-bold text-slate-900 dark:text-white">
                  {selected?.name ?? "Select a frame"}
                </span>
                {detectedShape && (
                  <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 px-1.5 py-0.5 text-[9px] font-bold">
                    {detectedShape}
                  </span>
                )}
                <MaterialIcon name="expand_more" className="!text-sm text-slate-500 dark:text-slate-400" />
              </button>

              {/* Full cards — always on desktop, on phones only once expanded. */}
              <div className={`${infoOpen ? "flex" : "hidden"} flex-col gap-2 sm:flex`}>
                <div className="pointer-events-none rounded-2xl border border-purple-200/80 dark:border-purple-500/25 bg-white/90 dark:bg-slate-950/80 px-3 py-2 backdrop-blur-md shadow-lg dark:shadow-xl sm:px-4 sm:py-3">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Now Trying</span>
                  <h2 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white leading-tight sm:text-sm">
                    {selected?.name ?? "Select a frame"}
                  </h2>
                  {selected && (
                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {selected.category} · {formatPrice(selected.price)}
                    </p>
                  )}
                </div>

                {/* Detected face shape + fit guidance. Clicking opens full details & recommendations. */}
                {detectedShape && (
                  <button
                    type="button"
                    onClick={() => setShowResultModal(true)}
                    className="pointer-events-auto text-left rounded-2xl border border-purple-200/80 dark:border-purple-500/25 bg-white/90 dark:bg-slate-950/80 hover:bg-white dark:hover:bg-slate-900/90 px-3 py-2 backdrop-blur-md shadow-lg dark:shadow-xl animate-in fade-in slide-in-from-left-3 duration-300 sm:px-4 sm:py-3 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <MaterialIcon name="face" className="!text-sm text-purple-600 dark:text-purple-400" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Face Shape</span>
                      </div>
                      <span className="text-[9px] text-purple-600 dark:text-purple-400 group-hover:underline flex items-center gap-0.5 font-medium">
                        Details <MaterialIcon name="chevron_right" className="!text-xs" />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight sm:text-sm">{detectedShape}</p>
                      {shapeResult?.isBeardDetected && (
                        <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 px-1.5 py-0.2 text-[8px] font-semibold">
                          🧔 Beard
                        </span>
                      )}
                    </div>
                    <p className="mt-1 hidden text-[10px] text-slate-600 dark:text-slate-300 leading-snug sm:block">{SHAPE_GUIDE[detectedShape].blurb}</p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400 sm:mt-1.5">
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">Best fit:</span>{" "}
                      {SHAPE_GUIDE[detectedShape].recommend.slice(0, 3).join(", ")}
                    </p>
                  </button>
                )}

                {/* Collapse control, phones only. */}
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="self-start rounded-full border border-purple-200/80 dark:border-purple-500/20 bg-white/90 dark:bg-slate-950/80 px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 backdrop-blur-md active:scale-95 sm:hidden"
                >
                  Hide
                </button>
              </div>
            </div>

            {/* Top-Right Stack: Tracking Pill + Scan Face Shape Button + Desktop 3 Best Fits */}
            <div className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 z-10 flex flex-col items-end gap-1.5 sm:gap-2">
              {/* Tracking Status Pill */}
              <div className="flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-black/70 px-3 py-1.5 backdrop-blur-md border border-purple-200/80 dark:border-white/10 shadow-lg sm:px-3.5">
                <span className={`h-2 w-2 rounded-full ${statusColor} ${arStatus === "tracking" ? "animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" : ""}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{statusLabel(arStatus)}</span>
              </div>

              {/* Scan Face Shape / Re-scan Button — Same Vibrant Gradient as Buy Now */}
              {!showScanOverlay && (
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-3.5 py-1.5 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 text-white text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                >
                  <MaterialIcon name="auto_awesome" className="!text-xs text-white" />
                  <span>{detectedShape ? `${detectedShape} • Re-scan` : "Scan Face Shape"}</span>
                </button>
              )}

              {/* 3 Best Fit Frames for Face Shape — Visible on both mobile and desktop under Re-scan */}
              {!showScanOverlay && detectedShape && bestFitProducts.length > 0 && (
                <div className="flex flex-col gap-1 sm:gap-1.5 p-1.5 sm:p-2.5 rounded-2xl border border-purple-200/80 dark:border-purple-500/30 bg-white/95 dark:bg-slate-950/85 backdrop-blur-xl shadow-xl w-[145px] sm:w-[200px] animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <span>✨</span> 3 Best Fits
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
                      {detectedShape}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    {bestFitProducts.map((p) => {
                      const isSelected = p.id === selectedId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            viewerRef.current?.resumeTryOn();
                            handleSelect(p.id);
                          }}
                          className={`flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border border-purple-500 bg-purple-100/80 dark:bg-purple-500/15 ring-1 ring-purple-500/30 text-purple-950 dark:text-white font-bold shadow-md"
                              : "bg-purple-50/70 hover:bg-purple-100/70 dark:bg-slate-900/60 dark:hover:bg-slate-850 text-slate-900 dark:text-white border border-purple-100 dark:border-slate-800"
                          }`}
                        >
                          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700/50">
                            <img src={displayImageUrl(p)} alt={p.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[9px] sm:text-[10px] truncate leading-tight ${isSelected ? "text-purple-900 dark:text-purple-200 font-bold" : "text-slate-900 dark:text-white font-medium"}`}>{p.name}</p>
                            <p className={`text-[7px] sm:text-[8px] truncate ${isSelected ? "text-purple-700 dark:text-purple-300 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>{formatPrice(p.price)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Scrim behind the mobile bottom sheet — without it taps landed on the frame
                carousel underneath, and there was no way to dismiss but the small ✕.
                Background is transparent so the live webcam feed stays visible and usable
                while the drawer is open — a dark scrim would hide the very face you're
                adjusting the glasses on. */}
            {showAdjust && (
              <div
                role="presentation"
                onClick={() => setShowAdjust(false)}
                className="fixed inset-0 z-20 animate-in fade-in duration-200 md:hidden"
              />
            )}

            {/* Glassmorphic Settings Drawer (Adjustments) */}
            {showAdjust && (
              <div className="glass-chrome fixed md:absolute bottom-0 left-0 right-0 md:left-4 md:top-4 md:bottom-4 z-30 md:z-20 w-full md:w-[340px] max-h-[52dvh] md:max-h-none rounded-t-3xl md:rounded-3xl px-4 pt-2 md:pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-5 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom md:slide-in-from-left-5 duration-300 md:duration-200 text-slate-900 dark:text-white">
                {/* Grab bar for mobile bottom sheet */}
                <div className="grab-handle md:hidden shrink-0" />

                <div className="flex items-center justify-between pb-2 md:pb-3 border-b border-purple-100 dark:border-slate-800/80 shrink-0">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    <MaterialIcon name="tune" className="!text-base" />
                    Virtual Fit Adjustments
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdjust(false)}
                    className="rounded-full p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-slate-850 transition-colors"
                  >
                    <MaterialIcon name="close" className="!text-base" />
                  </button>
                </div>

                {/* Adjustment Tabs */}
                <div className="grid grid-cols-3 gap-1 my-2 md:my-3 bg-purple-50 dark:bg-slate-900/60 p-1 rounded-2xl shrink-0 border border-purple-100 dark:border-slate-800/50">
                  {(["position", "rotation", "scale"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAdjustTab(tab)}
                      className={`py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                        adjustTab === tab
                          ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg"
                          : "text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab === "scale" ? "Size" : tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 custom-scrollbar min-h-0 text-xs">
                  {adjustTab === "position" && (
                    <>
                      {/* Position Y: Height (Up / Down) */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Height (Up / Down)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {adjustments.y > activeBase.y ? "+" : ""}
                            {Math.round((adjustments.y - activeBase.y) * 1000)} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-0.15"
                            max="0.02"
                            step="0.001"
                            value={adjustments.y}
                            onChange={(e) => updateAdjustment("y", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateAdjustment("y", activeBase.y);
                            }}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Position Z: Depth (In / Out) */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Depth (In / Out)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {adjustments.z > activeBase.z ? "+" : ""}
                            {Math.round((adjustments.z - activeBase.z) * 1000)} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-0.05"
                            max="0.10"
                            step="0.001"
                            value={adjustments.z}
                            onChange={(e) => updateAdjustment("z", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateAdjustment("z", activeBase.z);
                            }}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Position X: Centering (Left / Right) */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Centering (Left / Right)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {adjustments.x > activeBase.x ? "+" : ""}
                            {Math.round((adjustments.x - activeBase.x) * 1000)} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-0.04"
                            max="0.04"
                            step="0.001"
                            value={adjustments.x}
                            onChange={(e) => updateAdjustment("x", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => updateAdjustment("x", activeBase.x)}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {adjustTab === "rotation" && (
                    <>
                      {/* Pitch: Tilt Up / Down */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Tilt (Pitch)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {adjustments.rx > activeBase.rx ? "+" : ""}
                            {(adjustments.rx - activeBase.rx).toFixed(1)}°
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-15"
                            max="15"
                            step="0.5"
                            value={adjustments.rx}
                            onChange={(e) => updateAdjustment("rx", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateAdjustment("rx", activeBase.rx);
                            }}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Yaw: Turn Left / Right */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Turn (Yaw)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {adjustments.ry > activeBase.ry ? "+" : ""}
                            {(adjustments.ry - activeBase.ry).toFixed(1)}°
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-15"
                            max="15"
                            step="0.5"
                            value={adjustments.ry}
                            onChange={(e) => updateAdjustment("ry", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => updateAdjustment("ry", activeBase.ry)}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Roll: Level / Lean */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Level / Lean (Roll)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {adjustments.rz > activeBase.rz ? "+" : ""}
                            {(adjustments.rz - activeBase.rz).toFixed(1)}°
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            step="0.5"
                            value={adjustments.rz}
                            onChange={(e) => updateAdjustment("rz", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => updateAdjustment("rz", activeBase.rz)}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {adjustTab === "scale" && (
                    <>
                      {/* Overall Scale: Size */}
                      <div>
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Overall Frame Size</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {Math.round((adjustments.scale / activeBase.scale) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.01"
                            value={adjustments.scale}
                            onChange={(e) => updateAdjustment("scale", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateAdjustment("scale", activeBase.scale);
                            }}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Temple Length: Arm extension */}
                      <div className="pb-2 md:pb-3 border-b border-purple-100 dark:border-slate-800/80 mt-2.5 md:mt-4">
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Temple Length (Arms)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {Math.round(adjustments.templeLength * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0.60"
                            max="3.50"
                            step="0.01"
                            value={adjustments.templeLength}
                            onChange={(e) => updateAdjustment("templeLength", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateAdjustment("templeLength", activeBase.templeLength);
                            }}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Camera Zoom: shrinks the whole feed so the face looks smaller */}
                      <div className="pb-2 md:pb-3 border-b border-purple-100 dark:border-slate-800/80 mt-2.5 md:mt-4">
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Camera Zoom</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {Math.round(adjustments.zoom * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1.00"
                            max="1.60"
                            step="0.01"
                            value={adjustments.zoom}
                            onChange={(e) => updateAdjustment("zoom", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => updateAdjustment("zoom", activeBase.zoom)}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">100% fills the screen. Higher crops in closer on your face.</p>
                      </div>

                      {/* Face Shape Stretch: Y-axis vertical beauty scaler */}
                      <div className="pb-2 md:pb-3 border-b border-purple-100 dark:border-slate-800/80 mt-2.5 md:mt-4">
                        <div className="flex justify-between mb-1 md:mb-1.5">
                          <span className="text-slate-800 dark:text-slate-300 font-medium">Camera Face Stretch</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {Math.round(adjustments.faceStretch * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0.90"
                            max="1.10"
                            step="0.005"
                            value={adjustments.faceStretch}
                            onChange={(e) => updateAdjustment("faceStretch", parseFloat(e.target.value))}
                            className="flex-1 h-2 md:h-1 accent-purple-600 cursor-pointer bg-purple-100 dark:bg-slate-800 rounded-lg touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateAdjustment("faceStretch", activeBase.faceStretch);
                            }}
                            className="text-[10px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Quick Presets */}
                  <div className="pt-3 border-t border-purple-100 dark:border-slate-800/60 mt-1">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 tryon-section-title">Quick Presets</h4>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([
                        { id: "nose-lift",  label: "Nose\nLift",    icon: "arrow_upward" },
                        { id: "nose-lower", label: "Nose\nDrop",    icon: "arrow_downward" },
                        { id: "wide",       label: "Wide\nFace",    icon: "open_in_full" },
                        { id: "narrow",     label: "Narrow\nFace",  icon: "close_fullscreen" },
                      ] as const).map(({ id, label, icon }) => {
                        const isActive = activePreset === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => applyPreset(id)}
                            className={`quick-preset-btn relative flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all active:scale-95 ${
                              isActive
                                ? "bg-purple-600 text-white border-purple-500 shadow-md"
                                : "bg-purple-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 border-purple-100 dark:border-slate-800 hover:bg-purple-100 hover:text-purple-900 dark:hover:text-white"
                            }`}
                          >
                            {isActive && (
                              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                            )}
                            <span className="material-symbols-outlined text-base leading-none preset-icon">{icon}</span>
                            <span className="text-center text-[8px] font-bold leading-tight whitespace-pre-line preset-label">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="pt-2.5 border-t border-purple-100 dark:border-slate-800/80 mt-2 flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={resetAllAdjustments}
                    className="flex-1 rounded-xl border border-purple-200 dark:border-slate-700 bg-purple-50 hover:bg-purple-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 text-[10px] font-bold transition-all active:scale-95"
                  >
                    Reset All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("standard")}
                    className="flex-1 rounded-xl border border-purple-200 dark:border-slate-700 bg-purple-50 hover:bg-purple-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 text-[10px] font-bold transition-all active:scale-95"
                  >
                    Reset Preset
                  </button>
                </div>
              </div>
            )}

            {/* Bottom floating action bar — hidden during face scanning */}
            {!showScanOverlay && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
                <div className="glass-chrome pointer-events-auto flex items-center gap-2 sm:gap-3 rounded-[26px] px-3 sm:px-5 py-2 sm:py-2.5 float-in">
                  <button
                    type="button"
                    onClick={handleSnapshot}
                    className="flex flex-col items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white transition-colors group active:scale-95"
                  >
                    <span className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-purple-50 dark:bg-white/5 group-hover:bg-purple-100 dark:group-hover:bg-white/10 ring-1 ring-purple-200/60 dark:ring-white/5 transition-colors">
                      <MaterialIcon name="photo_camera" className="!text-lg" />
                    </span>
                    <span className="text-[9px] font-semibold tracking-wide">Snapshot</span>
                  </button>

                  <div className="h-9 w-px bg-purple-200/80 dark:bg-white/10" />

                  <button
                    type="button"
                    onClick={() => setShowAdjust((p) => !p)}
                    className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${showAdjust ? "text-purple-600 dark:text-purple-300" : "text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white"}`}
                  >
                    <span className={`flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-2xl ring-1 transition-colors ${showAdjust ? "bg-purple-500/25 ring-purple-400/40 shadow-[0_0_16px_-2px_rgba(168,85,247,0.6)]" : "bg-purple-50 dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-white/10 ring-purple-200/60 dark:ring-white/5"}`}>
                      <MaterialIcon name="tune" className="!text-lg" />
                    </span>
                    <span className="text-[9px] font-semibold tracking-wide">Adjust</span>
                  </button>

                  <div className="h-9 w-px bg-purple-200/80 dark:bg-white/10" />

                  <Link
                    to={selected ? `/shop/${selected.id}` : "/shop"}
                    className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/50 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <MaterialIcon name="shopping_bag" className="!text-base" />
                    Buy Now
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Desktop Sidebar Catalog */}
      <aside className="hidden md:flex flex-col w-[340px] xl:w-[380px] shrink-0 border-l border-purple-200/80 dark:border-slate-900 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl overflow-hidden">
        <div className="flex flex-col px-5 py-4 border-b border-purple-100 dark:border-slate-900 shrink-0 gap-3">
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-purple-900 via-purple-700 to-slate-900 dark:from-white dark:via-purple-100 dark:to-slate-300 bg-clip-text text-transparent">Try-On Studio</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Select a frame to try it on live</p>
          </div>

          {/* Dynamic Categories Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
                    : "bg-purple-50 text-slate-700 border-purple-100 hover:bg-purple-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2.5 custom-scrollbar">
          {loadingCatalog ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" message="Loading frames…" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No frames available in this category. <br />
              <Link to="/shop" className="text-purple-600 dark:text-purple-400 hover:underline mt-2 inline-block font-semibold">Browse shop</Link>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const active = p.id === selectedId;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                    active
                      ? "border-purple-500 bg-purple-50/80 dark:bg-purple-500/10 ring-1 ring-purple-500/20 shadow-md"
                      : "border-purple-100 dark:border-slate-900 bg-white dark:bg-slate-900/15 hover:border-purple-300 dark:hover:border-slate-850 hover:bg-purple-50/40 dark:hover:bg-slate-900/40 shadow-sm"
                  }`}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-purple-100 dark:border-slate-800/80 bg-slate-900 shadow-inner">
                    <img src={displayImageUrl(p)} alt={p.name} className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold leading-tight ${active ? "text-purple-900 dark:text-white" : "text-slate-900 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-white transition-colors"}`}>{p.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{p.category ?? "Frame"}</p>
                    </div>
                    <p className={`mt-0.5 text-xs font-bold ${active ? "text-purple-700 dark:text-purple-300" : "text-purple-600 dark:text-slate-400"}`}>{formatPrice(p.price)}</p>
                  </div>

                  {active && (
                    <div className="shrink-0 h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <MaterialIcon name="check" className="!text-sm text-purple-600 dark:text-purple-300" />
                    </div>
                  )}

                  {!active && (
                    <MaterialIcon name="arrow_forward_ios" className="!text-[9px] text-slate-400 dark:text-slate-700 group-hover:text-purple-600 dark:group-hover:text-slate-400 transition-colors shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {selected && (
          <div className="shrink-0 px-4 py-4 border-t border-purple-100 dark:border-slate-900 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md">
            <Link
              to={`/shop/${selected.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 active:scale-95 transition-all"
            >
              <MaterialIcon name="shopping_bag" className="!text-base" />
              Add to Cart — {formatPrice(selected.price)}
            </Link>
          </div>
        )}
      </aside>

      {/* Mobile Catalog Horizontal Carousel */}
      <section className="md:hidden shrink-0 flex flex-col bg-white/95 dark:bg-slate-950/95 border-t border-purple-200/80 dark:border-purple-500/20 max-h-[38dvh]">
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5 shrink-0">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">
            {selectedCategory === "All" ? "Select Frame" : selectedCategory} · {filteredProducts.length}
          </h3>

          {/* Mobile Category Select */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="tryon-chrome-select text-[11px] font-bold bg-purple-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border border-purple-200 dark:border-white/10 rounded-lg px-2.5 py-1"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 overflow-x-auto px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] snap-x snap-mandatory scrollbar-none">
          {loadingCatalog ? (
            <div className="flex items-center justify-center w-full py-6">
              <LoadingSpinner size="sm" message="Loading…" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-6 text-center text-[10px] text-slate-500 w-full">
              No products found.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const active = p.id === selectedId;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`relative flex w-[92px] shrink-0 snap-start flex-col rounded-2xl border p-2 text-left transition-all ${
                    active
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10 ring-2 ring-purple-500/30 shadow-md"
                      : "border-purple-100 dark:border-slate-900 bg-white dark:bg-slate-900/30 shadow-sm"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-900 border border-purple-100 dark:border-slate-800/80">
                    <img src={displayImageUrl(p)} alt={p.name} className="h-full w-full object-cover" />
                    {active && (
                      <span className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-purple-500 shadow-md">
                        <MaterialIcon name="check" className="!text-[9px] text-white" />
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 truncate text-[9px] font-bold px-0.5 ${active ? "text-purple-900 dark:text-white" : "text-slate-900 dark:text-slate-200"}`}>{p.name}</p>
                  <p className="truncate text-[8px] text-purple-600 dark:text-purple-400 font-semibold px-0.5">{formatPrice(p.price)}</p>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Face Scan Result Modal / Sheet */}
      {showResultModal && detectedShape && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-purple-200/80 dark:border-purple-500/30 bg-white dark:bg-slate-950/95 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <button
              type="button"
              onClick={() => {
                viewerRef.current?.resumeTryOn();
                setShowResultModal(false);
              }}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors"
            >
              <MaterialIcon name="close" className="!text-lg" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
                <MaterialIcon name="auto_awesome" className="!text-2xl" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Analysis Result</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{detectedShape} Face Shape</h3>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {shapeResult && (
                <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                  {shapeResult.confidence}% Match
                </span>
              )}
              {shapeResult?.isBeardDetected && (
                <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                  <span>🧔</span> Beard Compensated
                </span>
              )}
            </div>

            <div className="space-y-2 rounded-2xl bg-purple-50/70 dark:bg-slate-900/70 border border-purple-100 dark:border-slate-800 p-3.5 text-xs text-slate-700 dark:text-slate-300">
              <p><strong className="text-purple-700 dark:text-purple-400 font-semibold">Features:</strong> {SHAPE_GUIDE[detectedShape].features}</p>
              <p><strong className="text-purple-700 dark:text-purple-400 font-semibold">Best Styles:</strong> {SHAPE_GUIDE[detectedShape].recommend.join(", ")}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic mt-1">{SHAPE_GUIDE[detectedShape].blurb}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowResultModal(false);
                  viewerRef.current?.resumeTryOn();
                  const best = filteredProducts.find((p) => isBestFit(p.category, detectedShape));
                  if (best) handleSelect(best.id);
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 transition-all cursor-pointer"
              >
                ✨ View Recommended Glasses
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResultModal(false);
                    setShowManualShapeModal(true);
                  }}
                  className="flex-1 rounded-2xl border border-purple-200 dark:border-slate-700 bg-purple-50 hover:bg-purple-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Change Shape
                </button>
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="flex-1 rounded-2xl border border-purple-200 dark:border-slate-700 bg-purple-50 hover:bg-purple-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Re-scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Tap Manual Face Shape Selector Modal */}
      {showManualShapeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-purple-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Select Your Face Shape</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose a shape for tailored eyewear recommendations</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  viewerRef.current?.resumeTryOn();
                  setShowManualShapeModal(false);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-slate-850 transition-colors"
              >
                <MaterialIcon name="close" className="!text-lg" />
              </button>
            </div>

            {/* 6 Shape Grid */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 custom-scrollbar pr-1">
              {(["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"] as FaceShape[]).map((shape) => {
                const isCurrent = detectedShape === shape;
                const guide = SHAPE_GUIDE[shape];
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => handleManualSelectShape(shape)}
                    className={`w-full flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      isCurrent
                        ? "border-purple-500 bg-purple-100/70 dark:bg-purple-500/15 ring-1 ring-purple-500/30 text-purple-950 dark:text-white shadow-md"
                        : "border-purple-100 dark:border-slate-800 bg-purple-50/50 hover:bg-purple-100/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 dark:text-white"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCurrent
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300"
                    }`}>
                      {shape[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{shape}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-purple-600 text-white px-2 py-0.5 text-[9px] font-bold shadow-sm">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{guide.features}</p>
                      <p className="text-[10px] text-purple-700 dark:text-purple-400 font-medium mt-1">
                        Best fit: {guide.recommend.slice(0, 3).join(", ")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-purple-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  viewerRef.current?.resumeTryOn();
                  setShowManualShapeModal(false);
                }}
                className="rounded-xl border border-purple-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-850 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { addCartItem } from "../api/cartApi";
import { fetchProduct, fetchProducts } from "../api/productsApi";
import ProductCard from "../components/ProductCard";
import ProductReviews from "../components/ProductReviews";
import { useAuth } from "../context/AuthContext";
import type { Product, ReviewSummary } from "../types/api";
import { toStorefrontProduct } from "../utils/storefrontProduct";
import { ShoppingBag, ChevronRight, Star } from "lucide-react";
import { API_BASE } from "../config/env";
import { motion } from "framer-motion";
import ModelViewer from "../components/ModelViewer";

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return `Rs. ${n.toLocaleString()}`;
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const id = productId ? parseInt(productId, 10) : NaN;
  const navigate = useNavigate();
  const { isAuthenticated, refreshCart } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [ratingSummary, setRatingSummary] = useState<ReviewSummary | null>(null);
  const [viewMode, setViewMode] = useState<'images' | '3d'>('3d');

  // Colors come from product data; only render the swatch UI when the product defines them.
  const colors = product?.colors ?? [];
  useEffect(() => {
    if (colors.length > 0) setSelectedColor(colors[0].name);
    else setSelectedColor("");
    // colors is derived from product each render; key on product id + count to avoid a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, colors.length]);

  const specs = useMemo(() => {
    if (!product) return [];
    const rows: { dt: string; dd: string }[] = [];
    if (product.material) rows.push({ dt: "Material", dd: product.material });
    if (product.lens_width_mm != null) rows.push({ dt: "Lens Width", dd: `${product.lens_width_mm} mm` });
    if (product.bridge_mm != null) rows.push({ dt: "Bridge Size", dd: `${product.bridge_mm} mm` });
    if (product.temple_mm != null) rows.push({ dt: "Temple Length", dd: `${product.temple_mm} mm` });
    return rows;
  }, [product]);

  // Prefer the live summary (updated after posting a review) over the product's snapshot.
  const avgRating = ratingSummary?.avg_rating ?? product?.avg_rating ?? null;
  const reviewCount = ratingSummary?.review_count ?? product?.review_count ?? 0;

  const recommendedShapes = useMemo(() => {
    if (!product || !product.category) return "Oval, Square, Round";
    const cat = product.category.toLowerCase();
    if (cat.includes("aviator")) return "Oval, Square, Heart";
    if (cat.includes("wayfarer") || cat.includes("rectangle")) return "Oval, Round";
    if (cat.includes("round") || cat.includes("oval")) return "Square, Heart, Diamond";
    if (cat.includes("cat-eye") || cat.includes("cateye")) return "Round, Oval, Heart";
    return "Universal Fit";
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    const getUrl = (path: string | null | undefined) => {
      if (!path?.trim()) return "";
      const trimmed = path.trim();
      if (trimmed.startsWith("/")) return `${API_BASE}${trimmed}`;
      return trimmed;
    };
    const thumb = getUrl(product.thumbnail);
    if (thumb) list.push(thumb);
    const front = getUrl(product.front_view);
    if (front) list.push(front);
    const side = getUrl(product.side_view);
    if (side) list.push(side);
    if (product.lifestyle_images) {
      try {
        const parsed = JSON.parse(product.lifestyle_images);
        if (Array.isArray(parsed)) {
          parsed.forEach((img: string) => {
            const pUrl = getUrl(img);
            if (pUrl && !list.includes(pUrl)) list.push(pUrl);
          });
        }
      } catch {
        product.lifestyle_images.split(",").forEach((img: string) => {
          const pUrl = getUrl(img.trim());
          if (pUrl && !list.includes(pUrl)) list.push(pUrl);
        });
      }
    }
    const legacy = getUrl(product.image_url);
    if (legacy && !list.includes(legacy)) list.push(legacy);
    if (list.length === 0) list.push("/specs.jpg");
    return list;
  }, [product]);

  // 3D model: front_view stores the GLB file path used by the AR try-on system.
  // We reuse it here for the rotating product viewer.
  const modelSrc = useMemo(() => {
    const fv = product?.front_view?.trim();
    if (!fv || !/\.(glb|gltf)$/i.test(fv)) return null;
    return fv.startsWith('/') ? `${API_BASE}${fv}` : fv;
  }, [product]);

  const has3D = Boolean(modelSrc);

  useEffect(() => {
    if (images.length > 0) setActiveImage(images[0]);
  }, [images]);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      navigate("/shop", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, all] = await Promise.all([fetchProduct(id), fetchProducts()]);
        if (!cancelled) {
          setProduct(p);
          setCatalog(all);
        }
      } catch {
        if (!cancelled) toast.error("Product not found");
        if (!cancelled) navigate("/shop", { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  const related = useMemo(() => {
    if (!product) return [];
    const others = catalog.filter((p) => p.id !== product.id);
    const sameCat = product.category ? others.filter((p) => p.category && p.category === product.category) : [];
    const pool = sameCat.length > 0 ? sameCat : others;
    return pool.slice(0, 4);
  }, [catalog, product]);

  async function handleAdd() {
    if (!product) return;
    if (!isAuthenticated) {
      toast.error("Log in to add items to your cart");
      return;
    }
    setAdding(true);
    try {
      await addCartItem(product.id, 1, selectedColor || null);
      await refreshCart();
      toast.success(selectedColor ? `Added to cart (${selectedColor})` : "Added to cart");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setAdding(false);
    }
  }

  if (loading || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-accent)' }} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link to="/shop" className="font-medium transition-colors" style={{ color: 'var(--text-accent)' }}>
          Shop
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: 'var(--text-primary)' }}>{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        {/* ── Image Gallery / 3D Viewer ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7"
        >
          {/* View-mode toggle — only shown when a 3D model exists */}
          {has3D && (
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('images')}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
                style={viewMode === 'images' ? {
                  background: 'linear-gradient(135deg,#9333ea,#ec4899)',
                  color: '#ffffff',
                  boxShadow: '0 2px 12px rgba(147,51,234,0.35)',
                } : {
                  backgroundColor: 'rgba(147,51,234,0.07)',
                  color: 'var(--text-accent)',
                  border: '1px solid rgba(147,51,234,0.2)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_library</span>
                Images
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
                style={viewMode === '3d' ? {
                  background: 'linear-gradient(135deg,#9333ea,#ec4899)',
                  color: '#ffffff',
                  boxShadow: '0 2px 12px rgba(147,51,234,0.35)',
                } : {
                  backgroundColor: 'rgba(147,51,234,0.07)',
                  color: 'var(--text-accent)',
                  border: '1px solid rgba(147,51,234,0.2)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>view_in_ar</span>
                3D View
              </button>
            </div>
          )}

          {/* 3D Model Viewer */}
          {has3D && viewMode === '3d' && (
            <div
              className="overflow-hidden rounded-2xl shadow-lg"
              style={{
                backgroundColor: 'var(--surface-bg)',
                border: '1px solid var(--border-color)',
                background: 'radial-gradient(ellipse at 50% 30%, rgba(147,51,234,0.06) 0%, var(--surface-bg) 70%)',
              }}
            >
              <ModelViewer
                src={modelSrc!}
                alt={`${product.name} 3D model`}
                poster={images[0]}
                className="aspect-[4/3]"
              />
            </div>
          )}

          {/* Image Gallery (always rendered; hidden when 3D mode active) */}
          <div className={has3D && viewMode === '3d' ? 'hidden' : ''}>
            <div
              className="overflow-hidden rounded-2xl shadow-lg"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <img src={activeImage} alt={product.name} className="aspect-[4/3] w-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {images.map((imgUrl, i) => (
                  <button
                    key={imgUrl + i}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className="relative aspect-square w-16 overflow-hidden rounded-xl transition-all"
                    style={{
                      border: activeImage === imgUrl ? '2px solid var(--text-accent)' : '2px solid var(--border-color)',
                      transform: activeImage === imgUrl ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: activeImage === imgUrl ? '0 4px 12px rgba(147,51,234,0.2)' : 'none',
                    }}
                  >
                    <img src={imgUrl} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-5 lg:col-span-5"
        >
          {product.category && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-accent)' }}>{product.category}</span>
              <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-2.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                Fits {recommendedShapes} Best ✨
              </span>
            </div>
          )}

          <div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>{product.name}</h1>
            {reviewCount > 0 ? (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-0.5 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-4 h-4 fill-current" style={{ color: n <= Math.round(avgRating ?? 0) ? '#facc15' : 'var(--border-color)' }} />
                  ))}
                </span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(avgRating ?? 0).toFixed(1)}</span>
                <span style={{ color: 'var(--text-muted)' }}>· {reviewCount} review{reviewCount > 1 ? 's' : ''}</span>
              </a>
            ) : (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No reviews yet</p>
            )}
            <p className="mt-3 text-2xl font-bold" style={{ color: 'var(--text-accent)' }}>{formatPrice(product.price)}</p>
          </div>

          {/* Color swatches (data-driven; hidden when the product has no color options) */}
          {colors.length > 0 && (
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Selected Color: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{selectedColor}</span>
            </span>
            <div className="mt-2 flex gap-3">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  className="h-9 w-9 rounded-full transition-all shadow-sm"
                  style={{
                    backgroundColor: c.hex,
                    border: selectedColor === c.name ? '2px solid var(--text-accent)' : '2px solid var(--border-color)',
                    transform: selectedColor === c.name ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: selectedColor === c.name ? '0 0 0 3px rgba(147,51,234,0.2)' : 'none',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          )}

          <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{product.description || product.sku}</p>

          {/* Specifications (data-driven; only shown when the product provides them) */}
          {(specs.length > 0 || product.lens_features) && (
            <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}>
              <h3 className="font-semibold text-sm pb-2 mb-3" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>Frame Specifications</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {specs.map(({ dt, dd }) => (
                  <div key={dt} className="flex flex-col">
                    <dt style={{ color: 'var(--text-muted)' }}>{dt}</dt>
                    <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{dd}</dd>
                  </div>
                ))}
                {product.lens_features && (
                  <div className="flex flex-col col-span-2 mt-1">
                    <dt style={{ color: 'var(--text-muted)' }}>Lens Features</dt>
                    <dd className="font-medium" style={{ color: 'var(--text-accent)' }}>{product.lens_features}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* SKU / Stock */}
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>SKU</span>{" "}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{product.sku}</span>
            <span className="mx-3" style={{ color: 'var(--border-color)' }}>|</span>
            <span style={{ color: 'var(--text-muted)' }}>In stock</span>{" "}
            <span className={`font-semibold ${product.stock_quantity > 0 ? '' : 'text-rose-600'}`} style={product.stock_quantity > 0 ? { color: 'var(--text-primary)' } : {}}>
              {product.stock_quantity}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={adding || product.stock_quantity < 1}
              onClick={handleAdd}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 hover:shadow-xl active:scale-[0.98]"
            >
              <ShoppingBag className="h-5 w-5" />
              {product.stock_quantity < 1 ? "Out of stock" : adding ? "Adding…" : "Add to Cart"}
            </button>
            <Link
              to={`/try-on/${product.id}`}
              className="inline-flex flex-1 items-center justify-center rounded-xl py-3.5 text-base font-semibold transition-all"
              style={{ border: '2px solid var(--border-color)', color: 'var(--text-accent)' }}
            >
              Virtual try-on
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Ratings & Reviews */}
      <div id="reviews" className="scroll-mt-24">
        <ProductReviews productId={product.id} onSummaryChange={setRatingSummary} />
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 pt-12" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>You might also like</h2>
            <Link to="/shop" className="font-semibold transition-colors" style={{ color: 'var(--text-accent)' }}>
              View shop
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={toStorefrontProduct(p)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

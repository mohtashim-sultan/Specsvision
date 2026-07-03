import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { addCartItem } from "../api/cartApi";
import { fetchProduct, fetchProducts } from "../api/productsApi";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import type { Product } from "../types/api";
import { toStorefrontProduct } from "../utils/storefrontProduct";
import { ShoppingBag } from "lucide-react";
import { API_BASE } from "../config/env";

function formatPrice(p: string) {
  const n = Number(p);
  if (Number.isNaN(n)) return p;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
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
  const [selectedColor, setSelectedColor] = useState("Matte Black");

  const colors = [
    { name: "Matte Black", hex: "#1A1A1A" },
    { name: "Tortoise", hex: "#5C4033" },
    { name: "Crystal Clear", hex: "#E8E8E8" },
  ];

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

  useEffect(() => {
    if (images.length > 0) {
      setActiveImage(images[0]);
    }
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
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const related = useMemo(() => {
    if (!product) return [];
    const others = catalog.filter((p) => p.id !== product.id);
    const sameCat = product.category
      ? others.filter((p) => p.category && p.category === product.category)
      : [];
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
      await addCartItem(product.id, 1);
      await refreshCart();
      toast.success("Added to cart");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setAdding(false);
    }
  }

  if (loading || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link to="/shop" className="font-medium text-purple-700 hover:underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-[0_8px_30px_rgba(124,58,237,0.1)]">
            <img src={activeImage} alt={product.name} className="aspect-[4/3] w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {images.map((imgUrl, i) => (
                <button
                  key={imgUrl + i}
                  type="button"
                  onClick={() => setActiveImage(imgUrl)}
                  className={`relative aspect-square w-16 overflow-hidden rounded-xl border-2 transition-all ${
                    activeImage === imgUrl
                      ? "border-purple-600 shadow-md scale-105"
                      : "border-purple-100 hover:border-purple-300"
                  }`}
                >
                  <img src={imgUrl} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5">
          {product.category ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-600">{product.category}</span>
              <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-2.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                Fits {recommendedShapes} Best ✨
              </span>
            </div>
          ) : null}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{product.name}</h1>
            <p className="mt-3 text-2xl font-bold text-purple-700">{formatPrice(product.price)}</p>
          </div>

          {/* Color swatches */}
          <div>
            <span className="text-sm font-semibold text-gray-700">Selected Color: <span className="text-gray-900 font-bold">{selectedColor}</span></span>
            <div className="mt-2 flex gap-3">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  className={`h-9 w-9 rounded-full border-2 transition-all shadow-sm ${
                    selectedColor === c.name ? "border-purple-600 ring-2 ring-purple-300 scale-105" : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <p className="leading-relaxed text-gray-600">{product.description || product.sku}</p>

          {/* Specifications Details */}
          <div className="rounded-2xl border border-purple-100 bg-white/70 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm border-b pb-2 mb-3">Frame Specifications</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex flex-col">
                <dt className="text-gray-400">Material</dt>
                <dd className="font-medium text-gray-900">Acetate & Stainless Steel</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-gray-400">Lens Width</dt>
                <dd className="font-medium text-gray-900">54 mm</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-gray-400">Bridge Size</dt>
                <dd className="font-medium text-gray-900">18 mm</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-gray-400">Temple Length</dt>
                <dd className="font-medium text-gray-900">145 mm</dd>
              </div>
              <div className="flex flex-col col-span-2 mt-1">
                <dt className="text-gray-400">Lens Features</dt>
                <dd className="font-medium text-purple-700">UV400 Protection & Blue Light Blocking</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-purple-100 bg-white/80 px-4 py-3 text-sm text-gray-600">
            <span className="text-gray-400">SKU</span> <span className="font-medium text-gray-900">{product.sku}</span>
            <span className="mx-3 text-gray-300">|</span>
            <span className="text-gray-400">In stock</span>{" "}
            <span className={product.stock_quantity > 0 ? "font-semibold text-gray-900" : "font-semibold text-rose-600"}>
              {product.stock_quantity}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={adding || product.stock_quantity < 1}
              onClick={handleAdd}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 py-3.5 text-base font-semibold text-white shadow-md transition-opacity disabled:opacity-50"
            >
              <ShoppingBag className="h-5 w-5" />
              {product.stock_quantity < 1 ? "Out of stock" : adding ? "Adding…" : "Add to Cart"}
            </button>
            <Link
              to={`/try-on/${product.id}`}
              className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-purple-200 bg-white py-3.5 text-base font-semibold text-purple-700 transition-colors hover:bg-purple-50"
            >
              Virtual try-on
            </Link>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16 border-t border-purple-100 pt-12">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">You might also like</h2>
            <Link to="/shop" className="font-semibold text-purple-700 hover:text-pink-600">
              View shop
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={toStorefrontProduct(p)} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

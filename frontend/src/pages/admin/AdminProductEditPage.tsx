import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { createAdminProduct, fetchAdminProducts, updateAdminProduct, uploadAdminImage } from "../../api/adminApi";
import { fetchProduct } from "../../api/productsApi";
import { API_BASE } from "../../config/env";
import ModelViewer from "../../components/ModelViewer";

const CATEGORIES = ["", "Aviator", "Wayfarer", "Round", "Cat-Eye", "Premium", "Essential", "Tech", "Limited"];

function getFullImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

// Must match the server-side ceilings in backend/config.py.
const MAX_IMAGE_MB = 5;
const MAX_MODEL_MB = 32;

interface ImageUploadFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  /** Accept only glTF try-on models (.glb/.gltf) rather than images. */
  modelOnly?: boolean;
}

function ImageUploadField({ label, description, value, onChange, required, modelOnly }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const is3D = value.toLowerCase().endsWith(".glb") || value.toLowerCase().endsWith(".gltf");

  const validateAndUpload = async (file: File) => {
    if (modelOnly) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "glb" && ext !== "gltf") {
        toast.error("Only 3-D models (.glb, .gltf) are allowed for virtual try-on.");
        return;
      }
    }

    // Check the size up front so a large model fails immediately instead of after
    // the whole upload has streamed to a server that will reject it.
    const limitMb = modelOnly ? MAX_MODEL_MB : MAX_IMAGE_MB;
    if (file.size > limitMb * 1024 * 1024) {
      toast.error(`${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is ${limitMb} MB.`);
      return;
    }

    setUploading(true);
    try {
      const res = await uploadAdminImage(file);
      onChange(res.url);
      toast.success(`${label} uploaded!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await validateAndUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await validateAndUpload(file);
  };

  const fullUrl = getFullImageUrl(value);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-4 transition-all hover:shadow-sm">
      <div className="flex items-center justify-between">
        <label className="font-label text-label-md font-semibold text-on-surface">
          {label} {required && <span className="text-error">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-medium text-error hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-on-surface-variant/80">{description}</p>

      {value ? (
        <div className="relative mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-inner">
          {is3D ? (
            <div className="relative w-full h-full">
              <ModelViewer src={fullUrl} alt={label} minHeight="100%" className="w-full h-full" />
              <div className="absolute top-2 left-2 z-10 rounded bg-primary-container px-2 py-0.5 text-[10px] font-bold text-on-primary-container uppercase shadow-sm">
                3D Model Active
              </div>
            </div>
          ) : (
            <img src={fullUrl} alt={label} className="h-full w-full object-contain p-2" />
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-2 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/80 bg-surface-container-lowest p-4 text-center transition-all hover:bg-surface-container-high/40 ${
            uploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={modelOnly ? ".glb,.gltf,model/gltf-binary,model/gltf+json" : "image/*"}
          />
          {uploading ? (
            <div className="space-y-2">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <p className="font-label text-label-sm text-on-surface-variant">Uploading…</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="mx-auto h-8 w-8 text-on-surface-variant/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="font-label text-label-sm text-on-surface-variant">
                Drag & drop or <span className="text-primary hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-on-surface-variant/60">
                {modelOnly
                  ? `GLB or GLTF 3D model up to ${MAX_MODEL_MB}MB`
                  : `JPG, PNG, WebP up to ${MAX_IMAGE_MB}MB`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const isNew = productId === "new";
  const id = !isNew && productId ? parseInt(productId, 10) : NaN;

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [frontView, setFrontView] = useState("");
  const [sideView, setSideView] = useState("");
  const [lifestyleImages, setLifestyleImages] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [lensWidth, setLensWidth] = useState("");
  const [bridge, setBridge] = useState("");
  const [temple, setTemple] = useState("");
  const [lensFeatures, setLensFeatures] = useState("");
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const numOrNull = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!Number.isFinite(id)) {
      navigate("/admin/products", { replace: true });
      return;
    }
    let cancelled = false;
    const parseLifestyle = (str: string | null | undefined) => {
      if (!str) return [];
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
      return str.split(",").map((x) => x.trim()).filter(Boolean);
    };

    (async () => {
      setLoading(true);
      try {
        const p = await fetchProduct(id);
        if (cancelled) return;
        setSku(p.sku);
        setName(p.name);
        setDescription(p.description || "");
        setPrice(String(p.price));
        setStock(String(p.stock_quantity));
        setFrontView(p.front_view || "");
        setSideView(p.side_view || "");
        setLifestyleImages(parseLifestyle(p.lifestyle_images));
        setThumbnail(p.thumbnail || "");
        setCategory(p.category || "");
        setMaterial(p.material || "");
        setLensWidth(p.lens_width_mm != null ? String(p.lens_width_mm) : "");
        setBridge(p.bridge_mm != null ? String(p.bridge_mm) : "");
        setTemple(p.temple_mm != null ? String(p.temple_mm) : "");
        setLensFeatures(p.lens_features || "");
        setColors(Array.isArray(p.colors) ? p.colors : []);
      } catch {
        try {
          const list = await fetchAdminProducts();
          const p = list.find((x) => x.id === id);
          if (p && !cancelled) {
            setSku(p.sku);
            setName(p.name);
            setDescription(p.description || "");
            setPrice(String(p.price));
            setStock(String(p.stock_quantity));
            setFrontView(p.front_view || "");
            setSideView(p.side_view || "");
            setLifestyleImages(parseLifestyle(p.lifestyle_images));
            setThumbnail(p.thumbnail || "");
            setCategory(p.category || "");
            setMaterial(p.material || "");
            setLensWidth(p.lens_width_mm != null ? String(p.lens_width_mm) : "");
            setBridge(p.bridge_mm != null ? String(p.bridge_mm) : "");
            setTemple(p.temple_mm != null ? String(p.temple_mm) : "");
            setLensFeatures(p.lens_features || "");
            setColors(Array.isArray(p.colors) ? p.colors : []);
          } else if (!cancelled) {
            toast.error("Product not found");
            navigate("/admin/products", { replace: true });
          }
        } catch {
          if (!cancelled) navigate("/admin/products", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const priceNum = Number(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        toast.error("Invalid price");
        return;
      }
      const stockNum = parseInt(stock, 10);
      if (Number.isNaN(stockNum) || stockNum < 0) {
        toast.error("Invalid stock");
        return;
      }

      // Pick 2D preview image (thumbnail or sideView if non-3D) for standard product card displays
      const finalImageUrl = thumbnail || (sideView && !/\.(glb|gltf)$/i.test(sideView) ? sideView : "");
      const lifestyleStr = lifestyleImages.length > 0 ? JSON.stringify(lifestyleImages) : null;

      // Only keep fully-filled color rows (name + valid hex); backend rejects malformed hex.
      const cleanColors = colors
        .map((c) => ({ name: c.name.trim(), hex: c.hex.trim() }))
        .filter((c) => c.name && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.hex));

      const specFields = {
        material: material.trim() || null,
        lens_width_mm: numOrNull(lensWidth),
        bridge_mm: numOrNull(bridge),
        temple_mm: numOrNull(temple),
        lens_features: lensFeatures.trim() || null,
        colors: cleanColors,
      };

      if (isNew) {
        const created = await createAdminProduct({
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || null,
          price: priceNum.toFixed(2),
          image_url: finalImageUrl || null,
          front_view: frontView || null,
          side_view: sideView || null,
          lifestyle_images: lifestyleStr,
          thumbnail: thumbnail || null,
          stock_quantity: stockNum,
          category: category.trim() || null,
          ...specFields,
        });
        toast.success("Product created");
        navigate(`/admin/products/${created.id}`, { replace: true });
      } else {
        await updateAdminProduct(id, {
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || null,
          price: priceNum.toFixed(2),
          image_url: finalImageUrl || null,
          front_view: frontView || null,
          side_view: sideView || null,
          lifestyle_images: lifestyleStr,
          thumbnail: thumbnail || null,
          stock_quantity: stockNum,
          category: category.trim() || null,
          ...specFields,
        });
        toast.success("Saved");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-gutter">
        <p className="text-on-surface-variant">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-lg p-gutter lg:p-xl">
      <div className="flex items-center gap-sm font-label text-label-sm text-on-surface-variant">
        <Link to="/admin/products" className="text-primary hover:underline">
          Products
        </Link>
        <span>/</span>
        <span>{isNew ? "New" : `Edit #${id}`}</span>
      </div>
      <h2 className="font-display text-headline-lg text-on-surface">{isNew ? "New product" : "Edit product"}</h2>

      <form onSubmit={onSubmit} className="space-y-md rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-md shadow-sm md:p-lg">
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-xs block font-label text-label-md text-on-surface-variant">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <div>
            <label className="mb-xs block font-label text-label-md text-on-surface-variant">SKU</label>
            <input
              required
              disabled={!isNew}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-xs block font-label text-label-md text-on-surface-variant">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container"
            >
              {CATEGORIES.map((c) => (
                <option key={c || "none"} value={c}>
                  {c || "None"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-xs block font-label text-label-md text-on-surface-variant">Price (USD)</label>
            <input
              required
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <div>
            <label className="mb-xs block font-label text-label-md text-on-surface-variant">Stock quantity</label>
            <input
              required
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <div className="md:col-span-2 grid grid-cols-1 gap-md sm:grid-cols-2">
            <ImageUploadField
              label="3D Glasses Model (.glb) [Optional]"
              description="Upload the 3D model file (.glb / .gltf). Powers both the 3D rotating showcase and virtual try-on."
              value={frontView}
              onChange={setFrontView}
              modelOnly
            />
            <ImageUploadField
              label="Frame Thumbnail Image (.jpg, .png)"
              description="Preview photo displayed in the Virtual Try-On frame carousel and product catalogs."
              value={thumbnail}
              onChange={setThumbnail}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-xs block font-label text-label-md text-on-surface-variant">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>

          {/* Specifications (data-driven; shown on the product page) */}
          <div className="md:col-span-2 border-t border-outline-variant pt-md">
            <h3 className="mb-sm font-label text-label-md font-semibold text-on-surface">Frame Specifications</h3>
            <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
              <div>
                <label className="mb-xs block text-label-sm text-on-surface-variant">Material</label>
                <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Acetate"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
              </div>
              <div>
                <label className="mb-xs block text-label-sm text-on-surface-variant">Lens Width (mm)</label>
                <input type="number" min={0} value={lensWidth} onChange={(e) => setLensWidth(e.target.value)} placeholder="54"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
              </div>
              <div>
                <label className="mb-xs block text-label-sm text-on-surface-variant">Bridge (mm)</label>
                <input type="number" min={0} value={bridge} onChange={(e) => setBridge(e.target.value)} placeholder="18"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
              </div>
              <div>
                <label className="mb-xs block text-label-sm text-on-surface-variant">Temple (mm)</label>
                <input type="number" min={0} value={temple} onChange={(e) => setTemple(e.target.value)} placeholder="145"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
              </div>
            </div>
            <div className="mt-md">
              <label className="mb-xs block text-label-sm text-on-surface-variant">Lens Features</label>
              <input value={lensFeatures} onChange={(e) => setLensFeatures(e.target.value)} placeholder="UV400 Protection & Blue Light Blocking"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
            </div>
          </div>

          {/* Color options */}
          <div className="md:col-span-2 border-t border-outline-variant pt-md">
            <div className="mb-sm flex items-center justify-between">
              <h3 className="font-label text-label-md font-semibold text-on-surface">Color Options</h3>
              <button type="button" onClick={() => setColors((c) => [...c, { name: "", hex: "#000000" }])}
                className="text-xs font-semibold text-primary hover:underline">+ Add color</button>
            </div>
            {colors.length === 0 && <p className="text-xs text-on-surface-variant/70">No colors — the product page hides the swatch selector.</p>}
            <div className="space-y-2">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" value={/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.hex) ? c.hex : "#000000"}
                    onChange={(e) => setColors((arr) => arr.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))}
                    className="h-9 w-12 rounded border border-outline-variant bg-transparent" />
                  <input value={c.name} placeholder="Color name (e.g. Matte Black)"
                    onChange={(e) => setColors((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
                  <input value={c.hex} placeholder="#000000"
                    onChange={(e) => setColors((arr) => arr.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))}
                    className="w-28 rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm outline-none focus:ring-2 focus:ring-primary-container" />
                  <button type="button" onClick={() => setColors((arr) => arr.filter((_, j) => j !== i))}
                    className="px-2 text-error hover:underline text-sm">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-sm border-t border-outline-variant pt-md sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container py-md font-label text-label-md text-white shadow-md disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>
          <Link
            to="/admin/products"
            className="flex flex-1 items-center justify-center rounded-xl border border-outline py-md text-center font-label text-label-md text-on-surface-variant hover:bg-surface-container-high"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

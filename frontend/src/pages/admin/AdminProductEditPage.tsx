import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { createAdminProduct, fetchAdminProducts, updateAdminProduct, uploadAdminImage } from "../../api/adminApi";
import { fetchProduct } from "../../api/productsApi";
import { API_BASE } from "../../config/env";

const CATEGORIES = ["", "Aviator", "Wayfarer", "Round", "Cat-Eye", "Premium", "Essential", "Tech", "Limited"];

function getFullImageUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

interface ImageUploadFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  allowPngOr3D?: boolean;
}

function ImageUploadField({ label, description, value, onChange, required, allowPngOr3D }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const is3D = value.toLowerCase().endsWith(".glb") || value.toLowerCase().endsWith(".gltf");

  const validateAndUpload = async (file: File) => {
    if (allowPngOr3D) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "glb" && ext !== "gltf") {
        toast.error("Only 3-D models (.glb, .gltf) are allowed for virtual try-on.");
        return;
      }
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
        <div className="relative mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-inner">
          {is3D ? (
            <div className="flex flex-col items-center gap-2 text-on-surface-variant text-center">
              <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              <span className="text-xs font-semibold max-w-[180px] truncate">{value.split("/").pop()}</span>
              <span className="rounded bg-primary-container px-2 py-0.5 text-[10px] font-bold text-on-primary-container uppercase">3D Glasses Model</span>
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
            accept={allowPngOr3D ? ".glb,.gltf" : "image/*"}
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
                {allowPngOr3D ? "GLB/GLTF 3D model" : "JPG, PNG, WebP up to 5MB"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LifestyleImagesUploadFieldProps {
  values: string[];
  onChange: (urls: string[]) => void;
}

function LifestyleImagesUploadField({ values, onChange }: LifestyleImagesUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls: string[] = [...values];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadAdminImage(files[i]);
        newUrls.push(res.url);
      }
      onChange(newUrls);
      toast.success("Lifestyle images uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const copy = [...values];
    copy.splice(index, 1);
    onChange(copy);
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-4 transition-all hover:shadow-sm">
      <div className="flex items-center justify-between">
        <label className="font-label text-label-md font-semibold text-on-surface">Lifestyle Images</label>
        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-error hover:underline"
          >
            Clear All
          </button>
        )}
      </div>
      <p className="text-xs text-on-surface-variant/80">Marketing or gallery images displaying the product on a model.</p>

      {values.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {values.map((url, index) => (
            <div key={url + index} className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <img src={getFullImageUrl(url)} alt={`Lifestyle ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`mt-2 flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/80 bg-surface-container-lowest p-2 text-center transition-all hover:bg-surface-container-high/40 ${
          uploading ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*"
        />
        {uploading ? (
          <div className="space-y-1">
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p className="text-xs text-on-surface-variant">Uploading…</p>
          </div>
        ) : (
          <div className="space-y-1">
            <svg className="mx-auto h-6 w-6 text-on-surface-variant/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="font-label text-label-sm text-on-surface">Add lifestyle images</p>
          </div>
        )}
      </div>
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
  const [imageUrl, setImageUrl] = useState("");
  const [frontView, setFrontView] = useState("");
  const [sideView, setSideView] = useState("");
  const [lifestyleImages, setLifestyleImages] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

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
        setImageUrl(p.image_url || "");
        setFrontView(p.front_view || "");
        setSideView(p.side_view || "");
        setLifestyleImages(parseLifestyle(p.lifestyle_images));
        setThumbnail(p.thumbnail || "");
        setCategory(p.category || "");
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
            setImageUrl(p.image_url || "");
            setFrontView(p.front_view || "");
            setSideView(p.side_view || "");
            setLifestyleImages(parseLifestyle(p.lifestyle_images));
            setThumbnail(p.thumbnail || "");
            setCategory(p.category || "");
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
      if (!frontView) {
        toast.error("Front View (3D GLB/GLTF model) is required for virtual try-on.");
        return;
      }

      const finalImageUrl = thumbnail || frontView || sideView || "";
      const lifestyleStr = lifestyleImages.length > 0 ? JSON.stringify(lifestyleImages) : null;

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
              label="Front View (3D Model)"
              description="3-D glasses model (.glb, .gltf). Required for virtual try-on."
              value={frontView}
              onChange={setFrontView}
              required
              allowPngOr3D
            />
            <ImageUploadField
              label="Thumbnail"
              description="Product image displayed in listing grids and catalogs."
              value={thumbnail}
              onChange={setThumbnail}
            />
            <ImageUploadField
              label="Side View"
              description="Alternative angle view displayed on the product page."
              value={sideView}
              onChange={setSideView}
            />
            <LifestyleImagesUploadField
              values={lifestyleImages}
              onChange={setLifestyleImages}
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

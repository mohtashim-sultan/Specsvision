import { API_BASE } from "../config/env";
import type { Product } from "../types/api";
import { SHAPE_GUIDE, type FaceShape } from "../components/ar/faceShape";

const BADGES = ["Best Seller", "New", "Trending", "Sale"] as const;

/** Display model for legacy ProductCard / cart rows (API has no badge/rating). */
export type StorefrontProduct = Product & {
  displayImage: string;
  displayBadge: string;
  displayFaceShapes: string[];
  image: string;
  badge: string;
  faceShapes: string[];
  rating: number;
  reviews: number;
  originalPrice: number | null;
  brand: string;
  style: string;
};

export function displayImageUrl(p: Product): string {
  const img = p.thumbnail?.trim() || p.image_url?.trim();
  if (!img || /\.(glb|gltf)$/i.test(img)) return "/specs.jpg";
  if (img.startsWith("/")) {
    return `${API_BASE}${img}`;
  }
  return img;
}

export function displayBadge(p: Product): string {
  return BADGES[Math.abs(p.id) % 4];
}

/**
 * Which face shapes a frame category suits, inverted from SHAPE_GUIDE.
 *
 * SHAPE_GUIDE is written the other way round -- shape to the categories that flatter it --
 * because that is what the try-on needs when it has detected a face. The shop needs the
 * reverse, and deriving it here means the two can never drift apart: change a
 * recommendation in one place and both the try-on and the filter follow.
 */
const SHAPES_BY_CATEGORY: Record<string, FaceShape[]> = (() => {
  const out: Record<string, FaceShape[]> = {};
  for (const shape of Object.keys(SHAPE_GUIDE) as FaceShape[]) {
    for (const category of SHAPE_GUIDE[shape].recommend) {
      const key = category.toLowerCase().replace(/[^a-z]/g, ""); // "Cat-Eye" -> "cateye"
      (out[key] ||= []).push(shape);
    }
  }
  return out;
})();

const ALL_SHAPES = Object.keys(SHAPE_GUIDE) as FaceShape[];

/**
 * The face shapes a product actually suits.
 *
 * This used to return the product's CATEGORY plus the literal "Universal", which are not
 * face shapes at all. The shop's face-shape filter compares against this list, so it was
 * matching on category names: filtering by "Round" returned frames whose category is Round,
 * and those suit Square, Heart, Diamond and Oblong faces -- not Round ones. Filtering by
 * "Heart" matched nothing, because no category is called Heart. The try-on, meanwhile, was
 * using SHAPE_GUIDE correctly through isBestFit(), so the two halves of the app disagreed
 * about the same question.
 *
 * A category the guide does not cover -- "Premium", "Essential" and the like describe a
 * price tier, not a shape -- cannot be judged on this basis, so it is offered for every
 * face rather than hidden from all of them.
 */
export function displayFaceShapes(p: Product): FaceShape[] {
  const key = (p.category || "").toLowerCase().replace(/[^a-z]/g, "");
  return SHAPES_BY_CATEGORY[key] ?? ALL_SHAPES;
}

export function toStorefrontProduct(p: Product): StorefrontProduct {
  const priceNum = Number(p.price);
  const hasSale = p.id % 3 === 0 && !Number.isNaN(priceNum);
  const original = hasSale ? Math.round(priceNum * 1.25 * 100) / 100 : null;
  const image = displayImageUrl(p);
  const badge = displayBadge(p);
  const faceShapes = displayFaceShapes(p);

  // Deriving Brand and Style dynamically
  const brands = ["SpecsVision", "Ray-Ban", "Oakley"];
  const brand = brands[Math.abs(p.id) % brands.length];

  let style = "Classic";
  if (p.category) {
    const catLower = p.category.toLowerCase();
    if (catLower.includes("sporty")) style = "Sporty";
    else if (catLower.includes("cat-eye") || catLower.includes("cateye")) style = "Vintage";
    else if (catLower.includes("wayfarer")) style = "Modern";
  }
  const nameLower = p.name.toLowerCase();
  if (nameLower.includes("retro")) style = "Retro";
  else if (nameLower.includes("minimalist")) style = "Modern";
  else if (nameLower.includes("vintage")) style = "Vintage";
  else if (nameLower.includes("scholar")) style = "Classic";

  return {
    ...p,
    displayImage: image,
    displayBadge: badge,
    displayFaceShapes: faceShapes,
    image,
    badge,
    faceShapes,
    // Real, review-derived values from the API (0 until customers leave reviews).
    rating: p.avg_rating ?? 0,
    reviews: p.review_count ?? 0,
    originalPrice: original,
    brand,
    style,
  };
}

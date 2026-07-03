import { API_BASE } from "../config/env";
import type { Product } from "../types/api";

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
  if (!img) return "/specs.jpg";
  if (img.startsWith("/")) {
    return `${API_BASE}${img}`;
  }
  return img;
}

export function displayBadge(p: Product): string {
  return BADGES[Math.abs(p.id) % 4];
}

export function displayFaceShapes(p: Product): string[] {
  if (p.category) {
    const cat = p.category.trim();
    return [cat, "Universal"];
  }
  return ["Oval", "Square"];
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
    rating: 4.7 + (p.id % 3) * 0.1,
    reviews: 120 + p.id * 17,
    originalPrice: original,
    brand,
    style,
  };
}

import { apiRequest } from "./http";
import type { Product } from "../types/api";

export function fetchProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/api/products", { auth: false });
}

export function fetchProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}`, { auth: false });
}

export function fetchLexiconRecommendations(feature?: string, category?: string, limit = 6): Promise<Product[]> {
  const params = new URLSearchParams();
  if (feature) params.set("feature", feature);
  if (category) params.set("category", category);
  if (limit) params.set("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<Product[]>(`/api/products/recommendations/lexicon${query}`, { auth: false });
}


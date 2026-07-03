import { apiRequest } from "./http";
import type { Product } from "../types/api";

export function fetchProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/api/products", { auth: false });
}

export function fetchProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}`, { auth: false });
}

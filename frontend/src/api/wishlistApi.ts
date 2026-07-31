import { apiRequest } from "./http";
import type { WishlistResponse } from "../types/api";

export function fetchWishlist(): Promise<WishlistResponse> {
  return apiRequest<WishlistResponse>("/api/wishlist");
}

export function addToWishlist(productId: number): Promise<WishlistResponse> {
  return apiRequest<WishlistResponse>("/api/wishlist/items", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}

export function removeFromWishlist(productId: number): Promise<WishlistResponse> {
  return apiRequest<WishlistResponse>(`/api/wishlist/items/${productId}`, { method: "DELETE" });
}

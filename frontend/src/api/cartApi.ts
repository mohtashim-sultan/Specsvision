import { apiRequest } from "./http";
import type { CartResponse, CheckoutResult } from "../types/api";

export function fetchCart(): Promise<CartResponse> {
  return apiRequest<CartResponse>("/api/cart");
}

export function addCartItem(productId: number, quantity = 1): Promise<CartResponse> {
  return apiRequest<CartResponse>("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export function removeCartLine(productId: number): Promise<CartResponse> {
  return apiRequest<CartResponse>(`/api/cart/items/${productId}`, { method: "DELETE" });
}

/** Replace line quantity (API has no PATCH): remove then re-add desired qty. */
export async function setCartLineQuantity(productId: number, quantity: number): Promise<CartResponse> {
  try {
    await removeCartLine(productId);
  } catch {
    /* line may not exist */
  }
  if (quantity <= 0) return fetchCart();
  return addCartItem(productId, quantity);
}

export function checkoutCart(): Promise<CheckoutResult> {
  return apiRequest<CheckoutResult>("/api/checkout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchUserOrders(): Promise<any[]> {
  return apiRequest<any[]>("/api/checkout/orders");
}

export function fetchOrderDetails(orderId: number): Promise<any> {
  return apiRequest<any>(`/api/checkout/orders/${orderId}`);
}

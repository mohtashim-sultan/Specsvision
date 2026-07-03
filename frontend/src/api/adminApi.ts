import { API_BASE } from "../config/env";
import { apiRequest, getStoredToken } from "./http";
import type { AdminOrderDetail, AdminOrderList, AdminStats, Product } from "../types/api";

export async function uploadAdminImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let message = "Upload failed";
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>("/api/admin/stats");
}

export async function fetchAdminProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/api/admin/products");
}

export async function createAdminProduct(body: {
  sku: string;
  name: string;
  description?: string | null;
  price: string;
  image_url?: string | null;
  front_view?: string | null;
  side_view?: string | null;
  lifestyle_images?: string | null;
  thumbnail?: string | null;
  stock_quantity: number;
  category?: string | null;
}): Promise<Product> {
  return apiRequest<Product>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAdminProduct(
  id: number,
  body: Partial<{
    sku: string;
    name: string;
    description: string | null;
    price: string;
    image_url: string | null;
    front_view: string | null;
    side_view: string | null;
    lifestyle_images: string | null;
    thumbnail: string | null;
    stock_quantity: number;
    category: string | null;
  }>,
): Promise<Product> {
  return apiRequest<Product>(`/api/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteAdminProduct(id: number): Promise<void> {
  await apiRequest<void>(`/api/admin/products/${id}`, { method: "DELETE" });
}

export async function fetchAdminOrders(params: {
  offset?: number;
  limit?: number;
  status?: string | null;
}): Promise<AdminOrderList> {
  const sp = new URLSearchParams();
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  const q = sp.toString();
  return apiRequest<AdminOrderList>(`/api/admin/orders${q ? `?${q}` : ""}`);
}

export async function patchAdminOrderStatus(orderId: number, status: string): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

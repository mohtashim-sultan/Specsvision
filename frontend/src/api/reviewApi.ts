import { apiRequest } from "./http";
import type { ReviewList, ReviewPayload, Review } from "../types/api";

export function fetchReviews(productId: number): Promise<ReviewList> {
  // Auth is optional; if a token is present the response marks the caller's own review.
  return apiRequest<ReviewList>(`/api/products/${productId}/reviews`);
}

export function submitReview(productId: number, payload: ReviewPayload): Promise<Review> {
  return apiRequest<Review>(`/api/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteReview(productId: number): Promise<void> {
  return apiRequest<void>(`/api/products/${productId}/reviews`, { method: "DELETE" });
}

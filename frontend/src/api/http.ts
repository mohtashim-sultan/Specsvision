import { API_BASE } from "../config/env";
import type { ApiErrorBody } from "../types/api";

const TOKEN_KEY = "specsvision_access_token";
const ROLE_KEY = "specsvision_session_role";

export type StoredSessionRole = "user" | "admin";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredRole(): StoredSessionRole | null {
  const r = localStorage.getItem(ROLE_KEY);
  if (r === "user" || r === "admin") return r;
  return null;
}

export function setStoredRole(role: StoredSessionRole | null): void {
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
}

function parseDetail(detail: ApiErrorBody["detail"]): string {
  if (!detail) return "Request failed";
  if (typeof detail === "string") return detail;
  return detail.map((d) => d.msg).join(", ") || "Request failed";
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init.auth !== false) {
    const t = getStoredToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as ApiErrorBody;
      message = parseDetail(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

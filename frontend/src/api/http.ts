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

/**
 * How long a single attempt may take before it is abandoned and retried.
 *
 * A sleeping Render instance can take the better part of a minute to answer, and the
 * browser's own fetch timeout is far longer than that, so without this a cold request
 * simply hangs and the caller renders an error state while the server is still coming up.
 */
const ATTEMPT_TIMEOUT_MS = 15_000;

/** Backoff between attempts. Four tries in total, spanning roughly a minute with timeouts. */
const RETRY_DELAYS_MS = [800, 2_000, 5_000];

/** Only methods that are safe to repeat. Retrying a POST could place a second order. */
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Gateway codes Render returns while an instance is waking, plus generic unavailability. */
const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thrown when every attempt failed to reach the server at all. */
export class NetworkError extends Error {
  constructor(message = "Could not reach the server") {
    super(message);
    this.name = "NetworkError";
  }
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

  const method = (init.method || "GET").toUpperCase();
  // A caller-supplied signal must still be able to cancel us, and retrying after the
  // caller has given up would be pointless work.
  const callerSignal = init.signal ?? null;
  const canRetry = RETRYABLE_METHODS.has(method);
  const attempts = canRetry ? RETRY_DELAYS_MS.length + 1 : 1;

  let lastError: unknown = new NetworkError();

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (callerSignal?.aborted) throw new DOMException("Aborted", "AbortError");

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    callerSignal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (canRetry && RETRYABLE_STATUS.has(res.status) && attempt < attempts - 1) {
          lastError = new NetworkError(`Server returned ${res.status}`);
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
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
      return (await res.json()) as T;
    } catch (err) {
      // The caller cancelled — propagate immediately, never retry.
      if (callerSignal?.aborted) throw new DOMException("Aborted", "AbortError");

      const isTransport =
        err instanceof TypeError || // fetch's network failure
        (err instanceof DOMException && err.name === "AbortError") || // our own timeout
        err instanceof NetworkError;

      if (!isTransport || !canRetry || attempt === attempts - 1) {
        if (isTransport) throw new NetworkError();
        throw err;
      }
      lastError = err;
      await sleep(RETRY_DELAYS_MS[attempt]);
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error ? lastError : new NetworkError();
}

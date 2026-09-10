import { apiRequest, setStoredRole, setStoredToken } from "./http";
import type { Admin, TokenResponse, User } from "../types/api";

export async function loginRequest(email: string, password: string): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  setStoredToken(data.access_token);
  setStoredRole(data.role);
  return data;
}

/**
 * Create an account and sign in, in one call.
 *
 * Signup used to return only a message, with the token issued later by /verify-email.
 * Email verification was removed, so the backend now returns the token here and this
 * stores it exactly as loginRequest does.
 */
export async function signupRequest(
  email: string,
  password: string,
  full_name?: string | null,
): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: full_name || null }),
    auth: false,
  });
  setStoredToken(data.access_token);
  setStoredRole(data.role);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/me");
}

export async function fetchCurrentAdmin(): Promise<Admin> {
  return apiRequest<Admin>("/api/admin/auth/me");
}

export function logoutClient(): void {
  setStoredToken(null);
  setStoredRole(null);
}

export async function updateProfileRequest(
  email?: string,
  full_name?: string | null,
  password?: string,
): Promise<User> {
  const body: any = {};
  if (email) body.email = email;
  if (full_name !== undefined) body.full_name = full_name;
  if (password) body.password = password;
  
  return apiRequest<User>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    auth: false,
  });
}

export async function resetPasswordRequest(
  email: string,
  otp: string,
  new_password: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, new_password }),
    auth: false,
  });
}


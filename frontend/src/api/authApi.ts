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

export interface SignupResponseData {
  message: string;
  email: string;
}

export async function signupRequest(
  email: string,
  password: string,
  full_name?: string | null,
): Promise<SignupResponseData> {
  return apiRequest<SignupResponseData>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: full_name || null }),
    auth: false,
  });
}

export async function verifyEmailRequest(email: string, otp: string): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
    auth: false,
  });
  setStoredToken(data.access_token);
  setStoredRole(data.role);
  return data;
}

export async function resendOtpRequest(email: string): Promise<void> {
  await apiRequest<void>("/api/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
    auth: false,
  });
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


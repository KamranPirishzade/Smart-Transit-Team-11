import { createApiClient } from '@smart-transit/api-client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'operator-token';
const DEVICE_KEY = 'device-id';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable: the operator logs in again on the next visit
  }
}

/** Anonymous id for crowd reports (the API limits 3 per minute per device). */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const created = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return `web-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export const api = createApiClient(API_URL, getToken);

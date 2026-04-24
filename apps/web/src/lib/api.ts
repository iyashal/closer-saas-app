import { supabase } from './supabase';
import { usePaywallStore } from '@/stores/paywall-store';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders,
      ...init.headers,
    },
  });

  if (res.status === 402) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>) as Record<string, unknown>;
    const reason = (body['error'] === 'daily_limit_reached')
      ? 'daily_limit_reached'
      : 'plan_required';
    usePaywallStore.getState().open(reason, body['required_plan'] as string | undefined);
    throw new Error((body['message'] as string | undefined) ?? 'Upgrade required');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((body as { message?: string }).message ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

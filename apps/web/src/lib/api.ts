import ky, { type Options } from 'ky';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await ky.post(`${API_URL}/auth/refresh`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const json = (await res.json()) as { data: { accessToken: string } };
    return json.data.accessToken;
  } catch {
    return null;
  }
}

export const api = ky.create({
  prefix: API_URL,
  credentials: 'include',
  retry: 0,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        if (!request.headers.has('x-request-id')) {
          request.headers.set('x-request-id', crypto.randomUUID());
        }
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        if (response.status !== 401 || request.url.includes('/auth/')) {
          return;
        }
        const token = await refreshAccessToken();
        if (!token) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return;
        }
        useAuthStore.getState().setToken(token);
        request.headers.set('Authorization', `Bearer ${token}`);
        return ky(request);
      },
    ],
  },
});

export interface Envelope<T> {
  success: boolean;
  data: T;
  meta: { requestId: string; timestamp: string };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string | string[];
  instance: string;
}

export async function apiPost<T>(path: string, body: unknown, options?: Options): Promise<T> {
  const res = await api.post(path, { json: body, ...options });
  const json = (await res.json()) as Envelope<T>;
  return json.data;
}

export async function apiGet<T>(path: string, options?: Options): Promise<T> {
  const res = await api.get(path, options);
  const json = (await res.json()) as Envelope<T>;
  return json.data;
}

export async function apiPatch<T>(path: string, body: unknown, options?: Options): Promise<T> {
  const res = await api.patch(path, { json: body, ...options });
  const json = (await res.json()) as Envelope<T>;
  return json.data;
}

export async function apiDelete<T>(path: string, options?: Options): Promise<T> {
  const res = await api.delete(path, options);
  const json = (await res.json()) as Envelope<T>;
  return json.data;
}

/** Extracts human-readable detail from a ky HTTPError. */
export async function problemDetail(error: unknown): Promise<string> {
  const httpError = error as {
    response?: { json: () => Promise<ProblemDetails>; status: number; headers: Headers };
  };
  try {
    const problem = await httpError.response?.json();
    if (!problem) return 'Something went wrong. Please try again.';
    if (Array.isArray(problem.detail)) return problem.detail.join('. ');
    return problem.detail || problem.title;
  } catch {
    return 'Something went wrong. Please try again.';
  }
}

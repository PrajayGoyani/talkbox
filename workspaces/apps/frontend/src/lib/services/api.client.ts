import { API_BASE } from "$lib/config";
import { ApiError } from "$utils/errors";
import { errorStore } from "$state/error.svelte";

export interface RequestOptions extends RequestInit {
  json?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Token provider interface to avoid circular dependencies with authStore.
 */
// eslint-disable-next-line no-var
var getToken: () => string | null = () => null;

export function setTokenProvider(fn: () => string | null) {
  getToken = fn;
}

class ApiClient {
  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { json, params, headers: customHeaders, ...fetchOptions } = options;

    // 1. Construct URL with Search Params
    const url = new URL(
      `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`,
      window.location.origin,
    );
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
    }

    // 2. Setup Headers
    const headers = new Headers(customHeaders);
    if (json) {
      if (json instanceof FormData) {
        fetchOptions.body = json;
        // Note: We do NOT set Content-Type for FormData.
        // The browser must set it automatically with the boundary string.
      } else {
        headers.set("Content-Type", "application/json");
        fetchOptions.body = JSON.stringify(json);
      }
    }

    // 3. Inject Auth Token
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // 4. Execute Fetch
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      credentials: "include",
    });

    // 5. Handle Errors
    if (!response.ok) {
      const error = await ApiError.fromResponse(response);
      errorStore.handleGlobalError(error);
      throw error;
    }

    // 6. Parse Response
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();
      // Most of our endpoints wrap data in a 'data' property
      return (result.data !== undefined ? result.data : result) as T;
    }

    return (await response.text()) as unknown as T;
  }

  get<T>(path: string, options?: Omit<RequestOptions, "body" | "method">) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, json?: any, options?: Omit<RequestOptions, "body" | "method" | "json">) {
    return this.request<T>(path, { ...options, method: "POST", json });
  }

  put<T>(path: string, json?: any, options?: Omit<RequestOptions, "body" | "method" | "json">) {
    return this.request<T>(path, { ...options, method: "PUT", json });
  }

  patch<T>(path: string, json?: any, options?: Omit<RequestOptions, "body" | "method" | "json">) {
    return this.request<T>(path, { ...options, method: "PATCH", json });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, "body" | "method">) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();

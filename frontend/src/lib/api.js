// Thin fetch wrapper for the FastAPI backend. No axios — plain fetch is
// enough for this surface area, and it keeps the dependency list honest.
//
// Backend base URL comes from a Vite env var (see .env / .env.example) so
// the exact same build works against the local backend in dev and the
// deployed backend in production — nothing environment-specific is baked
// into the bundle. Falls back to the local backend if the var is ever
// unset, so a fresh checkout without a .env file still works for local dev
// instead of silently breaking every request.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// The bearer token lives here, outside React, so this module can attach it
// to every request without importing AuthContext (which would create a
// circular dependency). AuthContext is the only thing that calls
// setAuthToken — this is not a second source of truth, just where the
// fetch layer reads the token AuthContext already owns.
let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network failure / backend unreachable — not an HTTP error response.
    throw new ApiError(0, "Could not reach the server. Is the API running?");
  }

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? payload.detail
        : payload;
    throw new ApiError(res.status, detail);
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

// FastAPI's 422 shape is a list of {loc, msg, type}; every other handled
// error is a plain string under `detail`. These two helpers normalize
// each case for the UI so pages don't need to know the difference.
export function fieldErrorsFromDetail(detail) {
  if (!Array.isArray(detail)) return {};
  const fieldErrors = {};
  for (const err of detail) {
    const field = err.loc?.[err.loc.length - 1];
    if (typeof field === "string") {
      fieldErrors[field] = err.msg;
    }
  }
  return fieldErrors;
}

export function messageFromDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg).join(" ");
  }
  return "Something went wrong. Please try again.";
}

// Builds a query string from a params object, dropping empty/undefined
// values so an unset filter never becomes e.g. "?city=" on the wire.
export function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

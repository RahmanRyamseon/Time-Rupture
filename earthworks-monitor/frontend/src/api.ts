import i18n from "./i18n";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function detailToMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{loc: [...], msg: "..."}]
    return detail
      .map((d) => `${(d.loc ?? []).slice(1).join(".")}: ${d.msg}`)
      .join("; ");
  }
  return i18n.t("error.generic");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: "same-origin" };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(0, i18n.t("error.network"));
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, detailToMessage(payload?.detail));
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : i18n.t("error.generic");
}

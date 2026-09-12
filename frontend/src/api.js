import { clearToken, getToken } from "./auth";

function authHeaders(additional = {}) {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...additional }
    : additional;
}

export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    headers: authHeaders(headers || {}),
  });

  if (response.status === 401) {
    clearToken();
  }

  return response;
}

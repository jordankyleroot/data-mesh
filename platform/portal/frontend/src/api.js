const BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function request(method, path, body) {
  const token = localStorage.getItem('datamesh_token');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet  = (path)         => request('GET',    path);
export const apiPost = (path, body)   => request('POST',   path, body);
export const apiPut  = (path, body)   => request('PUT',    path, body);
export const apiDel  = (path)         => request('DELETE', path);

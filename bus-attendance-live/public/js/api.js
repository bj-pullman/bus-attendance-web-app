// api.js - simple helpers
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opts));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getAll(resource) {
  return apiFetch(`/api/${resource}`);
}

export async function post(resource, data) {
  return apiFetch(`/api/${resource}`, { method: 'POST', body: JSON.stringify(data) });
}

export async function put(resource, id, data) {
  return apiFetch(`/api/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function del(resource, id) {
  return apiFetch(`/api/${resource}/${id}`, { method: 'DELETE' });
}

export async function login(password) {
  return apiFetch(`/api/login`, { method: 'POST', body: JSON.stringify({ password }) });
}

export async function logout() {
  return apiFetch(`/api/logout`, { method: 'POST' });
}

export async function markComplete(table, id, completed) {
  return apiFetch('/api/mark-complete', { method: 'POST', body: JSON.stringify({ table, id, completed }) });
}

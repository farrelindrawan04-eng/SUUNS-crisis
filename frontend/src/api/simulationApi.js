const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:8081';
const SESSION_BASE = `${API_ORIGIN}/api/crisis/sessions`;
let csrfToken = '';

async function apiRequest(url, options = {}) {
  const method = options.method ?? 'GET';
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;
  const response = await fetch(url, { credentials: 'include', ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? (response.status === 401 ? 'Invalid username or password' : `API failed with ${response.status}`));
  }
  return response.status === 204 ? null : response.json();
}

export async function initializeAuth() {
  const result = await apiRequest(`${API_ORIGIN}/api/auth/csrf`);
  csrfToken = result.token;
}
export function login(username, password) {
  return apiRequest(`${API_ORIGIN}/api/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) });
}
export async function logout() {
  await apiRequest(`${API_ORIGIN}/api/auth/logout`, { method: 'POST' });
  await initializeAuth();
}
export function getCurrentUser() { return apiRequest(`${API_ORIGIN}/api/auth/me`); }
export function listStaff() { return apiRequest(`${API_ORIGIN}/api/auth/staff`); }
export function createStaffAccount(input) {
  return apiRequest(`${API_ORIGIN}/api/auth/staff`, { method: 'POST', body: JSON.stringify(input) });
}
export function createSession(name) {
  return apiRequest(SESSION_BASE, { method: 'POST', body: JSON.stringify({ name, seed: 42 }) });
}
export function getSession(id) { return apiRequest(`${SESSION_BASE}/${id}`); }
export function advanceTick(id) { return apiRequest(`${SESSION_BASE}/${id}/ticks`, { method: 'POST' }); }

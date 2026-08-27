const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? (import.meta.env.DEV ? 'http://localhost:8081' : '');
const SESSION_BASE = `${API_ORIGIN}/api/crisis/sessions`;
const TRACK_BASE = `${API_ORIGIN}/api/crisis/tracks`;
const OPS_BASE = `${API_ORIGIN}/api/operations`;
const FEED_BASE = `${API_ORIGIN}/api/feed`;
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
export function deleteStaffAccount(id) { return apiRequest(`${API_ORIGIN}/api/auth/staff/${id}`, { method: 'DELETE' }); }
export function listTracks() { return apiRequest(TRACK_BASE); }
export function createTrack(input) {
  return apiRequest(TRACK_BASE, { method: 'POST', body: JSON.stringify(input) });
}
export function createSession(name, trackId) {
  return apiRequest(SESSION_BASE, { method: 'POST', body: JSON.stringify({ name, seed: 42, trackId }) });
}
export function getSession(id) { return apiRequest(`${SESSION_BASE}/${id}`); }
export function listSessions() { return apiRequest(SESSION_BASE); }
export function advanceTick(id) { return apiRequest(`${SESSION_BASE}/${id}/ticks`, { method: 'POST' }); }
export function submitDirectiveAction(sessionId, input) { return apiRequest(`${SESSION_BASE}/${sessionId}/policies`, { method: 'POST', body: JSON.stringify(input) }); }
export function listDelegates(sessionId) { return apiRequest(`${OPS_BASE}/sessions/${sessionId}/delegates`); }
export function createDelegate(sessionId, input) { return apiRequest(`${OPS_BASE}/sessions/${sessionId}/delegates`, { method: 'POST', body: JSON.stringify(input) }); }
export function deleteDelegate(id) { return apiRequest(`${OPS_BASE}/delegates/${id}`, { method: 'DELETE' }); }
export function listDirectives(sessionId) { return apiRequest(`${OPS_BASE}/sessions/${sessionId}/directives`); }
export function respondToDirective(id, body) { return apiRequest(`${OPS_BASE}/directives/${id}/responses`, { method: 'POST', body: JSON.stringify({ body }) }); }
export function updateDirectiveStatus(id, status) { return apiRequest(`${OPS_BASE}/directives/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); }
export function getDelegateProfile() { return apiRequest(`${OPS_BASE}/delegate/profile`); }
export function getDelegateSituation() { return apiRequest(`${OPS_BASE}/delegate/situation`); }
export function listMyDirectives() { return apiRequest(`${OPS_BASE}/delegate/directives`); }
export function createDirective(input) { return apiRequest(`${OPS_BASE}/delegate/directives`, { method: 'POST', body: JSON.stringify(input) }); }
export function replyAsDelegate(id, body) { return apiRequest(`${OPS_BASE}/delegate/directives/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }); }
export function listPublicFeed(sessionId) { return apiRequest(`${FEED_BASE}/sessions/${sessionId}`); }
export function listStaffFeed(sessionId) { return apiRequest(`${FEED_BASE}/staff/sessions/${sessionId}`); }
export function createFeedCard(sessionId, input) { return apiRequest(`${FEED_BASE}/staff/sessions/${sessionId}`, { method: 'POST', body: JSON.stringify(input) }); }
export function updateFeedCard(id, input) { return apiRequest(`${FEED_BASE}/staff/cards/${id}`, { method: 'PUT', body: JSON.stringify(input) }); }
export function subscribeToPublicFeed(sessionId, onCard, onConnection) {
  const stream = new EventSource(`${FEED_BASE}/sessions/${sessionId}/stream`, { withCredentials: true });
  stream.onopen = () => onConnection?.(true);
  stream.onerror = () => onConnection?.(false);
  stream.addEventListener('feed-card', (event) => onCard(JSON.parse(event.data)));
  return () => stream.close();
}

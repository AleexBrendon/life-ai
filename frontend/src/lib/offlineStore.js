const DB_NAME = 'lifeai-offline-v1';
export const accountId = () => localStorage.getItem('lifeai_account');
export const offlineEnabled = () => !!accountId() && localStorage.getItem(`lifeai_offline_${accountId()}`) === 'true';
export const rememberAccount = user => { if (user?.id) localStorage.setItem('lifeai_account', String(user.id)); };
const notify = () => window.dispatchEvent(new Event('lifeai:offline-updated'));
let localLock = Promise.resolve();
function accountLock(id, action) {
  if (navigator.locks?.request) return navigator.locks.request(`lifeai-offline-${id}`, action);
  const next = localLock.catch(() => {}).then(action); localLock = next; return next;
}
async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('cache', { keyPath: 'key' }); request.result.createObjectStore('queue', { keyPath: 'sequence', autoIncrement: true }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function transaction(store, mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode); let result;
    try { const request = operation(tx.objectStore(store)); request.onsuccess = () => { result = request.result; }; }
    catch (error) { db.close(); reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(result); }; tx.onerror = () => { db.close(); reject(tx.error); }; tx.onabort = () => { db.close(); reject(tx.error || new Error('Armazenamento cancelado.')); };
  });
}
const read = key => transaction('cache', 'readonly', store => store.get(key));
const write = value => transaction('cache', 'readwrite', store => store.put(value));
const tokenHash = async () => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(localStorage.getItem('lifeai_token') || '')))].map(byte => byte.toString(16).padStart(2, '0')).join('');
export function cacheKey(config) {
  const url = new URL(config.url, location.origin), params = new URLSearchParams(url.search);
  for (const [key, value] of Object.entries(config.params || {})) if (value != null) params.set(key, String(value));
  params.sort(); return url.pathname + (params.size ? '?' + params.toString() : '');
}
const cacheable = path => /^\/(?:auth\/me|users\/me|dashboard|activity-status|goals|planner\/(?:rotinas|metas|trabalho|lembretes|imprevistos)|evolution\/goals\/\d+)$/.test(path);
function offlineError(message) { return Object.assign(new Error(message), { code: 'ERR_OFFLINE_UNAVAILABLE', response: { status: 503, data: { success: false, message } } }); }
async function authorizedSnapshot() {
  const id = accountId();
  const entry = id && await read(`${id}:/auth/me`);
  if (!entry || entry.tokenHash !== await tokenHash()) throw offlineError('Conecte-se para confirmar esta conta antes de usar os dados offline.');
  let expires;
  try { expires = JSON.parse(atob(localStorage.getItem('lifeai_token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp; } catch { throw offlineError('Conecte-se para confirmar sua sessão.'); }
  if (!Number.isFinite(expires) || expires * 1000 <= Date.now()) throw offlineError('Sua sessão expirou. Conecte-se para entrar novamente.');
  return id;
}
export async function queueEntries() {
  const id = accountId(); if (!id) return [];
  return (await transaction('queue', 'readonly', store => store.getAll())).filter(row => row.account === id).sort((a, b) => a.sequence - b.sequence);
}
function overlay(body, rows) {
  const result = structuredClone(body);
  const activities = Array.isArray(result.data) ? result.data : result.data?.activities;
  if (!Array.isArray(activities)) return result;
  for (const entry of rows.filter(row => row.state === 'PENDING')) {
    const item = activities.find(item => item.kind === entry.input.kind && item.sourceId === entry.input.sourceId);
    if (item) item.status = entry.input.status;
  }
  if (result.data?.summary && Array.isArray(result.data.activities)) {
    result.data.summary.completed = activities.filter(item => item.status === 'COMPLETED').length;
    result.data.summary.skipped = activities.filter(item => item.status === 'SKIPPED').length;
    result.data.summary.pending = activities.filter(item => item.status === 'PENDING').length;
  }
  return result;
}
export async function offlineResponse(config) {
  if (!offlineEnabled()) throw offlineError('Esta operação precisa de conexão. Ative o modo offline antes de desconectar.');
  const id = await authorizedSnapshot(), key = cacheKey(config), path = key.split('?')[0];
  if (config.method === 'get' && cacheable(path)) {
    const stored = await read(`${id}:${key}`);
    if (!stored) throw offlineError('Esta tela ainda não foi salva neste dispositivo. Abra-a com conexão primeiro.');
    const date = path === '/dashboard' ? stored.body.data.date : new URLSearchParams(key.split('?')[1]).get('date');
    return { data: overlay(stored.body, (await queueEntries()).filter(row => row.input.date === date)), status: 200, statusText: 'Offline', config, headers: {}, offline: true };
  }
  if (config.method !== 'put' || path !== '/activity-status') throw offlineError('Somente concluir, pular ou retomar atividades está disponível offline.');
  const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  const snapshot = await read(`${id}:/activity-status?date=${input.date}`) || await read(`${id}:/dashboard`);
  if (!snapshot || snapshot.body.data?.date && snapshot.body.data.date !== input.date) throw offlineError('Abra as atividades deste dia com conexão antes de alterá-las offline.');
  const entries = (await queueEntries()).filter(row => row.input.date === input.date);
  if ((await queueEntries()).length >= 500) throw offlineError('Sincronize ou revise as 500 ações pendentes antes de adicionar outras.');
  const cached = overlay(snapshot.body, entries);
  const current = (Array.isArray(cached.data) ? cached.data : cached.data.activities)?.find(row => row.kind === input.kind && row.sourceId === input.sourceId);
  if (!current) throw offlineError('A atividade não está disponível nos dados salvos.');
  await accountLock(id, async () => {
    if (!offlineEnabled() || accountId() !== id) throw offlineError('A conta mudou. Entre novamente antes de registrar esta ação.');
    await transaction('queue', 'readwrite', store => store.add({ account: id, id: crypto.randomUUID(), input, expectedStatus: current.status, state: 'PENDING', queuedAt: new Date().toISOString() }));
  });
  notify();
  return { data: { success: true, offlineQueued: true, data: { status: input.status } }, status: 202, statusText: 'Queued', config, headers: {}, offline: true };
}
export async function cacheResponse(response) {
  const config = response.config;
  if (config.headers?.Authorization && config.headers.Authorization !== `Bearer ${localStorage.getItem('lifeai_token')}`) return;
  if (config.url === '/auth/me' && response.data.data?.user && !response.offline) rememberAccount(response.data.data.user);
  if (!offlineEnabled() || response.offline || config.method !== 'get' || !cacheable(cacheKey(config).split('?')[0])) return;
  const id = accountId();
  if (config.accountAtRequest && config.accountAtRequest !== id) return;
  await accountLock(id, async () => {
    const fingerprint = await tokenHash();
    if (!offlineEnabled() || accountId() !== id) return;
    await write({ key: `${id}:${cacheKey(config)}`, account: id, body: response.data, tokenHash: fingerprint, savedAt: new Date().toISOString() });
  });
}
export async function discardOperation(sequence) {
  if (!(await queueEntries()).some(row => row.sequence === sequence)) return;
  await transaction('queue', 'readwrite', store => store.delete(sequence)); notify();
}
export async function purgeOffline(id = accountId()) {
  if (!id || !globalThis.indexedDB) return;
  localStorage.removeItem(`lifeai_offline_${id}`);
  await accountLock(id, async () => { for (const storeName of ['cache', 'queue']) {
    const rows = await transaction(storeName, 'readonly', store => store.getAll());
    for (const row of rows.filter(row => row.account === id)) await transaction(storeName, 'readwrite', store => store.delete(storeName === 'cache' ? row.key : row.sequence));
  } });
  notify();
}
export async function setOfflineEnabled(enabled) {
  if (!accountId()) throw new Error('Entre na conta primeiro.');
  if (!enabled) return purgeOffline();
  const db = await database(); db.close();
  localStorage.setItem(`lifeai_offline_${accountId()}`, 'true'); notify();
}
export async function synchronize(api) {
  if (!navigator.onLine) throw new Error('Conecte-se antes de sincronizar.');
  // An online identity check precedes every replay; credentials are never stored in the queue.
  await api.get('/auth/me');
  const selected = (await queueEntries()).filter(row => row.state === 'PENDING').slice(0, 50);
  if (!selected.length) return [];
  const response = await api.post('/evolution/sync', { operations: selected.map(({ id, input, expectedStatus }) => ({ id, input, expectedStatus })) });
  for (const result of response.data) {
    const entry = selected.find(row => row.id === result.id);
    if (result.status === 'APPLIED') await transaction('queue', 'readwrite', store => store.delete(entry.sequence));
    else await transaction('queue', 'readwrite', store => store.put({ ...entry, state: result.status === 'CONFLICT' ? 'CONFLICT' : 'PENDING', message: result.message }));
  }
  notify(); window.dispatchEvent(new Event('lifeai:agenda-updated'));
  return response.data;
}

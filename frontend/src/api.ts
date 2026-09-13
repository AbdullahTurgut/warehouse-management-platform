import { apiError } from './turkish';

let authorization = '';
export function setCredentials(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  authorization = `Basic ${btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))}`;
}
export function clearCredentials() { authorization = ''; }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!navigator.onLine) throw new Error('Bağlantı yok. Devam etmeden önce yeniden bağlanın.');
  const csrf = method === 'GET' ? undefined : await api<{ headerName: string; token: string }>('/auth/csrf');
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method, credentials: 'same-origin', headers: { ...(authorization ? { Authorization: authorization } : {}),
        ...(csrf ? { [csrf.headerName]: csrf.token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
  } catch {
    throw new Error(method === 'GET' ? 'Sunucuya ulaşılamıyor. Sunucunun çalıştığından emin olun ve bağlantınızı kontrol edin.' : 'Sunucudan onay alınamadı. İşlem tamamlanmış olabilir; tekrar denemeden önce stokları yenileyip kontrol edin.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiError(data?.message, response.status));
  return data as T;
}
export function query(values: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(values).filter(([,v]) => v !== '').map(([k,v]) => [k,String(v)])).toString();
}
export function operationId() {
  // getRandomValues also works on a phone accessing Vite over a local HTTP address.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

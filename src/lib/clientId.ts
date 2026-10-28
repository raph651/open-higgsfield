const STORAGE_KEY = 'openframe-client-id';

export function getClientId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `openframe_client=${id}; Path=/; SameSite=Lax${secure}`;
    return id;
  } catch {
    return 'local-session';
  }
}

// Client-side helpers for Web Push (weekly reminders).
'use client';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const flagKey = (userId: string) => `m_push_${userId}`;

function toUint8(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker() {
  if (!pushSupported()) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

export function pushIsOn(userId?: string) {
  if (!userId || !pushSupported()) return false;
  try { return localStorage.getItem(flagKey(userId)) === '1' && Notification.permission === 'granted'; } catch { return false; }
}

export async function enablePush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, reason: 'nokey' };
  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: 'unsupported' };
  const permission = await Notification.requestPermission(); // must come from a tap
  if (permission !== 'granted') return { ok: false, reason: 'denied' };
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(key) as BufferSource }));
  const res = await fetch('/api/push/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, subscription: sub.toJSON() }),
  });
  if (!res.ok) return { ok: false, reason: 'server' };
  try { localStorage.setItem(flagKey(userId), '1'); } catch { /* ignore */ }
  return { ok: true };
}

export async function disablePush(userId: string) {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
  } catch { /* ignore */ }
  try { localStorage.removeItem(flagKey(userId)); } catch { /* ignore */ }
}

export type ReminderItem = { userId: string; ttl: number; payload: Record<string, unknown> };
export async function sendReminders(items: ReminderItem[]) {
  const res = await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { sent: number; noSubscription: string[] };
}

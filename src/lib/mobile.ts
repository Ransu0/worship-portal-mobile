// Helpers for the mobile redesign. Pure functions only — no storage access here.
import { MemberCapability, SundayAssignment, SundaySchedule, User } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ROLE_LABEL: Record<MemberCapability, string> = {
  songleader: 'Song leader',
  backup: 'Backup',
  guitar: 'Guitar',
  bass: 'Bass',
  drums: 'Drums',
  keys: 'Keys',
  media: 'Media',
  tambourines: 'Tambourine',
};
export const ALL_CAPS: MemberCapability[] = ['songleader', 'backup', 'guitar', 'bass', 'drums', 'keys', 'media', 'tambourines'];
export const MUSICIAN_ORDER: MemberCapability[] = ['guitar', 'bass', 'drums', 'keys', 'media', 'tambourines'];

export type StatusKind = 'ok' | 'wait' | 'absent';
export const statusOf = (a: SundayAssignment): StatusKind =>
  a.status === 'confirmed' || a.status === 'attended' ? 'ok' : a.status === 'absent' ? 'absent' : 'wait';
export const STATUS_LABEL: Record<StatusKind, string> = { ok: 'Confirmed', wait: 'Not yet', absent: 'Absent' };

/** Parse 'YYYY-MM-DD' as a local date at noon (avoids timezone day shifts). */
export const parseDay = (d: string) => new Date(d + 'T12:00:00');
export const dLbl = (d: string) => { const x = parseDay(d); return `${MON[x.getMonth()]} ${x.getDate()}`; };
export const longDay = (d: string) => { const x = parseDay(d); return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][x.getDay()]}, ${MON[x.getMonth()]} ${x.getDate()}`; };
export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const parseMonthKey = (k: string) => { const [y, m] = k.split('-').map(Number); return { y, m: m - 1 }; };
export const monthName = (k: string) => { const { y, m } = parseMonthKey(k); return `${MONTHS[m]} ${y}`; };
export const addMonth = (k: string, n: number) => { const { y, m } = parseMonthKey(k); return monthKeyOf(new Date(y, m + n, 1)); };
export const todayStr = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

/**
 * Weekly reminder window: sent the Sunday before at 3:00 PM,
 * replies close Wednesday 3:00 PM (3 days before Saturday practice).
 */
export function replyWindow(sundayDate: string) {
  const sun = parseDay(sundayDate);
  const sendAt = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() - 7, 15, 0, 0);
  const replyBy = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() - 4, 15, 0, 0);
  return { sendAt, replyBy };
}
export const replyByLabel = (sundayDate: string) => {
  const { replyBy } = replyWindow(sundayDate);
  return `${WEEKDAY[replyBy.getDay()]}, ${MON[replyBy.getMonth()]} ${replyBy.getDate()} · 3:00 PM`;
};
export const replyClosed = (sundayDate: string) => Date.now() > replyWindow(sundayDate).replyBy.getTime();

/** The assignment for a user on a Sunday, including when someone is covering for them. */
export function findMine(s: SundaySchedule | null, userId?: string) {
  if (!s || !userId) return null;
  const direct = s.assignments.find((a) => a.userId === userId);
  if (direct) return { a: direct, covered: false };
  const cov = s.assignments.find((a) => (a.history || []).some((h) => h.userId === userId && h.type === 'swap'));
  return cov ? { a: cov, covered: true } : null;
}
/** First person this slot was originally given to, when it has been swapped. */
export const coveringFor = (a: SundayAssignment) => {
  const h = (a.history || []).filter((x) => x.type === 'swap');
  return h.length ? h[0].userName : null;
};

/** Same rules as the app: backups can be covered by backups or song leaders. */
export function eligibleReplacements(users: User[], s: SundaySchedule, role: MemberCapability, excludeId?: string) {
  const assigned = new Set(s.assignments.map((a) => a.userId));
  return users.filter((u) => {
    if (!u.active || u.id === excludeId || assigned.has(u.id)) return false;
    if (role === 'backup') return u.capabilities.includes('backup') || u.capabilities.includes('songleader');
    return u.capabilities.includes(role);
  });
}

export const firstName = (u?: Pick<User, 'fullName'> | null) => (u?.fullName || '').split(' ')[0] || '';

export function exportStamp(now = new Date()) {
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { line: `Exported: ${date} · ${time}`, month: `Month: ${MONTHS[now.getMonth()]} ${now.getFullYear()}` };
}

export const getSundaysCount = (y: number, m: number) => {
  let n = 0;
  const d = new Date(y, m, 1);
  while (d.getMonth() === m) { if (d.getDay() === 0) n++; d.setDate(d.getDate() + 1); }
  return n;
};

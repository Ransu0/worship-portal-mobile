'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@/app/mobile.css';
import { Lineup, MemberCapability, PointLog, SundayAssignment, SundaySchedule, User } from '@/lib/types';
import { StorageService, DEFAULT_PASSWORD } from '@/lib/storage';
import { SupabaseService } from '@/lib/supabaseService';
import {
  ROLE_LABEL, dLbl, exportStamp, findMine, firstName, monthKeyOf, monthName, parseMonthKey, replyByLabel, replyClosed,
  replyWindow, statusOf, MONTHS, addMonth, getSundaysCount,
} from '@/lib/mobile';
import { disablePush, enablePush, pushIsOn, pushSupported, registerServiceWorker, sendReminders, ReminderItem } from '@/lib/push';
import { Icon, HeroRows, Sheet, Tab, plural } from './ui';
import {
  AppCtx, CantView, EditMemberView, EditSongsView, HomeView, ImportView, MarkDoneView, MeView, PointsView, Role, ScheduleView,
  SignInView, SongsView, SundayView, SwapView, TeamView, View, setDefaultPassword,
} from './views';

setDefaultPassword(DEFAULT_PASSWORD);

type SheetState = null | { kind: 'shuffle' | 'clear' | 'resetAdmin' | 'export'; data?: string; title?: string };

export default function MobileApp() {
  const [users, setUsers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<SundaySchedule[]>([]);
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [view, setView] = useState<View>('home');
  const [stack, setStack] = useState<View[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [swap, setSwap] = useState<SundayAssignment | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState(monthKeyOf(new Date()));
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirmCard, setConfirmCard] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [welcomeTick, setWelcomeTick] = useState(0);
  const [pushOn, setPushOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(() => {
    const us = StorageService.getUsers();
    setUsers(us);
    setSchedules(StorageService.getSchedules());
    setLogs(StorageService.getPointLogs());
    const cur = StorageService.getCurrentUser();
    const fresh = cur ? us.find((u) => u.id === cur.id) || null : null;
    if (fresh) StorageService.setCurrentUser(fresh);
    setMe(fresh);
  }, []);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  // load (+ Supabase sync like the desktop page, when configured)
  useEffect(() => {
    refresh();
    registerServiceWorker();
    if (SupabaseService.isEnabled()) {
      Promise.all([SupabaseService.fetchUsers(), SupabaseService.fetchSchedules(), SupabaseService.fetchPointLogs()]).then(([u, s, l]) => {
        if (u && u.length) StorageService.saveUsers(u);
        if (s && s.length) StorageService.saveSchedules(s);
        if (l && l.length) StorageService.savePointLogs(l);
        refresh();
      });
    }
  }, [refresh]);

  useEffect(() => { setPushOn(pushIsOn(me?.id)); }, [me]);

  const upcoming = useMemo(() => {
    if (!schedules.length) return null;
    return StorageService.getUpcomingTwoSchedules().upcoming;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules]);

  const role: Role = !me ? 'guest' : me.role === 'admin' ? 'admin' : upcoming && upcoming.songleaderId === me.id ? 'leader' : 'member';
  const sel = schedules.find((s) => s.id === selId) || null;
  const editUser = editUserId ? users.find((u) => u.id === editUserId) || null : null;

  // navigation
  const go: AppCtx['go'] = (v, opts) => {
    if (opts?.selId !== undefined) setSelId(opts.selId);
    if (opts?.swap) setSwap(opts.swap);
    if (opts && 'editUserId' in opts) setEditUserId(opts.editUserId ?? null);
    setStack((s) => [...s, view]);
    setView(v);
  };
  const back = () => { setStack((s) => { const n = [...s]; const prev = n.pop() || 'home'; setView(prev); return n; }); };
  const tab = (t: Tab) => {
    setStack([]); setView(t); setSheet(null);
    if (t === 'schedule' && upcoming) setMonthKey(upcoming.month);
  };
  const home = () => { setStack([]); setView('home'); };

  // reply from a notification (?reply=yes|no|open&s=<scheduleId>) or a message from the service worker
  const handleReply = useCallback((reply: string, scheduleId: string) => {
    const s = StorageService.getSchedules().find((x) => x.id === scheduleId);
    const cur = StorageService.getCurrentUser();
    if (!s) return;
    if (!cur) { toast('Sign in to reply'); setView('signin'); return; }
    const mine = findMine(s, cur.id);
    if (!mine || mine.covered) { home(); return; }
    if (replyClosed(s.date)) { toast('Reply time ended. Ask your leader.'); home(); return; }
    if (reply === 'yes') { StorageService.confirmAssignment(s.id, cur.id); refresh(); home(); toast("Thanks! You're confirmed"); }
    else if (reply === 'no') { setStack([]); setView('cant'); }
    else if (statusOf(mine.a) === 'wait') { home(); setConfirmCard(true); }
    else home();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, toast]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const reply = p.get('reply'), sid = p.get('s');
    if (reply && sid) { handleReply(reply, sid); window.history.replaceState(null, '', window.location.pathname + (p.get('view') ? `?view=${p.get('view')}` : '')); }
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'reply') handleReply(e.data.reply, e.data.scheduleId); };
    if (pushSupported()) navigator.serviceWorker.addEventListener('message', onMsg);
    return () => { if (pushSupported()) navigator.serviceWorker.removeEventListener('message', onMsg); };
  }, [handleReply]);

  // welcome cards (Task 6)
  const welcomeKey = `m_welcome_${role}_${me?.id || 'guest'}`;
  const welcomeOn = useMemo(() => { try { return localStorage.getItem(welcomeKey) !== '0'; } catch { return true; } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [welcomeKey, welcomeTick]);
  const dismissWelcome = () => { try { localStorage.setItem(welcomeKey, '0'); } catch { /* ignore */ } setWelcomeTick((t) => t + 1); };

  const adminName = me?.fullName || 'Admin';
  const act: AppCtx['act'] = {
    signIn: (u, p) => {
      const user = StorageService.getUsers().find((x) => x.username.toLowerCase() === u.trim().toLowerCase());
      if (!user || !user.active) return false;
      if (p !== (user.password || DEFAULT_PASSWORD)) return false;
      StorageService.setCurrentUser(user); refresh(); home(); toast(`Welcome back, ${firstName(user)}`);
      return true;
    },
    signOut: () => { StorageService.setCurrentUser(null); refresh(); home(); toast('Signed out'); },
    confirm: (s) => { if (!me) return; StorageService.confirmAssignment(s.id, me.id); refresh(); toast("Thanks! You're confirmed"); },
    stepDown: (s, replacementId, reason) => {
      if (!me) return;
      if (replacementId) { StorageService.swapMember(s.id, me.id, replacementId, reason); toast(`Asked ${users.find((u) => u.id === replacementId)?.fullName} to cover`); }
      else { StorageService.markMemberAbsent(s.id, me.id, reason); toast('Your leader has been told'); }
      refresh(); home();
    },
    saveLineup: (s, l: Lineup) => { StorageService.saveLineup(s.id, l); refresh(); back(); toast('Songs saved'); },
    adminReplace: (s, userId, replacementId) => {
      const t = users.find((u) => u.id === userId);
      if (replacementId) { StorageService.swapMember(s.id, userId, replacementId, `Changed by ${adminName}`); toast(`${users.find((u) => u.id === replacementId)?.fullName} replaces ${t?.fullName}`); }
      else { StorageService.markMemberAbsent(s.id, userId, `Marked by ${adminName}`); toast(`${t?.fullName} marked absent`); }
      refresh(); back();
    },
    markDone: (s, ids) => { const n = StorageService.completeSundayWithAttendance(s.id, ids, 10, adminName); refresh(); back(); toast(`+10 given to ${plural(n, 'member')}`); return n; },
    adjust: (u, delta, reason) => { StorageService.adjustPoints(u.id, delta, reason, adminName); refresh(); toast(`${delta > 0 ? '+' : '−'}${Math.abs(delta)} for ${u.fullName}`); },
    addUser: (u) => { StorageService.addUser(u); refresh(); back(); toast(`${u.fullName} added`); },
    updateUser: (u) => { StorageService.updateUser(u); refresh(); back(); toast('Saved'); },
    resetPassword: (u) => { StorageService.updateUser({ ...u, password: DEFAULT_PASSWORD }); refresh(); toast('Password reset to default'); },
    deleteUser: (id) => { const u = users.find((x) => x.id === id); StorageService.deleteUser(id); refresh(); back(); toast(`${u?.fullName} removed`); },
    importNames: (names, cap: MemberCapability) => {
      const existing = new Set(StorageService.getUsers().map((u) => u.fullName.toLowerCase()));
      let n = 0;
      names.forEach((name) => {
        if (existing.has(name.toLowerCase())) return;
        const parts = name.toLowerCase().split(/\s+/);
        const username = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
        StorageService.addUser({ fullName: name, username, role: 'member', capabilities: [cap], instrument: cap, points: 0, absentCount: 0, active: true });
        existing.add(name.toLowerCase()); n++;
      });
      refresh(); if (n) back();
      return n;
    },
    exportLogins: async (list, title) => {
      const st = exportStamp();
      const line = (u: User) => `${u.fullName} · @${u.username} · ${u.password && u.password !== DEFAULT_PASSWORD ? 'own password (ask member)' : 'default password'} · ${u.capabilities.map((c) => ROLE_LABEL[c]).join(', ') || 'No ministry'}${u.role === 'admin' ? ' · Admin' : ''}${u.active ? '' : ' · Inactive'}`;
      const text = `COG Worship Team — ${list.length > 1 ? 'Member logins' : 'Login'}\n${st.line}\n${st.month}\n${list.length > 1 ? `Total: ${list.length} members\n` : ''}\n${list.map(line).join('\n')}`;
      setSheet({ kind: 'export', data: text, title });
      try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Select the text to copy'); }
    },
  };

  // reminders (Task 1)
  const reminders = {
    on: pushOn,
    supported: pushSupported(),
    enable: async () => {
      if (!me) return;
      const r = await enablePush(me.id);
      if (r.ok) { setPushOn(true); toast('Reminders on: every Sunday afternoon'); }
      else toast(r.reason === 'denied' ? 'Notifications are blocked in your phone settings' : r.reason === 'unsupported' ? 'On iPhone, add the app to your Home Screen first' : 'Could not turn on reminders');
    },
    disable: async () => { if (!me) return; await disablePush(me.id); setPushOn(false); toast('Reminders off'); },
  };
  const sendTestReminder = async () => {
    if (!upcoming) { toast('No Sunday scheduled'); return; }
    const { replyBy } = replyWindow(upcoming.date);
    const ttlAsk = Math.max(60, Math.floor((replyBy.getTime() - Date.now()) / 1000));
    const items: ReminderItem[] = upcoming.assignments.filter((a) => statusOf(a) !== 'absent').map((a) => {
      const ask = statusOf(a) === 'wait' && !replyClosed(upcoming.date);
      return {
        userId: a.userId,
        ttl: ask ? ttlAsk : 24 * 3600,
        payload: {
          title: `Sun, ${dLbl(upcoming.date)} · ${ROLE_LABEL[a.role]}`,
          body: ask ? `${upcoming.worshipTime} · Can you serve?\nReply by ${replyByLabel(upcoming.date)}` : `${upcoming.worshipTime} · You're confirmed`,
          scheduleId: upcoming.id, userId: a.userId, ask,
        },
      };
    });
    try {
      const r = await sendReminders(items);
      toast(`Sent to ${plural(r.sent, 'phone')}${r.noSubscription.length ? ` · ${r.noSubscription.length} without reminders` : ''}`);
    } catch { toast('Could not send (is the test server running?)'); }
  };

  const app: AppCtx = {
    users, schedules, logs, me, role, upcoming, sel, swapTarget: swap, editUser, monthKey, setMonthKey,
    go, back, tab, toast,
    openSheet: (kind, data) => setSheet({ kind, data }),
    welcomeOn, dismissWelcome, reminders, sendTestReminder,
    act,
  };

  // guard views that need data
  let screen: React.ReactNode;
  const needMe = ['cant', 'me'].includes(view) && !me;
  const needSel = ['songs', 'editsongs', 'sunday', 'swap', 'markdone'].includes(view) && !sel;
  const v: View = needMe || needSel ? 'home' : view;
  switch (v) {
    case 'signin': screen = <SignInView app={app} />; break;
    case 'cant': screen = upcoming && findMine(upcoming, me?.id) ? <CantView app={app} /> : <HomeView app={app} />; break;
    case 'songs': screen = <SongsView app={app} />; break;
    case 'editsongs': screen = <EditSongsView app={app} />; break;
    case 'schedule': screen = <ScheduleView app={app} />; break;
    case 'sunday': screen = <SundayView app={app} />; break;
    case 'swap': screen = swap ? <SwapView app={app} /> : <HomeView app={app} />; break;
    case 'markdone': screen = <MarkDoneView app={app} />; break;
    case 'points': screen = <PointsView app={app} />; break;
    case 'me': screen = <MeView app={app} />; break;
    case 'team': screen = role === 'admin' ? <TeamView app={app} /> : <HomeView app={app} />; break;
    case 'editmember': screen = role === 'admin' ? <EditMemberView key={editUserId || 'new'} app={app} /> : <HomeView app={app} />; break;
    case 'import': screen = role === 'admin' ? <ImportView app={app} /> : <HomeView app={app} />; break;
    default: screen = <HomeView app={app} />;
  }

  // sheets
  let overlay: React.ReactNode = null;
  if (sheet?.kind === 'shuffle' && sheet.data) {
    const k = sheet.data, { y, m } = parseMonthKey(k), n = getSundaysCount(y, m);
    const prevLeaders = Array.from(new Set(schedules.filter((s) => s.month === addMonth(k, -1)).map((s) => s.songleaderName)));
    overlay = (
      <Sheet title={`Auto-shuffle ${monthName(k)}?`} sub={`${plural(n, 'Sunday')}`} onClose={() => setSheet(null)}
        actions={<button className="btn btn-navy" onClick={() => {
          try { StorageService.generateScheduleForMonth(y, m); refresh(); setMonthKey(k); toast(`${monthName(k)} schedule made`); }
          catch (e) { toast(e instanceof Error ? e.message : 'Could not make the schedule'); }
          setSheet(null);
        }}><Icon n="shuffle" s={20} />Shuffle and save</button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="feat"><span className="ic"><Icon n="rotate" s={18} c="#2B2D80" /></span><span>Song leaders take turns{prevLeaders.length > 0 && <><br /><span className="sub">{prevLeaders.join(', ')} led last month, so they go last</span></>}</span></div>
          <div className="feat"><span className="ic"><Icon n="team" s={18} c="#2B2D80" /></span>Active members only</div>
          <div className="feat"><span className="ic"><Icon n="music" s={18} c="#2B2D80" /></span>Tambourine every Sunday</div>
        </div>
      </Sheet>
    );
  } else if (sheet?.kind === 'clear' && sheet.data) {
    const k = sheet.data, n = schedules.filter((s) => s.month === k).length;
    overlay = (
      <Sheet title={`Delete all of ${monthName(k)}?`} sub={`Removes ${plural(n, 'Sunday')}, their teams and songs. This can't be undone.`} onClose={() => setSheet(null)}
        actions={<button className="btn btn-red" onClick={() => { StorageService.deleteMonthSchedules(k); refresh(); setSheet(null); toast(`${monthName(k)} deleted`); }}><Icon n="trash" s={20} />Delete {MONTHS[parseMonthKey(k).m]}</button>} />
    );
  } else if (sheet?.kind === 'resetAdmin') {
    overlay = (
      <Sheet title="Reset to Admin only?" sub="Removes every member, schedule and point. Only the Admin account stays." onClose={() => setSheet(null)}
        actions={<button className="btn btn-red" onClick={() => { StorageService.resetToCleanAdmin(); refresh(); setSheet(null); home(); toast('Reset. Only Admin is left'); }}><Icon n="trash" s={20} />Reset everything</button>} />
    );
  } else if (sheet?.kind === 'export' && sheet.data) {
    const text = sheet.data;
    overlay = (
      <Sheet title={sheet.title || 'Export'} sub="Copied to your clipboard. You can also select the text below." onClose={() => setSheet(null)}
        actions={<button className="btn btn-navy" onClick={async () => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Select the text to copy'); } }}><Icon n="copy" s={20} />Copy again</button>}>
        <label className="sr" htmlFor="exp">Export</label>
        <textarea className="codebox" id="exp" readOnly value={text} />
      </Sheet>
    );
  }
  // full-screen "Can you serve this Sunday?" card (what iPhone users get when they tap the reminder)
  if (confirmCard && upcoming && me) {
    const mine = findMine(upcoming, me.id);
    if (mine && !mine.covered) overlay = (
      <section className="full" role="dialog" aria-modal="true" aria-labelledby="cq">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="logo-circle" style={{ width: 52, height: 52, borderRadius: 26 }}><img src="/logo.png" alt="" style={{ width: 36, height: 40 }} /></span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--lavtext)' }}>Worship Team</span>
        </div>
        <h2 id="cq" className="q">Can you serve this Sunday?</h2>
        <div className="box">
          <div className="hero-top"><span className="hero-date">{dLbl(upcoming.date)}</span><span className="chip-y">{ROLE_LABEL[mine.a.role]}</span></div>
          <div className="hsep" />
          <HeroRows s={upcoming} />
        </div>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#FFD60A' }}><Icon n="clock" s={18} w={2.4} />Reply by {replyByLabel(upcoming.date)}</p>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-yellow" onClick={() => { act.confirm(upcoming); setConfirmCard(false); }}><Icon n="check" s={20} w={2.8} />Yes, I&apos;ll be there</button>
          <button className="btn btn-ghostw" onClick={() => { setConfirmCard(false); setStack([]); setView('cant'); }}>I can&apos;t serve</button>
          <button className="btn-text" style={{ color: '#fff' }} onClick={() => setConfirmCard(false)}>Later</button>
        </div>
      </section>
    );
  }

  return (
    <div className="m-app">
      <div className="screen">{screen}</div>
      {overlay}
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">{toastMsg}</div>
    </div>
  );
}

export { monthKeyOf };

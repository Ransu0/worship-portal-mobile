'use client';
import React, { useMemo, useState } from 'react';
import { Lineup, MemberCapability, PointLog, SongItem, SundayAssignment, SundaySchedule, User, UserRole } from '@/lib/types';
import {
  ALL_CAPS, ROLE_LABEL, STATUS_LABEL, addMonth, coveringFor, dLbl, eligibleReplacements, findMine, firstName, longDay,
  monthName, parseMonthKey, MONTHS, replyByLabel, replyClosed, statusOf, todayStr, getSundaysCount,
} from '@/lib/mobile';
import {
  BackHeader, BottomNav, Hero, Icon, MEDAL, NavKind, Play, ST_STYLE, Tab, TeamCards, TitleHeader, TopHeader, monShortUpper, plural,
} from './ui';

export type Role = 'guest' | 'member' | 'leader' | 'admin';
export type View = 'home' | 'schedule' | 'points' | 'me' | 'team' | 'signin' | 'cant' | 'songs' | 'editsongs' | 'sunday' | 'swap' | 'markdone' | 'editmember' | 'import';

export interface AppCtx {
  users: User[];
  schedules: SundaySchedule[];
  logs: PointLog[];
  me: User | null;
  role: Role;
  upcoming: SundaySchedule | null;
  sel: SundaySchedule | null;
  swapTarget: SundayAssignment | null;
  editUser: User | null;
  monthKey: string;
  setMonthKey: (k: string) => void;
  go: (v: View, opts?: { selId?: string; swap?: SundayAssignment; editUserId?: string | null }) => void;
  back: () => void;
  tab: (t: Tab) => void;
  toast: (m: string) => void;
  openSheet: (kind: 'shuffle' | 'clear' | 'resetAdmin' | 'export', data?: string) => void;
  welcomeOn: boolean;
  dismissWelcome: () => void;
  reminders: { on: boolean; supported: boolean; enable: () => void; disable: () => void };
  sendTestReminder: () => void;
  act: {
    signIn: (u: string, p: string) => boolean;
    signOut: () => void;
    confirm: (s: SundaySchedule) => void;
    stepDown: (s: SundaySchedule, replacementId: string | null, reason: string) => void;
    saveLineup: (s: SundaySchedule, l: Lineup) => void;
    adminReplace: (s: SundaySchedule, userId: string, replacementId: string | null) => void;
    markDone: (s: SundaySchedule, ids: string[]) => number;
    adjust: (u: User, delta: number, reason: string) => void;
    addUser: (u: Omit<User, 'id'>) => void;
    updateUser: (u: User) => void;
    resetPassword: (u: User) => void;
    deleteUser: (id: string) => void;
    importNames: (names: string[], cap: MemberCapability) => number;
    exportLogins: (users: User[], title: string) => void;
  };
}

const navKind = (r: Role): NavKind => (r === 'admin' ? 'admin' : r === 'guest' ? 'guest' : 'member');
const isUserRole = (r: Role) => r === 'member' || r === 'leader';
const canEditSongs = (app: AppCtx, s: SundaySchedule | null) => !!s && (app.role === 'admin' || (!!app.me && s.songleaderId === app.me.id));

/* ---------------- welcome (Task 6) ---------------- */
function Welcome({ app }: { app: AppCtx }) {
  if (!app.welcomeOn) return null;
  const x = <button className="iconbtn wx" onClick={app.dismissWelcome} aria-label="Dismiss welcome"><Icon n="x" s={18} /></button>;
  const s = app.upcoming;
  if (app.role === 'guest') return (
    <section className="welcome">{x}<span className="stripe" /><h2>Welcome!</h2>
      <p>See this Sunday&apos;s team, songs and the schedule. On the team? Sign in to confirm your part.</p>
      <button className="btn btn-navy md" onClick={() => app.go('signin')}>Sign in</button></section>
  );
  if (app.role === 'admin') return (
    <section className="welcome">{x}<span className="stripe" /><h2>Welcome, {firstName(app.me)}</h2>
      <p>Check who hasn&apos;t confirmed, keep next month&apos;s schedule ready, and look after points and members.</p>
      <button className="btn btn-navy md" onClick={() => app.tab('schedule')}><Icon n="schedule" s={18} />Open schedule</button></section>
  );
  if (app.role === 'leader' && s) return (
    <section className="welcome">{x}<span className="stripe" /><h2>Welcome, {firstName(app.me)}</h2>
      <p>You lead {dLbl(s.date)}. Add the songs before Thursday so the team can practice.</p>
      <button className="btn btn-navy md" onClick={() => app.go('editsongs', { selId: s.id })}><Icon n="music" s={18} />Set songs</button></section>
  );
  return (
    <section className="welcome">{x}<span className="stripe" /><h2>Welcome, {firstName(app.me)}</h2>
      <p>Every Sunday afternoon you&apos;ll get a reminder for the next Sunday. Reply by Wednesday afternoon.</p>
      {app.reminders.on
        ? <div className="state ok" style={{ padding: '12px 14px' }}><Icon n="check" s={20} c="#17784A" w={2.6} /><span className="txt" style={{ fontSize: 15 }}>Reminders are on</span></div>
        : <button className="btn btn-navy md" onClick={app.reminders.enable}><Icon n="bell" s={18} />Turn on reminders</button>}
    </section>
  );
}

function SongsCard({ app, s }: { app: AppCtx; s: SundaySchedule }) {
  const songs = s.lineup?.songs || [];
  return (
    <section className="card">
      <div className="card-h">
        <button className="linkh" onClick={() => app.go('songs', { selId: s.id })}><h2 className="h2">Songs</h2></button>
        {canEditSongs(app, s)
          ? <button className="mini" onClick={() => app.go('editsongs', { selId: s.id })}><Icon n="edit" s={16} /> Edit</button>
          : <button className="more" onClick={() => app.go('songs', { selId: s.id })}>View all<Icon n="chev" s={18} w={2.5} /></button>}
      </div>
      {songs.length ? songs.map((x) => (
        <div className="row" style={{ minHeight: 52 }} key={x.id}><span className="nm" style={{ flex: 1, fontWeight: 600 }}>{x.title || 'Untitled'}</span><span className="key">{x.key || '–'}</span></div>
      )) : <p className="empty">No songs yet.</p>}
    </section>
  );
}

/* ---------------- Home ---------------- */
export function HomeView({ app }: { app: AppCtx }) {
  const s = app.upcoming;
  const right = app.role === 'guest'
    ? <button className="pillbtn" onClick={() => app.go('signin')}>Sign in</button>
    : app.role === 'admin' ? null
      : <button className="avatar" onClick={() => app.tab('me')} aria-label="My profile">{firstName(app.me)[0]}</button>;
  const title = isUserRole(app.role) ? `Hi, ${firstName(app.me)}` : 'This Sunday';
  if (!s) return (
    <>
      <TopHeader admin={app.role === 'admin'} right={right} />
      <main className="main"><h1 className="h1">{title}</h1><Welcome app={app} />
        <div className="empty-card"><b>No service scheduled</b><span className="sub">{app.role === 'admin' ? 'Make the schedule for this month.' : 'Check back soon.'}</span>
          {app.role === 'admin' && <button className="btn btn-navy md" onClick={() => app.tab('schedule')}>Open schedule</button>}</div>
      </main>
      <BottomNav kind={navKind(app.role)} active="home" onTab={app.tab} />
    </>
  );
  if (app.role === 'admin') return <AdminHome app={app} s={s} />;

  let chip = <span className="chip-g">{s.songleaderName} leads</span>;
  let block: React.ReactNode = null;
  if (isUserRole(app.role)) {
    const mine = findMine(s, app.me?.id);
    if (!mine) {
      chip = <span className="chip-g">Free</span>;
      block = <div className="state info"><span className="txt" style={{ fontSize: 16 }}>You&apos;re not on the team this Sunday.</span></div>;
    } else {
      const st = statusOf(mine.a);
      const serving = !mine.covered && st !== 'absent';
      chip = serving ? <span className="chip-y">{ROLE_LABEL[mine.a.role]}</span> : <span className="chip-g">Not serving</span>;
      const closed = replyClosed(s.date);
      if (mine.covered) block = <div className="state warn"><span className="txt">{mine.a.userName} is covering for you</span></div>;
      else if (st === 'absent') block = <div className="state bad"><span className="txt">You&apos;re marked absent</span></div>;
      else if (st === 'ok') block = (
        <div className="state ok"><span className="circle" style={{ background: '#17784A' }}><Icon n="check" s={20} c="#fff" w={3} /></span>
          <span className="txt">You&apos;re confirmed</span>
          {!closed && <button className="linkbtn" onClick={() => app.go('cant')}>Can&apos;t make it?</button>}</div>
      );
      else if (closed) block = <div className="state warn"><Icon n="clock" s={22} c="#6B4F00" /><span className="txt" style={{ fontSize: 16 }}>Reply time ended. Ask your leader.</span></div>;
      else block = (
        <>
          <div className="grid2">
            <button className="btn btn-green" onClick={() => app.act.confirm(s)}><Icon n="check" s={20} w={2.6} />I&apos;ll be there</button>
            <button className="btn btn-outline-red" onClick={() => app.go('cant')}>Can&apos;t serve</button>
          </div>
          <p className="byline"><Icon n="clock" s={15} w={2.4} />Reply by {replyByLabel(s.date)}</p>
        </>
      );
    }
  }
  return (
    <>
      <TopHeader right={right} />
      <main className="main">
        <h1 className="h1">{title}</h1>
        <Welcome app={app} />
        <Hero s={s} chip={chip} />
        {block}
        <SongsCard app={app} s={s} />
        <section className="card">
          <div className="card-h">
            <button className="linkh" onClick={() => app.go('sunday', { selId: s.id })}><h2 className="h2">Team</h2></button>
            <button className="more" onClick={() => app.go('sunday', { selId: s.id })}>View all<Icon n="chev" s={18} w={2.5} /></button>
          </div>
          <TeamCards s={s} meId={app.me?.id} signedIn={app.role !== 'guest'} />
        </section>
      </main>
      <BottomNav kind={navKind(app.role)} active="home" onTab={app.tab} />
    </>
  );
}

function AdminHome({ app, s }: { app: AppCtx; s: SundaySchedule }) {
  const ok = s.assignments.filter((a) => statusOf(a) === 'ok').length;
  const pending = s.assignments.filter((a) => statusOf(a) !== 'ok');
  const pct = Math.round((ok / Math.max(1, s.assignments.length)) * 100);
  return (
    <>
      <TopHeader admin />
      <main className="main">
        <h1 className="h1">This Sunday</h1>
        <Welcome app={app} />
        <Hero s={s} chip={<span className="chip-g">{s.songleaderName} leads</span>} extra={
          <div className="progress">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}><span style={{ color: 'var(--lavtext)' }}>Confirmed</span><span>{ok} of {s.assignments.length}</span></div>
            <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
          </div>} />
        <section className="card list">
          <h2 className="h2s">Not confirmed yet</h2>
          {pending.length ? pending.map((a) => (
            <div className="row" style={{ minHeight: 68 }} key={a.userId + a.role}>
              <div className="grow"><span className="nm">{a.userName}</span><span className="sub">{ROLE_LABEL[a.role]}{statusOf(a) === 'absent' ? ' · absent' : ''}</span></div>
              <button className="mini" onClick={() => app.go('swap', { selId: s.id, swap: a })}>Swap</button>
            </div>
          )) : <p className="empty">Everyone has confirmed.</p>}
        </section>
        <button className="btn btn-navy" onClick={() => app.go('sunday', { selId: s.id })}>Open Sunday, {dLbl(s.date)}<Icon n="chev" s={20} w={2.5} /></button>
        <button className="btn btn-soft md" onClick={app.sendTestReminder}><Icon n="bell" s={18} />Send weekly reminder now (test)</button>
      </main>
      <BottomNav kind="admin" active="home" onTab={app.tab} />
    </>
  );
}

/* ---------------- Sign in ---------------- */
export function SignInView({ app }: { app: AppCtx }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div className="signin-top">
        <button className="iconbtn back" onClick={app.back} aria-label="Back"><Icon n="back" s={24} /></button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="logo-circle"><img src="/logo.png" alt="COG church logo" /></div>
        <h1 className="h1" style={{ color: '#fff', fontSize: 26 }}>Worship Team</h1>
      </div>
      <form className="main" style={{ gap: 24, overflow: 'visible' }} onSubmit={(e) => { e.preventDefault(); if (!app.act.signIn(u, p)) setErr('Wrong username or password.'); }}>
        <div className="field"><label htmlFor="u">Username</label><input className="input" id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="off" /></div>
        <div className="field"><label htmlFor="p">Password</label>
          <div style={{ position: 'relative' }}>
            <input className="input" id="p" type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" style={{ paddingRight: 72 }} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 6, top: 6, height: 44, padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--navy)', fontSize: 15, fontWeight: 700 }}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        {err && <div className="state bad" role="alert" style={{ padding: '12px 14px' }}><span className="txt" style={{ fontSize: 15 }}>{err}</span></div>}
        <button className="btn btn-navy" type="submit" style={{ marginTop: 8 }}>Sign in</button>
        <p className="sub center" style={{ margin: 0, fontSize: 15 }}>Forgot password? Ask your leader.</p>
      </form>
    </div>
  );
}

/* ---------------- Can't serve ---------------- */
export function CantView({ app }: { app: AppCtx }) {
  const s = app.upcoming!;
  const mine = findMine(s, app.me?.id)!;
  const cands = eligibleReplacements(app.users, s, mine.a.role, app.me?.id);
  const [reason, setReason] = useState('Out of town');
  const [who, setWho] = useState<string>(cands[0]?.id || 'none');
  return (
    <>
      <BackHeader title="Can't serve" sub={`${dLbl(s.date)} · ${ROLE_LABEL[mine.a.role]}`} onBack={app.back} />
      <main className="main" style={{ gap: 32, paddingTop: 28 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="h2" style={{ fontSize: 18 }}>Reason</h2>
          <div className="chips">{['Sick', 'Out of town', 'Work', 'Other'].map((r) => <button key={r} className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}</div>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="h2" style={{ fontSize: 18 }}>Who will cover?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cands.map((u) => (
              <button key={u.id} className="opt" aria-pressed={who === u.id} onClick={() => setWho(u.id)}><span className="ini">{u.fullName[0]}</span><span className="nm">{u.fullName}</span><span className="radio" /></button>
            ))}
            <button className="opt red" aria-pressed={who === 'none'} onClick={() => setWho('none')}><span className="nm">No one</span><span className="radio" /></button>
          </div>
        </section>
        {who === 'none'
          ? <div className="state warn"><Icon n="alert" s={22} c="#6B4F00" /><span className="txt" style={{ fontSize: 16 }}>Counts as 1 absence</span></div>
          : <div className="state ok"><Icon n="check" s={22} c="#17784A" w={2.6} /><span className="txt" style={{ fontSize: 16 }}>No absence counted</span></div>}
        {mine.a.role === 'songleader' && who !== 'none' && <p className="sub" style={{ margin: '-16px 0 0' }}>{cands.find((c) => c.id === who)?.fullName} will lead and can edit the songs.</p>}
      </main>
      <div className="actionbar"><button className="btn btn-navy" onClick={() => app.act.stepDown(s, who === 'none' ? null : who, reason)}>Send</button></div>
    </>
  );
}

/* ---------------- Songs ---------------- */
export function SongsView({ app }: { app: AppCtx }) {
  const s = app.sel;
  if (!s) return null;
  const songs = s.lineup?.songs || [];
  const edit = canEditSongs(app, s);
  return (
    <>
      <BackHeader title="Songs" sub={`${dLbl(s.date)} · led by ${s.songleaderName}`} onBack={app.back}
        right={edit ? <button className="iconbtn soft" onClick={() => app.go('editsongs', { selId: s.id })} aria-label="Edit songs"><Icon n="edit" s={18} /></button> : undefined} />
      <main className="main" style={{ gap: 16 }}>
        {s.lineup?.notes && <div className="note"><b>Note from the song leader</b>{s.lineup.notes}</div>}
        {songs.length ? songs.map((x) => {
          const listen = x.link || `https://www.youtube.com/results?search_query=${encodeURIComponent((x.title || '') + ' worship')}`;
          const chords = `https://www.google.com/search?q=${encodeURIComponent((x.title || '') + ' chords')}`;
          return (
            <article className="song" key={x.id}>
              <div className="song-top"><span className="t">{x.title || 'Untitled'}</span><span className="bigkey">{x.key || '–'}</span></div>
              {x.notes && <p className="snote">{x.notes}</p>}
              <div className="grid2" style={{ gap: 10 }}>
                <a className="softlink listen" href={listen} target="_blank" rel="noopener noreferrer"><Play />Listen</a>
                <a className="softlink" href={chords} target="_blank" rel="noopener noreferrer"><Icon n="music" s={16} />Chords</a>
              </div>
            </article>
          );
        }) : (
          <div className="empty-card"><b>No songs yet</b><span className="sub">{s.songleaderName} will add them.</span>
            {edit && <button className="btn btn-navy md" onClick={() => app.go('editsongs', { selId: s.id })}>Add songs</button>}</div>
        )}
      </main>
    </>
  );
}

export function EditSongsView({ app }: { app: AppCtx }) {
  const s = app.sel!;
  const blank = (): SongItem => ({ id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: '', key: '', notes: '', link: '' });
  const [songs, setSongs] = useState<SongItem[]>(() => (s.lineup?.songs?.length ? s.lineup.songs.map((x) => ({ ...x })) : [blank()]));
  const [note, setNote] = useState(s.lineup?.notes || '');
  const set = (i: number, k: keyof SongItem, v: string) => setSongs((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <>
      <BackHeader title="Edit songs" sub={dLbl(s.date)} onBack={app.back} />
      <main className="main" style={{ gap: 14 }}>
        {songs.map((x, i) => (
          <div className="card" style={{ padding: 16, gap: 10, borderRadius: 20 }} key={x.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="num">{i + 1}</span>
              <label className="sr" htmlFor={`st${i}`}>Song {i + 1} title</label>
              <input className="input sm" style={{ flex: 1, minWidth: 0 }} id={`st${i}`} value={x.title} onChange={(e) => set(i, 'title', e.target.value)} placeholder="Song title" />
              <label className="sr" htmlFor={`sk${i}`}>Key</label>
              <input className="input sm" style={{ width: 56, textAlign: 'center', color: 'var(--navy)', fontWeight: 800 }} id={`sk${i}`} value={x.key || ''} onChange={(e) => set(i, 'key', e.target.value)} placeholder="Key" />
            </div>
            <label className="sr" htmlFor={`sn${i}`}>Notes</label>
            <input className="input soft" id={`sn${i}`} value={x.notes || ''} onChange={(e) => set(i, 'notes', e.target.value)} placeholder="Notes: tempo, repeats, arrangement" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label className="sr" htmlFor={`sl${i}`}>Link</label>
              <input className="input soft" style={{ flex: 1, minWidth: 0 }} id={`sl${i}`} value={x.link || ''} onChange={(e) => set(i, 'link', e.target.value)} placeholder="YouTube or chords link" />
              <button className="iconbtn" style={{ background: '#FDECEC', color: 'var(--red)', borderRadius: 12 }} onClick={() => setSongs((xs) => xs.filter((_, j) => j !== i))} aria-label={`Remove song ${i + 1}`}><Icon n="x" s={18} w={2.5} /></button>
            </div>
          </div>
        ))}
        <button className="btn btn-dash" onClick={() => setSongs((xs) => [...xs, blank()])}><Icon n="plus" s={20} w={2.5} />Add song</button>
        <div className="field" style={{ marginTop: 6 }}><label htmlFor="note">Note for the team</label>
          <textarea className="input" id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </main>
      <div className="actionbar">
        <button className="btn btn-navy" onClick={() => app.act.saveLineup(s, {
          id: s.lineup?.id || `lineup-${s.id}`, scheduleId: s.id, notes: note, updatedAt: new Date().toISOString(),
          songs: songs.filter((x) => x.title.trim()),
        })}>Save songs</button>
      </div>
    </>
  );
}

/* ---------------- Schedule (Task 3: rotation + delete month live here) ---------------- */
export function ScheduleView({ app }: { app: AppCtx }) {
  const [mineOnly, setMineOnly] = useState(false);
  const k = app.monthKey;
  const admin = app.role === 'admin';
  const list = app.schedules.filter((s) => s.month === k).sort((a, b) => a.date.localeCompare(b.date));
  const next = addMonth(k, 1);
  const nextMade = app.schedules.some((s) => s.month === next);
  const today = todayStr();
  const { y, m } = parseMonthKey(k);
  const hdr = (
    <header className="hdr monthbar">
      <h1 className="h1">{monthName(k)}</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="iconbtn soft" style={{ color: 'var(--ink)' }} onClick={() => app.setMonthKey(addMonth(k, -1))} aria-label="Previous month"><Icon n="chevL" s={20} w={2.5} /></button>
        <button className="iconbtn soft" style={{ color: 'var(--ink)' }} onClick={() => app.setMonthKey(addMonth(k, 1))} aria-label="Next month"><Icon n="chev" s={20} w={2.5} /></button>
      </div>
    </header>
  );
  if (!list.length) return (
    <>
      {hdr}
      <main className="main">
        {admin
          ? <div className="empty-card"><b>No schedule for {monthName(k)}</b><span className="sub">{plural(getSundaysCount(y, m), 'Sunday')} to fill.</span>
            <button className="btn btn-navy md" onClick={() => app.openSheet('shuffle', k)}><Icon n="shuffle" s={18} />Auto-shuffle {MONTHS[m]}</button></div>
          : <div className="empty-card"><b>Not scheduled yet</b><span className="sub">The {monthName(k)} schedule will show here once it&apos;s made.</span></div>}
      </main>
      <BottomNav kind={navKind(app.role)} active="schedule" onTab={app.tab} />
    </>
  );
  const rows = list.filter((s) => !isUserRole(app.role) || !mineOnly || findMine(s, app.me?.id));
  return (
    <>
      {hdr}
      {isUserRole(app.role) && (
        <div style={{ padding: '0 20px 16px', background: '#fff', borderBottom: '1px solid var(--line)', marginTop: -1 }}>
          <div className="seg" role="group" aria-label="Show"><button aria-pressed={mineOnly} onClick={() => setMineOnly(true)}>Mine</button><button aria-pressed={!mineOnly} onClick={() => setMineOnly(false)}>All</button></div>
        </div>
      )}
      <main className="main" style={{ gap: 14 }}>
        {rows.length ? rows.map((s) => {
          const isNow = app.upcoming?.id === s.id;
          const past = s.date < today;
          const done = !!s.isCompleted;
          let note = '', color = 'var(--soft)';
          if (done) { note = 'Done'; color = '#17784A'; }
          else if (admin) {
            const ok = s.assignments.filter((a) => statusOf(a) === 'ok').length;
            if (past) { note = 'Not marked done yet'; color = '#6B4F00'; }
            else if (isNow) note = `${ok} of ${s.assignments.length} confirmed`;
            else note = `${s.assignments.length} assigned`;
          } else if (isUserRole(app.role)) {
            const mine = findMine(s, app.me?.id);
            if (!mine) note = past ? 'Done' : 'Free';
            else if (mine.covered) note = `${mine.a.userName} covers you`;
            else if (statusOf(mine.a) === 'absent') note = 'You: absent';
            else note = `You: ${ROLE_LABEL[mine.a.role]}`;
          } else note = isNow ? 'This Sunday' : `${s.assignments.length} serving`;
          const day = Number(s.date.slice(8));
          return (
            <button key={s.id} className={`sun${isNow ? ' now' : ''}${done ? ' past' : ''}`} onClick={() => app.go('sunday', { selId: s.id })}>
              <span className="date"><small>{monShortUpper(s.date)}</small><b>{day}</b></span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{s.songleaderName} leads</span>
                <span style={{ fontSize: 15, fontWeight: 600, color }}>{note}</span>
              </span>
              <Icon n="chev" s={20} c="#55576E" w={2.5} />
            </button>
          );
        }) : <p className="empty center">You&apos;re not scheduled this month.</p>}
        {admin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {!nextMade && <button className="btn btn-navy" onClick={() => app.openSheet('shuffle', next)}><Icon n="shuffle" s={20} />Auto-shuffle {monthName(next)}</button>}
            <button className="btn btn-outline-red" onClick={() => app.openSheet('clear', k)}><Icon n="trash" s={20} />Delete {MONTHS[m]}</button>
          </div>
        )}
      </main>
      <BottomNav kind={navKind(app.role)} active="schedule" onTab={app.tab} />
    </>
  );
}

/* ---------------- Sunday details ---------------- */
export function SundayView({ app }: { app: AppCtx }) {
  const s = app.sel;
  if (!s) return null;
  const admin = app.role === 'admin';
  const ok = s.assignments.filter((a) => statusOf(a) === 'ok').length;
  const canMark = admin && !s.isCompleted && s.date <= todayStr() || (admin && !s.isCompleted && app.upcoming?.id === s.id);
  const songs = s.lineup?.songs || [];
  return (
    <>
      <BackHeader title={`Sunday, ${dLbl(s.date)}`} sub={`Practice Sat ${s.practiceTime} · Service ${s.worshipTime}`} onBack={app.back} />
      <main className="main">
        <button className="btn btn-navy" style={{ height: 60, justifyContent: 'flex-start', padding: '0 20px', borderRadius: 18 }} onClick={() => app.go('songs', { selId: s.id })}>
          <Icon n="music" s={22} c="#FFD60A" w={2} /><span style={{ flex: 1, textAlign: 'left' }}>{songs.length ? plural(songs.length, 'song') : 'Songs: none yet'}</span><Icon n="chev" s={20} w={2.5} />
        </button>
        <section className="card">
          <div className="card-h" style={{ marginBottom: 0 }}><h2 className="h2">Team</h2>{app.role !== 'guest' && <span className="sub">{ok} of {s.assignments.length} confirmed</span>}</div>
          {admin ? <p className="hint">Tap a name to replace or mark absent.</p> : <div style={{ height: 8 }} />}
          <TeamCards s={s} meId={app.me?.id} signedIn={app.role !== 'guest'} onPick={admin ? (a) => app.go('swap', { selId: s.id, swap: a }) : undefined} />
        </section>
        {canMark && <button className="btn btn-green" onClick={() => app.go('markdone', { selId: s.id })}><Icon n="done" s={20} />Mark as done (+10 points)</button>}
        {s.isCompleted && <div className="state ok"><Icon n="check" s={22} c="#17784A" w={2.6} /><span className="txt" style={{ fontSize: 16 }}>Done · points given</span></div>}
      </main>
      <BottomNav kind={navKind(app.role)} active="schedule" onTab={app.tab} />
    </>
  );
}

export function SwapView({ app }: { app: AppCtx }) {
  const s = app.sel!;
  const t = app.swapTarget!;
  const cands = eligibleReplacements(app.users, s, t.role, t.userId);
  const [who, setWho] = useState<string | null>(null);
  return (
    <>
      <BackHeader title={`Replace ${t.userName}`} sub={`${dLbl(s.date)} · ${ROLE_LABEL[t.role]}`} onBack={app.back} />
      <main className="main" style={{ gap: 14, paddingTop: 28 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Replace with</h2>
        {cands.length ? cands.map((u) => (
          <button key={u.id} className="opt" aria-pressed={who === u.id} onClick={() => setWho(u.id)}><span className="ini">{u.fullName[0]}</span><span className="nm">{u.fullName}</span><span className="radio" /></button>
        )) : <p className="empty">No one else free for {ROLE_LABEL[t.role]}.</p>}
        <button className="opt red" aria-pressed={who === 'absent'} onClick={() => setWho('absent')}><span className="nm">No one — mark absent</span><span className="radio" /></button>
        {who === 'absent' && <div className="state warn" style={{ marginTop: 12 }}><Icon n="alert" s={22} c="#6B4F00" /><span className="txt" style={{ fontSize: 16 }}>{t.userName} gets 1 absence</span></div>}
      </main>
      <div className="actionbar"><button className="btn btn-navy" disabled={!who} style={who ? undefined : { opacity: 0.5 }} onClick={() => who && app.act.adminReplace(s, t.userId, who === 'absent' ? null : who)}>Save</button></div>
    </>
  );
}

export function MarkDoneView({ app }: { app: AppCtx }) {
  const s = app.sel!;
  // Same rule as the app: confirmed members are ticked by default; admin can tick others.
  const [ticked, setTicked] = useState<Record<string, boolean>>(() => Object.fromEntries(s.assignments.map((a) => [a.userId, statusOf(a) === 'ok'])));
  const count = s.assignments.filter((a) => ticked[a.userId] && statusOf(a) !== 'absent').length;
  return (
    <>
      <BackHeader title="Who came?" sub={dLbl(s.date)} onBack={app.back} />
      <main className="main" style={{ gap: 10 }}>
        {s.assignments.map((a) => {
          const absent = statusOf(a) === 'absent';
          const on = !absent && !!ticked[a.userId];
          return (
            <button key={a.userId + a.role} className="opt att" style={{ height: 64 }} aria-pressed={on}
              onClick={() => (absent ? app.toast(`${a.userName} is marked absent`) : setTicked((t) => ({ ...t, [a.userId]: !t[a.userId] })))}>
              <span className="check"><Icon n="check" s={16} c="#fff" w={3.5} /></span>
              <span className="nm" style={{ fontSize: 16 }}>{a.userName}</span>
              <span className="sub">{ROLE_LABEL[a.role]}{absent ? ' · absent' : ''}</span>
            </button>
          );
        })}
      </main>
      <div className="actionbar"><button className="btn btn-green" onClick={() => app.act.markDone(s, Object.keys(ticked).filter((id) => ticked[id]))}>Give +10 to {count}</button></div>
    </>
  );
}

/* ---------------- Points (Task 2: inline override) ---------------- */
export function PointsView({ app }: { app: AppCtx }) {
  const admin = app.role === 'admin';
  const [open, setOpen] = useState<string | null>(null);
  const [add, setAdd] = useState(true);
  const [amount, setAmount] = useState(5);
  const [reason, setReason] = useState('');
  const [all, setAll] = useState(false);
  const ranked = useMemo(() => app.users.filter((u) => u.active && u.role !== 'admin').sort((a, b) => b.points - a.points), [app.users]);
  const me = app.me;
  const myRank = me ? ranked.findIndex((u) => u.id === me.id) + 1 : 0;
  const toggle = (id: string) => { setOpen(open === id ? null : id); setAdd(true); setAmount(5); setReason(''); };
  const logs = all ? app.logs : app.logs.slice(0, 4);
  return (
    <>
      <TitleHeader title="Points" />
      <main className="main">
        {isUserRole(app.role) && me && (
          <section className="hero" style={{ padding: '28px 24px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: '#FFD60A' }}>{me.points}</span><span className="hero-lbl" style={{ fontSize: 16 }}>your points</span></div>
            <div className="col" style={{ gap: 14, alignItems: 'flex-end' }}><span className="hv" style={{ fontSize: 17 }}>#{myRank || '–'} rank</span><span className="hv" style={{ fontSize: 17 }}>{plural(me.absentCount || 0, 'absence')}</span></div>
          </section>
        )}
        <p className="sub center" style={{ margin: 0, fontSize: 15 }}>{admin ? 'Tap a name to add or take away points.' : '+10 points every Sunday you serve'}</p>
        <section className="card list">
          {ranked.length ? ranked.map((u, i) => {
            const mine = isUserRole(app.role) && u.id === me?.id;
            const isOpen = admin && open === u.id;
            const inner = (
              <>
                <span className="medal" style={{ background: i < 3 ? MEDAL[i] : '#F1EFE8' }}>{i + 1}</span>
                <span className="grow"><span className="nm">{u.fullName}{mine ? ' (you)' : ''}</span>{admin && <span className="sub">{plural(u.absentCount || 0, 'absence')}</span>}</span>
                <span className="pts">{u.points}</span>
                {admin && <Icon n={isOpen ? 'x' : 'edit'} s={16} c="#55576E" />}
              </>
            );
            return (
              <React.Fragment key={u.id}>
                {admin
                  ? <button className="rk" onClick={() => toggle(u.id)} aria-expanded={isOpen}><div className="row" style={{ minHeight: 64 }}>{inner}</div></button>
                  : <div className={`row${mine ? ' me-row' : ''}`} style={{ minHeight: 62 }}>{inner}</div>}
                {isOpen && (
                  <div className="adj" role="region" aria-label={`Adjust points for ${u.fullName}`}>
                    <div className="seg" role="group" aria-label="Add or remove"><button aria-pressed={add} onClick={() => setAdd(true)}>Add</button><button aria-pressed={!add} onClick={() => setAdd(false)}>Remove</button></div>
                    <div className="stepper">
                      <button onClick={() => setAmount(Math.max(5, amount - 5))} aria-label="Less">−</button>
                      <span className="amt" style={{ color: add ? '#17784A' : '#A51C20' }}>{add ? '+' : '−'}{amount}</span>
                      <button onClick={() => setAmount(amount + 5)} aria-label="More">+</button>
                    </div>
                    <label className="sr" htmlFor="ar">Reason</label>
                    <input className="input sm" id="ar" style={{ fontWeight: 600 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
                    <div className="chips" style={{ gap: 8 }}>{['Late to practice', 'Missed practice', 'Bonus'].map((c) => (
                      <button key={c} className="chip sm" aria-pressed={reason === c} onClick={() => { setReason(c); setAdd(c === 'Bonus'); }}>{c}</button>
                    ))}</div>
                    <div className="grid2">
                      <button className="btn btn-outline md" onClick={() => setOpen(null)}>Cancel</button>
                      <button className="btn btn-navy md" onClick={() => { app.act.adjust(u, add ? amount : -amount, reason); setOpen(null); }}>Save</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          }) : <p className="empty">No members yet.</p>}
        </section>
        {admin && (
          <section className="card list">
            <h2 className="h2s">Recent changes</h2>
            {logs.length ? logs.map((l) => {
              const plus = l.points > 0, zero = l.points === 0;
              return (
                <div className="row" style={{ minHeight: 64 }} key={l.id}>
                  <span className="logpts" style={{ background: zero ? '#F1EFE8' : plus ? '#E6F4EC' : '#FDECEC', color: zero ? '#55576E' : plus ? '#17784A' : '#A51C20' }}>{zero ? '0' : `${plus ? '+' : '−'}${Math.abs(l.points)}`}</span>
                  <div className="grow"><span className="nm">{l.userName}</span><span className="sub">{l.reason}</span></div>
                  <span className="sub">{dLbl(l.date)}</span>
                </div>
              );
            }) : <p className="empty">No changes yet.</p>}
            {app.logs.length > 4 && <button className="btn-text" style={{ color: 'var(--navy)' }} onClick={() => setAll(!all)}>{all ? 'Show less' : `Show all ${app.logs.length}`}</button>}
          </section>
        )}
      </main>
      <BottomNav kind={navKind(app.role)} active="points" onTab={app.tab} />
    </>
  );
}

/* ---------------- Me ---------------- */
export function MeView({ app }: { app: AppCtx }) {
  const me = app.me!;
  const today = todayStr();
  const upcoming = app.schedules.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ s, mine: findMine(s, me.id) })).filter((x) => x.mine).slice(0, 4);
  return (
    <>
      <main className="main" style={{ paddingTop: 40, gap: 24 }}>
        <div className="profile-top">
          <span className="big-av">{firstName(me)[0]}</span>
          <h1 className="h1" style={{ fontSize: 26 }}>{me.fullName}</h1>
          <span className="chip-y" style={{ padding: '6px 14px' }}>{me.capabilities.map((c) => ROLE_LABEL[c]).join(' · ')}</span>
        </div>
        <div className="grid2">
          <div className="stat"><b>{me.points}</b><span>points</span></div>
          <div className="stat"><b>{me.absentCount || 0}</b><span>{(me.absentCount || 0) === 1 ? 'absence' : 'absences'}</span></div>
        </div>
        <section className="card list">
          <h2 className="h2s">My next Sundays</h2>
          {upcoming.length ? upcoming.map(({ s, mine }) => (
            <div className="row" key={s.id}><span className="nm" style={{ flex: 1 }}>{dLbl(s.date)}</span><span className="sub" style={{ fontSize: 15 }}>{mine!.covered ? `Covered by ${mine!.a.userName}` : ROLE_LABEL[mine!.a.role]}</span></div>
          )) : <p className="empty">Nothing scheduled.</p>}
        </section>
        <button className="toggle-row" onClick={app.reminders.on ? app.reminders.disable : app.reminders.enable} aria-pressed={app.reminders.on}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Icon n="bell" s={20} c="#2B2D80" w={2} />
            <span className="col"><span>Reminders</span><span className="sub" style={{ fontWeight: 500 }}>{app.reminders.supported ? 'Sunday afternoon · reply by Wednesday' : 'Add the app to your Home Screen first'}</span></span></span>
          <span className={`switch${app.reminders.on ? ' on' : ''}`}><span /></span>
        </button>
        <div className="menu">
          <button onClick={app.act.signOut} style={{ color: 'var(--red)' }}><Icon n="logout" s={20} w={2} /><span style={{ flex: 1 }}>Sign out</span></button>
        </div>
      </main>
      <BottomNav kind="member" active="me" onTab={app.tab} />
    </>
  );
}

/* ---------------- Team directory (Task 5) ---------------- */
export function TeamView({ app }: { app: AppCtx }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState<'All' | 'Singers' | MemberCapability>('All');
  const list = app.users.filter((u) => {
    if (q && !u.fullName.toLowerCase().includes(q.toLowerCase()) && !u.username.includes(q.toLowerCase())) return false;
    if (f === 'All') return true;
    if (f === 'Singers') return u.capabilities.includes('songleader') || u.capabilities.includes('backup');
    return u.capabilities.includes(f);
  });
  const filters: ('All' | 'Singers' | MemberCapability)[] = ['All', 'Singers', 'guitar', 'bass', 'drums', 'keys', 'media', 'tambourines'];
  return (
    <>
      <TitleHeader title="Team" />
      <main className="main" style={{ gap: 16 }}>
        <section className="roster">
          <span className="tag"><Icon n="shield" s={12} w={2.5} /> Admin roster control</span>
          <div className="grid2" style={{ gap: 10 }}>
            <button className="rb btn-navy" onClick={() => app.go('editmember', { editUserId: null })}><Icon n="userplus" s={18} />Add member</button>
            <button className="rb btn-soft" onClick={() => app.go('import')}><Icon n="upload" s={18} />Import names</button>
            <button className="rb btn-soft" onClick={() => app.act.exportLogins(app.users, 'All member logins')}><Icon n="copy" s={18} />Copy all logins</button>
            <button className="rb btn-outline-red" style={{ borderWidth: 2 }} onClick={() => app.openSheet('resetAdmin')}><Icon n="trash" s={18} />Reset to Admin</button>
          </div>
        </section>
        <h2 className="h2" style={{ marginTop: 4 }}>Team directory ({app.users.length})</h2>
        <div className="search"><label className="sr" htmlFor="tq">Search members</label><Icon n="search" s={20} c="#55576E" />
          <input className="input" id="tq" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="hscroll">{filters.map((x) => (
          <button key={x} className="chip" aria-pressed={f === x} onClick={() => setF(x)}>{x === 'All' || x === 'Singers' ? x : ROLE_LABEL[x]}</button>
        ))}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length ? list.map((u) => (
            <button key={u.id} className="mcard" onClick={() => app.go('editmember', { editUserId: u.id })}>
              <span className="ini" style={{ width: 44, height: 44, borderRadius: 22 }}>{u.fullName[0]}</span>
              <span className="grow">
                <span className="nm">{u.fullName}{!u.active && <span className="sub"> · Inactive</span>}</span>
                <span className="pw">@{u.username} · {u.password && u.password !== DEFAULT_PW ? 'Own password' : 'Default password'}</span>
                <span className="rtags">
                  {u.capabilities.map((c) => <span key={c} className={`rtag${c === 'songleader' ? ' sl' : ''}`}>{ROLE_LABEL[c]}</span>)}
                  {u.role === 'admin' && <span className="rtag" style={{ background: '#E8E9F7', color: '#1C1E5C' }}>Admin</span>}
                </span>
              </span>
              <span className="col" style={{ alignItems: 'flex-end' }}><span className="pts">{u.points}</span><span className="sub" style={{ fontSize: 12 }}>pts</span></span>
            </button>
          )) : <p className="empty">No members found.</p>}
        </div>
        <div className="menu">
          <button onClick={app.act.signOut} style={{ color: 'var(--red)' }}><Icon n="logout" s={20} w={2} /><span style={{ flex: 1 }}>Sign out{app.me ? ` (${app.me.fullName})` : ''}</span></button>
        </div>
      </main>
      <BottomNav kind="admin" active="team" onTab={app.tab} />
    </>
  );
}
let DEFAULT_PW = '';
export const setDefaultPassword = (p: string) => { DEFAULT_PW = p; };

export function EditMemberView({ app }: { app: AppCtx }) {
  const u = app.editUser;
  const isNew = !u;
  const [name, setName] = useState(u?.fullName || '');
  const [username, setUsername] = useState(u?.username || '');
  const [caps, setCaps] = useState<MemberCapability[]>(u?.capabilities || []);
  const [role, setRole] = useState<UserRole>(u?.role || 'member');
  const [active, setActive] = useState(u ? u.active : true);
  const [confirmDel, setConfirmDel] = useState(false);
  const toggleCap = (c: MemberCapability) => setCaps((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));
  const save = () => {
    const fullName = name.trim();
    if (!fullName) { app.toast('Add a name first'); return; }
    const uname = (username || fullName).trim().toLowerCase().replace(/\s+/g, '.');
    if (app.users.some((x) => x.username === uname && x.id !== u?.id)) { app.toast('That username is taken'); return; }
    if (isNew) app.act.addUser({ fullName, username: uname, role, capabilities: caps, active, points: 0, absentCount: 0, instrument: caps[0] || 'Vocals' });
    else app.act.updateUser({ ...u!, fullName, username: uname, role, capabilities: caps, active });
  };
  return (
    <>
      <BackHeader title={isNew ? 'Add member' : 'Edit member'} onBack={app.back} />
      <main className="main" style={{ gap: 24 }}>
        <div className="field"><label htmlFor="en">Name</label><input className="input" id="en" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
        <div className="field"><label htmlFor="eu">Username</label><input className="input" id="eu" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="e.g. ana.cruz" autoCapitalize="off" /></div>
        <div className="field"><span className="lbl">Ministry</span>
          <div className="chips" style={{ gap: 8 }}>{ALL_CAPS.map((c) => (
            <button key={c} className="chip" style={{ height: 44, padding: '0 16px' }} aria-pressed={caps.includes(c)} onClick={() => toggleCap(c)}>{ROLE_LABEL[c]}</button>
          ))}</div></div>
        <div className="field"><span className="lbl">Access</span>
          <div className="seg" role="group" aria-label="Access"><button aria-pressed={role === 'member'} onClick={() => setRole('member')}>Member</button><button aria-pressed={role === 'admin'} onClick={() => setRole('admin')}>Admin</button></div></div>
        <button className="toggle-row" onClick={() => setActive(!active)} aria-pressed={active}><span>Active</span><span className={`switch${active ? ' on' : ''}`}><span /></span></button>
        {isNew ? <p className="sub" style={{ margin: 0 }}>They&apos;ll sign in with the default password.</p> : (
          <>
            <div className="grid2">
              <button className="btn btn-soft md" onClick={() => app.act.resetPassword(u!)}>Reset password</button>
              <button className="btn btn-soft md" onClick={() => app.act.exportLogins([u!], `${u!.fullName}'s login`)}><Icon n="copy" s={18} />Copy login</button>
            </div>
            <button className="btn-text red" onClick={() => (confirmDel ? app.act.deleteUser(u!.id) : setConfirmDel(true))}>{confirmDel ? 'Tap again to remove' : 'Remove from team'}</button>
          </>
        )}
      </main>
      <div className="actionbar"><button className="btn btn-navy" onClick={save}>Save</button></div>
    </>
  );
}

export function ImportView({ app }: { app: AppCtx }) {
  const [text, setText] = useState('');
  const [cap, setCap] = useState<MemberCapability>('backup');
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const lines = String(r.result).split(/\r?\n/).map((l) => l.split(',')[0].trim()).filter(Boolean);
      setText(lines.join('\n'));
      app.toast(plural(lines.length, 'name') + ' loaded');
    };
    r.readAsText(file);
  };
  return (
    <>
      <BackHeader title="Import names" onBack={app.back} />
      <main className="main" style={{ gap: 24, paddingTop: 28 }}>
        <div className="field"><label htmlFor="names">One name per line</label><textarea className="input" id="names" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Ana Cruz\nBen Torres'} /></div>
        <label className="btn btn-soft md filebtn"><Icon n="upload" s={18} />Upload .txt or .csv<input type="file" accept=".txt,.csv" onChange={onFile} aria-label="Upload a .txt or .csv file" /></label>
        <div className="field"><label htmlFor="ip">Ministry</label>
          <select className="input" id="ip" value={cap} onChange={(e) => setCap(e.target.value as MemberCapability)} style={{ fontWeight: 600 }}>
            {ALL_CAPS.map((c) => <option key={c} value={c}>{ROLE_LABEL[c]}</option>)}
          </select></div>
        <div className="state info"><Icon n="info" s={22} c="#2B2D80" w={2} /><span className="txt" style={{ fontSize: 15, fontWeight: 600 }}>Usernames like ana.cruz · default password</span></div>
      </main>
      <div className="actionbar"><button className="btn btn-navy" onClick={() => {
        const names = text.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
        const n = app.act.importNames(names, cap);
        app.toast(n ? plural(n, 'member') + ' added' : 'No new names');
      }}>Add members</button></div>
    </>
  );
}

export { STATUS_LABEL, ST_STYLE, coveringFor, longDay };

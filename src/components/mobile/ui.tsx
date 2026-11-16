'use client';
import React from 'react';
import { MemberCapability, SundayAssignment, SundaySchedule } from '@/lib/types';
import { ROLE_LABEL, MUSICIAN_ORDER, STATUS_LABEL, StatusKind, coveringFor, statusOf, dLbl, longDay, parseDay, MON } from '@/lib/mobile';

const P: Record<string, string> = {
  home: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  schedule: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
  points: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2Z',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 0 1-8 0a4 4 0 0 1 8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  me: 'M17 8a5 5 0 0 1-10 0a5 5 0 0 1 10 0 M20 21a8 8 0 0 0-16 0',
  back: 'M19 12H5 M12 19l-7-7 7-7',
  chev: 'm9 18 6-6-6-6',
  chevL: 'm15 18-6-6 6-6',
  check: 'M20 6 9 17l-5-5',
  wait: 'M12 7v5l3 2',
  x: 'M18 6 6 18 M6 6l12 12',
  clock: 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M12 6v6l4 2',
  music: 'M9 18V5l12-2v13 M9 18a3 3 0 0 1-6 0a3 3 0 0 1 6 0 M21 16a3 3 0 0 1-6 0a3 3 0 0 1 6 0',
  plus: 'M12 5v14 M5 12h14',
  edit: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  search: 'M19 11a8 8 0 0 1-16 0a8 8 0 0 1 16 0 M21 21l-4.35-4.35',
  info: 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M12 16v-4 M12 8h.01',
  alert: 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M12 8v4 M12 16h.01',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  rotate: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
  shuffle: 'M16 3h5v5 M4 20 21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
  copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
  upload: 'M12 15V3 M7 8l5-5 5 5 M5 21h14',
  userplus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 0 1-8 0a4 4 0 0 1 8 0 M19 8v6 M22 11h-6',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  done: 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M16 9l-5.5 6L8 12.5',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3',
  drum: 'm2 2 8 8 M22 2l-8 8 M12 8c5.5 0 10 1.3 10 3v5c0 1.7-4.5 3-10 3S2 17.7 2 16v-5c0-1.7 4.5-3 10-3 M2 11c0 1.7 4.5 3 10 3s10-1.3 10-3 M7 13.4v5 M12 14v5 M17 13.4v5',
  keys: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M7 5v8 M12 5v8 M17 5v8 M7 13v6 M12 13v6 M17 13v6',
  monitor: 'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 21h8 M12 17v4',
  tamb: 'M21 12a9 9 0 0 1-18 0a9 9 0 0 1 18 0 M12 3v3 M12 18v3 M3 12h3 M18 12h3 M15.5 12a3.5 3.5 0 0 1-7 0a3.5 3.5 0 0 1 7 0',
};

export function Icon({ n, s = 20, c = 'currentColor', w = 2.2 }: { n: string; s?: number; c?: string; w?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  );
}
export const Play = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3l14 9-14 9z" /></svg>
);

export const ROLE_ICON: Record<MemberCapability, string> = {
  songleader: 'mic', backup: 'mic', guitar: 'music', bass: 'music', drums: 'drum', keys: 'keys', media: 'monitor', tambourines: 'tamb',
};
export const ST_STYLE: Record<StatusKind, { bg: string; fg: string; icon: string }> = {
  ok: { bg: '#E6F4EC', fg: '#17784A', icon: 'check' },
  wait: { bg: '#FFF4CC', fg: '#6B4F00', icon: 'wait' },
  absent: { bg: '#FDECEC', fg: '#A51C20', icon: 'x' },
};
export const MEDAL = ['#FFD60A', '#E4E2DA', '#F3D3B5'];

export type Tab = 'home' | 'schedule' | 'points' | 'me' | 'team';
export type NavKind = 'guest' | 'member' | 'admin';

export function BottomNav({ kind, active, onTab }: { kind: NavKind; active: Tab; onTab: (t: Tab) => void }) {
  const sets: Record<NavKind, [Tab, string, string][]> = {
    guest: [['home', 'Home', 'home'], ['schedule', 'Schedule', 'schedule'], ['points', 'Points', 'points']],
    member: [['home', 'Home', 'home'], ['schedule', 'Schedule', 'schedule'], ['points', 'Points', 'points'], ['me', 'Me', 'me']],
    admin: [['home', 'Home', 'home'], ['schedule', 'Schedule', 'schedule'], ['points', 'Points', 'points'], ['team', 'Team', 'team']],
  };
  return (
    <nav className="nav" aria-label="Main menu">
      {sets[kind].map(([t, label, icon]) => {
        const on = t === active;
        return (
          <button key={t} className={`navbtn${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => onTab(t)}>
            <span className="navpill"><Icon n={icon} s={22} w={on ? 2.3 : 2} /></span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function TopHeader({ admin, right }: { admin?: boolean; right?: React.ReactNode }) {
  return (
    <header className="hdr">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="COG church logo" />
        <span>Worship Team</span>
        {admin && <span className="tag" style={{ alignSelf: 'center' }}>Admin</span>}
      </div>
      {right}
    </header>
  );
}
export function BackHeader({ title, sub, onBack, right }: { title: string; sub?: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <header className="hdr hdr-back">
      <button className="iconbtn" onClick={onBack} aria-label="Back"><Icon n="back" s={24} /></button>
      <div className="ttl"><h1>{title}</h1>{sub && <span>{sub}</span>}</div>
      {right}
    </header>
  );
}
export function TitleHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return <header className="hdr"><h1 className="h1">{title}</h1>{right}</header>;
}

export function HeroRows({ s }: { s: SundaySchedule }) {
  return (
    <div className="hero-rows">
      <div className="hrow"><Icon n="music" s={22} c="#FFD60A" w={2} /><span className="col"><span className="hk">Practice</span><span className="hv">{longDay(s.practiceDate)} · {s.practiceTime}</span></span></div>
      <div className="hsep" />
      <div className="hrow"><Icon n="clock" s={22} c="#FFD60A" w={2} /><span className="col"><span className="hk">Service</span><span className="hv">{longDay(s.date)} · {s.worshipTime}</span></span></div>
    </div>
  );
}
export function Hero({ s, chip, extra }: { s: SundaySchedule; chip: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="hero">
      <div className="hero-top">
        <div className="col"><span className="hero-lbl">This Sunday</span><span className="hero-date">{dLbl(s.date)}</span></div>
        {chip}
      </div>
      {extra || <HeroRows s={s} />}
    </section>
  );
}

/** Team grouped under Song leader / Backup / Musicians & media, as role cards. */
export function TeamCards({ s, meId, signedIn, onPick }: { s: SundaySchedule; meId?: string; signedIn: boolean; onPick?: (a: SundayAssignment) => void }) {
  const groups: [string, SundayAssignment[]][] = [
    ['Song leader', s.assignments.filter((a) => a.role === 'songleader')],
    ['Backup', s.assignments.filter((a) => a.role === 'backup')],
    ['Musicians & media', s.assignments.filter((a) => a.role !== 'songleader' && a.role !== 'backup')
      .sort((x, y) => MUSICIAN_ORDER.indexOf(x.role) - MUSICIAN_ORDER.indexOf(y.role))],
  ];
  return (
    <>
      {groups.map(([title, items]) => items.length ? (
        <div className="tgroup" key={title}>
          <h3 className="tsub">{title}{items.length > 1 && <span>{items.length}</span>}</h3>
          <div className={title === 'Song leader' ? 'tlead' : 'tcards'}>
            {items.map((a) => <RoleCard key={a.userId + a.role} a={a} lead={title === 'Song leader'} mine={!!meId && a.userId === meId} signedIn={signedIn} onPick={onPick} />)}
          </div>
        </div>
      ) : null)}
    </>
  );
}
function RoleCard({ a, lead, mine, signedIn, onPick }: { a: SundayAssignment; lead: boolean; mine: boolean; signedIn: boolean; onPick?: (a: SundayAssignment) => void }) {
  const st = statusOf(a);
  const sty = ST_STYLE[st];
  const forName = coveringFor(a);
  const label = `${ROLE_LABEL[a.role]}: ${a.userName}${forName ? `, covering for ${forName}` : ''}${signedIn ? `, ${STATUS_LABEL[st]}` : ''}`;
  const inner = (
    <>
      <span className="tc-ic">
        <Icon n={ROLE_ICON[a.role]} s={lead ? 22 : 18} w={2.1} />
        {signedIn && <span className="tc-badge" style={{ background: sty.fg }}><Icon n={sty.icon} s={10} c="#fff" w={3.6} /></span>}
      </span>
      <span className="tc-txt">
        <span className="tc-role"><span>{ROLE_LABEL[a.role]}</span>{mine && <span className="you">You</span>}</span>
        <span className="tc-nm">{a.userName}</span>
        {forName && <span className="tc-for">for {forName}</span>}
      </span>
      {lead && signedIn && <span className="tc-pill" style={{ background: sty.bg, color: sty.fg }}>{STATUS_LABEL[st]}</span>}
    </>
  );
  const cls = `tcard${lead ? ' lead' : ''}${mine ? ' me' : ''}`;
  return onPick
    ? <button className={cls} onClick={() => onPick(a)} aria-label={`${label}. Tap to change`}>{inner}</button>
    : <div className={cls} role="group" aria-label={label}>{inner}</div>;
}

export function Sheet({ title, sub, children, actions, onClose }: { title: string; sub?: string; children?: React.ReactNode; actions: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <button className="dim" onClick={onClose} aria-label="Close" />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t">
        <span className="grab" />
        <div className="col" style={{ gap: 6 }}>
          <h2 id="sh-t" className="h2" style={{ fontSize: 23 }}>{title}</h2>
          {sub && <span className="sub" style={{ fontSize: 16 }}>{sub}</span>}
        </div>
        {children}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions}
          <button className="btn-text" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </>
  );
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const monShortUpper = (d: string) => MON[parseDay(d).getMonth()].toUpperCase();

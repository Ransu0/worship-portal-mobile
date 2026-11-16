// Test-run only: fills browser storage with a sample team when NEXT_PUBLIC_DEMO=1.
// Never runs when Supabase is configured, so it can't touch real data.
import { StorageService, INITIAL_USERS, DEFAULT_PASSWORD } from './storage';
import { SupabaseService } from './supabaseService';
import { MemberCapability, User } from './types';

const FLAG = 'worship_demo_seeded_v1';

const SAMPLE: [string, MemberCapability[]][] = [
  ['Kish', ['songleader', 'backup']], ['Joy', ['songleader', 'backup']], ['Faith', ['songleader', 'backup']],
  ['Lowrence', ['guitar']], ['Paolo', ['guitar']], ['Carlo', ['guitar', 'bass']], ['Mark', ['bass', 'guitar']],
  ['Randy', ['drums']], ['Ben', ['drums']], ['Ciara', ['keys', 'backup']], ['Bea', ['backup']], ['Rica', ['backup']],
  ['Ella', ['media']], ['Sam', ['media']], ['Mia', ['tambourines']],
];

export function seedDemoIfNeeded(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_DEMO !== '1' || SupabaseService.isEnabled()) return false;
  try { if (localStorage.getItem(FLAG)) return false; } catch { return false; }

  // The starting Admin account has every ministry ticked, which makes the shuffle schedule "Admin". Not for the sample team.
  const users: User[] = [{ ...INITIAL_USERS[0], capabilities: [] }];
  SAMPLE.forEach(([name, caps], i) => {
    users.push({
      id: `demo-${name.toLowerCase()}`,
      username: name.toLowerCase(),
      fullName: name,
      password: DEFAULT_PASSWORD,
      role: 'member',
      capabilities: caps,
      instrument: caps[0],
      points: [150, 80, 60, 120, 90, 40, 100, 130, 50, 110, 70, 60, 30, 20, 40][i] || 0,
      absentCount: name === 'Lowrence' ? 1 : name === 'Ben' ? 2 : 0,
      active: true,
    });
  });
  StorageService.saveUsers(users);

  const now = new Date();
  StorageService.generateScheduleForMonth(now.getFullYear(), now.getMonth());
  const { upcoming } = StorageService.getUpcomingTwoSchedules();
  if (upcoming) {
    const schedules = StorageService.getSchedules();
    const s = schedules.find((x) => x.id === upcoming.id)!;
    // Make sure Lowrence (guitar) is on this Sunday's team so the member flow can be tested.
    if (!s.assignments.some((a) => a.userId === 'demo-lowrence')) {
      const g = s.assignments.find((a) => a.role === 'guitar');
      if (g) { g.userId = 'demo-lowrence'; g.userName = 'Lowrence'; }
      else s.assignments.push({ userId: 'demo-lowrence', userName: 'Lowrence', role: 'guitar', status: 'assigned' });
    }
    s.assignments.forEach((a, i) => { if (a.userId !== 'demo-lowrence' && i % 3 !== 2) a.status = 'confirmed'; });
    s.lineup = {
      id: `lineup-${s.id}`,
      scheduleId: s.id,
      notes: 'Practice the bridge of Way Maker.',
      updatedAt: new Date().toISOString(),
      songs: [
        { id: 's1', title: 'Goodness of God', key: 'A', notes: 'Slow start, build on chorus', link: '' },
        { id: 's2', title: 'Way Maker', key: 'E', notes: 'Bridge 2x', link: '' },
        { id: 's3', title: 'Living Hope', key: 'C', notes: '', link: '' },
        { id: 's4', title: 'Great Are You Lord', key: 'G', notes: 'Closing', link: '' },
      ],
    };
    StorageService.saveSchedules(schedules);
  }
  try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
  return true;
}

export function resetDemo() {
  try { localStorage.removeItem(FLAG); } catch { /* ignore */ }
  StorageService.clearAllData();
}

import { User, SundaySchedule, PointLog, Lineup, SundayAssignment } from './types';
import { generateMonthSchedule } from './shuffle';
import { SupabaseService } from './supabaseService';

export const DEFAULT_PASSWORD = 'cogvet';

// Clean setup: Only initial Admin account so user can add real team members manually
export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'Admin (Worship Director)',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    capabilities: [
      'songleader',
      'backup',
      'keys',
      'guitar',
      'bass',
      'drums',
      'media',
      'tambourines',
    ],
    instrument: 'Worship Director',
    points: 0,
    absentCount: 0,
    active: true,
  },
];

export const INITIAL_SCHEDULES: SundaySchedule[] = [];

export const INITIAL_POINT_LOGS: PointLog[] = [];

const STORAGE_KEYS = {
  USERS: 'worship_users_v7',
  SCHEDULES: 'worship_schedules_v7',
  POINT_LOGS: 'worship_point_logs_v7',
  CURRENT_USER: 'worship_current_user_v7',
};

// Safe LocalStorage access
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const StorageService = {
  getUsers(): User[] {
    return getFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  saveUsers(users: User[]): void {
    setToStorage(STORAGE_KEYS.USERS, users);
    users.forEach((u) => SupabaseService.upsertUser(u));
  },

  addUser(newUser: Omit<User, 'id'>): User {
    const users = this.getUsers();
    const created: User = {
      ...newUser,
      id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      points: newUser.points || 0,
      absentCount: newUser.absentCount || 0,
      password: newUser.password || DEFAULT_PASSWORD,
      active: newUser.active !== undefined ? newUser.active : true,
    };
    users.push(created);
    this.saveUsers(users);
    SupabaseService.upsertUser(created);
    return created;
  },

  updateUser(updated: User): void {
    const users = this.getUsers().map((u) => (u.id === updated.id ? updated : u));
    setToStorage(STORAGE_KEYS.USERS, users);
    SupabaseService.upsertUser(updated);
  },

  deleteUser(userId: string): void {
    const users = this.getUsers().filter((u) => u.id !== userId);
    setToStorage(STORAGE_KEYS.USERS, users);
    SupabaseService.deleteUser(userId);
  },

  getCurrentUser(): User | null {
    return getFromStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser(user: User | null): void {
    setToStorage(STORAGE_KEYS.CURRENT_USER, user);
  },

  getSchedules(): SundaySchedule[] {
    return getFromStorage<SundaySchedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
  },

  saveSchedules(schedules: SundaySchedule[]): void {
    schedules.sort((a, b) => a.date.localeCompare(b.date));
    setToStorage(STORAGE_KEYS.SCHEDULES, schedules);
    SupabaseService.upsertAllSchedules(schedules);
  },

  getUpcomingTwoSchedules(): { upcoming: SundaySchedule | null; next: SundaySchedule | null } {
    const schedules = this.getSchedules();
    if (schedules.length === 0) {
      return { upcoming: null, next: null };
    }
    const today = new Date().toISOString().split('T')[0];
    const futureOrToday = schedules.filter((s) => s.date >= today && s.status !== 'completed');

    const upcoming = futureOrToday[0] || schedules[0] || null;
    const next = futureOrToday[1] || schedules[1] || null;

    return { upcoming, next };
  },

  generateScheduleForMonth(year: number, monthIndex: number): SundaySchedule[] {
    const users = this.getUsers();
    const currentSchedules = this.getSchedules();
    const generated = generateMonthSchedule(year, monthIndex, users, currentSchedules);

    const otherMonths = currentSchedules.filter(
      (s) => !s.date.startsWith(`${year}-${String(monthIndex + 1).padStart(2, '0')}`)
    );
    const combined = [...otherMonths, ...generated];
    this.saveSchedules(combined);
    return combined;
  },

  saveLineup(scheduleId: string, lineup: Lineup): void {
    const schedules = this.getSchedules();
    const updated = schedules.map((s) => {
      if (s.id === scheduleId) {
        return { ...s, lineup };
      }
      return s;
    });
    this.saveSchedules(updated);
  },

  deleteMonthSchedules(monthKey: string): void {
    const schedules = this.getSchedules();
    const remaining = schedules.filter((s) => s.month !== monthKey);
    setToStorage(STORAGE_KEYS.SCHEDULES, remaining);
    SupabaseService.deleteSchedulesForMonth(monthKey);
  },

  /**
   * Option A: Member swaps with replacement of same role.
   * "if she have swap then no absent."
   * Does NOT increment absentCount!
   */
  swapMember(
    scheduleId: string,
    currentUserId: string,
    replacementUserId: string,
    reason?: string
  ): void {
    const schedules = this.getSchedules();
    const users = this.getUsers();
    const logs = this.getPointLogs();

    const targetUser = users.find((u) => u.id === currentUserId);
    const replacementUser = users.find((u) => u.id === replacementUserId);

    if (!targetUser || !replacementUser) return;

    let targetScheduleTitle = '';

    const updatedSchedules = schedules.map((sched) => {
      if (sched.id === scheduleId) {
        targetScheduleTitle = sched.title || sched.date;
        let isSongleaderReplaced = false;

        const updatedAssignments = sched.assignments.map((asgn) => {
          if (asgn.userId === currentUserId) {
            const prevHistory = asgn.history || [];
            if (asgn.role === 'songleader') {
              isSongleaderReplaced = true;
            }

            return {
              ...asgn,
              userId: replacementUser.id,
              userName: replacementUser.fullName,
              status: 'assigned' as const,
              history: [
                ...prevHistory,
                {
                  userId: targetUser.id,
                  userName: targetUser.fullName,
                  type: 'swap' as const,
                  reason: reason || 'Covered by replacement',
                  replacedAt: new Date().toISOString(),
                },
              ],
            };
          }
          return asgn;
        });

        return {
          ...sched,
          songleaderId: isSongleaderReplaced ? replacementUser.id : sched.songleaderId,
          songleaderName: isSongleaderReplaced ? replacementUser.fullName : sched.songleaderName,
          assignments: updatedAssignments,
        };
      }
      return sched;
    });

    logs.unshift({
      id: `log-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.fullName,
      points: 0,
      reason: `Swapped on ${targetScheduleTitle}: Covered by ${replacementUser.fullName} (No absence penalty)${reason ? ` - ${reason}` : ''}`,
      date: new Date().toISOString().split('T')[0],
      adminName: 'System / Member',
      type: 'bonus',
    });

    this.saveUsers(users);
    this.saveSchedules(updatedSchedules);
    this.savePointLogs(logs);
  },

  /**
   * Option B: Member CANNOT find replacement -> marked ABSENT.
   * "if she cant then need have option absent. that is the only time have absent ."
   * Increments absentCount by 1!
   */
  markMemberAbsent(
    scheduleId: string,
    currentUserId: string,
    reason?: string
  ): void {
    const schedules = this.getSchedules();
    const users = this.getUsers();
    const logs = this.getPointLogs();

    const targetUser = users.find((u) => u.id === currentUserId);
    if (!targetUser) return;

    // This is the ONLY time absence is counted!
    targetUser.absentCount = (targetUser.absentCount || 0) + 1;

    let targetScheduleTitle = '';

    const updatedSchedules = schedules.map((sched) => {
      if (sched.id === scheduleId) {
        targetScheduleTitle = sched.title || sched.date;

        const updatedAssignments = sched.assignments.map((asgn) => {
          if (asgn.userId === currentUserId) {
            return {
              ...asgn,
              status: 'absent' as const,
              notes: reason || 'Stepped down without replacement',
            };
          }
          return asgn;
        });

        return {
          ...sched,
          assignments: updatedAssignments,
        };
      }
      return sched;
    });

    logs.unshift({
      id: `log-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.fullName,
      points: 0,
      reason: `Marked Absent on ${targetScheduleTitle}: No replacement found${reason ? ` (${reason})` : ''}`,
      date: new Date().toISOString().split('T')[0],
      adminName: 'System / Member',
      type: 'absence',
    });

    this.saveUsers(users);
    this.saveSchedules(updatedSchedules);
    this.savePointLogs(logs);
  },

  replaceMemberAndMarkAbsent(
    scheduleId: string,
    currentUserId: string,
    replacementUserId: string,
    reason?: string
  ): void {
    this.swapMember(scheduleId, currentUserId, replacementUserId, reason);
  },

  confirmAssignment(scheduleId: string, userId: string): void {
    const schedules = this.getSchedules();
    const updated = schedules.map((sched) => {
      if (sched.id === scheduleId) {
        return {
          ...sched,
          assignments: sched.assignments.map((asgn) => {
            if (asgn.userId === userId) {
              return { ...asgn, status: 'confirmed' as const };
            }
            return asgn;
          }),
        };
      }
      return sched;
    });
    this.saveSchedules(updated);
  },

  completeSundayAttendance(scheduleId: string, pointsPerAttendance = 10, adminName = 'Admin'): void {
    const schedules = this.getSchedules();
    const users = this.getUsers();
    const logs = this.getPointLogs();
    const targetSched = schedules.find((s) => s.id === scheduleId);

    if (!targetSched || targetSched.isCompleted) return;

    const todayStr = new Date().toISOString().split('T')[0];

    targetSched.assignments.forEach((asgn) => {
      // ONLY award points if member explicitly confirmed their schedule in the app!
      // If they did not confirm in the app, 0 points are awarded because they didn't check the app.
      if (asgn.status === 'confirmed') {
        const user = users.find((u) => u.id === asgn.userId);
        if (user) {
          user.points += pointsPerAttendance;
          logs.unshift({
            id: `log-${Date.now()}-${user.id}`,
            userId: user.id,
            userName: user.fullName,
            points: pointsPerAttendance,
            reason: `Confirmed in app & served on ${targetSched.title || targetSched.date} as ${asgn.role} (+${pointsPerAttendance} pts)`,
            date: todayStr,
            adminName,
            type: 'attendance',
          });
        }
        asgn.status = 'attended';
      }
    });

    targetSched.isCompleted = true;
    targetSched.status = 'completed';

    this.saveUsers(users);
    this.saveSchedules(schedules);
    this.savePointLogs(logs);
  },

  /**
   * Mobile redesign: admin ticks who actually came, then +points for each ticked member.
   * Ticked members are marked 'attended'; unticked ones keep their status.
   */
  completeSundayWithAttendance(scheduleId: string, attendedUserIds: string[], pointsPerAttendance = 10, adminName = 'Admin'): number {
    const schedules = this.getSchedules();
    const users = this.getUsers();
    const logs = this.getPointLogs();
    const targetSched = schedules.find((s) => s.id === scheduleId);
    if (!targetSched || targetSched.isCompleted) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const ticked = new Set(attendedUserIds);
    let count = 0;
    targetSched.assignments.forEach((asgn) => {
      if (!ticked.has(asgn.userId) || asgn.status === 'absent') return;
      const user = users.find((u) => u.id === asgn.userId);
      if (!user) return;
      user.points += pointsPerAttendance;
      count++;
      logs.unshift({
        id: `log-${Date.now()}-${user.id}`,
        userId: user.id,
        userName: user.fullName,
        points: pointsPerAttendance,
        reason: `Served on ${targetSched.title || targetSched.date} as ${asgn.role} (+${pointsPerAttendance} pts)`,
        date: todayStr,
        adminName,
        type: 'attendance',
      });
      asgn.status = 'attended';
    });
    targetSched.isCompleted = true;
    targetSched.status = 'completed';
    this.saveUsers(users);
    this.saveSchedules(schedules);
    this.savePointLogs(logs);
    return count;
  },

  adjustPoints(userId: string, pointsChange: number, reason: string, adminName = 'Admin'): void {
    const users = this.getUsers();
    const logs = this.getPointLogs();
    const user = users.find((u) => u.id === userId);

    if (!user) return;

    user.points = Math.max(0, user.points + pointsChange);

    logs.unshift({
      id: `log-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      points: pointsChange,
      reason: reason || (pointsChange < 0 ? 'Admin manual deduction' : 'Admin manual bonus'),
      date: new Date().toISOString().split('T')[0],
      adminName,
      type: pointsChange < 0 ? 'deduction' : 'bonus',
    });

    this.saveUsers(users);
    this.savePointLogs(logs);
  },

  getPointLogs(): PointLog[] {
    return getFromStorage<PointLog[]>(STORAGE_KEYS.POINT_LOGS, INITIAL_POINT_LOGS);
  },

  savePointLogs(logs: PointLog[]): void {
    setToStorage(STORAGE_KEYS.POINT_LOGS, logs);
    SupabaseService.upsertAllPointLogs(logs);
  },

  clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.POINT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  resetToCleanAdmin(): void {
    if (typeof window === 'undefined') return;
    this.saveUsers(INITIAL_USERS);
    this.saveSchedules([]);
    this.savePointLogs([]);
    this.setCurrentUser(null);
  },
};

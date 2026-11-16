import { supabase, isSupabaseConfigured } from './supabase';
import { User, SundaySchedule, PointLog, UserRole, MemberCapability } from './types';

// Convert database snake_case row to TypeScript User
function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    password: row.password,
    role: (row.role as UserRole) || 'member',
    capabilities: (row.capabilities as MemberCapability[]) || ['backup'],
    instrument: row.instrument || 'Vocals',
    points: Number(row.points || 0),
    absentCount: Number(row.absent_count || 0),
    active: row.active !== undefined ? Boolean(row.active) : true,
  };
}

// Convert TypeScript User to database snake_case row
function userToRow(u: User) {
  return {
    id: u.id,
    username: u.username.toLowerCase().trim(),
    full_name: u.fullName.trim(),
    password: u.password || 'cogvet',
    role: u.role || 'member',
    capabilities: u.capabilities || ['backup'],
    instrument: u.instrument || 'Vocals',
    points: u.points || 0,
    absent_count: u.absentCount || 0,
    active: u.active !== undefined ? u.active : true,
  };
}

// Convert database row to SundaySchedule
function rowToSchedule(row: any): SundaySchedule {
  return {
    id: row.id,
    date: row.date,
    practiceDate: row.practice_date,
    practiceTime: row.practice_time || '4:00 PM',
    worshipTime: row.worship_time || '8:30 AM',
    month: row.month,
    title: row.title || '',
    songleaderId: row.songleader_id,
    songleaderName: row.songleader_name,
    assignments: Array.isArray(row.assignments) ? row.assignments : [],
    lineup: row.lineup || undefined,
    isCompleted: Boolean(row.is_completed),
    status: row.status || 'upcoming',
  };
}

// Convert SundaySchedule to database row
function scheduleToRow(s: SundaySchedule) {
  return {
    id: s.id,
    date: s.date,
    practice_date: s.practiceDate,
    practice_time: s.practiceTime || '4:00 PM',
    worship_time: s.worshipTime || '8:30 AM',
    month: s.month,
    title: s.title || '',
    songleader_id: s.songleaderId,
    songleader_name: s.songleaderName,
    assignments: s.assignments || [],
    lineup: s.lineup || null,
    is_completed: Boolean(s.isCompleted),
    status: s.status || 'upcoming',
  };
}

// Convert database row to PointLog
function rowToPointLog(row: any): PointLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    points: Number(row.points || 0),
    reason: row.reason || '',
    date: row.date,
    adminName: row.admin_name || 'Admin',
    type: row.type || 'attendance',
  };
}

// Convert PointLog to database row
function pointLogToRow(p: PointLog) {
  return {
    id: p.id,
    user_id: p.userId,
    user_name: p.userName,
    points: p.points,
    reason: p.reason || '',
    date: p.date,
    admin_name: p.adminName || 'Admin',
    type: p.type || 'attendance',
  };
}

export const SupabaseService = {
  isEnabled(): boolean {
    return isSupabaseConfigured && supabase !== null;
  },

  // USERS / MEMBERS
  async fetchUsers(): Promise<User[] | null> {
    if (!this.isEnabled()) return null;
    try {
      const { data, error } = await supabase!
        .from('worship_users')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.warn('Supabase fetchUsers error:', error.message);
        return null;
      }
      return data ? data.map(rowToUser) : [];
    } catch (err) {
      console.warn('Supabase fetchUsers failed:', err);
      return null;
    }
  },

  async upsertUser(user: User): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const row = userToRow(user);
      const { error } = await supabase!.from('worship_users').upsert(row, { onConflict: 'id' });
      if (error) console.warn('Supabase upsertUser error:', error.message);
    } catch (err) {
      console.warn('Supabase upsertUser failed:', err);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const { error } = await supabase!.from('worship_users').delete().eq('id', userId);
      if (error) console.warn('Supabase deleteUser error:', error.message);
    } catch (err) {
      console.warn('Supabase deleteUser failed:', err);
    }
  },

  // SCHEDULES
  async fetchSchedules(): Promise<SundaySchedule[] | null> {
    if (!this.isEnabled()) return null;
    try {
      const { data, error } = await supabase!
        .from('worship_schedules')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.warn('Supabase fetchSchedules error:', error.message);
        return null;
      }
      return data ? data.map(rowToSchedule) : [];
    } catch (err) {
      console.warn('Supabase fetchSchedules failed:', err);
      return null;
    }
  },

  async upsertSchedule(schedule: SundaySchedule): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const row = scheduleToRow(schedule);
      const { error } = await supabase!.from('worship_schedules').upsert(row, { onConflict: 'id' });
      if (error) console.warn('Supabase upsertSchedule error:', error.message);
    } catch (err) {
      console.warn('Supabase upsertSchedule failed:', err);
    }
  },

  async upsertAllSchedules(schedules: SundaySchedule[]): Promise<void> {
    if (!this.isEnabled() || schedules.length === 0) return;
    try {
      const rows = schedules.map(scheduleToRow);
      const { error } = await supabase!.from('worship_schedules').upsert(rows, { onConflict: 'id' });
      if (error) console.warn('Supabase upsertAllSchedules error:', error.message);
    } catch (err) {
      console.warn('Supabase upsertAllSchedules failed:', err);
    }
  },

  async deleteSchedulesForMonth(monthKey: string): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const { error } = await supabase!.from('worship_schedules').delete().eq('month', monthKey);
      if (error) console.warn('Supabase deleteSchedulesForMonth error:', error.message);
    } catch (err) {
      console.warn('Supabase deleteSchedulesForMonth failed:', err);
    }
  },

  // POINT LOGS
  async fetchPointLogs(): Promise<PointLog[] | null> {
    if (!this.isEnabled()) return null;
    try {
      const { data, error } = await supabase!
        .from('worship_point_logs')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.warn('Supabase fetchPointLogs error:', error.message);
        return null;
      }
      return data ? data.map(rowToPointLog) : [];
    } catch (err) {
      console.warn('Supabase fetchPointLogs failed:', err);
      return null;
    }
  },

  async upsertPointLog(log: PointLog): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const row = pointLogToRow(log);
      const { error } = await supabase!.from('worship_point_logs').upsert(row, { onConflict: 'id' });
      if (error) console.warn('Supabase upsertPointLog error:', error.message);
    } catch (err) {
      console.warn('Supabase upsertPointLog failed:', err);
    }
  },

  async upsertAllPointLogs(logs: PointLog[]): Promise<void> {
    if (!this.isEnabled() || logs.length === 0) return;
    try {
      const rows = logs.map(pointLogToRow);
      const { error } = await supabase!.from('worship_point_logs').upsert(rows, { onConflict: 'id' });
      if (error) console.warn('Supabase upsertAllPointLogs error:', error.message);
    } catch (err) {
      console.warn('Supabase upsertAllPointLogs failed:', err);
    }
  },
};

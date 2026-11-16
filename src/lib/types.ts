export type MemberCapability =
  | 'songleader'
  | 'backup'
  | 'guitar'
  | 'bass'
  | 'drums'
  | 'keys'
  | 'media'
  | 'tambourines';

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  role: UserRole;
  capabilities: MemberCapability[];
  instrument?: string;
  points: number;
  absentCount: number;
  active: boolean;
  avatarUrl?: string;
}

export interface SongItem {
  id: string;
  title: string;
  notes?: string;
  link?: string; // YouTube, chord chart, MP3 link
  key?: string;
}

export interface Lineup {
  id: string;
  scheduleId: string;
  songs: SongItem[];
  notes?: string;
  updatedAt: string;
}

export type AssignmentStatus = 'assigned' | 'confirmed' | 'absent' | 'attended';

export interface ReplacementHistoryStep {
  userId: string;
  userName: string;
  type: 'swap' | 'absent';
  reason?: string;
  replacedAt?: string;
}

export interface SundayAssignment {
  userId: string;
  userName: string;
  role: MemberCapability;
  instrument?: string;
  status: AssignmentStatus;
  notes?: string;
  // History of replaced members for Jana(Kish)(Randy) chain:
  history?: ReplacementHistoryStep[];
}

export interface SundaySchedule {
  id: string;
  date: string; // YYYY-MM-DD (Sunday)
  practiceDate: string; // YYYY-MM-DD (Saturday 4:00 PM)
  practiceTime: string; // "4:00 PM"
  worshipTime: string; // "8:30 AM"
  month: string; // YYYY-MM
  title?: string;
  songleaderId: string;
  songleaderName: string;
  assignments: SundayAssignment[];
  lineup?: Lineup;
  isCompleted?: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export interface PointLog {
  id: string;
  userId: string;
  userName: string;
  points: number; // e.g. +10, -5
  reason: string;
  date: string;
  adminName?: string;
  type?: 'attendance' | 'deduction' | 'bonus' | 'absence';
}

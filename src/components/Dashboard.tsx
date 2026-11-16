'use client';

import React, { useState } from 'react';
import { SundaySchedule, User, Lineup, SundayAssignment } from '@/lib/types';
import {
  Calendar,
  Music,
  UserCheck,
  UserX,
  ExternalLink,
  Edit3,
  Award,
  Sparkles,
  Clock,
  Mic2,
  Guitar,
  Video,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { LineupModal } from './LineupModal';

interface DashboardProps {
  currentUser: User | null;
  upcomingSchedule: SundaySchedule | null;
  nextSchedule: SundaySchedule | null;
  users: User[];
  onOpenLogin: () => void;
  onSwapMember: (
    scheduleId: string,
    currentUserId: string,
    replacementUserId: string,
    reason?: string
  ) => void;
  onMarkMemberAbsent: (
    scheduleId: string,
    currentUserId: string,
    reason?: string
  ) => void;
  onConfirmSelf: (scheduleId: string, userId: string) => void;
  onSaveLineup: (scheduleId: string, lineup: Lineup) => void;
  onViewAllSchedules: () => void;
  onViewLeaderboard: () => void;
}

// Helper to render the Jana(Kish)(Randy) replacement hierarchy with (Confirmed) beside name
const RenderAssignmentChain: React.FC<{ assignment: SundayAssignment }> = ({ assignment }) => {
  const history = assignment.history || [];

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      {history.length === 0 ? (
        <span
          className={`font-medium ${
            assignment.status === 'absent'
              ? 'text-rose-500 line-through font-semibold'
              : 'text-zinc-100'
          }`}
        >
          {assignment.userName}
        </span>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-0.5">
          {history.map((step, idx) => (
            <span key={step.userId + idx} className="inline-flex items-center">
              <span
                className="text-rose-500 line-through font-semibold"
                title={`${step.type === 'swap' ? 'Swapped' : 'Absent'}: ${step.reason || 'Replaced'}`}
              >
                {step.userName}
              </span>
              <span className="text-zinc-500">(</span>
            </span>
          ))}
          <span className="text-amber-400 font-bold">{assignment.userName}</span>
          {history.map((_, idx) => (
            <span key={idx} className="text-zinc-500">
              )
            </span>
          ))}
        </span>
      )}

      {/* Confirmed text beside name */}
      {assignment.status === 'confirmed' && (
        <span className="text-emerald-400 font-black text-[10px] bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
          (Confirmed)
        </span>
      )}

      {/* Attended (Confirmed & Served +10 pts) */}
      {assignment.status === 'attended' && (
        <span className="text-emerald-400 font-black text-[10px] bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/40">
          (Confirmed · Served +10)
        </span>
      )}

      {/* Absent text beside name */}
      {assignment.status === 'absent' && (
        <span className="text-rose-400 font-black text-[10px] bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/30">
          (Absent)
        </span>
      )}
    </span>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  upcomingSchedule,
  nextSchedule,
  users,
  onOpenLogin,
  onSwapMember,
  onMarkMemberAbsent,
  onConfirmSelf,
  onSaveLineup,
  onViewAllSchedules,
  onViewLeaderboard,
}) => {
  const [selectedScheduleForLineup, setSelectedScheduleForLineup] = useState<SundaySchedule | null>(null);
  const [isLineupOpen, setIsLineupOpen] = useState(false);

  // Replacement modal state
  const [absenceModalSchedule, setAbsenceModalSchedule] = useState<SundaySchedule | null>(null);
  const [stepdownMode, setStepdownMode] = useState<'swap' | 'absent'>('swap');
  const [selectedReplacementId, setSelectedReplacementId] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');

  // Sorted leaderboard (top 6)
  const topUsers = [...users].sort((a, b) => b.points - a.points).slice(0, 6);

  const handleOpenLineup = (sched: SundaySchedule) => {
    setSelectedScheduleForLineup(sched);
    setIsLineupOpen(true);
  };

  const handleOpenAbsenceModal = (sched: SundaySchedule) => {
    setAbsenceModalSchedule(sched);
    setStepdownMode('swap');
    setAbsenceReason('');

    // Pre-select first eligible replacement candidate
    const myAsgn = sched.assignments.find((a) => a.userId === currentUser?.id);
    if (myAsgn) {
      const candidates = getEligibleReplacements(myAsgn.role, sched);
      if (candidates.length > 0) {
        setSelectedReplacementId(candidates[0].id);
      }
    }
  };

  // Find eligible replacement members for the same role
  const getEligibleReplacements = (role: string, sched: SundaySchedule): User[] => {
    const assignedUserIds = new Set(sched.assignments.map((a) => a.userId));

    return users.filter((u) => {
      if (!u.active || u.id === currentUser?.id || assignedUserIds.has(u.id)) {
        return false;
      }
      if (role === 'backup') {
        // Backups can be replaced by backups or songleaders
        return u.capabilities.includes('backup') || u.capabilities.includes('songleader');
      }
      if (role === 'songleader') {
        return u.capabilities.includes('songleader');
      }
      return u.capabilities.includes(role as any);
    });
  };

  const handleConfirmStepdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceModalSchedule || !currentUser) return;

    if (stepdownMode === 'swap') {
      if (!selectedReplacementId) return;
      onSwapMember(
        absenceModalSchedule.id,
        currentUser.id,
        selectedReplacementId,
        absenceReason || 'Covered by replacement'
      );
    } else {
      onMarkMemberAbsent(
        absenceModalSchedule.id,
        currentUser.id,
        absenceReason || 'No replacement available'
      );
    }

    setAbsenceModalSchedule(null);
    setSelectedReplacementId('');
    setAbsenceReason('');
  };

  const renderServiceCard = (schedule: SundaySchedule | null, isNext = false) => {
    if (!schedule) {
      return (
        <div className="bg-zinc-900 rounded-2xl p-8 text-center border border-zinc-800 shadow-lg">
          <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-300">No Service Scheduled</h4>
          <p className="text-xs text-zinc-500 mt-1">
            Generate next month&apos;s schedule in the Monthly Roster tab.
          </p>
        </div>
      );
    }

    const myAssignment = currentUser
      ? schedule.assignments.find((a) => a.userId === currentUser.id)
      : null;

    const isCurrentSongleader =
      currentUser &&
      (schedule.songleaderId === currentUser.id || currentUser.role === 'admin');

    // Date formatting
    const sundayDateObj = new Date(schedule.date + 'T10:00:00');
    const formattedSunday = sundayDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const practiceDateObj = new Date(schedule.practiceDate + 'T16:00:00');
    const formattedSaturday = practiceDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Group assignments by role
    const backups = schedule.assignments.filter((a) => a.role === 'backup');
    const guitar = schedule.assignments.find((a) => a.role === 'guitar');
    const bass = schedule.assignments.find((a) => a.role === 'bass');
    const drums = schedule.assignments.find((a) => a.role === 'drums');
    const keys = schedule.assignments.find((a) => a.role === 'keys');
    const media = schedule.assignments.find((a) => a.role === 'media');
    const tambourines = schedule.assignments.filter((a) => a.role === 'tambourines');

    return (
      <div
        className={`bg-zinc-900 rounded-2xl border transition-all overflow-hidden shadow-xl ${
          !isNext
            ? 'border-amber-500/40 shadow-amber-950/20 ring-1 ring-amber-500/20'
            : 'border-zinc-800'
        }`}
      >
        {/* Card Header (Dark Gray & Dark Yellow / Amber) */}
        <div
          className={`p-5 ${
            !isNext
              ? 'bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-amber-500/30'
              : 'bg-zinc-950 border-b border-zinc-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  !isNext
                    ? 'bg-amber-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800 text-amber-400 border border-amber-500/20'
                }`}
              >
                {!isNext ? 'Upcoming Sunday' : 'Next Sunday (+1 Week)'}
              </span>

              {schedule.isCompleted && (
                <span className="text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Served (+10 pts)
                </span>
              )}
            </div>

            {/* Practice and Worship Schedule Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-amber-500/20 text-amber-300 font-mono font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Practice: <strong className="text-zinc-100">{formattedSaturday} @ 4:00 PM</strong>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Service: <strong className="text-amber-400 font-bold">8:30 AM</strong>
              </span>
            </div>
          </div>

          <h3 className="text-xl font-black text-zinc-100 tracking-tight">{formattedSunday}</h3>
          <p className="text-xs text-amber-400/80 font-medium">{schedule.title}</p>
        </div>

        {/* User's Personal Status Banner if assigned */}
        {currentUser && myAssignment && (
          <div
            className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
              myAssignment.status === 'absent'
                ? 'bg-rose-950/40 border-rose-900/50 text-rose-300'
                : myAssignment.status === 'confirmed'
                ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
                : 'bg-amber-950/40 border-amber-900/50 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {myAssignment.status === 'absent' ? (
                <UserX className="w-5 h-5 text-rose-400 flex-shrink-0" />
              ) : myAssignment.status === 'confirmed' ? (
                <UserCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-zinc-100">
                  You are scheduled as:{' '}
                  <span className="capitalize text-amber-400 font-black">
                    {myAssignment.role}
                  </span>{' '}
                  ({myAssignment.instrument || 'Team Member'})
                </p>
                <p className="text-[11px] text-zinc-400">
                  Status:{' '}
                  <span className="font-semibold uppercase tracking-wider text-zinc-200">
                    {myAssignment.status}
                  </span>
                  {myAssignment.status === 'absent' && ' (Marked absent / Stepped down)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {myAssignment.status !== 'confirmed' && myAssignment.status !== 'absent' && (
                <button
                  onClick={() => onConfirmSelf(schedule.id, currentUser.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Confirm
                </button>
              )}

              {myAssignment.status !== 'absent' ? (
                <button
                  onClick={() => handleOpenAbsenceModal(schedule)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-rose-950 text-rose-400 border border-rose-900/50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <UserX className="w-3.5 h-3.5" /> Step Down / Replace Me
                </button>
              ) : (
                <span className="text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-1 rounded border border-rose-900/50">
                  Absent
                </span>
              )}
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="p-5 space-y-5">
          {/* Roles Roster Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* 1. Songleader */}
            <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Mic2 className="w-3.5 h-3.5" /> Songleader
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-400/30">
                    Lead
                  </span>
                </div>
                <div className="text-sm font-bold">
                  {schedule.assignments.find((a) => a.role === 'songleader') ? (
                    <RenderAssignmentChain
                      assignment={schedule.assignments.find((a) => a.role === 'songleader')!}
                    />
                  ) : (
                    <span className="text-zinc-200">{schedule.songleaderName}</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">Lead Worship Vocalist</p>
              </div>

              {isCurrentSongleader && (
                <button
                  onClick={() => handleOpenLineup(schedule)}
                  className="mt-3 w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {schedule.lineup ? 'Edit Setlist Lineup' : 'Set Up Setlist'}
                </button>
              )}
            </div>

            {/* 2. Backups */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 mb-2">
                <Users className="w-3.5 h-3.5 text-zinc-400" /> Backups ({backups.length})
              </span>
              <div className="space-y-1.5">
                {backups.map((b) => (
                  <div key={b.userId} className="text-xs">
                    <RenderAssignmentChain assignment={b} />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Keys */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 mb-2">
                <Music className="w-3.5 h-3.5 text-zinc-400" /> Keys
              </span>
              <div className="text-xs">
                {keys ? (
                  <RenderAssignmentChain assignment={keys} />
                ) : (
                  <span className="text-zinc-500 italic">None Assigned</span>
                )}
              </div>
            </div>

            {/* 4. Guitar */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 mb-2">
                <Guitar className="w-3.5 h-3.5 text-zinc-400" /> Guitar
              </span>
              <div className="text-xs">
                {guitar ? (
                  <RenderAssignmentChain assignment={guitar} />
                ) : (
                  <span className="text-zinc-500 italic">None Assigned</span>
                )}
              </div>
            </div>

            {/* 5. Bass */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 mb-2">
                <Music className="w-3.5 h-3.5 text-zinc-400" /> Bass
              </span>
              <div className="text-xs">
                {bass ? (
                  <RenderAssignmentChain assignment={bass} />
                ) : (
                  <span className="text-zinc-500 italic">None Assigned</span>
                )}
              </div>
            </div>

            {/* 6. Drums */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 mb-2">
                <Music className="w-3.5 h-3.5 text-zinc-400" /> Drums
              </span>
              <div className="text-xs">
                {drums ? (
                  <RenderAssignmentChain assignment={drums} />
                ) : (
                  <span className="text-zinc-500 italic">None Assigned</span>
                )}
              </div>
            </div>

            {/* 7. Media */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 mb-2">
                <Video className="w-3.5 h-3.5 text-zinc-400" /> Media
              </span>
              <div className="text-xs">
                {media ? (
                  <RenderAssignmentChain assignment={media} />
                ) : (
                  <span className="text-zinc-500 italic">None Assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* 7. Tambourines (ALL Active Members Always Shown) */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80 flex items-center gap-1 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tambourines (All Members Active)
            </span>
            <div className="flex flex-wrap gap-2">
              {tambourines.map((t) => (
                <div
                  key={t.userId}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs"
                >
                  <RenderAssignmentChain assignment={t} />
                </div>
              ))}
            </div>
          </div>

          {/* Song Lineup / Setlist Box (Simplified: Title, Link, Notes) */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/80">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-amber-400" />
                  Service Songs Setlist
                </h4>
                {schedule.lineup?.notes && (
                  <p className="text-xs text-zinc-400 mt-0.5">{schedule.lineup.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenLineup(schedule)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {schedule.lineup ? 'View / Edit Songs' : 'Add Setlist'}
                </button>
              </div>
            </div>

            {schedule.lineup && schedule.lineup.songs.length > 0 ? (
              <div className="space-y-2">
                {schedule.lineup.songs.map((song, idx) => (
                  <div
                    key={song.id || idx}
                    className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-zinc-100">{song.title}</span>
                        {song.notes && (
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            Note: {song.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {song.link && (
                      <a
                        href={song.link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold rounded-lg flex items-center gap-1 border border-amber-500/30 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        Chords / Audio
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <Music className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                <p className="text-xs text-zinc-400 font-medium">
                  No songs have been added yet for this Sunday.
                </p>
                {isCurrentSongleader && (
                  <button
                    onClick={() => handleOpenLineup(schedule)}
                    className="mt-2 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold"
                  >
                    Add Songs Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn text-zinc-100">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold text-amber-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>COG Worship Ministry</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100">
            Welcome,{' '}
            <span className="text-amber-400">
              {currentUser ? currentUser.fullName : 'Worship Servant'}
            </span>
            !
          </h1>
          <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
            Saturday Practice is always at <strong className="text-amber-400">4:00 PM</strong>.
            Sunday Worship begins at <strong className="text-amber-400">8:30 AM</strong>.
            Songleaders can submit setlists, and members can view fair rotations and attendance points.
          </p>

          {!currentUser && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Column (Upcoming & 1 Next) | Right Column (Leaderboard Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: STRICTLY UPCOMING AND 1 NEXT ONLY */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Service Lineups (Upcoming & 1 Next)
            </h2>
            <button
              onClick={onViewAllSchedules}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              Monthly Calendar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 1: Upcoming Sunday */}
          {renderServiceCard(upcomingSchedule, false)}

          {/* Card 2: Next Sunday (+1 Next) */}
          {renderServiceCard(nextSchedule, true)}
        </div>

        {/* Right Column: Leaderboard Widget with Absent Counts */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Points Leaderboard
            </h2>
            <button
              onClick={onViewLeaderboard}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Full Roster <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-xl">
            <p className="text-xs text-zinc-400">
              Members earn <span className="font-bold text-emerald-400">+10 points</span> for each
              Sunday service served.
            </p>

            <div className="space-y-2">
              {topUsers.map((user, idx) => {
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const isThird = idx === 2;

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors border ${
                      currentUser?.id === user.id
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                          isFirst
                            ? 'bg-amber-400 text-zinc-950 shadow-sm'
                            : isSecond
                            ? 'bg-zinc-400 text-zinc-950'
                            : isThird
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : idx + 1}
                      </div>

                      <div>
                        <span className="text-xs font-bold text-zinc-100 block">
                          {user.fullName} {currentUser?.id === user.id && '(You)'}
                        </span>
                        <span className="text-[10px] text-zinc-400 capitalize">
                          {user.capabilities.join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-black text-amber-400">
                        {user.points} pts
                      </span>
                      {user.absentCount > 0 ? (
                        <span className="text-[10px] text-rose-400 font-semibold">
                          {user.absentCount} {user.absentCount === 1 ? 'Absence' : 'Absences'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium">0 Absences</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onViewLeaderboard}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-colors text-center"
            >
              View Full Standings & History
            </button>
          </div>
        </div>
      </div>

      {/* Lineup Modal */}
      {selectedScheduleForLineup && (
        <LineupModal
          schedule={selectedScheduleForLineup}
          isOpen={isLineupOpen}
          onClose={() => setIsLineupOpen(false)}
          onSave={(lineup) => onSaveLineup(selectedScheduleForLineup.id, lineup)}
          isEditable={Boolean(
            currentUser &&
              (selectedScheduleForLineup.songleaderId === currentUser.id ||
                currentUser.role === 'admin')
          )}
        />
      )}

      {/* Absence & Replacement Selection Modal: Dual Options (Swap vs Absent) */}
      {absenceModalSchedule && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/40 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 flex-shrink-0 bg-zinc-950">
              <div className="flex items-center gap-2 text-amber-400">
                <UserX className="w-5 h-5" />
                <h3 className="text-lg font-bold">Step Down / Can&apos;t Serve</h3>
              </div>
              <button
                type="button"
                onClick={() => setAbsenceModalSchedule(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 pb-0 flex-shrink-0">
              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStepdownMode('swap')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    stepdownMode === 'swap'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  1. Swap with Teammate
                </button>
                <button
                  type="button"
                  onClick={() => setStepdownMode('absent')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    stepdownMode === 'absent'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  2. No Replacement (Absent)
                </button>
              </div>
            </div>

            <form onSubmit={handleConfirmStepdown} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {stepdownMode === 'swap' ? (
                <>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                    <p className="font-semibold text-amber-400 mb-0.5">✓ No Absence Penalty</p>
                    <p className="text-zinc-300">
                      When you swap with someone with the same role, your spot is covered, so{' '}
                      <strong>no absence</strong> will be charged to your record.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">
                      Select Replacement Member (Same Role) *
                    </label>
                    {(() => {
                      const myAsgn = absenceModalSchedule.assignments.find(
                        (a) => a.userId === currentUser.id
                      );
                      const eligible = myAsgn
                        ? getEligibleReplacements(myAsgn.role, absenceModalSchedule)
                        : [];

                      if (eligible.length === 0) {
                        return (
                          <div className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-lg border border-rose-900/50 space-y-1">
                            <p className="font-bold">No other available members found for this role.</p>
                            <p className="text-zinc-300">
                              Please switch to the &quot;No Replacement (Absent)&quot; tab above.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <select
                          required
                          value={selectedReplacementId}
                          onChange={(e) => setSelectedReplacementId(e.target.value)}
                          className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">-- Choose replacement servant --</option>
                          {eligible.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} ({u.capabilities.join(', ')})
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Reason for Swap (Optional):
                    </label>
                    <input
                      type="text"
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      placeholder="e.g. Schedule swap, out of town, work conflict..."
                      className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300">
                    <p className="font-bold text-rose-400 mb-0.5">⚠️ Uncovered Absence (+1 Absence Count)</p>
                    <p className="text-zinc-300">
                      If you cannot find anyone to replace you, this will be recorded as an{' '}
                      <strong>Absent</strong> on your profile and notified to the worship leader.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-400 mb-1">
                      Reason for Absence *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      placeholder="e.g. Sudden illness, emergency, cannot find sub..."
                      className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </>
              )}

              <div className="sticky bottom-0 bg-zinc-900 pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setAbsenceModalSchedule(null)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>

                {stepdownMode === 'swap' ? (
                  <button
                    type="submit"
                    disabled={!selectedReplacementId}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black rounded-lg text-xs shadow-sm transition-colors"
                  >
                    Confirm Swap (No Absence)
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
                  >
                    Confirm as Absent (+1)
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

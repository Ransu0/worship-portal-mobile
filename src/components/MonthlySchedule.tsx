'use client';

import React, { useState } from 'react';
import { SundaySchedule, User, Lineup, SundayAssignment } from '@/lib/types';
import {
  Calendar,
  Shuffle,
  Music,
  UserCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Edit3,
  Clock,
  Sparkles,
  Guitar,
  Mic2,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { LineupModal } from './LineupModal';

interface MonthlyScheduleProps {
  schedules: SundaySchedule[];
  users: User[];
  currentUser: User | null;
  onGenerateNextMonth: (year: number, monthIndex: number) => void;
  onDeleteMonth: (monthKey: string) => void;
  onCompleteSunday: (scheduleId: string) => void;
  onSaveLineup: (scheduleId: string, lineup: Lineup) => void;
}

// Helper to render the Jana(Kish)(Randy) replacement chain with (Confirmed) beside name
const RenderAssignmentChain: React.FC<{ assignment: SundayAssignment }> = ({ assignment }) => {
  const history = assignment.history || [];

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      {history.length === 0 ? (
        <span
          className={`font-medium ${
            assignment.status === 'absent'
              ? 'text-rose-500 line-through font-semibold'
              : 'text-zinc-200'
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

export const MonthlySchedule: React.FC<MonthlyScheduleProps> = ({
  schedules,
  users,
  currentUser,
  onGenerateNextMonth,
  onDeleteMonth,
  onCompleteSunday,
  onSaveLineup,
}) => {
  const [viewDate, setViewDate] = useState(() => {
    if (schedules.length > 0) {
      const parts = schedules[0].month.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
    return new Date(2026, 10, 1); // Nov 2026
  });

  const [selectedScheduleForLineup, setSelectedScheduleForLineup] = useState<SundaySchedule | null>(null);
  const [isLineupOpen, setIsLineupOpen] = useState(false);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const [confirmDeleteMonthOpen, setConfirmDeleteMonthOpen] = useState(false);

  const currentYear = viewDate.getFullYear();
  const currentMonthIndex = viewDate.getMonth();
  const monthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter schedules for the active month
  const monthSchedules = schedules.filter((s) => s.month === monthKey);

  // Next month calculation
  const nextMonthDate = new Date(currentYear, currentMonthIndex + 1, 1);
  const nextMonthName = nextMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthAlreadyGenerated = schedules.some((s) => s.month === nextMonthKey);

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonthIndex + 1, 1));
  };

  const handleTriggerGenerate = () => {
    onGenerateNextMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
    setConfirmGenerateOpen(false);
    setViewDate(nextMonthDate);
  };

  const handleDeleteMonthConfirmed = () => {
    onDeleteMonth(monthKey);
    setConfirmDeleteMonthOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-zinc-100">
      {/* Header with Month Navigation and Auto-Shuffle CTA */}
      <div className="bg-zinc-900 rounded-2xl border border-amber-500/30 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
            Monthly Rotation Roster
          </span>
          <h2 className="text-2xl font-black text-zinc-100 mt-2 flex items-center gap-3">
            {monthName}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Saturday Practice: <strong className="text-amber-400">4:00 PM</strong> • Sunday Worship Service: <strong className="text-amber-400">8:30 AM</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center border border-zinc-700 rounded-xl bg-zinc-950 p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold px-3 text-amber-400 min-w-28 text-center font-mono">
              {viewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Delete / Clear Active Month Button */}
          {currentUser?.role === 'admin' && monthSchedules.length > 0 && (
            <button
              onClick={() => setConfirmDeleteMonthOpen(true)}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950 text-rose-300 border border-rose-900/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title={`Clear and delete all schedules for ${monthName}`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Clear {viewDate.toLocaleDateString('en-US', { month: 'short' })}
            </button>
          )}

          {/* Auto-Shuffle button for next month */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setConfirmGenerateOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4 text-zinc-950" />
              {nextMonthAlreadyGenerated
                ? `Re-Shuffle ${nextMonthName}`
                : `Auto-Shuffle ${nextMonthName}`}
            </button>
          )}
        </div>
      </div>

      {/* Roster Rotation Policy Notice (Requirement 7) */}
      <div className="p-3.5 bg-zinc-900 border border-amber-500/20 rounded-xl text-xs text-zinc-300 flex items-start gap-2.5 shadow-sm">
        <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-400">Songleader Rotation Policy:</strong> Songleaders assigned in {monthName} are prioritized out for {nextMonthName} so all qualified songleaders rotate fairly. Tambourines are automatically included for every service.
        </p>
      </div>

      {/* Sundays of the Month */}
      {monthSchedules.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-800 shadow-xl">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-200">No schedule generated for {monthName}</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-5">
            Generate the schedule using the fair rotation algorithm. It schedules Songleaders, Backups, Instruments, and Tambourines.
          </p>
          {currentUser?.role === 'admin' ? (
            <button
              onClick={() => onGenerateNextMonth(currentYear, currentMonthIndex)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black shadow-md transition-colors inline-flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Generate Roster for {monthName}
            </button>
          ) : (
            <p className="text-xs text-amber-400 font-medium">
              Please ask your Worship Director / Admin to generate this month&apos;s schedule.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {monthSchedules.map((schedule) => {
            const formattedDate = new Date(schedule.date + 'T10:00:00').toLocaleDateString(
              'en-US',
              {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }
            );

            const backups = schedule.assignments.filter((a) => a.role === 'backup');
            const guitar = schedule.assignments.find((a) => a.role === 'guitar');
            const bass = schedule.assignments.find((a) => a.role === 'bass');
            const drums = schedule.assignments.find((a) => a.role === 'drums');
            const keys = schedule.assignments.find((a) => a.role === 'keys');
            const media = schedule.assignments.find((a) => a.role === 'media');
            const tambourines = schedule.assignments.filter((a) => a.role === 'tambourines');

            return (
              <div
                key={schedule.id}
                className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      Sunday Worship Service
                    </span>
                    <h4 className="text-base font-bold text-zinc-100">{formattedDate}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      8:30 AM
                    </span>
                    {schedule.isCompleted ? (
                      <span className="text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Served (+10)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold bg-zinc-800 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>

                {/* Team assignments */}
                <div className="p-4 space-y-3.5 flex-1">
                  {/* Songleader */}
                  <div className="p-3 bg-zinc-950/80 border border-amber-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Songleader
                      </span>
                      <div className="text-sm font-bold">
                        {schedule.assignments.find((a) => a.role === 'songleader') ? (
                          <RenderAssignmentChain
                            assignment={schedule.assignments.find((a) => a.role === 'songleader')!}
                          />
                        ) : (
                          <span className="text-zinc-100">{schedule.songleaderName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedScheduleForLineup(schedule);
                        setIsLineupOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs bg-zinc-800 text-amber-400 font-bold border border-amber-500/30 rounded-lg hover:bg-zinc-700 flex items-center gap-1 transition-colors"
                    >
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      {schedule.lineup ? `${schedule.lineup.songs.length} Songs` : 'Set Lineup'}
                    </button>
                  </div>

                  {/* Backups */}
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Backup Vocalists:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {backups.map((b) => (
                        <div
                          key={b.userId}
                          className="text-xs px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800"
                        >
                          <RenderAssignmentChain assignment={b} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Musicians & Media */}
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Musicians & Media:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-amber-400/80 font-bold block">Keys</span>
                        {keys ? <RenderAssignmentChain assignment={keys} /> : <span className="text-zinc-500">—</span>}
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-amber-400/80 font-bold block">Guitar</span>
                        {guitar ? <RenderAssignmentChain assignment={guitar} /> : <span className="text-zinc-500">—</span>}
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-amber-400/80 font-bold block">Bass</span>
                        {bass ? <RenderAssignmentChain assignment={bass} /> : <span className="text-zinc-500">—</span>}
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-amber-400/80 font-bold block">Drums</span>
                        {drums ? <RenderAssignmentChain assignment={drums} /> : <span className="text-zinc-500">—</span>}
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-amber-400/80 font-bold block">Media</span>
                        {media ? <RenderAssignmentChain assignment={media} /> : <span className="text-zinc-500">—</span>}
                      </div>
                    </div>
                  </div>

                  {/* Tambourines */}
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Tambourines (All Active):
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {tambourines.map((t) => (
                        <div
                          key={t.userId}
                          className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800"
                        >
                          <RenderAssignmentChain assignment={t} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setSelectedScheduleForLineup(schedule);
                      setIsLineupOpen(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {schedule.lineup ? 'View Songs & Links' : 'Submit Setlist'}
                  </button>

                  {currentUser?.role === 'admin' && !schedule.isCompleted && (
                    <button
                      onClick={() => onCompleteSunday(schedule.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition-colors"
                      title="Only members who confirmed in the app receive +10 points"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Award Points to Confirmed ({schedule.assignments.filter((a) => a.status === 'confirmed').length})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Auto-Shuffle Next Month */}
      {confirmGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/30 max-w-md w-full p-6 space-y-4 text-zinc-100">
            <div className="flex items-center gap-2 text-amber-400">
              <Shuffle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Auto-Shuffle {nextMonthName}</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This will automatically rotate Songleaders, Backups, and Instrumentalists for all Sundays in{' '}
              <strong className="text-amber-400">{nextMonthName}</strong>.
            </p>
            <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              ✓ Non-repeating rotation: Songleaders selected in {monthName} will NOT be chosen in {nextMonthName}.
              <br />
              ✓ Tambourine servants are always included on all Sundays.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmGenerateOpen(false)}
                className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerGenerate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Generate {nextMonthName} Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Month Confirmation Modal */}
      {confirmDeleteMonthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-rose-500/40 max-w-md w-full overflow-hidden text-zinc-100">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-bold">Clear Month Schedule</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteMonthOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to delete all generated schedules for <strong className="text-white font-bold">{monthName}</strong>?
              </p>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
                <p className="font-semibold text-rose-400 mb-0.5">⚠️ All {monthSchedules.length} Sundays will be deleted</p>
                <p className="text-zinc-300">
                  This will remove all songleader, backup, instrument, media, and setlist assignments for this month from the portal and cloud database.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteMonthOpen(false)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMonthConfirmed}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Yes, Delete {monthName}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

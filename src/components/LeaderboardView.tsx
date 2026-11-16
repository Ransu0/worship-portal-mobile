'use client';

import React, { useState } from 'react';
import { User, PointLog } from '@/lib/types';
import {
  Award,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  History,
  Sliders,
  X,
  AlertTriangle,
  UserX,
  CheckCircle2,
} from 'lucide-react';

interface LeaderboardViewProps {
  users: User[];
  pointLogs: PointLog[];
  currentUser: User | null;
  onAdjustPoints: (userId: string, points: number, reason: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  users,
  pointLogs,
  currentUser,
  onAdjustPoints,
}) => {
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('deduct');
  const [pointsAmount, setPointsAmount] = useState(10);
  const [reason, setReason] = useState('');

  // Sorted leaderboard: by points descending, then by absences ascending
  const sortedUsers = [...users].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.absentCount - b.absentCount;
  });

  const handleOpenAdjust = (userId?: string) => {
    if (userId) setSelectedUserId(userId);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = adjustmentType === 'add' ? Math.abs(pointsAmount) : -Math.abs(pointsAmount);
    onAdjustPoints(selectedUserId, finalAmount, reason);
    setIsAdjustModalOpen(false);
    setReason('');
  };

  return (
    <div className="space-y-8 animate-fadeIn text-zinc-100">
      {/* Top Banner (Dark Gray & Dark Yellow) */}
      <div className="bg-zinc-900 rounded-2xl border border-amber-500/30 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Ministry Standings & Honor Roll
          </span>
          <h2 className="text-2xl font-black text-zinc-100 mt-2">
            Worship Team Points & Absent Counts
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Faithful servants receive <strong className="text-emerald-400">+10 points</strong> per Sunday attended. Absences and replacements are recorded transparently.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => handleOpenAdjust()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            Manual Points Adjustment / Deduction
          </button>
        )}
      </div>

      {/* Leaderboard Table with Absent Counts */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Full Member Rankings ({sortedUsers.length} Active Servants)
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Updated Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 text-[11px] font-bold text-amber-400/90 uppercase tracking-wider border-b border-zinc-800">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Ministry Roles</th>
                <th className="py-3 px-4">Total Points</th>
                <th className="py-3 px-4">Absent Count</th>
                {currentUser?.role === 'admin' && (
                  <th className="py-3 px-4 text-right">Admin Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs">
              {sortedUsers.map((user, idx) => {
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const isThird = idx === 2;
                const isMe = currentUser?.id === user.id;

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      isMe ? 'bg-amber-500/10 font-medium' : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 font-bold">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            isFirst
                              ? 'bg-amber-400 text-zinc-950 font-black shadow-xs'
                              : isSecond
                              ? 'bg-zinc-400 text-zinc-950 font-bold'
                              : isThird
                              ? 'bg-amber-700 text-amber-100 font-bold'
                              : 'text-zinc-500'
                          }`}
                        >
                          {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Member */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-zinc-100 block">
                          {user.fullName} {isMe && <span className="text-amber-400 font-normal">(You)</span>}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">@{user.username}</span>
                      </div>
                    </td>

                    {/* Roles */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${
                              cap === 'songleader'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : cap === 'backup'
                                ? 'bg-purple-900/40 text-purple-300 border border-purple-800/40'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-black text-sm text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        {user.points} pts
                      </span>
                    </td>

                    {/* Absent Count (Requirement 5) */}
                    <td className="py-3.5 px-4">
                      {user.absentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900/50">
                          <UserX className="w-3 h-3 text-rose-400" />
                          {user.absentCount} {user.absentCount === 1 ? 'Absence' : 'Absences'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                          <CheckCircle2 className="w-3 h-3" />
                          0 Absences
                        </span>
                      )}
                    </td>

                    {/* Admin Actions */}
                    {currentUser?.role === 'admin' && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenAdjust(user.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded border border-amber-500/30 transition-colors"
                        >
                          Deduct / Add Points
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Points & Absences History Log */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          Recent Transactions & Absence Audit Logs
        </h3>

        <div className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
          {pointLogs.map((log) => {
            const isDeduction = log.points < 0;
            const isAttendance = log.points > 0;

            return (
              <div
                key={log.id}
                className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isAttendance
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : isDeduction
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-zinc-800 text-amber-400'
                    }`}
                  >
                    {isAttendance ? '+10' : isDeduction ? log.points : 'ABS'}
                  </div>
                  <div>
                    <span className="font-bold text-zinc-100 block">{log.userName}</span>
                    <span className="text-[11px] text-zinc-400">{log.reason}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-black text-xs ${
                      isAttendance
                        ? 'text-emerald-400'
                        : isDeduction
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {isAttendance ? `+${log.points} pts` : isDeduction ? `${log.points} pts` : 'Recorded'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">{log.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Manual Points Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/30 max-w-md w-full p-6 space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sliders className="w-5 h-5" />
                <h3 className="text-lg font-bold">Manual Points Adjustment</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Select Team Member
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.points} pts | {u.absentCount} abs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('deduct')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                      adjustmentType === 'deduct'
                        ? 'bg-rose-950 border-rose-500 text-rose-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-rose-400" />
                    Deduct Points (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                      adjustmentType === 'add'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    Add Bonus (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Point Amount
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(Number(e.target.value))}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unexcused absence deduction, Valid excuse waiver, Soundcheck bonus..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  This transaction is recorded in the member&apos;s points history.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs shadow-sm transition-colors"
                >
                  Apply Points Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

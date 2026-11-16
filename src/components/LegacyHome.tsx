'use client';
// Original desktop page, unchanged. The new mobile design lives in components/mobile.

import React, { useState, useEffect } from 'react';
import { User, SundaySchedule, PointLog, Lineup } from '@/lib/types';
import { StorageService } from '@/lib/storage';
import { SupabaseService } from '@/lib/supabaseService';
import { Navbar } from '@/components/Navbar';
import { Dashboard } from '@/components/Dashboard';
import { MonthlySchedule } from '@/components/MonthlySchedule';
import { LeaderboardView } from '@/components/LeaderboardView';
import { MembersAdmin } from '@/components/MembersAdmin';
import { LoginModal } from '@/components/LoginModal';
import { Music, Heart } from 'lucide-react';

export default function LegacyHome() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<SundaySchedule[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'leaderboard' | 'members'>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    setMounted(true);
    const loadedUsers = StorageService.getUsers();
    const loadedSchedules = StorageService.getSchedules();
    const loadedLogs = StorageService.getPointLogs();
    const loggedUser = StorageService.getCurrentUser();

    setUsers(loadedUsers);
    setSchedules(loadedSchedules);
    setPointLogs(loadedLogs);
    setCurrentUser(loggedUser);

    // Fetch and sync with Supabase Cloud if configured
    if (SupabaseService.isEnabled()) {
      Promise.all([
        SupabaseService.fetchUsers(),
        SupabaseService.fetchSchedules(),
        SupabaseService.fetchPointLogs(),
      ]).then(([supaUsers, supaSchedules, supaLogs]) => {
        if (supaUsers && supaUsers.length > 0) {
          setUsers(supaUsers);
          StorageService.saveUsers(supaUsers);
        } else if (supaUsers && supaUsers.length === 0) {
          // If Supabase table is empty, seed initial data to Supabase
          StorageService.saveUsers(loadedUsers);
        }

        if (supaSchedules && supaSchedules.length > 0) {
          setSchedules(supaSchedules);
          StorageService.saveSchedules(supaSchedules);
        }

        if (supaLogs && supaLogs.length > 0) {
          setPointLogs(supaLogs);
          StorageService.savePointLogs(supaLogs);
        }
      });
    }
  }, []);

  const refreshState = () => {
    setUsers(StorageService.getUsers());
    setSchedules(StorageService.getSchedules());
    setPointLogs(StorageService.getPointLogs());
    const current = StorageService.getCurrentUser();
    if (current) {
      const refreshedUser = StorageService.getUsers().find((u) => u.id === current.id);
      if (refreshedUser) {
        setCurrentUser(refreshedUser);
        StorageService.setCurrentUser(refreshedUser);
      }
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    StorageService.setCurrentUser(user);
    refreshState();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    StorageService.setCurrentUser(null);
  };

  const handleSwapMember = (
    scheduleId: string,
    currentUserId: string,
    replacementUserId: string,
    reason?: string
  ) => {
    StorageService.swapMember(scheduleId, currentUserId, replacementUserId, reason);
    refreshState();
  };

  const handleMarkMemberAbsent = (
    scheduleId: string,
    currentUserId: string,
    reason?: string
  ) => {
    StorageService.markMemberAbsent(scheduleId, currentUserId, reason);
    refreshState();
  };

  const handleConfirmSelf = (scheduleId: string, userId: string) => {
    StorageService.confirmAssignment(scheduleId, userId);
    refreshState();
  };

  const handleSaveLineup = (scheduleId: string, lineup: Lineup) => {
    StorageService.saveLineup(scheduleId, lineup);
    refreshState();
  };

  const handleGenerateNextMonth = (year: number, monthIndex: number) => {
    StorageService.generateScheduleForMonth(year, monthIndex);
    refreshState();
  };

  const handleDeleteMonth = (monthKey: string) => {
    StorageService.deleteMonthSchedules(monthKey);
    refreshState();
  };

  const handleCompleteSunday = (scheduleId: string) => {
    StorageService.completeSundayAttendance(scheduleId, 10, currentUser?.fullName || 'Admin');
    refreshState();
  };

  const handleAdjustPoints = (userId: string, points: number, reason: string) => {
    StorageService.adjustPoints(userId, points, reason, currentUser?.fullName || 'Admin');
    refreshState();
  };

  const handleAddUser = (newUserData: Omit<User, 'id'>) => {
    StorageService.addUser(newUserData);
    refreshState();
  };

  const handleUpdateUser = (updatedUser: User) => {
    StorageService.updateUser(updatedUser);
    refreshState();
  };

  const handleDeleteUser = (userId: string) => {
    StorageService.deleteUser(userId);
    refreshState();
  };

  const handleResetToCleanAdmin = () => {
    StorageService.resetToCleanAdmin();
    refreshState();
    setCurrentUser(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
            <Music className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-amber-400 font-mono">Loading Worship Team Portal...</p>
        </div>
      </div>
    );
  }

  // Get strictly upcoming and 1 next for dashboard
  const { upcoming, next } = StorageService.getUpcomingTwoSchedules();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            upcomingSchedule={upcoming}
            nextSchedule={next}
            users={users}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSwapMember={handleSwapMember}
            onMarkMemberAbsent={handleMarkMemberAbsent}
            onConfirmSelf={handleConfirmSelf}
            onSaveLineup={handleSaveLineup}
            onViewAllSchedules={() => setActiveTab('schedule')}
            onViewLeaderboard={() => setActiveTab('leaderboard')}
          />
        )}

        {activeTab === 'schedule' && (
          <MonthlySchedule
            schedules={schedules}
            users={users}
            currentUser={currentUser}
            onGenerateNextMonth={handleGenerateNextMonth}
            onDeleteMonth={handleDeleteMonth}
            onCompleteSunday={handleCompleteSunday}
            onSaveLineup={handleSaveLineup}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            users={users}
            pointLogs={pointLogs}
            currentUser={currentUser}
            onAdjustPoints={handleAdjustPoints}
          />
        )}

        {activeTab === 'members' && currentUser?.role === 'admin' && (
          <MembersAdmin
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onResetToCleanAdmin={handleResetToCleanAdmin}
          />
        )}
      </main>

      {/* Footer (Dark Gray & Dark Yellow) */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">COG Worship Ministry</span>
            <span className="text-zinc-700">•</span>
            <span className="text-amber-400/90 font-medium">Practice Sat 4:00 PM | Service Sun 8:30 AM</span>
          </div>

          <div className="flex items-center gap-1">
            <span>Built for the glory of God</span>
            <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mx-1" />
            <span className="text-amber-400 font-mono font-medium">Dev: Xperi3nce14</span>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
        users={users}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { User } from '@/lib/types';
import { Music, Award, Calendar, Users, LogIn, LogOut, Shield } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  activeTab: 'dashboard' | 'schedule' | 'leaderboard' | 'members';
  setActiveTab: (tab: 'dashboard' | 'schedule' | 'leaderboard' | 'members') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 shadow-xl text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-900 border border-amber-500/40 shadow-md shadow-amber-950/40 flex-shrink-0">
              <img
                src="/logo.png"
                alt="COG Worship Ministry Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <span className="text-lg font-black text-zinc-100 tracking-tight flex items-center gap-1.5">
                Worship<span className="text-amber-400">Team</span>
              </span>
              <p className="text-[11px] text-amber-400/80 font-medium -mt-1 hidden sm:block">
                COG Worship Ministry
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Music className="w-4 h-4 text-amber-400" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'schedule'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              Monthly Roster
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              Leaderboard
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('members')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'members'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Users className="w-4 h-4 text-amber-400" />
                Team Roster
              </button>
            )}
          </nav>

          {/* User Profile / Login */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-zinc-100">
                      {currentUser.fullName}
                    </span>
                    {currentUser.role === 'admin' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 capitalize">
                        {currentUser.capabilities[0] || 'Member'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono">
                    <span className="text-amber-400 font-bold">{currentUser.points} pts</span>
                    <span className="text-zinc-600">•</span>
                    {currentUser.absentCount > 0 ? (
                      <span className="text-rose-400 font-semibold">
                        {currentUser.absentCount} abs
                      </span>
                    ) : (
                      <span className="text-emerald-400">0 abs</span>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/40">
                  {currentUser.fullName.charAt(0)}
                </div>

                <button
                  onClick={onOpenLogin}
                  title="Switch User / Sign In as another member"
                  className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 rounded-lg transition-colors flex items-center gap-1 border border-zinc-800"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden lg:inline text-[11px] font-bold">Switch</span>
                </button>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border border-zinc-800"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-zinc-800/80 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 px-2.5 rounded font-bold flex flex-col items-center gap-1 ${
              activeTab === 'dashboard' ? 'text-amber-400 font-black' : 'text-zinc-400'
            }`}
          >
            <Music className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-1 px-2.5 rounded font-bold flex flex-col items-center gap-1 ${
              activeTab === 'schedule' ? 'text-amber-400 font-black' : 'text-zinc-400'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Roster
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-1 px-2.5 rounded font-bold flex flex-col items-center gap-1 ${
              activeTab === 'leaderboard' ? 'text-amber-400 font-black' : 'text-zinc-400'
            }`}
          >
            <Award className="w-4 h-4" />
            Leaderboard
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('members')}
              className={`py-1 px-2.5 rounded font-bold flex flex-col items-center gap-1 ${
                activeTab === 'members' ? 'text-amber-400 font-black' : 'text-zinc-400'
              }`}
            >
              <Users className="w-4 h-4" />
              Members
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { DEFAULT_PASSWORD } from '@/lib/storage';
import { Lock, User as UserIcon, X, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  users: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  users,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const user = users.find((u) => u.username.toLowerCase() === cleanUser && u.active);

    if (!user) {
      setError('Invalid username or password.');
      return;
    }

    const expectedPassword = user.password || DEFAULT_PASSWORD;
    if (password !== expectedPassword) {
      setError('Invalid username or password.');
      return;
    }

    onLogin(user);
    setUsername('');
    setPassword('');
    onClose();
  };

  const handleClose = () => {
    setError('');
    setUsername('');
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/30 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Header: Dark Gray & Dark Yellow */}
        <div className="bg-zinc-950 px-6 py-5 border-b border-amber-500/20 relative flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-amber-400">Worship Team Sign In</h3>
          </div>
          <p className="text-xs text-zinc-400">
            Sign in with your authorized ministry credentials.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-900 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              Sign In to Portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

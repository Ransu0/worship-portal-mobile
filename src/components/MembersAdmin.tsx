'use client';

import React, { useState, useRef } from 'react';
import { User, MemberCapability, UserRole } from '@/lib/types';
import { DEFAULT_PASSWORD } from '@/lib/storage';
import {
  Users,
  UserPlus,
  Shield,
  Check,
  Copy,
  Trash2,
  X,
  FileText,
  UploadCloud,
  CheckCheck,
  UserX,
  Edit3,
  AlertTriangle,
} from 'lucide-react';

interface MembersAdminProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onResetToCleanAdmin?: () => void;
}

const AVAILABLE_CAPABILITIES: { key: MemberCapability; label: string }[] = [
  { key: 'songleader', label: 'Songleader' },
  { key: 'backup', label: 'Backup' },
  { key: 'keys', label: 'Keys' },
  { key: 'guitar', label: 'Guitar' },
  { key: 'bass', label: 'Bass' },
  { key: 'drums', label: 'Drums' },
  { key: 'media', label: 'Media' },
  { key: 'tambourines', label: 'Tambourines' },
];

export const MembersAdmin: React.FC<MembersAdminProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetToCleanAdmin,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [capabilities, setCapabilities] = useState<MemberCapability[]>(['backup']);
  const [instrument, setInstrument] = useState('Vocals');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  // Edit member modal state (Admin-only role change)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editCapabilities, setEditCapabilities] = useState<MemberCapability[]>([]);
  const [editInstrument, setEditInstrument] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditCapabilities([...user.capabilities]);
    setEditInstrument(user.instrument || 'Vocals');
    setEditPassword(user.password || DEFAULT_PASSWORD);
  };

  const handleEditCapabilityToggle = (cap: MemberCapability) => {
    if (editCapabilities.includes(cap)) {
      if (editCapabilities.length === 1) return;
      setEditCapabilities(editCapabilities.filter((c) => c !== cap));
    } else {
      setEditCapabilities([...editCapabilities, cap]);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFullName.trim() || !editUsername.trim()) return;

    onUpdateUser({
      ...editingUser,
      fullName: editFullName.trim(),
      username: editUsername.trim().toLowerCase(),
      role: editRole,
      capabilities: editCapabilities,
      instrument: editInstrument,
      password: editPassword,
    });

    setEditingUser(null);
  };

  // Batch import state
  const [batchText, setBatchText] = useState('');
  const [batchCapability, setBatchCapability] = useState<MemberCapability>('backup');
  const [batchInstrument, setBatchInstrument] = useState('Vocals');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (val: string) => {
    setFullName(val);
    const suggested = val.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.');
    setUsername(suggested);
  };

  const handleCapabilityToggle = (cap: MemberCapability) => {
    if (capabilities.includes(cap)) {
      if (capabilities.length === 1) return;
      setCapabilities(capabilities.filter((c) => c !== cap));
    } else {
      setCapabilities([...capabilities, cap]);
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;

    onAddUser({
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      password: DEFAULT_PASSWORD,
      role,
      capabilities,
      instrument,
      points: 0,
      absentCount: 0,
      active: true,
    });

    setIsAddModalOpen(false);
    setFullName('');
    setUsername('');
    setCapabilities(['backup']);
  };

  const handleBatchImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const existingUsernames = new Set(users.map((u) => u.username.toLowerCase()));

    lines.forEach((nameLine) => {
      let cleanName = nameLine.replace(/^\d+[\.\)\-]\s*/, '').trim();
      if (!cleanName) return;

      let genUsername = cleanName.toLowerCase().replace(/[^a-z0-9\s\.]/g, '').replace(/\s+/g, '.');
      if (!genUsername.includes('.')) {
        genUsername = `${genUsername}.member`;
      }

      if (existingUsernames.has(genUsername)) {
        genUsername = `${genUsername}${Math.floor(Math.random() * 100)}`;
      }
      existingUsernames.add(genUsername);

      onAddUser({
        fullName: cleanName,
        username: genUsername,
        password: DEFAULT_PASSWORD,
        role: 'member',
        capabilities: [batchCapability],
        instrument: batchInstrument,
        points: 0,
        absentCount: 0,
        active: true,
      });
    });

    setBatchText('');
    setIsBatchModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBatchText((prev) => (prev ? prev + '\n' + content : content));
      }
    };
    reader.readAsText(file);
  };

  const handleCopyCredentials = (u: User) => {
    const text = `COG Worship Team Login:\nName: ${u.fullName}\nUsername: ${u.username}\nDefault Password: ${u.password || DEFAULT_PASSWORD}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyAllCredentials = () => {
    const text = [
      `=== COG WORSHIP TEAM LOGIN ROSTER ===`,
      `Default Password for all members: ${DEFAULT_PASSWORD}`,
      `Login URL: Worship Team Web App`,
      ``,
      ...users.map(
        (u, i) => `${i + 1}. ${u.fullName} -> Username: "${u.username}" | Roles: ${u.capabilities.join(', ')}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-zinc-100">
      {/* Header */}
      <div className="bg-zinc-900 rounded-2xl border border-amber-500/30 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Admin Roster Control
          </span>
          <h2 className="text-2xl font-black text-zinc-100 mt-2">
            Worship Team Members Directory
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Only authorized members added here can sign in. Default password is <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-amber-400 font-mono">{DEFAULT_PASSWORD}</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetToCleanAdmin && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all roster data and reset to only the initial Admin account?')) {
                  onResetToCleanAdmin();
                }
              }}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-950 text-rose-300 border border-rose-900/50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Clear all members and reset to initial clean Admin"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Reset to Admin Only
            </button>
          )}

          <button
            onClick={handleCopyAllCredentials}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Copy all usernames and default password for church chat"
          >
            {copiedAll ? (
              <CheckCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-amber-400" />
            )}
            {copiedAll ? 'Copied All to Clipboard!' : 'Copy All Logins'}
          </button>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Import Names List
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Single Member
          </button>
        </div>
      </div>

      {/* Roster Table with Absent Counts */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Team Directory ({users.length} Registered Servants)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950 text-[11px] font-bold text-amber-400/90 uppercase tracking-wider border-b border-zinc-800">
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Username & Password</th>
                <th className="py-3 px-4">Ministry Roles</th>
                <th className="py-3 px-4">Points</th>
                <th className="py-3 px-4">Absences</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-zinc-100 flex items-center gap-2">
                      <span>{user.fullName}</span>
                      {user.role === 'admin' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-mono text-zinc-300">
                      <span className="text-amber-400">@{user.username}</span>
                      <span className="text-[11px] text-zinc-500 block">
                        Pass: {user.password || DEFAULT_PASSWORD}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {user.capabilities.map((c) => (
                        <span
                          key={c}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${
                            c === 'songleader'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : c === 'backup'
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-800/40'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-black text-amber-400">
                    {user.points} pts
                  </td>

                  <td className="py-3.5 px-4">
                    {user.absentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900/50">
                        <UserX className="w-3 h-3 text-rose-400" />
                        {user.absentCount}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">0</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onUpdateUser({ ...user, active: !user.active })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                        user.active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {user.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        title="Change Person or Admin Roles"
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        <span>Edit Roles</span>
                      </button>

                      <button
                        onClick={() => handleCopyCredentials(user)}
                        title="Copy Login Details for Member"
                        className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
                      >
                        {copiedId === user.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {user.username !== 'admin' && (
                        <button
                          onClick={() => setMemberToDelete(user)}
                          title="Remove Member"
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/30 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 flex-shrink-0 bg-zinc-950">
              <div className="flex items-center gap-2 text-amber-400">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-lg font-bold">Add Worship Team Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ciara Nono, Jana Perez, Kish Santos"
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Username (Auto-suggested) *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Ministry Roles / Capabilities *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {AVAILABLE_CAPABILITIES.map((cap) => (
                    <button
                      key={cap.key}
                      type="button"
                      onClick={() => handleCapabilityToggle(cap.key)}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                        capabilities.includes(cap.key)
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cap.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Primary Instrument / Vocal Note
                </label>
                <input
                  type="text"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  placeholder="e.g. Lead Vocals, Acoustic Guitar, Keys"
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Account Type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="member">Regular Worship Member</option>
                  <option value="admin">Administrator / Worship Leader</option>
                </select>
              </div>

              <div className="sticky bottom-0 bg-zinc-900 pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/30 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 flex-shrink-0 bg-zinc-950">
              <div className="flex items-center gap-2 text-amber-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-lg font-bold">Import Names List</h3>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchImport} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <p className="text-xs text-zinc-400">
                Paste names from your roster file (one name per line, e.g. <span className="text-amber-400 font-semibold">Ciara Nono</span>). Usernames like <span className="font-mono text-amber-400 font-semibold">ciara.nono</span> and default password <span className="font-mono text-amber-400 font-semibold">{DEFAULT_PASSWORD}</span> will be auto-generated.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Names List (One per line)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Upload .txt / .csv
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder={`Ciara Nono\nJana Perez\nKish Santos\nRandy Flores\nMark Santos\nGrace Reyes`}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Default Role for Imported Members
                </label>
                <select
                  value={batchCapability}
                  onChange={(e) => setBatchCapability(e.target.value as MemberCapability)}
                  className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="songleader">Songleader</option>
                  <option value="backup">Backup Singer</option>
                  <option value="keys">Keys</option>
                  <option value="guitar">Guitar</option>
                  <option value="bass">Bass</option>
                  <option value="drums">Drums</option>
                  <option value="media">Media</option>
                  <option value="tambourines">Tambourines</option>
                </select>
              </div>

              <div className="sticky bottom-0 bg-zinc-900 pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Import All Members
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin-Only Edit Member & Roles Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/40 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 flex-shrink-0 bg-zinc-950">
              <div className="flex items-center gap-2 text-amber-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-lg font-bold">Edit Member & Ministry Roles</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <p className="text-xs text-zinc-400">
                Admin control: Modify assigned ministry capabilities, instrument parts, or change administrator privileges.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase())}
                  className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">
                  Assigned Ministry Roles / Capabilities *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {AVAILABLE_CAPABILITIES.map((cap) => (
                    <button
                      key={cap.key}
                      type="button"
                      onClick={() => handleEditCapabilityToggle(cap.key)}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                        editCapabilities.includes(cap.key)
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {cap.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Primary Instrument / Vocal Note
                </label>
                <input
                  type="text"
                  value={editInstrument}
                  onChange={(e) => setEditInstrument(e.target.value)}
                  placeholder="e.g. Lead Vocals, Acoustic Guitar, Keys"
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Account Access Type
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="member">Regular Member (Read, Setlist & Swap only)</option>
                  <option value="admin">Administrator / Worship Leader (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sticky bottom-0 bg-zinc-900 pt-3 pb-1 border-t border-zinc-800 flex items-center justify-end gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Role Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-rose-500/40 max-w-md w-full overflow-hidden text-zinc-100">
            <div className="bg-zinc-950 p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-bold">Confirm Member Removal</h3>
              </div>
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to remove <strong className="text-white font-bold">{memberToDelete.fullName}</strong> (<span className="text-amber-400 font-mono">@{memberToDelete.username}</span>) from the worship ministry directory?
              </p>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
                <p className="font-semibold text-rose-400 mb-0.5">⚠️ Irreversible Action</p>
                <p className="text-zinc-300">
                  This will delete their member login and access from both the portal and cloud database.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteUser(memberToDelete.id);
                    setMemberToDelete(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Yes, Remove Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

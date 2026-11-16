'use client';

import React, { useState } from 'react';
import { SundaySchedule, SongItem, Lineup } from '@/lib/types';
import { X, Plus, Trash2, ExternalLink, Music, Save, Sparkles } from 'lucide-react';

interface LineupModalProps {
  schedule: SundaySchedule;
  isOpen: boolean;
  onClose: () => void;
  onSave: (lineup: Lineup) => void;
  isEditable: boolean;
}

export const LineupModal: React.FC<LineupModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSave,
  isEditable,
}) => {
  const existingLineup = schedule.lineup;

  const [notes, setNotes] = useState(existingLineup?.notes || '');
  const [songs, setSongs] = useState<SongItem[]>(
    existingLineup?.songs && existingLineup.songs.length > 0
      ? existingLineup.songs
      : [
          {
            id: 'song-' + Date.now(),
            title: '',
            notes: '',
            link: '',
          },
        ]
  );

  if (!isOpen) return null;

  const handleAddSong = () => {
    setSongs([
      ...songs,
      {
        id: 'song-' + Date.now(),
        title: '',
        notes: '',
        link: '',
      },
    ]);
  };

  const handleRemoveSong = (index: number) => {
    if (songs.length === 1) {
      setSongs([{ id: 'song-' + Date.now(), title: '', notes: '', link: '' }]);
      return;
    }
    setSongs(songs.filter((_, i) => i !== index));
  };

  const handleSongChange = (index: number, field: keyof SongItem, val: string) => {
    const updated = [...songs];
    updated[index] = { ...updated[index], [field]: val };
    setSongs(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validSongs = songs.filter((s) => s.title.trim().length > 0);
    const updatedLineup: Lineup = {
      id: existingLineup?.id || `lineup-${schedule.id}`,
      scheduleId: schedule.id,
      notes,
      songs: validSongs,
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedLineup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-amber-500/30 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Header: Dark Gray with Dark Yellow / Amber accents */}
        <div className="bg-zinc-950 px-6 py-4 border-b border-amber-500/20 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Music className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-amber-400 tracking-tight">Song Lineup & Setlist</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Service: <span className="text-zinc-200 font-semibold">{schedule.title || schedule.date}</span> • Songleader: <span className="text-amber-300 font-semibold">{schedule.songleaderName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Header Notice */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Songs List ({songs.filter((s) => s.title.trim()).length} added)
            </span>
            {isEditable && (
              <button
                type="button"
                onClick={handleAddSong}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Song
              </button>
            )}
          </div>

          {/* Clean Easy Song Fields */}
          <div className="space-y-3">
            {songs.map((song, index) => (
              <div
                key={song.id || index}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 hover:border-amber-500/30 transition-all space-y-3"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400">Song #{index + 1}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {song.link && (
                      <a
                        href={song.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Test Link
                      </a>
                    )}
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSong(index)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title="Remove Song"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Song Title (Required) */}
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300/90 mb-1">
                    Song Title *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditable}
                    required
                    value={song.title}
                    onChange={(e) => handleSongChange(index, 'title', e.target.value)}
                    placeholder="e.g. Goodness of God, Way Maker, Gratitude..."
                    className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-100 placeholder-zinc-500 font-medium"
                  />
                </div>

                {/* 2. Song Link (Optional) & 3. Notes (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Song Link (Optional: YouTube, Chords, Audio)
                    </label>
                    <input
                      type="url"
                      disabled={!isEditable}
                      value={song.link || ''}
                      onChange={(e) => handleSongChange(index, 'link', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-100 placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Notes (Optional: Key, Tempo, Repeat, Arrangement)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={song.notes || ''}
                      onChange={(e) => handleSongChange(index, 'notes', e.target.value)}
                      placeholder="e.g. Key of G, repeat bridge 2x, fade on drums"
                      className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-100 placeholder-zinc-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* General Team Note (Optional) */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              General Service Note (Optional)
            </label>
            <input
              type="text"
              disabled={!isEditable}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Saturday Practice 4:00 PM. Sunday Soundcheck 8:00 AM."
              className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-100 placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-zinc-400">
            {isEditable
              ? 'Changes will be saved and visible to the whole worship team.'
              : 'Viewing setlist in read-only mode.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
            {isEditable && (
              <button
                type="button"
                onClick={handleFormSubmit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Setlist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

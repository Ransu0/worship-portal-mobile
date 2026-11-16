import { User, SundaySchedule, SundayAssignment } from './types';

// Helper to get all Sundays in a given YYYY-MM
export function getSundaysInMonth(year: number, monthIndex: number): string[] {
  const sundays: string[] = [];
  const date = new Date(year, monthIndex, 1);

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 0) {
      // 0 is Sunday
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      sundays.push(`${yearStr}-${monthStr}-${dayStr}`);
    }
    date.setDate(date.getDate() + 1);
  }

  return sundays;
}

// Get Saturday date before a given Sunday date string (YYYY-MM-DD)
export function getSaturdayBefore(sundayDateStr: string): string {
  const sunday = new Date(sundayDateStr + 'T12:00:00');
  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() - 1);
  const y = saturday.getFullYear();
  const m = String(saturday.getMonth() + 1).padStart(2, '0');
  const d = String(saturday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Fisher-Yates array shuffle
export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generate Sunday schedules for a single target month (YYYY-MM) with strict rotation:
 * 1. Songleader: ONLY members with 'songleader' role. If N songleaders served in previous month,
 *    they are excluded / placed at the end so unselected songleaders are rotated.
 * 2. Backup: Shuffled strictly from 'backup' role (Songleaders are NOT shuffled into backup, only available for replacement).
 * 3. Instruments: Guitar, Bass, Drums, Keys shuffled from their respective roles.
 * 4. Tambourines: NO shuffle! ALL active tambourine members are scheduled on every Sunday.
 * 5. Practice: Saturday 4:00 PM; Sunday Service: 8:30 AM.
 */
export function generateMonthSchedule(
  year: number,
  monthIndex: number, // 0 = Jan, 11 = Dec
  users: User[],
  existingSchedules: SundaySchedule[] = []
): SundaySchedule[] {
  const sundays = getSundaysInMonth(year, monthIndex);
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  const activeUsers = users.filter((u) => u.active);

  // Filter capability pools
  const songleaders = activeUsers.filter((u) => u.capabilities.includes('songleader'));
  const backups = activeUsers.filter((u) => u.capabilities.includes('backup'));
  const guitarists = activeUsers.filter((u) => u.capabilities.includes('guitar'));
  const bassists = activeUsers.filter((u) => u.capabilities.includes('bass'));
  const drummers = activeUsers.filter((u) => u.capabilities.includes('drums'));
  const keyboardists = activeUsers.filter((u) => u.capabilities.includes('keys'));
  const mediaTeam = activeUsers.filter((u) => u.capabilities.includes('media'));
  const tambourinists = activeUsers.filter((u) => u.capabilities.includes('tambourines'));

  if (songleaders.length === 0) {
    throw new Error('Please add active members with the Songleader role in the Members directory before generating the schedule.');
  }

  // --- Songleader Rotation Logic Across Months ---
  // Determine previous month's key
  const prevDate = new Date(year, monthIndex - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Find which songleaders served in the previous month
  const prevMonthSchedules = existingSchedules.filter((s) => s.month === prevMonthKey);
  const recentlyServedSongleaderIds = new Set(prevMonthSchedules.map((s) => s.songleaderId));

  // Split into fresh (not served last month) and recently served
  const freshSongleaders = songleaders.filter((u) => !recentlyServedSongleaderIds.has(u.id));
  const fallbackSongleaders = songleaders.filter((u) => recentlyServedSongleaderIds.has(u.id));

  // Build the prioritized rotation queue: fresh first, then fallback
  let songleaderQueue: User[] = [
    ...shuffleArray(freshSongleaders),
    ...shuffleArray(fallbackSongleaders),
  ];
  if (songleaderQueue.length === 0) {
    songleaderQueue = shuffleArray(songleaders);
  }

  // Shuffled pools for other roles
  let backupPool = shuffleArray(backups);
  let guitarPool = shuffleArray(guitarists);
  let bassPool = shuffleArray(bassists);
  let drumPool = shuffleArray(drummers);
  let keysPool = shuffleArray(keyboardists);
  let mediaPool = shuffleArray(mediaTeam);

  let slIdx = 0;
  let buIdx = 0;
  let gtrIdx = 0;
  let basIdx = 0;
  let drmIdx = 0;
  let keyIdx = 0;
  let medIdx = 0;

  const newSchedules: SundaySchedule[] = [];

  for (const dateStr of sundays) {
    // Check if schedule for this date already exists
    const existing = existingSchedules.find((s) => s.date === dateStr);
    if (existing) {
      newSchedules.push(existing);
      continue;
    }

    const practiceDate = getSaturdayBefore(dateStr);

    // 1. Songleader
    if (slIdx >= songleaderQueue.length) {
      // Loop over if all songleaders were used
      songleaderQueue = shuffleArray(songleaders);
      slIdx = 0;
    }
    const songleader = songleaderQueue[slIdx++];

    const assignments: SundayAssignment[] = [
      {
        userId: songleader.id,
        userName: songleader.fullName,
        role: 'songleader',
        instrument: 'Lead Vocals',
        status: 'assigned',
        history: [],
      },
    ];

    // Track assigned users on this Sunday so someone isn't assigned 2 roles simultaneously
    const assignedUserIds = new Set<string>([songleader.id]);

    // 2. Backup Vocalists (Assign 2 backups, strictly from backup role)
    const availableBackups = backupPool.filter((u) => !assignedUserIds.has(u.id));
    const targetBackupsCount = Math.min(2, availableBackups.length);

    for (let i = 0; i < targetBackupsCount; i++) {
      if (buIdx >= backupPool.length) {
        backupPool = shuffleArray(backups);
        buIdx = 0;
      }
      const bUser = backupPool[buIdx++];
      if (!assignedUserIds.has(bUser.id)) {
        assignedUserIds.add(bUser.id);
        assignments.push({
          userId: bUser.id,
          userName: bUser.fullName,
          role: 'backup',
          instrument: 'Backing Vocals',
          status: 'assigned',
          history: [],
        });
      }
    }

    // 3. Keys
    const availKeys = keysPool.filter((u) => !assignedUserIds.has(u.id));
    if (availKeys.length > 0) {
      if (keyIdx >= keysPool.length) {
        keysPool = shuffleArray(keyboardists);
        keyIdx = 0;
      }
      const kUser = keysPool[keyIdx++];
      if (!assignedUserIds.has(kUser.id)) {
        assignedUserIds.add(kUser.id);
        assignments.push({
          userId: kUser.id,
          userName: kUser.fullName,
          role: 'keys',
          instrument: 'Keys / Piano',
          status: 'assigned',
          history: [],
        });
      }
    }

    // 4. Guitar
    const availGtr = guitarPool.filter((u) => !assignedUserIds.has(u.id));
    if (availGtr.length > 0) {
      if (gtrIdx >= guitarPool.length) {
        guitarPool = shuffleArray(guitarists);
        gtrIdx = 0;
      }
      const gUser = guitarPool[gtrIdx++];
      if (!assignedUserIds.has(gUser.id)) {
        assignedUserIds.add(gUser.id);
        assignments.push({
          userId: gUser.id,
          userName: gUser.fullName,
          role: 'guitar',
          instrument: 'Acoustic / Electric Guitar',
          status: 'assigned',
          history: [],
        });
      }
    }

    // 5. Bass
    const availBas = bassPool.filter((u) => !assignedUserIds.has(u.id));
    if (availBas.length > 0) {
      if (basIdx >= bassPool.length) {
        bassPool = shuffleArray(bassists);
        basIdx = 0;
      }
      const bUser = bassPool[basIdx++];
      if (!assignedUserIds.has(bUser.id)) {
        assignedUserIds.add(bUser.id);
        assignments.push({
          userId: bUser.id,
          userName: bUser.fullName,
          role: 'bass',
          instrument: 'Bass Guitar',
          status: 'assigned',
          history: [],
        });
      }
    }

    // 6. Drums
    const availDrm = drumPool.filter((u) => !assignedUserIds.has(u.id));
    if (availDrm.length > 0) {
      if (drmIdx >= drumPool.length) {
        drumPool = shuffleArray(drummers);
        drmIdx = 0;
      }
      const dUser = drumPool[drmIdx++];
      if (!assignedUserIds.has(dUser.id)) {
        assignedUserIds.add(dUser.id);
        assignments.push({
          userId: dUser.id,
          userName: dUser.fullName,
          role: 'drums',
          instrument: 'Drums',
          status: 'assigned',
          history: [],
        });
      }
    }

    // 7. Media (shuffled like other roles)
    const availMed = mediaPool.filter((u) => !assignedUserIds.has(u.id));
    if (availMed.length > 0) {
      if (medIdx >= mediaPool.length) {
        mediaPool = shuffleArray(mediaTeam);
        medIdx = 0;
      }
      const mUser = mediaPool[medIdx++];
      if (!assignedUserIds.has(mUser.id)) {
        assignedUserIds.add(mUser.id);
        assignments.push({
          userId: mUser.id,
          userName: mUser.fullName,
          role: 'media',
          instrument: 'Media / Visuals',
          status: 'assigned',
          history: [],
        });
      }
    }

    // 8. Tambourines (NO SHUFFLE: ALWAYS SHOW ALL ACTIVE TAMBOURINE MEMBERS)
    tambourinists.forEach((tUser) => {
      // Tambourines are all listed every Sunday
      assignments.push({
        userId: tUser.id,
        userName: tUser.fullName,
        role: 'tambourines',
        instrument: 'Tambourine',
        status: 'assigned',
        history: [],
      });
    });

    const sundayDateObj = new Date(dateStr + 'T10:00:00');
    const formattedTitle = `Sunday Worship Service - ${sundayDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;

    newSchedules.push({
      id: `sched-${dateStr}`,
      date: dateStr,
      practiceDate,
      practiceTime: '4:00 PM',
      worshipTime: '8:30 AM',
      month: monthKey,
      title: formattedTitle,
      songleaderId: songleader.id,
      songleaderName: songleader.fullName,
      assignments,
      status: 'upcoming',
      isCompleted: false,
    });
  }

  return newSchedules;
}

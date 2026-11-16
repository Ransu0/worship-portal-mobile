'use client';

import React, { useEffect, useState } from 'react';
import LegacyHome from '@/components/LegacyHome';
import MobileApp from '@/components/mobile/MobileApp';
import { seedDemoIfNeeded } from '@/lib/demo';

/**
 * Phones (and the installed app) get the new mobile design.
 * Desktop keeps the current layout, unchanged.
 * Force either one for testing with ?view=mobile or ?view=desktop.
 */
export default function Home() {
  const [mode, setMode] = useState<'loading' | 'mobile' | 'desktop'>('loading');

  useEffect(() => {
    seedDemoIfNeeded();
    const force = new URLSearchParams(window.location.search).get('view');
    const mq = window.matchMedia('(max-width: 767px), (display-mode: standalone)');
    const pick = () => setMode(force === 'mobile' ? 'mobile' : force === 'desktop' ? 'desktop' : mq.matches ? 'mobile' : 'desktop');
    pick();
    mq.addEventListener('change', pick);
    return () => mq.removeEventListener('change', pick);
  }, []);

  if (mode === 'loading') return null;
  return mode === 'mobile' ? <MobileApp /> : <LegacyHome />;
}

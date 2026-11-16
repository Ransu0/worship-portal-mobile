import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'COG Worship Team',
    short_name: 'Worship Team',
    description: 'Practices, schedules and song lineups for the COG worship team.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F5F1',
    theme_color: '#2B2D80',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

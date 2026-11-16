import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { readSubs, writeSubs } from '@/lib/pushStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Item = { userId: string; ttl: number; payload: Record<string, unknown> };

export async function POST(req: Request) {
  // Test run only: open while running locally (npm run dev). Anywhere else it needs the secret header.
  const secret = process.env.PUSH_TEST_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || req.headers.get('x-push-secret') !== secret)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID keys missing in .env.local' }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:worship-team@example.com', pub, priv);

  const { items } = (await req.json()) as { items: Item[] };
  let subs = await readSubs();
  let sent = 0;
  const noSubscription: string[] = [];
  const gone = new Set<string>();
  for (const it of items || []) {
    const mine = subs.filter((s) => s.userId === it.userId);
    if (!mine.length) { noSubscription.push(it.userId); continue; }
    for (const s of mine) {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify(it.payload), { TTL: Math.max(0, Math.floor(it.ttl || 0)), urgency: 'high' });
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.add(s.endpoint); // phone unsubscribed or app removed
      }
    }
  }
  if (gone.size) { subs = subs.filter((s) => !gone.has(s.endpoint)); await writeSubs(subs); }
  return NextResponse.json({ sent, noSubscription });
}

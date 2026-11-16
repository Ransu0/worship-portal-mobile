import { NextResponse } from 'next/server';
import { readSubs, writeSubs } from '@/lib/pushStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { userId, subscription } = await req.json();
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
  }
  const subs = (await readSubs()).filter((s) => s.endpoint !== subscription.endpoint);
  subs.push({ userId: String(userId), endpoint: subscription.endpoint, subscription, createdAt: new Date().toISOString() });
  await writeSubs(subs);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json();
  await writeSubs((await readSubs()).filter((s) => s.endpoint !== endpoint));
  return NextResponse.json({ ok: true });
}

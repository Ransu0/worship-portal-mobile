// Test-run storage for push subscriptions: a JSON file in .data/ (git-ignored).
// For a real deployment, move this to a Supabase table (see README-TEST.md).
import { promises as fs } from 'fs';
import path from 'path';

export type StoredSub = { userId: string; endpoint: string; subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; createdAt: string };

const FILE = path.join(process.cwd(), '.data', 'push-subscriptions.json');

export async function readSubs(): Promise<StoredSub[]> {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return []; }
}
export async function writeSubs(subs: StoredSub[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(subs, null, 2));
}

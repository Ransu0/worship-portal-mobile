// Daily reminders for the COG Worship Team (Web Push → iPhone/Android home-screen web app).
//
// Call it as often as you like (pg_cron + GitHub Actions both call it). It only sends when
// a reminder is due, and never sends the same reminder twice (reminder_log):
//   Sun 3:00 PM  "Can you serve?"            (first ask, for next Sunday)
//   Mon 3:00 PM  "2 days left"               (only people who haven't replied)
//   Tue 3:00 PM  "1 day left"
//   Wed 9:00 AM  "Reply ends today 3:00 PM"
// After Wed 3:00 PM nothing is sent. Times are Philippine time (UTC+8).
//
// Query params (optional): ?dry=1 → don't send, just report.  ?at=2026-11-22T15:30 → pretend it's this PH time.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ROLE: Record<string, string> = {
  songleader: "Song leader", backup: "Backup", guitar: "Guitar", bass: "Bass",
  drums: "Drums", keys: "Keys", media: "Media", tambourines: "Tambourine",
};

type Kind = "first" | "2days" | "1day" | "today";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "1";
    const at = url.searchParams.get("at");

    // "PH clock": a Date whose UTC fields are Philippine local time.
    const ph = at ? new Date(at + "Z") : new Date(Date.now() + 8 * 3600_000);
    const dow = ph.getUTCDay(); // 0 = Sunday
    const hour = ph.getUTCHours();

    let kind: Kind | null = null;
    if (dow === 0 && hour >= 15) kind = "first";
    else if (dow === 1 && hour >= 15) kind = "2days";
    else if (dow === 2 && hour >= 15) kind = "1day";
    else if (dow === 3 && hour >= 9 && hour < 15) kind = "today";
    if (!kind) return json({ sent: 0, reason: "No reminder due right now", phTime: ph.toISOString().slice(0, 16) });

    const daysToSunday = (7 - dow) % 7 || 7; // on a Sunday, ask about NEXT Sunday
    const sun = new Date(Date.UTC(ph.getUTCFullYear(), ph.getUTCMonth(), ph.getUTCDate() + daysToSunday));
    const sunday = sun.toISOString().slice(0, 10);
    const wed = new Date(sun.getTime() - 4 * 86400_000);
    const replyBy = `Wed, ${MON[wed.getUTCMonth()]} ${wed.getUTCDate()} · 3:00 PM`;

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sched, error: se } = await db.from("worship_schedules").select("*").eq("date", sunday).maybeSingle();
    if (se) throw se;
    if (!sched || sched.is_completed) return json({ sent: 0, reason: `No schedule for ${sunday}`, kind });

    // Who still needs to answer: status "assigned" (not confirmed, not absent).
    const waiting = (sched.assignments as Array<Record<string, unknown>>).filter((a) => a.status === "assigned");
    if (!waiting.length) return json({ sent: 0, reason: "Everyone has replied", kind, sunday });

    const ids = waiting.map((a) => String(a.userId));
    const { data: already } = await db.from("reminder_log").select("user_id").eq("schedule_id", sched.id).eq("kind", kind).in("user_id", ids);
    const done = new Set((already ?? []).map((r) => r.user_id as string));
    const todo = waiting.filter((a) => !done.has(String(a.userId)));
    if (!todo.length) return json({ sent: 0, reason: "Already sent", kind, sunday });

    const { data: subs, error: pe } = await db.from("push_subscriptions").select("*").in("user_id", todo.map((a) => String(a.userId)));
    if (pe) throw pe;

    const { data: secrets } = await db.from("app_secrets").select("key,value");
    const sec = Object.fromEntries((secrets ?? []).map((r) => [r.key, r.value]));
    webpush.setVapidDetails(sec.vapid_subject, sec.vapid_public, sec.vapid_private);

    const dLbl = `${MON[sun.getUTCMonth()]} ${sun.getUTCDate()}`;
    const time = sched.worship_time || "8:30 AM";
    const bodyFor: Record<Kind, string> = {
      first: `${time} · Can you serve?\nReply by ${replyBy}`,
      "2days": `2 days left to reply · Can you serve?\nReply by ${replyBy}`,
      "1day": `1 day left to reply · Can you serve?\nReply by ${replyBy}`,
      today: `Reply ends today at 3:00 PM · Can you serve?`,
    };

    const report: Array<Record<string, unknown>> = [];
    let sent = 0;
    for (const a of todo) {
      const uid = String(a.userId);
      const mine = (subs ?? []).filter((s) => s.user_id === uid);
      const payload = JSON.stringify({
        title: `Sun, ${dLbl} · ${ROLE[String(a.role)] ?? a.role}`,
        body: bodyFor[kind],
        scheduleId: sched.id,
        url: `./?reply=open&s=${encodeURIComponent(sched.id)}`,
      });
      let delivered = 0;
      if (!dry) {
        for (const s of mine) {
          try {
            await webpush.sendNotification(s.subscription, payload, { TTL: 24 * 3600, urgency: "high" });
            delivered++;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            report.push({ user: a.userName, error: String((e as Error).message ?? e), code });
          }
        }
        // Log even with no device, so a member who turns reminders on later isn't spammed with old ones.
        await db.from("reminder_log").upsert({ schedule_id: sched.id, user_id: uid, kind });
      }
      sent += delivered;
      report.push({ user: a.userName, role: a.role, devices: mine.length, delivered });
    }
    return json({ kind, sunday, dry, sent, people: todo.length, report });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

# COG Worship Team Portal — mobile test app

Lowrence's own test copy of the worship team portal with the new mobile design.
It runs on sample data in the browser (no Supabase), so it can't touch the real team's data.

- **Phones:** new design (light theme, bottom menu, team cards, weekly reminders).
- **Desktop:** the original layout.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/?view=mobile (`?view=mobile` forces the phone design on a computer).
`.env.local` holds the test settings and is not pushed to GitHub.

## Test accounts

Password for all: `cogvet`

| Username | Role |
|---|---|
| `admin` | Admin (Sign out is at the bottom of Team) |
| `lowrence` | Member on guitar, on this Sunday's team |
| `kish`, `joy`, `faith` | Song leaders |
| `paolo`, `carlo`, `mark`, `randy`, `ben`, `ciara`, `bea`, `rica`, `ella`, `sam`, `mia` | Members |

Fresh sample data: F12 → Application → Storage → Clear site data, then reload.

## Vercel settings

Environment variables: `NEXT_PUBLIC_DEMO=1`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
Don't add the Supabase keys — that would switch it to the real database.

## Before going live

- Passwords are plain text and the Supabase tables are open. Move to Supabase Auth with row-level security.
- Saves overwrite whole tables; save one change at a time.
- The automatic Sunday 3 PM reminder needs subscriptions stored in Supabase (the test keeps them in a local file).

# Worship Team (Flutter app)

The COG Worship Team app for phones: Sunday team, songs, schedule, points, and weekly reminders.

## Download

**Get the newest version:** https://github.com/Ransu0/worship-portal-mobile/releases/latest/download/worship-team.apk

This link always gives the latest release. All versions and what changed in each: https://github.com/Ransu0/worship-portal-mobile/releases

## iPhone (web app)

iPhone members use the same app in Safari, installed to the Home Screen. It's free and has no time limit.

1. Open the web app link in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Worship Team** from the Home Screen, sign in, and tap **Turn on reminders**. Needs iOS 16.4 or newer.

The web app is built and deployed by GitHub Actions (job `web`) when the repo has a `VERCEL_TOKEN` secret.
Without it, the build is still saved under **Artifacts** as `worship-team-web`.

## Reminders

| Day | Who gets it |
|---|---|
| Sun 3:00 PM | Everyone on next Sunday's team who hasn't replied |
| Mon 3:00 PM | Only people who still haven't replied ("2 days left") |
| Tue 3:00 PM | Only people who still haven't replied ("1 day left") |
| Wed 9:00 AM | Only people who still haven't replied ("ends today at 3:00 PM") |

Replying, or being covered by someone, stops the rest. Nothing is sent after Wednesday 3:00 PM.

- **Android app:** the phone plans these itself (local notifications) with **Yes** / **Can't serve** buttons.
- **iPhone / browser:** sent by the Supabase function `supabase/functions/daily-reminders`. A job inside Supabase calls it every hour, and it only sends what's due, never twice. Tapping the notification opens the "Can you serve?" card.
- `.github/workflows/keepalive.yml` calls the function twice a day so the free Supabase project never pauses.

## Versions (automatic)

You only commit and push. Every push to `main` builds a signed APK and releases the next version on its own:

`v1.0.0 → v1.1.0 → v1.2.0 → …`

Add one of these anywhere in a commit message to change that:

| In the commit message | What happens | Example |
|---|---|---|
| *(nothing)* | Next minor version | v1.2.0 → v1.3.0 |
| `[patch]` | Small fix | v1.3.0 → v1.3.1 |
| `[major]` | Big change | v1.3.1 → v2.0.0 |
| `[skip release]` | Build only, no new version | — |

```bash
git add .
git commit -m "Grey out done Sundays"
git push
```

The release notes are your commit messages since the last version. The app shows its version at the bottom of the **Me** and **Team** pages, e.g. `Worship Team v1.3.0 · build 21`.
Nothing is committed back to `main` by GitHub, so `git push` never gets rejected.
(`version:` in `pubspec.yaml` is only used for local `flutter run`.)

## Automatic builds (GitHub Actions)

`.github/workflows/build-apk.yml`:

- **Push to `main`**: checks the code, runs the tests, builds the signed APK and publishes the next version on the **Releases** page. The web app is built and deployed too.
- **Pull request**: checks, tests and builds, without releasing.
- **Actions → Build APK → Run workflow**: runs it on demand.

### Signing

Every APK is signed with the same key, so new versions install over old ones. Releases refuse to build without the key.
The key is in `D:\Downloads\worship team portal\signing-key` (**not** in this repo). `KEEP-THIS-SAFE.txt` in that folder lists the four GitHub secrets:
`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS` (repo **Settings → Secrets and variables → Actions**).
Back that folder up. Without the key you can't publish updates that install over the current app.

## Run on your phone (development)

```bash
flutter pub get
flutter run
```

## Accounts

New members sign in with the default password `cogvet`. The admin adds members from the Team tab.

## Where things are

- `lib/config.dart`: Supabase URL and key, app version
- `lib/app_ctl.dart`: app state and every action (confirm, swap, points, shuffle…)
- `lib/shuffle.dart`: the monthly rotation rules and team size per role
- `lib/notify.dart`: Android reminders
- `lib/webpush/`, `web/push-sw.js`: iPhone / browser reminders
- `supabase/functions/daily-reminders/`: the reminder sender (already deployed)
- `lib/screens/`: the screens
- `lib/ui/`: colours, icons, animations and shared widgets

## Before real use

- Passwords are plain text and the tables are open to anyone with the key. Move logins to Supabase Auth with row-level security.
- This repo is private, so only people with access to it can use the download links. To share with the whole team, make the repo public or send the APK file directly.

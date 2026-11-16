# Worship Team (Flutter app)

The COG Worship Team app for phones: Sunday team, songs, schedule, points, and weekly reminders.

## Download

<!-- latest-release:start -->
**Latest release: v1.0.0** (Nov 16, 2026)

- Download the app: https://github.com/Ransu0/worship-portal-mobile/releases/latest/download/worship-team.apk
- Release notes: https://github.com/Ransu0/worship-portal-mobile/releases/tag/v1.0.0
- All releases: https://github.com/Ransu0/worship-portal-mobile/releases
<!-- latest-release:end -->

This section updates itself every time a new version is released. The download link above always gives the newest version.

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

## Versions

The version number is in `pubspec.yaml`, e.g. `version: 1.0.0+1`. Only the part before `+` matters; GitHub adds the build number.

| Change | Example | When |
|---|---|---|
| Patch | 1.0.0 → 1.0.1 | Bug fixes |
| Minor | 1.0.1 → 1.1.0 | New features |
| Major | 1.1.0 → 2.0.0 | Big changes |

**To release a new version:**

1. Change `version:` in `pubspec.yaml`, e.g. `version: 1.0.1+1`.
2. Add what changed to `CHANGELOG.md`.
3. Commit, tag and push:
   ```bash
   git add .
   git commit -m "Release v1.0.1"
   git tag v1.0.1
   git push
   git push origin v1.0.1
   ```

GitHub then builds a signed APK, publishes it on the Releases page and updates the **Download** section above.
The tag must match `pubspec.yaml`, or the build stops with a message telling you so.

The app shows its version at the bottom of the **Me** page and the **Team** page, e.g. `Worship Team v1.0.0 · build 14`.

## Automatic builds (GitHub Actions)

`.github/workflows/build-apk.yml`:

- **Push to `main` or a pull request**: checks the code, runs the tests and builds a test APK. Download it from the run page under **Artifacts**. It's kept 30 days.
- **Push a tag `vX.Y.Z`**: builds the release, publishes it and updates this README.
- **Actions → Build APK → Run workflow**: builds on demand.

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

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

## Reminders

Members turn them on from Home or the Me tab. The phone reminds them the Sunday before each Sunday they serve, at about 3:00 PM, with **Yes** and **Can't serve** buttons. Replies close Wednesday at 3:00 PM.
On Realme, Oppo or Xiaomi phones: Settings → Battery → Worship Team → allow background activity, or reminders can be late.

## Where things are

- `lib/config.dart`: Supabase URL and key, app version
- `lib/app_ctl.dart`: app state and every action (confirm, swap, points, shuffle…)
- `lib/shuffle.dart`: the monthly rotation rules and team size per role
- `lib/notify.dart`: weekly reminders
- `lib/screens/`: the screens
- `lib/ui/`: colours, icons, animations and shared widgets

## Before real use

- Passwords are plain text and the tables are open to anyone with the key. Move logins to Supabase Auth with row-level security.
- This repo is private, so only people with access to it can use the download links. To share with the whole team, make the repo public or send the APK file directly.

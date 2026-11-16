# Worship Team (Flutter app)

The COG Worship Team app for phones: Sunday team, songs, schedule, points, and weekly reminders.
It uses the same Supabase tables as the web portal (`worship_users`, `worship_schedules`, `worship_point_logs`), so the app and the website can be used together.

## Run on your phone

```bash
flutter pub get
dart run flutter_launcher_icons
flutter run
```

Plug in the phone with USB debugging on. `flutter run` installs the app and opens it.

## Build an APK to share

```bash
flutter build apk --release
```

The file is at `build/app/outputs/flutter-apk/app-release.apk`. Send it to members. They'll need to allow installing apps from unknown sources.

## Automatic builds (GitHub Actions)

`.github/workflows/build-apk.yml` runs on GitHub every time you push:

- **Push to `main` or open a pull request** → checks the code, runs the tests, builds the APK. Download it from the run page under **Artifacts** (kept 30 days).
- **Push a tag like `v1.0.0`** → also publishes the APK on the repo's **Releases** page, which is the easiest link to send members:
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```
- **Actions tab → Build APK → Run workflow** → build on demand.

### Signing key (do this before sharing APKs)

Without it, every GitHub build is signed with a different throwaway key, so members can't install a new version over the old one (they'd have to uninstall first).

1. Make the key once, and keep `upload-keystore.jks` somewhere safe **outside** the project folder:
   ```bash
   "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Turn it into text:
   ```bash
   powershell -command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('upload-keystore.jks'))" > keystore.b64
   ```
3. On GitHub: repo **Settings → Secrets and variables → Actions → New repository secret**, add four:
   - `KEYSTORE_BASE64`: everything inside `keystore.b64`
   - `KEYSTORE_PASSWORD`: the keystore password you typed
   - `KEY_PASSWORD`: the key password (same as above if you pressed Enter)
   - `KEY_ALIAS`: `upload`
4. Delete `keystore.b64`. The next build is signed with your key, and every build after it can update the previous one.

## Accounts

The database starts with one account: `admin` / `cogvet`. Add members from the Team tab. New members also sign in with `cogvet`.

## Reminders

Each member turns them on from Home or the Me tab. The phone then schedules a reminder for every Sunday that member is on the team: sent the Sunday before at about 3:00 PM, with **Yes** and **Can't serve** buttons. Replies close Wednesday at 3:00 PM.
On Realme, Oppo or Xiaomi phones: Settings → Battery → Worship Team → allow background activity, or reminders can be late.

## Where things are

- `lib/config.dart`: Supabase URL and key
- `lib/app_ctl.dart`: app state and every action (confirm, swap, points, shuffle…)
- `lib/shuffle.dart`: the monthly rotation rules
- `lib/notify.dart`: weekly reminders
- `lib/screens/`: the screens
- `lib/ui/`: colours, icons and shared widgets (copied from the web redesign)

## Before real use

- Passwords are plain text and the tables are open to anyone with the key. Move logins to Supabase Auth with row-level security.
- Set up the signing key (above) before sharing APKs or using the Play Store.

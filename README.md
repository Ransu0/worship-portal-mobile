# Worship Team

A phone app for the COG Worship Team. Members use it to see who serves each Sunday, check the songs, confirm or swap their part, and keep track of points. The admin uses it to make the monthly schedule and look after the team.

It replaces a desktop-first web portal with something built for phones. Every action is a tap or two, Sundays come with reminders, and replies happen inside the app instead of in group chats.

| | |
|---|---|
| **Android** | Installable app (APK) from GitHub Releases |
| **iPhone** | The same app as a website, added to the Home Screen |
| **Backend** | Supabase (database, live updates, reminder sender) |
| **Built with** | Flutter (one codebase for Android and the web) |

---

## Download

### Android app

**Latest version:** https://github.com/Ransu0/worship-portal-mobile/releases/latest/download/worship-team.apk

This link always points to the newest release. To see every version and its changes, go to [Releases](https://github.com/Ransu0/worship-portal-mobile/releases).

1. Open the link on the phone and download the APK.
2. If Android asks, allow installs from your browser.
3. Open **Worship Team**, sign in, and turn on reminders.

Updates install over the old version, and you stay signed in.

### iPhone (website)

**Web app:** `https://cog-worship-team.vercel.app/`. Add this once the first web deploy has run. The address is in the Vercel dashboard and at the end of the **Deploy to Vercel** step in GitHub Actions.

1. Open the link in **Safari**. Other browsers can't install it.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Worship Team** from the Home Screen, sign in, and tap **Turn on reminders**.

Reminders need iOS 16.4 or newer, and the app must be opened from the Home Screen icon. The website is free with no time limit, so nobody needs a paid Apple developer account.

---

## What it does

**Members**
- See this Sunday at a glance: date, practice time, your part, the team, and the songs.
- Answer with **I'll be there** or **Can't serve**. If you can't serve, pick who covers you, or say no one.
- See your next Sundays, your points, and the leaderboard.

**Song leaders**
- Add songs with key, notes, and links. The team gets Listen and Chords buttons for each song.

**Admin**
- Fill a whole month with **Auto-shuffle**, then replace people, mark absences, or remove a spot.
- See the team status for this Sunday: swap requests first, then people who haven't replied, then absences, then confirmed.
- Mark a Sunday as done. Only members who confirmed get +10.
- Add or remove points with a reason. Manage members, import names, and set how many of each part a Sunday needs.

**Everyone**
- Four looks:

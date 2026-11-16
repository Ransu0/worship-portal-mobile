// Weekly reminders as local notifications (free, no server needed).
// Each member's phone schedules its own reminder for every Sunday they're on:
// sent the Sunday before at 3:00 PM, with Yes / Can't serve buttons.
// Uses flutter_local_notifications 19.x (positional API).
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'helpers.dart';
import 'models.dart';

class Notify {
  static final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  /// Called with (actionId, scheduleId). actionId is 'yes', 'no' or 'open' (tapped).
  static void Function(String actionId, String scheduleId)? onResponse;

  /// Set when the app was opened by tapping a notification.
  static NotificationResponse? launchResponse;

  static bool _ready = false;

  static Future<void> init() async {
    try {
      tzdata.initializeTimeZones();
      tz.setLocalLocation(tz.getLocation('Asia/Manila'));
      const settings = InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher'));
      await _plugin.initialize(settings, onDidReceiveNotificationResponse: _handle);
      final launch = await _plugin.getNotificationAppLaunchDetails();
      if (launch != null && launch.didNotificationLaunchApp) launchResponse = launch.notificationResponse;
      _ready = true;
    } catch (e) {
      debugPrint('Notifications unavailable: $e');
    }
  }

  static void _handle(NotificationResponse r) {
    final sid = r.payload;
    if (sid == null || sid.isEmpty) return;
    final a = r.actionId;
    onResponse?.call(a == null || a.isEmpty ? 'open' : a, sid);
  }

  static Future<bool> requestPermission() async {
    if (!_ready) return false;
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return true;
    final ok = await android.requestNotificationsPermission();
    return ok ?? true;
  }

  static NotificationDetails _details(String body, {bool ask = true}) => NotificationDetails(
        android: AndroidNotificationDetails(
          'weekly_reminder',
          'Weekly reminder',
          channelDescription: 'Sunday afternoon reminder to confirm your part',
          importance: Importance.high,
          priority: Priority.high,
          color: const Color(0xFF2B2D80),
          styleInformation: BigTextStyleInformation(body),
          actions: ask
              ? const <AndroidNotificationAction>[
                  AndroidNotificationAction('yes', 'Yes', showsUserInterface: true),
                  AndroidNotificationAction('no', "Can't serve", showsUserInterface: true),
                ]
              : null,
        ),
      );

  static int _idFor(String date) => int.tryParse(date.replaceAll('-', '')) ?? date.hashCode & 0x7fffffff;

  static String _title(Schedule s, Assignment a) => 'Sun, ${dLbl(s.date)} · ${roleLabel[a.role]}';
  static String _askBody(Schedule s) => '${s.worshipTime} · Can you serve?\nReply by ${replyByLabel(s.date)}';

  /// Re-plans every reminder for this member. Safe to call often.
  static Future<void> scheduleFor(AppUser me, List<Schedule> schedules) async {
    if (!_ready) return;
    await _plugin.cancelAll();
    final now = DateTime.now();
    for (final s in schedules) {
      if (s.isCompleted || s.date.compareTo(todayStr()) < 0) continue;
      final mine = findMine(s, me.id);
      if (mine == null || mine.covered || statusOf(mine.a) != StatusKind.wait) continue;
      final w = replyWindow(s.date);
      if (!w.sendAt.isAfter(now)) continue; // window already open: the in-app card asks instead
      try {
        await _plugin.zonedSchedule(
          _idFor(s.date),
          _title(s, mine.a),
          _askBody(s),
          tz.TZDateTime.from(w.sendAt, tz.local),
          _details(_askBody(s)),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          payload: s.id,
        );
      } catch (e) {
        debugPrint('Could not schedule reminder for ${s.date}: $e');
      }
    }
  }

  static Future<void> cancelAll() async {
    if (_ready) await _plugin.cancelAll();
  }

  /// Admin test: shows this Sunday's reminder on this phone right away.
  static Future<bool> showTest(Schedule s) async {
    if (!_ready) return false;
    final a = s.assignments.isNotEmpty ? s.assignments.first : null;
    final title = a == null ? 'Sun, ${dLbl(s.date)}' : _title(s, a);
    await _plugin.show(1, title, _askBody(s), _details(_askBody(s)), payload: s.id);
    return true;
  }
}

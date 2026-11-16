{{flutter_js}}
{{flutter_build_config}}

// Load the app without Flutter's own offline service worker, so web/push-sw.js
// (reminders) is the only service worker on this site.
_flutter.loader.load();

// Web Push bridge. On the web it talks to window.wtPush (web/index.html);
// on Android/iOS builds it's a stub that does nothing.
export 'webpush_stub.dart' if (dart.library.js_interop) 'webpush_web.dart';

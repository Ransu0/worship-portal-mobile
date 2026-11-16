import 'dart:js_interop';

@JS('wtPush.supported')
external JSBoolean _supported();

@JS('wtPush.standalone')
external JSBoolean _standalone();

@JS('wtPush.isIOS')
external JSBoolean _isIOS();

@JS('wtPush.permission')
external JSString _permission();

@JS('wtPush.subscribe')
external JSPromise<JSString> _subscribe(JSString vapidKey);

@JS('wtPush.unsubscribe')
external JSPromise<JSString> _unsubscribe();

@JS('wtPush.clearQuery')
external void _clearQuery();

@JS('wtPush.hideSplash')
external void _hideSplash();

class WebPush {
  static bool get supported {
    try {
      return _supported().toDart;
    } catch (_) {
      return false;
    }
  }

  static bool get standalone {
    try {
      return _standalone().toDart;
    } catch (_) {
      return false;
    }
  }

  static bool get isIOS {
    try {
      return _isIOS().toDart;
    } catch (_) {
      return false;
    }
  }

  static String get permission {
    try {
      return _permission().toDart;
    } catch (_) {
      return 'unsupported';
    }
  }

  /// Asks for permission and subscribes. Call straight from a tap. Returns the subscription JSON or null.
  static Future<String?> subscribe(String vapidKey) async {
    try {
      final s = (await _subscribe(vapidKey.toJS).toDart).toDart;
      return s.isEmpty ? null : s;
    } catch (_) {
      return null;
    }
  }

  /// Returns the endpoint that was removed, or null.
  static Future<String?> unsubscribe() async {
    try {
      final s = (await _unsubscribe().toDart).toDart;
      return s.isEmpty ? null : s;
    } catch (_) {
      return null;
    }
  }

  static void clearQuery() {
    try {
      _clearQuery();
    } catch (_) {}
  }

  static void hideSplash() {
    try {
      _hideSplash();
    } catch (_) {}
  }
}

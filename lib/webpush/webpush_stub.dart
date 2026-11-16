class WebPush {
  static bool get supported => false;
  static bool get standalone => false;
  static bool get isIOS => false;
  static String get permission => 'unsupported';
  static Future<String?> subscribe(String vapidKey) async => null;
  static Future<String?> unsubscribe() async => null;
  static void clearQuery() {}
  static void hideSplash() {}
}

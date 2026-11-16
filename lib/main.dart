import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'app_ctl.dart';
import 'config.dart';
import 'notify.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  await Notify.init();
  final app = AppCtl();
  runApp(WorshipApp(app: app));
  await app.start();
}

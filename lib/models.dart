// Data models. JSON keys inside `assignments` and `lineup` match the web app
// exactly (camelCase), so the website and this app can share one database.

String _day(Object? v) {
  final s = (v ?? '').toString();
  return s.length >= 10 ? s.substring(0, 10) : s;
}

enum Cap { songleader, backup, guitar, bass, drums, keys, media, tambourines }

Cap? capFrom(String? s) {
  for (final c in Cap.values) {
    if (c.name == s) return c;
  }
  return null;
}

class AppUser {
  final String id;
  String username;
  String fullName;
  String password;
  String role; // 'admin' | 'member'
  List<Cap> capabilities;
  String instrument;
  int points;
  int absentCount;
  bool active;

  AppUser({
    required this.id,
    required this.username,
    required this.fullName,
    required this.password,
    required this.role,
    required this.capabilities,
    required this.instrument,
    required this.points,
    required this.absentCount,
    required this.active,
  });

  bool get isAdmin => role == 'admin';

  AppUser copy() => AppUser(
        id: id,
        username: username,
        fullName: fullName,
        password: password,
        role: role,
        capabilities: List.of(capabilities),
        instrument: instrument,
        points: points,
        absentCount: absentCount,
        active: active,
      );

  factory AppUser.fromRow(Map<String, dynamic> r) => AppUser(
        id: r['id'] as String,
        username: (r['username'] ?? '') as String,
        fullName: (r['full_name'] ?? '') as String,
        password: (r['password'] ?? 'cogvet') as String,
        role: (r['role'] ?? 'member') as String,
        capabilities: ((r['capabilities'] as List?) ?? const [])
            .map((e) => capFrom(e as String?))
            .whereType<Cap>()
            .toList(),
        instrument: (r['instrument'] ?? 'Vocals') as String,
        points: (r['points'] as num?)?.toInt() ?? 0,
        absentCount: (r['absent_count'] as num?)?.toInt() ?? 0,
        active: r['active'] == null ? true : r['active'] == true,
      );

  Map<String, dynamic> toRow() => {
        'id': id,
        'username': username.toLowerCase().trim(),
        'full_name': fullName.trim(),
        'password': password.isEmpty ? 'cogvet' : password,
        'role': role,
        'capabilities': capabilities.map((c) => c.name).toList(),
        'instrument': instrument,
        'points': points,
        'absent_count': absentCount,
        'active': active,
      };
}

class HistoryStep {
  final String userId;
  final String userName;
  final String type; // 'swap' | 'absent'
  final String? reason;
  final String? replacedAt;

  HistoryStep({required this.userId, required this.userName, required this.type, this.reason, this.replacedAt});

  factory HistoryStep.fromJson(Map<String, dynamic> j) => HistoryStep(
        userId: (j['userId'] ?? '') as String,
        userName: (j['userName'] ?? '') as String,
        type: (j['type'] ?? 'swap') as String,
        reason: j['reason'] as String?,
        replacedAt: j['replacedAt'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'userName': userName,
        'type': type,
        if (reason != null) 'reason': reason,
        if (replacedAt != null) 'replacedAt': replacedAt,
      };
}

class Assignment {
  String userId;
  String userName;
  Cap role;
  String? instrument;
  String status; // 'assigned' | 'confirmed' | 'absent' | 'attended'
  String? notes;
  List<HistoryStep> history;

  Assignment({
    required this.userId,
    required this.userName,
    required this.role,
    this.instrument,
    required this.status,
    this.notes,
    List<HistoryStep>? history,
  }) : history = history ?? [];

  factory Assignment.fromJson(Map<String, dynamic> j) => Assignment(
        userId: (j['userId'] ?? '') as String,
        userName: (j['userName'] ?? '') as String,
        role: capFrom(j['role'] as String?) ?? Cap.backup,
        instrument: j['instrument'] as String?,
        status: (j['status'] ?? 'assigned') as String,
        notes: j['notes'] as String?,
        history: ((j['history'] as List?) ?? const [])
            .map((e) => HistoryStep.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'userName': userName,
        'role': role.name,
        if (instrument != null) 'instrument': instrument,
        'status': status,
        if (notes != null) 'notes': notes,
        'history': history.map((h) => h.toJson()).toList(),
      };
}

class Song {
  final String id;
  String title;
  String key;
  String notes;
  String link;

  Song({required this.id, this.title = '', this.key = '', this.notes = '', this.link = ''});

  factory Song.fromJson(Map<String, dynamic> j) => Song(
        id: (j['id'] ?? '') as String,
        title: (j['title'] ?? '') as String,
        key: (j['key'] ?? '') as String,
        notes: (j['notes'] ?? '') as String,
        link: (j['link'] ?? '') as String,
      );

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'key': key, 'notes': notes, 'link': link};

  Song copy() => Song(id: id, title: title, key: key, notes: notes, link: link);
}

class Lineup {
  final String id;
  final String scheduleId;
  List<Song> songs;
  String notes;
  String updatedAt;

  Lineup({required this.id, required this.scheduleId, required this.songs, this.notes = '', required this.updatedAt});

  factory Lineup.fromJson(Map<String, dynamic> j) => Lineup(
        id: (j['id'] ?? '') as String,
        scheduleId: (j['scheduleId'] ?? '') as String,
        songs: ((j['songs'] as List?) ?? const [])
            .map((e) => Song.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        notes: (j['notes'] ?? '') as String,
        updatedAt: (j['updatedAt'] ?? '') as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'scheduleId': scheduleId,
        'songs': songs.map((s) => s.toJson()).toList(),
        'notes': notes,
        'updatedAt': updatedAt,
      };
}

class Schedule {
  final String id;
  String date; // YYYY-MM-DD (Sunday)
  String practiceDate; // YYYY-MM-DD (Saturday)
  String practiceTime;
  String worshipTime;
  String month; // YYYY-MM
  String title;
  String songleaderId;
  String songleaderName;
  List<Assignment> assignments;
  Lineup? lineup;
  bool isCompleted;
  String status;

  Schedule({
    required this.id,
    required this.date,
    required this.practiceDate,
    this.practiceTime = '4:00 PM',
    this.worshipTime = '8:30 AM',
    required this.month,
    this.title = '',
    required this.songleaderId,
    required this.songleaderName,
    required this.assignments,
    this.lineup,
    this.isCompleted = false,
    this.status = 'upcoming',
  });

  factory Schedule.fromRow(Map<String, dynamic> r) => Schedule(
        id: r['id'] as String,
        date: _day(r['date']),
        practiceDate: _day(r['practice_date']),
        practiceTime: (r['practice_time'] ?? '4:00 PM') as String,
        worshipTime: (r['worship_time'] ?? '8:30 AM') as String,
        month: (r['month'] ?? '') as String,
        title: (r['title'] ?? '') as String,
        songleaderId: (r['songleader_id'] ?? '') as String,
        songleaderName: (r['songleader_name'] ?? '') as String,
        assignments: ((r['assignments'] as List?) ?? const [])
            .map((e) => Assignment.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        lineup: r['lineup'] is Map ? Lineup.fromJson(Map<String, dynamic>.from(r['lineup'] as Map)) : null,
        isCompleted: r['is_completed'] == true,
        status: (r['status'] ?? 'upcoming') as String,
      );

  Map<String, dynamic> toRow() => {
        'id': id,
        'date': date,
        'practice_date': practiceDate,
        'practice_time': practiceTime,
        'worship_time': worshipTime,
        'month': month,
        'title': title,
        'songleader_id': songleaderId,
        'songleader_name': songleaderName,
        'assignments': assignments.map((a) => a.toJson()).toList(),
        'lineup': lineup?.toJson(),
        'is_completed': isCompleted,
        'status': status,
      };

  Schedule copy() => Schedule.fromRow(toRow());
}

class PointLog {
  final String id;
  final String userId;
  final String userName;
  final int points;
  final String reason;
  final String date;
  final String adminName;
  final String type;

  PointLog({
    required this.id,
    required this.userId,
    required this.userName,
    required this.points,
    required this.reason,
    required this.date,
    this.adminName = 'Admin',
    this.type = 'attendance',
  });

  factory PointLog.fromRow(Map<String, dynamic> r) => PointLog(
        id: r['id'] as String,
        userId: (r['user_id'] ?? '') as String,
        userName: (r['user_name'] ?? '') as String,
        points: (r['points'] as num?)?.toInt() ?? 0,
        reason: (r['reason'] ?? '') as String,
        date: _day(r['date']),
        adminName: (r['admin_name'] ?? 'Admin') as String,
        type: (r['type'] ?? 'attendance') as String,
      );

  Map<String, dynamic> toRow() => {
        'id': id,
        'user_id': userId,
        'user_name': userName,
        'points': points,
        'reason': reason,
        'date': date,
        'admin_name': adminName,
        'type': type,
      };
}

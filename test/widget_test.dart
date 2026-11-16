import 'package:flutter_test/flutter_test.dart';
import 'package:worship_team_app/helpers.dart';

void main() {
  test('reply window closes Wednesday 3 PM before the Sunday', () {
    final w = replyWindow('2026-11-22');
    expect(w.sendAt, DateTime(2026, 11, 15, 15));
    expect(w.replyBy, DateTime(2026, 11, 18, 15));
    expect(replyByLabel('2026-11-22'), 'Wed, Nov 18 · 3:00 PM');
  });

  test('month helpers', () {
    expect(addMonth('2026-12', 1), '2027-01');
    expect(monthName('2026-11'), 'November 2026');
    expect(sundaysCount(2026, 10), 5); // November 2026
  });
}

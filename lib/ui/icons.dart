// The exact icon paths from the web app (ui.tsx), drawn with flutter_svg.
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../models.dart';

const _p = <String, String>{
  'home': 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  'schedule': 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
  'points':
      'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2Z',
  'team': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 0 1-8 0a4 4 0 0 1 8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  'me': 'M17 8a5 5 0 0 1-10 0a5 5 0 0 1 10 0 M20 21a8 8 0 0 0-16 0',
  'back': 'M19 12H5 M12 19l-7-7 7-7',
  'chev': 'm9 18 6-6-6-6',
  'chevL': 'm15 18-6-6 6-6',
  'check': 'M20 6 9 17l-5-5',
  'wait': 'M12 7v5l3 2',
  'x': 'M18 6 6 18 M6 6l12 12',
  'clock': 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M12 6v6l4 2',
  'music': 'M9 18V5l12-2v13 M9 18a3 3 0 0 1-6 0a3 3 0 0 1 6 0 M21 16a3 3 0 0 1-6 0a3 3 0 0 1 6 0',
  'plus': 'M12 5v14 M5 12h14',
  'edit': 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  'search': 'M19 11a8 8 0 0 1-16 0a8 8 0 0 1 16 0 M21 21l-4.35-4.35',
  'info': 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M12 16v-4 M12 8h.01',
  'alert': 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M12 8v4 M12 16h.01',
  'logout': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  'rotate': 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
  'shuffle': 'M16 3h5v5 M4 20 21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5',
  'trash': 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
  'copy': 'M9 9h11v11H9z M5 15H4V4h11v1',
  'upload': 'M12 15V3 M7 8l5-5 5 5 M5 21h14',
  'userplus': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 0 1-8 0a4 4 0 0 1 8 0 M19 8v6 M22 11h-6',
  'bell': 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  'shield': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'done': 'M22 12a10 10 0 0 1-20 0a10 10 0 0 1 20 0 M16 9l-5.5 6L8 12.5',
  'mic': 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3',
  'keys': 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M7 5v8 M12 5v8 M17 5v8 M7 13v6 M12 13v6 M17 13v6',
  'monitor': 'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 21h8 M12 17v4',

  // ── Instrument / role icons ──
  // Lucide (ISC): mic-vocal, guitar, drum, piano, projector.
  // IconOven (MIT): tambourine.
  // Circles/ellipses are converted to arc paths so they fit the single-path renderer.
  'micVocal':
      'm11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12 '
      'M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5 '
      'M11 7a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
  'guitar':
      'm11.9 12.1 4.514-4.514 '
      'M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z '
      'M6 16l2 2 '
      'M8.2 9.9C8.7 8.8 9.8 8 11 8c2.8 0 5 2.2 5 5 0 1.2-.8 2.3-1.9 2.8l-.9.4A2 2 0 0 0 12 18a4 4 0 0 1-4 4c-3.3 0-6-2.7-6-6a4 4 0 0 1 4-4 2 2 0 0 0 1.8-1.2z '
      'M11.5 12.5h.01',
  // Custom electric bass (offset body, long neck, 2+2 tuning pegs) drawn to match Lucide.
  'bass':
      'M12.3 10.7 11.6 8.6Q11.2 7.8 10.4 8.4C9.3 9.3 9.4 10.9 8.3 11.6C6.6 12.6 3.2 12.9 2.5 16'
      'C1.9 18.7 5.4 22 8.1 21.4C11.1 20.7 11.4 17.4 12.4 15.7C13.1 14.6 14.6 14.8 15.6 13.6'
      'Q16.2 12.8 15.4 12.4L13.3 11.7Z '
      'M12.8 11.2 18.8 5.2 '
      'M18 4l2 2 2-2.8-1.2-1.2z '
      'M18.4 2.9l-.8-.8 M20.1 1.9 19.4 1.1 M21.1 5.6l.8.8 M22 3.9l.8.8 '
      'M5.5 17.4l2 2 M8.5 14.8l1.6 1.6',
  'drum':
      'm2 2 8 8 M22 2l-8 8 '
      'M2 9a10 5 0 1 0 20 0a10 5 0 1 0-20 0 '
      'M7 13.4v7.9 M12 14v8 M17 13.4v7.9 '
      'M2 9v8a10 5 0 0 0 20 0V9',
  'piano':
      'M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8 '
      'M2 14h20 M6 14v4 M10 14v4 M14 14v4 M18 14v4',
  'projector':
      'M5 7 3 5 M9 6V3 M13 7l2-2 '
      'M6 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0 '
      'M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17 '
      'M16 16h2',
  'tambourine':
      'M2.75 12a9.25 9.25 0 1 0 18.5 0a9.25 9.25 0 1 0-18.5 0 '
      'M7.5 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0 '
      'm11 2.48-1.1 1.91 m-4.3 2.49h-2.2 m-4.3-2.49-1.1-1.91 m0-4.96 1.1-1.91 m4.3-2.49h2.2 m4.3 2.49 1.1 1.91',
};

const roleIcon = <Cap, String>{
  Cap.songleader: 'micVocal',
  Cap.backup: 'mic',
  Cap.guitar: 'guitar',
  Cap.bass: 'bass',
  Cap.drums: 'drum',
  Cap.keys: 'piano',
  Cap.media: 'projector',
  Cap.tambourines: 'tambourine',
};

final _cache = <String, String>{};

class Ic extends StatelessWidget {
  final String n;
  final double s;
  final Color? c;
  final double w;
  const Ic(this.n, {super.key, this.s = 20, this.c, this.w = 2.2});

  @override
  Widget build(BuildContext context) {
    final color = c ?? DefaultTextStyle.of(context).style.color ?? Colors.black;
    final key = '$n|$w';
    final svg = _cache[key] ??=
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="$w" '
        'stroke-linecap="round" stroke-linejoin="round"><path d="${_p[n] ?? ''}"/></svg>';
    return SvgPicture.string(svg, width: s, height: s, colorFilter: ColorFilter.mode(color, BlendMode.srcIn));
  }
}

class PlayIc extends StatelessWidget {
  final Color color;
  const PlayIc({super.key, required this.color});
  @override
  Widget build(BuildContext context) => SvgPicture.string(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000"><path d="M6 3l14 9-14 9z"/></svg>',
        width: 16,
        height: 16,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      );
}

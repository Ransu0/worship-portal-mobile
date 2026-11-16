import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_ctl.dart';
import '../helpers.dart';
import '../models.dart';
import '../ui/icons.dart';
import '../ui/theme.dart';
import '../ui/widgets.dart';

Future<void> _open(String url) async {
  final uri = Uri.tryParse(url.startsWith('http') ? url : 'https://$url');
  if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
}

class SongsScreen extends StatelessWidget {
  final AppCtl app;
  const SongsScreen({super.key, required this.app});

  @override
  Widget build(BuildContext context) {
    final s = app.sel;
    if (s == null) return const SizedBox.shrink();
    final songs = s.lineup?.songs ?? const <Song>[];
    final edit = app.canEditSongs(s);
    final note = s.lineup?.notes ?? '';
    return Frame(
      header: BackHeader(
        title: 'Songs',
        sub: '${dLbl(s.date)} · led by ${s.songleaderName}',
        onBack: app.back,
        right: edit ? IconBtn(icon: 'edit', size: 18, bg: C.chip, fg: C.navy, label: 'Edit songs', onTap: () => app.go(Screen.editsongs, sel: s.id)) : null,
      ),
      gap: 16,
      children: [
        if (note.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(color: C.waitBg, borderRadius: BorderRadius.circular(16)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Note from the song leader', style: tx(14, w700, C.warnTxt)),
              const SizedBox(height: 2),
              Text(note, style: tx(15, FontWeight.w400, C.noteText, 1.5)),
            ]),
          ),
        if (songs.isEmpty)
          EmptyCard(
            title: 'No songs yet',
            sub: '${s.songleaderName} will add them.',
            action: edit ? Btn('Add songs', md: true, onTap: () => app.go(Screen.editsongs, sel: s.id)) : null,
          )
        else
          for (final x in songs) _SongCard(x: x),
      ],
    );
  }
}

class _SongCard extends StatelessWidget {
  final Song x;
  const _SongCard({required this.x});
  @override
  Widget build(BuildContext context) {
    final listen = x.link.isNotEmpty ? x.link : 'https://www.youtube.com/results?search_query=${Uri.encodeQueryComponent('${x.title} worship')}';
    final chords = 'https://www.google.com/search?q=${Uri.encodeQueryComponent('${x.title} chords')}';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: C.surface, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: Text(x.title.isEmpty ? 'Untitled' : x.title, style: tx(18, w800))),
          const SizedBox(width: 14),
          KeyBadge(x.key, big: true),
        ]),
        if (x.notes.isNotEmpty) ...[const SizedBox(height: 8), Text(x.notes, style: tx(14, FontWeight.w400, C.soft))],
        const SizedBox(height: 14),
        Row(children: [
          Expanded(
            child: Tap(
              onTap: () => _open(listen),
              color: C.badBg,
              radius: BorderRadius.circular(12),
              height: 48,
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                PlayIc(color: C.red),
                const SizedBox(width: 8),
                Text('Listen', style: tx(15, w700, C.red)),
              ]),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Tap(
              onTap: () => _open(chords),
              color: C.chip,
              radius: BorderRadius.circular(12),
              height: 48,
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Ic('music', s: 16, c: C.ink),
                const SizedBox(width: 8),
                Text('Chords', style: tx(15, w700)),
              ]),
            ),
          ),
        ]),
      ]),
    );
  }
}

class EditSongsScreen extends StatefulWidget {
  final AppCtl app;
  const EditSongsScreen({super.key, required this.app});
  @override
  State<EditSongsScreen> createState() => _EditSongsScreenState();
}

class _SongCtl {
  final String id;
  final title = TextEditingController();
  final key = TextEditingController();
  final notes = TextEditingController();
  final link = TextEditingController();
  _SongCtl(this.id);
  factory _SongCtl.from(Song s) {
    final c = _SongCtl(s.id);
    c.title.text = s.title;
    c.key.text = s.key;
    c.notes.text = s.notes;
    c.link.text = s.link;
    return c;
  }
  void dispose() {
    title.dispose();
    key.dispose();
    notes.dispose();
    link.dispose();
  }
}

class _EditSongsScreenState extends State<EditSongsScreen> {
  late final List<_SongCtl> _songs;
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    final s = widget.app.sel!;
    final existing = s.lineup?.songs ?? const <Song>[];
    _songs = existing.isEmpty ? [_SongCtl(newId('song'))] : existing.map(_SongCtl.from).toList();
    _note.text = s.lineup?.notes ?? '';
  }

  @override
  void dispose() {
    for (final c in _songs) {
      c.dispose();
    }
    _note.dispose();
    super.dispose();
  }

  void _save() {
    final app = widget.app;
    final s = app.sel!;
    final songs = _songs
        .where((c) => c.title.text.trim().isNotEmpty)
        .map((c) => Song(id: c.id, title: c.title.text.trim(), key: c.key.text.trim(), notes: c.notes.text.trim(), link: c.link.text.trim()))
        .toList();
    app.saveLineup(
      s,
      Lineup(
        id: s.lineup?.id ?? 'lineup-${s.id}',
        scheduleId: s.id,
        songs: songs,
        notes: _note.text.trim(),
        updatedAt: DateTime.now().toUtc().toIso8601String(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final s = app.sel!;
    return Frame(
      header: BackHeader(title: 'Edit songs', sub: dLbl(s.date), onBack: app.back),
      gap: 14,
      bottom: ActionBar(child: Btn('Save songs', onTap: _save)),
      children: [
        for (var i = 0; i < _songs.length; i++)
          Container(
            key: ValueKey(_songs[i].id),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: C.surface, border: Border.all(color: C.line), borderRadius: BorderRadius.circular(20)),
            child: Column(children: [
              Row(children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(color: C.lav, borderRadius: BorderRadius.circular(14)),
                  child: Center(child: Text('${i + 1}', style: tx(14, w800, C.navy))),
                ),
                const SizedBox(width: 10),
                Expanded(child: Input(controller: _songs[i].title, hint: 'Song title', kind: InputKind.sm, caps: TextCapitalization.words)),
                const SizedBox(width: 10),
                SizedBox(
                  width: 56,
                  child: Input(controller: _songs[i].key, hint: 'Key', kind: InputKind.sm, align: TextAlign.center, style: tx(16, w800, C.navy)),
                ),
              ]),
              const SizedBox(height: 10),
              Input(controller: _songs[i].notes, hint: 'Notes: tempo, repeats, arrangement', kind: InputKind.soft, caps: TextCapitalization.sentences),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: Input(controller: _songs[i].link, hint: 'YouTube or chords link', kind: InputKind.soft, autocorrect: false, keyboard: TextInputType.url)),
                const SizedBox(width: 10),
                IconBtn(
                  icon: 'x',
                  size: 18,
                  w: 2.5,
                  bg: C.badBg,
                  fg: C.red,
                  radius: 12,
                  label: 'Remove song ${i + 1}',
                  onTap: () {
                    final gone = _songs[i];
                    setState(() => _songs.removeAt(i));
                    WidgetsBinding.instance.addPostFrameCallback((_) => gone.dispose());
                  },
                ),
              ]),
            ]),
          ),
        Btn('Add song', icon: 'plus', iconW: 2.5, kind: BtnKind.dash, onTap: () => setState(() => _songs.add(_SongCtl(newId('song'))))),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Field(label: 'Note for the team', child: Input(controller: _note, lines: 3, caps: TextCapitalization.sentences)),
        ),
      ],
    );
  }
}

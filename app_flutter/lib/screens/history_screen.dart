import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  static const routeName = '/history';

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList('history') ?? [];
    setState(() {
      _items = list.map((e) => jsonDecode(e) as Map<String, dynamic>).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historique des certifications')),
      body: _items.isEmpty
          ? const Center(child: Text('Aucune preuve encore'))
          : ListView.builder(
              itemCount: _items.length,
              itemBuilder: (context, i) {
                final item = _items[i];
                final ts = int.tryParse(item['timestamp'].toString()) ?? 0;
                final date = DateFormat.yMd().add_Hms().format(
                      DateTime.fromMillisecondsSinceEpoch(ts * 1000, isUtc: true),
                    );
                return ListTile(
                  title: Text(item['filename'] ?? 'Fichier'),
                  subtitle: Text('${item['hash']}\n$date'),
                  isThreeLine: true,
                );
              },
            ),
    );
  }
}

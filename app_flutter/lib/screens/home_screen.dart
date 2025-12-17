import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'history_screen.dart';
import 'result_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  PlatformFile? _selectedFile;
  bool _loading = false;
  String? _error;

  Future<void> _pickFile() async {
    final res = await FilePicker.platform.pickFiles(withData: true, type: FileType.any);
    if (res != null && res.files.isNotEmpty) {
      setState(() {
        _selectedFile = res.files.first;
      });
    }
  }

  Future<void> _certify() async {
    if (_selectedFile == null) {
      setState(() => _error = 'Sélectionnez un fichier');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'http://localhost:4000');
    const apiKey = String.fromEnvironment('API_KEY', defaultValue: '');
    final uri = Uri.parse('$apiBase/api/certify');
    final request = http.MultipartRequest('POST', uri)
      ..files.add(http.MultipartFile.fromBytes('file', _selectedFile!.bytes!, filename: _selectedFile!.name));
    if (apiKey.isNotEmpty) {
      request.headers['x-api-key'] = apiKey;
    }

    try {
      final streamed = await request.send();
      final resp = await http.Response.fromStream(streamed);
      if (resp.statusCode != 200) {
        setState(() => _error = 'Échec: ${resp.body}');
      } else {
        final data = jsonDecode(resp.body) as Map<String, dynamic>;
        final prefs = await SharedPreferences.getInstance();
        final history = prefs.getStringList('history') ?? [];
        history.add(jsonEncode(data));
        await prefs.setStringList('history', history);
        if (!mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ResultScreen(result: data),
          ),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Évidencia'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => Navigator.pushNamed(context, HistoryScreen.routeName),
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Certifiez vos preuves numériques en un clic.', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: _pickFile,
              child: Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.blueAccent),
                  color: Colors.white.withOpacity(0.04),
                ),
                child: Center(
                  child: _selectedFile == null
                      ? const Text('Importer / Prendre une photo')
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.insert_drive_file, size: 48, color: Colors.blueAccent),
                            Text(_selectedFile!.name),
                            Text('${(_selectedFile!.size / 1024).toStringAsFixed(1)} Ko'),
                          ],
                        ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            if (_error != null)
              Text(
                _error!,
                style: const TextStyle(color: Colors.redAccent),
              ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _loading ? null : _certify,
                icon: _loading
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.verified_user),
                label: Text(_loading ? 'Certification...' : 'Certifier'),
              ),
            )
          ],
        ),
      ),
    );
  }
}

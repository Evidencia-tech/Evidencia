import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key, required this.result});

  final Map<String, dynamic> result;

  @override
  Widget build(BuildContext context) {
    final ts = int.tryParse(result['timestamp'].toString()) ?? 0;
    final date = DateTime.fromMillisecondsSinceEpoch(ts * 1000, isUtc: true);
    return Scaffold(
      appBar: AppBar(title: const Text('Certificat généré')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Hash SHA-256'),
            SelectableText(result['hash'] ?? ''),
            const SizedBox(height: 12),
            const Text('Horodatage (UTC)'),
            Text(DateFormat.yMd().add_Hms().format(date)),
            const SizedBox(height: 12),
            const Text('Lien de vérification'),
          SelectableText(result['uri'] ?? ''),
          const SizedBox(height: 20),
          Center(
            child: QrImageView(
              data: result['uri'] ?? '',
                backgroundColor: Colors.white,
                padding: const EdgeInsets.all(12),
                size: 180,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blueAccent),
                color: Colors.blueAccent.withOpacity(0.1),
              ),
              child: const Text('Badge : Certifié par Évidencia'),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.ios_share),
              label: const Text('Partager le certificat'),
            )
          ],
        ),
      ),
    );
  }
}

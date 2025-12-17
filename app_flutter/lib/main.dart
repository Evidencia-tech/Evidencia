import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/history_screen.dart';

void main() {
  runApp(const EvidenciaApp());
}

class EvidenciaApp extends StatelessWidget {
  const EvidenciaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Évidencia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF2563EB),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.dark,
        ),
        fontFamily: 'Inter',
      ),
      home: const HomeScreen(),
      routes: {
        HistoryScreen.routeName: (_) => const HistoryScreen(),
      },
    );
  }
}

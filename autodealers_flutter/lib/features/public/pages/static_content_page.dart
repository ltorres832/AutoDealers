// Página base para contenido estático (Privacidad, Términos) - Replica Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/public_navbar.dart';

class StaticContentPage extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> sections;
  final Widget? bottomNote;

  const StaticContentPage({
    super.key,
    required this.title,
    this.subtitle,
    required this.sections,
    this.bottomNote,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: PublicNavbar()),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 900),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () => context.go('/'),
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: Row(
                          children: [
                            Icon(Icons.arrow_back, size: 20, color: theme.textTheme.bodyMedium?.color),
                            const SizedBox(width: 8),
                            Text(
                              'Volver al inicio',
                              style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Text(
                      title,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        subtitle!,
                        style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                      ),
                    ],
                    const SizedBox(height: 32),
                    ...sections,
                    if (bottomNote != null) ...[
                      const SizedBox(height: 48),
                      bottomNote!,
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Sección con título y contenido (párrafos y listas)
class ContentSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const ContentSection({super.key, required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class ContentParagraph extends StatelessWidget {
  final String text;

  const ContentParagraph(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        text,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6),
      ),
    );
  }
}

class ContentBulletList extends StatelessWidget {
  final List<String> items;

  const ContentBulletList(this.items, {super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(left: 16, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: items
            .map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '• ',
                        style: theme.textTheme.bodyLarge,
                      ),
                      Expanded(
                        child: Text(
                          e,
                          style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                        ),
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }
}



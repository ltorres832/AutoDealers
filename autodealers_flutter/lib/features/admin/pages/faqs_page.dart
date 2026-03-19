// Página de Gestión de FAQs (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/faqs_provider.dart';

class AdminFAQsPage extends StatelessWidget {
  const AdminFAQsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preguntas Frecuentes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/faqs/create'),
          ),
        ],
      ),
      body: Consumer<FAQsProvider>(
        builder: (context, faqsProvider, _) {
          if (faqsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (faqsProvider.faqs.isEmpty) {
            return const Center(child: Text('No hay FAQs'));
          }

          return ListView.builder(
            itemCount: faqsProvider.faqs.length,
            itemBuilder: (context, index) {
              final faq = faqsProvider.faqs[index];
              return ExpansionTile(
                title: Text(faq['question'] ?? 'Sin pregunta'),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(faq['answer'] ?? 'Sin respuesta'),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/faqs/${faq['id']}/edit'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () => faqsProvider.deleteFAQ(faq['id'] as String),
                      ),
                    ],
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}



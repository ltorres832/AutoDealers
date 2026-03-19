// Página de Gestión de Testimonios (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/testimonials_provider.dart';

class AdminTestimonialsPage extends StatelessWidget {
  const AdminTestimonialsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Testimonios'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/testimonials/create'),
          ),
        ],
      ),
      body: Consumer<TestimonialsProvider>(
        builder: (context, testimonialsProvider, _) {
          if (testimonialsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (testimonialsProvider.testimonials.isEmpty) {
            return const Center(child: Text('No hay testimonios'));
          }

          return ListView.builder(
            itemCount: testimonialsProvider.testimonials.length,
            itemBuilder: (context, index) {
              final testimonial = testimonialsProvider.testimonials[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: testimonial['photoUrl'] != null
                      ? CircleAvatar(
                          backgroundImage: NetworkImage(testimonial['photoUrl'] as String),
                        )
                      : const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(testimonial['customerName'] ?? 'Sin nombre'),
                  subtitle: Text(testimonial['testimonial'] ?? ''),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/testimonials/${testimonial['id']}/edit'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () => testimonialsProvider.deleteTestimonial(testimonial['id'] as String),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}



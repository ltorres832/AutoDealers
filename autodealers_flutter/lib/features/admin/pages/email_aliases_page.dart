// Página de Gestión de Alias de Email (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/email_aliases_provider.dart';

class AdminEmailAliasesPage extends StatelessWidget {
  const AdminEmailAliasesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alias de Email'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/email-aliases/create'),
          ),
        ],
      ),
      body: Consumer<EmailAliasesProvider>(
        builder: (context, emailAliasesProvider, _) {
          if (emailAliasesProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (emailAliasesProvider.emailAliases.isEmpty) {
            return const Center(child: Text('No hay alias de email'));
          }

          return ListView.builder(
            itemCount: emailAliasesProvider.emailAliases.length,
            itemBuilder: (context, index) {
              final alias = emailAliasesProvider.emailAliases[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: const Icon(Icons.alternate_email),
                  title: Text(alias['alias'] ?? 'Sin alias'),
                  subtitle: Text('Redirige a: ${alias['forwardTo'] ?? 'N/A'}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/email-aliases/${alias['id']}/edit'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () => emailAliasesProvider.deleteEmailAlias(alias['id'] as String),
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



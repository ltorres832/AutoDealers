// Página de Gestión de Emails Corporativos (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/corporate_emails_provider.dart';

class AdminCorporateEmailsPage extends StatelessWidget {
  const AdminCorporateEmailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emails Corporativos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/corporate-emails/create'),
          ),
        ],
      ),
      body: Consumer<CorporateEmailsProvider>(
        builder: (context, corporateEmailsProvider, _) {
          if (corporateEmailsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (corporateEmailsProvider.corporateEmails.isEmpty) {
            return const Center(child: Text('No hay emails corporativos'));
          }

          return ListView.builder(
            itemCount: corporateEmailsProvider.corporateEmails.length,
            itemBuilder: (context, index) {
              final email = corporateEmailsProvider.corporateEmails[index];
              final isActive = email['status'] == 'active';
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: Icon(
                    isActive ? Icons.email : Icons.email_outlined,
                    color: isActive ? Colors.green : Colors.grey,
                  ),
                  title: Text(email['email'] ?? 'Sin email'),
                  subtitle: Text('Estado: ${email['status'] ?? 'unknown'}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!isActive)
                        IconButton(
                          icon: const Icon(Icons.check),
                          onPressed: () => corporateEmailsProvider.activateEmail(email['id'] as String),
                        ),
                      if (isActive)
                        IconButton(
                          icon: const Icon(Icons.pause),
                          onPressed: () => corporateEmailsProvider.suspendEmail(email['id'] as String),
                        ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () => corporateEmailsProvider.deleteEmail(email['id'] as String),
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



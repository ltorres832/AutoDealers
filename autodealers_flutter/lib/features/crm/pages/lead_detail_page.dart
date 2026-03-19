// Página de Detalle de Lead
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/lead.dart';
import '../../dealer/widgets/dealer_drawer.dart';
import '../../seller/widgets/seller_drawer.dart';

class LeadDetailPage extends StatelessWidget {
  final String leadId;

  const LeadDetailPage({super.key, required this.leadId});

  static Future<void> _showAddInteractionDialog(BuildContext context, String leadId, Lead lead) async {
    InteractionType selectedType = InteractionType.note;
    final contentController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Agregar interacción'),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<InteractionType>(
                    value: selectedType,
                    decoration: const InputDecoration(labelText: 'Tipo'),
                    items: InteractionType.values
                        .map((e) => DropdownMenuItem(value: e, child: Text(_interactionTypeLabel(e))))
                        .toList(),
                    onChanged: (v) => selectedType = v ?? InteractionType.note,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: contentController,
                    decoration: const InputDecoration(labelText: 'Contenido *'),
                    maxLines: 3,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  Navigator.pop(ctx, true);
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );

    if (saved != true || !context.mounted) return;
    final userId = context.read<AuthProvider>().user?.id ?? '';
    final interaction = Interaction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: selectedType,
      content: contentController.text.trim(),
      userId: userId,
      createdAt: DateTime.now(),
    );
    final crm = context.read<CrmProvider>();
    final ok = await crm.addInteraction(leadId, interaction);
    if (context.mounted) {
      if (ok) {
        crm.loadLeads();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Interacción agregada')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${crm.error}')));
      }
    }
  }

  static String _interactionTypeLabel(InteractionType t) {
    switch (t) {
      case InteractionType.message: return 'Mensaje';
      case InteractionType.call: return 'Llamada';
      case InteractionType.email: return 'Email';
      case InteractionType.note: return 'Nota';
      case InteractionType.appointment: return 'Cita';
      case InteractionType.task: return 'Tarea';
      case InteractionType.document: return 'Documento';
      case InteractionType.workflow: return 'Workflow';
      default: return t.name;
    }
  }

  static String _editPath(BuildContext context, String leadId) {
    final path = GoRouterState.of(context).uri.path;
    if (path.startsWith('/dealer/')) return '/dealer/leads/$leadId/edit';
    if (path.startsWith('/seller/')) return '/seller/leads/$leadId/edit';
    return '/leads/$leadId/edit';
  }

  @override
  Widget build(BuildContext context) {
    final crmProvider = context.watch<CrmProvider>();
    final lead = crmProvider.leads.firstWhere(
      (l) => l.id == leadId,
      orElse: () => crmProvider.selectedLead!,
    );
    final path = GoRouterState.of(context).uri.path;
    final drawer = path.startsWith('/dealer/')
        ? const DealerDrawer()
        : path.startsWith('/seller/')
            ? const SellerDrawer()
            : null;

    return Scaffold(
      drawer: drawer,
      appBar: AppBar(
        title: Text(lead.contact.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.push(_editPath(context, lead.id)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Información de contacto
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Información de Contacto',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(label: 'Nombre', value: lead.contact.name),
                    if (lead.contact.email != null)
                      _InfoRow(label: 'Email', value: lead.contact.email!),
                    _InfoRow(label: 'Teléfono', value: lead.contact.phone),
                    _InfoRow(label: 'Canal preferido', value: lead.contact.preferredChannel),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Estado y fuente
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Estado',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(label: 'Estado', value: lead.status.name),
                    _InfoRow(label: 'Fuente', value: lead.source.name),
                    if (lead.assignedTo != null)
                      _InfoRow(label: 'Asignado a', value: lead.assignedTo!),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Notas
            if (lead.notes.isNotEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Notas',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(lead.notes),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            // Interacciones
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Interacciones',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    if (lead.interactions.isEmpty)
                      const Text('No hay interacciones')
                    else
                      ...lead.interactions.map((interaction) => ListTile(
                            leading: Icon(_getInteractionIcon(interaction.type)),
                            title: Text(interaction.content),
                            subtitle: Text(
                              '${interaction.createdAt.day}/${interaction.createdAt.month}/${interaction.createdAt.year}',
                            ),
                          )),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Acciones
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showAddInteractionDialog(context, lead.id, lead),
                    icon: const Icon(Icons.add),
                    label: const Text('Agregar Interacción'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Cambiar estado - Implementado en el provider
                    },
                    icon: const Icon(Icons.edit),
                    label: const Text('Cambiar Estado'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _getInteractionIcon(InteractionType type) {
    switch (type) {
      case InteractionType.message:
        return Icons.message;
      case InteractionType.call:
        return Icons.phone;
      case InteractionType.email:
        return Icons.email;
      case InteractionType.note:
        return Icons.note;
      case InteractionType.appointment:
        return Icons.calendar_today;
      default:
        return Icons.info;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}



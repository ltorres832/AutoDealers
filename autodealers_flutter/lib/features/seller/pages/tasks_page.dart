// Página de Tareas del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/tasks_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerTasksPage extends StatelessWidget {
  const SellerTasksPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Tareas'),
      ),
      body: Consumer<TasksProvider>(
        builder: (context, tasksProvider, _) {
          if (tasksProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (tasksProvider.tasks.isEmpty) {
            return const Center(child: Text('No hay tareas'));
          }

          return ListView.builder(
            itemCount: tasksProvider.tasks.length,
            itemBuilder: (context, index) {
              final task = tasksProvider.tasks[index];
              return ListTile(
                title: Text(task['title'] ?? 'Sin título'),
                subtitle: Text(task['description'] ?? ''),
                trailing: Checkbox(
                  value: task['completed'] == true,
                  onChanged: (value) {
                    tasksProvider.completeTask(task['id'] as String);
                  },
                ),
                onTap: () => context.push('/seller/tasks/${task['id']}'),
              );
            },
          );
        },
      ),
    );
  }
}



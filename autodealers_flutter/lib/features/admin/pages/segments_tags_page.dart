// Página de Gestión de Segmentos y Tags (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/segments_tags_provider.dart';

class AdminSegmentsTagsPage extends StatefulWidget {
  const AdminSegmentsTagsPage({super.key});

  @override
  State<AdminSegmentsTagsPage> createState() => _AdminSegmentsTagsPageState();
}

class _AdminSegmentsTagsPageState extends State<AdminSegmentsTagsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SegmentsTagsProvider>().loadSegments();
      context.read<SegmentsTagsProvider>().loadTags();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Segmentos y Tags'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Segmentos'),
            Tab(text: 'Tags'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSegmentsTab(),
          _buildTagsTab(),
        ],
      ),
    );
  }

  Widget _buildSegmentsTab() {
    return Consumer<SegmentsTagsProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Segmentos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () => context.push('/admin/segments/create'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: provider.segments.isEmpty
                  ? const Center(child: Text('No hay segmentos'))
                  : ListView.builder(
                      itemCount: provider.segments.length,
                      itemBuilder: (context, index) {
                        final segment = provider.segments[index];
                        return Card(
                          margin: const EdgeInsets.all(8),
                          child: ListTile(
                            title: Text(segment['name'] ?? 'Sin nombre'),
                            subtitle: Text(segment['description'] ?? ''),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit),
                                  onPressed: () => context.push('/admin/segments/${segment['id']}/edit'),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete),
                                  onPressed: () => provider.deleteSegment(segment['id'] as String),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTagsTab() {
    return Consumer<SegmentsTagsProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Tags', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () => context.push('/admin/tags/create'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: provider.tags.isEmpty
                  ? const Center(child: Text('No hay tags'))
                  : ListView.builder(
                      itemCount: provider.tags.length,
                      itemBuilder: (context, index) {
                        final tag = provider.tags[index];
                        return Card(
                          margin: const EdgeInsets.all(8),
                          child: ListTile(
                            leading: Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                color: Color(int.tryParse(tag['color']?.replaceAll('#', '0xFF') ?? '0xFF000000') ?? 0xFF000000),
                                shape: BoxShape.circle,
                              ),
                            ),
                            title: Text(tag['name'] ?? 'Sin nombre'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit),
                                  onPressed: () => context.push('/admin/tags/${tag['id']}/edit'),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete),
                                  onPressed: () => provider.deleteTag(tag['id'] as String),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}



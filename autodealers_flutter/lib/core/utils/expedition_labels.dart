const Map<String, String> expeditionStageLabels = {
  'intake': 'Captación',
  'documentation': 'Documentación',
  'under_review': 'En análisis',
  'decision': 'Decisión',
  'closing': 'Cierre',
  'closed': 'Cerrado',
};

String expeditionStageLabel(String? stage) {
  if (stage == null || stage.isEmpty) return '—';
  return expeditionStageLabels[stage] ?? stage;
}

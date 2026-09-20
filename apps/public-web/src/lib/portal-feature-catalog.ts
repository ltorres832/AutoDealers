/**
 * Catálogo de funciones reales de los paneles dealer y vendedor.
 * Fuente: navigationItems + settings layouts + rutas inventory existentes.
 * No inventar módulos: solo lo que hay en el código.
 */

export type PortalFeature = {
  name: string;
  path: string;
  /** Nota breve basada en el módulo real; vacío = solo nombre */
  note?: string;
  gatedByPlan?: boolean;
};

export type PortalFeatureGroup = {
  title: string;
  items: PortalFeature[];
};

/** Panel Dealer — sidebar `apps/dealer/src/app/layout-wrapper.tsx` + inventory + settings */
export const DEALER_FEATURE_GROUPS: PortalFeatureGroup[] = [
  {
    title: 'Inicio y operación',
    items: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Inventario', path: '/inventory' },
      { name: 'Importación masiva de inventario', path: '/inventory/bulk' },
      { name: 'Inventario de red (multi-sede)', path: '/inventory/network' },
      { name: 'Sitio público del inventario', path: '/inventory/site' },
      { name: 'Feeds de inventario', path: '/inventory/feeds' },
      { name: 'Alianzas de inventario', path: '/inventory/alliances' },
      { name: 'Gestión de fotos por vehículo', path: '/inventory/photos/[id]' },
    ],
  },
  {
    title: 'CRM y clientes',
    items: [
      { name: 'Leads', path: '/leads' },
      { name: 'Interés catálogo web', path: '/catalog-interest' },
      {
        name: 'Autos en venta (clientes)',
        path: '/sell-to-dealer',
        note: 'Cliente vende su auto al dealer (no es trade-in)',
      },
      { name: 'Pipeline Kanban', path: '/leads/kanban', gatedByPlan: true },
      { name: 'CRM — Reglas de leads', path: '/settings/crm-lead-routing' },
      { name: 'Tareas', path: '/tasks', gatedByPlan: true },
      { name: 'Workflows', path: '/workflows', gatedByPlan: true },
      { name: 'Casos de Cliente', path: '/customer-files', gatedByPlan: true },
      { name: 'Citas', path: '/appointments', gatedByPlan: true },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { name: 'Mensajes', path: '/messages' },
      { name: 'Chat Interno', path: '/internal-chat' },
      { name: 'Chat Público', path: '/public-chat', gatedByPlan: true },
    ],
  },
  {
    title: 'Marketing y web',
    items: [
      { name: 'Campañas', path: '/campaigns', gatedByPlan: true },
      { name: 'Publicaciones Sociales', path: '/social-posts', gatedByPlan: true },
      { name: 'Promociones', path: '/promotions' },
      { name: 'Banners Premium', path: '/banners' },
      { name: 'Fotos página pública (galería de confianza)', path: '/settings/trust-gallery' },
      { name: 'Anuncios', path: '/announcements' },
      { name: 'Referidos', path: '/referrals' },
      { name: 'Reseñas', path: '/reviews' },
    ],
  },
  {
    title: 'Ventas, F&I y documentos',
    items: [
      { name: 'Documentos', path: '/documents' },
      { name: 'F&I', path: '/fi', gatedByPlan: true },
      { name: 'Métricas F&I', path: '/fi/metrics', gatedByPlan: true },
      { name: 'Workflows F&I', path: '/fi/workflows', gatedByPlan: true },
      { name: 'Deal desk', path: '/deals' },
      { name: 'Estadísticas de Ventas', path: '/sales-statistics' },
      { name: 'Reportes', path: '/reports', gatedByPlan: true },
    ],
  },
  {
    title: 'Taller y operaciones',
    items: [
      { name: 'Taller / Servicio', path: '/service' },
      { name: 'Estimados', path: '/estimates' },
      { name: 'Facturas', path: '/invoices' },
      { name: 'Piezas', path: '/parts' },
      { name: 'Finanzas', path: '/finance' },
      { name: 'RR.HH.', path: '/hr' },
    ],
  },
  {
    title: 'Equipo y red',
    items: [
      { name: 'Vendedores', path: '/sellers' },
      { name: 'Usuarios', path: '/users' },
      { name: 'Mis concesionarios', path: '/dealers' },
      { name: 'Políticas legales', path: '/policies' },
    ],
  },
  {
    title: 'Configuración del panel',
    items: [
      { name: 'Membresía y planes', path: '/settings/membership' },
      { name: 'Perfil', path: '/settings/profile' },
      { name: 'Seguridad', path: '/settings/security' },
      { name: 'Soporte', path: '/settings/support' },
      { name: 'Notificaciones', path: '/settings/notifications' },
      { name: 'CRM SLA', path: '/settings/crm-sla' },
      { name: 'IA', path: '/settings/ai' },
      { name: 'Agente de Voz', path: '/settings/voice-agent' },
      { name: 'Integraciones', path: '/settings/integrations' },
      { name: 'API / Connect', path: '/settings/integrations/api' },
      { name: 'Migración CSV', path: '/settings/migration' },
      { name: 'Pagos', path: '/settings/payments' },
      { name: 'Compensación', path: '/settings/compensation' },
      { name: 'Configuración F&I', path: '/settings/fi-manager' },
      { name: 'PDF F&I (branding documentos)', path: '/settings/document-branding' },
      { name: 'Emails corporativos', path: '/settings/corporate-emails' },
      { name: 'Sitio web', path: '/settings/website' },
      { name: 'Marca', path: '/settings/branding' },
      { name: 'Plantillas', path: '/settings/templates' },
      { name: 'Políticas (configuración)', path: '/settings/policies' },
      { name: 'Destacados (featured)', path: '/settings/featured' },
    ],
  },
];

/** Panel Vendedor — sidebar `apps/seller/src/app/layout-wrapper.tsx` + settings layout */
export const SELLER_FEATURE_GROUPS: PortalFeatureGroup[] = [
  {
    title: 'Inicio y operación',
    items: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Inventario', path: '/inventory' },
      { name: 'Fotos página pública', path: '/settings/seller-public-page' },
      { name: 'Guía del Vendedor', path: '/docs/guia-vendedor' },
    ],
  },
  {
    title: 'CRM y clientes',
    items: [
      { name: 'Leads', path: '/leads' },
      { name: 'Interés catálogo web', path: '/catalog-interest' },
      { name: 'Pipeline Kanban', path: '/leads/kanban', gatedByPlan: true },
      { name: 'Tareas', path: '/tasks', gatedByPlan: true },
      { name: 'Workflows', path: '/workflows', gatedByPlan: true },
      { name: 'Clientes (F&I)', path: '/fi', gatedByPlan: true },
      { name: 'Casos de Cliente', path: '/customer-files', gatedByPlan: true },
      { name: 'Citas', path: '/appointments', gatedByPlan: true },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { name: 'Mensajes', path: '/messages' },
      { name: 'Chat Interno', path: '/internal-chat' },
      { name: 'Chat Público', path: '/public-chat', gatedByPlan: true },
    ],
  },
  {
    title: 'Marketing y reputación',
    items: [
      { name: 'Campañas', path: '/campaigns', gatedByPlan: true },
      { name: 'Publicaciones Sociales', path: '/social-posts', gatedByPlan: true },
      { name: 'Promociones', path: '/promotions' },
      { name: 'Banners Premium', path: '/banners' },
      { name: 'Referidos', path: '/referrals' },
      { name: 'Reseñas', path: '/reviews' },
    ],
  },
  {
    title: 'Ventas, F&I y documentos',
    items: [
      { name: 'Documentos', path: '/documents' },
      { name: 'Contratos', path: '/contracts' },
      { name: 'F&I', path: '/fi', gatedByPlan: true },
      { name: 'Deal desk', path: '/deals' },
      { name: 'Estadísticas de Ventas', path: '/sales-statistics' },
      { name: 'Mi compensación', path: '/compensation', gatedByPlan: true },
      { name: 'Reportes', path: '/reports', gatedByPlan: true },
    ],
  },
  {
    title: 'Equipo',
    items: [
      { name: 'Usuarios', path: '/users' },
      { name: 'Políticas legales', path: '/policies' },
    ],
  },
  {
    title: 'Configuración del panel',
    items: [
      { name: 'Configuración (resumen)', path: '/settings' },
      { name: 'Perfil', path: '/settings/profile' },
      { name: 'Seguridad', path: '/settings/security' },
      { name: 'Soporte', path: '/settings/support' },
      { name: 'Notificaciones', path: '/settings/notifications' },
      { name: 'PDF F&I (branding documentos)', path: '/settings/document-branding' },
      { name: 'Fotos y videos página pública', path: '/settings/seller-public-page' },
      { name: 'Marca web', path: '/settings/branding' },
      { name: 'Sitio web', path: '/settings/website' },
      { name: 'Integraciones', path: '/settings/integrations' },
      { name: 'Agente de Voz', path: '/settings/voice-agent' },
      { name: 'Vínculo con concesionario', path: '/settings/dealer-link' },
      { name: 'Membresía', path: '/settings/membership' },
      { name: 'Pagos', path: '/settings/payments' },
      { name: 'Plantillas', path: '/settings/templates' },
      { name: 'Políticas (configuración)', path: '/settings/policies' },
      { name: 'Destacados (featured)', path: '/settings/featured' },
      { name: 'IA', path: '/settings/ai' },
      { name: 'Email corporativo', path: '/settings/corporate-email' },
    ],
  },
];

export function flattenPortalFeatures(groups: PortalFeatureGroup[]): PortalFeature[] {
  return groups.flatMap((g) => g.items);
}

export function countPortalFeatures(groups: PortalFeatureGroup[]): number {
  return flattenPortalFeatures(groups).length;
}

export function featuresToCsv(groups: PortalFeatureGroup[], audience: string): string {
  const lines = ['Audiencia,Grupo,Función,Ruta,Requiere plan,Nota'];
  for (const g of groups) {
    for (const item of g.items) {
      const note = (item.note || '').replace(/"/g, '""');
      lines.push(
        [
          audience,
          g.title,
          `"${item.name.replace(/"/g, '""')}"`,
          item.path,
          item.gatedByPlan ? 'Sí' : 'No',
          `"${note}"`,
        ].join(',')
      );
    }
  }
  return lines.join('\n');
}

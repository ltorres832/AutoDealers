const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs', 'funciones-presentacion');
fs.mkdirSync(outDir, { recursive: true });

const DEALER = [
  [
    'Inicio y operación',
    [
      ['Dashboard', '/dashboard', false, ''],
      ['Inventario', '/inventory', false, ''],
      ['Importación masiva de inventario', '/inventory/bulk', false, ''],
      ['Inventario de red (multi-sede)', '/inventory/network', false, ''],
      ['Sitio público del inventario', '/inventory/site', false, ''],
      ['Feeds de inventario', '/inventory/feeds', false, ''],
      ['Alianzas de inventario', '/inventory/alliances', false, ''],
      ['Gestión de fotos por vehículo', '/inventory/photos/[id]', false, ''],
    ],
  ],
  [
    'CRM y clientes',
    [
      ['Leads', '/leads', false, ''],
      ['Interés catálogo web', '/catalog-interest', false, ''],
      [
        'Autos en venta (clientes)',
        '/sell-to-dealer',
        false,
        'Cliente vende su auto al dealer (no es trade-in)',
      ],
      ['Pipeline Kanban', '/leads/kanban', true, ''],
      ['CRM — Reglas de leads', '/settings/crm-lead-routing', false, ''],
      ['Tareas', '/tasks', true, ''],
      ['Workflows', '/workflows', true, ''],
      ['Casos de Cliente', '/customer-files', true, ''],
      ['Citas', '/appointments', true, ''],
    ],
  ],
  [
    'Comunicación',
    [
      ['Mensajes', '/messages', false, ''],
      ['Chat Interno', '/internal-chat', false, ''],
      ['Chat Público', '/public-chat', true, ''],
    ],
  ],
  [
    'Marketing y web',
    [
      ['Campañas', '/campaigns', true, ''],
      ['Publicaciones Sociales', '/social-posts', true, ''],
      ['Promociones', '/promotions', false, ''],
      ['Banners Premium', '/banners', false, ''],
      ['Fotos página pública (galería de confianza)', '/settings/trust-gallery', false, ''],
      ['Anuncios', '/announcements', false, ''],
      ['Referidos', '/referrals', false, ''],
      ['Reseñas', '/reviews', false, ''],
    ],
  ],
  [
    'Ventas, F&I y documentos',
    [
      ['Documentos', '/documents', false, ''],
      ['F&I', '/fi', true, ''],
      ['Métricas F&I', '/fi/metrics', true, ''],
      ['Workflows F&I', '/fi/workflows', true, ''],
      ['Deal desk', '/deals', false, ''],
      ['Estadísticas de Ventas', '/sales-statistics', false, ''],
      ['Reportes', '/reports', true, ''],
    ],
  ],
  [
    'Taller y operaciones',
    [
      ['Taller / Servicio', '/service', false, ''],
      ['Estimados', '/estimates', false, ''],
      ['Facturas', '/invoices', false, ''],
      ['Piezas', '/parts', false, ''],
      ['Finanzas', '/finance', false, ''],
      ['RR.HH.', '/hr', false, ''],
    ],
  ],
  [
    'Equipo y red',
    [
      ['Vendedores', '/sellers', false, ''],
      ['Usuarios', '/users', false, ''],
      ['Mis concesionarios', '/dealers', false, ''],
      ['Políticas legales', '/policies', false, ''],
    ],
  ],
  [
    'Configuración del panel',
    [
      ['Membresía y planes', '/settings/membership', false, ''],
      ['Perfil', '/settings/profile', false, ''],
      ['Seguridad', '/settings/security', false, ''],
      ['Soporte', '/settings/support', false, ''],
      ['Notificaciones', '/settings/notifications', false, ''],
      ['CRM SLA', '/settings/crm-sla', false, ''],
      ['IA', '/settings/ai', false, ''],
      ['Agente de Voz', '/settings/voice-agent', false, ''],
      ['Integraciones', '/settings/integrations', false, ''],
      ['API / Connect', '/settings/integrations/api', false, ''],
      ['Migración CSV', '/settings/migration', false, ''],
      ['Pagos', '/settings/payments', false, ''],
      ['Compensación', '/settings/compensation', false, ''],
      ['Configuración F&I', '/settings/fi-manager', false, ''],
      ['PDF F&I (branding documentos)', '/settings/document-branding', false, ''],
      ['Emails corporativos', '/settings/corporate-emails', false, ''],
      ['Sitio web', '/settings/website', false, ''],
      ['Marca', '/settings/branding', false, ''],
      ['Plantillas', '/settings/templates', false, ''],
      ['Políticas (configuración)', '/settings/policies', false, ''],
      ['Destacados (featured)', '/settings/featured', false, ''],
    ],
  ],
];

const SELLER = [
  [
    'Inicio y operación',
    [
      ['Dashboard', '/dashboard', false, ''],
      ['Inventario', '/inventory', false, ''],
      ['Fotos página pública', '/settings/seller-public-page', false, ''],
      ['Guía del Vendedor', '/docs/guia-vendedor', false, ''],
    ],
  ],
  [
    'CRM y clientes',
    [
      ['Leads', '/leads', false, ''],
      ['Interés catálogo web', '/catalog-interest', false, ''],
      ['Pipeline Kanban', '/leads/kanban', true, ''],
      ['Tareas', '/tasks', true, ''],
      ['Workflows', '/workflows', true, ''],
      ['Clientes (F&I)', '/fi', true, ''],
      ['Casos de Cliente', '/customer-files', true, ''],
      ['Citas', '/appointments', true, ''],
    ],
  ],
  [
    'Comunicación',
    [
      ['Mensajes', '/messages', false, ''],
      ['Chat Interno', '/internal-chat', false, ''],
      ['Chat Público', '/public-chat', true, ''],
    ],
  ],
  [
    'Marketing y reputación',
    [
      ['Campañas', '/campaigns', true, ''],
      ['Publicaciones Sociales', '/social-posts', true, ''],
      ['Promociones', '/promotions', false, ''],
      ['Banners Premium', '/banners', false, ''],
      ['Referidos', '/referrals', false, ''],
      ['Reseñas', '/reviews', false, ''],
    ],
  ],
  [
    'Ventas, F&I y documentos',
    [
      ['Documentos', '/documents', false, ''],
      ['Contratos', '/contracts', false, ''],
      ['F&I', '/fi', true, ''],
      ['Deal desk', '/deals', false, ''],
      ['Estadísticas de Ventas', '/sales-statistics', false, ''],
      ['Mi compensación', '/compensation', true, ''],
      ['Reportes', '/reports', true, ''],
    ],
  ],
  [
    'Equipo',
    [
      ['Usuarios', '/users', false, ''],
      ['Políticas legales', '/policies', false, ''],
    ],
  ],
  [
    'Configuración del panel',
    [
      ['Configuración (resumen)', '/settings', false, ''],
      ['Perfil', '/settings/profile', false, ''],
      ['Seguridad', '/settings/security', false, ''],
      ['Soporte', '/settings/support', false, ''],
      ['Notificaciones', '/settings/notifications', false, ''],
      ['PDF F&I (branding documentos)', '/settings/document-branding', false, ''],
      ['Fotos y videos página pública', '/settings/seller-public-page', false, ''],
      ['Marca web', '/settings/branding', false, ''],
      ['Sitio web', '/settings/website', false, ''],
      ['Integraciones', '/settings/integrations', false, ''],
      ['Agente de Voz', '/settings/voice-agent', false, ''],
      ['Vínculo con concesionario', '/settings/dealer-link', false, ''],
      ['Membresía', '/settings/membership', false, ''],
      ['Pagos', '/settings/payments', false, ''],
      ['Plantillas', '/settings/templates', false, ''],
      ['Políticas (configuración)', '/settings/policies', false, ''],
      ['Destacados (featured)', '/settings/featured', false, ''],
      ['IA', '/settings/ai', false, ''],
      ['Email corporativo', '/settings/corporate-email', false, ''],
    ],
  ],
];

function toCsv(audience, groups) {
  const lines = ['Audiencia,Grupo,Función,Ruta,Requiere plan,Nota'];
  for (const [grupo, items] of groups) {
    for (const [name, ruta, plan, nota] of items) {
      lines.push(
        [
          audience,
          JSON.stringify(grupo),
          JSON.stringify(name),
          ruta,
          plan ? 'Sí' : 'No',
          JSON.stringify(nota || ''),
        ].join(',')
      );
    }
  }
  return '\ufeff' + lines.join('\n');
}

function toHtml(audience, subtitle, groups, csvName) {
  const total = groups.reduce((n, [, items]) => n + items.length, 0);
  const gated = groups.reduce((n, [, items]) => n + items.filter((i) => i[2]).length, 0);
  let body = '';
  for (const [grupo, items] of groups) {
    body += `<section class="feature-group"><h2>${grupo}</h2><ul>`;
    for (const [name, ruta, plan, nota] of items) {
      body += `<li><strong>${name}</strong>${
        plan ? ' <span class="plan">Plan</span>' : ''
      }${nota ? `<div class="note">${nota}</div>` : ''}<div class="path">${ruta}</div></li>`;
    }
    body += '</ul></section>';
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${audience} — AutoDealersOnline</title>
<style>
  body { font-family: system-ui, Segoe UI, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
  .sheet { max-width: 840px; margin: 24px auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  header { display: flex; gap: 16px; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
  header img { width: 56px; height: 56px; object-fit: contain; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px; }
  h1 { margin: 0; font-size: 1.6rem; }
  .sub { color: #64748b; margin: 4px 0 0; font-size: .95rem; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .badge { background: #f1f5f9; border-radius: 999px; padding: 4px 12px; font-size: .85rem; font-weight: 600; }
  .badge.amber { background: #fffbeb; color: #92400e; }
  h2 { font-size: 1.1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin: 28px 0 12px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
  .plan { font-size: 10px; text-transform: uppercase; color: #b45309; font-weight: 700; margin-left: 6px; }
  .note { font-size: .9rem; color: #475569; margin-top: 2px; }
  .path { font-family: ui-monospace, monospace; font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .toolbar button, .toolbar a { border: 1px solid #e2e8f0; background: #fff; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; color: #0f172a; font-size: 14px; }
  .toolbar .primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .sheet { box-shadow: none; margin: 0; max-width: none; }
    .feature-group { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="toolbar">
      <button class="primary" type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
      <a href="${csvName}">Abrir CSV</a>
    </div>
    <header>
      <img src="ad-platform-logo.png" alt="AutoDealersOnline" />
      <div>
        <div style="font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.04em">AutoDealersOnline</div>
        <h1>${audience}</h1>
        <p class="sub">${subtitle}</p>
        <div class="badges">
          <span class="badge">${total} funciones</span>
          <span class="badge amber">${gated} pueden requerir plan</span>
          <span class="badge">Solo módulos reales del panel</span>
        </div>
      </div>
    </header>
    ${body}
    <footer>
      Documento generado desde menús y rutas reales de AutoDealersOnline. Las marcadas «Plan» pueden estar limitadas por membresía.
    </footer>
  </div>
</body>
</html>`;
}

const logoSrc = path.join(__dirname, '..', 'apps', 'public-web', 'public', 'brand', 'ad-platform-logo.png');
fs.copyFileSync(logoSrc, path.join(outDir, 'ad-platform-logo.png'));

fs.writeFileSync(path.join(outDir, 'funciones-dealer.csv'), toCsv('Dealer', DEALER), 'utf8');
fs.writeFileSync(path.join(outDir, 'funciones-vendedor.csv'), toCsv('Vendedor', SELLER), 'utf8');
fs.writeFileSync(
  path.join(outDir, 'funciones-dealer.html'),
  toHtml(
    'Funciones del panel Dealer',
    'Módulos reales del panel del concesionario',
    DEALER,
    'funciones-dealer.csv'
  ),
  'utf8'
);
fs.writeFileSync(
  path.join(outDir, 'funciones-vendedor.html'),
  toHtml(
    'Funciones del panel Vendedor',
    'Módulos reales del panel del vendedor',
    SELLER,
    'funciones-vendedor.csv'
  ),
  'utf8'
);

console.log('Generated in', outDir);
console.log(fs.readdirSync(outDir).join('\n'));

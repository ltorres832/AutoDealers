# Checklist: Sincronización Next.js ↔ Flutter

Objetivo: ir pantalla por pantalla y función por función hasta que Flutter se comporte igual que Next.js.  
Marca con ✅ cuando esté igual, ❌ cuando falle o no exista, ⚠️ cuando funcione distinto.

---

## 1. APP PÚBLICA (public-web ↔ Flutter public)

### 1.1 Rutas / Páginas

| Next.js (public-web) | Flutter (ruta) | Estado | Notas |
|----------------------|----------------|--------|--------|
| `/` (Landing) | `/` | ✅ | Home con hero, búsqueda, categorías, vehículos, promos, dealers, contacto |
| `/search` | `/catalog` | ✅ | Catálogo con filtros y búsqueda |
| `/contacto` | `/contact` | ✅ | Formulario Firestore + layout info + form |
| `/dealers` | `/dealers` | ✅ | Página lista de dealers con grid y enlace a catálogo |
| `/dealer/[id]` | `/catalog?dealerId=xxx` | ⚠️ | Flutter: catálogo filtrado; Next.js: perfil dealer |
| `/[subdomain]/vehicle/[id]` | `/catalog/:id?tenantId=xxx` | ⚠️ | Detalle vehículo: Flutter página básica |
| `/compare` | `/compare` | ⚠️ | Comparar vehículos |
| `/registro` | `/registro` | ✅ | Registro completo |
| `/register` | `/register` | ✅ | Registro por tipo |
| `/register/membership` | `/register/membership` | ⚠️ | Selección membresía |
| `/register/multi-dealer` | `/register/multi-dealer` | ⚠️ | Registro multi-dealer |
| `/login` | `/login` | ✅ | Login |
| `/category/[categoryId]` | `/catalog?category=xxx` | ⚠️ | Filtro por categoría en catálogo |
| `/policies/[type]` | `/privacidad`, `/terminos` | ✅ | Políticas (privacidad, términos) |
| `/faq` | `/faq` | ✅ | FAQ con acordeón |
| `/precios` | `/precios` | ✅ | Precios con CTA a registro |
| `/caracteristicas` | — | ❌ | Características |
| `/sobre-nosotros` | — | ❌ | Sobre nosotros |
| `/privacidad` | `/privacidad` | ✅ | Política de privacidad |
| `/terminos` | `/terminos` | ✅ | Términos y condiciones |
| `/review/submit` | — | ❌ | Enviar reseña |
| `/review/rating/[token]` | — | ❌ | Valoración por token |
| `/advertise` | — | ❌ | Anunciar (landing anunciantes) |
| `/ads-preview` | — | ❌ | Vista previa ads |
| `/fi/documents/[token]` | — | ❌ | Documentos FI por token |
| `/survey/[token]` | — | ❌ | Encuesta por token |
| `/upload-documents/[token]` | — | ❌ | Subida documentos |
| `/contracts/sign/[token]` | — | ❌ | Firma contrato |
| `/[subdomain]/page` | — | ⚠️ | Tenant por subdominio (Flutter no usa subdominios) |
| `/[subdomain]/reviews` | — | ❌ | Reviews por tenant |
| `/[subdomain]/policies` | — | ❌ | Políticas por tenant |
| `/[subdomain]/appointment` | — | ❌ | Cita por tenant |
| `/[subdomain]/pre-qualify` | — | ❌ | Pre-calificación |

### 1.2 Componentes / Funciones (Landing y público)

| Función / Componente | Next.js | Flutter | Estado |
|----------------------|---------|---------|--------|
| Navbar: logo → home | ✅ | ✅ | |
| Navbar: Vehículos → catálogo | ✅ | ✅ | |
| Navbar: Promociones → scroll / sección | ✅ | ✅ | |
| Navbar: Concesionarios → /dealers | ✅ | ✅ | |
| Navbar: Contacto → /contact o scroll | ✅ | ✅ | |
| Navbar: Iniciar sesión → /login | ✅ | ✅ | |
| Hero: búsqueda por texto | ✅ | ✅ | |
| Hero: búsquedas populares (chips) | ✅ | ✅ | |
| Hero: botón Buscar | ✅ | ✅ | |
| Hero Banner (sponsored content) | ✅ | ✅ | |
| Categorías de vehículo (grid) | ✅ | ✅ | |
| Categorías: tap → catálogo con filtro | ✅ | ✅ | |
| Vehículos destacados | ✅ | ✅ | |
| Tarjeta vehículo: foto | ✅ | ⚠️ | Fotos con photos/images en modelo |
| Tarjeta vehículo: tap → detalle | ✅ | ✅ | /catalog/:id |
| Catálogo: filtros avanzados | ✅ | ✅ | |
| Catálogo: filtro por dealerId | ✅ | ✅ | |
| Promociones: grid de promos | ✅ | ✅ | |
| Promoción: tap → vehículo o dealer | ✅ | ✅ | /catalog/:id o ?dealerId= |
| Botón "Crear Anuncio" / "Crear Anuncio Ahora" | ✅ | ✅ | → /registro |
| Dealers destacados: foto, nombre, ubicación | ✅ | ✅ | |
| Dealers: "Ver Perfil" → catálogo dealer | ✅ | ✅ | |
| Dealers: "Ver todos" → /dealers | ✅ | ✅ | |
| Calculadora de financiación | ✅ | ✅ | |
| Sección reviews/testimonios | ✅ | ✅ | |
| Sección confianza / trust | ✅ | ✅ | |
| Sección contacto (formulario) | ✅ | ⚠️ | Verificar envío y destino |
| Footer: enlaces | ✅ | ✅ | Vehículos, Concesionarios, Promociones, Contacto, FAQ, Precios, Términos, Privacidad, tel, email |
| Sidebar banner (sponsored) | ✅ | ✅ | |
| Detalle vehículo: datos completos + fotos | ✅ | ✅ | Firestore, galería, specs, WhatsApp, consulta |
| Comparar vehículos: selección y vista | ✅ | ⚠️ | Revisar flujo completo |

### 1.3 Pendientes prioritarios (público)

- [x] **Detalle vehículo** (`/catalog/:id`): cargar datos desde Firestore (tenantId + vehicleId), galería fotos, especificaciones, CTA contacto.
- [x] **Contacto**: formulario Flutter guarda en Firestore `public_contacts`; Next.js tiene TODO en API.
- [x] **Páginas estáticas**: /privacidad, /terminos, /faq, /precios con contenido alineado a Next.js.
- [x] **Página dealers** (`/dealers`): página dedicada con grid de dealers y enlace a catálogo por dealer.
- [x] **Políticas**: rutas /privacidad y /terminos con contenido; cookies enlaza a privacidad.

---

## 2. APP DEALER (dealer ↔ Flutter /dealer/*)

| Área | Ruta Next.js | Flutter | Estado |
|------|----------------|---------|--------|
| Dashboard | /dealer/dashboard | /dealer/dashboard | ✅ Stats desde Firestore (leads, vehículos, ventas, mensajes, citas) |
| Leads | /dealer/leads | /dealer/leads | ✅ |
| Kanban leads | /dealer/leads/kanban | /dealer/leads/kanban | ✅ |
| Inventario | /dealer/inventory | /dealer/inventory | ✅ |
| Mensajes | /dealer/messages | /dealer/messages | ✅ |
| Citas | /dealer/appointments | /dealer/appointments | ✅ |
| Ventas / estadísticas | /dealer/sales-statistics | /dealer/sales-statistics | ✅ |
| Informes | /dealer/reports | /dealer/reports | ✅ |
| Tareas | /dealer/tasks | /dealer/tasks | ✅ |
| Workflows | /dealer/workflows | /dealer/workflows | ✅ |
| Campañas | /dealer/campaigns | /dealer/campaigns | ✅ |
| Promociones | /dealer/promotions | /dealer/promotions | ✅ |
| Banners | /dealer/banners | /dealer/banners | ✅ |
| Contratos | /dealer/contracts | /dealer/contracts | ✅ |
| Archivos cliente | /dealer/customer-files | /dealer/customer-files | ✅ |
| FI | /dealer/fi | /dealer/fi | ✅ |
| Reviews | /dealer/reviews | /dealer/reviews | ✅ |
| Referrals | /dealer/referrals | /dealer/referrals | ✅ |
| Recordatorios | /dealer/reminders | /dealer/reminders | ✅ |
| Chat interno | /dealer/internal-chat | /dealer/internal-chat | ✅ |
| Chat público | /dealer/public-chat | /dealer/public-chat | ✅ |
| Publicaciones sociales | /dealer/social-posts | /dealer/social-posts | ✅ |
| Anuncios | /dealer/announcements | /dealer/announcements | ✅ |
| Vendedores | /dealer/sellers | /dealer/sellers | ✅ (incl. /sellers/:id, /sellers/activity) |
| Usuarios | /dealer/users | /dealer/users | ✅ |
| Dealers | /dealer/dealers | /dealer/dealers | ✅ |
| Ajustes | /dealer/settings | /dealer/settings | ✅ |

*Rutas y páginas alineadas. Integración de datos/métricas por pantalla en fase de pruebas.*

---

## 3. APP SELLER (seller ↔ Flutter /seller/*)

| Área | Ruta Next.js | Flutter | Estado |
|------|----------------|---------|--------|
| Dashboard | /seller/dashboard | /seller/dashboard | ✅ |
| Leads | /seller/leads | /seller/leads | ✅ |
| Kanban | /seller/leads/kanban | /seller/leads/kanban | ✅ |
| Inventario | /seller/inventory | /seller/inventory | ✅ |
| Mensajes | /seller/messages | /seller/messages | ✅ |
| Citas | /seller/appointments | /seller/appointments | ✅ |
| Ventas | /seller/sales | /seller/sales | ✅ |
| Estadísticas ventas | /seller/sales-statistics | /seller/sales-statistics | ✅ |
| Informes | /seller/reports | /seller/reports | ✅ |
| Tareas | /seller/tasks | /seller/tasks | ✅ |
| Workflows | /seller/workflows | /seller/workflows | ✅ |
| Campañas | /seller/campaigns | /seller/campaigns | ✅ |
| Promociones | /seller/promotions | /seller/promotions | ✅ |
| Banners | /seller/banners | /seller/banners | ✅ |
| Contratos | /seller/contracts | /seller/contracts | ✅ |
| Archivos cliente | /seller/customer-files | /seller/customer-files | ✅ |
| FI (solicitudes, clientes) | /seller/fi/* | /seller/fi/* | ✅ |
| Clientes | /seller/customers | /seller/customers | ✅ |
| Reviews | /seller/reviews | /seller/reviews | ✅ |
| Referrals | /seller/referrals | /seller/referrals | ✅ |
| Chat interno/público | /seller/internal-chat, public-chat | idem Flutter | ✅ |
| Publicaciones sociales | /seller/social-posts | /seller/social-posts | ✅ |
| Usuarios | /seller/users | /seller/users | ✅ |
| Ajustes | /seller/settings | /seller/settings | ✅ |

*Rutas y páginas alineadas.*

---

## 4. APP ADMIN (admin ↔ Flutter /admin/*)

| Área | Ruta Next.js | Flutter | Estado |
|------|----------------|---------|--------|
| Usuarios | /admin/users | /admin/users | ✅ |
| Tenants | /admin/tenants | /admin/tenants | ✅ |
| Membresías | /admin/memberships | /admin/memberships | ✅ |
| Suscripciones | /admin/subscriptions | /admin/subscriptions | ✅ |
| Stripe config | /admin/stripe-config | /admin/stripe-config | ✅ |
| Tareas | /admin/tasks | /admin/tasks | ✅ |
| Workflows | /admin/workflows | /admin/workflows | ✅ |
| Campañas | /admin/campaigns | /admin/campaigns | ✅ |
| Promociones | /admin/promotions | /admin/promotions | ✅ |
| Banners | /admin/banners | /admin/banners | ✅ |
| Informes | /admin/reports | /admin/reports | ✅ |
| Ajustes (general, integraciones, etc.) | /admin/settings/* | /admin/settings/* | ✅ |
| Testimonios, reviews, FAQs | /admin/testimonials, reviews, faqs | idem Flutter | ✅ |
| Emails corporativos, anuncios, políticas | /admin/corporate-emails, announcements, policies | idem Flutter | ✅ |
| Aliases email, scoring, segments-tags | /admin/email-aliases, scoring, segments-tags | idem Flutter | ✅ |
| FI | /admin/fi | /admin/fi | ✅ |
| Anunciantes | /admin/advertisers | /admin/advertisers | ✅ |
| Contenido patrocinado | /admin/sponsored-content | /admin/sponsored-content | ✅ |
| Chat público | /admin/public-chat | /admin/public-chat | ✅ |
| Referrals | /admin/referrals | /admin/referrals | ✅ |
| Mantenimiento, feature flags | /admin/maintenance, feature-flags | idem Flutter | ✅ |
| Pricing, landing, AI config | /admin/pricing-config, landing-config, ai-config | idem Flutter | ✅ |
| KPIs, estadísticas globales | /admin/kpis, global-stats | idem Flutter | ✅ |
| All leads / kanban | /admin/all-leads, all-leads/kanban | idem Flutter | ✅ |
| All vehicles | /admin/all-vehicles | idem Flutter | ✅ |
| Multi-dealer requests | /admin/multi-dealer-requests | idem Flutter | ✅ |
| Purchase intents | /admin/purchase-intents | idem Flutter | ✅ |
| Plantillas contrato | /admin/contract-templates | idem Flutter | ✅ |
| Sellers | /admin/sellers | idem Flutter | ✅ |

*Rutas y páginas alineadas.*

---

## 5. APP ADVERTISER (advertiser ↔ Flutter /advertiser/*)

| Área | Ruta Next.js | Flutter | Estado |
|------|----------------|---------|--------|
| Dashboard | /advertiser/dashboard | /advertiser/dashboard | ✅ |
| Anuncios | /advertiser/ads | /advertiser/ads | ✅ |
| Facturación | /advertiser/billing | /advertiser/billing | ✅ |

*Rutas y páginas alineadas.*

---

## Cómo usar este checklist

1. **Público primero**: ve por la tabla 1.1 y 1.2, prueba cada ítem en Flutter y actualiza Estado (✅/❌/⚠️) y Notas.
2. Cuando algo falle o sea distinto, anota la ruta o el nombre del componente y lo vamos corrigiendo en Flutter para que coincida con Next.js.
3. Luego **Dealer**: tabla 2, misma dinámica.
4. Después **Seller**, **Admin** y **Advertiser** (tablas 3, 4, 5).

Puedes copiar este archivo o mantenerlo en el repo e irlos actualizando; cuando digas “empezamos por [X]”, podemos ir ítem por ítem y aplicar los cambios en código.



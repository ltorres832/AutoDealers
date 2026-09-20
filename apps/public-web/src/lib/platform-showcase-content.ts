export type AudienceType = 'dealer' | 'seller';

export type ProcedureStep = {
  title: string;
  text: string;
};

export type ShowcaseModule = {
  id: string;
  title: string;
  intro: string[];
  tools: string[];
  steps?: ProcedureStep[];
  outcome: string;
  star?: boolean;
};

export type AudienceShowcase = {
  label: string;
  heroTitle: string;
  heroSubtitle: string;
  visionTitle: string;
  visionBody: string[];
  modules: ShowcaseModule[];
  checklistTitle: string;
  checklist: string[];
  dayTitle: string;
  dayBody: string[];
  faq: { q: string; a: string }[];
  ctaTitle: string;
  ctaBody: string;
  registerType: 'dealer' | 'seller';
  registerLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const dealer: AudienceShowcase = {
  label: 'Concesionario',
  heroTitle: 'Tu concesionario completo en una sola plataforma',
  heroSubtitle:
    'Web propia con subdominio, marketplace, redes sincronizadas con posts desde el panel, equipo de vendedores bajo control y todas las herramientas para vender más — sin brincar de app en app.',
  visionTitle: 'De apps sueltas a un solo centro de operación',
  visionBody: [
    'Hoy muchos dealers viven entre WhatsApp, Facebook, hojas de cálculo, un CRM a medias y un sitio web que nadie actualiza. Los leads se enfrían, el inventario no coincide con lo que se publica y no hay forma clara de ver qué hace cada vendedor.',
    'AutoDealersOnline concentra inventario, CRM, mensajería, redes, citas, F&I, documentos, marketing y tu página pública en un panel. Das acceso a tu equipo y ves la operación completa desde tu dashboard.',
  ],
  modules: [
    {
      id: 'web-propia',
      star: true,
      title: 'Página web propia con tu subdominio',
      intro: [
        'Tu marca en internet con URL propia: subdominio de la plataforma y, cuando lo actives, dominio personalizado. No dependes de un sitio genérico: es tu vitrina 24/7 con inventario en vivo.',
        'El editor te deja armar hero, nosotros, servicios, testimonios, contacto y mapa, con branding (logo, colores) y SEO básicos para que te encuentren.',
      ],
      tools: [
        'Subdominio de marca (tu-concesionario…)',
        'Dominio personalizado',
        'Editor de sitio (hero, secciones, layout)',
        'Branding: logo, favicon, identidad visual',
        'Galería de confianza (entregas, clientes, eventos)',
        'Video promocional en la web',
        'Chat público / live chat en el sitio',
        'Formularios de contacto e interés',
        'SEO y meta de página',
        'Reseñas visibles y moderación',
        'Políticas legales publicadas en tu sitio',
        'Opción multi-idioma y white label según plan',
      ],
      steps: [
        { title: 'Activa tu presencia', text: 'Configura subdominio (y dominio si aplica) desde el panel.' },
        { title: 'Marca tu sitio', text: 'Sube logo, define colores y completa las secciones principales.' },
        { title: 'Conecta inventario', text: 'Los vehículos publicados alimentan tu catálogo público automáticamente.' },
        { title: 'Comparte la URL', text: 'Envía tu link a clientes, en tarjetas, ads y redes.' },
      ],
      outcome: 'Tus clientes te encuentran y exploran stock real sin que tengas que rediseñar un sitio desde cero.',
    },
    {
      id: 'marketplace',
      star: true,
      title: 'Marketplace: tus autos frente a compradores',
      intro: [
        'Además de tu web, tus vehículos pueden aparecer en el marketplace de AutoDealersOnline, donde compradores buscan autos de muchos concesionarios y vendedores.',
        'Más superficie de exposición: mismo inventario, más puntos de contacto (marketplace, tu sitio, redes, anuncios).',
      ],
      tools: [
        'Visibilidad en marketplace de la plataforma',
        'Fichas públicas con fotos, precio y specs',
        'Opción de destacado / mayor visibilidad',
        'Señales de interés en catálogo (vistas, UTM)',
        'Exportación de interés / seguimiento',
        'CTAs de contacto (WhatsApp, teléfono, formularios)',
      ],
      steps: [
        { title: 'Publica unidades', text: 'Completa ficha, fotos y precio; marca como publicado.' },
        { title: 'Aparece en marketplace', text: 'El stock elegible se muestra a compradores de la plataforma.' },
        { title: 'Recibe interés o contacto', text: 'Vistas, leads o mensajes llegan a tu CRM / inbox.' },
        { title: 'Asigna y da seguimiento', text: 'Un vendedor de tu equipo atiende; tú lo ves en el dashboard.' },
      ],
      outcome: 'No dependes solo del tráfico de tu sitio: el marketplace amplía el alcance de cada unidad.',
    },
    {
      id: 'dashboard',
      title: 'Dashboard: toda la operación a la vista',
      intro: [
        'Un solo tablero para entrar al día: accesos a inventario, leads, mensajes, citas, campañas y equipo. Notificaciones por push, email, SMS o WhatsApp según configures.',
      ],
      tools: [
        'Dashboard operativo del concesionario',
        'Notificaciones multi-canal',
        'Anuncios de la plataforma',
        'Soporte desde el panel',
        'Acceso móvil según plan',
      ],
      outcome: 'Empiezas el día sabiendo qué urge: leads nuevos, citas y mensajes sin revisar cinco apps.',
    },
    {
      id: 'equipo-vendedores',
      star: true,
      title: 'Cuentas para tus vendedores y control total del equipo',
      intro: [
        'Das acceso y cuentas a tus vendedores para que operen inventario, leads y citas con los permisos que tú defines. No es “compartir una contraseña”: es un equipo estructurado.',
        'Desde tu dashboard ves la operación completa: actividad, leads, ventas, métricas por vendedor y compensación. Supervisas sin pedir reportes sueltos por WhatsApp.',
      ],
      tools: [
        'Alta / invitación de vendedores',
        'Cuentas con acceso al panel',
        'Permisos granulares (inventario, leads, campañas, etc.)',
        'Usuarios managers / admins del dealer',
        'Métricas y actividad por vendedor',
        'Páginas públicas / links de cada vendedor',
        'Portal de compensación (comisiones, pagos)',
        'Multi-concesionario / red según plan',
        'Visión consolidada en el dashboard del dealer',
      ],
      steps: [
        { title: 'Crea o invita al vendedor', text: 'Generas la cuenta y defines qué puede ver y hacer.' },
        { title: 'El vendedor opera', text: 'Atiende leads, publica, agenda citas y cierra desde su acceso.' },
        { title: 'Tú supervisas', text: 'En tu dashboard ves pipeline, ventas y rendimiento del equipo.' },
        { title: 'Ajustas permisos o roles', text: 'Escalas el equipo sin perder control de la operación.' },
      ],
      outcome: 'Tu concesionario escala con personas reales y tú mantienes el control desde un solo lugar.',
    },
    {
      id: 'inventario',
      title: 'Inventario que vende',
      intro: [
        'Catálogo completo con marca, modelo, año, precio, VIN, condición, comisiones y multimedia. Importación masiva y sincronización hacia web, marketplace y canales externos.',
      ],
      tools: [
        'Alta y edición de vehículos',
        'Fotos, videos y tours virtuales',
        'Importación masiva de inventario',
        'Sincronización con web / canales',
        'Inventario multi-dealer / red',
        'Estados (disponible, vendido, oculto)',
        'Interés en catálogo web',
      ],
      steps: [
        { title: 'Crea la unidad', text: 'Datos, precio y specs.' },
        { title: 'Sube media', text: 'Fotos y videos que cierran la venta.' },
        { title: 'Publica', text: 'Visible en tu web y marketplace.' },
        { title: 'Sincroniza y comparte', text: 'Empuja a redes o campañas desde el mismo panel.' },
      ],
      outcome: 'Un solo inventario alimenta sitio, marketplace y marketing.',
    },
    {
      id: 'videos-multimedia',
      title: 'Videos, fotos y multimedia',
      intro: [
        'Las fichas con video y recorridos venden más. Sube videos por unidad, tours virtuales, video promo del sitio y galería de confianza con entregas reales.',
      ],
      tools: [
        'Galería de fotos por vehículo',
        'Videos por unidad',
        'Tours virtuales / 360°',
        'Video promocional en la web',
        'Galería de confianza (clientes, entregas, eventos)',
      ],
      steps: [
        { title: 'Sube media', text: 'Fotos y videos ordenados en la ficha.' },
        { title: 'Publica', text: 'La web y el marketplace muestran el contenido.' },
        { title: 'Reutiliza en redes', text: 'Publica la unidad a Facebook/Instagram desde el panel.' },
      ],
      outcome: 'El comprador conoce el auto antes de llegar al lote.',
    },
    {
      id: 'crm',
      title: 'CRM y pipeline: leads que no se enfrían',
      intro: [
        'Inbox de prospectos desde web, redes, mensajes y campañas. Kanban visual, scoring, clasificación con IA, asignación a vendedores, SLA, tareas y workflows.',
      ],
      tools: [
        'Leads omnicanal',
        'Pipeline Kanban',
        'CRM avanzado (historial, etiquetas)',
        'Lead scoring y clasificación IA',
        'Asignación / round-robin a vendedores',
        'SLA y alertas de seguimiento',
        'Tareas y recordatorios',
        'Workflows automatizados',
        'Expediente / casos de cliente',
        'Recordatorios post-venta',
      ],
      steps: [
        { title: 'Entra el lead', text: 'Web, marketplace, Meta, WhatsApp o campaña.' },
        { title: 'Clasifica y asigna', text: 'IA o reglas; llega al vendedor correcto.' },
        { title: 'Sigue en pipeline', text: 'Etapas, tareas y citas hasta el cierre.' },
        { title: 'Archiva en expediente', text: 'Docs y post-venta quedan ligados al cliente.' },
      ],
      outcome: 'Cada oportunidad tiene dueño, plazo y siguiente paso.',
    },
    {
      id: 'mensajeria',
      title: 'Mensajería omnicanal',
      intro: [
        'WhatsApp, Messenger, Instagram, email, SMS, chat interno del equipo y live chat en tu web — en un inbox, con plantillas e IA de respuestas.',
      ],
      tools: [
        'Inbox unificado (WhatsApp destacado)',
        'Messenger / Instagram / email / SMS',
        'Chat interno del dealer',
        'Live chat en sitio público',
        'Plantillas de mensajes',
        'Respuestas asistidas por IA',
        'Email corporativo y firmas',
      ],
      steps: [
        { title: 'Llega el mensaje', text: 'Cualquier canal cae al inbox.' },
        { title: 'Responde o deja que la IA sugiera', text: 'Con o sin aprobación humana.' },
        { title: 'Cierra o escala', text: 'Pasa a cita, lead o vendedor asignado.' },
      ],
      outcome: 'Dejas de perder conversaciones entre pestañas y teléfonos.',
    },
    {
      id: 'citas',
      title: 'Agenda y citas',
      intro: [
        'Calendario para visitas, pruebas de manejo y entregas. Asigna vendedor y vehículo; confirma y recuerda por email o sistema. Citas de servicio también vía agente de voz.',
      ],
      tools: [
        'Calendario día/semana',
        'Asignación vendedor + vehículo',
        'Confirmaciones y recordatorios',
        'Citas de servicio / mantenimiento',
      ],
      outcome: 'El lote se llena con citas reales, no con “te aviso”.',
    },
    {
      id: 'redes-sync',
      star: true,
      title: 'Redes sincronizadas: publica sin brincar de plataforma',
      intro: [
        'Conectas Facebook e Instagram una vez. Sincronizas catálogo con Meta y publicas posts en tiempo real (o programados) desde AutoDealersOnline — sin abrir otra app para cada publicación.',
        'Menos fricción: el inventario y el marketing viven juntos. Métricas de engagement vuelven al panel.',
      ],
      tools: [
        'OAuth Facebook / Instagram',
        'Sincronización de catálogo a Meta',
        'Publicación directa desde el panel',
        'Programación de posts',
        'Publicar un vehículo a redes en un clic',
        'Analytics de engagement',
        'Mensajería social ligada al inbox',
      ],
      steps: [
        { title: 'Conecta tus cuentas', text: 'Autorizas FB/IG desde integraciones.' },
        { title: 'Sincroniza inventario', text: 'El catálogo queda disponible para Meta.' },
        { title: 'Publica desde aquí', text: 'Post ahora o programado, con o sin IA de copy.' },
        { title: 'Mide en el panel', text: 'Engagement y leads sin salir de la plataforma.' },
      ],
      outcome: 'Una sola herramienta para operar el negocio y las redes.',
    },
    {
      id: 'publicaciones',
      title: 'Publicaciones y calendario de contenido',
      intro: [
        'Crea captions, hashtags y CTAs con ayuda de IA, programa la cola de contenido y publica desde un vehículo o tema libre.',
      ],
      tools: [
        'Generación de copy con IA',
        'Hashtags y CTA por red',
        'Calendario / programación',
        'Cola de publicaciones',
        'Publicación desde ficha de inventario',
      ],
      steps: [
        { title: 'Elige vehículo o tema', text: 'Parte del inventario o de una campaña.' },
        { title: 'Genera o edita el copy', text: 'IA + tu tono de marca.' },
        { title: 'Programa o publica ya', text: 'Sale a FB/IG desde la plataforma.' },
        { title: 'Revisa métricas', text: 'Ajusta el siguiente post con datos reales.' },
      ],
      outcome: 'Contenido constante sin vivir dentro de Meta Business Suite.',
    },
    {
      id: 'campanas',
      title: 'Campañas y marketing',
      intro: [
        'Campañas multi-canal con presupuestos y métricas (impresiones, clics, leads, spend). Email, SMS y WhatsApp marketing; A/B y optimización con IA.',
      ],
      tools: [
        'Campañas multi-plataforma',
        'Meta Ads desde campaña',
        'Email / SMS / WhatsApp marketing',
        'Métricas de campaña',
        'A/B testing',
        'Optimización IA (presupuesto, audiencias, horarios)',
      ],
      outcome: 'Marketing medible ligado a leads reales en tu CRM.',
    },
    {
      id: 'promos-banners',
      title: 'Promociones y banners',
      intro: [
        'Ofertas por vehículo o dealer, auto-envío a leads, banners premium en la plataforma y espacios destacados con CTA a inventario o sitio.',
      ],
      tools: [
        'Promociones por vehículo / dealer',
        'Envío a leads y clientes',
        'Banners premium (hero, sidebar, ficha del vehículo, etc.)',
        'Métricas de vistas y clics',
        'Destacados en landing pública',
      ],
      outcome: 'Impulsas unidades clave sin improvisar en mil canales.',
    },
    {
      id: 'documentos',
      title: 'Documentos, contratos y firmas',
      intro: [
        'Estudio de documentos: factura, recibo, garantía, bill of sale y más. PDF con tu branding, firmas digitales, envío por WhatsApp/email y certificados de compra con QR.',
      ],
      tools: [
        'Plantillas de documentos de venta',
        'Generación de PDF con logo',
        'Firmas digitales',
        'Envío por WhatsApp / email',
        'Certificados de compra (QR)',
        'Archivo en expediente del cliente',
      ],
      steps: [
        { title: 'Elige plantilla', text: 'Según el tipo de cierre.' },
        { title: 'Completa y genera PDF', text: 'Con datos del deal y branding.' },
        { title: 'Firma y envía', text: 'Digital + WhatsApp/email.' },
        { title: 'Archiva', text: 'Queda en el expediente.' },
      ],
      outcome: 'Cierras con papelería profesional sin salir del flujo de venta.',
    },
    {
      id: 'docs-cliente',
      title: 'Solicitud de documentos al cliente',
      intro: [
        'Pides la lista de docs que necesitas; el cliente carga por portal/token; tú revisas y avanzas F&I o cierre. Todo en el expediente.',
      ],
      tools: [
        'Listas de documentos solicitados',
        'Portal de carga para el cliente',
        'Seguimiento de pendientes',
        'Expediente / caso de cliente',
      ],
      outcome: 'Menos ida y vuelta por chat pediendo “mándame el PDF otra vez”.',
    },
    {
      id: 'fi',
      title: 'F&I: financiamiento y seguros',
      intro: [
        'Hub de solicitudes, calculadora, scoring, co-signers, paquetes PDF a banco, workflows y métricas. Varios gerentes F&I según plan.',
      ],
      tools: [
        'Hub F&I (clientes y solicitudes)',
        'Calculadora de financiamiento',
        'Scoring de aprobación',
        'Co-signers',
        'Paquetes PDF / email a banco',
        'Branding en PDFs F&I',
        'Workflows y métricas F&I',
      ],
      steps: [
        { title: 'Abre solicitud', text: 'Cliente y escenario de pago.' },
        { title: 'Reúne docs', text: 'Portal de carga + expediente.' },
        { title: 'Score y paquete', text: 'Preparas envío al banco/partner.' },
        { title: 'Aprobación gerente', text: 'Flujo interno de revisión.' },
      ],
      outcome: 'El financiamiento deja de ser un proceso paralelo fuera del sistema.',
    },
    {
      id: 'deal-desk',
      title: 'Deal desk y cierre con depósito',
      intro: [
        'Arma la oferta: precio, trade-in, impuestos, seguros, accesorios y depósito. Comparte enlace de pago (Stripe Connect) por WhatsApp o email.',
      ],
      tools: [
        'Deal desk / ofertas',
        'Trade-in e impuestos',
        'Enlace de depósito / pago',
        'Cobro con Stripe Connect',
        'Estadísticas de ventas',
      ],
      outcome: 'Del acuerdo verbal al depósito sin improvisar links de pago.',
    },
    {
      id: 'plantillas-notif',
      title: 'Plantillas, notificaciones y utilidades diarias',
      intro: [
        'Plantillas de mensaje y email, alertas configurables y recordatorios post-venta (mantenimiento, filtros, gomas) para mantener relación con el cliente.',
      ],
      tools: [
        'Plantillas de mensajes / email',
        'Preferencias push / email / SMS / WhatsApp / sonido',
        'Recordatorios post-venta',
        'Políticas en sitio',
      ],
      outcome: 'El día a día queda estandarizado y con menos olvidos.',
    },
    {
      id: 'dms',
      title: 'DMS operativo: taller, piezas y finanzas',
      intro: [
        'Órdenes de reparación, catálogo de piezas, proveedores, caja, facturas y exportación contable (QuickBooks/Xero). RR.HH. (asistencia, hiring, nómina) según módulos activos.',
      ],
      tools: [
        'Taller / órdenes de servicio',
        'Piezas y proveedores',
        'Finanzas DMS / caja',
        'Export GL',
        'Módulos RR.HH. (según plan)',
      ],
      outcome: 'La operación post-venta también vive en la misma plataforma.',
    },
    {
      id: 'ia-texto',
      title: 'Inteligencia artificial de texto',
      intro: [
        'Auto-respuestas, clasificación de leads, contenido social, follow-ups, emails y análisis predictivo. Configuras el perfil de negocio para respuestas alineadas a tu marca 24/7.',
      ],
      tools: [
        'Respuestas automáticas multi-canal',
        'Clasificación y sentimiento de leads',
        'Contenido para redes',
        'Seguimientos automáticos',
        'Emails con IA',
        'Predictivo e inventario inteligente',
        'Perfil de negocio para IA',
      ],
      outcome: 'El equipo humano se enfoca en cerrar; la IA cubre velocidad y volumen.',
    },
    {
      id: 'voz-ia',
      title: 'Agente de voz IA',
      intro: [
        'Llamadas con voz natural en español: entrantes, salientes de seguimiento, citas de servicio y campañas de voz. Puede dispararse desde leads de Meta/WhatsApp con horarios y escalación humana.',
      ],
      tools: [
        'Agente de voz configurable (persona, tono, guardrails)',
        'Llamadas entrantes',
        'Salientes / follow-up',
        'Citas de servicio por teléfono',
        'Campañas de voz',
        'Auto-llamada desde leads sociales',
        'Transferencia a humano',
      ],
      steps: [
        { title: 'Configura la persona', text: 'Tono, horarios e incentivos.' },
        { title: 'Define triggers', text: 'Entrantes, salientes o leads sociales.' },
        { title: 'La llamada ocurre', text: 'El agente atiende o llama.' },
        { title: 'Resultado al CRM', text: 'Lead, cita o escalación humana.' },
      ],
      outcome: 'Atención telefónica que no duerme y queda registrada en el sistema.',
    },
    {
      id: 'reportes',
      title: 'Reportes, integraciones y crecimiento',
      intro: [
        'Reportes CRM, campañas y redes; exportes; API/webhooks; Stripe Connect; migración CSV; programa de referidos para crecer la red.',
      ],
      tools: [
        'Reportes y analytics',
        'Export PDF / Excel / CSV',
        'API pública y webhooks',
        'Stripe Connect',
        'Migración CSV',
        'Programa de referidos',
        'Partners bancos / seguros',
      ],
      outcome: 'Datos e integraciones para operar y escalar sin reinventar el stack.',
    },
  ],
  checklistTitle: 'Inventario completo de lo que la plataforma pone a tu alcance',
  checklist: [
    'Web propia con subdominio y dominio custom',
    'Marketplace de vehículos de la plataforma',
    'Dashboard con visión de toda la operación',
    'Cuentas y permisos para vendedores y managers',
    'Métricas, actividad y compensación del equipo',
    'Inventario con fotos, videos y tours',
    'Importación masiva y sync multi-canal',
    'CRM, Kanban, scoring, SLA y workflows',
    'Mensajería WhatsApp / Meta / email / SMS / chat',
    'Agenda de citas y recordatorios',
    'Redes sincronizadas y posts desde el panel',
    'Campañas, promos, banners y Meta Ads',
    'Documentos PDF, firmas y certificados QR',
    'Solicitud de docs al cliente y expediente',
    'F&I completo y deal desk con depósitos',
    'DMS: taller, piezas, caja',
    'IA de texto y agente de voz',
    'Reportes, API, webhooks y referidos',
    'Email corporativo, SEO, reseñas, white label',
    'Notificaciones, plantillas y soporte',
  ],
  dayTitle: 'Un día típico en el concesionario',
  dayBody: [
    'Abres el dashboard: leads de la noche, citas del día y mensajes sin leer.',
    'Un vendedor ya atendió un lead del marketplace; tú ves el avance en el pipeline.',
    'Publicas dos unidades nuevas: quedan en tu web, en marketplace, y lanzas un post a Instagram desde el panel — sin abrir otra app.',
    'F&I pide docs al cliente por portal; el deal desk manda el link de depósito.',
    'Al cierre del día revisas ventas y actividad del equipo desde el mismo lugar.',
  ],
  faq: [
    {
      q: '¿Puedo dar acceso a mis vendedores sin compartir mi cuenta?',
      a: 'Sí. Creas cuentas con permisos y ves su operación desde tu dashboard: leads, inventario y ventas.',
    },
    {
      q: '¿Tengo que publicar en Facebook e Instagram aparte?',
      a: 'No. Conectas las redes una vez y publicas (o programas) desde AutoDealersOnline, incluyendo posts desde un vehículo.',
    },
    {
      q: '¿Mi inventario aparece solo en mi web?',
      a: 'Puede estar en tu sitio con subdominio y también en el marketplace de la plataforma para llegar a más compradores.',
    },
    {
      q: '¿Incluye financiamiento y documentos?',
      a: 'Sí: módulo F&I, solicitud de documentos al cliente, plantillas PDF, firmas y deal desk con depósitos.',
    },
    {
      q: '¿Cómo empiezo?',
      a: 'Crea tu cuenta de concesionario, configura marca y subdominio, invita a tu equipo y publica el primer inventario.',
    },
  ],
  ctaTitle: 'Pon tu concesionario a operar en un solo lugar',
  ctaBody:
    'Web propia, marketplace, redes desde el panel, equipo de vendedores y el resto de herramientas — listo para que tu operación crezca con control.',
  registerType: 'dealer',
  registerLabel: 'Crear cuenta de concesionario',
  secondaryHref: '/demo-dealer',
  secondaryLabel: 'Ver preview del panel',
};

const seller: AudienceShowcase = {
  label: 'Vendedor',
  heroTitle: 'Tu vitrina online y panel de ventas en una sola plataforma',
  heroSubtitle:
    'Página propia con subdominio, autos en el marketplace, redes sincronizadas con posts desde el panel, leads, citas, documentos y cierre — sin brincar de app en app.',
  visionTitle: 'Vende como profesional, sin depender de mil herramientas',
  visionBody: [
    'Como vendedor independiente o asociado a un dealer, necesitas presencia 24/7, inventario atractivo, respuesta rápida y papelería para cerrar. AutoDealersOnline te da panel + web + marketplace + redes en un flujo continuo.',
    'Si trabajas con un concesionario, ellos pueden darte acceso/cuenta y seguir la operación; tú operas tu día a día con las mismas herramientas de publicación, leads y cierre.',
  ],
  modules: [
    {
      id: 'web-propia',
      star: true,
      title: 'Tu página web propia con subdominio',
      intro: [
        'Catálogo público en tu URL (subdominio de marca y dominio custom según plan). Editor de sitio, branding, galería, chat y CTAs de WhatsApp/teléfono en cada ficha.',
      ],
      tools: [
        'Página /seller y subdominio propio',
        'Dominio personalizado',
        'Editor de sitio y branding',
        'Galería de confianza y videos promo',
        'Chat público en tu web',
        'CTAs WhatsApp / teléfono en anuncios',
        'Políticas y SEO de tu sitio',
      ],
      steps: [
        { title: 'Completa tu perfil', text: 'Foto, WhatsApp, horarios y datos de contacto.' },
        { title: 'Activa tu web', text: 'Subdominio y secciones de marca.' },
        { title: 'Publica inventario', text: 'Las unidades alimentan tu catálogo 24/7.' },
        { title: 'Comparte el link', text: 'WhatsApp, redes, tarjetas, ads.' },
      ],
      outcome: 'Tienes vitrina profesional aunque vendas desde el celular.',
    },
    {
      id: 'marketplace',
      star: true,
      title: 'Marketplace: más ojos sobre tus autos',
      intro: [
        'Además de tu página, tus vehículos pueden aparecer en el marketplace de la plataforma. Más compradores, mismo inventario.',
      ],
      tools: [
        'Visibilidad en marketplace',
        'Fichas públicas completas',
        'Perfil / anuncio destacado',
        'Interés de catálogo y UTM',
        'Contacto directo desde la ficha',
      ],
      steps: [
        { title: 'Publica la unidad', text: 'Fotos, precio, millaje, descripción.' },
        { title: 'Aparece en marketplace', text: 'Compradores de la plataforma te encuentran.' },
        { title: 'Atiende el lead', text: 'WhatsApp, chat o formulario → tu inbox.' },
      ],
      outcome: 'No dependes solo de quienes ya te conocen.',
    },
    {
      id: 'arranque',
      title: 'Guía de arranque (paso a paso)',
      intro: [
        'El camino más corto a tu primera venta en la plataforma: perfil → web → inventario con media → marketplace y redes → leads diarios.',
      ],
      tools: [
        'Perfil y WhatsApp listos',
        'Página pública revisada',
        'Inventario con fotos y videos',
        'Links para compartir',
        'Rutina diaria de leads y citas',
      ],
      steps: [
        { title: 'Perfil', text: 'Foto, teléfono, WhatsApp, horarios.' },
        { title: 'Web', text: 'Revisa subdominio y secciones.' },
        { title: 'Inventario', text: 'Publica con fotos y videos completos.' },
        { title: 'Difunde', text: 'Marketplace + posts desde el panel + WhatsApp.' },
        { title: 'Atiende', text: 'Revisa leads y citas todos los días.' },
      ],
      outcome: 'En pocos pasos pasas de “cuenta creada” a “estoy vendiendo en serio”.',
    },
    {
      id: 'inventario',
      title: 'Inventario y publicación',
      intro: [
        'CRUD de vehículos, estados, marcar vendido, importación masiva y, si estás vinculado a un dealer, sync de stock del concesionario a tu catálogo.',
      ],
      tools: [
        'Alta/edición de unidades',
        'Publicar / despublicar en web',
        'Estados disponible / vendido / oculto',
        'Bulk import',
        'Sync con inventario del dealer',
        'Publicar unidad a redes desde inventario',
      ],
      outcome: 'Un inventario limpio alimenta web, marketplace y redes.',
    },
    {
      id: 'videos-multimedia',
      title: 'Videos y multimedia',
      intro: ['Videos por unidad, tours, promo en tu página y galería de confianza para transmitir seriedad.'],
      tools: ['Fotos', 'Videos', 'Tours virtuales', 'Video promo', 'Galería de entregas/clientes'],
      outcome: 'Tus anuncios compiten con los de un concesionario grande.',
    },
    {
      id: 'crm',
      title: 'Leads, interés y CRM',
      intro: [
        'Inbox de prospectos, señales de interés en catálogo, Kanban, tareas, workflows y scoring para no perder oportunidades.',
      ],
      tools: [
        'Leads e interés de catálogo',
        'Pipeline Kanban',
        'Tareas y workflows',
        'Lead scoring',
        'Reportes CRM',
      ],
      steps: [
        { title: 'Llega la señal', text: 'Vista, WhatsApp o formulario.' },
        { title: 'Califica', text: 'Mueve en Kanban y crea tarea.' },
        { title: 'Agenda cita', text: 'Prueba de manejo o consulta.' },
        { title: 'Cierra', text: 'Deal, docs o F&I.' },
      ],
      outcome: 'Cada interesado tiene un siguiente paso claro.',
    },
    {
      id: 'mensajes-citas',
      title: 'Mensajes y citas',
      intro: ['WhatsApp inbox, live chat en tu web, citas de consulta, prueba y entrega, con notificaciones.'],
      tools: ['WhatsApp', 'Live chat', 'Citas', 'Notificaciones multi-canal', 'Chat interno (equipo)'],
      outcome: 'Respondes donde el cliente ya está hablando contigo.',
    },
    {
      id: 'redes-sync',
      star: true,
      title: 'Redes sincronizadas: posts en tiempo real desde el panel',
      intro: [
        'Conecta Facebook e Instagram. Publica y programa desde AutoDealersOnline — sin brincar a otra plataforma cada vez que quieras subir un auto.',
      ],
      tools: [
        'Conexión FB/IG',
        'Posts en tiempo real desde el panel',
        'Programación',
        'Copy con IA',
        'Publicar desde inventario',
        'Analytics',
      ],
      steps: [
        { title: 'Conecta', text: 'OAuth de tus páginas.' },
        { title: 'Elige el auto o el tema', text: 'Desde inventario o publicaciones.' },
        { title: 'Publica aquí', text: 'Ahora o programado.' },
        { title: 'Mide', text: 'Engagement sin salir del panel.' },
      ],
      outcome: 'Marketing social sin vivir dentro de cinco aplicaciones.',
    },
    {
      id: 'publicaciones',
      title: 'Publicaciones y contenido',
      intro: ['Captions, hashtags, CTA y calendario de posts con ayuda de IA.'],
      tools: ['Generación IA', 'Programación', 'Share WhatsApp / redes / email'],
      outcome: 'Presencia constante con menos esfuerzo creativo.',
    },
    {
      id: 'campanas',
      title: 'Campañas, promociones y visibilidad',
      intro: [
        'Campañas multi-plataforma, promociones, banners premium y perfil destacado para empujar unidades o tu marca de vendedor.',
      ],
      tools: ['Campañas', 'Meta Ads', 'Promociones', 'Banners', 'Perfil destacado', 'Email/SMS/WhatsApp marketing'],
      outcome: 'Visibilidad bajo demanda cuando necesitas mover stock.',
    },
    {
      id: 'documentos',
      title: 'Documentos, contratos y firmas',
      intro: [
        'Plantillas PDF (venta, factura, recibo, garantía…), firmas, envío por WhatsApp y certificados QR.',
      ],
      tools: ['Estudio de documentos', 'PDF con branding', 'Firmas', 'Envío WhatsApp', 'Certificados QR'],
      outcome: 'Cierras con documentos serios desde el celular o la laptop.',
    },
    {
      id: 'docs-cliente',
      title: 'Docs al cliente y expediente',
      intro: ['Solicita documentos, el cliente carga por portal, avanzas F&I o el cierre con todo archivado.'],
      tools: ['Solicitud de docs', 'Portal de carga', 'Expediente del cliente'],
      outcome: 'Menos chase de papeles por chat.',
    },
    {
      id: 'fi-deal',
      title: 'F&I, deal desk y depósitos',
      intro: [
        'Calculadora, scoring, co-signers, deal con trade-in y enlace de depósito. Cierre profesional de punta a punta.',
      ],
      tools: ['Hub F&I', 'Calculadora', 'Deal desk', 'Depósitos Stripe', 'Paquetes a banco'],
      outcome: 'Del interés al anticipo sin herramientas externas improvisadas.',
    },
    {
      id: 'plantillas-notif',
      title: 'Plantillas y notificaciones',
      intro: ['Alertas y plantillas para no perder mensajes ni citas.'],
      tools: ['Plantillas', 'Push / email / SMS / WhatsApp', 'Recordatorios'],
      outcome: 'Tu rutina comercial queda asistida por el sistema.',
    },
    {
      id: 'ia-voz',
      title: 'IA de texto y agente de voz',
      intro: [
        'Auto-respuestas, clasificación de leads, contenido social y llamadas con voz IA (entrantes, salientes, citas, campañas) según lo habilitado en tu plan.',
      ],
      tools: ['IA multi-canal', 'Clasificación de leads', 'Agente de voz', 'Triggers desde leads sociales'],
      outcome: 'Atiendes más volumen sin perder el tono humano cuando importa.',
    },
    {
      id: 'crecimiento',
      title: 'Crecimiento: reseñas, referidos y equipo',
      intro: [
        'Reseñas públicas, referidos (vendedores independientes), asistentes con permisos, compensación si estás ligado a un dealer, y reportes de ventas.',
      ],
      tools: [
        'Reseñas (invitar, moderar, responder)',
        'Programa de referidos',
        'Usuarios / asistentes',
        'Mi compensación',
        'Reportes y estadísticas',
      ],
      outcome: 'Creces en reputación, red y capacidad operativa.',
    },
  ],
  checklistTitle: 'Inventario completo para vendedores',
  checklist: [
    'Web propia con subdominio',
    'Marketplace de la plataforma',
    'Inventario con fotos y videos',
    'Leads, Kanban y workflows',
    'WhatsApp, chat y citas',
    'Redes sync + posts desde el panel',
    'Campañas, promos y banners',
    'Documentos, firmas y certificados',
    'Docs al cliente y expediente',
    'F&I y deal desk con depósitos',
    'IA y agente de voz',
    'Reseñas, referidos y reportes',
    'Acceso cuando un dealer te invita al equipo',
  ],
  dayTitle: 'Un día típico como vendedor',
  dayBody: [
    'Revisas leads e interés del marketplace/web.',
    'Publicas un auto nuevo: web + marketplace + post a Instagram desde el panel.',
    'Agenda una prueba de manejo y mandas plantilla de confirmación.',
    'Pides docs al cliente por portal y armas el deal con depósito.',
    'Cierras con PDF firmado y dejas la reseña en camino.',
  ],
  faq: [
    {
      q: '¿Necesito un sitio web aparte?',
      a: 'No. Tienes página propia con subdominio (y dominio si aplica) dentro de la plataforma.',
    },
    {
      q: '¿Puedo publicar en Facebook sin salir de AutoDealers?',
      a: 'Sí. Conectas tus redes y publicas o programas posts — incluso desde un vehículo — desde el panel.',
    },
    {
      q: '¿Mis autos solo se ven en mi página?',
      a: 'También pueden aparecer en el marketplace de la plataforma para más compradores.',
    },
    {
      q: '¿Si trabajo para un dealer?',
      a: 'El concesionario puede darte cuenta/acceso; ellos ven la operación y tú usas las herramientas de venta del día a día.',
    },
  ],
  ctaTitle: 'Empieza a vender con panel, web y marketplace',
  ctaBody:
    'Arma tu presencia, publica inventario y atiende leads desde un solo lugar — con redes y documentos incluidos en el flujo.',
  registerType: 'seller',
  registerLabel: 'Crear cuenta de vendedor',
  secondaryHref: '/demo-vendedor',
  secondaryLabel: 'Ver preview del panel',
};

export const PLATFORM_SHOWCASE: Record<AudienceType, AudienceShowcase> = {
  dealer,
  seller,
};

export function parseAudienceParam(value: string | null | undefined): AudienceType {
  if (value === 'dealer' || value === 'concesionario') return 'dealer';
  return 'seller';
}

/**
 * Configuración de información del sitio
 * 
 * NOTA: Esta configuración ahora se carga desde Firestore.
 * Para editar, ve al panel de administración: /admin/settings/site-info
 * 
 * Este archivo se mantiene como fallback si no hay conexión a Firestore.
 */

// Valores por defecto (fallback)
const DEFAULT_SITE_INFO = {
  // Información de la empresa
  name: 'AutoDealers',
  description: 'La plataforma completa para encontrar y comprar vehículos. Miles de opciones verificadas.',
  logo: 'AD', // Texto del logo o ruta a imagen

  // Información de contacto
  contact: {
    phone: '+1 (555) 123-4567',
    email: 'info@autodealers.com',
    address: '1234 Avenida Principal, Ciudad',
    hours: 'Lun-Vie: 9AM-7PM | Sáb: 9AM-5PM',
    whatsapp: '1234567890', // Número sin + ni espacios para WhatsApp link
  },

  // Copyright
  copyright: {
    year: 2025,
    company: 'AutoDealers',
    text: 'Todos los derechos reservados.',
  },

  // Texto legal/disclaimer
  disclaimer: 'Las promociones aumentan la visibilidad de los anuncios. No garantizan contactos ni ventas.',

  // Enlaces de navegación del footer
  footerLinks: {
      navigation: [
        { label: 'Vehículos', href: '#vehicles' },
        { label: 'Promociones', href: '#promotions' },
        { label: 'Concesionarios', href: '/dealers' },
        { label: 'Contacto', href: '#contact' },
      ],
    legal: [
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Términos', href: '/terminos' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },

  // Estadísticas del sitio
  statistics: {
    satisfiedCustomers: '10,000+',
    averageRating: '4.9/5',
    satisfactionRate: '99.8%',
    verifiedVehicles: '',
    certifiedDealers: '',
    warrantyIncluded: '',
    supportAvailable: '',
  },
  statisticsVisibility: {
    satisfiedCustomers: true,
    averageRating: true,
    satisfactionRate: true,
    verifiedVehicles: true,
    certifiedDealers: true,
    warrantyIncluded: true,
    supportAvailable: true,
  },
} as const;

// Exportar valores por defecto
export const SITE_INFO = DEFAULT_SITE_INFO;

// Función para cargar desde Firestore (se usa en page.tsx)
export async function getSiteInfo() {
  try {
    const response = await fetch('/api/public/site-info', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return data.siteInfo || DEFAULT_SITE_INFO;
    }
  } catch (error) {
    console.error('Error loading site info from Firestore:', error);
  }
  return DEFAULT_SITE_INFO;
}


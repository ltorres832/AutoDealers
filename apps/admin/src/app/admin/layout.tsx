'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getApps } from 'firebase/app';
import { doc, onSnapshot } from 'firebase/firestore';
import { AdminLogo } from '@/components/AdminLogo';
import { db } from '@/lib/firebase-client';
import {
  parsePlatformBrandingFirestoreData,
  PLATFORM_BRANDING_COLLECTION,
  PLATFORM_BRANDING_DOC_ID,
} from '@autodealers/shared/platform-branding-client';
import { NotificationBell } from '@/components/NotificationBell';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { MaintenanceBanner } from '@/components/MaintenanceBanner';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
import { PolicyAcceptanceModal } from '@/components/PolicyAcceptanceModal';
import { NotificationAlertsBootstrap } from '@autodealers/shared/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateLastAccess } from '@/hooks/useUpdateLastAccess';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { auth } = useAuth();
  
  // Actualizar último acceso automáticamente cuando se accede a cualquier página del admin
  useUpdateLastAccess();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [branding, setBranding] = useState({
    adminName: 'Administrador',
    adminPhoto: null as string | null,
  });

  useEffect(() => {
    fetchBranding();
    checkMaintenanceMode();
    checkRequiredPolicies();
    
    // Verificar mantenimiento cada 30 segundos
    const interval = setInterval(checkMaintenanceMode, 30000);
    return () => clearInterval(interval);
  }, [auth]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function checkRequiredPolicies() {
    if (!auth?.userId || pathname === '/login') return;

    try {
      void fetch('/api/policies/notify-updates', {
        method: 'POST',
        credentials: 'include',
      });

      const response = await fetch(
        `/api/policies/required?userId=${auth.userId}&role=admin`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.policies && data.policies.length > 0) {
          setShowPolicyModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking required policies:', error);
    }
  }

  async function checkMaintenanceMode() {
    try {
      const response = await fetch('/api/admin/maintenance/status', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaintenanceActive(data.enabled && data.affectedDashboards?.includes('admin'));
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  }

  async function fetchBranding() {
    try {
      const response = await fetch('/api/admin/settings/branding', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setBranding({
          adminName: data.adminName || 'Administrador',
          adminPhoto: data.adminPhoto || null,
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  }

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (typeof window !== 'undefined' && getApps().length > 0) {
      try {
        const ref = doc(db, PLATFORM_BRANDING_COLLECTION, PLATFORM_BRANDING_DOC_ID);
        unsub = onSnapshot(ref, (snap) => {
          if (!snap.exists()) return;
          const d = snap.data() as Record<string, unknown> | undefined;
          const p = parsePlatformBrandingFirestoreData(d, d?.updatedAt);
          setBranding({
            adminName: p.adminName,
            adminPhoto: p.adminPhoto || null,
          });
        });
      } catch {
        /* fetchBranding ya corrió en el efecto principal */
      }
    }
    const onBrandingUpdated = () => {
      void fetchBranding();
    };
    window.addEventListener('autodealers-branding-updated', onBrandingUpdated);
    return () => {
      unsub?.();
      window.removeEventListener('autodealers-branding-updated', onBrandingUpdated);
    };
  }, []);

  async function handleLogout() {
    try {
      const { unregisterWebPushToken } = await import('@autodealers/shared/client');
      await unregisterWebPushToken('/api/notifications/fcm-token');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Eliminar cookie del lado del cliente también
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // Redirigir al login
        window.location.href = '/login';
      } else {
        // Intentar redirigir de todas formas
        document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error:', error);
      // Intentar redirigir de todas formas
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  }

  const menuItems = [
      { href: '/admin/global', label: 'Vista Global', icon: '📊' },
      { href: '/admin/kpis', label: 'KPIs y Métricas', icon: '📊' },
      { href: '/admin/purchase-intents', label: 'Purchase Intents', icon: '✅' },
      { href: '/admin/reports', label: 'Reportes', icon: '📈' },
      { href: '/admin/stripe', label: 'Stripe', icon: '💳' },
      { href: '/admin/users', label: 'Usuarios', icon: '👥' },
      { href: '/admin/users/grant-rewards', label: 'Otorgar Recompensas', icon: '🎁' },
      { href: '/admin/admin-users', label: 'Usuarios Admin', icon: '👨‍💼' },
      { href: '/admin/tenants', label: 'Tenants', icon: '🏢' },
      { href: '/admin/memberships', label: 'Membresías', icon: '🎁' },
      { href: '/admin/account-billing', label: 'Sin facturación / Demo', icon: '🎫' },
      { href: '/admin/subscriptions', label: 'Suscripciones', icon: '📋' },
      { href: '/admin/dynamic-features', label: 'Features Dinámicas', icon: '✨' },
      { href: '/admin/communication-templates', label: 'Templates', icon: '📧' },
      { href: '/admin/newsletter', label: 'Newsletter / Boletines', icon: '📰' },
      { href: '/admin/communication-logs', label: 'Logs de Comunicaciones', icon: '📨' },
      { href: '/admin/public-chat', label: 'Chat Público', icon: '💬' },
      { href: '/admin/contact-inquiries', label: 'Mensajes de contacto', icon: '✉️' },
      { href: '/admin/all-leads', label: 'Todos los Leads', icon: '📞' },
      { href: '/admin/all-leads/kanban', label: 'Pipeline Kanban', icon: '📋' },
      { href: '/admin/scoring', label: 'Scoring Avanzado', icon: '⭐' },
      { href: '/admin/tags-segments', label: 'Etiquetas y Segmentos', icon: '🏷️' },
      { href: '/admin/tasks', label: 'Tareas', icon: '✅' },
      { href: '/admin/workflows', label: 'Workflows', icon: '⚙️' },
      { href: '/admin/advanced-reports', label: 'Reportes Avanzados', icon: '📊' },
      { href: '/admin/all-vehicles', label: 'Todos los Vehículos', icon: '🚗' },
      { href: '/admin/all-sales', label: 'Todas las Ventas', icon: '💰' },
      { href: '/admin/fi', label: 'F&I', icon: '💳' },
      { href: '/admin/dealers', label: 'Dealers (Aprobar)', icon: '🏢' },
      { href: '/admin/sellers', label: 'Vendedores', icon: '🧑‍💼' },
      { href: '/admin/multi-dealer-requests', label: 'Solicitudes Multi Dealer', icon: '🏢' },
      { href: '/admin/email-aliases', label: 'Aliases de Email', icon: '📧' },
      { href: '/admin/corporate-emails', label: 'Emails Corporativos', icon: '📨' },
      { href: '/admin/all-campaigns', label: 'Todas las Campañas', icon: '📢' },
      { href: '/admin/all-promotions', label: 'Todas las Promociones', icon: '🎉' },
      { href: '/admin/banners', label: 'Banners Premium', icon: '🎨' },
      { href: '/admin/internal-promotions', label: 'Promociones Internas', icon: '⭐' },
      { href: '/admin/internal-banners', label: 'Banners Internos', icon: '🎯' },
      { href: '/admin/pricing-config', label: 'Precios y Duraciones', icon: '💰' },
      { href: '/admin/reviews', label: 'Todas las Reseñas', icon: '⭐' },
      { href: '/admin/testimonials', label: 'Testimonios', icon: '💬' },
      { href: '/admin/referrals', label: 'Referidos', icon: '👥' },
      { href: '/admin/all-integrations', label: 'Todas las Integraciones', icon: '🔗' },
      { href: '/admin/landing-config', label: 'Config. Landing Page', icon: '🌐' },
      { href: '/admin/settings/free-public-listings', label: 'Publicar gratis (home)', icon: '🆓' },
      { href: '/admin/quick-listings', label: 'Anuncios particulares', icon: '📣' },
      { href: '/admin/settings/exclusive-offers', label: 'Ofertas exclusivas (home)', icon: '⚡' },
      { href: '/admin/settings/inventory-finder-cta', label: 'CTA inventario (home)', icon: '🔎' },
      { href: '/admin/settings/why-choose-us', label: 'Por qué elegirnos (home)', icon: '✓' },
      { href: '/admin/settings', label: 'Configuración del Sistema', icon: '⚙️' },
      { href: '/admin/settings/general', label: 'General y credenciales', icon: '🔐' },
      { href: '/admin/settings/notifications', label: 'Notificaciones', icon: '🔔' },
      { href: '/admin/settings/branding', label: 'Marca Personalizada', icon: '🎨' },
      { href: '/admin/settings/site-info', label: 'Info del Sitio', icon: '🌐' },
      { href: '/admin/settings/zoho-mail', label: 'Zoho Mail', icon: '📧' },
      { href: '/admin/settings/credit-providers', label: 'Proveedores de Crédito', icon: '🏦' },
      { href: '/admin/settings/crm-pipeline', label: 'Pipeline CRM (Kanban)', icon: '📊' },
      { href: '/admin/settings/ai', label: 'Configuración de IA', icon: '🤖' },
      { href: '/admin/settings/integrations', label: 'Integraciones Meta', icon: '🔗' },
      { href: '/admin/feature-flags', label: 'Feature Flags', icon: '🎛️' },
      { href: '/admin/maintenance', label: 'Modo de Mantenimiento', icon: '🔧' },
      { href: '/admin/announcements', label: 'Anuncios Globales', icon: '📢' },
      { href: '/admin/policies', label: 'Políticas y Disclosures', icon: '📜' },
      { href: '/admin/logs', label: 'Logs', icon: '📋' },
    ];

    // Menú separado para empresas externas
    const advertiserMenuItems = [
      { href: '/admin/advertisers', label: 'Anunciantes', icon: '💼' },
      { href: '/admin/sponsored-content', label: 'Contenido Patrocinado', icon: '📢' },
      { href: '/admin/advertiser-pricing', label: 'Config. Precios Stripe', icon: '💰' },
    ];

  // Si el mantenimiento está activo y afecta al admin, mostrar pantalla de mantenimiento
  if (maintenanceActive) {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <NotificationAlertsBootstrap />
      {showPolicyModal && auth?.userId && (
        <PolicyAcceptanceModal
          userId={auth.userId}
          role="admin"
          onComplete={() => setShowPolicyModal(false)}
        />
      )}
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-gray-50">
        <MaintenanceBanner />
        <AnnouncementsBanner dashboard="admin" userId={auth?.userId} />
      <button
        type="button"
        aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
        className={`fixed left-3 top-3 z-[60] flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-md md:hidden ${mobileNavOpen ? 'hidden' : ''}`}
        onClick={() => {
          setSidebarCollapsed(false);
          setMobileNavOpen(true);
        }}
      >
        <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden ${mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileNavOpen(false)}
      />
      {/* Sidebar: drawer en móvil / tablet; fijo en md+ */}
      <aside
        className={`flex h-full shrink-0 flex-col border-r border-gray-200 bg-white shadow-elegant transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-[min(20rem,92vw)] md:z-auto ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo y Header */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-6 py-4 border-b border-gray-200`}>
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <AdminLogo
                  size="lg"
                  className="max-h-[3.25rem] w-auto max-w-[min(12rem,calc(100%-2rem))] object-contain object-left"
                />
                <p className="text-xs text-gray-500">Panel Admin</p>
              </div>
            )}
            {sidebarCollapsed && (
              <AdminLogo size="sm" />
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden rounded-lg p-2 transition-colors hover:bg-gray-100 md:inline-flex"
              title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="Cerrar menú"
              onClick={() => setMobileNavOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {/* Sección Dealers/Vendedores */}
            {!sidebarCollapsed && (
              <div className="px-4 py-2 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Dealers/Vendedores
                </p>
              </div>
            )}
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="ml-3 flex-1">{item.label}</span>
                  )}
                  {isActive && !sidebarCollapsed && (
                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                  )}
                </Link>
              );
            })}

            {/* Separador */}
            {!sidebarCollapsed && (
              <div className="my-4 px-4">
                <div className="border-t border-gray-300"></div>
              </div>
            )}

            {/* Sección Empresas Externas */}
            {!sidebarCollapsed && (
              <div className="px-4 py-2 mb-2">
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  Empresas Externas
                </p>
              </div>
            )}
            {advertiserMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-900'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="ml-3 flex-1">{item.label}</span>
                  )}
                  {isActive && !sidebarCollapsed && (
                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer del Sidebar */}
          {!sidebarCollapsed && (
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 mb-3">
                {branding.adminPhoto ? (
                  <img
                    src={branding.adminPhoto}
                    alt={branding.adminName}
                    className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                    {branding.adminName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{branding.adminName}</p>
                  <p className="text-xs text-gray-500 truncate">admin@autodealers.com</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <span>🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Bar con Notificaciones */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 pl-14 sm:px-6 md:pl-8">
          <h2 className="truncate text-base font-semibold text-gray-800 sm:text-lg">Dashboard</h2>
          <NotificationBell />
        </div>
        
        <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      </div>
    </>
  );
}


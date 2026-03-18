'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AdminLogo } from '@/components/AdminLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { MaintenanceBanner } from '@/components/MaintenanceBanner';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
import { PolicyAcceptanceModal } from '@/components/PolicyAcceptanceModal';
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
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [branding, setBranding] = useState({
    companyName: 'AutoDealers',
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

  async function checkRequiredPolicies() {
    if (!auth?.userId || pathname === '/login') return;
    
    try {
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
      const response = await fetch('/api/admin/settings/branding');
      if (response.ok) {
        const data = await response.json();
        setBranding({
          companyName: data.companyName || 'AutoDealers',
          adminName: data.adminName || 'Administrador',
          adminPhoto: data.adminPhoto || null,
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  }

  async function handleLogout() {
    try {
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
      { href: '/admin/subscriptions', label: 'Suscripciones', icon: '📋' },
      { href: '/admin/dynamic-features', label: 'Features Dinámicas', icon: '✨' },
      { href: '/admin/communication-templates', label: 'Templates', icon: '📧' },
      { href: '/admin/communication-logs', label: 'Logs de Comunicaciones', icon: '📨' },
      { href: '/admin/public-chat', label: 'Chat Público', icon: '💬' },
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
      { href: '/admin/settings', label: 'Configuración del Sistema', icon: '⚙️' },
      { href: '/admin/settings/branding', label: 'Marca Personalizada', icon: '🎨' },
      { href: '/admin/settings/site-info', label: 'Info del Sitio', icon: '🌐' },
      { href: '/admin/settings/zoho-mail', label: 'Zoho Mail', icon: '📧' },
      { href: '/admin/settings/credit-providers', label: 'Proveedores de Crédito', icon: '🏦' },
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
      {showPolicyModal && auth?.userId && (
        <PolicyAcceptanceModal
          userId={auth.userId}
          role="admin"
          onComplete={() => setShowPolicyModal(false)}
        />
      )}
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <MaintenanceBanner />
        <AnnouncementsBanner dashboard="admin" userId={auth?.userId} />
      {/* Sidebar Profesional */}
      <aside className={`bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 shadow-elegant ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          {/* Logo y Header */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-6 py-4 border-b border-gray-200`}>
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <AdminLogo size="sm" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{branding.companyName}</h2>
                  <p className="text-xs text-gray-500">Panel Admin</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <AdminLogo size="sm" />
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
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
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
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
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-purple-50 hover:text-purple-900'
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
                    <div className="h-2 w-2 rounded-full bg-purple-600"></div>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar con Notificaciones */}
        <div className="bg-white border-b border-gray-200 px-8 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
          <NotificationBell />
        </div>
        
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      </div>
    </>
  );
}


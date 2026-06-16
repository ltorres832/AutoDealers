'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantLogo } from '@/components/TenantLogo';
import NotificationsPanel from '@/components/NotificationsPanel';
import NavigationWithFeatureFlags from '@/components/NavigationWithFeatureFlags';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { MaintenanceBanner } from '@/components/MaintenanceBanner';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
import { PolicyAcceptanceModal } from '@/components/PolicyAcceptanceModal';
import { NotificationAlertsBootstrap } from '@autodealers/shared/client';
import { BillingAccessGuard } from '@/components/BillingAccessGuard';
import { MustChangePasswordGate } from '@/components/MustChangePasswordGate';
import { isDealerPortalRole, isSellerRole } from '@/lib/dealer-portal-roles';
import { useRouter } from 'next/navigation';

// Rutas que no deben usar el layout wrapper
const publicRoutes = ['/login'];

const sellerNavigationItems = [
  { name: 'Página pública (fotos y videos)', href: '/settings/seller-public-page', icon: '📸', featureKey: null },
];

// Navigation items con feature flags
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', featureKey: null },
  { name: '📸 Fotos página pública', href: '/settings/trust-gallery', icon: '📸', featureKey: null },
  { name: 'Leads', href: '/leads', icon: '📞', featureKey: null },
  { name: 'Interés catálogo web', href: '/catalog-interest', icon: '👁️', featureKey: null },
  { name: 'Pipeline Kanban', href: '/leads/kanban', icon: '📋', featureKey: 'crm_kanban' },
  { name: 'CRM — Reglas de leads', href: '/settings/crm-lead-routing', icon: '🎯', featureKey: null },
  { name: 'Tareas', href: '/tasks', icon: '✅', featureKey: 'crm_tasks' },
  { name: 'Workflows', href: '/workflows', icon: '⚙️', featureKey: 'crm_workflows' },
  { name: 'Inventario', href: '/inventory', icon: '🚗', featureKey: null },
  { name: 'Mensajes', href: '/messages', icon: '💬', featureKey: null },
  { name: 'Chat Interno', href: '/internal-chat', icon: '💬', featureKey: null },
  { name: 'Chat Público', href: '/public-chat', icon: '💬', featureKey: null },
  { name: 'Anuncios', href: '/announcements', icon: '📢', featureKey: null },
  { name: 'Citas', href: '/appointments', icon: '📅', featureKey: null },
  { name: 'Campañas', href: '/campaigns', icon: '📢', featureKey: null },
  { name: 'Publicaciones Sociales', href: '/social-posts', icon: '📱', featureKey: null },
  { name: 'Promociones', href: '/promotions', icon: '🎁', featureKey: null },
  { name: 'Banners Premium', href: '/banners', icon: '🎨', featureKey: null },
  { name: 'Referidos', href: '/referrals', icon: '🎁', featureKey: null },
  { name: 'Reseñas', href: '/reviews', icon: '⭐', featureKey: null },
  { name: 'Casos de Cliente', href: '/customer-files', icon: '📁', featureKey: null },
  { name: 'F&I', href: '/fi', icon: '💰', featureKey: null },
  { name: 'Métricas F&I', href: '/fi/metrics', icon: '📊', featureKey: 'fi_metrics' },
  { name: 'Workflows F&I', href: '/fi/workflows', icon: '⚙️', featureKey: 'fi_workflows' },
  { name: 'Estadísticas de Ventas', href: '/sales-statistics', icon: '📊', featureKey: null },
  { name: 'Reportes', href: '/reports', icon: '📈', featureKey: 'crm_reports' },
  { name: 'Usuarios', href: '/users', icon: '👥', featureKey: null },
  { name: 'Mis concesionarios', href: '/dealers', icon: '🏢', featureKey: null },
  { name: 'Configuración', href: '/settings', icon: '⚙️', featureKey: null },
];

export default function DealerLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  async function fetchUser() {
    try {
      const { auth } = await import('@/lib/firebase-client');
      if (auth && auth.currentUser) {
        const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
        const response = await fetchWithAuth('/api/user', {});

        if (response.ok) {
          const data = await response.json();
          const role = data.user?.role;

          if (isSellerRole(role)) {
            setUser(data.user);
            return;
          }

          if (isDealerPortalRole(role)) {
            setUser(data.user);

            if (data.user?.mustChangePassword) {
              return;
            }

            if (
              pathname &&
              !pathname.startsWith('/settings/membership') &&
              !pathname.startsWith('/login') &&
              pathname !== '/register'
            ) {
              if (data.user?.membershipId && data.user?.status === 'active') {
                return;
              }

              if (!data.user?.membershipId) {
                try {
                  let subscriptionFound = false;
                  let retries = 0;
                  const maxRetries = 3;

                  while (!subscriptionFound && retries < maxRetries) {
                    const subResponse = await fetchWithAuth('/api/settings/membership/subscription', {});

                    if (subResponse.ok) {
                      const subData = await subResponse.json();

                      if (
                        subData.subscription &&
                        (subData.subscription.status === 'active' ||
                          subData.subscription.status === 'trialing')
                      ) {
                        subscriptionFound = true;
                        return;
                      }
                    }

                    if (!subscriptionFound && retries < maxRetries - 1) {
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      retries++;
                    } else {
                      break;
                    }
                  }

                  if (!subscriptionFound) {
                    router.replace('/settings/membership?onboarding=required');
                    return;
                  }
                } catch {
                  if (!data.user?.membershipId) {
                    router.replace('/settings/membership?onboarding=required');
                    return;
                  }
                }
              } else if (data.user?.status !== 'active') {
                router.replace('/settings/membership?onboarding=required');
                return;
              }
            }
            return;
          }

          if (role && window.location.pathname !== '/login') {
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
        } else if (response.status === 401) {
        // Solo intentar refrescar si es 401
        const { refreshAuthToken } = await import('@/lib/token-refresh');
        const newToken = await refreshAuthToken();
        
        if (newToken && newToken.length >= 200) {
          const response2 = await fetchWithAuth('/api/user', {});
          
          if (response2.ok) {
            const data2 = await response2.json();
            if (isDealerPortalRole(data2.user?.role) || isSellerRole(data2.user?.role)) {
              setUser(data2.user);
            }
          }
        }
      } else {
        // Si falla la API pero hay usuario en Firebase, usar datos básicos de Firebase
        setUser({
          id: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || 'Dealer',
          role: 'dealer',
        });
      }
    } else {
      // No hay usuario en Firebase, limpiar estado
      setUser(null);
    }
    } catch (error) {
      // Silenciar errores comunes de fetchUser
      // Si hay error pero hay usuario en Firebase, usar datos básicos
      try {
        const { auth } = await import('@/lib/firebase-client');
        if (auth && auth.currentUser) {
          setUser({
            id: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            name: auth.currentUser.displayName || 'Dealer',
            role: 'dealer',
          });
        }
      } catch (e) {
        // Ignorar errores secundarios
      }
    }
  }

  async function checkMaintenanceMode() {
    try {
      const response = await fetch('/api/maintenance/status?dashboard=dealer', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaintenanceActive(data.enabled);
      }
    } catch (error) {
      // Silenciar errores de verificación de mantenimiento
    }
  }

  const checkingPoliciesRef = useRef(false);

  async function checkRequiredPolicies() {
    if (!user?.id || pathname === '/login' || checkingPoliciesRef.current) return;
    if (isSellerRole(user.role)) return;
    
    checkingPoliciesRef.current = true;
    
    try {
      void fetch('/api/policies/notify-updates', {
        method: 'POST',
        credentials: 'include',
      });

      const response = await fetch(
        `/api/policies/required?userId=${user.id}&role=dealer${user.tenantId ? `&tenantId=${user.tenantId}` : ''}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.policies && data.policies.length > 0) {
          setShowPolicyModal(true);
        } else {
          // Si no hay políticas requeridas, asegurarse de que el modal esté cerrado
          setShowPolicyModal(false);
        }
      }
    } catch (error) {
      // Silenciar errores de verificación de políticas
    } finally {
      checkingPoliciesRef.current = false;
    }
  }
  
  async function handlePolicyModalComplete() {
    // Cerrar el modal primero
    setShowPolicyModal(false);
    // Esperar un momento y luego verificar nuevamente para asegurar que las políticas se guardaron
    setTimeout(() => {
      checkRequiredPolicies();
    }, 500);
  }

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    // No ejecutar en rutas públicas
    if (publicRoutes.includes(pathname || '')) {
      return;
    }
    
    checkMaintenanceMode();
    
    // Verificar mantenimiento cada 5 minutos (reducido de 30 segundos para menos actividad)
    const maintenanceInterval = setInterval(checkMaintenanceMode, 5 * 60 * 1000);
    
    // Configurar listener de Firebase Auth para renovar token cuando cambia el estado
    let unsubscribe: (() => void) | null = null;
    
    // Listener de Firebase Auth para detectar cambios en el estado de autenticación
    let authUnsubscribe: (() => void) | null = null;
    
    if (typeof window !== 'undefined' && pathname && !publicRoutes.includes(pathname)) {
      import('@/lib/firebase-client').then(({ auth }) => {
        if (auth) {
          const { onAuthStateChanged } = require('firebase/auth');
          authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
            if (firebaseUser) {
              // Si no hay usuario en el estado, intentar obtenerlo
              if (!user) {
                await fetchUser();
              }
              // Renovar token cuando el usuario está autenticado (solo si no estamos en ruta pública)
              if (pathname && !publicRoutes.includes(pathname)) {
                try {
                  const { ensureFreshToken } = await import('@/lib/token-refresh');
                  await ensureFreshToken();
                } catch (error) {
                  // Silenciar errores de renovación automática
                }
              }
            } else {
              setUser(null);
            }
          });
        }
      });
    }

    // Solo hacer fetch si no es una ruta pública
    let timer: NodeJS.Timeout | null = null;
    if (pathname && !publicRoutes.includes(pathname)) {
      // Solo hacer un intento después de un delay para evitar múltiples llamadas
      timer = setTimeout(() => {
        fetchUser();
      }, 500); // Reducido a 500ms, solo un intento
    }

    // Configurar renovación automática del token cada 50 minutos
    // Los tokens de Firebase expiran después de 1 hora
    // Solo renovar si hay un usuario autenticado
    const tokenRefreshInterval = setInterval(async () => {
      if (user && pathname && !publicRoutes.includes(pathname)) {
        try {
          const { ensureFreshToken } = await import('@/lib/token-refresh');
          await ensureFreshToken();
        } catch (error) {
          // Silenciar errores de renovación automática
        }
      }
    }, 50 * 60 * 1000); // 50 minutos

    return () => {
      clearInterval(maintenanceInterval);
      clearInterval(tokenRefreshInterval);
      if (timer) clearTimeout(timer);
      if (authUnsubscribe) authUnsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);

  useEffect(() => {
    if (!user?.role || !pathname || publicRoutes.includes(pathname)) return;
    if (!isSellerRole(user.role)) return;
    const allowed =
      pathname === '/settings/seller-public-page' ||
      pathname.startsWith('/settings/seller-public-page/');
    if (!allowed) {
      router.replace('/settings/seller-public-page');
    }
  }, [user, pathname, router]);

  async function handleLogout() {
    try {
      const { unregisterWebPushToken } = await import('@autodealers/shared/client');
      await unregisterWebPushToken('/api/notifications/fcm-token');

      const { auth } = await import('@/lib/firebase-client');
      if (auth) {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      }
      
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

  const sidebarNavItems = user?.role === 'seller' ? sellerNavigationItems : navigationItems;
  const homeHref = user?.role === 'seller' ? '/settings/seller-public-page' : '/dashboard';
  const portalLabel = user?.role === 'seller' ? 'Vendedor' : 'Dealer';
  const policyRole = user?.role === 'seller' ? 'seller' : 'dealer';
  const settingsHref = user?.role === 'seller' ? '/settings/seller-public-page' : '/settings';
  const settingsActive =
    user?.role === 'seller'
      ? pathname?.startsWith('/settings/seller-public-page')
      : pathname?.startsWith('/settings');

  // Si es una ruta pública, renderizar sin layout (después de todos los hooks)
  if (pathname && publicRoutes.includes(pathname)) {
    return React.createElement('div', null, children);
  }

  // Si el mantenimiento está activo, mostrar pantalla de mantenimiento
  if (maintenanceActive) {
    return React.createElement(MaintenanceScreen);
  }

  return React.createElement(
    'div',
    null,
    React.createElement(NotificationAlertsBootstrap),
    showPolicyModal && user && user.id && React.createElement(PolicyAcceptanceModal, {
      userId: user.id,
      role: policyRole,
      tenantId: user.tenantId,
      onComplete: handlePolicyModalComplete
    }),
    React.createElement(
      'div',
      { className: 'flex h-[100dvh] min-h-0 overflow-hidden bg-gray-50' },
      React.createElement(MaintenanceBanner),
      React.createElement(AnnouncementsBanner, { userId: user?.id, tenantId: user?.tenantId }),
      React.createElement('button', {
        type: 'button',
        'aria-label': 'Abrir menú',
        className: `fixed left-3 top-3 z-[60] flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-md md:hidden ${mobileNavOpen ? 'hidden' : ''}`,
        onClick: () => {
          setSidebarCollapsed(false);
          setMobileNavOpen(true);
        },
      }, React.createElement('svg', { className: 'h-6 w-6 text-gray-700', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M4 6h16M4 12h16M4 18h16' }))),
      React.createElement('div', {
        role: 'presentation',
        className: `fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden ${mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`,
        onClick: () => setMobileNavOpen(false),
      }),
      React.createElement(
        'aside',
        { className: `fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col border-r border-gray-200 bg-white shadow-elegant transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} w-[min(20rem,92vw)] ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}` },
        React.createElement('div', { className: 'flex flex-col h-full min-h-0' },
          React.createElement('div', { className: `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-6 py-4 border-b border-gray-200` },
            !sidebarCollapsed && React.createElement(Link, { href: homeHref, onClick: () => setMobileNavOpen(false), className: 'flex items-center space-x-3' },
              React.createElement(TenantLogo, { size: 'sm' }),
              React.createElement('div', null,
                React.createElement('h2', { className: 'text-lg font-bold text-gray-900' }, user?.name || 'Dashboard'),
                React.createElement('p', { className: 'text-xs text-gray-500' }, portalLabel)
              )
            ),
            sidebarCollapsed && React.createElement(Link, { href: homeHref, onClick: () => setMobileNavOpen(false) },
              React.createElement(TenantLogo, { size: 'sm' })
            ),
            React.createElement('button', {
              type: 'button',
              onClick: () => setSidebarCollapsed(!sidebarCollapsed),
              className: 'hidden rounded-lg p-2 transition-colors hover:bg-gray-100 md:inline-flex'
            },
              React.createElement('svg', { className: 'h-5 w-5 text-gray-600', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7' })
              )
            ),
            React.createElement('button', {
              type: 'button',
              className: 'rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden',
              'aria-label': 'Cerrar menú',
              onClick: () => setMobileNavOpen(false),
            },
              React.createElement('svg', { className: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })))
          ),
          React.createElement('nav', { className: 'flex-1 min-h-0 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar' },
            React.createElement(NavigationWithFeatureFlags, {
              items: sidebarNavItems,
              sidebarCollapsed: sidebarCollapsed,
              onNavigate: () => setMobileNavOpen(false),
            })
          ),

          React.createElement('div', { className: 'shrink-0 border-t border-gray-200 px-4 py-3' },
            React.createElement(Link, {
              href: settingsHref,
              onClick: () => setMobileNavOpen(false),
              className: `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all ${settingsActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`,
              title: sidebarCollapsed ? 'Configuración' : undefined
            },
              React.createElement('span', { className: 'text-xl' }, '⚙️'),
              !sidebarCollapsed && React.createElement('span', { className: 'ml-3' }, 'Configuración')
            )
          ),
          user && !sidebarCollapsed && React.createElement('div', { className: 'px-4 py-4 border-t border-gray-200' },
            React.createElement('div', { className: 'flex items-center space-x-3 mb-3' },
              React.createElement('div', { className: 'h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold' },
                user.name?.charAt(0).toUpperCase() || 'V'
              ),
              React.createElement('div', { className: 'flex-1 min-w-0' },
                React.createElement('p', { className: 'text-sm font-medium text-gray-900 truncate' }, user.name || portalLabel),
                React.createElement('p', { className: 'text-xs text-gray-500 truncate' }, user.email || '')
              )
            ),
            React.createElement('button', {
              onClick: handleLogout,
              className: 'w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-2'
            },
              React.createElement('span', null, '🚪'),
              React.createElement('span', null, 'Cerrar Sesión')
            )
          )
        )
      ),
      React.createElement('div', { className: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' },
        React.createElement('header', { className: 'flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 pl-14 sm:px-6 md:pl-6' },
          React.createElement('div', { className: 'flex min-w-0 flex-1 items-center gap-2' },
            React.createElement('h1', { className: 'truncate text-base font-semibold text-gray-900 sm:text-xl' },
              sidebarNavItems.find(nav => nav.href === pathname)?.name || (user?.role === 'seller' ? 'Mi página pública' : 'Dashboard')
            )
          ),
          React.createElement('div', { className: 'flex items-center gap-4' },
            React.createElement(NotificationsPanel),
            React.createElement('div', { className: 'flex items-center gap-3' },
              user ? React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'text-right hidden sm:block' },
                  React.createElement('p', { className: 'text-sm font-medium text-gray-900' }, user.name || portalLabel),
                  React.createElement('p', { className: 'text-xs text-gray-500' }, user.email || '')
                ),
                React.createElement('button', {
                  onClick: handleLogout,
                  className: 'px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2',
                  title: 'Cerrar Sesión'
                },
                  React.createElement('span', null, '🚪'),
                  React.createElement('span', { className: 'hidden sm:inline' }, 'Cerrar Sesión')
                )
              ) : React.createElement('button', {
                onClick: handleLogout,
                className: 'px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2',
                title: 'Cerrar Sesión'
              },
                React.createElement('span', null, '🚪'),
                React.createElement('span', { className: 'hidden sm:inline' }, 'Cerrar Sesión')
              )
            )
          )
        ),
        React.createElement('main', { className: 'custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto' },
          React.createElement('div', { className: 'mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8' },
            React.createElement(MustChangePasswordGate, { user },
              React.createElement(BillingAccessGuard, {
                tenantId: user?.tenantId,
                membershipId: user?.membershipId,
                userReady: Boolean(user?.id),
              }, children)
            )
          )
        )
      )
    )
  );
}

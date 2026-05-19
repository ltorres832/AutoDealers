'use client';

import '@/lib/fetch-interceptor';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantLogo } from '@/components/TenantLogo';
import NotificationsPanel from '@/components/NotificationsPanel';
import { cleanupInvalidTokens } from '@/lib/cleanup-invalid-tokens';
import NavigationWithFeatureFlags from '@/components/NavigationWithFeatureFlags';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { MaintenanceBanner } from '@/components/MaintenanceBanner';
import { AnnouncementsBanner } from '@/components/AnnouncementsBanner';
import { PolicyAcceptanceModal } from '@/components/PolicyAcceptanceModal';

// Rutas que no deben usar el layout wrapper
const publicRoutes = ['/login'];

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', featureKey: null },
  { name: 'Leads', href: '/leads', icon: '📞', featureKey: null },
  { name: 'Interés catálogo web', href: '/catalog-interest', icon: '👁️', featureKey: null },
  { name: 'Pipeline Kanban', href: '/leads/kanban', icon: '📋', featureKey: 'crm_kanban' },
  { name: 'Tareas', href: '/tasks', icon: '✅', featureKey: 'crm_tasks' },
  { name: 'Workflows', href: '/workflows', icon: '⚙️', featureKey: 'crm_workflows' },
  { name: 'Inventario', href: '/inventory', icon: '🚗', featureKey: null },
  { name: 'Mensajes', href: '/messages', icon: '💬', featureKey: null },
  { name: 'Chat Interno', href: '/internal-chat', icon: '💬', featureKey: null },
  { name: 'Chat Público', href: '/public-chat', icon: '💬', featureKey: null },
  { name: 'Citas', href: '/appointments', icon: '📅', featureKey: null },
  { name: 'Campañas', href: '/campaigns', icon: '📢', featureKey: null },
  { name: 'Publicaciones Sociales', href: '/social-posts', icon: '📱', featureKey: null },
  { name: 'Promociones', href: '/promotions', icon: '🎁', featureKey: null },
  { name: 'Banners Premium', href: '/banners', icon: '🎨', featureKey: null },
  { name: 'Referidos', href: '/referrals', icon: '🎁', featureKey: null },
  { name: 'Reseñas', href: '/reviews', icon: '⭐', featureKey: null },
  { name: 'Casos de Cliente', href: '/customer-files', icon: '📁', featureKey: null },
  { name: 'F&I', href: '/fi', icon: '💰', featureKey: null },
  { name: 'Estadísticas de Ventas', href: '/sales-statistics', icon: '📊', featureKey: null },
  { name: 'Reportes', href: '/reports', icon: '📈', featureKey: 'crm_reports' },
  { name: 'Usuarios', href: '/users', icon: '👥', featureKey: null },
  { name: 'Configuración', href: '/settings', icon: '⚙️', featureKey: null },
];

export default function SellerLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const fetchingUserRef = React.useRef(false);

  async function fetchUser() {
    if (fetchingUserRef.current) {
      return;
    }

    fetchingUserRef.current = true;

    try {
      const { loadCurrentSellerUser } = await import('@/lib/current-seller-user');
      const profile = await loadCurrentSellerUser();
      if (profile) {
        setUser(profile);
        return;
      }

      setUser(null);
    } catch (error) {
      console.error('Error en fetchUser:', error);
      setUser(null);
    } finally {
      fetchingUserRef.current = false;
    }
  }

  async function checkMaintenanceMode() {
    try {
      const response = await fetch('/api/maintenance/status?dashboard=seller', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaintenanceActive(data.enabled);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  }

  const checkingPoliciesRef = React.useRef(false);
  
  async function checkRequiredPolicies() {
    if (!user?.id || pathname === '/login' || checkingPoliciesRef.current) return;
    
    checkingPoliciesRef.current = true;
    
    try {
      const response = await fetch(
        `/api/policies/required?userId=${user.id}&role=seller${user.tenantId ? `&tenantId=${user.tenantId}` : ''}`,
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
      console.error('Error checking required policies:', error);
    } finally {
      checkingPoliciesRef.current = false;
    }
  }
  
  async function handlePolicyModalComplete() {
    // Cerrar el modal primero
    setShowPolicyModal(false);
    // Esperar un momento y luego verificar nuevamente para asegurar que las políticas se guardaron
    setTimeout(() => {
      checkingPoliciesRef.current = false; // Resetear el flag antes de verificar
      checkRequiredPolicies();
    }, 1000); // Aumentar el delay para dar tiempo al servidor
  }

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    checkMaintenanceMode();
    
    // Verificar mantenimiento cada 60 segundos (reducido de 30)
    const maintenanceInterval = setInterval(checkMaintenanceMode, 60000);
    
    // NO limpiar tokens automáticamente - puede expulsar usuarios después del login
    // cleanupInvalidTokens();
    
    // Listener de Firebase Auth para detectar cambios en el estado de autenticación
    let authUnsubscribe: (() => void) | null = null;
    
    if (typeof window !== 'undefined' && pathname && !publicRoutes.includes(pathname)) {
      import('@/lib/firebase-client').then(({ auth }) => {
        if (auth) {
          const { onAuthStateChanged } = require('firebase/auth');
          authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
            if (firebaseUser) {
              // Solo obtener usuario si no hay uno cargado o si el ID cambió
              if (!user || user.id !== firebaseUser.uid) {
                await fetchUser();
              }
            } else {
              setUser(null);
            }
          });
        }
      });
    }
    
    // Solo hacer fetch si no es una ruta pública y no hay usuario cargado
    let timer: NodeJS.Timeout | null = null;
    if (pathname && !publicRoutes.includes(pathname) && !user) {
      // Intentar obtener usuario inmediatamente
      fetchUser();
      
      // También intentar después de un delay solo si aún no hay usuario
      timer = setTimeout(() => {
        if (!user) {
          fetchUser();
        }
      }, 1000); // 1 segundo para dar tiempo suficiente
    }
    
    // Configurar renovación automática del token cada 45 minutos
    // Los tokens de Firebase expiran después de 1 hora, así que refrescamos antes
    const tokenRefreshInterval = setInterval(async () => {
      try {
        const { ensureFreshToken } = await import('@/lib/token-refresh');
        const token = await ensureFreshToken();
        if (token) {
          console.log('✅ Token renovado automáticamente');
        } else {
          console.warn('⚠️ No se pudo renovar el token automáticamente');
        }
      } catch (error) {
        console.error('Error al renovar token automáticamente:', error);
      }
    }, 45 * 60 * 1000); // 45 minutos (antes de que expire)

    // Verificar políticas requeridas después de obtener el usuario
    // Solo verificar una vez cuando el usuario se carga inicialmente
    let policyTimer: NodeJS.Timeout | null = null;
    if (user?.id && pathname && !publicRoutes.includes(pathname)) {
      // Usar un pequeño delay para evitar verificaciones múltiples
      policyTimer = setTimeout(() => {
        checkRequiredPolicies();
      }, 1000);
    }

    return () => {
      if (policyTimer) clearTimeout(policyTimer);
      clearInterval(maintenanceInterval);
      clearInterval(tokenRefreshInterval);
      if (timer) clearTimeout(timer);
      if (authUnsubscribe) authUnsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);

  async function handleLogout() {
    try {
      // Si hay Firebase auth, cerrar sesión ahí también
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
    showPolicyModal && user && user.id && React.createElement(PolicyAcceptanceModal, {
      userId: user.id,
      role: 'seller',
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
        React.createElement(
          'div',
          { className: 'flex flex-col h-full' },
          React.createElement(
            'div',
            { className: `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-6 py-4 border-b border-gray-200` },
            !sidebarCollapsed && React.createElement(
              Link,
              { href: '/dashboard', onClick: () => setMobileNavOpen(false), className: 'flex items-center space-x-3' },
              React.createElement(TenantLogo, { size: 'sm' }),
              React.createElement(
                'div',
                null,
                React.createElement('h2', { className: 'text-lg font-bold text-gray-900' }, user?.name || 'Dashboard'),
                React.createElement('p', { className: 'text-xs text-gray-500' }, 'Vendedor')
              )
            ),
            sidebarCollapsed && React.createElement(
              Link,
              { href: '/dashboard', onClick: () => setMobileNavOpen(false) },
              React.createElement(TenantLogo, { size: 'sm' })
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setSidebarCollapsed(!sidebarCollapsed),
                className: 'hidden rounded-lg p-2 transition-colors hover:bg-gray-100 md:inline-flex'
              },
              React.createElement('svg', {
                className: 'h-5 w-5 text-gray-600',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor'
              }, React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'
              }))
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
          React.createElement(
            'nav',
            { className: 'flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar' },
            React.createElement(NavigationWithFeatureFlags, {
              items: navigationItems,
              sidebarCollapsed: sidebarCollapsed,
              onNavigate: () => setMobileNavOpen(false),
            })
          ),
          React.createElement(
            'div',
            { className: 'px-4 py-4 border-t border-gray-200' },
            React.createElement(
              Link,
              {
                href: '/settings/branding',
                onClick: () => setMobileNavOpen(false),
                className: `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all ${
                  pathname?.startsWith('/settings')
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`,
                title: sidebarCollapsed ? 'Configuración' : undefined
              },
              React.createElement('span', { className: 'text-xl' }, '⚙️'),
              !sidebarCollapsed && React.createElement('span', { className: 'ml-3' }, 'Configuración')
            ),
            !sidebarCollapsed && pathname?.startsWith('/settings') && React.createElement(
              'div',
              { className: 'mt-2 ml-4 space-y-1' },
              React.createElement(Link, {
                href: '/settings/branding',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/branding'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Branding'),
              React.createElement(Link, {
                href: '/settings/profile',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/profile'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Perfil'),
              React.createElement(Link, {
                href: '/settings/seller-public-page',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/seller-public-page'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Video catálogo web'),
              React.createElement(Link, {
                href: '/settings/integrations',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/integrations'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Integraciones'),
              React.createElement(Link, {
                href: '/settings/templates',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/templates'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Templates'),
              React.createElement(Link, {
                href: '/settings/website',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/website'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Página Web'),
              React.createElement(Link, {
                href: '/settings/membership',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/membership'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Membresía'),
              React.createElement(Link, {
                href: '/settings/policies',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/policies'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Políticas'),
              React.createElement(Link, {
                href: '/settings/document-branding',
                onClick: () => setMobileNavOpen(false),
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/document-branding'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Branding en Documentos')
            )
          ),
          user && React.createElement(
            'div',
            { className: 'px-4 py-4 border-t border-gray-200' },
            !sidebarCollapsed ? React.createElement(
              'div',
              null,
              React.createElement(
                'div',
                { className: 'flex items-center space-x-3 mb-3' },
                React.createElement('div', {
                  className: 'h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold'
                }, user.name?.charAt(0).toUpperCase() || 'V'),
                React.createElement(
                  'div',
                  { className: 'flex-1 min-w-0' },
                  React.createElement('p', { className: 'text-sm font-medium text-gray-900 truncate' }, user.name || 'Vendedor'),
                  React.createElement('p', { className: 'text-xs text-gray-500 truncate' }, user.email || '')
                )
              ),
              React.createElement(
                'button',
                {
                  onClick: handleLogout,
                  className: 'w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-2'
                },
                React.createElement('span', null, '🚪'),
                React.createElement('span', null, 'Cerrar Sesión')
              )
            ) : React.createElement(
              'button',
              {
                onClick: handleLogout,
                className: 'w-full px-2 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center',
                title: 'Cerrar Sesión'
              },
              React.createElement('span', null, '🚪')
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' },
        React.createElement(
          'header',
          { className: 'flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 pl-14 sm:px-6 md:pl-6' },
          React.createElement(
            'div',
            { className: 'flex min-w-0 flex-1 items-center gap-2' },
            React.createElement('h1', { className: 'truncate text-base font-semibold text-gray-900 sm:text-xl' },
              navigationItems.find(nav => nav.href === pathname)?.name || 'Dashboard'
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center gap-4' },
            React.createElement(NotificationsPanel),
            React.createElement(
              'div',
              { className: 'flex items-center gap-3' },
              user ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  'div',
                  { className: 'text-right hidden sm:block' },
                  React.createElement('p', { className: 'text-sm font-medium text-gray-900' }, user.name || 'Vendedor'),
                  React.createElement('p', { className: 'text-xs text-gray-500' }, user.email || '')
                ),
                React.createElement(
                  'button',
                  {
                    onClick: handleLogout,
                    className: 'px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2',
                    title: 'Cerrar Sesión'
                  },
                  React.createElement('span', null, '🚪'),
                  React.createElement('span', { className: 'hidden sm:inline' }, 'Cerrar Sesión')
                )
              ) : React.createElement(
                'button',
                {
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
        React.createElement(
          'main',
          { className: 'custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto' },
          React.createElement(
            'div',
            { className: 'mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8' },
            children
          )
        )
      )
    )
  );
}

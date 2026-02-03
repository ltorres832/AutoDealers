'use client';

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
  const [user, setUser] = useState<any>(null);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const fetchingUserRef = React.useRef(false);

  // Inicializar interceptor de fetch para manejar tokens expirados automáticamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/fetch-interceptor').catch(err => {
        console.error('Error inicializando fetch interceptor:', err);
      });
    }
  }, []);

  async function fetchUser() {
    // Evitar múltiples llamadas simultáneas
    if (fetchingUserRef.current) {
      return;
    }
    
    fetchingUserRef.current = true;
    
    try {
      // Primero verificar si hay un usuario autenticado en Firebase
      const { auth } = await import('@/lib/firebase-client');
      if (auth && auth.currentUser) {
        // Si hay usuario en Firebase, intentar obtener datos del servidor
        let response = await fetch('/api/user', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          // Verificar que el usuario obtenido es realmente el seller actual
          if (data.user && data.user.role === 'seller' && data.user.id === auth.currentUser.uid) {
            setUser(data.user);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Usuario obtenido:', data.user?.name || data.user?.email);
            }
          } else {
            console.warn('⚠️ Usuario obtenido no coincide con el seller actual');
            // Usar datos básicos de Firebase en lugar de datos incorrectos
            setUser({
              id: auth.currentUser.uid,
              email: auth.currentUser.email || '',
              name: auth.currentUser.displayName || 'Vendedor',
              role: 'seller',
            });
          }
        } else if (response.status === 401) {
          // Solo intentar refrescar si es 401
          const { refreshAuthToken } = await import('@/lib/token-refresh');
          const newToken = await refreshAuthToken();
          
          if (newToken && newToken.length >= 200) {
            response = await fetch('/api/user', {
              credentials: 'include',
            });
            
            if (response.ok) {
              const data = await response.json();
              // Verificar que el usuario obtenido es realmente el seller actual
              if (data.user && data.user.role === 'seller' && data.user.id === auth.currentUser.uid) {
                setUser(data.user);
              } else {
                // Usar datos básicos de Firebase
                setUser({
                  id: auth.currentUser.uid,
                  email: auth.currentUser.email || '',
                  name: auth.currentUser.displayName || 'Vendedor',
                  role: 'seller',
                });
              }
            }
          }
        } else {
          // Si falla la API pero hay usuario en Firebase, usar datos básicos de Firebase
          setUser({
            id: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            name: auth.currentUser.displayName || 'Vendedor',
            role: 'seller',
          });
        }
      } else {
        // No hay usuario en Firebase, limpiar estado
        setUser(null);
      }
    } catch (error) {
      console.error('Error en fetchUser:', error);
      // Si hay error pero hay usuario en Firebase, usar datos básicos
      try {
        const { auth } = await import('@/lib/firebase-client');
        if (auth && auth.currentUser) {
          setUser({
            id: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            name: auth.currentUser.displayName || 'Vendedor',
            role: 'seller',
          });
        }
      } catch (e) {
        // Ignorar errores secundarios
      }
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
      { className: 'flex h-screen overflow-hidden bg-gray-50' },
      React.createElement(MaintenanceBanner),
      React.createElement(AnnouncementsBanner, { userId: user?.id, tenantId: user?.tenantId }),
      React.createElement(
        'aside',
        { className: `bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 shadow-elegant ${sidebarCollapsed ? 'w-20' : 'w-64'}` },
        React.createElement(
          'div',
          { className: 'flex flex-col h-full' },
          React.createElement(
            'div',
            { className: `flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-6 py-4 border-b border-gray-200` },
            !sidebarCollapsed && React.createElement(
              Link,
              { href: '/dashboard', className: 'flex items-center space-x-3' },
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
              { href: '/dashboard' },
              React.createElement(TenantLogo, { size: 'sm' })
            ),
            React.createElement(
              'button',
              {
                onClick: () => setSidebarCollapsed(!sidebarCollapsed),
                className: 'p-2 rounded-lg hover:bg-gray-100 transition-colors'
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
            )
          ),
          React.createElement(
            'nav',
            { className: 'flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar' },
            React.createElement(NavigationWithFeatureFlags, {
              items: navigationItems,
              sidebarCollapsed: sidebarCollapsed
            })
          ),
          React.createElement(
            'div',
            { className: 'px-4 py-4 border-t border-gray-200' },
            React.createElement(
              Link,
              {
                href: '/settings/branding',
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
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/branding'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Branding'),
              React.createElement(Link, {
                href: '/settings/profile',
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/profile'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Perfil'),
              React.createElement(Link, {
                href: '/settings/integrations',
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/integrations'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Integraciones'),
              React.createElement(Link, {
                href: '/settings/templates',
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/templates'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Templates'),
              React.createElement(Link, {
                href: '/settings/website',
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/website'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Página Web'),
              React.createElement(Link, {
                href: '/settings/membership',
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/membership'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Membresía'),
              React.createElement(Link, {
                href: '/settings/policies',
                className: `block px-4 py-2 rounded-lg text-sm transition-colors ${
                  pathname === '/settings/policies'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }, 'Políticas'),
              React.createElement(Link, {
                href: '/settings/document-branding',
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
        { className: 'flex-1 flex flex-col overflow-hidden' },
        React.createElement(
          'header',
          { className: 'bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-4' },
            React.createElement('h1', { className: 'text-xl font-semibold text-gray-900' },
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
          { className: 'flex-1 overflow-y-auto custom-scrollbar' },
          React.createElement(
            'div',
            { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' },
            children
          )
        )
      )
    )
  );
}

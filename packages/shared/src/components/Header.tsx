'use client';

import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
  navigation?: Array<{
    name: string;
    href: string;
    icon?: React.ReactNode;
  }>;
}

export function Header({ user, onLogout, navigation }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
          <div className="flex items-center min-w-0">
            <Logo size="sm" />
          </div>

          {navigation && navigation.length > 0 && (
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.name}
                </a>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                <div className="hidden sm:block text-right min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize truncate">{user.role}</p>
                </div>
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="hidden sm:inline-flex text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Cerrar sesión"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
              </>
            )}

            {navigation && navigation.length > 0 && (
              <button
                type="button"
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && navigation && navigation.length > 0 && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-40 bg-black/40 md:hidden"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <nav className="md:hidden relative z-50 border-t border-gray-200 bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                >
                  {item.icon && <span>{item.icon}</span>}
                  {item.name}
                </a>
              ))}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onLogout();
                  }}
                  className="mt-1 rounded-lg px-4 py-3 text-left text-red-600 hover:bg-red-50 text-sm font-medium sm:hidden"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

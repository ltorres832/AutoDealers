'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  user?: {
    name: string;
    email: string;
    role: string;
  };
  collapsed?: boolean;
}

export function Sidebar({ items, user, collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-6 py-4 border-b border-gray-200`}>
          <Logo size="sm" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <span className={`${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="ml-3 flex-1">{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-2 bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        {user && !collapsed && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}


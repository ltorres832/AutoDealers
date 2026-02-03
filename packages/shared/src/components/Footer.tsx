import React from 'react';
import { Logo } from './Logo';

interface FooterProps {
  variant?: 'light' | 'dark';
}

export function Footer({ variant = 'light' }: FooterProps) {
  return (
    <footer className={`${variant === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-white border-t border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Logo size="sm" variant={variant === 'dark' ? 'light' : 'dark'} />
            <p className={`mt-4 text-sm ${variant === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Plataforma SaaS profesional para dealers y vendedores de autos.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className={`text-sm font-semibold ${variant === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider`}>
              Producto
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Características
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Precios
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Integraciones
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={`text-sm font-semibold ${variant === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider`}>
              Soporte
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Documentación
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Contacto
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={`text-sm font-semibold ${variant === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider`}>
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Términos
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Privacidad
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm ${variant === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={`mt-8 pt-8 border-t ${variant === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <p className={`text-sm text-center ${variant === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            &copy; {new Date().getFullYear()} AutoDealers. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}






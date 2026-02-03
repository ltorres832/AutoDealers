import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoDealers - Tu Concesionario',
  description: 'Encuentra el vehículo perfecto',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // SUPRIMIR TODOS LOS ERRORES DE FIREBASE ANTES DE QUE SE CARGUE CUALQUIER CÓDIGO
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.error = function(...args) {
                  const message = args[0]?.toString() || '';
                  if (message.includes('Firebase') || 
                      message.includes('auth/invalid-credential') ||
                      message.includes('auth/') ||
                      args.some(arg => typeof arg === 'object' && arg?.code?.includes('auth'))) {
                    return;
                  }
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  const message = args[0]?.toString() || '';
                  if (message.includes('Firebase') || message.includes('auth/')) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };
                
                window.addEventListener('error', function(event) {
                  if (event.message?.includes('Firebase') || 
                      event.message?.includes('auth/invalid-credential') ||
                      event.message?.includes('auth/')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', function(event) {
                  const message = event.reason?.message || event.reason?.toString() || '';
                  if (message.includes('Firebase') || 
                      message.includes('auth/invalid-credential') ||
                      message.includes('auth/')) {
                    event.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}






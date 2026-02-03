import React from 'react';

// generateStaticParams para rutas dinámicas [subdomain]
// Retorna array vacío para permitir subdominios dinámicos en cliente
export async function generateStaticParams() {
  return [];
}

// Nota: dynamicParams no está disponible en Next.js 14 con output: 'export'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

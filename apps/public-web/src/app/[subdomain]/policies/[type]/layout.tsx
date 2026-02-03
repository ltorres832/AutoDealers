import React from 'react';

export async function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Segmento dinámico: la página usa useRouter y auth en cliente; el prerender
 * estático fallaba con useContext nulo en el árbol de Next.
 */
export const dynamic = 'force-dynamic';

export default function PreciosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

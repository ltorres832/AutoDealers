/** Banda superior de la tarjeta de contacto / perfil (título y subtítulo del hero). */
export default function ContactCardHeroHeader({
  title,
  subtitle,
  primaryColor = '#E10600',
  secondaryColor = '#0A0A0A',
  variant = 'blue',
}: {
  title: string;
  subtitle: string;
  primaryColor?: string;
  secondaryColor?: string;
  variant?: 'blue' | 'purple';
}) {
  const gradientStyle =
    variant === 'purple'
      ? undefined
      : {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        };

  return (
    <div
      className={
        variant === 'purple'
          ? '-mx-8 -mt-8 mb-6 rounded-t-lg bg-gradient-to-r from-primary-600 to-brand-red-bright600 px-8 py-6 text-white text-center'
          : '-mx-6 -mt-6 mb-5 rounded-t-lg px-6 py-5 text-white text-center'
      }
      style={gradientStyle}
    >
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
      <p className="text-base sm:text-lg text-white/90 mt-3 leading-snug max-w-2xl mx-auto">{subtitle}</p>
    </div>
  );
}

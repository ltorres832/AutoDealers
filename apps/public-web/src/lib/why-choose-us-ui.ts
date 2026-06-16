/** Mapas solo para el cliente (sin importar @autodealers/core en el bundle). */

export const WHY_CHOOSE_COLOR_THEME: Record<
  string,
  {
    cardBorder: string;
    cardBorderHover: string;
    iconBg: string;
    check: string;
    rotateClass: string;
  }
> = {
  blue: {
    cardBorder: 'border-primary-100',
    cardBorderHover: 'hover:border-primary-500',
    iconBg: 'from-primary-600 to-primary-700',
    check: 'text-primary-600',
    rotateClass: 'group-hover:rotate-6',
  },
  green: {
    cardBorder: 'border-green-100',
    cardBorderHover: 'hover:border-green-500',
    iconBg: 'from-green-500 to-green-600',
    check: 'text-green-600',
    rotateClass: 'group-hover:-rotate-6',
  },
  purple: {
    cardBorder: 'border-gray-200',
    cardBorderHover: 'hover:border-brand-black',
    iconBg: 'from-brand-black to-brand-black-deep',
    check: 'text-brand-black',
    rotateClass: 'group-hover:rotate-6',
  },
  amber: {
    cardBorder: 'border-amber-100',
    cardBorderHover: 'hover:border-amber-500',
    iconBg: 'from-amber-500 to-amber-600',
    check: 'text-amber-600',
    rotateClass: 'group-hover:-rotate-6',
  },
  rose: {
    cardBorder: 'border-primary-100',
    cardBorderHover: 'hover:border-primary-400',
    iconBg: 'from-primary-500 to-brand-red-bright',
    check: 'text-primary-600',
    rotateClass: 'group-hover:rotate-6',
  },
  slate: {
    cardBorder: 'border-slate-200',
    cardBorderHover: 'hover:border-slate-500',
    iconBg: 'from-slate-600 to-brand-black',
    check: 'text-slate-600',
    rotateClass: 'group-hover:-rotate-6',
  },
  indigo: {
    cardBorder: 'border-gray-200',
    cardBorderHover: 'hover:border-primary-500',
    iconBg: 'from-primary-700 to-primary-900',
    check: 'text-primary-700',
    rotateClass: 'group-hover:rotate-6',
  },
  teal: {
    cardBorder: 'border-teal-100',
    cardBorderHover: 'hover:border-teal-500',
    iconBg: 'from-teal-500 to-teal-600',
    check: 'text-teal-600',
    rotateClass: 'group-hover:-rotate-6',
  },
};

export function themeForColorKey(key: string) {
  return WHY_CHOOSE_COLOR_THEME[key] || WHY_CHOOSE_COLOR_THEME.blue;
}

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
    cardBorder: 'border-blue-100',
    cardBorderHover: 'hover:border-blue-500',
    iconBg: 'from-blue-500 to-blue-600',
    check: 'text-blue-600',
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
    cardBorder: 'border-purple-100',
    cardBorderHover: 'hover:border-purple-500',
    iconBg: 'from-purple-500 to-purple-600',
    check: 'text-purple-600',
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
    cardBorder: 'border-rose-100',
    cardBorderHover: 'hover:border-rose-500',
    iconBg: 'from-rose-500 to-rose-600',
    check: 'text-rose-600',
    rotateClass: 'group-hover:rotate-6',
  },
  slate: {
    cardBorder: 'border-slate-200',
    cardBorderHover: 'hover:border-slate-500',
    iconBg: 'from-slate-500 to-slate-700',
    check: 'text-slate-600',
    rotateClass: 'group-hover:-rotate-6',
  },
  indigo: {
    cardBorder: 'border-indigo-100',
    cardBorderHover: 'hover:border-indigo-500',
    iconBg: 'from-indigo-500 to-indigo-600',
    check: 'text-indigo-600',
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

export type PlatformSupportWhatsAppOption = {
  id: string;
  label: string;
  message: string;
};

export const PLATFORM_SUPPORT_WHATSAPP_OPTIONS: PlatformSupportWhatsAppOption[] = [
  {
    id: 'help',
    label: 'Necesito ayuda',
    message: 'Hola, necesito ayuda con AutoDealersOnline.',
  },
  {
    id: 'interested',
    label: 'Me interesa',
    message: 'Hola, me interesa conocer AutoDealersOnline.',
  },
  {
    id: 'more-info',
    label: 'Quiero más información',
    message: 'Hola, quiero más información sobre AutoDealersOnline.',
  },
];

/** Primera opción (compatibilidad con enlaces simples). */
export const PLATFORM_SUPPORT_WHATSAPP_MESSAGE = PLATFORM_SUPPORT_WHATSAPP_OPTIONS[0].message;

export function isPlaceholderWhatsAppNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits === '1234567890' || digits === '15551234567' || digits.length < 10;
}

export function buildWhatsAppSupportUrl(whatsapp: string, message: string): string {
  const digits = whatsapp.replace(/\D/g, '');
  if (!digits || isPlaceholderWhatsAppNumber(digits)) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildPlatformSupportWhatsAppOptions(whatsapp: string) {
  if (!whatsapp.trim() || isPlaceholderWhatsAppNumber(whatsapp)) return [];
  return PLATFORM_SUPPORT_WHATSAPP_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    message: option.message,
    url: buildWhatsAppSupportUrl(whatsapp, option.message),
  })).filter((option) => Boolean(option.url));
}

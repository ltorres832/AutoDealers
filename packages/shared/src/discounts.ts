export type PromotionDiscountType =
  | 'percentage'
  | 'fixed'
  | 'cashback'
  | 'bundle'
  | 'rebate'
  | 'bono'
  | 'none';

export const discountOptions: Array<{
  value: PromotionDiscountType;
  label: string;
  placeholder: string;
}> = [
  { value: 'percentage', label: 'Porcentaje (%)', placeholder: '15' },
  { value: 'fixed', label: 'Monto fijo ($)', placeholder: '500' },
  { value: 'cashback', label: 'Cashback ($)', placeholder: '100' },
  { value: 'bundle', label: 'Combo / Paquete', placeholder: '10' },
  { value: 'rebate', label: 'Rebate ($)', placeholder: '200' },
  { value: 'bono', label: 'Bono ($)', placeholder: '150' },
  { value: 'none', label: 'Sin descuento', placeholder: '' },
];

export const discountPlaceholders: Record<PromotionDiscountType, string> = {
  percentage: '15',
  fixed: '500',
  cashback: '100',
  bundle: '10',
  rebate: '200',
  bono: '150',
  none: '',
};

export function discountRequiresValue(type: PromotionDiscountType): boolean {
  return type !== 'none';
}


export type PromotionDiscountType = 'percentage' | 'fixed' | 'cashback' | 'bundle' | 'rebate' | 'bono' | 'none';
export declare const discountOptions: Array<{
    value: PromotionDiscountType;
    label: string;
    placeholder: string;
}>;
export declare const discountPlaceholders: Record<PromotionDiscountType, string>;
export declare function discountRequiresValue(type: PromotionDiscountType): boolean;

export const PaymentCategory = {
	FOOD: 'FOOD',
	DAILY_GOODS: 'DAILY_GOODS',
	OTHER: 'OTHER',
} as const;

export type PaymentCategory = (typeof PaymentCategory)[keyof typeof PaymentCategory];

export const PaymentCategoryLabelMap: Record<PaymentCategory, string> = {
	FOOD: '食費',
	DAILY_GOODS: '日用品',
	OTHER: 'その他',
};

export const toPaymentCategoryLabel = (category: PaymentCategory) => {
	return PaymentCategoryLabelMap[category];
};

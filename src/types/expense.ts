export const ExpenseCategory = {
	FOOD: 'FOOD',
	DAILY_GOODS: 'DAILY_GOODS',
	OTHER: 'OTHER',
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const ExpenseCategoryLabelMap: Record<ExpenseCategory, string> = {
	FOOD: '食費',
	DAILY_GOODS: '日用品',
	OTHER: 'その他',
};

export const toExpenseCategoryLabel = (category: ExpenseCategory) => {
	return ExpenseCategoryLabelMap[category];
};

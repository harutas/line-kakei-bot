/**
 * 支払い記録
 */
export interface ExpenseRecord {
	date: Date; // 支払い日時
	item: string; // 支払い内容 (例: "ランチ")
	category: string; // カテゴリ (食費、日用品など)
	amount: number; // 金額
}

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

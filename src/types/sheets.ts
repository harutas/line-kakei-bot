/**
 * Google Sheetsに書き込む支出記録（ユーザーID付き）
 */
export interface ExpenseRecordWithUser {
	date: Date;
	item: string;
	category: string;
	amount: number;
	userId: string; // LINE user ID
}

/**
 * Google Sheetsの行データ（6列）
 */
export type SheetRow = [
	string, // 日付（YYYY-MM-DD）
	string, // 年月 (YYYY-MM)
	string, // ユーザーID
	string, // カテゴリ
	string, // 品目
	number, // 金額
];

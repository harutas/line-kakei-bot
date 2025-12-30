import type { ExpenseCategory } from './expense';

export const ACTION_SELECT_CATEGORY = 'ACTION_SELECT_CATEGORY';

/**
 * Postbackアクションの種類
 */
export type PostbackAction = typeof ACTION_SELECT_CATEGORY;

/**
 * Postbackデータ
 */
export interface PostbackData {
	action: PostbackAction;
	item: string; // 支払い内容
	amount: number; // 金額
	category?: ExpenseCategory; // 選択されたカテゴリ（postback時にセット）
}

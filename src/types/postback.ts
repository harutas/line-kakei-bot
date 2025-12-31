import type { ExpenseCategory } from './expense';

export const ACTION_SELECT_CATEGORY = 'ACTION_SELECT_CATEGORY';
export const ACTION_CURRENT_MONTH_SUMMARY = 'ACTION_CURRENT_MONTH_SUMMARY';
export const ACTION_LAST_MONTH_SUMMARY = 'ACTION_LAST_MONTH_SUMMARY';
export const ACTION_HOW_TO_USE = 'ACTION_HOW_TO_USE';

/**
 * Postbackアクションの種類
 */
export type PostbackAction =
	| typeof ACTION_SELECT_CATEGORY
	| typeof ACTION_CURRENT_MONTH_SUMMARY
	| typeof ACTION_LAST_MONTH_SUMMARY
	| typeof ACTION_HOW_TO_USE;

/**
 * Postbackデータ
 */
export interface PostbackData {
	action: PostbackAction;
	content?: string; // 支払い内容（カテゴリ選択時のみ必須）
	amount?: number; // 金額（カテゴリ選択時のみ必須）
	category?: ExpenseCategory; // 選択されたカテゴリ（postback時にセット）
}

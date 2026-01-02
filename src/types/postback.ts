import type { PaymentCategory } from './payment';

export const ACTION_SELECT_CATEGORY = 'ACTION_SELECT_CATEGORY';
export const ACTION_CURRENT_MONTH_SUMMARY = 'ACTION_CURRENT_MONTH_SUMMARY';
export const ACTION_LAST_MONTH_SUMMARY = 'ACTION_LAST_MONTH_SUMMARY';
export const ACTION_HOW_TO_USE = 'ACTION_HOW_TO_USE';
export const ACTION_VIEW_WEEK_PAYMENTS = 'ACTION_VIEW_WEEK_PAYMENTS';
export const ACTION_PAYMENT_DETAIL = 'ACTION_PAYMENT_DETAIL';
export const ACTION_DELETE_PAYMENT = 'ACTION_DELETE_PAYMENT';
export const ACTION_CONFIRM_DELETE = 'ACTION_CONFIRM_DELETE';
export const ACTION_CANCEL_DELETE = 'ACTION_CANCEL_DELETE';

/**
 * Postbackアクションの種類
 */
export type PostbackAction =
	| typeof ACTION_SELECT_CATEGORY
	| typeof ACTION_CURRENT_MONTH_SUMMARY
	| typeof ACTION_LAST_MONTH_SUMMARY
	| typeof ACTION_HOW_TO_USE
	| typeof ACTION_VIEW_WEEK_PAYMENTS
	| typeof ACTION_PAYMENT_DETAIL
	| typeof ACTION_DELETE_PAYMENT
	| typeof ACTION_CONFIRM_DELETE
	| typeof ACTION_CANCEL_DELETE;

/**
 * Postbackデータ
 */
export interface PostbackData {
	action: PostbackAction;
	content?: string; // 支払い内容（カテゴリ選択時のみ必須）
	amount?: number; // 金額（カテゴリ選択時のみ必須）
	category?: PaymentCategory; // 選択されたカテゴリ（postback時にセット）
	paymentId?: string; // 支払いID（削除・編集時に使用）
}

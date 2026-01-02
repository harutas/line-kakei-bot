import {
	PaymentCategory,
	PaymentCategoryLabelMap,
	type PaymentCategory as PaymentCategoryType,
} from '../types/payment';
import { formatMonthDisplay } from '../utils/datetime';

/**
 * 集計メッセージをフォーマット
 */
export const formatSummaryMessage = (
	period: string,
	summary: {
		totalAmount: number;
		categoryTotals: Record<PaymentCategoryType, number>;
		recordCount: number;
	},
): string => {
	// カテゴリ別の内訳を動的に生成
	const categoryLines = Object.values(PaymentCategory).map((category) => {
		const label = PaymentCategoryLabelMap[category];
		const amount = summary.categoryTotals[category] || 0;
		return `${label}: ${amount.toLocaleString()}円`;
	});

	return [
		`${period}の支払い合計: ${summary.totalAmount.toLocaleString()}円`,
		'',
		'カテゴリ別:',
		...categoryLines,
		'',
		`記録件数: ${summary.recordCount}件`,
	].join('\n');
};

/**
 * カテゴリ選択メッセージをフォーマット
 */
export const formatCategorySelectionMessage = (content: string, amount: number): string => {
	return `「${content}」で${amount.toLocaleString()}円だね。\nカテゴリを選んでね！`;
};

/**
 * 記録完了メッセージをフォーマット
 */
export const formatRecordCompletionMessage = (
	category: PaymentCategoryType,
	content: string,
	amount: number,
	monthlyTotal: number,
	paymentDate: Date,
): string => {
	const monthDisplay = formatMonthDisplay(paymentDate);
	return [
		'記録したよ！',
		`${PaymentCategoryLabelMap[category]}： ${content} ${amount.toLocaleString()}円`,
		`${monthDisplay}は${monthlyTotal.toLocaleString()}円支払ったよ`,
	].join('\n');
};

/**
 * 使い方メッセージ
 */
export const HOW_TO_USE_MESSAGE = [
	'【使い方】',
	'',
	'支払い内容と金額を入力してね！',
	'',
	'例1:',
	'ランチ',
	'1200',
	'',
	'例2:',
	'ランチ 1200',
	'',
	'カテゴリを選択すると記録されるよ！',
].join('\n');

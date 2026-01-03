import type { messagingApi } from '@line/bot-sdk';
import type { MonthlySummaryEntity } from '../databases/entities/MonthlySummaryEntity';
import type { PaymentEntity } from '../databases/entities/PaymentEntity';
import { PaymentCategory, PaymentCategoryLabelMap } from '../types/payment';
import { dayjs, formatMonthDisplay } from '../utils/datetime';

/**
 * テキストメッセージにフォーマット
 */
export const formatTextMessage = (
	text: string,
	quickReply?: messagingApi.QuickReply,
): messagingApi.TextMessage => {
	return {
		type: 'text',
		text,
		quickReply,
	};
};

/**
 * 集計メッセージをフォーマット
 */
export const formatMonthlySummaryMessage = (
	summary: MonthlySummaryEntity,
): messagingApi.TextMessage => {
	// カテゴリ別の内訳を動的に生成
	const categoryLines = Object.values(PaymentCategory).map((category) => {
		const label = PaymentCategoryLabelMap[category];
		const amount = summary.categoryTotals[category] || 0;
		return `${label}: ${amount.toLocaleString()}円`;
	});
	const month = dayjs(summary.yearMonth, 'YYYY-MM', 'Asia/Tokyo', true).startOf('month').toDate();
	const monthDisplay = formatMonthDisplay(month);

	return formatTextMessage(
		[
			`${monthDisplay}の支払い合計: ${summary.totalAmount.toLocaleString()}円`,
			'',
			'カテゴリ別:',
			...categoryLines,
			'',
			`記録件数: ${summary.recordCount}件`,
		].join('\n'),
	);
};

/**
 * 記録完了メッセージをフォーマット
 */
export const formatRecordCompletionMessage = (params: {
	payment: PaymentEntity;
	monthlySummary: MonthlySummaryEntity;
}): messagingApi.TextMessage => {
	const { payment, monthlySummary } = params;
	const { category, amount, date } = payment;
	const monthDisplay = formatMonthDisplay(date);
	return formatTextMessage(
		[
			'記録したよ！',
			`${PaymentCategoryLabelMap[category]}： ${payment.content} ${amount.toLocaleString()}円`,
			`${monthDisplay}は${monthlySummary.totalAmount.toLocaleString()}円支払ったよ`,
		].join('\n'),
	);
};

/**
 * 使い方メッセージ
 */
export const formatHowToUse = () => {
	return formatTextMessage(
		[
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
		].join('\n'),
	);
};

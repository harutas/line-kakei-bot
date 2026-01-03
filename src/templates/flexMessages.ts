import type { messagingApi } from '@line/bot-sdk';
import type { PaymentEntity } from '../databases/entities/PaymentEntity';
import { toPaymentCategoryLabel } from '../types/payment';
import {
	ACTION_CANCEL_DELETE,
	ACTION_CONFIRM_DELETE,
	ACTION_DELETE_PAYMENT,
	ACTION_PAYMENT_DETAIL,
	type PostbackData,
} from '../types/postback';
import { dayjs } from '../utils/datetime';

/**
 * 支払い一覧のFlex Message Bubbleを生成
 * @param payments - 支払い一覧（最大5件）
 * @param title - ヘッダータイトル
 */
export function createPaymentListBubble(
	payments: PaymentEntity[],
	title: string,
): messagingApi.FlexBubble {
	// 各支払いをボタンに変換
	const buttons: messagingApi.FlexButton[] = payments.map((payment) => {
		const dateStr = dayjs.tz(payment.date, 'Asia/Tokyo').format('M/D');
		const postbackData: PostbackData = {
			action: ACTION_PAYMENT_DETAIL,
			paymentId: payment.id,
		};

		return {
			type: 'button',
			action: {
				type: 'postback',
				label: `${dateStr}｜${payment.content}｜¥${payment.amount.toLocaleString()}`,
				data: JSON.stringify(postbackData),
			},
			style: 'secondary',
			height: 'sm',
		};
	});

	return {
		type: 'bubble',
		size: 'giga',
		header: {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: title,
					weight: 'bold',
					size: 'lg',
				},
			],
			paddingAll: 'lg',
			backgroundColor: '#f5f5f5',
		},
		body: {
			type: 'box',
			layout: 'vertical',
			contents: buttons,
			spacing: 'lg',
			paddingAll: 'lg',
		},
	};
}

/**
 * 支払い一覧のFlex Message Bubbleを生成
 * @param payment - 支払い一覧（最大5件）
 * @param title - ヘッダータイトル
 */
export function createPaymentBubble(
	payment: PaymentEntity,
	title: string,
): messagingApi.FlexBubble {
	const postbackData: PostbackData = {
		action: ACTION_DELETE_PAYMENT,
		paymentId: payment.id,
	};

	return {
		type: 'bubble',
		header: {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: title,
					weight: 'bold',
					size: 'md',
				},
			],
			paddingAll: 'lg',
			backgroundColor: '#f5f5f5',
		},
		body: {
			type: 'box',
			layout: 'vertical',
			paddingAll: 'lg',
			paddingBottom: 'none',
			contents: [
				{
					type: 'text',
					text: payment.content,
					weight: 'bold',
					size: 'lg',
					flex: 1,
				},
				{
					type: 'box',
					layout: 'vertical',
					margin: 'md',
					spacing: 'sm',
					contents: [
						{
							type: 'box',
							layout: 'baseline',
							spacing: 'sm',
							contents: [
								{
									type: 'text',
									text: '金額',
									color: '#aaaaaa',
									size: 'md',
									flex: 2,
								},
								{
									type: 'text',
									text: `¥${payment.amount.toLocaleString()}`,
									wrap: true,
									color: '#666666',
									size: 'md',
									flex: 5,
								},
							],
						},
						{
							type: 'box',
							layout: 'baseline',
							spacing: 'sm',
							contents: [
								{
									type: 'text',
									text: 'カテゴリ',
									color: '#aaaaaa',
									size: 'md',
									flex: 2,
								},
								{
									type: 'text',
									text: toPaymentCategoryLabel(payment.category),
									wrap: true,
									color: '#666666',
									size: 'md',
									flex: 5,
								},
							],
						},
						{
							type: 'box',
							layout: 'baseline',
							spacing: 'sm',
							contents: [
								{
									type: 'text',
									text: '日付',
									color: '#aaaaaa',
									size: 'md',
									flex: 2,
								},
								{
									type: 'text',
									text: dayjs.tz(payment.date, 'Asia/Tokyo').format('YYYY-MM-DD HH:mm'),
									wrap: true,
									color: '#666666',
									size: 'md',
									flex: 5,
								},
							],
						},
					],
				},
			],
		},
		footer: {
			type: 'box',
			layout: 'vertical',
			spacing: 'sm',
			paddingAll: 'lg',
			contents: [
				{
					type: 'button',
					style: 'secondary',
					height: 'sm',
					action: {
						label: '削除',
						type: 'postback',
						data: JSON.stringify(postbackData),
						displayText: '削除',
					},
				},
			],
		},
	};
}

/**
 * 削除確認メッセージ
 */
export const formatDeleteConfirmation = (payment: PaymentEntity): messagingApi.TemplateMessage => {
	const confirmData: PostbackData = {
		action: ACTION_CONFIRM_DELETE,
		paymentId: payment.id,
	};

	const cancelData: PostbackData = {
		action: ACTION_CANCEL_DELETE,
	};

	return {
		type: 'template',
		altText: '削除確認',
		template: {
			type: 'confirm',
			text: [
				`${payment.content}`,
				`¥${payment.amount.toLocaleString()}`,
				``,
				`この支出を削除しても大丈夫？`,
			].join('\n'),
			actions: [
				{
					type: 'postback',
					label: 'はい',
					data: JSON.stringify(confirmData),
					displayText: '削除する',
				},
				{
					type: 'postback',
					label: 'いいえ',
					data: JSON.stringify(cancelData),
					displayText: 'キャンセル',
				},
			],
		},
	};
};

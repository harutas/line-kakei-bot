import type { messagingApi } from '@line/bot-sdk';
import type { PaymentEntity } from '../databases/entities/PaymentEntity';
import { createPaymentListBubble } from '../templates/flexMessages';

/**
 * 支払い一覧を5件ごとに分割してFlex Message Bubbleの配列を生成
 * @param payments - 支払い一覧
 * @returns Flex Bubble配列（最大5個、つまり最大25件の支払いを表示）
 */
export function buildPaymentListBubbles(payments: PaymentEntity[]): messagingApi.FlexBubble[] {
	const bubbles: messagingApi.FlexBubble[] = [];
	const ITEMS_PER_BUBBLE = 5;
	const MAX_BUBBLES = 5;

	// 5件ずつに分割してBubbleを生成
	for (let i = 0; i < payments.length && bubbles.length < MAX_BUBBLES; i += ITEMS_PER_BUBBLE) {
		const chunk = payments.slice(i, i + ITEMS_PER_BUBBLE);
		const bubbleNumber = bubbles.length + 1;
		const title = bubbles.length === 0 ? '今週の支払い' : `今週の支払い（${bubbleNumber}）`;

		bubbles.push(createPaymentListBubble(chunk, title));
	}

	return bubbles;
}

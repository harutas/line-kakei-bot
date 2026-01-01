import {
	type ClientConfig,
	messagingApi,
	type QuickReply,
	type QuickReplyItem,
	type TextMessage,
} from '@line/bot-sdk';
import { PaymentCategory, toPaymentCategoryLabel } from '../types/payment';
import { ACTION_SELECT_CATEGORY, type PostbackData } from '../types/postback';
import logger from '../utils/logger';

const log = logger.child({ service: 'LineService' });

const clientConfig: ClientConfig = {
	channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};

class LineService {
	private client: messagingApi.MessagingApiClient;

	constructor() {
		this.client = new messagingApi.MessagingApiClient(clientConfig);
	}

	async showLoading(userId: string) {
		await this.client.showLoadingAnimation({ chatId: userId, loadingSeconds: 10 });
	}

	/**
	 * テキストメッセージを返信
	 * @param replyToken - 返信トークン
	 * @param text - 送信するテキスト
	 */
	async replyText(replyToken: string, text: string): Promise<void> {
		try {
			const message: TextMessage = {
				type: 'text',
				text,
			};

			await this.client.replyMessage({
				replyToken,
				messages: [message],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send text message');
			throw error;
		}
	}

	/**
	 * カテゴリ選択のQuick Replyを送信
	 * @param replyToken - 返信トークン
	 * @param content - 支払い内容
	 * @param amount - 金額
	 */
	async replyWithCategorySelection(
		replyToken: string,
		content: string,
		amount: number,
	): Promise<void> {
		try {
			const quickReplyItems: QuickReplyItem[] = Object.values(PaymentCategory).map((category) => {
				const data: PostbackData = {
					action: ACTION_SELECT_CATEGORY,
					content,
					amount,
					category,
				};
				return {
					type: 'action',
					action: {
						type: 'postback',
						label: toPaymentCategoryLabel(category),
						data: JSON.stringify(data),
						displayText: toPaymentCategoryLabel(category),
					},
				};
			});

			const quickReply: QuickReply = {
				items: quickReplyItems,
			};

			const message: TextMessage = {
				type: 'text',
				text: `「${content}」で${amount.toLocaleString()}円だね。\nカテゴリを選んでね！`,
				quickReply,
			};

			await this.client.replyMessage({
				replyToken,
				messages: [message],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send category selection');
			throw error;
		}
	}

	/**
	 * 記録完了メッセージを送信
	 * @param replyToken - 返信トークン
	 * @param content - 支払い内容
	 * @param category - カテゴリ
	 * @param amount - 金額
	 */
	async replyWithCompletionAndSummary(
		replyToken: string,
		data: {
			category: PaymentCategory;
			content: string;
			amount: number;
			monthlyTotal: number;
		},
	): Promise<void> {
		try {
			const message: TextMessage = {
				type: 'text',
				text: [
					`記録したよ！`,
					`${toPaymentCategoryLabel(
						data.category,
					)}： ${data.content} ${data.amount.toLocaleString()}円`,
					`今月は${data.monthlyTotal.toLocaleString()}円支払ったよ`,
				].join('\n'),
			};

			await this.client.replyMessage({
				replyToken,
				messages: [message],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send completion message');
			throw error;
		}
	}
}

export default new LineService();

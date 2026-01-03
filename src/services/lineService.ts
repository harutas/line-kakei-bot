import { type ClientConfig, messagingApi } from '@line/bot-sdk';
import type { MonthlySummaryEntity } from '../databases/entities/MonthlySummaryEntity';
import type { PaymentEntity } from '../databases/entities/PaymentEntity';
import { createPaymentBubble, formatDeleteConfirmation } from '../templates/flexMessages';
import {
	formatHowToUse,
	formatMonthlySummaryMessage,
	formatRecordCompletionMessage,
	formatTextMessage,
} from '../templates/messages';
import { PaymentCategory, toPaymentCategoryLabel } from '../types/payment';
import {
	ACTION_RECORD_TODAY,
	ACTION_SELECT_CATEGORY,
	ACTION_SELECT_DATE,
	type PostbackData,
} from '../types/postback';
import { getMinPaymentDate, getTodayDate } from '../utils/datetime';
import { buildPaymentListBubbles } from '../utils/flexMessageBuilder';
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
			await this.client.replyMessage({
				replyToken,
				messages: [formatTextMessage(text)],
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
			const quickReplyItems: messagingApi.QuickReplyItem[] = Object.values(PaymentCategory).map(
				(category) => {
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
				},
			);

			const quickReply: messagingApi.QuickReply = {
				items: quickReplyItems,
			};

			await this.client.replyMessage({
				replyToken,
				messages: [
					formatTextMessage(
						`「${content}」で${amount.toLocaleString()}円だね。\nカテゴリを選んでね！`,
						quickReply,
					),
				],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send category selection');
			throw error;
		}
	}

	/**
	 * 日付選択確認メッセージを送信
	 * @param replyToken - 返信トークン
	 * @param content - 支払い内容
	 * @param amount - 金額
	 * @param category - 選択されたカテゴリ
	 */
	async replyWithDateSelection(
		replyToken: string,
		content: string,
		amount: number,
		category: PaymentCategory,
	): Promise<void> {
		try {
			const todayData: PostbackData = {
				action: ACTION_RECORD_TODAY,
				content,
				amount,
				category,
			};

			const selectDateData: PostbackData = {
				action: ACTION_SELECT_DATE,
				content,
				amount,
				category,
			};

			const minDate = getMinPaymentDate();
			const maxDate = getTodayDate();

			const message: messagingApi.TemplateMessage = {
				type: 'template',
				altText: '日付を選択してください',
				template: {
					type: 'buttons',
					text: `登録する日付を選択してね`,
					actions: [
						{
							type: 'postback',
							label: '今日で登録',
							data: JSON.stringify(todayData),
							displayText: '今日で登録',
						},
						{
							type: 'datetimepicker',
							label: '日付を選択',
							data: JSON.stringify(selectDateData),
							mode: 'datetime',
							initial: maxDate,
							max: maxDate,
							min: minDate,
						},
					],
				},
			};

			await this.client.replyMessage({
				replyToken,
				messages: [message],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send date selection');
			throw error;
		}
	}

	/**
	 * 記録完了メッセージを送信
	 */
	async replyWithCompletionAndSummary(
		replyToken: string,
		params: {
			payment: PaymentEntity;
			monthlySummary: MonthlySummaryEntity;
		},
	): Promise<void> {
		try {
			await this.client.replyMessage({
				replyToken,
				messages: [formatRecordCompletionMessage(params)],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send completion message');
			throw error;
		}
	}

	/**
	 * 月間の集計メッセージを送信
	 */
	async replyWithMonthlySummary(
		replyToken: string,
		monthlySummary: MonthlySummaryEntity,
	): Promise<void> {
		try {
			await this.client.replyMessage({
				replyToken,
				messages: [formatMonthlySummaryMessage(monthlySummary)],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send summary message');
			throw error;
		}
	}

	/**
	 * 支払い一覧をFlex Messageで送信
	 * @param replyToken - 返信トークン
	 * @param payments - 支払い一覧
	 */
	async replyWithPaymentList(replyToken: string, payments: PaymentEntity[]): Promise<void> {
		try {
			// 支払いが0件の場合
			if (payments.length === 0) {
				await this.replyText(replyToken, '今週の支払いはまだないよ！');
				return;
			}

			// Flex Message Bubbleを生成（5件ごと、最大5メッセージ）
			const bubbles = buildPaymentListBubbles(payments);

			let message: messagingApi.FlexMessage;

			// 1つのbubbleの場合はそのまま送信
			if (bubbles.length === 1) {
				message = {
					type: 'flex',
					altText: '今週の支払い一覧',
					contents: bubbles[0],
				};
			} else {
				// 複数のbubbleの場合はカルーセル形式で送信
				message = {
					type: 'flex',
					altText: '今週の支払い一覧',
					contents: {
						type: 'carousel',
						contents: bubbles,
					},
				};
			}

			await this.client.replyMessage({
				replyToken,
				messages: [message],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send payment list');
			throw error;
		}
	}

	/**
	 * 支払い情報をFlex Messageで送信
	 * @param replyToken - 返信トークン
	 * @param payment - 支払い情報
	 */
	async replyWithPaymentDetail(replyToken: string, payment: PaymentEntity): Promise<void> {
		try {
			const message: messagingApi.FlexMessage = {
				type: 'flex',
				altText: '支払い明細',
				contents: createPaymentBubble(payment, '支払い明細'),
			};

			await this.client.replyMessage({
				replyToken,
				messages: [message],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send payment list');
			throw error;
		}
	}

	/**
	 * 削除確認メッセージを送信
	 * @param replyToken - 返信トークン
	 * @param payment - 削除対象の支払い
	 */
	async replyWithDeleteConfirmation(replyToken: string, payment: PaymentEntity): Promise<void> {
		try {
			await this.client.replyMessage({
				replyToken,
				messages: [formatDeleteConfirmation(payment)],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send delete confirmation');
			throw error;
		}
	}

	/**
	 * 使い方メッセージを送信
	 */
	async replyWithHowToUse(replyToken: string): Promise<void> {
		try {
			await this.client.replyMessage({
				replyToken,
				messages: [formatHowToUse()],
			});
		} catch (error) {
			log.error({ err: error, replyToken }, 'Failed to send delete confirmation');
			throw error;
		}
	}
}

export default new LineService();

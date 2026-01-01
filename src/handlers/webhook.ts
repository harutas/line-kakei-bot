import { HTTPFetchError, type MessageAPIResponseBase, type webhook } from '@line/bot-sdk';
import type { Request, Response } from 'express';
import lineService from '../services/lineService';
import paymentService from '../services/paymentService';
import { formatSummaryMessage, HOW_TO_USE_MESSAGE } from '../templates/messages';
import {
	ACTION_CURRENT_MONTH_SUMMARY,
	ACTION_HOW_TO_USE,
	ACTION_LAST_MONTH_SUMMARY,
	ACTION_SELECT_CATEGORY,
	type PostbackData,
} from '../types/postback';
import { dayjs } from '../utils/datetime';
import { parseExpenseInput } from '../utils/expenseParser';
import logger from '../utils/logger';

const log = logger.child({ handler: 'webhook' });

/**
 * テキストメッセージハンドラー
 * 支払い内容と金額をパースしてカテゴリ選択を表示
 */
const textEventHandler = async (
	event: webhook.Event,
): Promise<MessageAPIResponseBase | undefined> => {
	if (event.type !== 'message' || event.message.type !== 'text') {
		return;
	}

	if (!event.replyToken) {
		return;
	}

	const messageText = event.message.text.trim();

	// 支払い内容と金額をパース
	const parsed = parseExpenseInput(messageText);

	if (!parsed) {
		// パースできない場合はヘルプメッセージ
		await lineService.replyText(event.replyToken, HOW_TO_USE_MESSAGE);
		return;
	}

	const { content, amount } = parsed;

	// 金額のバリデーション
	if (amount <= 0 || amount > 1000000) {
		await lineService.replyText(event.replyToken, '金額は1円〜1,000,000円の範囲で入力してね');
		return;
	}

	// カテゴリ選択表示（item, amountをpostbackに埋め込む）
	await lineService.replyWithCategorySelection(event.replyToken, content, amount);
};

/**
 * Postbackイベントハンドラー
 * カテゴリ選択、集計表示、使い方表示を処理
 */
const postbackEventHandler = async (
	event: webhook.Event,
): Promise<MessageAPIResponseBase | undefined> => {
	if (event.type !== 'postback') {
		return;
	}

	if (!event.replyToken) {
		return;
	}

	try {
		const now = new Date();
		const data: PostbackData = JSON.parse(event.postback.data);

		// ユーザーIDを取得
		const userId = event.source?.userId;
		if (!userId) {
			log.warn({ event }, 'User ID not found');
			await lineService.replyText(event.replyToken, 'エラーが発生しました');
			return;
		}

		// ローディング表示
		await lineService.showLoading(userId);

		switch (data.action) {
			case ACTION_SELECT_CATEGORY: {
				// カテゴリ選択を選択して記録

				// カテゴリ、支払い内容、金額がない
				if (!data.category || !data.content || !data.amount) {
					log.warn({ data }, 'Missing data in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				// 支払い記録の保存
				const record = await paymentService.record({
					userId,
					date: now,
					category: data.category,
					content: data.content,
					amount: data.amount,
				});

				log.info({ record }, 'Payment recorded to Firestore');

				// 今月の集計取得
				const monthlySummary = await paymentService.getMonthlySummary(userId, now);

				await lineService.replyWithCompletionAndSummary(event.replyToken, {
					content: data.content,
					category: data.category,
					amount: data.amount,
					monthlyTotal: monthlySummary.totalAmount,
				});
				break;
			}

			case ACTION_CURRENT_MONTH_SUMMARY: {
				// 今月の集計を表示
				const currentSummary = await paymentService.getMonthlySummaryWithDetails(userId, now);
				await lineService.replyText(event.replyToken, formatSummaryMessage('今月', currentSummary));
				break;
			}

			case ACTION_LAST_MONTH_SUMMARY: {
				// 先月の集計を表示
				const lastMonthDate = dayjs.tz(now, 'Asia/Tokyo').subtract(1, 'month').toDate();
				const lastSummary = await paymentService.getMonthlySummaryWithDetails(
					userId,
					lastMonthDate,
				);
				await lineService.replyText(event.replyToken, formatSummaryMessage('先月', lastSummary));
				break;
			}

			case ACTION_HOW_TO_USE: {
				// 使い方を表示
				await lineService.replyText(event.replyToken, HOW_TO_USE_MESSAGE);
				break;
			}

			default: {
				log.error({ action: data.action }, 'Unknown postback action');
				await lineService.replyText(event.replyToken, 'エラーが発生しました');
				break;
			}
		}
	} catch (error) {
		log.error({ err: error, event }, 'Failed to handle postback');
		await lineService.replyText(event.replyToken, '記録に失敗しました。もう一度試してください。');
	}
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
	const callbackRequest: webhook.CallbackRequest = req.body;
	const events: webhook.Event[] = callbackRequest.events ?? [];

	try {
		await Promise.all(
			events.map(async (event: webhook.Event) => {
				// イベントタイプに応じて処理を振り分け
				if (event.type === 'message') {
					await textEventHandler(event);
				} else if (event.type === 'postback') {
					await postbackEventHandler(event);
				}
			}),
		);

		res.status(200).json({ message: 'ok' });
	} catch (err: unknown) {
		if (err instanceof HTTPFetchError) {
			log.error(
				{
					err: err,
					status: err.status,
					requestId: err.headers.get('x-line-request-id'),
					body: err.body,
				},
				'LINE API error',
			);
		} else if (err instanceof Error) {
			log.error({ err }, 'Error handling webhook event');
		}

		res.status(500).json({
			status: 'error',
		});
	}
};

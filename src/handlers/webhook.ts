import { HTTPFetchError, type MessageAPIResponseBase, type webhook } from '@line/bot-sdk';
import type { Request, Response } from 'express';
import expenseService from '../services/expenseService';
import lineService from '../services/lineService';
import { ACTION_SELECT_CATEGORY, type PostbackData } from '../types/postback';
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
		await lineService.replyText(
			event.replyToken,
			'支払い内容と金額を入力してね！\n\n例：\nランチ\n1200\n\nまたは：\nランチ 1200',
		);
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
 * カテゴリ選択を処理
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

		// カテゴリの選択じゃない
		if (data.action !== ACTION_SELECT_CATEGORY) {
			log.error({ action: data.action }, 'Unknown postback action');
			await lineService.replyText(event.replyToken, 'エラーが発生しました');
			return;
		}

		// カテゴリ、支払い内容、金額がない
		if (!data.category || !data.content || !data.amount) {
			log.warn({ data }, 'Missing data in postback');
			await lineService.replyText(event.replyToken, 'エラーが発生しました');
			return;
		}

		// ユーザーIDがない
		const userId = event.source?.userId;
		if (!userId) {
			log.warn({ event }, 'User ID not found');
			await lineService.replyText(event.replyToken, 'エラーが発生しました');
			return;
		}

		// ローディング表示
		await lineService.showLoading(userId);

		// 支払い記録の保存
		const record = await expenseService.record({
			userId,
			date: now,
			category: data.category,
			content: data.content,
			amount: data.amount,
		});

		log.info({ record }, 'Expense recorded to Firestore');

		// 今月の集計取得
		const monthlySummary = await expenseService.getMonthlySummary(userId, now);

		await lineService.replyWithCompletionAndSummary(event.replyToken, {
			content: data.content,
			category: data.category,
			amount: data.amount,
			monthlyTotal: monthlySummary.totalAmount,
		});
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

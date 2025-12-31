import { HTTPFetchError, type MessageAPIResponseBase, type webhook } from '@line/bot-sdk';
import type { Request, Response } from 'express';
import googleSheetsService from '../services/googleSheetsService';
import lineService from '../services/lineService';
import { toExpenseCategoryLabel } from '../types/expense';
import { ACTION_SELECT_CATEGORY, type PostbackData } from '../types/postback';
import type { ExpenseRecordWithUser } from '../types/sheets';
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

	const { item, amount } = parsed;

	// 金額のバリデーション
	if (amount <= 0 || amount > 1000000) {
		await lineService.replyText(event.replyToken, '金額は1円〜1,000,000円の範囲で入力してね');
		return;
	}

	// カテゴリ選択表示（item, amountをpostbackに埋め込む）
	await lineService.replyWithCategorySelection(event.replyToken, item, amount);
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
		const data: PostbackData = JSON.parse(event.postback.data);

		if (data.action === ACTION_SELECT_CATEGORY) {
			// カテゴリ、支払い内容、金額を取得
			if (!data.category || !data.item || !data.amount) {
				log.warn({ data }, 'Missing data in postback');
				await lineService.replyText(event.replyToken, 'エラーが発生しました');
				return;
			}

			// ユーザーIDの取得と検証
			const userId = event.source?.userId;
			if (!userId) {
				log.warn({ event }, 'User ID not found');
				await lineService.replyText(event.replyToken, 'エラーが発生しました');
				return;
			}

			// 支払い記録の構築（ユーザーID追加）
			const record: ExpenseRecordWithUser = {
				date: new Date(),
				item: data.item,
				category: toExpenseCategoryLabel(data.category),
				amount: data.amount,
				userId: userId.substring(0, 5),
			};

			// Google Sheetsへの書き込み
			try {
				await googleSheetsService.appendExpenseRecord(record);
				log.info({ record }, 'Expense recorded to Google Sheets');

				// 成功時のみ完了メッセージ送信
				await lineService.replyWithCompletion(
					event.replyToken,
					data.item,
					data.category,
					data.amount,
				);
			} catch (error) {
				// エラー時はユーザーに通知
				log.error({ err: error, record }, 'Failed to record expense');
				await lineService.replyText(
					event.replyToken,
					'記録に失敗しました。もう一度試してください。',
				);
			}
		} else {
			log.error({ action: data.action }, 'Unknown postback action');
			await lineService.replyText(event.replyToken, 'エラーが発生しました');
		}
	} catch (error) {
		log.error({ err: error, event }, 'Failed to parse postback data');
		await lineService.replyText(event.replyToken, 'エラーが発生しました');
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

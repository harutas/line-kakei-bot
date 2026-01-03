import { HTTPFetchError, type MessageAPIResponseBase, type webhook } from '@line/bot-sdk';
import type { Request, Response } from 'express';
import paymentRepository from '../databases/repositories/PaymentRepository';
import lineService from '../services/lineService';
import paymentService from '../services/paymentService';
import {
	ACTION_CANCEL_DELETE,
	ACTION_CONFIRM_DELETE,
	ACTION_CURRENT_MONTH_SUMMARY,
	ACTION_DELETE_PAYMENT,
	ACTION_HOW_TO_USE,
	ACTION_LAST_MONTH_SUMMARY,
	ACTION_PAYMENT_DETAIL,
	ACTION_RECORD_TODAY,
	ACTION_SELECT_CATEGORY,
	ACTION_SELECT_DATE,
	ACTION_VIEW_WEEK_PAYMENTS,
	type PostbackData,
} from '../types/postback';
import { dayjs, formatMonthDisplay, isValidPaymentDate, parsePaymentDate } from '../utils/datetime';
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
		await lineService.replyWithHowToUse(event.replyToken);
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

		switch (data.action) {
			case ACTION_SELECT_CATEGORY: {
				// ローディング表示
				await lineService.showLoading(userId);

				// データバリデーション
				if (!data.category || !data.content || !data.amount) {
					log.warn({ data }, 'Missing data in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				// 日付選択確認を表示
				await lineService.replyWithDateSelection(
					event.replyToken,
					data.content,
					data.amount,
					data.category,
				);
				break;
			}

			case ACTION_RECORD_TODAY: {
				// ローディング表示
				await lineService.showLoading(userId);

				// データバリデーション
				if (!data.category || !data.content || !data.amount) {
					log.warn({ data }, 'Missing data in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				// 今日の日付で支払いを記録
				const payment = await paymentService.record({
					userId,
					date: now,
					category: data.category,
					content: data.content,
					amount: data.amount,
				});

				log.info({ payment }, 'Payment recorded to Firestore');

				// 今月の集計取得
				const monthlySummary = await paymentService.getMonthlySummary(userId, now);

				await lineService.replyWithCompletionAndSummary(event.replyToken, {
					payment,
					monthlySummary,
				});
				break;
			}

			case ACTION_SELECT_DATE: {
				// ローディング表示
				await lineService.showLoading(userId);

				// データバリデーション
				if (!data.category || !data.content || !data.amount) {
					log.warn({ data }, 'Missing data in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				// 選択された日付を取得
				const selectedDate = event.postback.params?.datetime;
				if (!selectedDate) {
					log.warn({ data }, 'No date selected');
					await lineService.replyText(event.replyToken, '日付が選択されていません');
					return;
				}

				// 日付範囲のバリデーション
				if (!isValidPaymentDate(selectedDate)) {
					log.warn({ selectedDate }, 'Invalid date selected');
					await lineService.replyText(
						event.replyToken,
						'日付は今日から30日前までの範囲で選択してください',
					);
					return;
				}

				// 日付をパースして支払いを記録
				const paymentDate = parsePaymentDate(selectedDate);
				const payment = await paymentService.record({
					userId,
					date: paymentDate,
					category: data.category,
					content: data.content,
					amount: data.amount,
				});

				log.info({ payment, selectedDate }, 'Payment recorded with selected date');

				// 選択された日付の月の集計取得
				const monthlySummary = await paymentService.getMonthlySummary(userId, paymentDate);

				await lineService.replyWithCompletionAndSummary(event.replyToken, {
					payment,
					monthlySummary,
				});
				break;
			}

			case ACTION_CURRENT_MONTH_SUMMARY: {
				// ローディング表示
				await lineService.showLoading(userId);

				// 今月の集計を表示
				const currentSummary = await paymentService.getMonthlySummary(userId, now);
				await lineService.replyWithMonthlySummary(event.replyToken, currentSummary);
				break;
			}

			case ACTION_LAST_MONTH_SUMMARY: {
				// ローディング表示
				await lineService.showLoading(userId);

				// 先月の集計を表示
				const lastMonthDate = dayjs.tz(now, 'Asia/Tokyo').subtract(1, 'month').toDate();
				const lastSummary = await paymentService.getMonthlySummary(userId, lastMonthDate);
				await lineService.replyWithMonthlySummary(event.replyToken, lastSummary);
				break;
			}

			case ACTION_HOW_TO_USE: {
				// ローディング表示
				await lineService.showLoading(userId);

				// 使い方を表示
				await lineService.replyWithHowToUse(event.replyToken);
				break;
			}

			case ACTION_VIEW_WEEK_PAYMENTS: {
				// ローディング表示
				await lineService.showLoading(userId);

				// 今週の支払いを表示
				const payments = await paymentService.getWeekPayments(userId, now);
				await lineService.replyWithPaymentList(event.replyToken, payments);
				break;
			}

			case ACTION_PAYMENT_DETAIL: {
				// ローディング表示
				await lineService.showLoading(userId);

				if (!data.paymentId) {
					log.warn({ data }, 'Missing paymentId in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				const payment = await paymentRepository.findById(userId, data.paymentId);
				if (!payment) {
					await lineService.replyText(event.replyToken, 'この支払いはすでに削除されています');
					return;
				}

				await lineService.replyWithPaymentDetail(event.replyToken, payment);
				break;
			}

			case ACTION_DELETE_PAYMENT: {
				// ローディング表示
				await lineService.showLoading(userId);

				// 削除確認を表示
				if (!data.paymentId) {
					log.warn({ data }, 'Missing paymentId in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				const payment = await paymentRepository.findById(userId, data.paymentId);
				if (!payment) {
					await lineService.replyText(event.replyToken, 'この支払いはすでに削除されています');
					return;
				}

				await lineService.replyWithDeleteConfirmation(event.replyToken, payment);
				break;
			}

			case ACTION_CONFIRM_DELETE: {
				// ローディング表示
				await lineService.showLoading(userId);

				// 削除実行
				if (!data.paymentId) {
					log.warn({ data }, 'Missing paymentId in postback');
					await lineService.replyText(event.replyToken, 'エラーが発生しました');
					return;
				}

				const payment = await paymentRepository.findById(userId, data.paymentId);
				if (!payment) {
					await lineService.replyText(event.replyToken, 'この支払いはすでに削除されています');
					return;
				}

				// 削除前に支払い日付を保存
				const deletedPaymentDate = payment.date;
				await paymentService.deletePayment(userId, data.paymentId);
				log.info({ paymentId: data.paymentId }, 'Payment deleted from Firestore');

				// 削除した支払いの月次集計を取得
				const summary = await paymentService.getMonthlySummary(userId, deletedPaymentDate);
				const monthDisplay = formatMonthDisplay(deletedPaymentDate);
				await lineService.replyText(
					event.replyToken,
					`削除しました！\n${monthDisplay}は${summary.totalAmount.toLocaleString()}円支払ったよ`,
				);
				break;
			}

			case ACTION_CANCEL_DELETE: {
				// 削除キャンセル時は何もしない
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
		await lineService.replyText(event.replyToken, 'エラーが発生しました。もう一度試してください。');
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

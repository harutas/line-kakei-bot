import type { webhook } from '@line/bot-sdk';
import type { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

const log = logger.child({ middleware: 'allowedLineUser' });

/**
 * 許可されたユーザーIDのリスト
 * 環境変数 ALLOWED_LINE_USER_IDS から取得（カンマ区切り）
 */
const getAllowedUserIds = (): string[] => {
	const allowedIds = process.env.ALLOWED_LINE_USER_IDS || '';
	return allowedIds
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
};

/**
 * ユーザーID認証ミドルウェア
 * 環境変数で指定されたユーザーIDのみアクセスを許可
 */
export const allowedLineUser = (req: Request, res: Response, next: NextFunction): void => {
	try {
		const callbackRequest: webhook.CallbackRequest = req.body;
		const events: webhook.Event[] = callbackRequest.events || [];

		// イベントがない場合はスキップ
		if (events.length === 0) {
			next();
			return;
		}

		const allowedUserIds = getAllowedUserIds();

		// 許可されたイベントのみをフィルタリング
		const validEvents = events.filter((event) => {
			const userId = event.source?.userId;

			// ユーザーIDが取得できない場合は除外
			if (!userId) {
				log.warn({ event }, 'User ID not found in event');
				return false;
			}

			// 許可されていないユーザーは除外
			if (!allowedUserIds.includes(userId)) {
				log.warn({ userId }, 'Unauthorized user');
				return false;
			}

			return true;
		});

		req.body.events = validEvents;

		next();
	} catch (error) {
		log.error({ err: error }, 'Error in auth middleware');
		res.status(500).json({ message: 'Internal server error' });
	}
};

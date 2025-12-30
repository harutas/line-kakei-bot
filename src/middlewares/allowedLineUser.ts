import type { webhook } from '@line/bot-sdk';
import type { NextFunction, Request, Response } from 'express';

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

		if (events.length === 0) {
			// イベントがない場合はスキップ
			next();
			return;
		}

		const allowedUserIds = getAllowedUserIds();

		// 全イベントのユーザーIDをチェック
		for (const event of events) {
			const userId = event.source?.userId;

			if (!userId) {
				// ユーザーIDが取得できない場合は拒否
				console.warn('User ID not found in event', { event });
				res.status(403).json({ message: 'Forbidden: User ID not found' });
				return;
			}

			if (!allowedUserIds.includes(userId)) {
				// 許可されていないユーザー
				console.warn('Unauthorized user', { userId });
				res.status(403).json({ message: 'Forbidden: Unauthorized user' });
				return;
			}
		}

		// 全てのユーザーが許可されている
		next();
	} catch (error) {
		console.error('Error in authMiddleware', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

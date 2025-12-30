import { type MiddlewareConfig, middleware } from '@line/bot-sdk';

const middlewareConfig: MiddlewareConfig = {
	channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

/**
 * LINEの署名検証
 */
export const lineSignature = middleware(middlewareConfig);

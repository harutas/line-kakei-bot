import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { handleWebhook } from './handlers/webhook';
import { httpLogger } from './middlewares/httpLogger';
import { lineSignature } from './middlewares/lineSignature';
import logger from './utils/logger';

const app: Application = express();
const port = process.env.PORT || 8080;

app.use(httpLogger);

// ヘルスチェック
app.get('/', (_req: Request, res: Response) => {
	res.status(200).json({
		message: 'ok',
	});
});

// LINE Messaging API の Webhookハンドラ
app.post('/webhook', lineSignature, handleWebhook);

// 404
app.use((_req: Request, res: Response) => {
	res.status(404).json({ message: 'Not Found' });
});

// 500
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	logger.error({ err }, 'Unhandled error');
	res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => logger.info({ port }, 'Server started'));

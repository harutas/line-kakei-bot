import pinoHttp from 'pino-http';
import logger from '../utils/logger';

export const httpLogger = pinoHttp({
	logger,
	customLogLevel: (_req, res, err) => {
		if (res.statusCode >= 500 || err) return 'error';
		if (res.statusCode >= 400) return 'warn';
		return 'info';
	},
	customSuccessMessage: (req, _res) => {
		return `${req.method} ${req.url} completed`;
	},
	customErrorMessage: (req, _res, _errr) => {
		return `${req.method} ${req.url} failed`;
	},
	customAttributeKeys: {
		req: 'request',
		res: 'response',
		err: 'error',
		responseTime: 'duration',
	},
	autoLogging: {
		ignore: (req) => req.url === '/', // ヘルスチェックは除外
	},
	serializers: {
		req: (req) => ({
			method: req.method,
			url: req.url,
			headers: {
				'user-agent': req.headers['user-agent'],
				'x-line-signature': req.headers['x-line-signature'] ? '[REDACTED]' : undefined,
			},
		}),
		res: (res) => ({
			statusCode: res.statusCode,
		}),
	},
});

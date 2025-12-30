import pino from 'pino';

const isDevelopment = process.env.ENV !== 'production';

const developmentConfig = {
	level: 'debug',
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
			translateTime: 'SYS:standard',
			ignore: 'pid,hostname',
			singleLine: false,
			messageFormat: '{msg}',
			errorLikeObjectKeys: ['err', 'error'],
		},
	},
};

const productionConfig = {
	level: 'info',
	formatters: {
		level: (label: string) => ({ level: label }),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	serializers: {
		err: pino.stdSerializers.err,
		error: pino.stdSerializers.err,
	},
};

const logger = pino(isDevelopment ? developmentConfig : productionConfig);

export default logger;

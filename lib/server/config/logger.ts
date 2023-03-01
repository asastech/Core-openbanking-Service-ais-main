import pino, { Level, multistream, StreamEntry } from 'pino';
import pretty from 'pino-pretty';

const {
	LOG_LEVEL = 'debug',
	DISABLE_LOGGING = false,
	NODE_ENV = 'development',
	SERVICE_NAME = 'api',
} = process.env as typeof process.env & {
	LOG_LEVEL: Level;
	DISABLE_LOGGING: string;
	NODE_ENV: 'development' | 'production' | 'testing';
	SERVICE_NAME: string;
};

const streams: StreamEntry[] = [];

if (NODE_ENV === 'development' || NODE_ENV === 'testing') {
	streams.push({
		stream: pretty({ colorize: true, sync: NODE_ENV === 'testing' }),
		level: LOG_LEVEL as Level,
	});
} else {
	streams.push({ stream: process.stdout, level: LOG_LEVEL as Level });
}

const logger = pino(
	{
		name: SERVICE_NAME,
		level: LOG_LEVEL,
		enabled: !DISABLE_LOGGING,
		timestamp: true,
	},
	multistream(streams),
);

export default logger;

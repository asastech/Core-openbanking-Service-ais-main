import type { FastifyRequest, FastifyServerOptions } from 'fastify';
import { v4 as uuid } from 'uuid';
import logger from './logger';
import qs from 'qs';
import ajv from './ajv';

function genReqId(_: FastifyRequest) {
	return uuid();
}

const SERVER_CONFIG: FastifyServerOptions = {
	ajv: ajv as any,
	trustProxy: true,
	logger,
	ignoreTrailingSlash: true,
	genReqId,
	querystringParser: (str: string) =>
		qs.parse(str, {
			allowPrototypes: false,
			charset: 'utf-8',
			charsetSentinel: true,
			parseArrays: false,
			interpretNumericEntities: true,
			parameterLimit: 5,
			strictNullHandling: true,
			plainObjects: false,
		}),
};

export default SERVER_CONFIG;

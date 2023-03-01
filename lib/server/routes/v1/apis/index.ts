import type { FastifyInstance } from 'fastify';
import configRoutes from './configs';
import usageRoutes from './usages';
import create from './create';
import fetch from './fetch';
import list from './list';

export default async function registerApisRoutes(fastify: FastifyInstance) {
	await fastify.register(list);
	await fastify.register(fetch);
	await fastify.register(create);
	await fastify.register(configRoutes, { prefix: 'configs' });
	await fastify.register(usageRoutes, { prefix: 'usages' });
}

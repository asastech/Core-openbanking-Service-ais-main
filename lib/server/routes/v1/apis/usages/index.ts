import type { FastifyInstance } from 'fastify';
import list from './list';

export default async function registerUsageRoutes(fastify: FastifyInstance) {
	await fastify.register(list);
}

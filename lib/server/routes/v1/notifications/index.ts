import type { FastifyInstance } from 'fastify';
import list from './list';

export default async function registerNotificationsRoutes(
	fastify: FastifyInstance,
) {
	await fastify.register(list);
}

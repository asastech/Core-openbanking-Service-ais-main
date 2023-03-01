import type { FastifyInstance } from 'fastify';
import create from './create';
import update from './update';
import list from './list';

export default async function registerApiConfigRoutes(
	fastify: FastifyInstance,
) {
	await fastify.register(list);
	await fastify.register(create);
	await fastify.register(update);
}

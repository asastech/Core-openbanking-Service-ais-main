import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

export default async function registerListApisRoute(fastify: FastifyInstance) {
	fastify.route({
		method: 'GET',
		url: '/',
		schema,
		handler: async (_, reply) => {
			const apis = await fastify.db.api.findMany();

			return reply.status(200).send({
				success: true,
				message: 'Successfully retrieved all APIs',
				data: { apis },
			});
		},
	});
}

import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IParams {
	apiId: string;
}

export default async function registerFetchApiRoute(fastify: FastifyInstance) {
	fastify.route<{ Params: IParams }>({
		method: 'GET',
		url: '/:apiId',
		schema,
		handler: async (request, reply) => {
			const { apiId } = request.params;

			const api = await fastify.db.api.findUnique({
				where: { id: apiId },
			});

			if (!api) {
				return reply.notFound('API not found');
			}

			return reply
				.status(200)
				.send({ success: true, message: 'API fetched', data: { api } });
		},
	});
}

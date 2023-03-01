import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

export default async function registerListApiConfigsRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Headers: IHeaders }>({
		method: 'GET',
		url: '/',
		schema,
		preHandler: [
			fastify.auth.checkForAccessToken,
			fastify.auth.checkForPermissions([
				'admin',
				'user',
				'loki-user',
				'loki-admin',
				'hulk-user',
				'hulk-admin',
			]),
			fastify.auth.checkAccountStatus,
		],
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;

			const apiConfigs = await fastify.db.accountApiConfig.findMany({
				where: {
					accountId,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Successfully retrieved ApiConfigs!',
				data: { apiConfigs },
			});
		},
	});
}

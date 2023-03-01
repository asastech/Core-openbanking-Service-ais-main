import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

export default async function registerListAPIUsageRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Headers: IHeaders }>({
		method: 'GET',
		url: '/list',
		schema,
		preHandler: [
			fastify.auth.checkForAccessToken,
			fastify.auth.checkForPermissions([
				'admin',
				'user',
				'loki-admin',
				'loki-user',
				'hulk-admin',
				'hulk-user',
			]),
			fastify.auth.checkAccountStatus,
		],
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;

			const apiUsages = await fastify.db.accountApiUsage.findMany({
				where: {
					accountId,
				},
				orderBy: {
					month: 'desc',
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Successfully listed APIs usage.',
				data: { apiUsages },
			});
		},
	});
}

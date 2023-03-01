import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	apiId: string;
	isEnabled: boolean;
}

export default async function registerCreateApiConfigRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Body: IBody; Headers: IHeaders }>({
		method: 'POST',
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
			const { apiId, isEnabled } = request.body;

			const apiConfig = await fastify.db.accountApiConfig.findFirst({
				where: {
					apiId,
					accountId,
				},
			});
			if (apiConfig) {
				return reply.conflict(
					`An ApiConfig for the Api ${apiId} already exists.`,
				);
			}

			await fastify.db.accountApiConfig.create({
				data: {
					apiId,
					accountId,
					isEnabled,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Successfully created a new ApiConfig!',
			});
		},
	});
}

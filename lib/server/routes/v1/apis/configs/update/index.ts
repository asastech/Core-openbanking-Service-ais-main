import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	apiConfigId: string;
}

interface IBody {
	isEnabled: boolean;
}

export default async function registerUpdateApiConfigRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Body: IBody; Headers: IHeaders }>({
		method: 'PATCH',
		url: '/:apiConfigId',
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
			const { apiConfigId } = request.params;
			const { isEnabled } = request.body;

			const apiConfig = await fastify.db.accountApiConfig.findFirst({
				where: {
					id: apiConfigId,
					accountId,
				},
			});
			if (!apiConfig) {
				return reply.notFound(
					`An ApiConfig with the id ${apiConfigId} does not exist.`,
				);
			}

			await fastify.db.accountApiConfig.update({
				where: {
					id: apiConfigId,
				},
				data: {
					isEnabled,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Successfully updated the ApiConfig!',
			});
		},
	});
}

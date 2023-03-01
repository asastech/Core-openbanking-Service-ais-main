import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	bankAccountId: string;
}

export default async function registerNotificationsListRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'GET',
		url: '/:bankAccountId',
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
			const { bankAccountId } = request.params;

			const bankAccount = await fastify.db.bankAccount.findFirst({
				where: {
					id: bankAccountId,
				},
			});
			if (!bankAccount) {
				return reply.notFound('Bank account not found.');
			}

			const notifications = await fastify.db.notification.findMany({
				where: {
					bankAccountId,
				},
				orderBy: {
					createdAt: 'desc',
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Successfully listed all notifications.',
				data: { notifications },
			});
		},
	});
}

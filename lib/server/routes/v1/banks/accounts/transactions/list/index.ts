import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	bankAccountId: string;
}

export default async function registerListTransactionsRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Headers: IHeaders; Params: IParams }>({
		method: 'GET',
		url: '/:bankAccountId',
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
			const { bankAccountId } = request.params;

			const transactions = await fastify.db.transaction.findMany({
				where: {
					bankAccountId,
				},
				orderBy: {
					updatedAt: 'desc',
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Transactions listed.',
				data: { transactions },
			});
		},
	});
}

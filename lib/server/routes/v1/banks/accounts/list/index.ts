import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	ssn: string;
}

export default async function registerListBankAccountsRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'GET',
		url: '/:ssn',
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
			const { ssn } = request.params;

			const bankAccounts = await fastify.db.bankAccount.findMany({
				where: {
					ssn,
				},
				include: {
					bank: true,
					transactions: {
						orderBy: {
							updatedAt: 'desc',
						},
					},
				},
			});
			const bankAccountsNotFound = bankAccounts.length === 0;
			if (!bankAccountsNotFound) {
				return reply.notFound('Bank accounts not found.');
			}

			return reply.status(200).send({
				success: true,
				message: 'Bank accounts fetched.',
				data: { bankAccounts },
			});
		},
	});
}

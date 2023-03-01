import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	bankAccountId: string;
	amount: number;
}

export default async function registerCreateDepositTransactionRoute(
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
			const { bankAccountId, amount } = request.body;

			const bankAccount = await fastify.db.bankAccount.findFirst({
				where: {
					id: bankAccountId,
				},
			});
			if (!bankAccount) {
				return reply.notFound('Bank account not found');
			}

			await fastify.db.transaction.create({
				data: {
					amount,
					bankAccountId,
					isDeposit: true,
					isWithdrawal: false,
					status: 'PENDING',
				},
			});

			return reply
				.status(200)
				.send({ success: true, message: 'Deposit created' });
		},
	});
}

import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	bankAccountId: string;
	amount: Prisma.Decimal;
}

export default async function registerCreateWithdrawTransactionRoute(
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

			// check if bank account balance is less then amount to withdraw
			if (bankAccount.balance < amount) {
				return reply.badRequest('Insufficient funds');
			}

			await fastify.db.transaction.create({
				data: {
					amount,
					bankAccountId,
					isDeposit: false,
					isWithdrawal: true,
					status: 'PENDING',
				},
			});

			return reply
				.status(200)
				.send({ success: true, message: 'Withdraw created' });
		},
	});
}

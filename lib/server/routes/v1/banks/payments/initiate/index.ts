import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	senderBankAccountId: string;
	receiverBankAccountId: string;
	amount: number;
}

export default async function registerInitiateP2pTransferRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Headers: IHeaders; Body: IBody }>({
		method: 'POST',
		url: '/',
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
			const { senderBankAccountId, receiverBankAccountId, amount } =
				request.body;

			const senderBankAccount = await fastify.db.bankAccount.findFirst({
				where: {
					id: senderBankAccountId,
				},
			});
			if (!senderBankAccount) {
				return reply.notFound('Sender bank account not found');
			}

			const receiverBankAccount = await fastify.db.bankAccount.findFirst({
				where: {
					id: receiverBankAccountId,
				},
			});
			if (!receiverBankAccount) {
				return reply.notFound('Receiver bank account not found');
			}

			await fastify.db.p2pTransfer.create({
				data: {
					senderBankAccountId,
					receiverBankAccountId,
					amount,
					initiatedDate: new Date(),
					status: 'PENDING',
					type: 'PAYMENT',
				},
			});

			return reply.status(201).send({
				success: true,
				message: 'P2P transfer initiated',
			});
		},
	});
}

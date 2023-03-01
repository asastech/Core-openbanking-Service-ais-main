import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	bankAccountId: string;
}

export default async function registerListP2pTransfersRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'GET',
		url: '/list/:bankAccountId',
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
				return reply.notFound('Bank account not found');
			}

			const p2pTransfers = await fastify.db.p2pTransfer.findMany({
				where: {
					OR: [
						{
							senderBankAccountId: bankAccountId,
						},
						{
							receiverBankAccountId: bankAccountId,
						},
					],
				},
				orderBy: {
					createdAt: 'desc',
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'P2P transfers fetched successfully',
				data: {
					p2pTransfers,
				},
			});
		},
	});
}

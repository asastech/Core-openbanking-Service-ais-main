import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	p2pTransferId: string;
}

export default async function registerFetchP2pTransferRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'GET',
		url: '/:p2pTransferId',
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
			const { p2pTransferId } = request.params;

			const p2pTransfer = await fastify.db.p2pTransfer.findUnique({
				where: {
					id: p2pTransferId,
				},
				include: {
					senderBankAccount: true,
					recieverBankAccount: true,
				},
			});
			if (!p2pTransfer) {
				return reply.notFound('P2P transfer not found.');
			}

			return reply.status(200).send({
				success: true,
				message: 'P2P transfer fetched.',
				data: { p2pTransfer },
			});
		},
	});
}

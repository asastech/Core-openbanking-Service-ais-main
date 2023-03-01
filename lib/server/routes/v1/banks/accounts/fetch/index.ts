import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	accountName: string;
	bankName: string;
	ssn: string;
}

export default async function registerFetchBankAccountRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'GET',
		url: '/:bankName/:ssn/:accountName',
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
			const { accountName, bankName, ssn } = request.params;

			const bank = await fastify.db.bank.findUnique({
				where: {
					name: bankName,
				},
			});
			if (!bank) {
				return reply.notFound('Bank not found.');
			}

			const bankAccount = await fastify.db.bankAccount.findFirst({
				where: {
					bankId: bank.id,
					ssn,
					accountName,
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
			if (!bankAccount) {
				return reply.notFound('Bank account not found.');
			}

			return reply.status(200).send({
				success: true,
				message: 'Bank account fetched.',
				data: { bankAccount },
			});
		},
	});
}

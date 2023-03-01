import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	bankId: string;
	accountName: string;
	ssn: string;
}

export default async function registerCreateBankAccountRoute(
	fastify: FastifyInstance,
) {
	fastify.addHook('preHandler', fastify.auth.checkForAccessToken);
	fastify.addHook(
		'preHandler',
		fastify.auth.checkForPermissions([
			'admin',
			'user',
			'loki-admin',
			'loki-user',
			'hulk-admin',
			'hulk-user',
		]),
	);
	fastify.addHook('preHandler', fastify.auth.checkAccountStatus);

	fastify.route<{ Body: IBody; Headers: IHeaders }>({
		method: 'POST',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const { bankId, accountName, ssn } = request.body;

			const bankExists = await fastify.db.bank.findUnique({
				where: {
					id: bankId,
				},
			});
			if (!bankExists) {
				return reply.notFound('Bank not found.');
			}

			const ssnAlreadyHasBankAccountNameInBank =
				await fastify.db.bankAccount.findFirst({
					where: {
						bankId,
						ssn,
						accountName,
					},
				});
			if (ssnAlreadyHasBankAccountNameInBank) {
				return reply.conflict(
					'Social security number already has bank account name in bank.',
				);
			}

			await fastify.db.bankAccount.create({
				data: {
					bankId,
					accountName,
					ssn,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Bank account created.',
			});
		},
	});
}

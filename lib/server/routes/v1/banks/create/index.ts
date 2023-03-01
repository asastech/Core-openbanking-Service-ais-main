import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	name: string;
	logoUrl: string;
}

export default async function registerCreateBankRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Body: IBody; Headers: IHeaders }>({
		method: 'POST',
		url: '/',
		schema,
		preHandler: [
			fastify.auth.checkForAccessToken,
			fastify.auth.checkForPermissions(['admin', 'loki-admin', 'hulk-admin']),
			fastify.auth.checkAccountStatus,
		],
		handler: async (request, reply) => {
			const { name, logoUrl } = request.body;

			const bankNameTaken = await fastify.db.bank.findFirst({
				where: {
					name,
				},
			});
			if (bankNameTaken) {
				return reply.conflict(`A Bank with the name ${name} already exists.`);
			}

			await fastify.db.bank.create({
				data: {
					name,
					logoUrl,
				},
			});

			return reply
				.status(200)
				.send({ success: true, message: 'Successfully created a new Bank!' });
		},
	});
}

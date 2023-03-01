import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

export default async function registerListBanksRoute(fastify: FastifyInstance) {
	fastify.route({
		method: 'GET',
		url: '/',
		schema,
		handler: async (_, reply) => {
			const banks = await fastify.db.bank.findMany();

			return reply.status(200).send({
				success: true,
				message: 'Successfully listed all banks.',
				data: { banks },
			});
		},
	});
}
